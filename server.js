const express=require('express'),fs=require('fs'),path=require('path'),crypto=require('crypto'),initSql=require('sql.js');
const DB=process.env.DB_PATH||'./inventario.db';
fs.mkdirSync(path.dirname(path.resolve(DB)),{recursive:true});
(async()=>{
const SQL=await initSql();const db=fs.existsSync(DB)?new SQL.Database(fs.readFileSync(DB)):new SQL.Database();
const save=()=>fs.writeFileSync(DB,Buffer.from(db.export()));
const all=(q,p=[])=>{const s=db.prepare(q);s.bind(p);const r=[];while(s.step())r.push(s.getAsObject());s.free();return r};
const run=(q,p=[])=>{db.run(q,p);save()};
db.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,role TEXT,pin TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY,name TEXT,category TEXT,unit TEXT,location TEXT,par REAL,cost REAL,ejemplo INTEGER DEFAULT 0,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS counts(id INTEGER PRIMARY KEY,item_id INTEGER,qty REAL,user_id INTEGER,note TEXT,ts TEXT);`);
if(!all('SELECT 1 FROM users').length){
 [['Dueño (ejemplo)','dueno','9999'],['Carlos (ejemplo)','empleado','1111'],['María (ejemplo)','empleado','2222']].forEach(u=>db.run('INSERT INTO users(name,role,pin) VALUES(?,?,?)',u));
 const it=[['Queso mozzarella','Lácteos','lb','nevera',20,3.5],['Masa de pizza','Panadería','bolas','nevera',40,0.8],['Salsa de tomate','Salsas','galón','almacén',4,12],['Pepperoni','Carnes','lb','nevera',10,5.25],['Harina 00','Secos','saco 50lb','almacén',3,38],['Aceite de oliva','Secos','botella 1L','almacén',6,9.5],['Cerveza Medalla','Bebidas','caja 24','almacén',8,22],['Cerveza Corona','Bebidas','caja 24','almacén',5,30],['Ron Don Q','Licores','botella','barra',6,14],['Vodka Tito\'s','Licores','botella','barra',4,21],['Limones','Frutas','lb','nevera',10,1.6],['Coca-Cola lata','Bebidas','caja 24','almacén',6,13],['Cajas de pizza 14"','Desechables','paquete 50','almacén',4,25],['Servilletas','Desechables','paquete','almacén',10,3]];
 it.forEach(i=>db.run('INSERT INTO items(name,category,unit,location,par,cost,ejemplo) VALUES(?,?,?,?,?,?,1)',i));
 const now=Date.now();
 for(let d=6;d>=0;d--)all('SELECT * FROM items').forEach(i=>{const q=Math.max(0,Math.round(i.par*(0.3+Math.random()*1.1)));
  db.run('INSERT INTO counts(item_id,qty,user_id,note,ts) VALUES(?,?,?,?,?)',[i.id,q,2+(d%2),d===0&&q<i.par?'ejemplo: pedir pronto':'',new Date(now-d*864e5-3600e3*Math.random()*3).toISOString()])});
 save();}
const tok={};const app=express();app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
const auth=role=>(q,r,n)=>{const u=tok[q.headers['x-token']||q.query.t];if(!u||(role&&u.role!==role))return r.status(401).json({error:'No autorizado'});q.u=u;n()};
app.post('/api/login',(q,r)=>{const u=all('SELECT id,name,role FROM users WHERE pin=?',[String(q.body.pin||'')])[0];if(!u)return r.status(401).json({error:'PIN incorrecto'});const t=crypto.randomBytes(16).toString('hex');tok[t]=u;r.json({token:t,user:u})});
const stock=()=>all(`SELECT i.*,c.qty,c.ts,c.note,u.name emp FROM items i LEFT JOIN counts c ON c.id=(SELECT id FROM counts WHERE item_id=i.id ORDER BY ts DESC LIMIT 1) LEFT JOIN users u ON u.id=c.user_id WHERE i.active=1 ORDER BY i.location,i.category,i.name`);
app.get('/api/items',auth(),(q,r)=>r.json(stock()));
app.post('/api/counts',auth(),(q,r)=>{const ts=new Date().toISOString();(q.body.counts||[]).forEach(c=>db.run('INSERT INTO counts(item_id,qty,user_id,note,ts) VALUES(?,?,?,?,?)',[c.item_id,+c.qty,q.u.id,c.note||'',ts]));save();r.json({ok:true})});
app.get('/api/history',auth('dueno'),(q,r)=>r.json(all(`SELECT c.*,i.name item,i.unit,i.cost,u.name emp FROM counts c JOIN items i ON i.id=c.item_id JOIN users u ON u.id=c.user_id ORDER BY c.ts DESC LIMIT 600`)));
app.post('/api/items',auth('dueno'),(q,r)=>{const b=q.body;const v=[b.name,b.category,b.unit,b.location,+b.par||0,+b.cost||0];
 if(b.id)run('UPDATE items SET name=?,category=?,unit=?,location=?,par=?,cost=? WHERE id=?',[...v,b.id]);else run('INSERT INTO items(name,category,unit,location,par,cost) VALUES(?,?,?,?,?,?)',v);r.json({ok:true})});
app.delete('/api/items/:id',auth('dueno'),(q,r)=>{run('UPDATE items SET active=0 WHERE id=?',[q.params.id]);r.json({ok:true})});
const csv=rows=>rows.length?[Object.keys(rows[0]).join(','),...rows.map(o=>Object.values(o).map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n'):'';
app.get('/api/export/:k',auth('dueno'),(q,r)=>{const rows=q.params.k==='historial'?all(`SELECT c.ts fecha,u.name empleado,i.name articulo,i.category categoria,i.location ubicacion,c.qty cantidad,i.unit unidad,c.note nota FROM counts c JOIN items i ON i.id=c.item_id JOIN users u ON u.id=c.user_id ORDER BY c.ts DESC`):stock().map(i=>({articulo:i.name,categoria:i.category,ubicacion:i.location,unidad:i.unit,cantidad:i.qty,par:i.par,costo_unit:i.cost,valor:((i.qty||0)*i.cost).toFixed(2),ultimo_conteo:i.ts,empleado:i.emp,ejemplo:i.ejemplo?'sí':''}));
 r.setHeader('Content-Type','text/csv; charset=utf-8');r.setHeader('Content-Disposition',`attachment; filename=${q.params.k}.csv`);r.send('\ufeff'+csv(rows))});
const P=process.env.PORT||3000;app.listen(P,()=>console.log('Inventario en http://localhost:'+P));
})();
