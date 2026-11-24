import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.navigator=dom.window.navigator;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.requestAnimationFrame=cb=>setTimeout(cb,0);globalThis.IS_REACT_ACT_ENVIRONMENT=true;dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=(await import('react')).default;const {act}=await import('react');const {createRoot}=await import('react-dom/client');const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {default:CurriculumPicker,loadCurriculum}=await vite.ssrLoadModule('/src/components/CurriculumPicker.jsx');const {default:FocusMinutesPicker}=await vite.ssrLoadModule('/src/components/FocusMinutesPicker.jsx');await loadCurriculum();
 function Harness(){const [data,setData]=React.useState({paper:'',chapter:'',type:'',topic:''});const [minutes,setMinutes]=React.useState(50);return React.createElement('div',{},React.createElement(CurriculumPicker,{subject:'Physics',...data,onChange:setData}),React.createElement(FocusMinutesPicker,{value:minutes,onChange:setMinutes}),React.createElement('output',{},JSON.stringify({data,minutes})))}
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Harness)));const click=async el=>{assert.ok(el);await act(async()=>el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))};
 await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('প্রথম পত্র')));
 await click(document.querySelector('[aria-label="অধ্যায় বা ইউনিট নির্বাচন"]'));
 assert.ok(document.querySelector('.cs-search input'),'search appears in application menu');assert.equal(document.querySelector('select'),null,'chapter uses no native select');
 await click([...document.querySelectorAll('[role=option]')].find(x=>x.textContent.includes('ভেক্টর')));
 assert.ok(document.querySelector('output').textContent.includes('ভেক্টর'));assert.ok(document.querySelector('[aria-label="টাইপ নির্বাচন"]'));assert.equal(document.querySelector('.minute-popover'),null);
 await act(async()=>document.querySelector('[aria-label="ফোকাস সময় (মিনিট)"]').focus());assert.ok(document.querySelector('.minute-popover'));
 await click([...document.querySelectorAll('.minute-grid button')].find(x=>x.textContent.includes('90')));assert.ok(document.querySelector('output').textContent.includes('"minutes":90'));assert.equal(document.querySelector('.minute-popover'),null);
 await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('অন্য অধ্যায় লিখুন')));assert.equal(document.querySelectorAll('[aria-label="নিজের অধ্যায়"]').length,1);
 await act(async()=>root.unmount());console.log('PASS: paper → dark searchable chapter menu → chapter and type; minutes popover choice; custom chapter mode');
}finally{await vite.close();dom.window.close()}
