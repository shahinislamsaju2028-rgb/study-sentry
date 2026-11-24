import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.navigator=dom.window.navigator;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;const {act}=await import('react');const {createRoot}=await import('react-dom/client');
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
 const {default:Select}=await vite.ssrLoadModule('/src/components/CustomSelect.jsx');
 const {CustomDateInput,CustomTimeInput}=await vite.ssrLoadModule('/src/components/CustomPickers.jsx');
 function App(){const [v,sv]=React.useState('3'),[d,sd]=React.useState('2026-11-10'),[t,st]=React.useState('10:15');return React.createElement('div',{},React.createElement(Select,{value:v,onChange:e=>sv(e.target.value),'aria-label':'sets'},[2,3,4].map(x=>React.createElement('option',{key:x,value:x},x+' sets'))),React.createElement(CustomDateInput,{value:d,onChange:e=>sd(e.target.value),'aria-label':'date'}),React.createElement(CustomTimeInput,{value:t,onChange:e=>st(e.target.value),'aria-label':'time'}),React.createElement('output',{},[v,d,t].join('|')))}
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(App)));
 const click=async e=>{assert.ok(e);await act(async()=>e.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))};
 await click(document.querySelector('[aria-label="sets"]'));assert.ok(document.querySelector('[role=listbox]'));assert.equal(document.querySelectorAll('select').length,0);await click([...document.querySelectorAll('[role=option]')].find(x=>x.textContent.includes('4 sets')));assert.ok(document.querySelector('output').textContent.startsWith('4|'));assert.equal(document.querySelector('[role=listbox]'),null);
 await click(document.querySelector('[aria-label^="date,"]'));assert.ok(document.querySelector('.cp-calendar'));await click(document.querySelector('.cp-days button:not(:disabled)'));assert.equal(document.querySelector('.cp-calendar'),null);
 await click(document.querySelector('[aria-label^="time,"]'));assert.ok(document.querySelector('.cp-time'));await click([...document.querySelectorAll('.cp-presets button')].find(x=>x.textContent==='45'));assert.ok(document.querySelector('output').textContent.endsWith('10:45'));await click([...document.querySelectorAll('.cp-footer button')].find(x=>x.textContent==='ok'));await act(async()=>root.unmount());console.log('PASS custom dropdown selection, calendar selection, time preset');
} finally {await vite.close();dom.window.close()}
