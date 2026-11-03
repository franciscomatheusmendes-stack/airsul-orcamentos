import type pg from 'pg';
import {isId,text} from './validation.js';
export type QuoteLine={materialId:string;quantity:number;suppliedBy:'airsul'|'client'};
export type PricingInput={lines:QuoteLine[];laborCents:number;travelCents:number;overheadCents:number;marginPercent:number;supplyMode:'airsul'|'client'|'partial';capacityBtu:number;lineLengthM:number;notes:string;validityDays:number;executionDeadline:string;paymentTerms:string;serviceDescription:string;requestId:string|null};
export class InputError extends Error{}
const cents=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=100000000;
export function parsePricing(b:any,details=true):PricingInput{
 if(!b||!Array.isArray(b.lines)||b.lines.length>100||!b.lines.every((l:any)=>l&&isId(l.materialId)&&typeof l.quantity==='number'&&Number.isFinite(l.quantity)&&l.quantity>0&&l.quantity<=10000&&Math.abs(l.quantity*1000-Math.round(l.quantity*1000))<1e-6&&['airsul','client'].includes(l.suppliedBy))||![b.laborCents,b.travelCents,b.overheadCents].every(cents)||typeof b.marginPercent!=='number'||!Number.isFinite(b.marginPercent)||b.marginPercent<0||b.marginPercent>90||!['airsul','client','partial'].includes(b.supplyMode))throw new InputError('Confira os materiais, custos e a margem (0 a 90%).');
 if(b.supplyMode!=='partial'&&b.lines.some((l:QuoteLine)=>l.suppliedBy!==b.supplyMode))throw new InputError('Confira quem fornece os materiais.');
 const capacityBtu=details?b.capacityBtu:(b.capacityBtu||12000),lineLengthM=details?b.lineLengthM:(b.lineLengthM??0);
 const validityDays=b.validityDays??15,executionDeadline=b.executionDeadline??'',paymentTerms=b.paymentTerms??'',notes=b.notes??'',serviceDescription=b.serviceDescription??'';
 if(!Number.isInteger(capacityBtu)||capacityBtu<1000||capacityBtu>200000||typeof lineLengthM!=='number'||!Number.isFinite(lineLengthM)||lineLengthM<0||lineLengthM>1000||!text(notes,2000)||!Number.isInteger(validityDays)||validityDays<1||validityDays>90||!text(executionDeadline,300)||!text(paymentTerms,500)||!text(serviceDescription,2000)||(b.requestId!=null&&!isId(b.requestId)))throw new InputError('Confira capacidade, distância, validade e condições comerciais.');
 return {lines:b.lines.map((l:QuoteLine)=>({materialId:l.materialId,quantity:l.quantity,suppliedBy:l.suppliedBy})),laborCents:b.laborCents,travelCents:b.travelCents,overheadCents:b.overheadCents,marginPercent:b.marginPercent,supplyMode:b.supplyMode,capacityBtu,lineLengthM,notes,validityDays,executionDeadline,paymentTerms,serviceDescription,requestId:b.requestId??null};
}
export async function priceQuote(pool:pg.Pool|pg.PoolClient,input:PricingInput){
 const ids=[...new Set(input.lines.map(l=>l.materialId))];
 const materials=(await pool.query('SELECT id,name,unit,unit_cost FROM materials WHERE active=true AND id=ANY($1::uuid[])',[ids])).rows;
 if(materials.length!==ids.length)throw new InputError('Existe material indisponível. Confira o catálogo antes de salvar.');
 const byId=new Map(materials.map(m=>[m.id,m]));
 const items=input.lines.map(l=>{const m=byId.get(l.materialId)!;const unitCostCents=l.suppliedBy==='client'?0:Math.round(Number(m.unit_cost)*100);return {...l,name:m.name,unit:m.unit,unitCostCents,costCents:Math.round(l.quantity*unitCostCents)};});
 const materialCostCents=items.reduce((s,i)=>s+i.costCents,0),totalCostCents=materialCostCents+input.laborCents+input.travelCents+input.overheadCents;
 const proposedPriceCents=Math.round(totalCostCents/(1-input.marginPercent/100));
 if(!Number.isSafeInteger(proposedPriceCents)||proposedPriceCents>999999999999)throw new InputError('O valor total ultrapassa o limite do orçamento.');
 return {items,materialCostCents,laborCents:input.laborCents,travelCents:input.travelCents,overheadCents:input.overheadCents,totalCostCents,proposedPriceCents,grossProfitCents:proposedPriceCents-totalCostCents};
}
