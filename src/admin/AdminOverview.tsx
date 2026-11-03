import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {AdminIcon,dayKey} from './navigation';
import type {AdminView} from './navigation';
import {serviceLabels} from './workflowTypes';
type Request={id:string;customer_name:string;service:string;status:string;created_at:string};
type Quote={id:string;status:string};
type Appointment={id:string;customer_name:string;starts_at:string;duration_minutes:number;service_type:string;status:string};
export default function AdminOverview({active,onNavigate}:{active:boolean;onNavigate:(view:AdminView)=>void}){
 const [requests,setRequests]=useState<Request[]|null>(null),[quotes,setQuotes]=useState<Quote[]|null>(null),[appointments,setAppointments]=useState<Appointment[]|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[updated,setUpdated]=useState<Date>();const pending=useRef(false);
 async function refresh(){if(pending.current)return;pending.current=true;setLoading(true);setError('');try{
  const results=await Promise.allSettled([api<{requests:Request[]}>('/api/admin/requests'),api<{quotes:Quote[]}>('/api/admin/quotes'),api<{appointments:Appointment[]}>('/api/admin/appointments')]);
  const [r,q,a]=results;
  setRequests(r.status==='fulfilled'?r.value.requests:null);setQuotes(q.status==='fulfilled'?q.value.quotes:null);setAppointments(a.status==='fulfilled'?a.value.appointments:null);
  if(results.some(result=>result.status==='rejected'))setError('Parte do resumo não pôde ser carregada. Atualize para tentar novamente.');setUpdated(new Date());
 }finally{pending.current=false;setLoading(false);}}
 useEffect(()=>{if(active)void refresh();},[active]);
 const today=dayKey(new Date());const now=Date.now();
 const metrics=[{label:'Novos pedidos',value:requests?.filter(r=>r.status==='new').length,view:'requests',icon:'requests'}, {label:'Para revisar',value:quotes?.filter(q=>['draft','pending_review'].includes(q.status)).length,view:'quotes',icon:'quotes'}, {label:'Serviços hoje',value:appointments?.filter(a=>a.status==='scheduled'&&dayKey(a.starts_at)===today).length,view:'agenda',icon:'agenda'}, {label:'Aguardando resposta',value:quotes?.filter(q=>q.status==='sent').length,view:'quotes',icon:'customers'}] as const;
 const recent=(requests||[]).filter(r=>!['completed','cancelled'].includes(r.status)).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,3);
 const next=(appointments||[]).filter(a=>a.status==='scheduled'&&Date.parse(a.starts_at)+a.duration_minutes*60000>=now).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,3);
 return <section className="admin-overview" hidden={!active} aria-label="Resumo dos atendimentos">
 <div className="overview-metrics">{metrics.map(m=><button type="button" className="metric-card" key={m.label} onClick={()=>onNavigate(m.view)}><AdminIcon name={m.icon}/><span>{m.label}<strong>{m.value??'—'}</strong></span></button>)}</div>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="overview-columns"><section className="panel overview-panel"><h2>Pedidos recentes</h2>{requests===null?<p className="muted">{loading?'Carregando pedidos...':'Pedidos indisponíveis.'}</p>:recent.length?recent.map(r=><div className="overview-row" key={r.id}><div><strong>{r.customer_name}</strong><small>{serviceLabels[r.service]}</small></div>{r.status==='new'&&<span className="status-tag new">Novo</span>}<button type="button" className="secondary compact" onClick={()=>onNavigate('requests')}>Ver pedidos</button></div>):<p className="empty-state">Nenhum pedido em aberto.</p>}</section>
 <section className="panel overview-panel"><h2>Próximos serviços</h2>{appointments===null?<p className="muted">{loading?'Carregando agenda...':'Agenda indisponível.'}</p>:next.length?next.map(a=><div className="overview-row" key={a.id}><time dateTime={a.starts_at}><strong>{dayKey(a.starts_at)===today?'Hoje':new Date(a.starts_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'})}</strong><small>{new Date(a.starts_at).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})}</small></time><div><strong>{a.customer_name}</strong><small>{serviceLabels[a.service_type]}</small></div><button type="button" className="secondary compact" onClick={()=>onNavigate('agenda')}>Ver agenda</button></div>):<p className="empty-state">Nenhum próximo serviço agendado.</p>}</section></div>
 <div className="overview-footer"><p className="muted" role="status">{loading?'Atualizando resumo...':updated?'Consultado às '+updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}):'Carregando resumo...'}</p><button type="button" className="secondary compact" disabled={loading} onClick={()=>void refresh()}><AdminIcon name="refresh"/>Atualizar resumo</button></div><p className="overview-note">Resumo dos registros recentes: até 200 pedidos, 200 orçamentos e 300 agendamentos. Horários de Brasília.</p>
 </section>;
}
