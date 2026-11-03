import type {ReactNode} from 'react';
export type AdminView='home'|'requests'|'quotes'|'compose'|'customers'|'materials'|'agenda';
export const sections:{id:AdminView;label:string;description:string}[]=[
 {id:'home',label:'Visão geral',description:'Organize os atendimentos do dia.'},
 {id:'requests',label:'Pedidos do site',description:'Receba o pedido, converse e prepare o orçamento.'},
 {id:'quotes',label:'Orçamentos salvos',description:'Acompanhe propostas, baixe o PDF e agende o serviço.'},
 {id:'compose',label:'Montar orçamento',description:'Confira materiais, custos e condições antes de salvar.'},
 {id:'customers',label:'Clientes',description:'Mantenha os contatos organizados para o próximo atendimento.'},
 {id:'materials',label:'Materiais e custos',description:'Seu catálogo de materiais e valores internos.'},
 {id:'agenda',label:'Agenda de serviços',description:'Organize visitas e serviços sem sobrepor horários.'}
];
export function AdminIcon({name}:{name:AdminView|'exit'|'external'|'plus'|'refresh'}){
 const paths:Record<string,ReactNode>={home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,requests:<><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h6"/></>,quotes:<><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></>,compose:<><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/></>,customers:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></>,materials:<><path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/></>,agenda:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></>,exit:<><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4"/></>,external:<><path d="M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7"/></>,plus:<path d="M12 4v16M4 12h16"/>,refresh:<><path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/></>};
 return <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const dayKey=(value:string|Date)=>new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
