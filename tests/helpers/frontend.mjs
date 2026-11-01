import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {DECLARATIONS} from '../../lib/model.mjs';

export const walk=node=>[node,...node.children.flatMap(walk)];
const matches=(node,selector)=>{
  if(selector.startsWith('#'))return node.id===selector.slice(1);
  if(selector.startsWith('.'))return (node.className||'').split(' ').includes(selector.slice(1));
  const attr=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  if(attr)return node.getAttribute(attr[1])!==null&&(attr[2]===undefined||node.getAttribute(attr[1])===attr[2]);
  return node.tag===selector;
};
class Element {
  constructor(tag,text='',document){this.tag=tag;this._text=text;this.children=[];this.attrs={};this.events={};this.document=document;this.classList={add(){},remove(){}};}
  append(...children){for(const child of children){if(child.parent)child.parent.children=child.parent.children.filter(c=>c!==child);child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parent=null;this.children=[];this._text='';this.append(...children);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='class')this.className=String(value);else this[key]=value;}
  getAttribute(key){return this.attrs[key]??null;}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  async fire(type,event={}){for(const fn of this.events[type]||[])await fn({preventDefault(){},target:this,...event});}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set textContent(value){this.replaceChildren();this._text=String(value);}
  get value(){if(this._value!==undefined)return this._value;if(this.tag==='select')return (this.children.find(c=>c.selected)||this.children[0])?.value||'';return this.tag==='textarea'?this.textContent:'';}
  set value(value){this._value=String(value);if(this.tag==='select')for(const option of this.children)option.selected=option.value===String(value);}
  get firstChild(){return this.children[0]||new Element('svg','',this.document);}
  set innerHTML(value){this._html=value;}
  get isConnected(){return this.parent?.isConnected??this.isRoot??false;}
  querySelector(selector){return walk(this).slice(1).find(node=>matches(node,selector))||null;}
  querySelectorAll(selector){return walk(this).slice(1).filter(node=>matches(node,selector));}
  get elements(){return new Proxy({},{get:(_,name)=>walk(this).find(node=>node.name===name)});}
  focus(){this.document.activeElement=this;this.focused=true;}
  showModal(){this.open=true;}
  close(){this.open=false;for(const fn of this.events.close||[])fn();}
  scrollIntoView(){}
  select(){}
  setCustomValidity(value){this.validationMessage=value;}
  reportValidity(){return !this.validationMessage&&!walk(this).some(node=>node.validationMessage);}
}
export function frontend({fetcher,user={id:'buyer',name:'Participant',phoneVerified:true,phoneLast4:'1234',status:'active',role:'member'},phoneVerification=false}={}){
  const doc={activeElement:null},roots=new Map();
  for(const key of ['#app','#modal','#modal-content','.modal-close','#toast']){const node=new Element(key,'',doc);node.isRoot=true;roots.set(key,node);}
  Object.assign(doc,{createElement:tag=>new Element(tag,'',doc),createTextNode:text=>new Element('#text',text,doc),querySelector:selector=>roots.get(selector)||roots.get('#app').querySelector(selector),querySelectorAll:selector=>[...new Set([...roots.values()].flatMap(walk))].filter(node=>matches(node,selector))});
  const location={pathname:'/atelier',search:'',origin:'https://test.invalid'},windowEvents={},writes=[],requests=[],timers=[];
  const history={pushState(_state,_title,path){writes.push(path);const url=new URL(path,location.origin);location.pathname=url.pathname;location.search=url.search;},replaceState(...args){this.pushState(...args);}};
  const bootstrap={user,capabilities:{phoneVerification,payments:false},declarations:DECLARATIONS};
  const context={Node:Element,document:doc,window:{location,history,scrollTo(){},addEventListener(type,fn){windowEvents[type]=fn;},matchMedia:()=>({matches:false})},crypto:webcrypto,
    fetch:async(path,options={})=>{requests.push({path,options});const result=await fetcher?.(path,options);if(result instanceof Response)return result;if(result!==undefined)return Response.json(result);return Response.json(path==='/api/bootstrap'?bootstrap:path==='/api/conversations'?{conversations:[]}:path==='/api/listings'?{listings:[]}:{});},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},FormData:class{constructor(form){this.values=walk(form).filter(n=>n.name).map(n=>[n.name,n.value]);}[Symbol.iterator](){return this.values[Symbol.iterator]();}},URL,URLSearchParams,Intl,console,fixtureBootstrap:bootstrap};
  vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../../public/gallery.js',import.meta.url),'utf8'),context);vm.runInContext(fs.readFileSync(new URL('../../public/trust.js',import.meta.url),'utf8'),context);vm.runInContext(fs.readFileSync(new URL('../../public/messages-live.js',import.meta.url),'utf8'),context);vm.runInContext(fs.readFileSync(new URL('../../public/draft-storage.js',import.meta.url),'utf8'),context);vm.runInContext(fs.readFileSync(new URL('../../public/app.js',import.meta.url),'utf8').replace(/\ninit\(\);\s*$/,''),context);
  const run=code=>vm.runInContext(code,context);run('S.boot=fixtureBootstrap');
  return {run,context,doc,roots,location,writes,requests,windowEvents,timers,button:(root,label)=>walk(root).find(n=>n.tag==='button'&&n.textContent===label)};
}
export const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
