/* AppHub.Studio — карта экосистемы. Общая логика для публичной и внутренней версий.
   Режим берётся из <body data-mode="public|internal">. Редактор работает только в internal. */
(function(){
const NS="http://www.w3.org/2000/svg",KEY="apphub-map-v3";
const MODE=document.body.dataset.mode||"public";
// Сейчас (фаза разработки) редактор виден ПО УМОЛЧАНИЮ — кнопка «Редактор» в шапке.
// Чтобы дать клиенту чистую витрину без редактора — добавь к URL флаг ?client (или ?clean / ?view).
const Q=(()=>{try{return new URLSearchParams(location.search);}catch(e){return new URLSearchParams();}})();
// общая база (Supabase) для совместной правки
const SYNC=(window.APPHUB_SYNC&&window.APPHUB_SYNC.url)?window.APPHUB_SYNC:null;
// Редактор открывается ТОЛЬКО по секретной ссылке (?key=СЕКРЕТ). Без ключа — чистая витрина для клиентов.
const EDIT_UNLOCK=(SYNC&&SYNC.writeKey)?(Q.get("key")===SYNC.writeKey):(Q.has("edit")||Q.has("admin")||Q.has("key"));
const EDITABLE=MODE==="internal"||EDIT_UNLOCK;
const GATED=EDITABLE&&MODE!=="internal";
const CAN_WRITE=!!(SYNC&&EDITABLE&&(!SYNC.writeKey||Q.get("key")===SYNC.writeKey));
const WHO=((Q.get("who")||"").trim())||"—";
const C={ROOT:"#C5FF5F",L1:"#f472b6",L2:"#fb923c",L3:"#2dd4bf",NET:"#C5FF5F",UT:"#38bdf8",MM:"#a78bfa",GAMES:"#fbbf24"};
const LAYERS=[["ROOT","Студия"],["L1","L1 · Users"],["L2","L2 · Агрегаторы"],["L3","L3 · Бизнесы"],["NET","Loop · сеть"],["UT","Утилиты"],["MM","Мультимедиа"],["GAMES","Игры"]];
const STATUS={live:{c:"#34d399",t:"Живой продукт"},dev:{c:"#fbbf24",t:"В разработке"},concept:{c:"#8a8f98",t:"Концепт"},core:{c:"#C5FF5F",t:"Ядро петли"}};
const DOMS=[["Батуми","#38bdf8"],["Еда","#fb923c"],["Туризм","#2dd4bf"],["Недвижимость","#f59e0b"],["Ритейл","#a78bfa"],["Здоровье","#f472b6"],["Город и дом","#818cf8"]];
const META=(window.APPHUB_DATA&&window.APPHUB_DATA.meta)||{};
const SOC_ICO={
  tg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.9 2a10 10 0 100 20 10 10 0 000-20zm4.6 6.9l-1.5 7.3c-.1.5-.4.6-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.2.2-.5.2l.2-2.5 4.5-4c.2-.2 0-.3-.3-.1L8.8 13l-2.4-.7c-.5-.2-.5-.5.1-.8l9.3-3.6c.4-.1.8.1.7.9z"/></svg>',
  ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.2 4.7H5.4l11.3 14.5z"/></svg>',
  in:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6zM8 19H5V9.5h3V19zM6.5 8.2a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4zM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5S12.7 13 12.7 14.3V19h-3V9.5h2.9v1.3c.4-.8 1.4-1.5 2.8-1.5 3 0 3.6 2 3.6 4.6V19z"/></svg>',
  ph:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1.4 12h-2.9v3h-2V7h4.9a3.5 3.5 0 010 7zm0-5h-2.9v3h2.9a1.5 1.5 0 000-3z"/></svg>',
  web:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>'};
function socialRow(cap){const a=META.social||[];if(!a.length)return"";return`<div class="socrow">${cap?`<span class="soccap">${esc(cap)}</span>`:""}<div class="socs">${a.map(x=>`<a class="soc" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.label)}" aria-label="${esc(x.label)}">${SOC_ICO[x.k]||SOC_ICO.web}</a>`).join("")}</div></div>`;}
const PF_URL=META.portfolioUrl||"https://t.me/Portfolio_AppHub_Bot",PF_GAL=META.galleryBase||"https://apphub-portfolio-livid.vercel.app/gallery/";
const DOMC=Object.fromEntries(DOMS);
const LBADGE={ROOT:"СТУДИЯ",NET:"LOOP · СЕТЬ",UT:"УТИЛИТА",MM:"МЕДИА",GAMES:"ИГРЫ"};
const DEF=window.APPHUB_DATA;
/* ——— ПОРТРЕТ (телефон): схема перестраивается вертикально — студия → L1 → L2 → L3 → Loop → кейсы → ядро → игры → медиа.
   Координаты из data.js — десктопные; на телефоне они пересчитываются на лету и НЕ сохраняются. ——— */
const PORTRAIT=window.innerWidth<=760&&Q.has("portrait");   // по решению Роча (15.09): на телефоне — та же схема, что на десктопе; портрет — опцией ?portrait
const MOBW=520,MOBC=260;
try{if(/Chrome\//.test(navigator.userAgent)&&!/Edg\/|OPR\//.test(navigator.userAgent)&&CSS.supports("backdrop-filter","url(#x)")&&!matchMedia("(prefers-reduced-transparency:reduce)").matches)document.documentElement.classList.add("lg-real");}catch(e){}

/* ——— state ——— */
let N,L,ZONES,editMode=false,selectedId=null,firstRender=true,filter="all",pendImgFor=null,showAllLinks=false;
function loadState(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.nodes&&s.links)return s;}catch(e){}return null;}
function initState(){
  ZONES=DEF.zones;
  if(EDITABLE){const s=loadState();if(s){N=s.nodes;L=s.links;ZONES=s.zones||DEF.zones;return;}}
  N=structuredClone(DEF.nodes);L=structuredClone(DEF.links);ZONES=structuredClone(DEF.zones);
}
function save(){if(!EDITABLE)return;if(PORTRAIT){toast("Правки карты — на десктопе");return;}try{localStorage.setItem(KEY,JSON.stringify({nodes:N,links:L,zones:ZONES}));}catch(e){toast("⚠ Не удалось сохранить (лимит)");}queuePush();}
initState();

/* ——— синхронизация с общей базой (Supabase REST) ——— */
let remoteStamp=null,pushT=0,applyingRemote=false,pendingRec=null;
function sbH(){return {apikey:SYNC.key,Authorization:"Bearer "+SYNC.key};}
let syncDown=false,syncTick=0;
async function sbPull(){if(!SYNC)return null;try{const r=await fetch(`${SYNC.url}/rest/v1/${SYNC.table}?id=eq.${encodeURIComponent(SYNC.row)}&select=data,updated_at,updated_by`,{headers:sbH(),cache:"no-store"});if(!r.ok)return{err:r.status};const a=await r.json();syncDown=false;return(a&&a[0])||null;}catch(e){return{err:"net"};}}
async function sbPush(){if(!CAN_WRITE||syncDown)return;const stamp=new Date().toISOString();const body=[{id:SYNC.row,data:{nodes:N,links:L,zones:ZONES},updated_at:stamp,updated_by:WHO}];
  try{const r=await fetch(`${SYNC.url}/rest/v1/${SYNC.table}`,{method:"POST",headers:{...sbH(),"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body)});
    if(r.ok)remoteStamp=stamp;else toast("⚠ Облако: "+r.status+" — правки только в этом браузере");}catch(e){syncDown=true;toast("⚠ Нет связи с базой — правки только в этом браузере");}}
function queuePush(){if(!CAN_WRITE)return;clearTimeout(pushT);pushT=setTimeout(sbPush,900);}
function applyRemote(rec){if(!rec||!rec.data||!rec.data.nodes)return;applyingRemote=true;N=rec.data.nodes;L=rec.data.links||[];ZONES=rec.data.zones||DEF.zones;remoteStamp=rec.updated_at;firstRender=true;render();buildChrome();if(selectedId&&N[selectedId])select(selectedId);else reset();applyingRemote=false;}
function showSyncBanner(rec){pendingRec=rec;let b=$("#syncBanner");if(!b){b=document.createElement("div");b.id="syncBanner";b.className="syncBanner";b.innerHTML=`<span></span><button class="btn prim ehbtn">Обновить</button>`;diagram.appendChild(b);b.querySelector("button").addEventListener("click",()=>{if(pendingRec)applyRemote(pendingRec);b.classList.remove("show");});}
  b.querySelector("span").textContent="🔄 "+(rec.updated_by&&rec.updated_by!=="—"?rec.updated_by:"Партнёр")+" обновил карту";b.classList.add("show");}
function startSync(){if(!SYNC)return;
  sbPull().then(rec=>{if(rec&&rec.err){syncDown=true;if(EDITABLE)toast("☁ Общая база недоступна — правки сохраняются в этом браузере");return;}
    if(rec&&rec.data&&rec.data.nodes){applyRemote(rec);toast("☁ Карта загружена из общей базы");}
    else if(CAN_WRITE){sbPush();toast("☁ Общая база создана из текущей карты");}});
  if(EDITABLE)setInterval(async()=>{if(document.hidden||applyingRemote||nodeDrag||dragging)return;
    if(syncDown&&(++syncTick%6))return;   // база лежит — пробуем раз в минуту, не спамим
    const rec=await sbPull();if(rec&&rec.err){syncDown=true;return;}
    if(rec&&rec.updated_at&&rec.updated_at!==remoteStamp){
      if(editMode&&panel.dataset.editing)showSyncBanner(rec);
      else{applyRemote(rec);toast("🔄 Обновлено партнёром"+(rec.updated_by&&rec.updated_by!=="—"?(" · "+rec.updated_by):""));}}
  },10000);}

/* ——— helpers ——— */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ex=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
const esc=s=>(s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cx=id=>N[id].x,cy=id=>N[id].y;
const stOf=n=>STATUS[n.s]||STATUS.concept;
const svg=$("#map"),vp=$("#viewport");
const gLoop=$("#loopg"),gZ=$("#zones"),gL=$("#links"),gTop=$("#linksTop"),gN=$("#nodes");
const gPod=ex("g",{id:"podg"});vp.insertBefore(gPod,vp.firstChild);
const panel=$("#panel"),diagram=$(".diagram");
/* ——— адаптивная ширина карточек по реальной ширине текста ——— */
const measEl=ex("text",{class:"clabel",x:-9999,y:-9999});measEl.style.visibility="hidden";measEl.setAttribute("pointer-events","none");svg.appendChild(measEl);
function measureText(str,fs,weight){measEl.setAttribute("font-size",fs);measEl.setAttribute("font-weight",weight||700);measEl.textContent=str||"";return measEl.getComputedTextLength()||(String(str||"").length*fs*0.58);}
const miniFs=n=>{if(n.t==="case")return 12;const L=(n.label||"").length;return L>16?13:(L>11?14:(L>6?15:16.5));};
const miniW=n=>n.t==="case"?Math.max(84,Math.round(measureText(n.label,12)+28)):Math.max(96,Math.round(measureText(n.label,miniFs(n))+40));  // текст + поля
const nodeW=n=>n.t==="hub"?n.w:miniW(n);
const nodeH=n=>n.t==="hub"?n.h:(n.t==="case"?36:46);
const subW=s=>Math.max(86,Math.round(measureText(s.label,12)+30));
if(DEF.viewBox&&!PORTRAIT)svg.setAttribute("viewBox",DEF.viewBox);
/* ——— инъекция админ-панели на публичной странице (только при ?edit) ——— */
if(GATED){
  const bar=$(".bar"),anchor=bar&&bar.querySelector("a.prim");
  if(bar){const tools=document.createElement("span");tools.className="editTools";tools.style.cssText="display:flex;gap:8px;align-items:center";
    tools.innerHTML=`<span class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07);margin:0 2px"><i style="background:var(--lime)"></i>АДМИН</span>`+
      `<button class="btn" id="addBtn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Проект</button>`+
      `<button class="btn" id="editBtn"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>Редактор</button>`+
      `<button class="btn icon" id="expBtn" title="Экспорт JSON"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`+
      `<button class="btn icon" id="impBtn" title="Импорт JSON"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`+
      `<button class="btn icon danger" id="resetBtn" title="Сбросить к исходному"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v4h4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    if(anchor)bar.insertBefore(tools,anchor);else bar.appendChild(tools);}
  if(!$("#fileImg")){const fi=document.createElement("input");fi.type="file";fi.id="fileImg";fi.accept="image/*";fi.multiple=true;fi.className="hidden";document.body.appendChild(fi);}
  if(!$("#fileJson")){const fj=document.createElement("input");fj.type="file";fj.id="fileJson";fj.accept="application/json,.json";fj.className="hidden";document.body.appendChild(fj);}
}
const FEED=["UT","MM","GAMES","ROOT","NET"];
const feeder=(a,b)=>FEED.includes(N[a].layer)||FEED.includes(N[b].layer);
const caseEnd=(a,b)=>N[a].t==="case"||N[b].t==="case";
const isMain=(a,b)=>{const k=[a,b].sort().join();return k===["l1","l2"].sort().join()||k===["l2","l3"].sort().join()||k===["l3","l1"].sort().join();};
const fcol=(a,b)=>{const x=[N[a].layer,N[b].layer];if(isMain(a,b))return"url(#flow)";if(x.includes("NET"))return C.NET;if(x.includes("ROOT"))return C.ROOT;if(x.includes("UT"))return C.UT;if(x.includes("MM"))return C.MM;if(x.includes("GAMES"))return C.GAMES;return"url(#flow)";};
const path=(a,b)=>{const A={x:cx(a),y:cy(a)},B={x:cx(b),y:cy(b)};if(PORTRAIT){const my=(A.y+B.y)/2;return`M${A.x},${A.y} C${A.x},${my} ${B.x},${my} ${B.x},${B.y}`;}const mx=(A.x+B.x)/2;return`M${A.x},${A.y} C${mx},${A.y} ${mx},${B.y} ${B.x},${B.y}`;};
const STATUS_KEYS=["live","dev","concept"];
const matchFilter=n=>{if(filter==="all")return true;if(filter==="case")return n.t==="case";if(filter.indexOf("dom:")===0)return n.dom===filter.slice(4);if(STATUS_KEYS.includes(filter))return n.s===filter||(filter==="live"&&n.s==="core");return n.layer===filter;};
let linkEls=[],nodeEls={},cometN=0;
function comet(d,color,dur,delay,r){const mp=ex("path",{d,fill:"none",stroke:"none"});const id="cm"+(cometN++);mp.id=id;gLoop.appendChild(mp);
  const g=ex("g",{}),rr=r||4;
  g.appendChild(ex("circle",{r:rr*2.8,fill:color,opacity:.16}));
  g.appendChild(ex("circle",{r:rr,fill:color,opacity:.95}));
  const am=ex("animateMotion",{dur:dur+"s",repeatCount:"indefinite",begin:(delay||0)+"s"});
  const mpath=ex("mpath",{});mpath.setAttribute("href","#"+id);mpath.setAttributeNS("http://www.w3.org/1999/xlink","href","#"+id);
  am.appendChild(mpath);g.appendChild(am);gLoop.appendChild(g);}

/* ——— портретная раскладка: позиции и зоны считаются из состава карты ——— */
function mobileLayout(){const P={},zones=[];const put=(id,x,y)=>{if(N[id])P[id]={x,y};};
  const has=id=>!!N[id];
  const grid=(ids,y0,cols,dy)=>{const xs=cols===3?[120,260,400]:(cols===2?[165,355]:[260]);let i=0;ids.filter(has).forEach(id=>{const r=Math.floor(i/cols),c=i%cols;const rowIds=Math.min(cols,ids.filter(has).length-r*cols);const xr=rowIds===cols?xs:(rowIds===2?[190,330]:[260]);put(id,xr[c],y0+r*dy);i++;});return y0+Math.max(0,Math.ceil(i/cols)-1)*dy;};
  const zone=(ids,label,sub,c)=>{const ks=ids.filter(k=>P[k]);if(!ks.length)return;let a=1e9,b=1e9,cc=-1e9,d=-1e9;ks.forEach(k=>{const n=N[k],w=nodeW(n),h=nodeH(n),p=P[k];a=Math.min(a,p.x-w/2);cc=Math.max(cc,p.x+w/2);b=Math.min(b,p.y-h/2);d=Math.max(d,p.y+h/2);});
    const bx=Math.min(a-18,20),bw=Math.max(cc+18,MOBW-20)-bx,by=b-60,bh=d+18-by;zones.push({label,sub,x:MOBC,y:by+24,bx,by,bw,bh,c});};
  let y=88;
  y=grid(["site","studiobot","portfolio"],y,3,54);y=grid(["linkos","osbuilder"],y+54,2,54);
  zone(["site","studiobot","portfolio","linkos","osbuilder"],"APPHUB STUDIO","вход · сайт → LinkOS → BuildOS → студия","#C5FF5F");
  {const z=zones[zones.length-1];if(z){z.bh+=62;z.soc={x:MOBC,y:y+62,step:52,r:17};}y+=62;}
  y+=110;put("l1",MOBC,y);
  y+=160;put("l2",MOBC,y);
  y=grid(Object.keys(N).filter(k=>N[k].layer==="L2"&&N[k].t==="mini"),y+92,3,54);
  y+=130;put("l3",MOBC,y);
  const dirs=["dine","events","med","anzh","kingfit","carrent","tours","shops","construction","cityhome","crypto","dropper",...Object.keys(N).filter(k=>N[k].layer==="L3"&&N[k].t==="mini"&&!["dine","events","med","anzh","kingfit","carrent","tours","shops","construction","cityhome","crypto","dropper"].includes(k))];
  y=grid(dirs,y+92,3,54);
  y+=90;put("loop",MOBC,y);const loopY=y;
  const cases=Object.keys(N).filter(k=>N[k].t==="case");y=grid(cases,y+150,2,52);
  zone(cases,"КЕЙСЫ · ЖИВЫЕ ПРИЛОЖЕНИЯ","клиентские продукты · клик — экраны","#2dd4bf");
  const ut=Object.keys(N).filter(k=>N[k].layer==="UT");y=grid(ut,y+160,3,54);zone(ut,"ЯДРО И УТИЛИТЫ","GEOS · PromOS · контент → трафик в петлю","#38bdf8");
  const gm=Object.keys(N).filter(k=>N[k].layer==="GAMES");y=grid(gm,y+160,3,54);zone(gm,"ИГРЫ","аркады и настолки · вовлечение","#fbbf24");
  const mm=Object.keys(N).filter(k=>N[k].layer==="MM");y=grid(mm,y+160,3,54);zone(mm,"MULTIMEDIA","трафик к пользователям","#a78bfa");
  const rest=Object.keys(N).filter(k=>!P[k]);if(rest.length)y=grid(rest,y+110,3,54);
  return{pos:P,zones,h:y+60,loopY};}

/* ——— соцсети на холсте: круглые стеклянные кнопки с иконками площадок ——— */
const SOC_DOM=new DOMParser();
function drawSocials(g,cx,cy,step,r){const list=(META.social||[]).filter(x=>x.k!=="web");if(!list.length)return;const w=(list.length-1)*step;r=r||17;
  list.forEach((x,i)=>{const px=cx-w/2+i*step;const a=ex("g",{class:"socn","data-url":x.url,role:"link",tabindex:"0"});a.setAttribute("aria-label",x.label);
    const tt=ex("title",{});tt.textContent=x.label;a.appendChild(tt);
    a.appendChild(ex("circle",{cx:px,cy:cy,r:r+3,fill:"#C5FF5F",opacity:.07}));
    a.appendChild(ex("circle",{cx:px,cy:cy,r,fill:"#0c0e16"}));
    a.appendChild(ex("circle",{class:"socbg",cx:px,cy:cy,r,fill:"rgba(255,255,255,.09)",stroke:"rgba(255,255,255,.2)","stroke-width":1.2}));
    const ic=Math.round(r*1.06),doc=SOC_DOM.parseFromString((SOC_ICO[x.k]||SOC_ICO.web).replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" '),"image/svg+xml").documentElement;
    const ig=ex("g",{transform:`translate(${px-ic/2},${cy-ic/2}) scale(${ic/24})`,fill:doc.getAttribute("fill")||"none",stroke:doc.getAttribute("stroke")||"none","stroke-width":doc.getAttribute("stroke-width")||"2","stroke-linecap":"round","pointer-events":"none"});
    [...doc.childNodes].forEach(n=>{if(n.nodeType===1)ig.appendChild(document.importNode(n,true));});
    a.appendChild(ig);g.appendChild(a);});}

/* ——— render ——— */
function render(){
  gLoop.innerHTML="";gZ.innerHTML="";gL.innerHTML="";gTop.innerHTML="";gN.innerHTML="";linkEls=[];nodeEls={};cometN=0;clearSubs();
  let zonesDraw=ZONES,loopY=null;
  if(PORTRAIT){const ML=mobileLayout();Object.entries(ML.pos).forEach(([id,p])=>{N[id].x=p.x;N[id].y=p.y;});zonesDraw=ML.zones;loopY=ML.loopY;svg.setAttribute("viewBox",`0 0 ${MOBW} ${ML.h}`);}
  if(N.l1&&N.l3){
    const arc=(d,delays)=>{gLoop.appendChild(ex("path",{d,fill:"none",stroke:"url(#loop)","stroke-width":11,opacity:.12}));
      gLoop.appendChild(ex("path",{class:"flowline",d,fill:"none",stroke:"url(#loop)","stroke-width":2.4,opacity:.6,"stroke-linecap":"round"}));
      delays.forEach(dl=>comet(d,"#C5FF5F",4.5,dl,4.5));};
    if(PORTRAIT){
      const dL=`M${N.l3.x-80},${N.l3.y} C${-90},${N.l3.y} ${-90},${N.l1.y} ${N.l1.x-116},${N.l1.y}`;
      const dR=`M${N.l3.x+80},${N.l3.y} C${MOBW+90},${N.l3.y} ${MOBW+90},${N.l1.y} ${N.l1.x+116},${N.l1.y}`;
      arc(dL,[0,2.2]);arc(dR,[1.1,3.3]);
      const t=ex("text",{class:"loopBadge",x:MOBC,y:(loopY||N.l3.y+120)+40});t.textContent="↺ ПЕТЛЯ · ВОЗВРАТ В L1";gLoop.appendChild(t);
    }else{
    const dBot=`M${N.l3.x},${N.l3.y+62} C${N.l3.x+40},760 ${N.l1.x-40},760 ${N.l1.x},${N.l1.y+62}`;
    const dTop=`M${N.l3.x},${N.l3.y-62} C${N.l3.x+40},40 ${N.l1.x-40},40 ${N.l1.x},${N.l1.y-62}`;
    arc(dBot,[0,2.2]);arc(dTop,[1.1,3.3]);
    const t=ex("text",{class:"loopBadge",x:(N.l1.x+N.l3.x)/2,y:752});t.textContent="↺ ПЕТЛЯ · ВОЗВРАТ В L1";gLoop.appendChild(t);}
  }
  zonesDraw.forEach(z=>{
    gZ.appendChild(ex("rect",{x:z.bx,y:z.by,width:z.bw,height:z.bh,rx:18,fill:"#0c0e16","fill-opacity":.86}));
    gZ.appendChild(ex("rect",{x:z.bx,y:z.by,width:z.bw,height:z.bh,rx:18,fill:z.c,"fill-opacity":.07,stroke:z.c,"stroke-opacity":.42,"stroke-width":1.4}));
    const l=ex("text",{class:"zlabel",x:z.x,y:z.y,fill:z.c});l.textContent=z.label;gZ.appendChild(l);
    const s=ex("text",{class:"zsub",x:z.x,y:z.y+16});s.textContent=z.sub;gZ.appendChild(s);
    if(z.soc)drawSocials(gZ,z.soc.x,z.soc.y,z.soc.step||52,z.soc.r||17);});
  const isHub=k=>["l1","l2","l3"].includes(k);
  L.forEach(([a,b])=>{if(!N[a]||!N[b])return;const d=path(a,b),f=feeder(a,b),mn=isMain(a,b),col=fcol(a,b);
    const hubEnd=isHub(a)||isHub(b)||caseEnd(a,b);
    const prod=!mn&&!f&&!hubEnd;
    // структурные связи (петля/фидеры/к хабам) — чёткие; продукт↔продукт — еле заметные
    const baseCore=mn?.85:(f?.16:(hubEnd?.3:0));
    const baseGlow=mn?.13:(f?.04:(hubEnd?.07:0));
    const baseW=mn?2.6:(f?1.3:(hubEnd?1.6:1.3));
    const glow=ex("path",{d,fill:"none",stroke:col,"stroke-width":f?4:6,opacity:baseGlow});
    const core=ex("path",{d,fill:"none",stroke:col,"stroke-width":baseW,opacity:baseCore,"stroke-linecap":"round","stroke-dasharray":f?"6 7":(mn?"9 13":"none")});
    if(mn)core.classList.add("flowline");
    gL.appendChild(glow);gL.appendChild(core);linkEls.push({a,b,glow,core,f,mn,prod,baseCore,baseGlow,baseW});
    if(mn&&!(a==="l3"&&b==="l1")&&!(a==="l1"&&b==="l3")){comet(d,"#fff",3.2,0,3.5);comet(d,"#fff",3.2,1.6,3.5);}});
  let idx=0;
  Object.entries(N).forEach(([id,n])=>{const c=C[n.layer]||C.L2,w=nodeW(n),h=nodeH(n),cs=n.t==="case";
    const g=ex("g",{class:"node"+(cs?" case":""),"data-id":id,tabindex:"0",role:"button","aria-label":n.label+(n.cat?" · "+n.cat:"")});
    if(firstRender){g.classList.add("nodeIn");g.style.animationDelay=(idx*14)+"ms";}
    const hub=n.t==="hub",hp=hub?7:(cs?2:3),rx=hub?18:(cs?11:13);
    g.appendChild(ex("rect",{x:n.x-w/2-hp,y:n.y-h/2-hp,width:w+hp*2,height:h+hp*2,rx:rx+3,fill:c,opacity:hub?.16:(cs?.05:.07)}));
    g.appendChild(ex("rect",{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx,fill:"#0c0e16"}));
    g.appendChild(ex("rect",{class:"card",x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx,fill:c,"fill-opacity":hub?.18:(cs?.07:.1),stroke:c,"stroke-width":hub?2:(cs?1.1:1.3),"stroke-opacity":cs?.7:.9}));
    g.appendChild(ex("rect",{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx,fill:"url(#sheen)","pointer-events":"none"}));
    if(n.t==="hub"){const t1=ex("text",{class:"clabel",x:n.x,y:n.y-9,"font-size":15});t1.textContent=n.label;g.appendChild(t1);
      const t2=ex("text",{class:"csub",x:n.x,y:n.y+13,"font-size":12});t2.textContent=n.sub||"";g.appendChild(t2);}
    else{const t=ex("text",{class:"clabel",x:n.x,y:n.y,"font-size":miniFs(n)});t.textContent=n.label;g.appendChild(t);
      if(n.s&&n.s!=="core"){const st=stOf(n);g.appendChild(ex("circle",{cx:n.x+w/2-(cs?7:9),cy:n.y-h/2+(cs?7:9),r:cs?4:5,fill:st.c,stroke:"#0c0e16","stroke-width":1.5}));}}
    gN.appendChild(g);nodeEls[id]=g;idx++;});
  firstRender=false;applyFilter();
  if(selectedId&&N[selectedId])applyHighlight(selectedId);
}

/* ——— sub-directions ——— */
let subEls=[];
function clearSubs(){subEls.forEach(e=>e.remove());subEls=[];}
function showSubs(id){const n=N[id];if(!n.subs||!n.subs.length)return;const px=n.x,py=n.y;
  n.subs.forEach((s0,i)=>{let s={...s0};if(PORTRAIT){delete s.x;delete s.y;}if(s.x==null||s.y==null){const span=Math.min(n.subs.length-1,5),ang=(-0.6+1.2*(span?i/span:.5)),r=130;s.x=px+Math.sin(ang)*r;s.y=py+90+Math.cos(ang)*22;}
    const d=`M${px},${py} C${(px+s.x)/2},${py} ${(px+s.x)/2},${s.y} ${s.x},${s.y}`;
    const ln=ex("path",{d,fill:"none",stroke:"#2dd4bf","stroke-width":1.4,opacity:.55,"stroke-dasharray":"4 5"});gL.appendChild(ln);subEls.push(ln);
    const w=subW(s),h=34,g=ex("g",{class:"subnode nodeIn"});
    g.appendChild(ex("rect",{x:s.x-w/2-3,y:s.y-h/2-3,width:w+6,height:h+6,rx:13,fill:"#2dd4bf",opacity:.18}));
    g.appendChild(ex("rect",{x:s.x-w/2,y:s.y-h/2,width:w,height:h,rx:10,fill:"#0c0e16"}));
    g.appendChild(ex("rect",{x:s.x-w/2,y:s.y-h/2,width:w,height:h,rx:10,fill:"#2dd4bf","fill-opacity":.13,stroke:"#2dd4bf","stroke-width":1.3}));
    const t=ex("text",{class:"clabel",x:s.x,y:s.y,"font-size":12});t.textContent=s.label;g.appendChild(t);
    gN.appendChild(g);subEls.push(g);});}

/* ——— highlight / filter ——— */
function lowerLinks(){if(!gTop.childNodes.length)return;[...gTop.childNodes].forEach(el=>gL.appendChild(el));}
function raiseLink(le){gTop.appendChild(le.glow);gTop.appendChild(le.core);}
function baseLinks(){lowerLinks();linkEls.forEach(le=>{if(!le.mn){le.core.classList.remove("flowline");le.core.setAttribute("stroke-dasharray",le.f?"6 7":"none");}const rv=le.prod&&showAllLinks;le.core.setAttribute("opacity",rv?.34:le.baseCore);le.core.setAttribute("stroke-width",le.baseW);le.glow.setAttribute("opacity",rv?.06:le.baseGlow);});}
function applyHighlight(id){const conn=new Set([id]);lowerLinks();
  linkEls.forEach(le=>{const on=le.a===id||le.b===id;if(on)raiseLink(le);
    le.core.setAttribute("opacity",on?1:.035);le.core.setAttribute("stroke-width",on?(le.f?2.2:2.9):le.baseW);le.glow.setAttribute("opacity",on?.34:.018);
    if(!le.mn){le.core.classList.toggle("flowline",on);if(!on)le.core.setAttribute("stroke-dasharray",le.f?"6 7":"none");}
    if(on){conn.add(le.a);conn.add(le.b);}});
  Object.entries(nodeEls).forEach(([nid,g])=>{g.style.opacity=conn.has(nid)?1:.26;g.classList.toggle("sel",nid===id);});}
function previewLinks(id){if(selectedId)return;const conn=new Set([id]);
  linkEls.forEach(le=>{const on=le.a===id||le.b===id;if(on){raiseLink(le);le.core.setAttribute("opacity",.9);le.glow.setAttribute("opacity",.22);conn.add(le.a);conn.add(le.b);}});}
function applyFilter(){Object.entries(nodeEls).forEach(([id,g])=>{g.classList.toggle("dim",!matchFilter(N[id]));});drawDomainPod();}
function setFilter(k){filter=k;$$("#chips .chip").forEach(x=>x.classList.toggle("on",x.dataset.f===k));applyFilter();updateFilterUI();focusFilter();}
function filterLabel(k){if(k==="all")return"";if(k.indexOf("dom:")===0)return k.slice(4);const m={live:"Живые",dev:"В разработке",concept:"Концепты",case:"Кейсы",ROOT:"Студия",L1:"L1",L2:"L2",L3:"L3",NET:"Loop",UT:"Утилиты",MM:"Медиа",GAMES:"Игры"};return m[k]||k;}
function updateFilterUI(){const n=Object.values(N).filter(x=>matchFilter(x)&&x.s!=="core").length,tot=Object.values(N).filter(x=>x.s!=="core").length,on=filter!=="all";
  $$("#filterMenu .fchip").forEach(x=>{const a=x.dataset.f===filter;x.classList.toggle("active",a);x.setAttribute("aria-checked",a);});
  const c=$("#fmCount");if(c)c.textContent=on?`${n} из ${tot}`:`все · ${tot}`;const r=$("#fmReset");if(r)r.style.visibility=on?"visible":"hidden";
  const d=$("#dockFilter");if(d){d.classList.toggle("on",on);const l=d.querySelector("span")||d.appendChild(document.createElement("span"));l.textContent=on?filterLabel(filter):"Фильтр";}
  $("#filterBtn")?.classList.toggle("on",on);}
function openFilter(){const fm=$("#filterMenu");if(!fm)return;if(!isMob()){const b=$("#filterBtn");const r=b?b.getBoundingClientRect():{bottom:70,right:innerWidth-16};fm.style.top=(r.bottom+8)+"px";fm.style.right=Math.max(12,innerWidth-r.right)+"px";fm.style.bottom="auto";}else{fm.style.top="";fm.style.right="";fm.style.bottom="";}
  fm.classList.add("open");document.body.classList.add("filter-open");}
function closeFilter(){$("#filterMenu")?.classList.remove("open");document.body.classList.remove("filter-open");}
function drawDomainPod(){if(!gPod)return;gPod.innerHTML="";if(filter.indexOf("dom:")!==0)return;const dom=filter.slice(4);
  const ids=Object.keys(N).filter(id=>N[id].dom===dom);if(!ids.length)return;
  let a=1e9,b=1e9,c=-1e9,d=-1e9;ids.forEach(id=>{const n=N[id],w=nodeW(n);const hh=nodeH(n)/2;a=Math.min(a,n.x-w/2);c=Math.max(c,n.x+w/2);b=Math.min(b,n.y-hh);d=Math.max(d,n.y+hh);});
  a-=28;c+=28;b-=44;d+=28;const col=DOMC[dom]||"#C5FF5F";
  gPod.appendChild(ex("rect",{x:a,y:b,width:c-a,height:d-b,rx:22,fill:col,"fill-opacity":.07,stroke:col,"stroke-opacity":.55,"stroke-width":1.6,"stroke-dasharray":"8 6"}));
  const t=ex("text",{x:a+18,y:b+24,fill:col});t.setAttribute("style","font-family:'JetBrains Mono';font-size:13px;letter-spacing:.16em;font-weight:500");t.textContent="ТЕМА · "+dom.toUpperCase();gPod.appendChild(t);}

const CLOSE='<div class="grab" data-grab></div><button class="pclose" data-close aria-label="Закрыть">✕</button>';
function select(id){if(!N[id])return;if(selectedId!==id)heroView="client";selectedId=id;clearSubs();applyHighlight(id);if(N[id].subs)showSubs(id);
  if(EDITABLE&&editMode)renderEdit(id);else renderInfo(id);
  panel.classList.add("open");document.body.classList.add("sel-open");
  if(!(EDITABLE&&editMode))focusSelected(id);
  try{history.replaceState(null,"","#"+id);}catch(e){location.hash=id;}}
function reset(){const had=selectedId;selectedId=null;clearSubs();baseLinks();
  Object.values(nodeEls).forEach(g=>{g.style.opacity=1;g.classList.remove("sel");});applyFilter();
  panel.classList.remove("open");document.body.classList.remove("sel-open");panel.style.height="";panel.style.transition="";if(EDITABLE&&editMode)panel.innerHTML=defaultPanel();
  if(had&&!(EDITABLE&&editMode))focusAll(true);
  try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}}

/* ——— panels ——— */
function defaultPanel(){
  if(EDITABLE&&editMode)return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>РЕДАКТОР</div><div class="pTitle">Режим редактирования</div><p class="hint">Тащи узлы мышью. Клик по узлу — правка описания, скриншотов, ссылок, статуса и связей. Кнопка «Проект» — создать новый и связать в цепочку.</p>`;
  if(MODE==="public")return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>ЭКОСИСТЕМА · ${esc(META.updated||"2026")}</div><div class="pTitle">Приложение без установки — и сеть за ним</div><p class="hint">Пользователи, агрегаторы и бизнесы замыкаются в петлю, а сеть Loop делает гостя одного бизнеса клиентом другого. Кликни любой узел: экраны, статус и рабочая ссылка.</p>
<div class="legend"><h4>Как читать карту</h4>
<div class="lrow"><span class="lsw" style="background:${C.L1}"></span><b>L1</b><span>пользователи и их ИИ-агенты — откуда приходит спрос</span></div>
<div class="lrow"><span class="lsw" style="background:${C.L2}"></span><b>L2</b><span>агрегаторы — подбирают бизнесы под запрос</span></div>
<div class="lrow"><span class="lsw" style="background:${C.L3}"></span><b>L3</b><span>приложения бизнесов и живые кейсы справа</span></div>
<div class="lrow"><span class="lsw" style="background:${C.NET}"></span><b>Loop</b><span>сеть лояльности — возвращает гостя в петлю</span></div>
<div class="lrow dots"><i style="background:${STATUS.live.c}"></i>в проде <i style="background:${STATUS.dev.c}"></i>прототип / демо <i style="background:${STATUS.concept.c}"></i>концепт</div>
<div class="lrow keys"><span class="kbd">F</span> полный экран · <span class="kbd">Esc</span> закрыть · колесо / пинч — зум</div></div><button class="pLink alt" data-inv style="margin-top:12px">📈 Инвестору: цифры, модель, тарифы →</button><div class="cta"><h4>Хотите своё приложение в сети?</h4><p>Базовый Mini App — за день, кастомный — до трёх. Каждый проект — клиентское приложение и админ-панель.</p><a class="pLink" href="https://apphub.studio/constructor" target="_blank" rel="noopener">Собрать в конструкторе →</a><a class="pLink alt" href="${PF_URL}" target="_blank" rel="noopener">▣ Портфолио · ${META.portfolio||34} продукта →</a></div>${socialRow("Мы в сети")}`;
  return`<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>КАРТА</div><div class="pTitle">Ткни любой узел</div><p class="hint">Клик по проекту — описание, скриншоты и ссылки. У Dine, Shops, Tours, Events клик раскрывает направления. Колесо/пинч — зум, тащи — двигай карту.</p>`;
}
function pfImgs(n){if(!n.pf)return[];const k=Math.min(n.screens||3,4);const a=[];for(let i=1;i<=k;i++)a.push(PF_GAL+n.pf+"/"+i+".webp");return a;}
function shots(n){let arr=n.imgs||(n.img?[n.img]:[]);if(!arr.length)arr=pfImgs(n);if(!arr.length)return"";
  if(arr.length===1)return`<div class="shot" data-img="${esc(arr[0])}"><img src="${esc(arr[0])}" alt="${esc(n.label)}" loading="lazy"></div>`;
  return`<div class="shots">${arr.map(s=>`<img src="${esc(s)}" data-img="${esc(s)}" alt="${esc(n.label)}" loading="lazy">`).join("")}</div>`;}
function linkBtns(n){let arr=n.links||(n.link?[{label:"Открыть продукт",url:n.link}]:[]);
  const adm=heroView==="admin"&&hasAdmin(n)&&n.admin.url;
  if(adm)arr=[{label:n.admin.label||"Админка",url:n.admin.url,admin:true},...arr.slice(0,1).map(l=>({label:"📱 Клиентское приложение",url:l.url}))];
  const isAddr=t=>/^(@|https?:|t\.me|[a-z0-9-]+(\.[a-z0-9-]+)+)/i.test(t||"");
  let out=arr.map((l,i)=>i?`<a class="pLink" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} →</a>`
    :`<a class="pLink go" href="${esc(l.url)}" target="_blank" rel="noopener"><b>${l.admin?"Открыть админку":(isAddr(l.label)?"Открыть приложение":esc(l.label))}</b><small>${l.admin?esc(l.label)+" · демо":(isAddr(l.label)?esc(l.label):(/t\.me/.test(l.url)?"в Telegram":"откроется в новой вкладке"))}</small><i>↗</i></a>`).join("");
  if(!arr.length)out=n.s==="core"?"":`<span class="pLink off">${n.s==="live"?"ссылка скоро":(n.s==="concept"?"концепт · ссылки пока нет":"в разработке · демо скоро")}</span>`;
  if(n.admin&&n.admin.url&&!adm)out+=`<a class="pLink alt" href="${esc(n.admin.url)}" target="_blank" rel="noopener">⚙ ${esc(n.admin.label||"Админка")} →</a>`;
  if(n.pf)out+=`<a class="pLink alt" href="${PF_URL}" target="_blank" rel="noopener">▣ Портфолио →</a>`;
  out+=`<button class="pLink alt share" data-share="${esc(n.label)}">🔗 Поделиться</button>`;
  return out;}
async function shareNode(label){const url=location.origin+location.pathname+"#"+(selectedId||"");const text=`${label} — карта экосистемы AppHub`;
  if(navigator.share&&isMob()){try{await navigator.share({title:text,url});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  let ok=false;try{await navigator.clipboard.writeText(url);ok=true;}catch(e){}
  if(!ok){try{const ta=document.createElement("textarea");ta.value=url;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();ok=document.execCommand("copy");ta.remove();}catch(e){}}
  toast(ok?"🔗 Ссылка на «"+label+"» скопирована":"🔗 "+url);}
function pfLine(n){if(!n.pf&&!n.admin)return"";const a=[];if(n.screens)a.push(`${n.screens} экранов в портфолио`);if(n.admin&&n.admin.screens)a.push(`админка · ${n.admin.screens} экранов`);return a.length?`<div class="pfline">▣ ${a.join(" · ")}</div>`:"";}
function related(id){const ks=[...new Set(L.filter(p=>p.includes(id)).map(p=>p[0]===id?p[1]:p[0]))].filter(k=>N[k]);
  if(!ks.length)return"";
  ks.sort((a,b)=>(N[a].t==="hub"?0:1)-(N[b].t==="hub"?0:1)||N[a].label.localeCompare(N[b].label,"ru"));
  return`<div class="pSec"><h4>Связан с · ${ks.length} →</h4><div class="rels">${ks.map(k=>`<button class="rel" data-go="${k}"><span class="rdot" style="background:${C[N[k].layer]||C.L2}"></span>${esc(N[k].label)}</button>`).join("")}</div></div>`;}
function imgsOf(n){let a=n.imgs||(n.img?[n.img]:[]);if(!a.length)a=pfImgs(n);return a;}
let heroImgs=[],heroView="client";
const hasAdmin=n=>!!(n.admin&&(n.admin.pf||(n.admin.imgs&&n.admin.imgs.length)));
function adminImgs(n){const a=n.admin||{};return a.imgs&&a.imgs.length?a.imgs:pfImgs({pf:a.pf,screens:a.screens});}
function viewImgs(n){return heroView==="admin"&&hasAdmin(n)?adminImgs(n):imgsOf(n);}
function segRow(n){if(!hasAdmin(n))return"";const adm=heroView==="admin";
  return`<div class="segrow"><div class="seg" role="tablist"><button role="tab" class="${adm?"":"on"}" data-view="client">📱 Клиент</button><button role="tab" class="${adm?"on":""}" data-view="admin">⚙ Админка</button></div><span class="segcap">${adm?(n.admin.screens?n.admin.screens+" экранов":"панель"):(n.screens?n.screens+" экранов":"приложение")}</span></div>`;}
function hero(n){const a=viewImgs(n);heroImgs=a;if(!a.length)return"";
  return`${segRow(n)}<div class="hero${hasAdmin(n)?" has-seg":""}"><div class="htrack">${a.map((src,i)=>`<div class="hslide"><div class="phone" data-gal="${i}"><img src="${esc(src)}" alt="${esc(n.label)} · экран ${i+1}" loading="${i?"lazy":"eager"}" decoding="async"></div></div>`).join("")}</div>${a.length>1?`<div class="hdots">${a.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>`:""}</div>`;}
function edgeFade(el){if(!el||el.dataset.ef)return;el.dataset.ef="1";const upd=()=>{const max=el.scrollWidth-el.clientWidth;el.style.setProperty("--fl",el.scrollLeft>4?"34px":"0px");el.style.setProperty("--fr",max-el.scrollLeft>4?"56px":"0px");};
  el.addEventListener("scroll",upd,{passive:true});new ResizeObserver(upd).observe(el);upd();}
function bindHero(){edgeFade(panel.querySelector(".htrack"));panel.querySelectorAll(".phone img").forEach(im=>{const ok=()=>im.setAttribute("data-ok","1");if(im.complete&&im.naturalWidth)ok();else im.addEventListener("load",ok,{once:true});});
  const tr=panel.querySelector(".htrack");if(!tr)return;const dots=panel.querySelectorAll(".hdots i");
  tr.addEventListener("scroll",()=>{const sl=tr.querySelector(".hslide");if(!sl)return;const i=Math.round(tr.scrollLeft/(sl.offsetWidth+10));dots.forEach((d,j)=>d.classList.toggle("on",j===i));},{passive:true});}
function renderInfo(id){const n=N[id],c=C[n.layer]||C.L2,st=stOf(n);
  const h=hero(n);
  panel.innerHTML=`${CLOSE}${h}<div class="badge" style="color:${c};border:1px solid ${c}55;background:${c}16"><i style="background:${c}"></i>${n.t==="case"?"КЕЙС · ":""}${esc(LBADGE[n.layer]||n.layer)}</div>
  <div class="pTitle">${esc(n.label)}</div><div class="pCat">${esc(n.cat||"")}</div>${pfLine(n)}
  <div class="tagrow">${n.s&&n.s!=="core"?`<div class="statusLine" style="color:${st.c};background:${st.c}14"><span class="sd" style="background:${st.c}"></span>${st.t}</div>`:""}${n.dom?`<button class="domtag" data-dom="${esc(n.dom)}" style="color:${DOMC[n.dom]||"#C5FF5F"};border-color:${(DOMC[n.dom]||"#C5FF5F")}55;background:${(DOMC[n.dom]||"#C5FF5F")}14">⬡ ${esc(n.dom)}</button>`:""}</div>
  <div class="ctarow">${id==="social"?`<a class="pLink go" href="https://t.me/AppHub_Studio" target="_blank" rel="noopener"><b>Telegram-канал</b><small>@AppHub_Studio</small><i>↗</i></a>`+socialRow("Все площадки · apphubstudio"):linkBtns(n)}</div>
  ${n.desc?`<div class="pSec"><h4>Что это</h4><p>${esc(n.desc)}</p></div>`:""}
  ${n.inter?`<div class="pSec"><h4>Как взаимодействует</h4><p>${esc(n.inter)}</p></div>`:""}
  ${!h&&n.s!=="core"&&n.s!=="concept"&&id!=="social"?'<div class="noshot">📸 экраны появятся после съёмки для портфолио</div>':""}${related(id)}`;bindHero();}

/* ——— editor (internal only) ——— */
function renderEdit(id){const n=N[id],c=C[n.layer]||C.L2;
  const links=n.links||(n.link?[{label:"Открыть",url:n.link}]:[]);const subs=n.subs||[];const imgs=n.imgs||(n.img?[n.img]:[]);
  const others=Object.keys(N).filter(k=>k!==id).sort((a,b)=>N[a].label.localeCompare(N[b].label,"ru"));
  const linked=new Set(L.filter(p=>p.includes(id)).map(p=>p[0]===id?p[1]:p[0]));
  panel.innerHTML=`${CLOSE}<div class="badge" style="color:${c};border:1px solid ${c}55;background:${c}16"><i style="background:${c}"></i>ПРАВКА</div>
  <div class="fld"><label>Название</label><input id="f-label" value="${esc(n.label)}"></div>
  ${n.t!=="hub"?`<div class="fld"><label>Тип</label><select id="f-type"><option value="mini"${n.t!=="case"?" selected":""}>Продукт / направление</option><option value="case"${n.t==="case"?" selected":""}>Кейс (клиентское приложение)</option></select></div>`:""}
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
  if(g("#f-type")&&n.t!=="hub")n.t=g("#f-type").value;
  if(g("#f-status"))n.s=g("#f-status").value;
  if(g("#f-cat"))n.cat=g("#f-cat").value;
  if(g("#f-desc"))n.desc=g("#f-desc").value;
  if(g("#f-inter"))n.inter=g("#f-inter").value;
  const links=[...panel.querySelectorAll("#f-links .lrow")].map(r=>({label:r.querySelector(".l-label").value.trim(),url:r.querySelector(".l-url").value.trim()})).filter(l=>l.url);
  if(links.length){n.links=links;delete n.link;}else{delete n.links;delete n.link;}
  const subs=[...panel.querySelectorAll("#f-subs .srow")].map(r=>{const o={label:r.querySelector(".s-label").value.trim()};if(r.dataset.x!=="")o.x=+r.dataset.x;if(r.dataset.y!=="")o.y=+r.dataset.y;return o;}).filter(s=>s.label);
  if(subs.length)n.subs=subs;else delete n.subs;}

/* ——— deep-link ——— */
function openHash(){const id=decodeURIComponent(location.hash.replace("#",""));if(id==="investor"){openInvestor();return;}if(id&&N[id])select(id);else reset();}

/* ——— lightbox / toast ——— */
const lb=$("#lightbox");let galArr=[],galI=0,galCap="";
lb.innerHTML=`<button class="lbx" aria-label="Закрыть">✕</button><div class="lbstage"><div class="lbphone"><img alt=""></div><button class="lbnav prev" aria-label="Назад">‹</button><button class="lbnav next" aria-label="Дальше">›</button></div><div class="lbcap"></div><div class="lbcount"></div>`;
function galShow(){const img=lb.querySelector("img");img.style.opacity=0;img.src=galArr[galI];img.onload=()=>{img.style.opacity=1;};
  lb.querySelector(".lbcount").textContent=galArr.length>1?`${galI+1} / ${galArr.length}`:"";lb.querySelector(".lbcap").textContent=galCap;
  lb.querySelector(".prev").style.visibility=galI>0?"visible":"hidden";lb.querySelector(".next").style.visibility=galI<galArr.length-1?"visible":"hidden";}
function openGallery(arr,i,cap){if(!arr||!arr.length)return;galArr=arr;galI=Math.max(0,Math.min(i||0,arr.length-1));galCap=cap||"";lb.style.display="flex";document.body.classList.add("lb-open");galShow();}
function openLight(src){openGallery([src],0);}
function closeLight(){lb.style.display="none";document.body.classList.remove("lb-open");}
function galGo(d){const n=galI+d;if(n<0||n>=galArr.length)return;galI=n;galShow();}
lb.addEventListener("click",e=>{if(e.target.closest(".prev")){galGo(-1);return;}if(e.target.closest(".next")){galGo(1);return;}if(e.target.closest(".lbx")||!e.target.closest(".lbphone"))closeLight();});
(()=>{let sx=0,sy=0,on=false;const st=lb.querySelector(".lbstage");
  st.addEventListener("pointerdown",e=>{on=true;sx=e.clientX;sy=e.clientY;},{passive:true});
  st.addEventListener("pointerup",e=>{if(!on)return;on=false;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))galGo(dx<0?1:-1);else if(dy>80&&Math.abs(dy)>Math.abs(dx))closeLight();},{passive:true});})();
let toastT;function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1800);}

/* ——— живые цифры: из карты (считаются) + из портфолио-бота (v2/stats.json, один источник) ——— */
function mapFacts(){const all=Object.values(N),products=all.filter(n=>n.s!=="core");
  const seen=new Set();let screens=0;all.forEach(n=>{if(n.pf&&!seen.has(n.pf)){seen.add(n.pf);screens+=n.screens||0;}if(n.admin&&n.admin.pf&&!seen.has(n.admin.pf)){seen.add(n.admin.pf);screens+=n.admin.screens||0;}});
  return{products:products.length,live:products.filter(n=>n.s==="live").length,dev:products.filter(n=>n.s==="dev").length,cases:products.filter(n=>n.t==="case").length,
    dirs:all.filter(n=>n.layer==="L3"&&n.t==="mini").length,admins:all.filter(n=>n.admin&&n.admin.url).length,screensOnMap:screens};}
function renderStats(){const f=mapFacts(),statsEl=$("#stats");if(!statsEl)return;
  statsEl.innerHTML=`<div class="stat"><b>${f.products}</b><span>продуктов</span></div><div class="stat"><b style="color:#34d399">${f.live}</b><span>в проде</span></div><div class="stat"><b style="color:#fbbf24">${f.dev}</b><span>в разработке</span></div><div class="stat"><b style="color:#2dd4bf">${f.cases}</b><span>кейсов</span></div>${META.screens?`<div class="stat"><b>${META.screens}</b><span>экранов</span></div>`:""}${META.niches?`<div class="stat"><b>${META.niches}</b><span>ниш</span></div>`:""}`;}
let statsLoaded=false;
async function loadStats(){try{const r=await fetch("stats.json",{cache:"no-store"});if(!r.ok)return;const j=await r.json();if(!j||!j.portfolio)return;Object.assign(META,j);statsLoaded=true;
    countedOnce=true;renderStats();const w=$("#welcome .wstats");if(w)w.innerHTML=`<div><b>${META.portfolio}</b><span>продукта</span></div><div><b>${META.screens}</b><span>экранов</span></div><div><b>${META.niches}</b><span>ниш</span></div>`;
    if(location.hash==="#investor"&&panel.classList.contains("open"))panel.innerHTML=renderInvestor();}catch(e){}}
function statsStamp(){const d=META.updated||"";return d?"на "+d.split("-").reverse().join("."):"";}

/* ——— stats / chips / legend (built by JS) ——— */
function buildChrome(){
  const products=Object.values(N).filter(n=>n.s!=="core");
  const live=products.filter(n=>n.s==="live").length,dev=products.filter(n=>n.s==="dev").length;
  renderStats();
  const LL={ROOT:"Студия",L1:"L1 · Users",L2:"L2 · Агрегаторы",L3:"L3 · Бизнесы",NET:"Loop · сеть",UT:"Утилиты",MM:"Медиа",GAMES:"Игры"};
  const LS={ROOT:"Студия",L1:"L1",L2:"L2",L3:"L3",NET:"Loop",UT:"Утилиты",MM:"Медиа",GAMES:"Игры"};
  const sdefs=[["all","Все",null],["live","Живые",STATUS.live.c],["dev","В разработке",STATUS.dev.c],["concept","Концепты",STATUS.concept.c],["case","Кейсы","#2dd4bf"]];
  const ldefsShort=LAYERS.map(([k])=>[k,LS[k],C[k]]),ldefsFull=LAYERS.map(([k])=>[k,LL[k],C[k]]);
  const chipsEl=$("#chips");
  if(chipsEl){const chip=([k,t,c])=>`<button class="chip${k===filter?" on":""}" data-f="${k}">${c?`<span class="cdot" style="background:${c};color:${c}"></span>`:""}${t}</button>`;
    chipsEl.innerHTML=sdefs.map(chip).join("")+'<span class="chsep"></span>'+ldefsShort.map(chip).join("");
    chipsEl.addEventListener("click",e=>{const b=e.target.closest(".chip");if(b)setFilter(b.dataset.f);});}
  const fm=$("#filterMenu"),fb=$("#filterBtn");
  if(fm){const chip=([k,t,c])=>`<button class="fchip${k===filter?" active":""}" data-f="${k}" role="radio" aria-checked="${k===filter}">${c?`<span class="rdot" style="background:${c};color:${c}"></span>`:""}${t}</button>`;
    fm.innerHTML=`<div class="fmgrab"></div><div class="fmhead"><b>Фильтр</b><span class="fmcount" id="fmCount"></span><button class="fmx" data-fclose aria-label="Закрыть">✕</button></div>
      <div class="fmcap">Статус</div><div class="fgrid" role="radiogroup">${sdefs.map(chip).join("")}</div>
      <div class="fmcap">Слои</div><div class="fgrid" role="radiogroup">${ldefsFull.map(chip).join("")}</div>
      <div class="fmcap">Темы</div><div class="fgrid" role="radiogroup">${DOMS.map(([d,c])=>chip(["dom:"+d,d,c])).join("")}</div>
      <div class="fmfoot"><button class="btn" data-f="all" id="fmReset">Сбросить</button><button class="btn prim" data-fclose>Готово</button></div>`;
    fm.addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(b){setFilter(b.dataset.f);if(isMob())return;closeFilter();return;}if(e.target.closest("[data-fclose]"))closeFilter();});
    fb?.addEventListener("click",e=>{e.stopPropagation();fm.classList.contains("open")?closeFilter():openFilter();});
    $("#fmScrim")?.addEventListener("click",closeFilter);
    document.addEventListener("click",e=>{if(fm.classList.contains("open")&&!e.target.closest("#filterMenu,#filterBtn,#dockFilter"))closeFilter();});
    updateFilterUI();}
  const tip=document.createElement("div");tip.className="tip";tip.id="tooltip";diagram.appendChild(tip);
  countUp();edgeFade($("#stats"));edgeFade($("#chips"));
}
let countedOnce=false;
function countUp(){if(countedOnce||matchMedia("(prefers-reduced-motion:reduce)").matches)return;countedOnce=true;
  $$("#stats .stat b").forEach((el,i)=>{const end=parseInt(el.textContent,10);if(!end)return;const t0=performance.now()+i*90,dur=900;el.textContent="0";
    const step=now=>{const k=Math.min(1,Math.max(0,(now-t0)/dur)),e=1-Math.pow(1-k,3);el.textContent=Math.round(end*e);if(k<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);setTimeout(()=>{el.textContent=end;},dur+i*90+200);});}

/* ——— zoom / pan engine: два движка + инерция ———
   A. lerp (колесо, кнопки, dblclick): экспоненциальное приближение к цели, независимое от FPS, масштаб в лог-пространстве.
   B. tween (фокус, тур, сброс): «полёт камеры» 720ms out-expo — интерполируется центр камеры и лог-масштаб, а не голые tx/ty.
   Пан: прямой при перетаскивании + инерция-бросок после отпускания. Пинч: прямой, с мягким упором за границами и пружиной назад.
   Никаких CSS-transition на transform SVG — Safari их не анимирует. ——— */
let zk=1,ztx=0,zty=0;          // отрисованный трансформ
let tk=1,ttx=0,tty=0,zRAF=0;   // цель + id активной анимации
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const applyZ=()=>vp.setAttribute("transform",`translate(${ztx} ${zty}) scale(${zk})`);
const svgPt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
const KMIN=.4,KMAX=PORTRAIT?7:4;
const clampK=k=>Math.min(KMAX,Math.max(KMIN,k));
const softK=k=>k>KMAX?KMAX*Math.pow(k/KMAX,.35):(k<KMIN?KMIN*Math.pow(k/KMIN,.35):k);   // резиновый упор пинча
function syncTarget(){tk=zk;ttx=ztx;tty=zty;}
function stopAnim(){if(zRAF){cancelAnimationFrame(zRAF);zRAF=0;}}
let flingRAF=0;function stopFling(){if(flingRAF){cancelAnimationFrame(flingRAF);flingRAF=0;}}
function cancelZAnim(){stopAnim();stopFling();syncTarget();}
const screenCenterPt=()=>{const r=svg.getBoundingClientRect();return svgPt({clientX:r.left+r.width/2,clientY:r.top+r.height/2});};
// мгновенный зум к точке (пинч — прямое управление)
function zoomAt(px,py,f){const nk=softK(zk*f),k=nk/zk;ztx=px-(px-ztx)*k;zty=py-(py-zty)*k;zk=nk;applyZ();}
// A. lerp к цели
function zoomTo(px,py,nk){if(!zRAF)syncTarget();stopFling();nk=clampK(nk);const k=nk/tk;ttx=px-(px-ttx)*k;tty=py-(py-tty)*k;tk=nk;runZAnim();}
function runZAnim(){stopAnim();let last=performance.now();
  const step=now=>{const dt=Math.min(64,now-last);last=now;const e=RM?1:1-Math.pow(1-.34,dt/16.7);   // резче: .34 за кадр 60 Гц (Роч: «было заторможенно»)
    zk=Math.exp(Math.log(zk)+(Math.log(tk)-Math.log(zk))*e);ztx+=(ttx-ztx)*e;zty+=(tty-zty)*e;
    if(Math.abs(Math.log(tk/zk))<2e-4&&Math.abs(ttx-ztx)<.05&&Math.abs(tty-zty)<.05){zk=tk;ztx=ttx;zty=tty;applyZ();zRAF=0;return;}
    applyZ();zRAF=requestAnimationFrame(step);};
  zRAF=requestAnimationFrame(step);}
// B. полёт камеры к (k,tx,ty)
const outExpo=t=>t>=1?1:1-Math.pow(2,-10*t);
function tweenTo(k,tx,ty,dur){stopAnim();stopFling();k=clampK(k);tk=k;ttx=tx;tty=ty;
  if(RM||!dur||dur<=0){zk=k;ztx=tx;zty=ty;applyZ();return;}
  const P=screenCenterPt(),k0=zk,c0x=(P.x-ztx)/k0,c0y=(P.y-zty)/k0,c1x=(P.x-tx)/k,c1y=(P.y-ty)/k,lk0=Math.log(k0),lk1=Math.log(k),t0=performance.now();
  const step=now=>{const t=Math.min(1,(now-t0)/dur),e=outExpo(t);const kk=Math.exp(lk0+(lk1-lk0)*e),cx=c0x+(c1x-c0x)*e,cy=c0y+(c1y-c0y)*e;
    zk=kk;ztx=P.x-kk*cx;zty=P.y-kk*cy;applyZ();if(t<1)zRAF=requestAnimationFrame(step);else{zk=k;ztx=tx;zty=ty;applyZ();zRAF=0;}};
  zRAF=requestAnimationFrame(step);}
// инерция после броска
function fling(vx,vy){stopFling();let last=performance.now();
  const step=now=>{const dt=Math.min(64,now-last);last=now;ztx+=vx*dt;zty+=vy*dt;const f=Math.pow(.935,dt/16.7);vx*=f;vy*=f;applyZ();syncTarget();
    if(Math.hypot(vx,vy)<.004){flingRAF=0;return;}flingRAF=requestAnimationFrame(step);};
  flingRAF=requestAnimationFrame(step);}
// тачпад Mac: пинч (ctrlKey) или Cmd/Ctrl+колесо → зум к курсору; два пальца (обычный скролл) → панорама холста
svg.addEventListener("wheel",e=>{e.preventDefault();
  if(e.ctrlKey||e.metaKey){
    let dy=e.deltaY;if(e.deltaMode===1)dy*=16;else if(e.deltaMode===2)dy*=window.innerHeight||800;
    dy=Math.max(-50,Math.min(50,dy));
    const p=svgPt(e);zoomTo(p.x,p.y,tk*Math.exp(-dy*0.0032));return;
  }
  cancelZAnim();
  const m=svg.getScreenCTM();let dx=e.deltaX,dy=e.deltaY;if(e.deltaMode===1){dx*=16;dy*=16;}else if(e.deltaMode===2){dx*=window.innerWidth||1200;dy*=window.innerHeight||800;}
  ztx-=dx/m.a;zty-=dy/m.d;applyZ();syncTarget();
},{passive:false});
function zoomStep(f){const mid=screenCenterPt();zoomTo(mid.x,mid.y,(zRAF?tk:zk)*f);}
$(".zoom").addEventListener("click",e=>{const z=e.target.closest("button")?.dataset.z;if(!z)return;
  if(z==="fs"){toggleFS();return;}
  if(z==="help"){openHelp();return;}
  if(z==="reset"){focusAll(true);return;}
  zoomStep(z==="in"?1.5:1/1.5);});
// клавиатура: + / − / 0 (не в полях ввода)
window.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||"")||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="+"||e.key==="="){e.preventDefault();zoomStep(1.5);}else if(e.key==="-"||e.key==="_"){e.preventDefault();zoomStep(1/1.5);}else if(e.key==="0"){e.preventDefault();focusAll(true);}});
// двойной клик по пустому холсту — плавный зум к точке (как в картах)
svg.addEventListener("dblclick",e=>{if(e.target.closest(".node")||e.target.closest(".subnode"))return;e.preventDefault();const p=svgPt(e);zoomTo(p.x,p.y,(zRAF?tk:zk)*1.7);});

const ptrs=new Map();let dragging=false,moved=false,sx,sy,stx,sty,pinchD=0,pinchP=null,nodeDrag=null,samples=[];
svg.addEventListener("pointerdown",e=>{e.preventDefault();ptrs.set(e.pointerId,e);cancelZAnim();
  if(ptrs.size===2){dragging=false;nodeDrag=null;const[a,b]=[...ptrs.values()];pinchD=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);return;}
  const ng=e.target.closest(".node");
  if(EDITABLE&&editMode&&ng){const id=ng.dataset.id;const p=svgPt(e);nodeDrag={id,ox:N[id].x,oy:N[id].y,px:p.x,py:p.y};moved=false;}
  else{dragging=true;moved=false;sx=e.clientX;sy=e.clientY;stx=ztx;sty=zty;samples=[{t:performance.now(),x:e.clientX,y:e.clientY}];}});
window.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,e);
  if(ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinchD){pinchP=svgPt({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});zoomAt(pinchP.x,pinchP.y,d/pinchD);moved=true;}pinchD=d;return;}
  if(nodeDrag){const p=svgPt(e);const dx=p.x-nodeDrag.px,dy=p.y-nodeDrag.py;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;N[nodeDrag.id].x=nodeDrag.ox+dx;N[nodeDrag.id].y=nodeDrag.oy+dy;liveMove(nodeDrag.id);return;}
  if(dragging){const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;const m=svg.getScreenCTM();ztx=stx+dx/m.a;zty=sty+dy/m.d;applyZ();
    const now=performance.now();samples.push({t:now,x:e.clientX,y:e.clientY});while(samples.length>2&&now-samples[0].t>110)samples.shift();}});
const upP=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
  if(ptrs.size<2&&pinchD){pinchD=0;// пружина назад, если пинч ушёл за границы
    if(zk>KMAX||zk<KMIN){const k=clampK(zk),P=pinchP||screenCenterPt(),r=k/zk;tweenTo(k,P.x-(P.x-ztx)*r,P.y-(P.y-zty)*r,420);}}
  if(nodeDrag){if(moved)save();nodeDrag=null;}
  if(ptrs.size===0){if(dragging&&moved&&samples.length>1&&e.type==="pointerup"){const a=samples[0],b=samples[samples.length-1],dt=Math.max(1,b.t-a.t);if(performance.now()-b.t<80){const m=svg.getScreenCTM();const vx=(b.x-a.x)/dt/m.a,vy=(b.y-a.y)/dt/m.d;if(Math.hypot(vx,vy)*m.a>.25)fling(vx,vy);}}
    dragging=false;syncTarget();}};
window.addEventListener("pointerup",upP);window.addEventListener("pointercancel",upP);
function liveMove(id){const n=N[id],g=nodeEls[id];if(!g)return;const w=nodeW(n),h=nodeH(n);
  g.querySelectorAll("rect").forEach(r=>{r.setAttribute("x",n.x-w/2);r.setAttribute("y",n.y-h/2);});
  const cir=g.querySelector("circle");if(cir){const o=n.t==="case"?7:9;cir.setAttribute("cx",n.x+w/2-o);cir.setAttribute("cy",n.y-h/2+o);}
  const tx=g.querySelectorAll("text");if(n.t==="hub"){if(tx[0]){tx[0].setAttribute("x",n.x);tx[0].setAttribute("y",n.y-9);}if(tx[1]){tx[1].setAttribute("x",n.x);tx[1].setAttribute("y",n.y+13);}}else if(tx[0]){tx[0].setAttribute("x",n.x);tx[0].setAttribute("y",n.y);}
  linkEls.forEach(le=>{if(le.a===id||le.b===id){const d=path(le.a,le.b);le.core.setAttribute("d",d);le.glow.setAttribute("d",d);}});}

/* ——— hover tooltip + preview ——— */
svg.addEventListener("pointerover",e=>{const ng=e.target.closest(".node");if(!ng||dragging||nodeDrag)return;const id=ng.dataset.id,n=N[id];if(!n)return;
  previewLinks(id);const tip=$("#tooltip");if(tip){const st=stOf(n);tip.innerHTML=`<b>${esc(n.label)}</b><i>${esc(n.cat||"")}</i>${n.s&&n.s!=="core"?` · <i style="color:${st.c}">${st.t}</i>`:""}`;tip.classList.add("show");moveTip(e);}});
svg.addEventListener("pointermove",e=>{if($("#tooltip")?.classList.contains("show"))moveTip(e);});
svg.addEventListener("pointerout",e=>{if(e.target.closest(".node")&&!e.relatedTarget?.closest?.(".node")){$("#tooltip")?.classList.remove("show");if(!selectedId)baseLinks();else applyHighlight(selectedId);}});
function moveTip(e){const tip=$("#tooltip"),r=diagram.getBoundingClientRect();let x=e.clientX-r.left+14,y=e.clientY-r.top+14;if(x>r.width-180)x-=200;tip.style.left=x+"px";tip.style.top=y+"px";}

/* ——— click ——— */
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const so=e.target.closest(".socn");if(so){e.preventDefault();window.open(so.dataset.url,"_blank","noopener");return;}const ng=e.target.closest(".node");if(!ng)return;e.preventDefault();select(ng.dataset.id);});
svg.addEventListener("click",e=>{if(moved){moved=false;return;}const so=e.target.closest(".socn");if(so){window.open(so.dataset.url,"_blank","noopener");return;}const ng=e.target.closest(".node");if(ng){select(ng.dataset.id);return;}if(e.target.closest(".subnode"))return;reset();});
window.addEventListener("keydown",e=>{
  if(tourIdx>=0){if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();tourGo(tourIdx+1);return;}if(e.key==="ArrowLeft"){tourGo(tourIdx-1);return;}if(e.key==="Escape"){endTour();return;}}
  if(lb.style.display==="flex"){if(e.key==="ArrowRight")galGo(1);else if(e.key==="ArrowLeft")galGo(-1);else if(e.key==="Escape")closeLight();return;}
  if((e.key==="f"||e.key==="F"||e.key==="а"||e.key==="А")&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||"")){e.preventDefault();toggleFS();return;}
  if(e.key==="Escape"&&document.body.classList.contains("filter-open")){closeFilter();return;}
  if(e.key==="Escape"){const w=$("#welcome");if(w&&!w.classList.contains("hidden")){closeWelcome();return;}
    if(!selectedId&&document.body.classList.contains("fs")&&!document.fullscreenElement){setFS(false);return;}reset();}
});

/* ——— bottom-sheet drag (мобила): свайп ручки вверх=развернуть, вниз=закрыть ——— */
let sheetDrag=null;
panel.addEventListener("pointerdown",e=>{if(!isMob())return;const onGrab=!!e.target.closest("[data-grab]");
  if(!onGrab&&(panel.scrollTop>0||e.target.closest(".htrack,button,a,input,select,textarea,.seg")))return;
  sheetDrag={y:e.clientY,x:e.clientX,h:panel.getBoundingClientRect().height,armed:onGrab};if(onGrab){panel.style.transition="none";e.preventDefault();}});
window.addEventListener("pointermove",e=>{if(!sheetDrag)return;
  if(!sheetDrag.armed){const dy=e.clientY-sheetDrag.y,dx=e.clientX-sheetDrag.x;if(Math.abs(dy)<10)return;if(dy<0||Math.abs(dy)<Math.abs(dx)*1.2){sheetDrag=null;return;}sheetDrag.armed=true;panel.style.transition="none";}
  let h=sheetDrag.h+(sheetDrag.y-e.clientY);h=Math.max(90,Math.min(window.innerHeight*0.92,h));panel.style.height=h+"px";});
window.addEventListener("pointercancel",()=>{if(!sheetDrag)return;sheetDrag=null;panel.style.transition="";panel.style.height="";});
window.addEventListener("pointerup",()=>{if(!sheetDrag)return;const armed=sheetDrag.armed;sheetDrag=null;panel.style.transition="";if(!armed)return;
  const vh=window.innerHeight,h=panel.getBoundingClientRect().height;
  if(h<vh*0.3)reset();else if(h>vh*0.72)panel.style.height=Math.round(vh*0.9)+"px";else panel.style.height="";});

/* ——— panel actions (editor) ——— */
panel.addEventListener("click",e=>{
  if(e.target.closest("[data-close]")){reset();return;}
  const dm=e.target.closest("[data-dom]");if(dm){reset();setFilter("dom:"+dm.dataset.dom);toast("Тема · "+dm.dataset.dom);return;}
  const go=e.target.closest("[data-go]");if(go){select(go.dataset.go);return;}
  const sh=e.target.closest("[data-share]");if(sh){shareNode(sh.dataset.share);return;}
  if(e.target.closest("[data-inv]")){openInvestor();return;}
  const sv=e.target.closest("[data-view]");if(sv&&selectedId){heroView=sv.dataset.view;const top=panel.scrollTop;renderInfo(selectedId);panel.scrollTop=top;return;}
  const gal=e.target.closest("[data-gal]");if(gal){openGallery(heroImgs,+gal.dataset.gal,selectedId&&N[selectedId]?N[selectedId].label:"");return;}
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
  function syncEditBtns(){const on=editMode;editBtn?.classList.toggle("on",on);$("#hudEditBtn")?.classList.toggle("on",on);}
  function enterEdit(){editMode=true;document.body.classList.add("edit");syncEditBtns();}
  function exitEdit(){editMode=false;document.body.classList.remove("edit");syncEditBtns();}
  function enterEditMode(){enterEdit();if(selectedId)select(selectedId);else reset();toast("✏️ Режим редактирования — двигай узлы, кликни для правки");}
  function saveAndExit(){if(panel.dataset.editing&&N[panel.dataset.editing])commitForm();save();render();exitEdit();reset();focusAll(true);toast("✓ Сохранено · режим редактирования закрыт");}
  function addProject(){if(!editMode)enterEdit();const id="p"+Date.now().toString(36);const X=(660-ztx)/zk,Y=(435-zty)/zk;N[id]={t:"mini",layer:"L2",s:"concept",x:Math.round(X),y:Math.round(Y),label:"Новый проект",cat:"",desc:"",inter:"",links:[],imgs:[]};save();render();select(id);toast("➕ Проект создан — заполни и свяжи");}
  function exportJSON(){const blob=new Blob([JSON.stringify({nodes:N,links:L,zones:ZONES},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="apphub-map.json";a.click();URL.revokeObjectURL(a.href);toast("⬇ Экспортировано — пришли файл, вошью в data.js");}
  // плавающая панель режима редактирования (общая для internal и ?edit) — с кнопкой «Сохранить и выйти»
  let editHint=diagram?.querySelector(".editHint");
  if(diagram&&!editHint){editHint=document.createElement("div");editHint.className="editHint";diagram.appendChild(editHint);}
  if(editHint){editHint.innerHTML=`<span class="ehlabel">✏️ Режим редактирования</span><button class="btn ehbtn" data-eh="add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Проект</button><button class="btn ehbtn" data-eh="json"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke-linecap="round" stroke-linejoin="round"/></svg>JSON</button><button class="btn prim ehbtn" data-eh="save">✓ Сохранить и выйти</button>`;
    editHint.addEventListener("click",e=>{const a=e.target.closest("[data-eh]")?.dataset.eh;if(a==="add")addProject();else if(a==="json")exportJSON();else if(a==="save")saveAndExit();});}
  // кнопка редактирования холста прямо в HUD (над зумом, на канвасе)
  const zoomEl=$(".zoom");
  if(zoomEl&&!$("#hudEditBtn")){const hb=document.createElement("button");hb.id="hudEditBtn";hb.className="hudedit";hb.title="Редактировать холст";hb.setAttribute("aria-label","Редактировать холст");hb.innerHTML=`<svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>`;zoomEl.insertBefore(hb,zoomEl.firstChild);
    hb.addEventListener("click",()=>{if(editMode)saveAndExit();else enterEditMode();});}
  editBtn?.addEventListener("click",()=>{if(editMode)saveAndExit();else enterEditMode();});
  $("#addBtn")?.addEventListener("click",addProject);
  $("#expBtn")?.addEventListener("click",exportJSON);
  $("#impBtn")?.addEventListener("click",()=>$("#fileJson").click());
  $("#fileJson")?.addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);if(!s.nodes||!s.links)throw 0;N=s.nodes;L=s.links;ZONES=s.zones||ZONES;save();firstRender=true;render();buildChrome();reset();toast("⬆ Импортировано");}catch(_){toast("⚠ Неверный файл");}};r.readAsText(f);});
  $("#resetBtn")?.addEventListener("click",()=>{if(confirm("Сбросить карту к исходному (data.js)? Правки в браузере удалятся.")){localStorage.removeItem(KEY);initState();firstRender=true;render();reset();toast("↺ Сброшено к исходному");}});
}

/* ——— search с выпадающими результатами ——— */
const qEl=$("#q"),resEl=$("#results");
function hideResults(){if(resEl){resEl.innerHTML="";resEl.classList.remove("show");}}
function pickResult(id){if(qEl)qEl.value="";hideResults();select(id);}
qEl?.addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();
  if(!q){hideResults();if(selectedId)applyHighlight(selectedId);else{baseLinks();applyFilter();}return;}
  const hits=Object.keys(N).filter(id=>N[id].label.toLowerCase().includes(q)||(N[id].cat||"").toLowerCase().includes(q));
  const set=new Set(hits);Object.entries(nodeEls).forEach(([id,g])=>{g.style.opacity=set.has(id)?1:.12;});
  linkEls.forEach(le=>{le.core.setAttribute("opacity",.04);le.glow.setAttribute("opacity",.02);});
  if(resEl){resEl.innerHTML=hits.length?hits.slice(0,8).map(id=>{const st=stOf(N[id]);return`<button class="rrow" data-go="${id}"><span class="rdot" style="background:${C[N[id].layer]||C.L2}"></span><b>${esc(N[id].label)}</b><i>${esc(N[id].cat||"")}</i>${N[id].s&&N[id].s!=="core"?`<span class="rst" style="background:${st.c}"></span>`:""}</button>`;}).join(""):'<div class="rnone">ничего не найдено</div>';resEl.classList.add("show");}});
qEl?.addEventListener("keydown",e=>{if(e.key==="Enter"){const f=resEl?.querySelector("[data-go]");if(f)pickResult(f.dataset.go);}else if(e.key==="Escape"){qEl.value="";hideResults();reset();qEl.blur();}});
resEl?.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)pickResult(b.dataset.go);});
document.addEventListener("click",e=>{if(!e.target.closest(".search"))hideResults();});

/* ——— демо-тур (интерактивный онбординг) ——— */
const TOUR=[
  {t:"Добро пожаловать 👋",x:"Это карта экосистемы AppHub на сентябрь 2026: студия, петля трафика, сеть Loop и 19 живых клиентских приложений. За минуту покажу, как всё связано. Пропустить можно в любой момент.",focus:"all"},
  {t:"Вход · студия",x:"Слева сверху — как бизнес попадает в экосистему: сайт с конструктором из 5 шагов, Studio Bot, LinkOS (визитка за минуту), BuildOS (приложение из 20 шаблонов) и портфолио на 34 продукта.",focus:"studiobot",scale:1.45,spot:["site","studiobot","portfolio","linkos","osbuilder"]},
  {t:"L1 · Пользователь и ИИ-агент",x:"Всё начинается здесь. Человек уже залогинен в мессенджере — ноль установок и паролей. Рядом его ИИ-агент: сам находит предложения, остаётся подтвердить и оплатить.",focus:"l1",scale:1.5,spot:["l1"]},
  {t:"L2 · Агрегаторы",x:"Агент идёт к агрегаторам — CityHub, Neon, BazApp, Korob·ka. Они подбирают бизнесы под нишу или город и собирают готовое предложение.",focus:"l2",scale:1.5,spot:["l2","cityhub","neon","bazapp","korobka"]},
  {t:"L3 · Бизнесы",x:"Агрегатор направляет в конкретные бизнесы: меню, бронь, запись, оплата. Каждый проект — два приложения: клиентское и админ-панель.",focus:"l3",scale:1.4,spot:["l3","dine","events","med","carrent","tours","shops","construction","anzh","kingfit","cityhome","crypto","dropper"]},
  {t:"Живые кейсы",x:"Справа — 19 реальных приложений из портфолио: рестораны, клиники, застройщики, форумы, бьюти, ЖКХ. Клик по любому — экраны, ссылка на демо и админку.",focus:"alliance",scale:1.25,spot:["ebit","realtyforum","bimboo","realtypreset","alliance","dolceeda","epoch","neko","postnicken","zemdoc","antiage","megagym","kingfitapp","anzhskin","anzhstore","paratravel","tds","vodokanal","almare"]},
  {t:"↺ Loop замыкает петлю",x:"Бизнес возвращает гостя в L1 через сеть Loop: 1–5% от покупки — баллами, которые тратятся в любом приложении сети. Гость одного бизнеса приносит выручку другому. Это и есть рельсы.",focus:"loop",scale:1.6,spot:["loop","l1","l3"]},
  {t:"Источники трафика и ядро",x:"По углам — ядро мест GEOS, биржа дистрибуции PromOS, соцсети и медиа, игры (NARDUM, Crooked Cook, Selfix). Они бесплатно приводят аудиторию извне и питают петлю.",focus:"all",spot:["editcmd","leados","promos","geos","news","musichaed","social","arcades","boardgames","crookedcook","selfix","nardum"]},
  {t:"Статусы и экраны",x:"Зелёная точка — в проде, жёлтая — прототип или демо, серая — концепт. Вот EPOCH: живой ресторан в Батуми с админкой. Кликни узел — увидишь экраны и рабочую ссылку.",focus:"epoch",scale:1.8,spot:["epoch"],select:"epoch"},
  {t:"Твоя очередь 🚀",x:"Готово! Кликай узлы, фильтруй по статусу и темам, ищи продукты. ⤢ или клавиша F — карта на весь экран для презентации; в карточке — «Поделиться», чтобы отправить ссылку на конкретный продукт.",focus:"all"}
];
let tourIdx=-1,tourBg,tourCard;
function vbCenter(){const v=svg.viewBox.baseVal;return[v.x+v.width/2,v.y+v.height/2];}
function smooth(on){}   // анимация теперь в JS (tweenTo), CSS-переходы не нужны
function smoothPulse(){}
const isMob=()=>window.innerWidth<=760;
/* центрировать viewBox-точку (cx,cy) в точке экрана (доля высоты yf, сдвиг влево xoff) при масштабе scale */
function panTo(cx,cy,scale,yf,xoff,dur){const rect=svg.getBoundingClientRect();
  const pt=svgPt({clientX:rect.left+rect.width/2-(xoff||0),clientY:rect.top+rect.height*(yf==null?0.5:yf)});
  const k=clampK(scale);tweenTo(k,pt.x-k*cx,pt.y-k*cy,dur==null?560:dur);}
function portraitK(){const v=svg.viewBox.baseVal,rect=svg.getBoundingClientRect(),m=Math.min(rect.width/v.width,rect.height/v.height);return clampK((rect.width*0.97)/(m*v.width));}
function focusNode(id,scale){const n=N[id];if(!n)return;const mob=isMob();if(PORTRAIT){panTo(MOBC,n.y,portraitK(),0.3);return;}panTo(n.x,n.y,scale||(mob?1.7:1.5),mob?0.24:0.36);}
function focusCenter(scale,yf){const c=vbCenter();panTo(c[0],c[1],scale,yf);}
function fitWidthTop(dur){const v=svg.viewBox.baseVal,rect=svg.getBoundingClientRect(),m=Math.min(rect.width/v.width,rect.height/v.height);
  const k=clampK((rect.width*0.97)/(m*v.width));const pt=svgPt({clientX:rect.left+rect.width/2,clientY:rect.top+10});tweenTo(k,pt.x-k*(v.x+v.width/2),pt.y-k*v.y,dur==null?560:dur);}
function focusAll(sm){if(sm)smoothPulse();if(PORTRAIT)fitWidthTop();else focusCenter(1,0.5);}   // телефон = десктоп: вся схема целиком, дальше пинч
function focusSelected(id){const n=N[id];if(!n)return;const mob=isMob();
  if(PORTRAIT){panTo(MOBC,n.y,portraitK(),0.22);smoothPulse();return;}
  panTo(n.x,n.y,n.t==="hub"?(mob?1.45:1.35):(mob?1.85:1.75),mob?0.24:0.46,mob?0:204);smoothPulse();}
function focusFilter(){const ids=Object.keys(N).filter(id=>matchFilter(N[id]));
  if(filter==="all"||ids.length>=Object.keys(N).length-1||!ids.length){focusAll(true);return;}
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  ids.forEach(id=>{const n=N[id],w=nodeW(n),h=nodeH(n);mnx=Math.min(mnx,n.x-w/2);mxx=Math.max(mxx,n.x+w/2);mny=Math.min(mny,n.y-h/2);mxy=Math.max(mxy,n.y+h/2);});
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
function startTour(){if(!tourCard)buildTour();selectedId=null;tourBg.classList.remove("hidden");tourCard.classList.remove("hidden");document.body.classList.add("touring");smooth(true);tourGo(0);try{localStorage.setItem("apphub-toured-v2","1");}catch(e){}}
function endTour(){tourIdx=-1;document.body.classList.remove("touring");spotlight(null);smooth(true);focusAll();setTimeout(()=>smooth(false),720);tourBg&&tourBg.classList.add("hidden");tourCard&&tourCard.classList.add("hidden");reset();}
function tourGo(i){if(i<0)return;if(i>=TOUR.length){endTour();return;}tourIdx=i;const s=TOUR[i];
  const tx=PORTRAIT?s.x.replace("Слева сверху —","Сверху —").replace("Справа —","Ниже —").replace("По углам —","Внизу —").replace("слева — вход в студию, справа — живые кейсы","сверху — вход в студию, ниже — живые кейсы"):s.x;
  tourCard.querySelector("h3").textContent=s.t;tourCard.querySelector("p").textContent=tx;
  tourCard.querySelector(".tdots").innerHTML=TOUR.map((_,j)=>`<i class="${j===i?"on":""}"></i>`).join("");
  tourCard.querySelector('[data-t="prev"]').style.visibility=i===0?"hidden":"visible";
  tourCard.querySelector('[data-t="next"]').textContent=i===TOUR.length-1?"Готово ✓":"Далее →";
  if(s.focus==="all"){if(PORTRAIT){if(s.spot&&s.spot.length)focusNode(s.spot[0]);else fitWidthTop();}else focusCenter(1,0.5);}else if(s.focus)focusNode(s.focus,s.scale);
  spotlight(s.spot||null);
  if(s.select&&N[s.select]){clearSubs();renderInfo(s.select);panel.classList.add("open");}else panel.classList.remove("open");
}
$("#tourBtn")?.addEventListener("click",()=>{closeWelcome();startTour();});
$("#linksBtn")?.addEventListener("click",()=>{showAllLinks=!showAllLinks;$("#linksBtn").classList.toggle("on",showAllLinks);if(!selectedId)baseLinks();toast(showAllLinks?"Показаны все связи":"Связи — по выбору");});

/* ——— приветственный онбординг (первый визит) ——— */
let welcomeEl;
function buildWelcome(){
  welcomeEl=document.createElement("div");welcomeEl.id="welcome";welcomeEl.className="welcome";
  const logo=document.querySelector(".brand .logo")?.outerHTML||"";
  welcomeEl.innerHTML=`<div class="wcard"><div class="wlogo">${logo}</div><div class="weyebrow">APPHUB · ЭКОСИСТЕМА · ${esc(META.updated||"2026")}</div><h2>Карта экосистемы AppHub</h2><div class="wstats"><div><b>${META.portfolio||34}</b><span>продукта</span></div><div><b>${META.screens||205}</b><span>экранов</span></div><div><b>${META.niches||16}</b><span>ниш</span></div></div><p>Студия, петля трафика, сеть Loop и живые приложения — от ресторанов и клиник до застройщиков и ЖКХ. Покажу за минуту — или осмотрись сам.</p><div class="wrow"><button class="btn prim" data-w="tour">▶ Пройти тур</button><button class="btn" data-w="explore">Осмотреться сам</button></div><button class="wlink" data-w="investor">Я инвестор или партнёр → цифры и модель</button></div>`;
  document.body.appendChild(welcomeEl);
  welcomeEl.addEventListener("click",e=>{const a=e.target.closest("[data-w]")?.dataset.w;if(a==="tour"){closeWelcome();startTour();}else if(a==="investor"){closeWelcome();openInvestor();}else if(a==="explore"||e.target===welcomeEl)closeWelcome();});
}
function showWelcome(){if(!welcomeEl)buildWelcome();welcomeEl.classList.remove("hidden");}
function closeWelcome(){if(welcomeEl)welcomeEl.classList.add("hidden");try{localStorage.setItem("apphub-toured-v2","1");}catch(e){}}

/* ——— «Инвестору»: факты, модель, что смотреть на карте — только проверенные цифры (кит 2026-09-09/10, NOTEBOOK 11.09) ——— */
function renderInvestor(){const go=(id,t)=>N[id]?`<button class="rel" data-go="${id}"><span class="rdot" style="background:${C[N[id].layer]||C.L2}"></span>${t}</button>`:"";
  return`${CLOSE}<div class="badge" style="color:var(--lime);border:1px solid rgba(197,255,95,.3);background:rgba(197,255,95,.07)"><i style="background:var(--lime)"></i>ИНВЕСТОРУ · ${esc(META.updated||"2026")}</div>
  <div class="pTitle">Приложение без установки — и рельсы под ним</div>
  <p class="hint">Студия — вход. Конструктор — масштаб без нашего времени. Сеть Loop — правила, по которым бизнесы обмениваются клиентами. Каждая ступень нужна, чтобы дойти до следующей.</p>
  ${(()=>{const f=mapFacts();return`<div class="facts"><div><b>${META.portfolio||34}</b><span>продукта в портфолио</span></div><div><b>${META.screens||205}</b><span>реальных экранов</span></div><div><b>${META.niches||16}</b><span>ниш освоено</span></div><div><b>${META.admins||f.admins}</b><span>админ-панелей</span></div><div><b>${f.live}</b><span>продуктов в проде на карте</span></div><div><b>${f.cases}</b><span>живых кейсов на карте</span></div></div>
  <div class="src">▣ ${META.source||"портфолио-бот"} ${statsStamp()} · остальное считается из карты</div>`;})()}
  <div class="pSec"><h4>Три ступени монетизации</h4>
    <div class="steps"><div class="step on"><i>01</i><b>Студия</b><span>приложение под ключ за 1–3 дня · один проект — один чек · работает</span></div>
    <div class="step dev"><i>02</i><b>Конструктор BuildOS</b><span>бизнес собирает сам из 20 шаблонов · Stars, крипта, PRO-подписка · фронт готов, публикация ждёт бэкенда</span></div>
    <div class="step seed"><i>03</i><b>Протокол Loop</b><span>1–5% покупки возвращается баллами, которые тратятся в любом приложении сети · растёт связями, а не проектами</span></div></div></div>
  <div class="pSec"><h4>Тарифы и оффер</h4><div class="tiers"><span>FREE $0</span><span>STARTER $49</span><span>PRO $99</span><span>BUSINESS $149</span><span>ENTERPRISE $1 500/год</span></div>
    <p class="small">Founding Partner: <b>$1 500</b> вместо $2 500 до 1 января 2027, 10 мест. Через 12 месяцев клиент получает docker-образы и уносит приложение на свой хостинг — гарантированный выход вместо вечной аренды у подрядчика.</p></div>
  <div class="pSec"><h4>Инвестиционный меморандум</h4>
    <a class="deck" href="docs/AppHUB_Scalable_Infrastructure.pdf" target="_blank" rel="noopener" aria-label="Открыть презентацию PDF"><img src="docs/AppHUB_Scalable_Infrastructure_cover.jpg" alt="Архитектура цифрового города. От студии к масштабируемой сети" loading="lazy"><i>↗</i></a><div class="src">сентябрь 2026 · 15 слайдов · PDF 16 МБ</div>
    <p class="small">Раунд Seed из меморандума: <b>$2 000 000 за 10%</b>, post-money $20M, equity или SAFE. Юнит-экономика: ARPA $35/мес, валовая маржа 88%, LTV $616, payback 4 месяца.</p></div>
  <div class="pSec"><h4>Что смотреть на карте</h4><div class="rels">${go("loop","Loop · сеть")}${go("osbuilder","BuildOS")}${go("geos","GEOS · ядро мест")}${go("epoch","EPOCH · живой ресторан")}${go("cityhub","CityHub")}${go("antiage","AntiAge · клиника")}</div></div>
  <div class="ctarow"><a class="pLink go" href="docs/AppHUB_Scalable_Infrastructure.pdf" target="_blank" rel="noopener"><b>Открыть презентацию</b><small>PDF · 15 слайдов</small><i>↗</i></a><a class="pLink alt" href="https://apphub.studio/founders" target="_blank" rel="noopener">Founding Partners →</a><a class="pLink alt" href="mailto:hello@apphub.studio?subject=AppHub%20%E2%80%94%20%D0%B8%D0%BD%D0%B2%D0%B5%D1%81%D1%82%D0%BE%D1%80%D1%83">✉ hello@apphub.studio</a><a class="pLink alt" href="map-2x.png" target="_blank" rel="noopener">▣ Карта для слайдов · PNG</a></div>
  <p class="small muted">Финмодель и детали сделки — по запросу на почту студии. Цифры на карте — из живых продуктов, цифры раунда — из меморандума.</p>${socialRow("Мы в сети")}`;}
function openInvestor(){if(EDITABLE&&editMode)return;closeWelcome();closeFilter();selectedId=null;clearSubs();baseLinks();Object.values(nodeEls).forEach(g=>{g.style.opacity=1;g.classList.remove("sel");});applyFilter();
  panel.innerHTML=renderInvestor();panel.classList.add("open");document.body.classList.add("sel-open");panel.scrollTop=0;try{history.replaceState(null,"",location.pathname+location.search+"#investor");}catch(e){}if(!isMob())focusAll(true);}
$("#invBtn")?.addEventListener("click",openInvestor);
/* ——— «?»: стартовая панель с легендой (публичная витрина не открывает её сама) ——— */
function openHelp(){if(EDITABLE&&editMode)return;const was=selectedId;selectedId=null;clearSubs();baseLinks();Object.values(nodeEls).forEach(g=>{g.style.opacity=1;g.classList.remove("sel");});applyFilter();
  panel.innerHTML=CLOSE+defaultPanel();panel.classList.add("open");document.body.classList.add("sel-open");try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}if(was&&!isMob())focusAll(true);}
/* ——— полноэкранный режим: прячем шапку и фильтры, карта на весь экран (Fullscreen API там, где он есть) ——— */
function setFS(on){document.body.classList.toggle("fs",on);$("#fsBtn")?.classList.toggle("on",on);$("#fsBtn")?.setAttribute("title",on?"Выйти из полного экрана":"На весь экран");
  setTimeout(()=>{if(tourIdx>=0)return;if(selectedId&&N[selectedId])focusSelected(selectedId);else focusAll(true);},80);toast(on?"⤢ Карта на весь экран · Esc — выход":"Обычный режим");}
function toggleFS(){const on=!document.body.classList.contains("fs");
  if(on){const el=document.documentElement,rq=el.requestFullscreen||el.webkitRequestFullscreen;if(rq&&!isMob()){try{const r=rq.call(el);if(r&&r.catch)r.catch(()=>{});}catch(e){}}}
  else if(document.fullscreenElement||document.webkitFullscreenElement){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document);}catch(e){}}
  setFS(on);}
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&document.body.classList.contains("fs"))setFS(false);});
let rsT=0;window.addEventListener("resize",()=>{clearTimeout(rsT);rsT=setTimeout(()=>{if(Q.has("portrait")&&(window.innerWidth<=760)!==PORTRAIT){location.reload();return;}if(tourIdx>=0||nodeDrag||dragging)return;if(selectedId&&N[selectedId]){if(!isMob())focusSelected(selectedId);}else focusAll();},140);});
/* ——— мобильный док (Apple HIG: действия под большим пальцем) ——— */
// меню фильтра живёт в body (backdrop-filter на .bar делал её containing block для fixed); поповер позиционируется JS от кнопки
$("#dockFilter")?.addEventListener("click",e=>{e.stopPropagation();$("#filterMenu")?.classList.contains("open")?closeFilter():openFilter();});
const openPortfolio=()=>{closeWelcome();if(N.portfolio)select("portfolio");else window.open(PF_URL,"_blank","noopener");};
$("#dockPortfolio")?.addEventListener("click",openPortfolio);$("#pfBtn")?.addEventListener("click",openPortfolio);
$("#dockTour")?.addEventListener("click",()=>{closeWelcome();startTour();});


/* ——— go ——— */
render();buildChrome();loadStats();
// шрифты грузятся асинхронно — после готовности перерисовываем, чтобы ширина карточек измерилась точно
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{render();if(selectedId&&N[selectedId]){applyHighlight(selectedId);if(PORTRAIT)focusSelected(selectedId);}else if(PORTRAIT)fitWidthTop();});
if(PORTRAIT){requestAnimationFrame(()=>{if(!selectedId&&tourIdx<0)fitWidthTop();});setTimeout(()=>{if(!selectedId&&tourIdx<0)fitWidthTop();},450);}
if(location.hash)openHash();else{reset();if(PORTRAIT)fitWidthTop(0);else{const c=vbCenter();panTo(c[0],c[1],1,0.5,0,0);}}
window.addEventListener("hashchange",openHash);
if(MODE==="public"&&!GATED&&!location.hash){let toured;try{toured=localStorage.getItem("apphub-toured-v2");}catch(e){}if(!toured)setTimeout(showWelcome,450);}
startSync();
})();
