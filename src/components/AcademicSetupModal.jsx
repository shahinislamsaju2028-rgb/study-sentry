import CustomSelect from './CustomSelect';
import React, { useMemo, useState } from 'react';
import { BookOpenCheck, Check, GraduationCap, ShieldCheck } from 'lucide-react';
import { ModalShell } from './Modals';
import { useStudy } from '../context/StudyContext';
import { bnNum, bnSubject } from '../utils/bangla';
import { subjectColor } from '../utils/subjectColors';

const HUMAN_CORE = ['Economics', 'Civics & Good Governance', 'Logic', 'Geography & Environment'];
const HUMAN_FOURTH = ['Psychology', 'Economics', 'Civics & Good Governance', 'Logic', 'Geography & Environment', 'History', 'Islamic History & Culture', 'Sociology', 'Social Work'];
const BUSINESS_FOURTH = ['Economics', 'Statistics', 'Geography & Environment'];
const BUSINESS_MAIN = ['Finance, Banking & Insurance', 'Production Management & Marketing'];
const PRETTY = {
  humanities: 'মানবিক', business: 'ব্যবসায় শিক্ষা', science: 'বিজ্ঞান',
};
const SUB_IDS = {
  Physics: 'subj_phy', Chemistry: 'subj_chem', Math: 'subj_math_standard', 'Higher Math': 'subj_math',
  Biology: 'subj_bio', ICT: 'subj_ict', Bangla: 'subj_bn', English: 'subj_eng',
};
const ALIASES = {
  'Higher Math': ['Higher Mathematics', 'Mathematics'],
  'Business Organization & Management': ['Business Organization and Management'],
};
const SLUG = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const keyFor = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[^a-z0-9\x00-\x7f]+/g, '').trim();

function CourseSelect({ label, value, options, onChange, note }) {
  return <label className="academic-select-field"><span>{label}</span><CustomSelect aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}><option value="">বেছে নিন</option>{options.map((s) => <option key={s} value={s}>{bnSubject(s)}</option>)}</CustomSelect>{note && <small>{note}</small>}</label>;
}

export default function AcademicSetupModal({ userId, onClose }) {
  const { state, commit, updateProfile, toast } = useStudy();
  const [batch, setBatch] = useState('');
  const [otherBatch, setOtherBatch] = useState('');
  const [group, setGroup] = useState('');
  const [history, setHistory] = useState('History');
  const [social, setSocial] = useState('Sociology');
  const [humanCore, setHumanCore] = useState('Economics');
  const [humanFourth, setHumanFourth] = useState('Psychology');
  const [businessMain, setBusinessMain] = useState('Finance, Banking & Insurance');
  const [businessFourth, setBusinessFourth] = useState('Statistics');
  const [scienceOptions, setScienceOptions] = useState(['Higher Math', 'Biology']);
  const [saving, setSaving] = useState(false);
  const humanSelected = [history, social, humanCore].filter(Boolean);
  const fourthOptions = HUMAN_FOURTH.filter((s) => !humanSelected.includes(s));
  const batchLabel = batch === '2028' ? '2028' : batch === 'other' ? otherBatch.trim() : '';
  const supported = batch === '2028';
  const chosenSubjects = useMemo(() => {
    if (group === 'humanities') return [history, social, humanCore, humanFourth].filter(Boolean);
    if (group === 'business') return ['Accounting', 'Business Organization & Management', businessMain, businessFourth].filter(Boolean);
    if (group === 'science') return ['Physics', 'Chemistry', ...scienceOptions];
    return [];
  }, [group, history, social, humanCore, humanFourth, businessMain, businessFourth, scienceOptions]);

  const setScience = (name, checked) => setScienceOptions((old) => checked ? [...new Set([...old, name])] : old.filter((x) => x !== name));

  const save = async (e) => {
    e.preventDefault();
    if (!group || !batchLabel) return;
    if (group === 'humanities' && (!history || !social || !humanCore || !humanFourth)) return;
    if (group === 'business' && (!businessMain || !businessFourth)) return;
    if (group === 'science' && !scienceOptions.length) return;
    setSaving(true);
    try {
      const scienceData = group === 'science' && supported ? (await import('../data/hscCatalog.json')).default : null;
      const groupData = group !== 'science' && supported ? (await import('../data/hscGroupCatalog.json')).default?.['2028'] : null;
      const catalogGroup = group === 'science' ? (scienceData || {}) : (groupData?.[group] || {});
      commit((prev) => {
        const subjects = [...(prev.subjects || [])];
        const syllabi = [...(prev.syllabus || [])];
        const subjectIdByName = new Map();
        const known = (name) => {
          const aliases = [name, ...(ALIASES[name] || [])].map(keyFor);
          return subjects.find((s) => aliases.includes(keyFor(s.name)));
        };
        for (const name of [...new Set(chosenSubjects)]) {
          let item = known(name);
          if (!item) {
            let id = SUB_IDS[name] && !subjects.some((s) => s.id === SUB_IDS[name]) ? SUB_IDS[name] : `academic-${SLUG(name)}`;
            let suffix = 2;
            while (subjects.some((s) => s.id === id)) id = `academic-${SLUG(name)}-${suffix++}`;
            item = { id, name, color: subjectColor(name), dailyGoalMin: 60, icon: '📚', academicGroup: group, academicBatch: batchLabel };
            if (!subjects.some((s) => s.id === id)) subjects.push(item);
          } else if (!item.academicGroup || item.academicGroup === group) {
            item = { ...item, academicGroup: group, academicBatch: batchLabel };
            const position = subjects.findIndex((s) => s.id === item.id);
            if (position >= 0) subjects[position] = item;
          }
          subjectIdByName.set(name, item.id);
        }
        if (supported) {
          for (const name of [...new Set(chosenSubjects)]) {
            const curriculum = catalogGroup[name] || groupData?.humanities?.[name] || {};
            const subjectId = subjectIdByName.get(name);
            for (const paper of ['1', '2']) {
              const chapters = curriculum[paper] || [];
              chapters.forEach((chapter, index) => {
                if (syllabi.some((c) => c.subjectId === subjectId && c.paper === paper && c.chapter === chapter.name)) return;
                syllabi.push({
                  id: `hsc${batchLabel}-${SLUG(name)}-${paper}-${index + 1}`,
                  subjectId,
                  chapter: chapter.name,
                  paper,
                  theory: false,
                  notes: false,
                  practice: false,
                  revised: false,
                  academicBatch: batchLabel,
                  source: 'HSC 2028 group curriculum',
                });
              });
            }
          }
        }
        return {
          ...prev,
          subjects,
          syllabus: syllabi,
          profile: {
            ...(prev.profile || {}),
            academicBatch: batchLabel,
            academicGroup: group,
            academicSubjects: [...new Set(chosenSubjects)],
            academicSetupDone: true,
            academicSetupUserId: userId,
          },
        };
      });
      updateProfile({ academicBatch: batchLabel, academicGroup: group, academicSubjects: [...new Set(chosenSubjects)], academicSetupDone: true, academicSetupUserId: userId });
      toast(supported ? `${PRETTY[group]} HSC ২০২৮ সিলেবাস যুক্ত হয়েছে।` : 'শিক্ষাগত প্রোফাইল সংরক্ষণ হয়েছে। অন্য ব্যাচের জন্য অধ্যায় নিজে যোগ করুন।');
      onClose();
    } catch (err) {
      toast(`সিলেবাস যোগ করা যায়নি: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return <ModalShell title="আপনার HSC প্রোফাইল" eyebrow="Google sign-in সম্পন্ন" wide className="academic-setup-modal" onClose={onClose}>
    <form className="academic-setup-form" onSubmit={save}>
      <p className="academic-setup-lead"><GraduationCap size={17}/> ব্যাচ ও বিভাগ বেছে নিলে সেই অনুযায়ী বিষয় ও অধ্যায় আপনার সিলেবাসে যোগ হবে।</p>
      <section className="academic-select-field"><span>HSC ব্যাচ</span><div className="academic-batch-options" role="radiogroup" aria-label="HSC ব্যাচ">
        {[['2028','HSC ২০২৮','সিলেবাস যুক্ত হবে'],['other','অন্য ব্যাচ','ব্যাচের নাম লিখুন']].map(([id,label,sub])=><button key={id} type="button" role="radio" aria-checked={batch===id} className={`academic-batch-option ${batch===id?'is-selected':''}`} onClick={()=>setBatch(id)}>{label}<small>{sub}</small></button>)}
      </div></section>
      {batch === 'other' && <label className="academic-select-field"><span>আপনার ব্যাচ</span><input required inputMode="numeric" placeholder="যেমন ২০২৯" value={otherBatch} onChange={(e) => setOtherBatch(e.target.value)}/><small>বর্তমানে স্বয়ংক্রিয় অধ্যায়তালিকা শুধু HSC ২০২৮-এর জন্য।</small></label>}
      <div className="academic-group-choices" role="radiogroup" aria-label="শিক্ষা বিভাগ">
        {['science','business','humanities'].map((id) => <button key={id} type="button" role="radio" aria-checked={group === id} className={`academic-group-choice ${group === id ? 'is-selected' : ''}`} onClick={() => setGroup(id)}><span>{group === id ? <Check size={15}/> : <GraduationCap size={15}/>}</span><strong>{PRETTY[id]}</strong><small>{id === 'science' ? 'পদার্থ · রসায়ন · গণিত/জীববিজ্ঞান' : id === 'business' ? 'হিসাববিজ্ঞান · ব্যবসায় সংগঠন' : 'মানবিকের পছন্দের বিষয় ও ঐচ্ছিক'}</small></button>)}
      </div>
      {group === 'science' && <div className="academic-track-panel"><strong>বিজ্ঞান বিভাগের বিষয়</strong><div className="academic-required-courses"><span>পদার্থবিজ্ঞান</span><span>রসায়ন</span></div><small>নিচের বিষয়গুলো থেকে এক বা একাধিক বেছে নিন (ঐচ্ছিক বিষয়সহ)।</small><div className="academic-check-grid">{['Higher Math','Biology'].map((name) => <label key={name}><input type="checkbox" checked={scienceOptions.includes(name)} onChange={(e) => setScience(name,e.target.checked)}/>{bnSubject(name)}</label>)}</div></div>}
      {group === 'humanities' && <div className="academic-track-panel"><strong>মানবিকের বিষয়-নির্বাচন</strong><div className="academic-select-row"><CourseSelect label="ইতিহাসের বিকল্প" value={history} options={['History','Islamic History & Culture']} onChange={setHistory}/><CourseSelect label="সমাজবিজ্ঞানের বিকল্প" value={social} options={['Sociology','Social Work']} onChange={setSocial}/></div><div className="academic-select-row"><CourseSelect label="নৈর্বাচনিক বিষয়" value={humanCore} options={HUMAN_CORE} onChange={setHumanCore}/><CourseSelect label="ঐচ্ছিক / ৪র্থ বিষয়" value={humanFourth} options={fourthOptions} onChange={setHumanFourth} note="একাধিক বিকল্প থেকে আপনার কলেজে নির্ধারিত বিষয়টি বেছে নিন।"/></div></div>}
      {group === 'business' && <div className="academic-track-panel"><strong>ব্যবসায় শিক্ষার বিষয়-নির্বাচন</strong><div className="academic-required-courses"><span>হিসাববিজ্ঞান · বাধ্যতামূলক</span><span>ব্যবসায় সংগঠন ও ব্যবস্থাপনা · বাধ্যতামূলক</span></div><div className="academic-select-row"><CourseSelect label="নৈর্বাচনিক (একটি)" value={businessMain} options={BUSINESS_MAIN} onChange={setBusinessMain}/><CourseSelect label="ঐচ্ছিক / ৪র্থ বিষয়" value={businessFourth} options={BUSINESS_FOURTH} onChange={setBusinessFourth}/></div></div>}
      {group && <div className="academic-import-summary"><BookOpenCheck size={16}/><span>{supported ? <><b>{bnNum(chosenSubjects.length)}</b>টি বিষয়ের জন্য অধ্যায় তালিকা যোগ হবে।</> : <>ব্যাচের নাম সংরক্ষণ হবে; auto syllabus শুধু HSC ২০২৮-এর জন্য আছে।</>}</span></div>}
      <p className="academic-source-note"><ShieldCheck size={14}/> HSC ২০২৮-এর ব্যবসায়/মানবিক অধ্যায় তালিকা আপনার দেওয়া ফাইল থেকে নেওয়া। বোর্ডের চূড়ান্ত বিজ্ঞপ্তি ও নিজের বইয়ের সূচির সঙ্গে মিলিয়ে নিন।</p>
      <footer className="academic-setup-actions"><button type="button" className="academic-later-btn" onClick={onClose}>এখন নয়</button><button type="submit" className="academic-save-btn" disabled={!group || !batchLabel || (group === 'science' && !scienceOptions.length) || (group === 'humanities' && (!history || !social || !humanCore || !humanFourth)) || (group === 'business' && (!businessMain || !businessFourth)) || saving}>{saving ? 'সংরক্ষণ হচ্ছে…' : 'বিষয় ও সিলেবাস যুক্ত করুন'}</button></footer>
    </form>
  </ModalShell>;
}
