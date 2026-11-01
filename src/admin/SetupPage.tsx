import { useState } from "react";
import type { FormEvent } from "react";
export default function SetupPage() {
  const [token,setToken]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault();
    if (password !== confirmation) {setMessage("As senhas devem ser iguais.");return;}
    setBusy(true);
    try {
      const response=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
      setMessage(response.ok ? "Conta criada. Você já pode entrar no painel." : "Não foi possível criar a conta. Verifique o código e se a conta já existe.");
      if(response.ok) {setToken("");setPassword("");setConfirmation("");}
    } catch {setMessage("Servidor indisponível.");} finally {setBusy(false);}
  }
  return <main className="admin-page"><section className="panel"><h1>Primeiro acesso AirSul</h1><p>A conta será criada exclusivamente para francisco.matheusmendes@gmail.com.</p><p>Copie ADMIN_SETUP_TOKEN no ambiente do serviço AirSul API no Render. Defina sua senha somente neste formulário seguro.</p><form onSubmit={submit}><label>Código de provisionamento<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} required/></label><label>Nova senha<input type="password" autoComplete="new-password" minLength={14} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Repita a senha<input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required/></label><button disabled={busy}>{busy?"Criando...":"Criar minha conta"}</button></form><p role="status">{message}</p><a href="/admin">Entrar no painel</a></section></main>;
}

