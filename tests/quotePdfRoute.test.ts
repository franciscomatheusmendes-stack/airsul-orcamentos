import {expect,it} from 'vitest';
import express from 'express';
import request from 'supertest';
import type pg from 'pg';
import {quoteRoutes} from '../server/quotes';
it('protege o PDF por sessão e usa apenas os itens da revisão atual',async()=>{
 const id='00000000-0000-4000-8000-000000000001';let authenticated=true;const calls:{sql:string;values:unknown[]}[]=[];
 const pool={query:async(sql:string,values:unknown[]=[])=>{calls.push({sql,values});if(sql.includes('FROM admin_sessions'))return {rows:authenticated?[{id:'admin',email:'francisco.matheusmendes@gmail.com'}]:[]};if(sql.includes('FROM quotes q JOIN customers'))return {rows:[{id,version:7,items_revision:3,created_at:'2026-11-03T12:00:00Z',customer_name:'Cliente teste',customer_phone:'51999990000',customer_email:'cliente@example.test',capacity_btu:12000,line_length_m:3,supply_mode:'airsul',proposed_price:'850.00',validity_days:15,pricing_input:{serviceDescription:'Instalação e testes.'}}]};if(sql.includes('FROM quote_items'))return {rows:[{description:'Cobre (m; AirSul)',quantity:3}]};throw Error('Consulta inesperada');}} as unknown as pg.Pool;
 const app=express();app.use('/quotes',quoteRoutes(pool));
 expect((await request(app).get('/quotes/'+id+'/pdf')).status).toBe(401);
 const response=await request(app).get('/quotes/'+id+'/pdf').set('Cookie','airsul_session='+'a'.repeat(64));
 expect(response.status).toBe(200);expect(response.headers['x-quote-version']).toBe('7');expect(response.headers['content-type']).toContain('application/pdf');expect(response.body.subarray(0,5).toString()).toBe('%PDF-');
 const items=calls.find(call=>call.sql.includes('FROM quote_items'));expect(items?.sql).toContain('revision=$2');expect(items?.values).toEqual([id,3]);
 authenticated=false;expect((await request(app).get('/quotes/'+id+'/pdf').set('Cookie','airsul_session='+'a'.repeat(64))).status).toBe(401);
});
