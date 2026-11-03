import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import MaterialsPanel from "./MaterialsPanel";
import QuotesPanel from "./QuotesPanel";
import type { Material, NewMaterial } from "./MaterialsPanel";
import {api,jsonBody} from "./api";
import RequestsPanel from './RequestsPanel';
import AdminOverview from './AdminOverview';
import {AdminIcon,sections} from './navigation';
import type {AdminView} from './navigation';
import AgendaPanel from './AgendaPanel';
import type {RequestDraft,ScheduleDraft} from './workflowTypes';

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [view,setView]=useState<AdminView>('home');
  const [showPassword,setShowPassword]=useState(false);
  function navigate(next:AdminView){setView(next);window.scrollTo({top:0,behavior:'smooth'});}
  const current=sections.find(section=>section.id===view)!;
  const [incoming,setIncoming]=useState<RequestDraft>();
  const [schedule,setSchedule]=useState<ScheduleDraft>();
  function prepareQuote(draft:RequestDraft){setIncoming(draft);navigate('compose');}
  function prepareSchedule(draft:ScheduleDraft){setSchedule(draft);navigate('agenda');}

  async function refresh() {
    setMaterials((await api<{materials:Material[]}>("/api/admin/materials")).materials);
  }

  useEffect(() => {
    const expired=()=>{setLoggedIn(false);setMaterials([]);setIncoming(undefined);setSchedule(undefined);setView('home');setShowPassword(false);setError("Sua sessão expirou. Entre novamente.");};
    window.addEventListener("airsul:session-expired",expired);
    fetch("/api/admin/me").then(async response => {
      if (response.ok) { setLoggedIn(true); await refresh(); }
      else if(response.status!==401) setError("Servidor administrativo indisponível. Tente novamente em instantes.");
    }).catch(() => setError("Servidor administrativo indisponível.")).finally(()=>setChecking(false));
    return ()=>window.removeEventListener("airsul:session-expired",expired);
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Não foi possível entrar. Verifique suas credenciais.");
      setPassword("");
      setLoggedIn(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMaterial(material: NewMaterial,id?:string) {
    const result=await api<{material:Material}>("/api/admin/materials"+(id?"/"+id:""),jsonBody(id?"PUT":"POST",material));
    setMaterials(previous=>[...previous.filter(m=>m.id!==result.material.id),result.material].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")));
  }

  async function logout() {
    if(busy)return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", headers: {"Content-Type":"application/json"}, body: "{}" });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
      setLoggedIn(false); setMaterials([]);setIncoming(undefined);setSchedule(undefined);setView('home');setShowPassword(false); setError("");
    } catch (err) {setError(err instanceof Error ? err.message : "Falha ao sair.");} finally {setBusy(false);}
  }

  return <main className={'admin-page admin-workspace'+(loggedIn&&!checking?' is-authenticated':'')}>
    {checking?<section className="panel admin-login"><p role="status">Verificando acesso...</p></section>:loggedIn?<div className="admin-layout">
      <aside className="admin-sidebar"><div className="admin-wordmark">AirSul<small>ADMINISTRAÇÃO</small></div><nav aria-label="Seções do painel">{sections.filter(section=>section.id!=='compose').map(section=><button key={section.id} type="button" aria-current={view===section.id||(section.id==='quotes'&&view==='compose')?'page':undefined} onClick={()=>navigate(section.id)}><AdminIcon name={section.id}/>{section.id==='home'?'Início':section.id==='requests'?'Pedidos':section.id==='quotes'?'Orçamentos':section.id==='materials'?'Materiais':section.label==='Agenda de serviços'?'Agenda':section.label}</button>)}</nav><div className="sidebar-bottom"><a href="https://airsul-orcamentos.onrender.com" target="_blank" rel="noopener noreferrer"><AdminIcon name="external"/>Ver site público</a><button type="button" disabled={busy} onClick={logout}><AdminIcon name="exit"/>{busy?'Saindo...':'Sair'}</button></div></aside>
      <div className="admin-main"><header className="admin-page-heading"><div><h1>{current.label}</h1><p>{current.description}</p></div>{view!=='compose'&&<button type="button" className="admin-create" onClick={()=>navigate('compose')}><AdminIcon name="plus"/>Montar orçamento</button>}</header>
      {error&&<p className="error" role="alert">{error}</p>}
      <AdminOverview active={view==='home'} onNavigate={navigate}/>
      <div hidden={view!=='requests'}><RequestsPanel onQuote={prepareQuote} onSchedule={prepareSchedule}/></div>
      <div hidden={view!=='materials'}><MaterialsPanel materials={materials} onSave={saveMaterial}/></div>
      <QuotesPanel materials={materials} incoming={incoming} onSchedule={prepareSchedule} view={view==='customers'||view==='compose'||view==='quotes'?view:'hidden'} onNavigate={navigate}/>
      <div hidden={view!=='agenda'}><AgendaPanel draft={schedule}/></div>
      </div>
    </div>:<div className="admin-login-wrap"><div className="admin-wordmark">AirSul<small>ADMINISTRAÇÃO</small></div><section className="panel admin-login"><h1>Bem-vindo de volta</h1><p className="muted">Entre para organizar seus atendimentos.</p><form onSubmit={login}><label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label><label>Senha<input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label><button type="button" className="password-toggle" aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?'Ocultar senha':'Mostrar senha'}</button>{error&&<p className="error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'Entrando...':'Entrar no painel'}</button></form><a className="login-site" href="https://airsul-orcamentos.onrender.com">Voltar ao site da AirSul</a></section></div>}
  </main>;
}
