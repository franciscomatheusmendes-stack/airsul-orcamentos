import {Router} from 'express';
import {createHash} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import type pg from 'pg';
import {requireSession} from './session.js';
import {isId,text,phone,services} from './validation.js';
const reference=(id:string)=>'AS-'+id.replace(/-/g,'').slice(0,10).toUpperCase();

export function publicRequestRoutes(pool:pg.Pool){
 const router=Router();
 router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.use((req,res,next)=>{
  const allowed=[process.env.PUBLIC_ORIGIN||'https://airsul-orcamentos.onrender.com',process.env.ADMIN_ORIGIN].filter(Boolean);
  const origin=req.get('origin');
  if(!origin||!allowed.includes(origin)){res.sendStatus(403);return;}
  res.set('Access-Control-Allow-Origin',origin).vary('Origin');
  if(req.method==='OPTIONS'){res.set('Access-Control-Allow-Methods','POST, OPTIONS').set('Access-Control-Allow-Headers','Content-Type');res.sendStatus(204);return;}
  if(!req.is('application/json')){res.sendStatus(415);return;}next();
 });
 router.use(rateLimit({windowMs:3600000,limit:15,legacyHeaders:false,standardHeaders:'draft-7'}));
 router.post('/',async(req,res)=>{
  const b=req.body||{};
  if(!isId(b.id)||!text(b.name,120,2)||!phone(b.phone)||!text(b.location,200,2)||!services.includes(b.service)||!['yes','no','unknown'].includes(b.kit)||!text(b.notes,1000)||
   (b.capacity!==null&&(!Number.isInteger(b.capacity)||b.capacity<1000||b.capacity>200000))||
   (b.meters!==null&&(typeof b.meters!=='number'||!Number.isFinite(b.meters)||b.meters<0.5||b.meters>100))){res.status(400).json({error:'Confira seu nome, telefone e cidade. Os detalhes do aparelho podem ficar como “Não sei”.'});return;}
  let estimate=null;
  if(b.estimate!==null&&b.estimate!==undefined){
   const e=b.estimate;
   if(!e||typeof e!=='object'||![e.width,e.length].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=1&&n<=20)||!Number.isInteger(e.people)||e.people<1||e.people>20||!Number.isInteger(e.electronics)||e.electronics<0||e.electronics>20||typeof e.directSun!=='boolean'){res.status(400).json({error:'Confira os dados do ambiente ou continue sem a estimativa.'});return;}
   estimate={width:e.width,length:e.length,people:e.people,electronics:e.electronics,directSun:e.directSun};
  }
  const payload={name:b.name.trim(),phone:b.phone.trim(),location:b.location.trim(),service:b.service,capacity:b.capacity,kit:b.service==='installation'?b.kit:'unknown',meters:b.service==='installation'?b.meters:null,notes:b.notes.trim(),estimate};
  const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  try{
   const result=await pool.query('INSERT INTO service_requests(id,payload_hash,customer_name,phone,location,service,capacity_btu,has_kit,line_length_m,notes,estimate) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING RETURNING id',[b.id,hash,payload.name,payload.phone,payload.location,payload.service,payload.capacity,payload.kit,payload.meters,payload.notes,estimate?JSON.stringify(estimate):null]);
   if(!result.rowCount){const existing=await pool.query('SELECT payload_hash FROM service_requests WHERE id=$1',[b.id]);if(existing.rows[0]?.payload_hash!==hash){res.status(409).json({error:'Seu pedido já foi registrado. Inicie uma nova solicitação para alterar os dados.'});return;}}
   res.status(result.rowCount?201:200).json({received:true,reference:reference(b.id)});
  }catch{res.status(503).json({error:'Não conseguimos registrar agora. Você ainda pode falar com a AirSul pelo WhatsApp.'});}
 });return router;
}

export function requestAdminRoutes(pool:pg.Pool){
 const router=Router();router.use(requireSession(pool));
 router.get('/',async(_req,res)=>{try{const result=await pool.query('SELECT id,customer_name,phone,location,service,capacity_btu,has_kit,line_length_m,notes,estimate,status,customer_id,quote_id,created_at FROM service_requests ORDER BY created_at DESC LIMIT 200');res.json({requests:result.rows.map(r=>({...r,reference:reference(r.id)}))});}catch{res.status(503).json({error:'Não foi possível carregar as solicitações.'});}});
 router.put('/:id/status',async(req,res)=>{
  if(!isId(req.params.id)||!['new','contacted','quoted','scheduled','completed','cancelled'].includes(req.body?.status)){res.status(400).json({error:'Situação inválida.'});return;}
  try{const r=await pool.query('UPDATE service_requests SET status=$1,updated_at=now() WHERE id=$2 RETURNING id',[req.body.status,req.params.id]);res.status(r.rowCount?200:404).json(r.rowCount?{updated:true}:{error:'Solicitação não encontrada.'});}catch{res.status(503).json({error:'Não foi possível atualizar.'});}
 });
 router.post('/:id/customer',async(req,res)=>{
  if(!isId(req.params.id)){res.sendStatus(400);return;}
  let client:pg.PoolClient|undefined;try{client=await pool.connect();
   await client.query('BEGIN');const request=(await client.query('SELECT * FROM service_requests WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
   if(!request){await client.query('ROLLBACK');res.status(404).json({error:'Solicitação não encontrada.'});return;}
   let customer=request.customer_id?(await client.query('SELECT id,name,phone,email FROM customers WHERE id=$1',[request.customer_id])).rows[0]:null;
   if(!customer)customer=(await client.query("SELECT id,name,phone,email FROM customers WHERE lower(name)=lower($1) AND regexp_replace(phone,'[^0-9]','','g')=$2 ORDER BY created_at LIMIT 1",[request.customer_name,request.phone.replace(/\D/g,'')])).rows[0];
   if(!customer)customer=(await client.query('INSERT INTO customers(name,phone) VALUES($1,$2) RETURNING id,name,phone,email',[request.customer_name,request.phone])).rows[0];
   await client.query("UPDATE service_requests SET customer_id=$1,status=CASE WHEN status='new' THEN 'contacted' ELSE status END,updated_at=now() WHERE id=$2",[customer.id,request.id]);await client.query('COMMIT');res.json({customer,requestId:request.id,capacity:request.capacity_btu,meters:request.line_length_m,kit:request.has_kit,service:request.service});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});res.status(503).json({error:'Não foi possível preparar o cliente.'});}finally{client?.release();}
 });return router;
}
