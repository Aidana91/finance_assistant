import{c as i,u as x,j as e,m as c,D as y,a as m}from"./index-BJ0aEZLz.js";/**
 * @license lucide-react v1.75.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r={name:"file-spreadsheet",size:24,node:[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]};r.node;const k=i(r);/**
 * @license lucide-react v1.75.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d={name:"file-text",size:24,node:[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]};d.node;const j=i(d);/**
 * @license lucide-react v1.75.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h={name:"table",size:24,node:[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]};h.node;const u=i(h);function M(){const{t:a}=x();async function l(t){const o=await m.get(`/exports/${t}`,{responseType:"blob"}),n=window.URL.createObjectURL(o.data),s=document.createElement("a");s.href=n,s.download=`financial-report.${t}`,s.click(),window.URL.revokeObjectURL(n)}const p=[{format:"pdf",title:a("PDF отчёт"),description:a("Готовый месячный финансовый документ"),icon:j},{format:"xlsx",title:a("Excel таблица"),description:a("Операции в формате XLSX"),icon:k},{format:"csv",title:a("CSV файл"),description:a("Данные для банковских систем и анализа"),icon:u}];return e.jsxs(c.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:"page",children:[e.jsx("header",{className:"page-header",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:a("DATA CENTER")}),e.jsx("h1",{children:a("Export Center")})]})}),e.jsx("section",{className:"export-grid",children:p.map(({format:t,title:o,description:n,icon:s})=>e.jsxs(c.article,{className:"panel export-card",whileHover:{y:-5},children:[e.jsx("div",{className:"export-icon",children:e.jsx(s,{})}),e.jsx("h2",{children:o}),e.jsx("p",{children:n}),e.jsxs("button",{className:"primary-button",type:"button",onClick:()=>l(t),children:[e.jsx(y,{size:17})," ",a("Скачать")]})]},t))})]})}export{M as default};
