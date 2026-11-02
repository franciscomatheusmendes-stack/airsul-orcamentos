import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import MaterialsPanel from "./MaterialsPanel";
import QuotesPanel from "./QuotesPanel";
import type { Material, NewMaterial } from "./MaterialsPanel";
import {api,jsonBody} from "./api";
import RequestsPanel from './RequestsPanel';
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
  const [incoming,setIncoming]=useState<RequestDraft>();
  const [schedule,setSchedule]=useState<ScheduleDraft>();
  function prepareQuote(draft:RequestDraft){setIncoming(draft);document.getElementById('novo-orcamento')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function prepareSchedule(draft:ScheduleDraft){setSchedule(draft);document.getElementById('agenda')?.scrollIntoView({behavior:'smooth',block:'start'});}

  async function refresh() {
    setMaterials((await api<{materials:Material[]}>("/api/admin/materials")).materials);
  }

  useEffect(() => {
    const expired=()=>{setLoggedIn(false);setMaterials([]);setError("Sua sessão expirou. Entre novamente.");};
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
      setLoggedIn(false); setMaterials([]); setError("");
    } catch (err) {setError(err instanceof Error ? err.message : "Falha ao sair.");} finally {setBusy(false);}
  }

  return <main className="admin-page">
    <header className="header">
      <div className="brand">AirSul <small>ADMINISTRAÇÃO</small></div>
      <a className="contact" href="https://airsul-orcamentos.onrender.com">Voltar ao site</a>
    </header>
    {checking ? <section className="panel"><p role="status">Verificando acesso...</p></section> : loggedIn ? <>
      <section className="panel admin-toolbar"><nav aria-label="Seções do painel"><a href="#solicitacoes">Pedidos do site</a><a href="#agenda">Agenda</a><a href="#materiais">Materiais</a><a href="#clientes">Clientes</a><a href="#novo-orcamento">Novo orçamento</a><a href="#orcamentos">Orçamentos salvos</a></nav><button type="button" className="secondary compact" disabled={busy} onClick={logout}>{busy?"Saindo...":"Sair"}</button></section>
      <RequestsPanel onQuote={prepareQuote} onSchedule={prepareSchedule}/><MaterialsPanel materials={materials} onSave={saveMaterial} />
      <QuotesPanel materials={materials} incoming={incoming} onSchedule={prepareSchedule}/>
      <AgendaPanel draft={schedule}/>
      {error && <p className="error" role="alert">{error}</p>}
    </> : <section className="panel">
      <h2>Acesso administrativo</h2>
      <p className="muted">Acesso restrito à equipe autorizada.</p>
      <form onSubmit={login}>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
      </form>
    </section>}
  </main>;
}
