import {Router} from 'express';
import type pg from 'pg';
import {requireSession} from './session.js';
import {isId,text} from './validation.js';
export function appointmentRoutes(pool:pg.Pool){
 const router=Router();router.use(requireSession(pool));
 router.get('/',async(_req,res)=>{try{res.json({appointments:(await pool.query('SELECT a.*,c.name AS customer_name,c.phone AS customer_phone FROM appointments a JOIN customers c ON c.id=a.customer_id ORDER BY a.starts_at DESC LIMIT 300')).rows});}catch{res.status(503).json({error:'Não foi possível carregar a agenda.'});}});
 router.post('/',async(req,res)=>{
  const b=req.body||{};const start=typeof b.startsAt==='string'?new Date(b.startsAt):new Date(NaN);
  if(!isId(b.customerId)||!Number.isFinite(start.getTime())||!Number.isInteger(b.durationMinutes)||b.durationMinutes<15||b.durationMinutes>480||!['visit','installation','cleaning','maintenance','removal'].includes(b.serviceType)||!text(b.notes??'',1000)||(b.quoteId!=null&&!isId(b.quoteId))||(b.requestId!=null&&!isId(b.requestId))){res.status(400).json({error:'Confira cliente, data, duração e tipo de serviço.'});return;}
  let client:pg.PoolClient|undefined;try{client=await pool.connect();await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(82345322)');
   if(!(await client.query('SELECT id FROM customers WHERE id=$1',[b.customerId])).rowCount){await client.query('ROLLBACK');res.status(400).json({error:'Cliente não encontrado.'});return;}
   if(b.quoteId&&!(await client.query('SELECT id FROM quotes WHERE id=$1 AND customer_id=$2',[b.quoteId,b.customerId])).rowCount){await client.query('ROLLBACK');res.status(400).json({error:'O orçamento não pertence ao cliente.'});return;}
   let requestId=b.requestId??null;
   if(!requestId&&b.quoteId)requestId=(await client.query('SELECT id FROM service_requests WHERE quote_id=$1 AND customer_id=$2 ORDER BY created_at LIMIT 1',[b.quoteId,b.customerId])).rows[0]?.id??null;
   if(requestId&&!(await client.query('SELECT id FROM service_requests WHERE id=$1 AND customer_id=$2',[requestId,b.customerId])).rowCount){await client.query('ROLLBACK');res.status(400).json({error:'A solicitação não pertence ao cliente.'});return;}
   const overlap=await client.query("SELECT id FROM appointments WHERE status='scheduled' AND starts_at < $1::timestamptz + $2 * interval '1 minute' AND starts_at + duration_minutes * interval '1 minute' > $1::timestamptz LIMIT 1",[start.toISOString(),b.durationMinutes]);
   if(overlap.rowCount){await client.query('ROLLBACK');res.status(409).json({error:'Já existe um serviço nesse horário. Escolha outro horário ou cancele o anterior.'});return;}
   const appointment=(await client.query('INSERT INTO appointments(customer_id,quote_id,request_id,starts_at,duration_minutes,service_type,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[b.customerId,b.quoteId??null,requestId,start.toISOString(),b.durationMinutes,b.serviceType,b.notes??''])).rows[0];
   if(requestId)await client.query("UPDATE service_requests SET status='scheduled',updated_at=now() WHERE id=$1",[requestId]);await client.query('COMMIT');res.status(201).json({appointment});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});res.status(503).json({error:'Não foi possível agendar.'});}finally{client?.release();}
 });
 router.put('/:id/status',async(req,res)=>{
  if(!isId(req.params.id)||!['completed','cancelled'].includes(req.body?.status)){res.status(400).json({error:'Situação inválida.'});return;}
  let client:pg.PoolClient|undefined;try{client=await pool.connect();await client.query('BEGIN');const r=await client.query("UPDATE appointments SET status=$1 WHERE id=$2 AND status='scheduled' RETURNING id,request_id",[req.body.status,req.params.id]);
   if(!r.rowCount){await client.query('ROLLBACK');res.status(409).json({error:'Este agendamento já foi encerrado. Atualize a agenda.'});return;}
   if(r.rows[0].request_id)await client.query("UPDATE service_requests SET status=$1,updated_at=now() WHERE id=$2 AND status='scheduled' AND NOT EXISTS(SELECT 1 FROM appointments WHERE request_id=$2 AND status='scheduled')",[req.body.status==='completed'?'completed':'contacted',r.rows[0].request_id]);
   await client.query('COMMIT');res.json({updated:true});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});res.status(503).json({error:'Não foi possível atualizar a agenda.'});}finally{client?.release();}
 });
 return router;
}
