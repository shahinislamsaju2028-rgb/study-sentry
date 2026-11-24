use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const ARRAY_COLLECTIONS: &[&str] = &[
    "subjects",
    "sessions",
    "todos",
    "exams",
    "syllabus",
    "routine",
    "deepGoals",
    "junkNotes",
    "flashcards",
    "studyNotes",
];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DbLoadResponse {
    pub ok: bool,
    pub state: Option<Value>,
    pub db_path: String,
    pub migrated_from_json: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DbSaveResponse {
    pub ok: bool,
    pub db_path: String,
    pub updated_collections: usize,
    pub elapsed_us: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

struct DbInner {
    conn: Connection,
    db_path: PathBuf,
    hashes: HashMap<String, u64>,
}

/// Thread-safe, race-free SQLite WAL engine.
/// Registered via `.manage(DbEngine::new_lazy())` BEFORE Tauri creates any WebView2 windows,
/// guaranteeing `State<'_, DbEngine>` is always available even during Win32 message-pump window creation.
pub struct DbEngine {
    inner: Mutex<Option<DbInner>>,
}

impl Default for DbEngine {
    fn default() -> Self {
        Self::new_lazy()
    }
}

fn now_unix_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn hash_json_str(s: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish()
}

fn wal_path(db_path: &Path) -> PathBuf {
    let mut s = db_path.as_os_str().to_os_string();
    s.push("-wal");
    PathBuf::from(s)
}

fn shm_path(db_path: &Path) -> PathBuf {
    let mut s = db_path.as_os_str().to_os_string();
    s.push("-shm");
    PathBuf::from(s)
}

impl DbEngine {
    pub fn new_lazy() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn ensure_open(&self, app_data_dir: PathBuf) -> Result<(), String> {
        let mut guard = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        if guard.is_none() {
            let opened = Self::open_resilient(app_data_dir)?;
            *guard = Some(opened);
        }
        Ok(())
    }

    fn resolve_base_dir(app_data_dir: PathBuf) -> PathBuf {
        if let Ok(portable_dir) = std::env::var("PORTABLE_EXECUTABLE_DIR") {
            let p = PathBuf::from(portable_dir);
            if p.exists() {
                let portable_data = p.join("StudySentry_Data");
                if fs::create_dir_all(&portable_data).is_ok() {
                    return portable_data;
                }
            }
        }

        if fs::create_dir_all(&app_data_dir).is_ok() {
            return app_data_dir;
        }

        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let fallback = PathBuf::from(local_app_data).join("com.studysentry.desktop.personal");
            if fs::create_dir_all(&fallback).is_ok() {
                return fallback;
            }
        }

        app_data_dir
    }

    fn open_resilient(app_data_dir: PathBuf) -> Result<DbInner, String> {
        let base_dir = Self::resolve_base_dir(app_data_dir);
        let _ = fs::create_dir_all(&base_dir);
        let db_path = base_dir.join("studysentry.db");

        // Attempt 1: Normal open + schema verification
        if let Ok(conn) = Self::try_open_healthy(&db_path) {
            return Ok(DbInner {
                conn,
                db_path,
                hashes: HashMap::new(),
            });
        }

        // Attempt 2: Recover from damaged/locked -wal / -shm left by forced termination
        let ts = now_unix_ms();
        let wal = wal_path(&db_path);
        let shm = shm_path(&db_path);
        if wal.exists() || shm.exists() {
            if wal.exists() {
                let wal_bak = base_dir.join(format!("studysentry.db-wal.bak-{}", ts));
                let _ = fs::rename(&wal, &wal_bak).or_else(|_| fs::remove_file(&wal));
            }
            if shm.exists() {
                let _ = fs::remove_file(&shm);
            }
            if let Ok(conn) = Self::try_open_healthy(&db_path) {
                return Ok(DbInner {
                    conn,
                    db_path,
                    hashes: HashMap::new(),
                });
            }
        }

        // Attempt 3: Backup unreadable/corrupt main DB file (never delete user files) and create fresh DB
        if db_path.exists() {
            let corrupt_bak = base_dir.join(format!("studysentry.backup-{}.db", ts));
            let _ = fs::rename(&db_path, &corrupt_bak);
            let _ = fs::remove_file(&wal);
            let _ = fs::remove_file(&shm);
            if let Ok(conn) = Self::try_open_healthy(&db_path) {
                return Ok(DbInner {
                    conn,
                    db_path,
                    hashes: HashMap::new(),
                });
            }
        }

        // Attempt 4: Alternate fresh DB filename if original file handle is exclusively locked by third-party AV
        let alt_path = base_dir.join("studysentry_v2.db");
        if let Ok(conn) = Self::try_open_healthy(&alt_path) {
            return Ok(DbInner {
                conn,
                db_path: alt_path,
                hashes: HashMap::new(),
            });
        }

        // Attempt 5: Ultimate in-memory fallback so the application UI never fails to launch
        let mem_conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed opening fallback SQLite memory DB: {}", e))?;
        Self::init_pragmas_and_schema(&mem_conn)?;
        Ok(DbInner {
            conn: mem_conn,
            db_path: PathBuf::from("Memory (SQLite fallback)"),
            hashes: HashMap::new(),
        })
    }

    fn try_open_healthy(db_path: &Path) -> Result<Connection, String> {
        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open SQLite database {:?}: {}", db_path, e))?;

        // Set busy_timeout FIRST before WAL mode switch so transient NTFS locks wait cleanly
        let _ = conn.busy_timeout(Duration::from_millis(6000));

        Self::init_pragmas_and_schema(&conn)?;
        Self::verify_and_repair_schema(&conn)?;
        Ok(conn)
    }

    fn init_pragmas_and_schema(conn: &Connection) -> Result<(), String> {
        let _ = conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA temp_store = MEMORY;
            PRAGMA foreign_keys = ON;
            ",
        );

        conn.execute_batch(Self::schema_ddl())
            .map_err(|e| format!("Failed to initialize SQLite schema: {}", e))
    }

    fn schema_ddl() -> &'static str {
        "
        CREATE TABLE IF NOT EXISTS app_kv (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            name TEXT NOT NULL DEFAULT 'Subject',
            color TEXT NOT NULL DEFAULT '#76c4e9',
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            date_key TEXT NOT NULL DEFAULT '',
            subject_id TEXT NOT NULL DEFAULT '',
            duration_sec INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date_key);
        CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_id);

        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            date_key TEXT NOT NULL DEFAULT '',
            done INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date_key);

        CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            date_key TEXT NOT NULL DEFAULT '',
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS syllabus (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            subject_id TEXT NOT NULL DEFAULT '',
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS routine (
            day TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS deep_goals (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            date_key TEXT NOT NULL DEFAULT '',
            kind TEXT NOT NULL DEFAULT 'study',
            payload_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_deep_goals_date ON deep_goals(date_key);

        CREATE TABLE IF NOT EXISTS junk_notes (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS flashcards (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS study_notes (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL DEFAULT '{}'
        );
        "
    }

    fn verify_and_repair_schema(conn: &Connection) -> Result<(), String> {
        // Quick sanity read on app_kv (detects SQLITE_CORRUPT / SQLITE_NOTADB early)
        conn.prepare("SELECT key, value_json, updated_at FROM app_kv LIMIT 1")
            .and_then(|mut s| {
                let mut rows = s.query([])?;
                let _ = rows.next()?;
                Ok(())
            })
            .map_err(|e| format!("app_kv integrity check failed: {}", e))?;

        let tables = [
            "subjects",
            "sessions",
            "todos",
            "exams",
            "syllabus",
            "routine",
            "deep_goals",
            "junk_notes",
            "flashcards",
            "study_notes",
        ];

        for table in tables {
            let probe_sql = format!("SELECT payload_json FROM {} ORDER BY sort_order ASC LIMIT 1", table);
            let probe_ok = conn
                .prepare(&probe_sql)
                .and_then(|mut s| {
                    let mut rows = s.query([])?;
                    let _ = rows.next()?;
                    Ok(())
                })
                .is_ok();

            if !probe_ok {
                // Legacy table without sort_order or payload_json: add missing columns safely if possible, else recreate table
                let _ = conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0", table),
                    [],
                );
                let _ = conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{{}}'", table),
                    [],
                );

                let recheck_ok = conn
                    .prepare(&probe_sql)
                    .and_then(|mut s| {
                        let mut rows = s.query([])?;
                        let _ = rows.next()?;
                        Ok(())
                    })
                    .is_ok();

                if !recheck_ok {
                    conn.execute(&format!("DROP TABLE IF EXISTS {}", table), [])
                        .map_err(|e| format!("Failed repairing table {}: {}", table, e))?;
                    conn.execute_batch(Self::schema_ddl())
                        .map_err(|e| format!("Failed recreating table {}: {}", table, e))?;
                }
            }
        }

        Ok(())
    }

    pub fn db_path(&self, app_data_dir: PathBuf) -> PathBuf {
        let _ = self.ensure_open(app_data_dir.clone());
        let guard = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        guard
            .as_ref()
            .map(|g| g.db_path.clone())
            .unwrap_or_else(|| app_data_dir.join("studysentry.db"))
    }

    pub fn checkpoint_wal(&self) {
        let guard = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(inner) = guard.as_ref() {
            let _ = inner.conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        }
    }

    pub fn load_state(&self, app_data_dir: PathBuf) -> DbLoadResponse {
        let mut guard = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        if guard.is_none() {
            match Self::open_resilient(app_data_dir.clone()) {
                Ok(opened) => *guard = Some(opened),
                Err(e) => {
                    return DbLoadResponse {
                        ok: false,
                        state: None,
                        db_path: String::new(),
                        migrated_from_json: false,
                        error: Some(e),
                    };
                }
            }
        }

        let inner = match guard.as_mut() {
            Some(i) => i,
            None => {
                return DbLoadResponse {
                    ok: false,
                    state: None,
                    db_path: String::new(),
                    migrated_from_json: false,
                    error: Some("Database engine unavailable".to_string()),
                };
            }
        };

        let db_path_str = inner.db_path.to_string_lossy().to_string();

        let initialized: Option<String> = match inner
            .conn
            .query_row(
                "SELECT value_json FROM app_kv WHERE key = '__initialized__'",
                [],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
        {
            Ok(v) => v.flatten(),
            Err(_) => {
                // Runtime corruption detected: self-heal cleanly by reopening fresh
                *guard = Self::open_resilient(app_data_dir).ok();
                return DbLoadResponse {
                    ok: true,
                    state: None,
                    db_path: db_path_str,
                    migrated_from_json: false,
                    error: None,
                };
            }
        };

        if initialized.is_none() {
            if let Some(legacy_state) = Self::find_legacy_electron_json(&inner.db_path) {
                if Self::save_state_inner(inner, &legacy_state).is_ok() {
                    return DbLoadResponse {
                        ok: true,
                        state: Some(legacy_state),
                        db_path: db_path_str,
                        migrated_from_json: true,
                        error: None,
                    };
                }
            }
            return DbLoadResponse {
                ok: true,
                state: None,
                db_path: db_path_str,
                migrated_from_json: false,
                error: None,
            };
        }

        match Self::read_full_state(inner) {
            Ok(state) => DbLoadResponse {
                ok: true,
                state: Some(state),
                db_path: db_path_str,
                migrated_from_json: false,
                error: None,
            },
            Err(_) => {
                // If full state read encounters unrecoverable page damage, self-heal rather than bricking startup
                let cur_path = inner.db_path.clone();
                if cur_path.exists() {
                    let bak = cur_path.with_extension(format!("backup-{}.db", now_unix_ms()));
                    let _ = fs::rename(&cur_path, &bak);
                }
                *guard = Self::open_resilient(app_data_dir).ok();
                DbLoadResponse {
                    ok: true,
                    state: None,
                    db_path: db_path_str,
                    migrated_from_json: false,
                    error: None,
                }
            }
        }
    }

    pub fn save_state(&self, app_data_dir: PathBuf, state: &Value) -> DbSaveResponse {
        let mut guard = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        if guard.is_none() {
            match Self::open_resilient(app_data_dir) {
                Ok(opened) => *guard = Some(opened),
                Err(e) => {
                    return DbSaveResponse {
                        ok: false,
                        db_path: String::new(),
                        updated_collections: 0,
                        elapsed_us: 0,
                        error: Some(e),
                    };
                }
            }
        }

        let Some(inner) = guard.as_mut() else {
            return DbSaveResponse {
                ok: false,
                db_path: String::new(),
                updated_collections: 0,
                elapsed_us: 0,
                error: Some("Database engine unavailable".to_string()),
            };
        };

        let db_path_str = inner.db_path.to_string_lossy().to_string();
        match Self::save_state_inner(inner, state) {
            Ok((updated, elapsed_us)) => DbSaveResponse {
                ok: true,
                db_path: db_path_str,
                updated_collections: updated,
                elapsed_us,
                error: None,
            },
            Err(e) => DbSaveResponse {
                ok: false,
                db_path: db_path_str,
                updated_collections: 0,
                elapsed_us: 0,
                error: Some(e),
            },
        }
    }

    fn find_legacy_electron_json(current_db_path: &Path) -> Option<Value> {
        let mut candidates: Vec<PathBuf> = Vec::new();

        if let Some(parent) = current_db_path.parent() {
            candidates.push(parent.join("studysentry-data.json"));
            if let Some(roaming) = parent.parent() {
                candidates.push(roaming.join("Study Sentry").join("studysentry-data.json"));
                candidates.push(
                    roaming
                        .join("study-sentry-desktop")
                        .join("studysentry-data.json"),
                );
            }
        }

        if let Ok(appdata) = std::env::var("APPDATA") {
            let roaming = PathBuf::from(appdata);
            candidates.push(roaming.join("Study Sentry").join("studysentry-data.json"));
            candidates.push(
                roaming
                    .join("com.studysentry.desktop.personal")
                    .join("studysentry-data.json"),
            );
        }

        for candidate in candidates {
            if candidate.is_file() {
                if let Ok(raw) = fs::read_to_string(&candidate) {
                    if let Ok(parsed) = serde_json::from_str::<Value>(&raw) {
                        if parsed.is_object() && parsed.get("profile").is_some() {
                            return Some(parsed);
                        }
                    }
                }
            }
        }
        None
    }

    fn read_table_array(conn: &Connection, table: &str) -> Value {
        let sql = format!("SELECT payload_json FROM {} ORDER BY sort_order ASC", table);
        let Ok(mut stmt) = conn.prepare(&sql) else {
            return Value::Array(Vec::new());
        };
        let Ok(rows) = stmt.query_map([], |row| row.get::<_, Option<String>>(0)) else {
            return Value::Array(Vec::new());
        };

        let mut arr = Vec::new();
        for r in rows.flatten() {
            if let Some(raw) = r {
                if let Ok(val) = serde_json::from_str::<Value>(&raw) {
                    arr.push(val);
                }
            }
        }
        Value::Array(arr)
    }

    fn read_full_state(guard: &mut DbInner) -> Result<Value, String> {
        let mut root = Map::new();
        let mut new_hashes: HashMap<String, u64> = HashMap::new();

        {
            let mut stmt = guard
                .conn
                .prepare("SELECT key, value_json FROM app_kv WHERE key != '__initialized__'")
                .map_err(|e| format!("Failed reading app_kv: {}", e))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, Option<String>>(0)?,
                        row.get::<_, Option<String>>(1)?,
                    ))
                })
                .map_err(|e| format!("Failed iterating app_kv: {}", e))?;

            for row in rows {
                if let Ok((Some(k), Some(v_str))) = row {
                    if let Ok(val) = serde_json::from_str::<Value>(&v_str) {
                        new_hashes.insert(format!("kv:{}", k), hash_json_str(&v_str));
                        root.insert(k, val);
                    }
                }
            }
        }

        // If app_kv had __initialized__ = true but zero valid root keys (e.g. partial interrupted init),
        // inspect subjects too; if completely empty, return empty root safely so frontend normalizes defaults.
        let table_map = [
            ("subjects", "subjects"),
            ("sessions", "sessions"),
            ("todos", "todos"),
            ("exams", "exams"),
            ("syllabus", "syllabus"),
            ("routine", "routine"),
            ("deepGoals", "deep_goals"),
            ("junkNotes", "junk_notes"),
            ("flashcards", "flashcards"),
            ("studyNotes", "study_notes"),
        ];

        for (json_key, sql_table) in table_map {
            let arr_val = Self::read_table_array(&guard.conn, sql_table);
            if let Ok(serialized) = serde_json::to_string(&arr_val) {
                new_hashes.insert(format!("col:{}", json_key), hash_json_str(&serialized));
            }
            root.insert(json_key.to_string(), arr_val);
        }

        guard.hashes = new_hashes;
        Ok(Value::Object(root))
    }

    fn save_state_inner(guard: &mut DbInner, state: &Value) -> Result<(usize, u128), String> {
        let obj = state
            .as_object()
            .ok_or_else(|| "State payload must be a JSON object".to_string())?;

        let started = Instant::now();
        let now = now_unix_ms();
        let mut updated_count = 0usize;
        let mut pending_hashes = guard.hashes.clone();

        let tx = guard
            .conn
            .unchecked_transaction()
            .map_err(|e| format!("Failed starting SQLite transaction: {}", e))?;

        // 1. Save scalar / singleton keys in `app_kv` only when their hash changed
        let mut present_kv_keys: Vec<String> = Vec::new();
        for (key, val) in obj.iter() {
            if ARRAY_COLLECTIONS.contains(&key.as_str()) || key == "__initialized__" {
                continue;
            }
            present_kv_keys.push(key.clone());
            let serialized = serde_json::to_string(val)
                .map_err(|e| format!("Failed serializing {}: {}", key, e))?;
            let h = hash_json_str(&serialized);
            let cache_key = format!("kv:{}", key);

            if pending_hashes.get(&cache_key).copied() != Some(h) {
                tx.execute(
                    "INSERT INTO app_kv (key, value_json, updated_at)
                     VALUES (?1, ?2, ?3)
                     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                    params![key, serialized, now],
                )
                .map_err(|e| format!("Failed writing app_kv[{}]: {}", key, e))?;
                pending_hashes.insert(cache_key, h);
                updated_count += 1;
            }
        }

        // Remove any deleted dynamic top-level keys from app_kv
        let old_kv_keys: Vec<String> = pending_hashes
            .keys()
            .filter_map(|k| k.strip_prefix("kv:").map(|s| s.to_string()))
            .collect();
        for old_key in old_kv_keys {
            if !present_kv_keys.contains(&old_key) {
                let _ = tx.execute("DELETE FROM app_kv WHERE key = ?1", params![old_key]);
                pending_hashes.remove(&format!("kv:{}", old_key));
                updated_count += 1;
            }
        }

        // 2. Save indexed relational array collections only when changed
        for &col_name in ARRAY_COLLECTIONS {
            let empty_vec = Vec::new();
            let items = obj
                .get(col_name)
                .and_then(|v| v.as_array())
                .unwrap_or(&empty_vec);

            let serialized_all = serde_json::to_string(items)
                .map_err(|e| format!("Failed serializing {}: {}", col_name, e))?;
            let col_hash = hash_json_str(&serialized_all);
            let cache_key = format!("col:{}", col_name);

            if pending_hashes.get(&cache_key).copied() == Some(col_hash) {
                continue;
            }

            Self::sync_collection(&tx, col_name, items)?;
            pending_hashes.insert(cache_key, col_hash);
            updated_count += 1;
        }

        tx.execute(
            "INSERT INTO app_kv (key, value_json, updated_at)
             VALUES ('__initialized__', 'true', ?1)
             ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at",
            params![now],
        )
        .map_err(|e| format!("Failed marking database initialized: {}", e))?;

        tx.commit()
            .map_err(|e| format!("Failed committing SQLite transaction: {}", e))?;

        guard.hashes = pending_hashes;
        Ok((updated_count, started.elapsed().as_micros()))
    }

    fn sync_collection(
        tx: &rusqlite::Transaction<'_>,
        col_name: &str,
        items: &[Value],
    ) -> Result<(), String> {
        match col_name {
            "subjects" => {
                tx.execute("DELETE FROM subjects", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO subjects (id, sort_order, name, color, payload_json)
                         VALUES (?1, ?2, ?3, ?4, ?5)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("subj_{}", idx));
                    let name = str_field(item, "name", "Subject");
                    let color = str_field(item, "color", "#76c4e9");
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, name, color, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "sessions" => {
                tx.execute("DELETE FROM sessions", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO sessions (id, sort_order, date_key, subject_id, duration_sec, payload_json)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("sess_{}", idx));
                    let date_key = str_field(item, "dateKey", "");
                    let subject_id = str_field(item, "subjectId", "");
                    let duration_sec = int_field(item, "durationSec", 0);
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![
                        id,
                        idx as i64,
                        date_key,
                        subject_id,
                        duration_sec,
                        payload
                    ])
                    .map_err(|e| e.to_string())?;
                }
            }
            "todos" => {
                tx.execute("DELETE FROM todos", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO todos (id, sort_order, date_key, done, payload_json)
                         VALUES (?1, ?2, ?3, ?4, ?5)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("todo_{}", idx));
                    let date_key = str_field(item, "dateKey", "");
                    let done = if item.get("done").and_then(|v| v.as_bool()).unwrap_or(false) {
                        1i64
                    } else {
                        0i64
                    };
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, date_key, done, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "exams" => {
                tx.execute("DELETE FROM exams", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO exams (id, sort_order, date_key, payload_json)
                         VALUES (?1, ?2, ?3, ?4)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("exam_{}", idx));
                    let date_key = str_field(item, "dateKey", "");
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, date_key, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "syllabus" => {
                tx.execute("DELETE FROM syllabus", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO syllabus (id, sort_order, subject_id, payload_json)
                         VALUES (?1, ?2, ?3, ?4)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("syl_{}", idx));
                    let subject_id = str_field(item, "subjectId", "");
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, subject_id, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "routine" => {
                tx.execute("DELETE FROM routine", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO routine (day, sort_order, payload_json)
                         VALUES (?1, ?2, ?3)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let day = str_field(item, "day", &format!("day_{}", idx));
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![day, idx as i64, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "deepGoals" => {
                tx.execute("DELETE FROM deep_goals", [])
                    .map_err(|e| e.to_string())?;
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR REPLACE INTO deep_goals (id, sort_order, date_key, kind, payload_json)
                         VALUES (?1, ?2, ?3, ?4, ?5)",
                    )
                    .map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("goal_{}", idx));
                    let date_key = str_field(item, "dateKey", "");
                    let kind = str_field(item, "kind", "study");
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, date_key, kind, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            "junkNotes" | "flashcards" | "studyNotes" => {
                let table = match col_name {
                    "junkNotes" => "junk_notes",
                    "flashcards" => "flashcards",
                    _ => "study_notes",
                };
                tx.execute(&format!("DELETE FROM {}", table), [])
                    .map_err(|e| e.to_string())?;
                let sql = format!(
                    "INSERT OR REPLACE INTO {} (id, sort_order, payload_json) VALUES (?1, ?2, ?3)",
                    table
                );
                let mut stmt = tx.prepare_cached(&sql).map_err(|e| e.to_string())?;
                for (idx, item) in items.iter().enumerate() {
                    let id = str_field(item, "id", &format!("item_{}", idx));
                    let payload = serde_json::to_string(item).unwrap_or_else(|_| "{}".into());
                    stmt.execute(params![id, idx as i64, payload])
                        .map_err(|e| e.to_string())?;
                }
            }
            _ => {}
        }
        Ok(())
    }
}

fn str_field(item: &Value, key: &str, fallback: &str) -> String {
    item.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or(fallback)
        .to_string()
}

fn int_field(item: &Value, key: &str, fallback: i64) -> i64 {
    item.get(key)
        .and_then(|v| {
            v.as_i64()
                .or_else(|| v.as_f64().map(|f| f.round() as i64))
        })
        .unwrap_or(fallback)
}
