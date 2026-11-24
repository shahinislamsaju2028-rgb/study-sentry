import { createServer } from 'vite';
import assert from 'node:assert/strict';

const v = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { loadCurriculum } = await v.ssrLoadModule('/src/components/CurriculumPicker.jsx');
  const { getAcademicSubjectChoices, GROUP_SUBJECTS, COMMON_HSC_SUBJECTS } =
    await v.ssrLoadModule('/src/utils/groupSubjects.js');

  const report = [];
  for (const group of ['science', 'humanities', 'business']) {
    const cat = await loadCurriculum(group);
    const subjects = Object.keys(cat);
    const perSubject = subjects.map((name) => {
      const papers = cat[name] || {};
      const counts = Object.entries(papers).map(([p, list]) => `${p}:${Array.isArray(list) ? list.length : 0}`);
      const sample = (papers['1'] || papers['2'] || [])[0];
      return `${name}[${counts.join(',')}]`;
    });
    report.push(`\n### ${group.toUpperCase()}  (${subjects.length} subjects in catalog)`);
    report.push(...perSubject.map((s) => '  ' + s));
    // structural checks
    for (const [name, papers] of Object.entries(cat)) {
      assert.ok(papers && typeof papers === 'object', `${group}/${name} must be an object`);
      for (const [paper, chapters] of Object.entries(papers)) {
        assert.ok(Array.isArray(chapters), `${group}/${name}/${paper} must be an array`);
        assert.ok(chapters.length > 0, `${group}/${name}/${paper} is EMPTY`);
        for (const ch of chapters) {
          assert.ok(ch && typeof ch === 'object' && typeof ch.name === 'string' && ch.name.length,
            `${group}/${name}/${paper} has a chapter without a name`);
          assert.ok(Array.isArray(ch.types), `${group}/${name}/${paper}/${ch.name} has no types[]`);
          for (const t of ch.types || []) {
            assert.ok(t && typeof t.name === 'string', `${group}/${name}/${ch.name} type without name`);
          }
        }
      }
    }
  }

  // science must NOT leak humanities/business chapters, and vice versa
  const sci = await loadCurriculum('science');
  const hum = await loadCurriculum('humanities');
  const bus = await loadCurriculum('business');
  assert.ok(sci.Accounting === undefined, 'science catalog must not contain Accounting');
  assert.ok(hum.Physics === undefined, 'humanities catalog must not contain Physics');
  assert.ok(bus.Physics === undefined, 'business catalog must not contain Physics');
  assert.ok(bus.Accounting, 'business catalog must contain Accounting');
  assert.ok(hum.Economics, 'humanities catalog must contain Economics');
  assert.ok(bus.Economics, 'business catalog must contain Economics (own copy)');
  assert.ok(bus['Geography & Environment'], 'business must fall back to the humanities Geography list');
  assert.ok(sci.Bangla && sci.English && sci.ICT, 'science must carry Bangla/English/ICT');
  assert.ok(hum.Bangla && hum.English && hum.ICT, 'humanities must carry Bangla/English/ICT');
  assert.ok(bus.Bangla && bus.English && bus.ICT, 'business must carry Bangla/English/ICT');

  // every subject the menus offer must have chapters behind it
  for (const group of ['science', 'humanities', 'business']) {
    const cat = group === 'science' ? sci : group === 'humanities' ? hum : bus;
    const offered = getAcademicSubjectChoices({ academicGroup: group });
    for (const sub of offered) {
      assert.ok(cat[sub], `group ${group}: offered subject "${sub}" has NO chapters in the catalog`);
    }
    for (const sub of GROUP_SUBJECTS[group]) {
      assert.ok(cat[sub], `group ${group}: group subject "${sub}" has NO chapters in the catalog`);
    }
  }

  console.log(report.join('\n'));
  console.log('\nALL CATALOG STRUCTURE CHECKS PASSED');
} finally {
  await v.close();
}
