const $=s=>document.querySelector(s),A=document.getElementById('app');let S=JSON.parse(localStorage.s||'null'),items=[],hist=[],tab='stock',loc='todas',draft={};
const api=async(u,o={})=>{const r=await fetch(u,{...o,headers:{'Content-Type':'application/json','x-token':S?.token}});if(r.status===401){logout();throw 0}return r.json()};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>'$'+n.toFixed(2),fd=t=>t?new Date(t).toLocaleString('es-PR',{dateStyle:'short',timeStyle:'short'}):'—';
const hdr=t=>`<header><h1>${t}</h1>${S?`<button onclick="logout()">Salir · ${esc(S.user.name.split(' ')[0])}</button>`:''}</header>`;
const EJ=`<div class="ej">⚠️ Datos de <b>ejemplo</b> (pizzería/bar). El dueño puede editarlos o borrarlos en “Catálogo”.</div>`;
function logout(){S=null;localStorage.removeItem('s');render()}
let pin='';function login(){A.innerHTML=hdr('📦 Inventario Restaurante')+`<main><div class="card"><p>Entra tu PIN</p><div class="pin">${'•'.repeat(pin.length)||'&nbsp;'}</div><div id="err" class="muted"></div>
<div class="keys">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(k=>`<button onclick="k('${k}')">${k}</button>`).join('')}</div></div><p class="muted">Demo: Empleado 1111 / 2222 · Dueño 9999</p></main>`}
async function k(x){if(x==='⌫')pin=pin.slice(0,-1);else if(x==='✓'){const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})}).then(r=>r.json());pin='';if(r.token){S=r;localStorage.s=JSON.stringify(r);return render()}login();$('#err').textContent=r.error;return}else if(pin.length<6)pin+=x;login()}
async function render(){if(!S)return login();items=await api('/api/items');S.user.role==='dueno'?owner():emp()}
// EMPLEADO
function emp(){const locs=['todas',...new Set(items.map(i=>i.location))];const list=items.filter(i=>loc==='todas'||i.location===loc);
A.innerHTML=hdr('📝 Conteo de inventario')+`<main>${items.some(i=>i.ejemplo)?EJ:''}<div class="tabs">${locs.map(l=>`<button class="${l===loc?'on':''}" onclick="loc='${l}';emp()">${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div>
${list.map(i=>{const d=draft[i.id];const v=d?d.qty:'';return`<div class="card"><div class="row"><div class="grow"><b>${esc(i.name)}</b><div class="muted">${esc(i.category)} · ${esc(i.unit)} · ${esc(i.location)}<br>Último: ${i.qty??'—'} (${fd(i.ts)})</div></div>
<div class="qty"><button onclick="st(${i.id},-1)">−</button><input inputmode="decimal" value="${v}" placeholder="${i.qty??0}" onchange="setq(${i.id},this.value)"><button onclick="st(${i.id},1)">+</button></div></div>
${d?`<input class="note" placeholder="Nota (opcional)" value="${esc(d.note||'')}" onchange="draft[${i.id}].note=this.value">`:''}</div>`}).join('')}
<div style="position:sticky;bottom:10px"><button class="btn" onclick="send()">Guardar conteo (${Object.keys(draft).length})</button></div></main>`}
function st(id,d){const i=items.find(x=>x.id===id);const c=draft[id]?.qty??(i.qty||0);draft[id]={...draft[id],qty:Math.max(0,+c+d)};emp()}
function setq(id,v){if(v==='')delete draft[id];else draft[id]={...draft[id],qty:Math.max(0,+v)};emp()}
async function send(){const c=Object.entries(draft).map(([id,d])=>({item_id:+id,...d}));if(!c.length)return alert('No hay cambios');await api('/api/counts',{method:'POST',body:JSON.stringify({counts:c})});draft={};alert('✅ Conteo guardado ('+c.length+' artículos)');render()}
// DUEÑO
async function owner(){if(tab!=='stock'&&tab!=='cat')hist=await api('/api/history');
const val=items.reduce((s,i)=>s+(i.qty||0)*i.cost,0),low=items.filter(i=>(i.qty??0)<i.par);
let body='';
if(tab==='stock')body=`<div class="card row"><div class="stat"><b>${money(val)}</b><span class="muted">Valor estimado</span></div><div class="stat"><b>${items.length}</b><span class="muted">Artículos</span></div><div class="stat"><b style="color:#b91c1c">${low.length}</b><span class="muted">Bajo par</span></div></div>
${low.length?`<div class="card"><b>🚨 Alertas de stock bajo</b>${low.map(i=>`<div class="row" style="margin-top:6px"><span class="grow">${esc(i.name)}</span><span class="badge low">${i.qty??0} / ${i.par} ${esc(i.unit)}</span></div>`).join('')}</div>`:''}
${items.map(i=>`<div class="card row"><div class="grow"><b>${esc(i.name)}</b> ${i.ejemplo?'<span class="badge">ejemplo</span>':''}<div class="muted">${esc(i.location)} · ${fd(i.ts)} · ${esc(i.emp||'')}${i.note?' · 📝 '+esc(i.note):''}</div></div><div style="text-align:right"><b class="${(i.qty??0)<i.par?'badge low':''}">${i.qty??'—'} ${esc(i.unit)}</b><div class="muted">${money((i.qty||0)*i.cost)}</div></div></div>`).join('')}
<a class="btn" style="display:block;text-align:center;text-decoration:none" href="/api/export/inventario?t=${S.token}">⬇️ Exportar inventario CSV</a>`;
if(tab==='fecha'){const g={};hist.forEach(h=>{const d=h.ts.slice(0,10);(g[d]=g[d]||{n:0,v:0,e:new Set()});g[d].n++;g[d].v+=h.qty*h.cost;g[d].e.add(h.emp)});
 body=Object.entries(g).map(([d,x])=>`<div class="card"><div class="row"><b class="grow">${new Date(d+'T12:00').toLocaleDateString('es-PR',{weekday:'long',day:'numeric',month:'short'})}</b><b>${money(x.v)}</b></div><div class="muted">${x.n} conteos · ${[...x.e].map(esc).join(', ')}</div></div>`).join('')+`<a class="btn" style="display:block;text-align:center;text-decoration:none" href="/api/export/historial?t=${S.token}">⬇️ Exportar historial CSV</a>`}
if(tab==='emp'){const g={};hist.forEach(h=>(g[h.emp]=g[h.emp]||[]).push(h));
 body=Object.entries(g).map(([e,l])=>`<div class="card"><b>👤 ${esc(e)}</b> <span class="muted">${l.length} conteos · último ${fd(l[0].ts)}</span><table>${l.slice(0,8).map(h=>`<tr><td>${esc(h.item)}</td><td>${h.qty} ${esc(h.unit)}</td><td class="muted">${fd(h.ts)}</td></tr>`).join('')}</table></div>`).join('')}
if(tab==='cat')body=`<div class="card"><b>➕ Artículo</b><form onsubmit="saveItem(event)" id="f"><input type="hidden" name="id">
${[['name','Nombre'],['category','Categoría'],['unit','Unidad (lb, caja, botella)'],['par','Nivel par (mínimo)'],['cost','Costo por unidad $']].map(([n,p])=>`<input name="${n}" placeholder="${p}" style="margin-top:6px" ${n==='name'?'required':''}>`).join('')}
<select name="location" style="margin-top:6px">${['nevera','congelador','almacén','barra','cocina'].map(l=>`<option>${l}</option>`).join('')}</select><button class="btn" style="margin-top:8px">Guardar</button></form></div>
${items.map(i=>`<div class="card row"><div class="grow"><b>${esc(i.name)}</b> ${i.ejemplo?'<span class="badge">ejemplo</span>':''}<div class="muted">${esc(i.category)} · ${esc(i.unit)} · ${esc(i.location)} · par ${i.par} · ${money(i.cost)}</div></div><button onclick="edit(${i.id})">✏️</button><button onclick="del(${i.id})">🗑️</button></div>`).join('')}`;
A.innerHTML=hdr('📊 Panel del dueño')+`<main>${items.some(i=>i.ejemplo)?EJ:''}<div class="tabs">${[['stock','Inventario'],['fecha','Por fecha'],['emp','Por empleado'],['cat','Catálogo']].map(([k,l])=>`<button class="${k===tab?'on':''}" onclick="tab='${k}';owner()">${l}</button>`).join('')}</div>${body}</main>`}
async function saveItem(e){e.preventDefault();await api('/api/items',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});render()}
function edit(id){const i=items.find(x=>x.id===id),f=$('#f');['id','name','category','unit','par','cost','location'].forEach(k=>f[k].value=i[k]);scrollTo(0,0)}
async function del(id){if(confirm('¿Quitar este artículo?')){await api('/api/items/'+id,{method:'DELETE'});render()}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');render();
