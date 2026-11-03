import {Router} from 'express';
import type pg from 'pg';
import {requireSession} from './session.js';
import {isId,text} from './validation.js';
import {parsePricing,priceQuote,InputError} from './quoteEngine.js';
import {quotePdf} from './quotePdf.js';
const statuses=['draft','pending_review','approved','sent','accepted','rejected'];
export function quoteRoutes(pool:pg.Pool){
 const router=Router();router.use(requireSession(pool));
 router.get('/',async(_req,res)=>{try{res.json({quotes:(await pool.query('SELECT q.id,q.customer_id,q.status,q.proposed_price,q.created_at,q.version,c.name AS customer_name,c.phone AS customer_phone FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id ORDER BY q.created_at DESC LIMIT 200')).rows});}catch{res.status(503).json({error:'Não foi possível carregar os orçamentos.'});}});
 router.get('/:id/pdf',async(req,res)=>{
  if(!isId(req.params.id)){res.sendStatus(400);return;}
  try{const q=(await pool.query('SELECT q.*,c.name AS customer_name,c.phone AS customer_phone,c.email AS customer_email FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=$1',[req.params.id])).rows[0];if(!q){res.status(404).json({error:'Orçamento não encontrado.'});return;}const items=(await pool.query('SELECT description,quantity FROM quote_items WHERE quote_id=$1 AND revision=$2 ORDER BY id',[q.id,q.items_revision])).rows;quotePdf(res,q,items);}catch{if(!res.headersSent)res.status(503).json({error:'Não foi possível gerar o PDF.'});else res.end();}
 });
 router.get('/:id',async(req,res)=>{if(!isId(req.params.id)){res.sendStatus(400);return;}try{const q=(await pool.query('SELECT id,customer_id,status,pricing_input,version FROM quotes WHERE id=$1',[req.params.id])).rows[0];res.status(q?200:404).json(q?{quote:q}:{error:'Orçamento não encontrado.'});}catch{res.status(503).json({error:'Não foi possível abrir o orçamento.'});}});
 router.post('/:id/duplicate',async(req,res)=>{
  if(!isId(req.params.id)||!Number.isInteger(req.body?.version)){res.sendStatus(400);return;}
  let client:pg.PoolClient|undefined;try{client=await pool.connect();await client.query('BEGIN');
   const original=(await client.query('SELECT * FROM quotes WHERE id=$1 FOR SHARE',[req.params.id])).rows[0];
   if(!original||original.version!==req.body.version){await client.query('ROLLBACK');res.status(409).json({error:'O orçamento foi alterado. Atualize a lista e tente novamente.'});return;}
   const input=original.pricing_input?{...original.pricing_input,requestId:null}:null;
   const q=(await client.query("INSERT INTO quotes(customer_id,capacity_btu,line_length_m,supply_mode,status,internal_cost,proposed_price,notes,pricing_input,validity_days,execution_deadline,payment_terms) SELECT customer_id,capacity_btu,line_length_m,supply_mode,'draft',internal_cost,proposed_price,notes,$2,validity_days,execution_deadline,payment_terms FROM quotes WHERE id=$1 RETURNING id",[req.params.id,input?JSON.stringify(input):null])).rows[0];
   await client.query('INSERT INTO quote_items(quote_id,material_id,description,quantity,unit_cost,revision) SELECT $1,material_id,description,quantity,unit_cost,1 FROM quote_items WHERE quote_id=$2 AND revision=$3',[q.id,req.params.id,original.items_revision]);await client.query("INSERT INTO quote_events(quote_id,action,before_snapshot) VALUES($1,'duplicated',$2)",[q.id,JSON.stringify({sourceQuoteId:req.params.id})]);await client.query('COMMIT');res.status(201).json({quoteId:q.id});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});res.status(503).json({error:'Não foi possível duplicar.'});}finally{client?.release();}
 });
 router.put('/:id/status',async(req,res)=>{
  if(!isId(req.params.id)||!statuses.includes(req.body?.status)||!Number.isInteger(req.body?.version)){res.status(400).json({error:'Situação inválida.'});return;}
  let client:pg.PoolClient|undefined;try{client=await pool.connect();await client.query('BEGIN');const before=(await client.query('SELECT * FROM quotes WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!before||before.version!==req.body.version){await client.query('ROLLBACK');res.status(409).json({error:'O orçamento foi alterado. Atualize a lista.'});return;}
   await client.query('UPDATE quotes SET status=$1,version=version+1,updated_at=now() WHERE id=$2',[req.body.status,req.params.id]);await client.query("INSERT INTO quote_events(quote_id,action,before_snapshot) VALUES($1,'status_changed',$2)",[req.params.id,JSON.stringify({status:before.status,version:before.version,newStatus:req.body.status})]);await client.query('COMMIT');res.json({updated:true});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});res.status(503).json({error:'Não foi possível atualizar a situação.'});}finally{client?.release();}
 });
 router.post('/preview',async(req,res)=>{try{const input=parsePricing(req.body,false);res.json(await priceQuote(pool,input));}catch(e){res.status(e instanceof InputError?400:503).json({error:e instanceof InputError?e.message:'Não foi possível calcular.'});}});
 const save:import('express').RequestHandler=async(req,res)=>{
  const id=req.params.id;let client:pg.PoolClient|undefined;
  try{
   if((id&&!isId(id))||!isId(req.body?.customerId))throw new InputError('Selecione um cliente válido.');
   const input=parsePricing(req.body);client=await pool.connect();await client.query('BEGIN');
   let before:any=null;if(id){before=(await client.query('SELECT * FROM quotes WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!before||before.version!==req.body.version){await client.query('ROLLBACK');res.status(409).json({error:'Este orçamento mudou em outra tela. Abra novamente para editar.'});return;}if(!['draft','pending_review'].includes(before.status)){await client.query('ROLLBACK');res.status(409).json({error:'Para preservar o histórico, duplique este orçamento antes de alterar.'});return;}}
   if(!(await client.query('SELECT id FROM customers WHERE id=$1',[req.body.customerId])).rowCount)throw new InputError('Cliente não encontrado.');
   if(id){const linked=(await client.query('SELECT customer_id FROM service_requests WHERE quote_id=$1 LIMIT 1',[id])).rows[0];if(linked&&linked.customer_id!==req.body.customerId)throw new InputError('Este orçamento pertence a um pedido do site. Duplique para usar com outro cliente.');}
   if(input.requestId){const r=(await client.query('SELECT customer_id FROM service_requests WHERE id=$1 FOR UPDATE',[input.requestId])).rows[0];if(!r||r.customer_id!==req.body.customerId)throw new InputError('Prepare o cliente a partir da solicitação antes de salvar.');}
   const summary=await priceQuote(client,input);
   const values=[req.body.customerId,input.capacityBtu,input.lineLengthM,input.supplyMode,(summary.totalCostCents/100).toFixed(2),(summary.proposedPriceCents/100).toFixed(2),input.notes,JSON.stringify(input),input.validityDays,input.executionDeadline,input.paymentTerms];
   let q:any;
   if(id){const items=(await client.query('SELECT material_id,description,quantity,unit_cost FROM quote_items WHERE quote_id=$1 AND revision=$2',[id,before.items_revision])).rows;await client.query("INSERT INTO quote_events(quote_id,action,before_snapshot) VALUES($1,'edited',$2)",[id,JSON.stringify({...before,items})]);q=(await client.query('UPDATE quotes SET customer_id=$1,capacity_btu=$2,line_length_m=$3,supply_mode=$4,internal_cost=$5,proposed_price=$6,notes=$7,pricing_input=$8,validity_days=$9,execution_deadline=$10,payment_terms=$11,version=version+1,items_revision=items_revision+1,updated_at=now() WHERE id=$12 RETURNING id,version,items_revision',[...values,id])).rows[0];}
   else{q=(await client.query("INSERT INTO quotes(customer_id,capacity_btu,line_length_m,supply_mode,status,internal_cost,proposed_price,notes,pricing_input,validity_days,execution_deadline,payment_terms) VALUES($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11) RETURNING id,version,items_revision",values)).rows[0];await client.query("INSERT INTO quote_events(quote_id,action) VALUES($1,'created')",[q.id]);}
   for(const item of summary.items)await client.query('INSERT INTO quote_items(quote_id,material_id,description,quantity,unit_cost,revision) VALUES($1,$2,$3,$4,$5,$6)',[q.id,item.materialId,item.name+' ('+item.unit+'; '+(item.suppliedBy==='client'?'cliente':'AirSul')+')',item.quantity,(item.unitCostCents/100).toFixed(2),q.items_revision]);
   if(input.requestId)await client.query("UPDATE service_requests SET quote_id=$1,status='quoted',updated_at=now() WHERE id=$2",[q.id,input.requestId]);
   await client.query('COMMIT');res.status(id?200:201).json({quoteId:q.id,version:q.version,...summary});
  }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});res.status(e instanceof InputError?400:503).json({error:e instanceof InputError?e.message:'Não foi possível salvar o orçamento.'});}finally{client?.release();}
 };
 router.post('/',save);router.put('/:id',save);return router;
}
export function templateRoutes(pool:pg.Pool){const router=Router();router.use(requireSession(pool));
 router.get('/',async(_req,res)=>{try{res.json({templates:(await pool.query('SELECT id,name,pricing_input FROM quote_templates ORDER BY name LIMIT 100')).rows});}catch{res.status(503).json({error:'Não foi possível carregar os modelos.'});}});
 router.post('/',async(req,res)=>{try{if(!text(req.body?.name,80,2))throw new InputError('Dê um nome ao modelo.');const input=parsePricing(req.body.input);await priceQuote(pool,input);const template=(await pool.query('INSERT INTO quote_templates(name,pricing_input) VALUES($1,$2) RETURNING id,name',[req.body.name.trim(),JSON.stringify({...input,requestId:null,notes:''})])).rows[0];res.status(201).json({template});}catch(e){res.status(e instanceof InputError?400:503).json({error:e instanceof InputError?e.message:'Não foi possível salvar o modelo.'});}});return router;
}
