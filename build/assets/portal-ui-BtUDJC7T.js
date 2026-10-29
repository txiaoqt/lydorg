import{c as r,r as i,j as e,aH as h,aI as p,aJ as x,aL as u,aM as y,aN as g,aP as k,ce as f,fE as j,gb as b,Z as C,gc as v,gd as M,fQ as w}from"./index-BznR8myp.js";import{a as N}from"./YpopValidationComputationPopover-CGVArgAN.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=r("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=r("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=r("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=r("Newspaper",[["path",{d:"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2",key:"7pis2x"}],["path",{d:"M18 14h-8",key:"sponae"}],["path",{d:"M15 18h-5",key:"95g1m2"}],["path",{d:"M10 6h8v4h-8V6Z",key:"smlsk5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=r("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=r("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=r("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);function Z(){const[a,c]=i.useState(null),s=i.useRef(null),t=i.useCallback(l=>{var n;(n=s.current)==null||n.call(s,l),s.current=null,c(null)},[]),d=i.useCallback(l=>{var n;return(n=s.current)==null||n.call(s,!1),new Promise(m=>{s.current=m,c(l)})},[]);i.useEffect(()=>()=>{var l;return(l=s.current)==null?void 0:l.call(s,!1)},[]);const o=e.jsx(h,{open:a!==null,onOpenChange:l=>{l||t(!1)},children:e.jsxs(p,{className:"w-[calc(100vw-2rem)] max-w-md rounded-2xl",children:[e.jsxs(x,{children:[e.jsx(u,{children:a==null?void 0:a.title}),e.jsx(y,{asChild:!0,children:e.jsx("div",{className:"whitespace-pre-line",children:a==null?void 0:a.description})})]}),e.jsxs(g,{children:[e.jsx(k,{onClick:()=>t(!1),children:(a==null?void 0:a.cancelLabel)??"Cancel"}),e.jsx(f,{className:a!=null&&a.destructive?"bg-destructive text-destructive-foreground hover:bg-destructive/90":void 0,onClick:()=>t(!0),children:(a==null?void 0:a.confirmLabel)??"Confirm"})]})]})});return{confirmAction:d,confirmationDialog:o}}const U=N,B=({title:a,description:c,children:s,action:t,headerClassName:d})=>e.jsxs(j,{className:"border-border/70 bg-card/90 shadow-sm",children:[e.jsxs(b,{className:C("gap-2 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6 sm:gap-4",t?"flex flex-col sm:flex-row sm:items-start sm:justify-between":"block",d),children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx(v,{className:"text-base sm:text-lg",children:a}),c?e.jsx(M,{className:"mt-1 text-sm",children:c}):null]}),t?e.jsx("div",{className:"w-full min-w-0 sm:w-auto sm:shrink-0",children:t}):null]}),e.jsx(w,{className:"px-4 pb-4 pt-0 sm:px-6 sm:pb-6",children:s})]}),T=({title:a,description:c,action:s,icon:t})=>e.jsxs("div",{className:"rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-2",children:[t?e.jsx("div",{className:"h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1",children:e.jsx(t,{className:"h-5 w-5"})}):null,e.jsx("p",{className:"font-bold text-foreground text-sm",children:a}),e.jsx("p",{className:"text-xs text-muted-foreground max-w-sm leading-relaxed",children:c}),s?e.jsx("div",{className:"pt-3",children:s}):null]});export{A as C,z as M,P as N,T as P,E as S,L as U,V as a,H as b,U as c,B as d,Z as u};
