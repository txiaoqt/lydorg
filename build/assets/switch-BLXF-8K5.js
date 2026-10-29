import{c as u,ez as q,r as a,eD as C,eA as I,j as o,aX as M,eB as T,fC as F,fD as H,a2 as x}from"./index-CQKKWkoE.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=u("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=u("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=u("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=u("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=u("UserRound",[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]]);var b="Switch",[U,K]=q(b),[A,L]=U(b),P=a.forwardRef((t,s)=>{const{__scopeSwitch:e,name:n,checked:r,defaultChecked:v,required:l,disabled:c,value:d="on",onCheckedChange:m,form:i,...y}=t,[h,p]=a.useState(null),S=C(s,k=>p(k)),w=a.useRef(!1),g=h?i||!!h.closest("form"):!0,[f,_]=I({prop:r,defaultProp:v??!1,onChange:m,caller:b});return o.jsxs(A,{scope:e,checked:f,disabled:c,children:[o.jsx(M.button,{type:"button",role:"switch","aria-checked":f,"aria-required":l,"data-state":N(f),"data-disabled":c?"":void 0,disabled:c,value:d,...y,ref:S,onClick:T(t.onClick,k=>{_(B=>!B),g&&(w.current=k.isPropagationStopped(),w.current||k.stopPropagation())})}),g&&o.jsx(z,{control:h,bubbles:!w.current,name:n,value:d,checked:f,required:l,disabled:c,form:i,style:{transform:"translateX(-100%)"}})]})});P.displayName=b;var R="SwitchThumb",E=a.forwardRef((t,s)=>{const{__scopeSwitch:e,...n}=t,r=L(R,e);return o.jsx(M.span,{"data-state":N(r.checked),"data-disabled":r.disabled?"":void 0,...n,ref:s})});E.displayName=R;var V="SwitchBubbleInput",z=a.forwardRef(({__scopeSwitch:t,control:s,checked:e,bubbles:n=!0,...r},v)=>{const l=a.useRef(null),c=C(l,v),d=F(e),m=H(s);return a.useEffect(()=>{const i=l.current;if(!i)return;const y=window.HTMLInputElement.prototype,p=Object.getOwnPropertyDescriptor(y,"checked").set;if(d!==e&&p){const S=new Event("click",{bubbles:n});p.call(i,e),i.dispatchEvent(S)}},[d,e,n]),o.jsx("input",{type:"checkbox","aria-hidden":!0,defaultChecked:e,...r,tabIndex:-1,ref:c,style:{...r.style,...m,position:"absolute",pointerEvents:"none",opacity:0,margin:0}})});z.displayName=V;function N(t){return t?"checked":"unchecked"}var j=P,D=E;const O=a.forwardRef(({className:t,...s},e)=>o.jsx(j,{className:x("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",t),...s,ref:e,children:o.jsx(D,{className:x("pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0")})}));O.displayName=j.displayName;export{Z as F,$ as P,O as S,J as U,G as a,W as b};
