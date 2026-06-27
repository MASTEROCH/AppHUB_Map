/* AppHub.Studio — карта экосистемы. Общая логика для публичной и внутренней версий.
   Режим берётся из <body data-mode="public|internal">. Редактор работает только в internal. */
(function(){
const NS="http://www.w3.org/2000/svg",KEY="apphub-map-v2";
const MODE=document.body.dataset.mode||"public";
const EDITABLE=MODE==="internal";
const C={ROOT:"#C5FF5F",L1:"#f472b6",L2:"#fb923c",L3:"#2dd4bf",UT:"#38bdf8",MM:"#a78bfa",GAMES:"#fbbf24"};
const LAYERS=[["ROOT","Корень"],["L1","L1 · Users"],["L2","L2 · Агрегаторы"],["L3","L3 · Бизнесы"],["UT","Утилиты"],["MM","Мультимедиа"],["GAMES","Игры"]];
const STATUS={live:{c:"#34d399",t:"Живой продукт"},dev:{c:"#fbbf24",t:"В разработке"},concept:{c:"#8a8f98",t:"Концепт"},core:{c:"#C5FF5F",t:"Ядро петли"}};
const DEF=window.APPHUB_DATA;

/* ——— state ——— */
let N,L,ZONES,editMode=false,selectedId=null,firstRender=true,filter="all",pendImgFor=null;
function loadState(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.nodes&&s.links)return s;}catch(e){}return null;}
function initState(){
  ZONES=DEF.zones;
  if(EDITABLE){const s=loadState();if(s){N=s.nodes;L=s.links;ZONES=s.zones||DEF.zones;return;}}
  N=structuredClone(DEF.nodes);L=structuredClone(DEF.links);ZONES=structuredClone(DEF.zones);
}
function save(){if(!EDITABLE)return;try{localStorage.setItem(KEY,JSON.stringify({nodes:N,links:L,zones:ZONES}));}catch(e){toast("⚠ Не удалось сохранить (лимит)");}}
initState();

/* ——— helpers ——— */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ex=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
const esc=s=>(s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cx=id=>N[id].x,cy=id=>N[id].y;
const stOf=n=>STATUS[n.s]||STATUS.concept;
const svg=$("#map"),vp=$("#viewport");
const gLoop=$("#loopg"),gZ=$("#zones"),gL=$("#links"),gN=$("#nodes");
const panel=$("#panel"),diagram=$(".diagram");
if(DEF.viewBox)svg.setAttribute("viewBox",DEF.viewBox);
const feeder=(a,b)=>["UT","MM","GAMES","ROOT"].includes(N[a].layer)||["UT","MM","GAMES","ROOT"].includes(N[b].layer);
const isMain=(a,b)=>{const k=[a,b].sort().join();return k===["l1","l2"].sort().join()||k===["l2","l3"].sort().join()||k===["l3","l1"].sort().join();};
const fcol=(a,b)=>{const x=[N[a].layer,N[b].layer];if(isMain(a,b))return"url(#flow)";if(x.includes("ROOT"))return C.ROOT;if(x.includes("UT"))return C.UT;if(x.includes("MM"))return C.MM;if(x.includes("GAMES"))return C.GAMES;return"url(#flow)";};
const path=(a,b)=>{const A={x:cx(a),y:cy(a)},B={x:cx(b),y:cy(b)},mx=(A.x+B.x)/2;return`M${A.x},${A.y} C${mx},${A.y} ${mx},${B.y} ${B.x},${B.y}`;};
const STATUS_KEYS=["live","dev","concept"];
const matchFilter=n=>{if(filter==="all")return true;if(STATUS_KEYS.includes(filter))return n.s===filter||(filter==="live"&&n.s==="core");return n.layer===filter;};
let linkEls=[],nodeEls={},cometN=0;
function comet(d,color,dur,delay,r){const mp=ex("path",{d,fill:"none",stroke:"none"});const id="cm"+(cometN++);mp.id=id;gLoop.appendChild(mp);
  const g=ex("g",{}),rr=r||4;
  g.appendChild(ex("circle",{r:rr*2.8,fill:color,opacity:.16}));
  g.appendChild(ex("circle",{r:rr,fill:color,opacity:.95}));
  const am=ex("animateMotion",{dur:dur+"s",repeatCount:"indefinite",begin:(delay||0)+"s"});
  const mpath=ex("mpath",{});mpath.setAttribute("href","#"+id);mpath.setAttributeNS("http://www.w3.org/1999/xlink","href","#"+id);
  am.appendChild(mpath);g.appendChild(am);gLoop.appendChild(g);}

/* ——— render ——— */
function render(){
  gLoop.innerHTML="";gZ.innerHTML="";gL.innerHTML="";gN.innerHTML="";linkEls=[];nodeEls={};cometN=0;clearSubs();
  if(N.l1&&N.l3){
    const arc=(d,delays)=>{gLoop.appendChild(ex("path",{d,fill:"none",stroke:"url(#loop)","stroke-width":11,opacity:.12}));
      gLoop.appendChild(ex("path",{class:"flowline",d,fill:"none",stroke:"url(#loop)","stroke-width":2.4,opacity:.6,"stroke-linecap":"round"}));
      delays.forEach(dl=>comet(d,"#C5FF5F",4.5,dl,4.5));};
    const dBot=`M${N.l3.x},${N.l3.y+62} C${N.l3.x+40},760 ${N.l1.x-40},760 ${N.l1.x},${N.l1.y+62}`;
    const dTop=`M${N.l3.x},${N.l3.y-62} C${N.l3.x+40},40 ${N.l1.x-40},40 ${N.l1.x},${N.l1.y-62}`;
    arc(dBot,[0,2.2]);arc(dTop,[1.1,3.3]);
    const t=ex("text",{class:"loopBadge",x:(N.l1.x+N.l3.x)/2,y:752});t.textContent="↺ ПЕТЛЯ · ВОЗВРАТ В L1";gLoop.appendChild(t);
  }
  ZONES.forEach(z=>{gZ.appendChild(ex("rect",{x:z.bx,y:z.by,width:z.bw,height:z.bh,rx:16,fill:z.c,"fill-opacity":.05,stroke:z.c,"stroke-opacity":.22,"stroke-width":1}));
    const l=ex("text",{class:"zlabel",x:z.x,y:z.y,fill:z.c});l.textContent=z.label;gZ.appendChild(l);
    const s=ex("text",{class:"zsub",x:z.x,y:z.y+16});s.textContent=z.sub;gZ.appendChild(s);});
  L.forEach(([a,b])=>{if(!N[a]||!N[b])return;const d=path(a,b),f=feeder(a,b),mn=isMain(a,b),col=fcol(a,b);
    const glow=ex("path",{d,fill:"none",stroke:col,"stroke-width":f?4:6,opacity:f?.08:.11});
    const core=ex("path",{d,fill:"none",stroke:col,"stroke-width":f?1.3:(mn?2.4:1.5),opacity:f?.3:(mn?.8:.32),"stroke-linecap":"round","stroke-dasharray":f?"6 7":(mn?"9 13":"none")});
    if(mn)core.classList.add("flowline");
    gL.appendChild(glow);gL.appendChild(core);linkEls.push({a,b,glow,core,f,mn});
    if(mn&&!(a==="l3"&&b==="l1")&&!(a==="l1"&&b==="l3")){comet(d,"#fff",3.2,0,3.5);comet(d,"#fff",3.2,1.6,3.5);}});
  let idx=0;
  Object.entries(N).forEach(([id,n])=>{const c=C[n.layer]||C.L2,w=n.t==="hub"?n.w:(n.label.length>7?112:96),h=n.t==="hub"?n.h:46;
    const g=ex("g",{class:"node","data-id":id});
    if(firstRender){g.classList.add("nodeIn");g.style.animationDelay=(idx*14)+"ms";}
    g.appendChild(ex("rect",{x:n.x-w/2-3,y:n.y-h/2-3,width:w+6,height:h+6,rx:n.t==="hub"?21:16,fill:c,opacity:.18}));
    g.appendChild(ex("rect",{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx:n.t==="hub"?18:13,fill:"#0c0e16"}));
    g.appendChild(ex("rect",{class:"card",x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx:n.t==="hub"?18:13,fill:c,"fill-opacity":.13,stroke:c,"stroke-width":1.6}));
    g.appendChild(ex("rect",{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx:n.t==="hub"?18:13,fill:"url(#sheen)","pointer-events":"none"}));
    if(n.t==="hub"){const t1=ex("text",{class:"clabel",x:n.x,y:n.y-9,"font-size":15});t1.textContent=n.label;g.appendChild(t1);
      const t2=ex("text",{class:"csub",x:n.x,y:n.y+13,"font-size":12});t2.textContent=n.sub||"";g.appendChild(t2);}
    else{const t=ex("text",{class:"clabel",x:n.x,y:n.y,"font-size":n.label.length>7?14:(n.label.length>6?15:17)});t.textContent=n.label;g.appendChild(t);
      if(n.s&&n.s!=="core"){const st=stOf(n);g.appendChild(ex("circle",{cx:n.x+w/2-9,cy:n.y-h/2+9,r:5,fill:st.c,stroke:"#0c0e16","stroke-width":1.5}));}}
    gN.appendChild(g);nodeEls[id]=g;idx++;});
  firstRender=false;applyFilter();
  if(selectedId&&N[selectedId])applyHighlight(selectedId);
}

/* ——— sub-directions ——— */
let subEls=[];
function clearSubs(){subEls.forEach(e=>e.remove());subEls=[];}
function showSubs(id){const n=N[id];if(!n.subs||!n.subs.length)return;const px=n.x,py=n.y;
  n.subs.forEach((s0,i)=>{let s={...s0};if(s.x==null||s.y==null){const span=Math.min(n.subs.length-1,5),ang=(-0.6+1.2*(span?i/span:.5)),r=130;s.x=px+Math.sin(ang)*r;s.y=py+90+Math.cos(ang)*22;}
    const d=`M${px},${py} C${(px+s.x)/2},${py} ${(px+s.x)/2},${s.y} ${s.x},${s.y}`;
    const ln=ex("path",{d,fill:"none",stroke:"#2dd4bf","stroke-width":1.4,opacity:.55,"stroke-dasharray":"4 5"});gL.appendChild(ln);subEls.push(ln);
    const w=s.label.length>10?150:(s.label.length>7?122:96),h=34,g=ex("g",{class:"subnode nodeIn"});
    g.appendChild(ex("rect",{x:s.x-w/2-3,y:s.y-h/2-3,width:w+6,height:h+6,rx:13,fill:"#2dd4bf",opacity:.18}));
    g.appendChild(ex("rect",{x:s.x-w/2,y:s.y-h/2,width:w,height:h,rx:10,fill:"#0c0e16"}));
    g.appendChild(ex("rect",{x:s.x-w/2,y:s.y-h/2,width:w,height:h,rx:10,fill:"#2dd4bf","fill-opacity":.13,stroke:"#2dd4bf","stroke-width":1.3}));
    const t=ex("text",{class:"clabel",x:s.x,y:s.y,"font-size":12});t.textContent=s.label;g.appendChild(t);
    gN.appendChild(g);subEls.push(g);});}

/* ——— highlight / filter ——— */
function baseLinks(){linkEls.forEach(le=>{le.core.setAttribute("opacity",le.f?.3:(le.mn?.8:.32));le.core.setAttribute("stroke-width",le.f?1.3:(le.mn?2.4:1.5));le.glow.setAttribute("opacity",le.f?.07:.09);});}
function applyHighlight(id){const conn=new Set([id]);
  linkEls.forEach(le=>{const on=le.a===id||le.b===id;
    le.core.setAttribute("opacity",on?1:.04);le.core.setAttribute("stroke-width",on?(le.f?2.2:2.8):(le.f?1.3:(le.mn?2.4:1.5)));le.glow.setAttribute("opacity",on?.32:.02);
    if(on){conn.add(le.a);conn.add(le.b);}});
  Object.entries(nodeEls).forEach(([nid,g])=>{g.style.opacity=conn.has(nid)?1:.26;g.classList.toggle("sel",nid===id);});}
function previewLinks(id){if(selectedId)return;const conn=new Set([id]);
  linkEls.forEach(le=>{const on=le.a===id||le.b===id;if(on){le.core.setAttribute("opacity",.9);le.glow.setAttribute("opacity",.22);conn.add(le.a);conn.add(le.b);}});}
function applyFilter(){Object.entries(nodeEls).forEach(([id,g])=>{g.classList.toggle("dim",!matchFilter(N[id]));});}

const CLOSE='<button class="pclose" data-close aria-label="Закрыть">✕</button>';
function select(id){if(!N[id])return;selectedId=id;clearSubs();applyHighlight(id);if(N[id].subs)showSubs(id);
  if(EDITABLE&&editMode)renderEdit(id);else renderInfo(id);
  panel.classList.add("open");
  if(!(EDITABLE&&editMode))focusSelected(id);
  try{history.replaceState(null,"","#"+id);}catch(e){location.hash=id;}}
function reset(){const had=selectedId;selectedId=null;clearSubs();baseLinks();
  Object.values(nodeEls).forEach(g=>{g.style.opacity=1;g.classList.remove("sel");});applyFilter();
  panel.classList.remove("open");if(EDITABLE&&editMode)panel.innerHTML=defaultPanel();
  if(had&&!(EDITABLE&&editMode))focusAll(true);
  try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}}

/* ——— panels ——— */
function defaultPanel(){
  if(EDITABLE&&editMode)return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>РЕДАКТОР</div><div class="pTitle">Режим редактирования</div><p class="hint">Тащи узлы мышью. Клик по узлу — правка описания, скриншотов, ссылок, статуса и связей. Кнопка «Проект» — создать новый и связать в цепочку.</p>`;
  if(MODE==="public")return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>ЭКОСИСТЕМА</div><div class="pTitle">Одна петля — десятки продуктов</div><p class="hint">Это не отдельные приложения, а связанная экосистема: пользователи, агрегаторы и бизнесы замыкаются в цикл, усиливая друг друга. Кликни любой узел — описание, статус и живая ссылка.</p><div class="cta"><h4>Хотите свой продукт в этой петле?</h4><p>Мы собираем приложения под управлением ИИ и встраиваем их в общий поток трафика.</p><a class="pLink" href="https://apphub.studio" target="_blank" rel="noopener">Связаться с AppHub →</a></div>`;
  return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>КАРТА</div><div class="pTitle">Ткни любой узел</div><p class="hint">Клик по проекту — описание, скриншоты и ссылки. У Dine, Shops, Tours, Events клик раскрывает направления. Колесо/пинч — зум, тащи — двигай карту.</p>`;
}
function shots(n){const arr=n.imgs||(n.img?[n.img]:[]);if(!arr.length)return"";
  if(arr.length===1)return`<div class="shot" data-img="${esc(arr[0])}"><img src="${esc(arr[0])}" alt="${esc(n.label)}" loading="lazy"></div>`;
  return`<div class="shots">${arr.map(s=>`<img src="${esc(s)}" data-img="${esc(s)}" alt="${esc(n.label)}" loading="lazy">`).join("")}</div>`;}
function linkBtns(n){const arr=n.links||(n.link?[{label:"Открыть продукт",url:n.link}]:[]);
  if(arr.length)return arr.map(l=>`<a class="pLink" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} →</a>`).join("");
  return`<span class="pLink off">${n.s==="live"?"ссылка скоро":"в разработке"}</span>`;}
function renderInfo(id){const n=N[id],c=C[n.layer]||C.L2,st=stOf(n);
  const noShot=MODE==="public"&&n.s==="live"&&!(n.imgs&&n.imgs.length)&&!n.img;
  panel.innerHTML=`${CLOSE}<div class="badge" style="color:${c};border:1px solid ${c}55;background:${c}16"><i style="background:${c}"></i>${esc(n.layer)}</div>
  <div class="pTitle">${esc(n.label)}</div><div class="pCat">${esc(n.cat||"")}</div>
  ${n.s&&n.s!=="core"?`<div class="statusLine" style="color:${st.c};background:${st.c}14"><span class="sd" style="background:${st.c}"></span>${st.t}</div>`:""}
  ${n.desc?`<div class="pSec"><h4>Что это</h4><p>${esc(n.desc)}</p></div>`:""}
  ${n.inter?`<div class="pSec"><h4>Как взаимодействует</h4><p>${esc(n.inter)}</p></div>`:""}
  ${shots(n)}${noShot?'<div class="noshot">скриншоты скоро</div>':""}<div style="margin-top:14px">${linkBtns(n)}</div>`;}

/* ——— editor (internal only) ——— */
function renderEdit(id){const n=N[id],c=C[n.layer]||C.L2;
  const links=n.links||(n.link?[{label:"Открыть",url:n.link}]:[]);const subs=n.subs||[];const imgs=n.imgs||(n.img?[n.img]:[]);
  const others=Object.keys(N).filter(k=>k!==id).sort((a,b)=>N[a].label.localeCompare(N[b].label,"ru"));
  const linked=new Set(L.filter(p=>p.includes(id)).map(p=>p[0]===id?p[1]:p[0]));
  panel.innerHTML=`${CLOSE}<div class="badge" style="color:${c};border:1px solid ${c}55;background:${c}16"><i style="background:${c}"></i>ПРАВКА</div>
  <div class="fld"><label>Название</label><input id="f-label" value="${esc(n.label)}"></div>
  <div class="fld"><label>Слой</label><select id="f-layer">${LAYERS.map(([k,t])=>`<option value="${k}"${k===n.layer?" selected":""}>${t}</option>`).join("")}</select></div>
  <div class="fld"><label>Статус</label><select id="f-status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}"${k===(n.s||"concept")?" selected":""}>${v.t}</option>`).join("")}</select></div>
  <div class="fld"><label>Категория (подпись)</label><input id="f-cat" value="${esc(n.cat||"")}"></div>
  <div class="fld"><label>Что это</label><textarea id="f-desc">${esc(n.desc||"")}</textarea></div>
  <div class="fld"><label>Как взаимодействует</label><textarea id="f-inter">${esc(n.inter||"")}</textarea></div>
  <div class="fld"><label>Ссылки на продукт</label><div id="f-links">${links.map((l,i)=>linkRow(l,i)).join("")}</div><button class="addrow" data-act="addlink">+ ссылка</button></div>
  <div class="fld"><label>Скриншоты</label><div class="thumbs" id="f-imgs">${imgs.map((s,i)=>`<div class="thumb"><img src="${esc(s)}"><b data-act="delimg" data-i="${i}">×</b></div>`).join("")}</div><button class="addrow" data-act="addimg">+ загрузить скриншот(ы)</button></div>
  <div class="fld"><label>Под-направления</label><div id="f-subs">${subs.map((s,i)=>subRow(s,i)).join("")}</div><button class="addrow" data-act="addsub">+ направление</button></div>
  <div class="fld"><label>Связи в цепочке (${linked.size})</label><div class="conns" id="f-conns">${others.map(k=>`<label class="conn"><input type="checkbox" data-conn="${k}"${linked.has(k)?" checked":""}><span class="dotc" style="background:${C[N[k].layer]||C.L2}"></span>${esc(N[k].label)}</label>`).join("")}</div></div>
  <div class="frow"><button class="btn prim" data-act="save">Сохранить</button><button class="btn" data-act="close">Закрыть</button></div>
  <div class="frow"><button class="btn danger" data-act="del" style="flex:1;justify-content:center">Удалить проект</button></div>`;
  panel.dataset.editing=id;}
function linkRow(l,i){return`<div class="lrow" data-i="${i}"><input class="l-label" placeholder="Кнопка" value="${esc(l.label||"")}"><input class="l-url" placeholder="https://" value="${esc(l.url||"")}"><button class="mini del" data-act="dellink" data-i="${i}">×</button></div>`;}
function subRow(s,i){return`<div class="srow" data-i="${i}" data-x="${s.x!=null?s.x:""}" data-y="${s.y!=null?s.y:""}"><input class="s-label" placeholder="Направление" value="${esc(s.label||"")}"><button class="mini del" data-act="delsub" data-i="${i}">×</button></div>`;}
function commitForm(){const id=panel.dataset.editing;if(!id||!N[id])return;const n=N[id];const g=s=>panel.querySelector(s);
  if(g("#f-label"))n.label=g("#f-label").value.trim()||n.label;
  if(g("#f-layer"))n.layer=g("#f-layer").value;
  if(g("#f-status"))n.s=g("#f-status").value;
  if(g("#f-cat"))n.cat=g("#f-cat").value;
  if(g("#f-desc"))n.desc=g("#f-desc").value;
  if(g("#f-inter"))n.inter=g("#f-inter").value;
  const links=[...panel.querySelectorAll("#f-links .lrow")].map(r=>({label:r.querySelector(".l-label").value.trim(),url:r.querySelector(".l-url").value.trim()})).filter(l=>l.url);
  if(links.length){n.links=links;delete n.link;}else{delete n.links;delete n.link;}
  const subs=[...panel.querySelectorAll("#f-subs .srow")].map(r=>{const o={label:r.querySelector(".s-label").value.trim()};if(r.dataset.x!=="")o.x=+r.dataset.x;if(r.dataset.y!=="")o.y=+r.dataset.y;return o;}).filter(s=>s.label);
  if(subs.length)n.subs=subs;else delete n.subs;}

/* ——— deep-link ——— */
function openHash(){const id=decodeURIComponent(location.hash.replace("#",""));if(id&&N[id])select(id);else reset();}

/* ——— lightbox / toast ——— */
const lb=$("#lightbox");function openLight(src){lb.querySelector("img").src=src;lb.style.display="flex";}
lb.addEventListener("click",()=>lb.style.display="none");
let toastT;function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1800);}

/* ——— stats / chips / legend (built by JS) ——— */
function buildChrome(){
  const products=Object.values(N).filter(n=>n.s!=="core");
  const live=products.filter(n=>n.s==="live").length,dev=products.filter(n=>n.s==="dev").length;
  const statsEl=$("#stats");if(statsEl)statsEl.innerHTML=`<div class="stat"><b>${products.length}</b><span>продуктов</span></div><div class="stat"><b style="color:#34d399">${live}</b><span>в проде</span></div><div class="stat"><b style="color:#fbbf24">${dev}</b><span>в разработке</span></div><div class="stat"><b>3</b><span>слоя петли</span></div><div class="stat"><b>4</b><span>источника трафика</span></div>`;
  const chipsEl=$("#chips");
  if(chipsEl){
    const LL={ROOT:"Корень",L1:"L1",L2:"L2",L3:"L3",UT:"Утилиты",MM:"Медиа",GAMES:"Игры"};
    const sdefs=[["all","Все",null],["live","Живые",STATUS.live.c],["dev","В разработке",STATUS.dev.c],["concept","Концепты",STATUS.concept.c]];
    const ldefs=LAYERS.map(([k])=>[k,LL[k],C[k]]);
    const chip=([k,t,c],on)=>`<button class="chip${on?" on":""}" data-f="${k}">${c?`<span class="cdot" style="background:${c};color:${c}"></span>`:""}${t}</button>`;
    chipsEl.innerHTML=sdefs.map(d=>chip(d,d[0]==="all")).join("")+'<span class="chsep"></span>'+ldefs.map(d=>chip(d,false)).join("");
    chipsEl.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;filter=b.dataset.f;$$("#chips .chip").forEach(x=>x.classList.toggle("on",x===b));applyFilter();focusFilter();});}
  const tip=document.createElement("div");tip.className="tip";tip.id="tooltip";diagram.appendChild(tip);
}

/* ——— zoom / pan / pinch / node-drag ——— */
let zk=1,ztx=0,zty=0;
const applyZ=()=>vp.setAttribute("transform",`translate(${ztx} ${zty}) scale(${zk})`);
const svgPt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
function zoomAt(px,py,f){const nk=Math.min(4,Math.max(.4,zk*f)),k=nk/zk;ztx=px-(px-ztx)*k;zty=py-(py-zty)*k;zk=nk;applyZ();}
svg.addEventListener("wheel",e=>{e.preventDefault();const p=svgPt(e);zoomAt(p.x,p.y,e.deltaY<0?1.12:1/1.12);},{passive:false});
$(".zoom").addEventListener("click",e=>{const z=e.target.closest("button")?.dataset.z;if(!z)return;vp.classList.add("smooth");const c=vbCenter();if(z==="reset"){zk=1;ztx=0;zty=0;applyZ();}else zoomAt(c[0],c[1],z==="in"?1.3:1/1.3);setTimeout(()=>{if(tourIdx<0)vp.classList.remove("smooth");},360);});

const ptrs=new Map();let dragging=false,moved=false,sx,sy,stx,sty,pinchD=0,nodeDrag=null;
svg.addEventListener("pointerdown",e=>{e.preventDefault();ptrs.set(e.pointerId,e);
  if(ptrs.size===2){dragging=false;nodeDrag=null;const[a,b]=[...ptrs.values()];pinchD=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);return;}
  const ng=e.target.closest(".node");
  if(EDITABLE&&editMode&&ng){const id=ng.dataset.id;const p=svgPt(e);nodeDrag={id,ox:N[id].x,oy:N[id].y,px:p.x,py:p.y};moved=false;}
  else{dragging=true;moved=false;sx=e.clientX;sy=e.clientY;stx=ztx;sty=zty;}});
window.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,e);
  if(ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinchD){const p=svgPt({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});zoomAt(p.x,p.y,d/pinchD);moved=true;}pinchD=d;return;}
  if(nodeDrag){const p=svgPt(e);const dx=p.x-nodeDrag.px,dy=p.y-nodeDrag.py;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;N[nodeDrag.id].x=nodeDrag.ox+dx;N[nodeDrag.id].y=nodeDrag.oy+dy;liveMove(nodeDrag.id);return;}
  if(dragging){const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;const m=svg.getScreenCTM();ztx=stx+dx/m.a;zty=sty+dy/m.d;applyZ();}});
const upP=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(ptrs.size<2)pinchD=0;if(nodeDrag){if(moved)save();nodeDrag=null;}if(ptrs.size===0)dragging=false;};
window.addEventListener("pointerup",upP);window.addEventListener("pointercancel",upP);
function liveMove(id){const n=N[id],g=nodeEls[id];if(!g)return;const w=n.t==="hub"?n.w:(n.label.length>7?112:96),h=n.t==="hub"?n.h:46;
  g.querySelectorAll("rect").forEach(r=>{r.setAttribute("x",n.x-w/2);r.setAttribute("y",n.y-h/2);});
  const cir=g.querySelector("circle");if(cir){cir.setAttribute("cx",n.x+w/2-9);cir.setAttribute("cy",n.y-h/2+9);}
  const tx=g.querySelectorAll("text");if(n.t==="hub"){if(tx[0]){tx[0].setAttribute("x",n.x);tx[0].setAttribute("y",n.y-9);}if(tx[1]){tx[1].setAttribute("x",n.x);tx[1].setAttribute("y",n.y+13);}}else if(tx[0]){tx[0].setAttribute("x",n.x);tx[0].setAttribute("y",n.y);}
  linkEls.forEach(le=>{if(le.a===id||le.b===id){const d=path(le.a,le.b);le.core.setAttribute("d",d);le.glow.setAttribute("d",d);}});}

/* ——— hover tooltip + preview ——— */
svg.addEventListener("pointerover",e=>{const ng=e.target.closest(".node");if(!ng||dragging||nodeDrag)return;const id=ng.dataset.id,n=N[id];if(!n)return;
  previewLinks(id);const tip=$("#tooltip");if(tip){const st=stOf(n);tip.innerHTML=`<b>${esc(n.label)}</b><i>${esc(n.cat||"")}</i>${n.s&&n.s!=="core"?` · <i style="color:${st.c}">${st.t}</i>`:""}`;tip.classList.add("show");moveTip(e);}});
svg.addEventListener("pointermove",e=>{if($("#tooltip")?.classList.contains("show"))moveTip(e);});
svg.addEventListener("pointerout",e=>{if(e.target.closest(".node")&&!e.relatedTarget?.closest?.(".node")){$("#tooltip")?.classList.remove("show");if(!selectedId)baseLinks();else applyHighlight(selectedId);}});
function moveTip(e){const tip=$("#tooltip"),r=diagram.getBoundingClientRect();let x=e.clientX-r.left+14,y=e.clientY-r.top+14;if(x>r.width-180)x-=200;tip.style.left=x+"px";tip.style.top=y+"px";}

/* ——— click ——— */
svg.addEventListener("click",e=>{if(moved){moved=false;return;}const ng=e.target.closest(".node");if(ng){select(ng.dataset.id);return;}if(e.target.closest(".subnode"))return;reset();});
window.addEventListener("keydown",e=>{if(e.key==="Escape"){lb.style.display="none";reset();}});

/* ——— panel actions (editor) ——— */
panel.addEventListener("click",e=>{
  if(e.target.closest("[data-close]")){reset();return;}
  const shot=e.target.closest("[data-img]");if(shot){openLight(shot.dataset.img);return;}
  if(!EDITABLE)return;const act=e.target.closest("[data-act]")?.dataset.act;if(!act)return;const id=panel.dataset.editing;
  if(act==="addlink"){commitForm();(N[id].links=N[id].links||[]).push({label:"",url:""});renderEdit(id);}
  else if(act==="dellink"){commitForm();if(N[id].links)N[id].links.splice(+e.target.dataset.i,1);renderEdit(id);}
  else if(act==="addsub"){commitForm();(N[id].subs=N[id].subs||[]).push({label:""});renderEdit(id);}
  else if(act==="delsub"){commitForm();if(N[id].subs)N[id].subs.splice(+e.target.dataset.i,1);renderEdit(id);}
  else if(act==="addimg"){pendImgFor=id;commitForm();$("#fileImg").click();}
  else if(act==="delimg"){commitForm();const arr=N[id].imgs||(N[id].img?[N[id].img]:[]);arr.splice(+e.target.dataset.i,1);N[id].imgs=arr;delete N[id].img;save();renderEdit(id);}
  else if(act==="save"){commitForm();save();render();select(id);toast("✓ Сохранено");}
  else if(act==="close"){reset();}
  else if(act==="del"){if(confirm("Удалить «"+N[id].label+"» и его связи?")){delete N[id];L=L.filter(p=>!p.includes(id));save();render();reset();toast("Проект удалён");}}
});
if(EDITABLE){
  panel.addEventListener("change",e=>{const cb=e.target.closest("[data-conn]");if(!cb)return;const id=panel.dataset.editing,other=cb.dataset.conn;commitForm();
    if(cb.checked){if(!L.some(p=>p.includes(id)&&p.includes(other)))L.push([id,other]);}else{L=L.filter(p=>!(p.includes(id)&&p.includes(other)));}
    save();render();select(id);});
  function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=1000;let{width:w,height:h}=img;if(w>max){h=h*max/w;w=max;}const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);res(cv.toDataURL("image/jpeg",.82));};img.onerror=rej;img.src=r.result;};r.onerror=rej;r.readAsDataURL(file);});}
  $("#fileImg").addEventListener("change",async e=>{const id=pendImgFor;const files=[...e.target.files];e.target.value="";if(!id||!N[id]||!files.length)return;const arr=N[id].imgs||(N[id].img?[N[id].img]:[]);delete N[id].img;for(const f of files){try{arr.push(await fileToDataURL(f));}catch(_){}}N[id].imgs=arr;save();renderEdit(id);toast("✓ Скриншот добавлен");});

  const editBtn=$("#editBtn");
  editBtn?.addEventListener("click",()=>{editMode=!editMode;document.body.classList.toggle("edit",editMode);editBtn.classList.toggle("on",editMode);if(selectedId)select(selectedId);else reset();toast(editMode?"✏️ Редактор включён":"👁 Просмотр");});
  $("#addBtn")?.addEventListener("click",()=>{if(!editMode){editMode=true;document.body.classList.add("edit");editBtn.classList.add("on");}const id="p"+Date.now().toString(36);const X=(660-ztx)/zk,Y=(435-zty)/zk;N[id]={t:"mini",layer:"L2",s:"concept",x:Math.round(X),y:Math.round(Y),label:"Новый проект",cat:"",desc:"",inter:"",links:[],imgs:[]};save();render();select(id);toast("➕ Проект создан — заполни и свяжи");});
  $("#expBtn")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify({nodes:N,links:L,zones:ZONES},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="apphub-map.json";a.click();URL.revokeObjectURL(a.href);toast("⬇ Экспортировано — вшей в data.js");});
  $("#impBtn")?.addEventListener("click",()=>$("#fileJson").click());
  $("#fileJson")?.addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);if(!s.nodes||!s.links)throw 0;N=s.nodes;L=s.links;ZONES=s.zones||ZONES;save();firstRender=true;render();buildChrome();reset();toast("⬆ Импортировано");}catch(_){toast("⚠ Неверный файл");}};r.readAsText(f);});
  $("#resetBtn")?.addEventListener("click",()=>{if(confirm("Сбросить карту к исходному (data.js)? Правки в браузере удалятся.")){localStorage.removeItem(KEY);initState();firstRender=true;render();reset();toast("↺ Сброшено к исходному");}});
}

/* ——— search ——— */
$("#q")?.addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();
  if(!q){if(selectedId)applyHighlight(selectedId);else{baseLinks();applyFilter();}return;}
  let hit=null;Object.entries(nodeEls).forEach(([id,g])=>{const m=N[id].label.toLowerCase().includes(q)||(N[id].cat||"").toLowerCase().includes(q);g.style.opacity=m?1:.12;g.classList.toggle("sel",m&&!hit);if(m&&!hit)hit=id;});
  linkEls.forEach(le=>{le.core.setAttribute("opacity",.04);le.glow.setAttribute("opacity",.02);});});

/* ——— демо-тур (интерактивный онбординг) ——— */
const TOUR=[
  {t:"Добро пожаловать 👋",x:"Это карта экосистемы AppHub — 22 продукта, связанных в одну петлю трафика. За минуту покажу, как она устроена. Можно пропустить в любой момент.",focus:"all"},
  {t:"L1 · Пользователь и AI-агент",x:"Всё начинается здесь. У каждого пользователя — личный AI-ассистент: сам находит предложения, всё готовит, остаётся подтвердить и оплатить.",focus:"l1",scale:1.5,spot:["l1"]},
  {t:"L2 · Агрегаторы",x:"Агент идёт к агрегаторам. Они подбирают подходящие бизнесы под нишу и собирают готовое предложение.",focus:"l2",scale:1.5,spot:["l2"]},
  {t:"L3 · Бизнесы",x:"Агрегатор направляет в конкретные бизнесы: бронь, заказ, оплата. Это рестораны, туры, аренда, события и десятки других.",focus:"l3",scale:1.5,spot:["l3"]},
  {t:"↺ Петля замыкается",x:"Бизнес возвращает пользователя обратно в L1 — и цикл повторяется. Каждый продукт усиливает поток трафика для остальных. В этом сила экосистемы.",focus:"all",spot:["l1","l2","l3"]},
  {t:"4 источника трафика",x:"По углам — бот, утилиты, мультимедиа и игры. Они бесплатно приводят аудиторию извне и питают петлю.",focus:"all",spot:["menu","creator","editcmd","leados","news","musichaed","arcades","boardgames"]},
  {t:"Статусы продуктов",x:"Зелёная точка — продукт уже в проде. Жёлтая — в разработке. Вот, например, Neon — живой агрегатор Батуми. Кликни узел — увидишь описание и рабочую ссылку.",focus:"neon",scale:1.9,spot:["neon"],select:"neon"},
  {t:"Твоя очередь 🚀",x:"Готово! Кликай любой узел, фильтруй по статусу сверху, ищи продукты. Поехали.",focus:"all"}
];
let tourIdx=-1,tourBg,tourCard;
function vbCenter(){const v=svg.viewBox.baseVal;return[v.x+v.width/2,v.y+v.height/2];}
function smooth(on){vp.classList.toggle("smooth",on);}
function smoothPulse(){vp.classList.add("smooth");setTimeout(()=>{if(tourIdx<0)vp.classList.remove("smooth");},780);}
const isMob=()=>window.innerWidth<=760;
/* центрировать viewBox-точку (cx,cy) в точке экрана (доля высоты yf, сдвиг влево xoff) при масштабе scale */
function panTo(cx,cy,scale,yf,xoff){const rect=svg.getBoundingClientRect();
  const pt=svgPt({clientX:rect.left+rect.width/2-(xoff||0),clientY:rect.top+rect.height*(yf==null?0.5:yf)});
  zk=Math.max(.4,Math.min(4,scale));ztx=pt.x-zk*cx;zty=pt.y-zk*cy;applyZ();}
function focusNode(id,scale){const n=N[id];if(!n)return;const mob=isMob();panTo(n.x,n.y,scale||(mob?1.7:1.5),mob?0.24:0.36);}
function focusCenter(scale,yf){const c=vbCenter();panTo(c[0],c[1],scale,yf);}
function focusAll(sm){if(sm)smoothPulse();focusCenter(isMob()?1.85:1,isMob()?0.5:0.5);}
function focusSelected(id){const n=N[id];if(!n)return;const mob=isMob();
  panTo(n.x,n.y,n.t==="hub"?(mob?1.5:1.35):(mob?2:1.75),mob?0.12:0.46,mob?0:204);smoothPulse();}
function focusFilter(){const ids=Object.keys(N).filter(id=>matchFilter(N[id]));
  if(filter==="all"||ids.length>=Object.keys(N).length-1||!ids.length){focusAll(true);return;}
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  ids.forEach(id=>{const n=N[id],w=(n.t==="hub"?n.w:110),h=(n.t==="hub"?n.h:46);mnx=Math.min(mnx,n.x-w/2);mxx=Math.max(mxx,n.x+w/2);mny=Math.min(mny,n.y-h/2);mxy=Math.max(mxy,n.y+h/2);});
  const v=svg.viewBox.baseVal,rect=svg.getBoundingClientRect(),m=Math.min(rect.width/v.width,rect.height/v.height);
  const pad=70,bw=(mxx-mnx)+pad*2,bh=(mxy-mny)+pad*2;
  const fit=Math.min(rect.width/(m*bw),(rect.height*(isMob()?0.7:0.92))/(m*bh));
  smoothPulse();panTo((mnx+mxx)/2,(mny+mxy)/2,Math.min(fit,3.2),isMob()?0.42:0.5);}
function spotlight(ids){const set=new Set(ids||[]);Object.entries(nodeEls).forEach(([id,g])=>{g.classList.toggle("spot",set.has(id));g.style.opacity=(!ids||!ids.length||set.has(id))?1:.1;});}
function buildTour(){
  tourBg=document.createElement("div");tourBg.id="tourbg";tourBg.className="hidden";document.body.appendChild(tourBg);
  tourCard=document.createElement("div");tourCard.id="tour";tourCard.className="tour hidden";
  tourCard.innerHTML=`<div class="tdots"></div><h3></h3><p></p><div class="trow"><button class="tlink" data-t="skip">Пропустить тур</button><div class="grow"></div><button class="btn" data-t="prev">Назад</button><button class="btn prim" data-t="next">Далее</button></div>`;
  document.body.appendChild(tourCard);
  tourCard.addEventListener("click",e=>{const t=e.target.closest("[data-t]")?.dataset.t;if(!t)return;if(t==="skip")endTour();else if(t==="prev")tourGo(tourIdx-1);else tourGo(tourIdx+1);});
}
function startTour(){if(!tourCard)buildTour();selectedId=null;tourBg.classList.remove("hidden");tourCard.classList.remove("hidden");document.body.classList.add("touring");smooth(true);tourGo(0);try{localStorage.setItem("apphub-toured","1");}catch(e){}}
function endTour(){tourIdx=-1;document.body.classList.remove("touring");spotlight(null);smooth(true);focusAll();setTimeout(()=>smooth(false),720);tourBg&&tourBg.classList.add("hidden");tourCard&&tourCard.classList.add("hidden");reset();}
function tourGo(i){if(i<0)return;if(i>=TOUR.length){endTour();return;}tourIdx=i;const s=TOUR[i];
  tourCard.querySelector("h3").textContent=s.t;tourCard.querySelector("p").textContent=s.x;
  tourCard.querySelector(".tdots").innerHTML=TOUR.map((_,j)=>`<i class="${j===i?"on":""}"></i>`).join("");
  tourCard.querySelector('[data-t="prev"]').style.visibility=i===0?"hidden":"visible";
  tourCard.querySelector('[data-t="next"]').textContent=i===TOUR.length-1?"Готово ✓":"Далее →";
  if(s.focus==="all")focusCenter(isMob()?1.05:1,isMob()?0.4:0.5);else if(s.focus)focusNode(s.focus,s.scale);
  spotlight(s.spot||null);
  if(s.select&&N[s.select]){clearSubs();renderInfo(s.select);panel.classList.add("open");}else panel.classList.remove("open");
}
$("#tourBtn")?.addEventListener("click",startTour);

/* ——— go ——— */
render();buildChrome();
if(location.hash)openHash();else{reset();focusAll();}
window.addEventListener("hashchange",openHash);
if(MODE==="public"&&!location.hash){let toured;try{toured=localStorage.getItem("apphub-toured");}catch(e){}if(!toured)setTimeout(startTour,950);}
})();
