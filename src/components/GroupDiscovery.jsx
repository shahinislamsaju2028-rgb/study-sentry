import { GroupVector } from './GroupVector';
import CustomSelect from './CustomSelect';
import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  KeyRound,
  Lock,
  Plus,
  Radio,
  UsersRound,
} from 'lucide-react';
import { circleClient as db, isDefaultHsc28Group } from '../utils/studyCircle';
import { bnNum } from '../utils/bangla';
import GroupComposer, { emblemDataUri } from './GroupComposer';

async function compressedImage(file) {
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('JPG, PNG বা WebP (সর্বোচ্চ ৫ MB) বেছে নিন');
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('ছবি খোলা যায়নি'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      160,
      160
    );
    const data = canvas.toDataURL('image/jpeg', 0.75);
    if (data.length > 60000) throw new Error('ছবিটি খুব বড়');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function GroupDiscovery({
  uid,
  isPreview = false,
  groups,
  selected,
  setSelected,
  refreshGroups,
  onOpenLive,
}) {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('study');
  const [visibility, setVisibility] = useState('public');
  const [invite, setInvite] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(null);
  const [emblem, setEmblem] = useState('focus');

  async function explore() {
    if (isPreview || !uid) {
      setCards(
        (groups || []).map((g) => ({
          ...g,
          joined: true,
        }))
      );
      return;
    }
    const { data, error } = await db.rpc('sentry_explore_groups_v2');
    if (error) throw error;
    const sorted = [...(data || [])].sort((a, b) => {
      const aDef = isDefaultHsc28Group(a.name) ? 0 : 1;
      const bDef = isDefaultHsc28Group(b.name) ? 0 : 1;
      if (aDef !== bDef) return aDef - bDef;
      return (Number(b.member_count) || 0) - (Number(a.member_count) || 0);
    });
    setCards(sorted);
  }

  async function actions(fn) {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    explore().catch((e) => setMessage(e.message));
  }, [uid, isPreview, groups.length]);

  const activeGroup = groups.find((x) => x.id === selected);
  const owned = Boolean(uid && activeGroup?.owner_id === uid);

  async function loadRequests() {
    if (!owned || !selected || isPreview) {
      setRequests([]);
      return;
    }
    const { data, error } = await db.rpc('sentry_group_requests', { cid: selected });
    if (error) throw error;
    setRequests(data || []);
  }

  useEffect(() => {
    setCode('');
    loadRequests().catch((e) => setMessage(e.message));
  }, [selected, owned, isPreview]);

  return (
    <div className="v30-groups-stack v37-lounge-groups clean-view-stage">
      {/* 1. YOUR JOINED STUDY ROOMS (e.g. "এইচএসসি 28" + joined rooms — ZERO "ডিফল্ট ব্যাচ রুম") */}
      <section className="v30-lounge-card">
        <div className="v30-group-head">
          <div>
            <span className="v40-eyebrow">YOUR STUDY SPACES</span><h3>আপনার স্টাডি গ্রুপ</h3><p className="v40-section-desc">একসাথে পড়ুন, এগিয়ে যান নিজের গতিতে</p>
          </div>
          <button
            type="button"
            className="v30-lounge-primary-btn is-compact"
            onClick={() => setForm((v) => !v)}
          >
            <Plus size={15} /> নতুন গ্রুপ
          </button>
        </div>

        <div className="v40-summary"><span><b>{bnNum(groups.length)}</b> যুক্ত গ্রুপ</span><span>আপনার পছন্দের রুমে সরাসরি প্রবেশ করুন</span></div>
        <div className="v30-my-groups-grid">
          {groups.map((g) => {
            const active = selected === g.id;

            return (
              <button
                type="button"
                key={g.id}
                className={`v30-my-group-card ${active ? 'is-active' : ''}`}
                onClick={() => {
                  setSelected(g.id);
                  onOpenLive?.();
                }}
              >
                <span className="v30-mg-emblem">
                  {g.image_data ? <img src={g.image_data} alt="" /> : <GroupVector id={g.emblem || g.icon} />}
                </span>
                <div className="v30-mg-copy">
                  <strong>{g.name}</strong>
                  <div className="v40-group-meta">
                    <span className={`v40-group-pill ${active ? 'is-active' : ''}`}>
                      {active ? 'নির্বাচিত' : 'যুক্ত'}
                    </span>
                    {g.member_count != null && (
                      <span className="v40-group-members">{bnNum(g.member_count)} সদস্য</span>
                    )}
                    <span className="v40-open-link">
                      লাইভ রুম <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
                
              </button>
            );
          })}
        </div>

        {form && (
          <GroupComposer
            name={name}
            setName={setName}
            tagline={tag}
            setTagline={setTag}
            category={category}
            setCategory={setCategory}
            visibility={visibility}
            setVisibility={setVisibility}
            emblem={emblem}
            setEmblem={setEmblem}
            onUpload={(e) => setImage(e.target.files?.[0] || null)}
            onClose={() => setForm(false)}
            busy={busy}
            onSubmit={(tintIndex) =>
              actions(async () => {
                if (isPreview) {
                  setForm(false);
                  setMessage('প্রিভিউ মোডে গ্রুপ তৈরি করা যায় না — Google লগইন করে আবার চেষ্টা করুন।');
                  return;
                }
                const encoded = image ? await compressedImage(image) : null;
                const { data, error } = await db.rpc('sentry_create_group', {
                  p_name: name.trim(),
                  p_tagline: tag.trim(),
                  p_category: category,
                  p_visibility: visibility,
                });
                if (error) throw error;
                await refreshGroups();
                setSelected(data);
                setName('');
                setTag('');
                setImage(null);
                setForm(false);
                if (encoded) {
                  await db.rpc('sentry_set_group_image', { cid: data, p_image: encoded });
                } else if (emblem) {
                  // Pre-made emblem becomes the group's badge straight away.
                  await db
                    .rpc('sentry_set_group_image', {
                      cid: data,
                      p_image: emblemDataUri(emblem, tintIndex),
                    })
                    .catch(() => {});
                }
                await explore();
                setMessage('গ্রুপ তৈরি হয়েছে!');
              })
            }
          />
        )}

        {!isPreview && (
          <div className="v30-invite-bar">
            <input
              placeholder="প্রাইভেট আমন্ত্রণ কোড…"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
            <button
              type="button"
              className="v30-lounge-ghost-btn"
              disabled={busy || !invite.trim()}
              onClick={() =>
                actions(async () => {
                  const { error } = await db.rpc('sentry_join_circle', {
                    invite_code: invite.trim(),
                  });
                  if (error) throw error;
                  setInvite('');
                  await refreshGroups();
                  setMessage('যুক্ত হওয়ার অনুরোধ পাঠানো হয়েছে।');
                })
              }
            >
              <KeyRound size={14} /> যুক্ত হোন
            </button>
          </div>
        )}

        {owned && !isDefaultHsc28Group(activeGroup?.name) && (
          <div className="v28-owner-bar">
            <button
              type="button"
              className="v30-lounge-ghost-btn is-compact"
              onClick={() =>
                actions(async () => {
                  const { data, error } = await db.rpc('sentry_create_invite', { cid: selected });
                  if (error) throw error;
                  setCode(data);
                })
              }
            >
              <Lock size={13} /> কোড তৈরি
            </button>
            {code && (
              <span className="sc-code">
                <strong>{code}</strong>
                <button
                  type="button"
                  className="v30-icon-glow-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </span>
            )}
            {requests.length > 0 && (
              <div className="v28-req-list">
                <h4>অনুরোধ ({bnNum(requests.length)})</h4>
                {requests.map((r) => (
                  <div className="sc-row" key={r.user_id}>
                    <strong>{r.display_name}</strong>
                    <button
                      type="button"
                      className="v30-lounge-primary-btn is-compact"
                      onClick={() =>
                        actions(async () => {
                          const { error } = await db.rpc('sentry_review_request', {
                            cid: selected,
                            requester: r.user_id,
                            approve: true,
                          });
                          if (error) throw error;
                          await loadRequests();
                          await refreshGroups();
                        })
                      }
                    >
                      অনুমোদন
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. EXPLORE PUBLIC ROOMS */}
      {cards.length > 0 && (
        <section className="v30-lounge-card">
          <div className="v30-group-head">
            <h3>
              <Globe size={17} /> আরও গ্রুপ আবিষ্কার করুন
            </h3>
          </div>

          <div className="v30-explore-grid">
            {cards
              .filter((c) => c.category !== 'no-fap')
              .map((c) => (
                <article className="v30-explore-card" key={c.id}>
                  <div className="v30-exp-top">
                    {c.image_data ? (
                      <img className="sc-group-image" src={c.image_data} alt="" />
                    ) : (
                      <span className="v30-mg-emblem"><GroupVector id={c.emblem || c.icon} /></span>
                    )}
                    <div>
                      <strong>{c.name}</strong>
                      <small>
                        <UsersRound size={12} /> {bnNum(c.member_count ?? 0)} সদস্য
                      </small>
                    </div>
                  </div>
                  {c.tagline && <p>{c.tagline}</p>}
                  <button
                    type="button"
                    className={
                      c.joined
                        ? 'v30-lounge-ghost-btn is-compact'
                        : 'v30-lounge-primary-btn is-compact'
                    }
                    disabled={busy}
                    onClick={() =>
                      actions(async () => {
                        if (c.joined || isPreview) {
                          setSelected(c.id);
                          onOpenLive?.();
                          return;
                        }
                        const { error } = await db.rpc('sentry_join_public_group', { cid: c.id });
                        if (error) throw error;
                        await refreshGroups();
                        setSelected(c.id);
                        await explore();
                      })
                    }
                  >
                    {c.joined ? 'রুম খুলুন' : 'যুক্ত হোন'} <ArrowUpRight size={14} />
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}

      {message && (
        <p role="status" className="sc-status-note">
          {message}
        </p>
      )}
    </div>
  );
}
