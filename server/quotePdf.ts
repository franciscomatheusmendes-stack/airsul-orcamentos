import PDFDocument from 'pdfkit';
import type {Response} from 'express';
export function quotePdf(res:Response,q:any,items:any[]){
 const doc=new PDFDocument({size:'A4',margin:48,bufferPages:true,info:{Title:'Proposta AirSul Climatização'}});
 doc.on('error',()=>{if(!res.headersSent)res.status(503).end();else res.end();});
 res.type('application/pdf').set('Content-Disposition','attachment; filename="airsul-'+q.id+'.pdf"');doc.pipe(res);
 doc.rect(0,0,doc.page.width,120).fill('#092338');
 doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(27).text('AirSul',48,32);
 doc.font('Helvetica').fontSize(11).text('CLIMATIZAÇÃO',49,68).text('Capão da Canoa e Litoral Norte/RS',49,88);
 doc.fillColor('#16384c').font('Helvetica-Bold').fontSize(21).text('Proposta de instalação',48,148);
 const date=new Date(q.created_at);const until=new Date(date);until.setUTCDate(until.getUTCDate()+q.validity_days);
 const format=(d:Date)=>d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 doc.font('Helvetica').fontSize(10).fillColor('#567184').text('ORC-'+q.id.slice(0,8).toUpperCase()+'  |  Emissão: '+format(date)+'  |  Validade: '+format(until));
 doc.moveDown().font('Helvetica-Bold').fillColor('#16384c').text('Cliente: '+q.customer_name);
 if(q.customer_phone)doc.font('Helvetica').text('Contato: '+q.customer_phone);
 doc.font('Helvetica').text('Capacidade: '+Number(q.capacity_btu).toLocaleString('pt-BR')+' BTU/h  |  Distância: '+Number(q.line_length_m).toLocaleString('pt-BR')+' m');
 doc.text('Materiais: '+({airsul:'fornecidos pela AirSul',client:'fornecidos pelo cliente',partial:'fornecimento parcial'}[q.supply_mode as string]||q.supply_mode));
 doc.moveDown(1.3).font('Helvetica-Bold').fontSize(12).text('Escopo e materiais previstos');
 doc.moveDown(0.5).font('Helvetica').fontSize(10);
 if(!items.length)doc.text('Serviço de instalação conforme avaliação e condições acordadas.');
 items.forEach(i=>{doc.text(Number(i.quantity).toLocaleString('pt-BR')+' x '+i.description,{paragraphGap:7});});
 doc.moveDown().font('Helvetica-Bold').fontSize(19).fillColor('#0875be').text('Valor proposto: '+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(q.proposed_price)));
 doc.moveDown().fontSize(12).fillColor('#16384c').text('Condições comerciais');
 doc.font('Helvetica').fontSize(10).moveDown(0.5).text('Prazo de execução: '+(q.execution_deadline||'A combinar após avaliação e disponibilidade.'),{paragraphGap:9});
 doc.text('Pagamento: '+(q.payment_terms||'A combinar com a AirSul.'),{paragraphGap:9});
 doc.text('Proposta válida por '+q.validity_days+' dias a partir da emissão. A execução depende da avaliação do local, compatibilidade dos materiais e confirmação de agenda. Este PDF não confirma contratação ou agendamento.',{paragraphGap:9});
 doc.moveDown().fillColor('#567184').fontSize(9).text('AirSul Climatização | WhatsApp (51) 99819-3796');
 const range=doc.bufferedPageRange();for(let i=range.start;i<range.start+range.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#718594').text('AirSul Climatização  |  Página '+(i+1)+' de '+range.count,48,doc.page.height-30,{lineBreak:false});}
 doc.end();
}
