import re,json,pathlib
text=pathlib.Path('src/data/hsc-2028-source.txt').read_text(); lines=text.splitlines(); catalog={s:{'1':[],'2':[]} for s in ['Physics','Chemistry','Math','Biology','Bangla','English']};catalog['ICT']={'':[]}
subject=None; paper=None; chapter=None; group=''
heads={'১':'Physics','২':'Physics','৩':'Chemistry','৪':'Chemistry','৫':'Math','৬':'Math','৭':'Biology','৮':'Biology','৯':'ICT'}
for line in lines:
 line=line.strip()
 m=re.match(r'^([১-৯])\. (পদার্থবিজ্ঞান|রসায়ন|উচ্চতর গণিত|জীববিজ্ঞান|তথ্য ও যোগাযোগ প্রযুক্তি)',line)
 if m:
  number='০১২৩৪৫৬৭৮৯'.index(m.group(1));subject=heads[m.group(1)];paper='' if number==9 else str(1 if number%2 else 2);chapter=None;continue
 if line.startswith('১০. বাংলা'):subject='Bangla';paper='1';chapter=None;group='';continue
 if line.startswith('১১. ইংরেজি'):subject='English';paper='1';chapter=None;group='';continue
 if subject in ['Physics','Chemistry','Math','Biology','ICT']:
  m=re.match(r'^অধ্যায় ([০-৯]+):\s*(.+)',line)
  if m:
   chapter={'name':f'অধ্যায় {m[1]}: {m[2]}','types':[]};catalog[subject][paper].append(chapter);group='';continue
  if chapter:
   m=re.match(r'^[-*]\s*(টাইপ [০-৯]+(?:\s*\([^)]*\))?):\s*(.+)',line)
   if m:chapter['types'].append({'name':(group+' · ' if line.startswith('*') and group else '')+m[1],'topics':[x.strip() for x in m[2].split(' | ') if x.strip()]});continue
   if re.match(r'^- (পরাবৃত্ত|উপবৃত্ত|অধিবৃত্ত)',line):group=line[2:].rstrip(':')
 elif subject=='Bangla':
  if line.startswith('বাংলা ২য় পত্র'):paper='2';group='';continue
  if line.startswith('গদ্য অংশ'):group='গদ্য';continue
  if line.startswith('পদ্য / কবিতা'):group='পদ্য';continue
  if line.startswith('সহপাঠ'):group='সহপাঠ';continue
  m=re.match(r'^[০-৯]+\.\s*(.+)',line)
  if paper=='1' and m and group:catalog[subject][paper].append({'name':group+' · '+m[1],'types':[]});continue
  if paper=='2' and (line.startswith('- ব্যাকরণ অংশ') or line.startswith('- নির্মিতি অংশ')):
   name='ব্যাকরণ' if line.startswith('- ব্যাকরণ') else 'নির্মিতি'
   for entry in line.split(':',1)[1].split('|'):
    catalog[subject][paper].append({'name':name+' · '+entry.strip(),'types':[]})
 elif subject=='English':
  if line.startswith('English 2nd Paper'):paper='2';group='';continue
  m=re.match(r'- Unit (\d+) \((.+?)\): (.+)',line)
  if m:catalog[subject]['1'].append({'name':'Unit '+m[1]+' · '+m[2],'types':[{'name':'Lessons','topics':[x.strip() for x in m[3].split('|')]}]});continue
  if line.startswith('- Short Stories:') or line.startswith('- Poems:') or line.startswith('- Drama:'):
   title,vals=line[2:].split(':',1);catalog[subject]['1'].append({'name':'Reading for Pleasure · '+title,'types':[{'name':title,'topics':[x.strip() for x in vals.split('|')]}]});continue
  if line.startswith('- Part 1 Reading') or line.startswith('- Part 2 Writing'):
   title,vals=line[2:].split(':',1);catalog[subject]['1'].append({'name':title,'types':[{'name':title,'topics':[x.strip() for x in vals.split('|')]}]});continue
  if line.startswith('- Part A Grammar'):group='Grammar';continue
  if line.startswith('- Part B Composition'):group='Composition';continue
  m=re.match(r'^(\d+)\.\s+(.+)',line)
  if paper=='2' and group and m:catalog[subject]['2'].append({'name':group+' · '+m[1]+'. '+m[2],'types':[]})
pathlib.Path('src/data/hscCatalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
for s,papers in catalog.items():
 for p,arr in papers.items():print(s,p,'chapters',len(arr),'types',sum(len(x['types']) for x in arr),'topics',sum(len(t['topics']) for x in arr for t in x['types']))
