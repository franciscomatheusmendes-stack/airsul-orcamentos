import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import MaterialsPanel from "./MaterialsPanel";
import QuotesPanel from "./QuotesPanel";
import type { Material, NewMaterial } from "./MaterialsPanel";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch("/api/admin/materials");
    if (!response.ok) throw new Error("Não foi possível carregar os materiais.");
    setMaterials((await response.json()).materials);
  }

  useEffect(() => {
    fetch("/api/admin/me").then(async response => {
      if (response.ok) { setLoggedIn(true); await refresh(); }
    }).catch(() => setError("Servidor administrativo indisponível."));
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

  async function createMaterial(material: NewMaterial) {
    const response = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material)
    });
    if (!response.ok) throw new Error("Não foi possível cadastrar o material.");
    await refresh();
  }

  async function logout() {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", headers: {"Content-Type":"application/json"}, body: "{}" });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
      setLoggedIn(false); setMaterials([]); setError("");
    } catch (err) {setError(err instanceof Error ? err.message : "Falha ao sair.");}
  }

  return <main className="admin-page">
    <header className="header">
      <div className="brand">AirSul <small>ADMINISTRAÇÃO</small></div>
      <a className="contact" href="https://airsul-orcamentos.onrender.com">Voltar ao site</a>
    </header>
    {loggedIn ? <>
      <section className="panel"><button onClick={logout}>Sair</button></section>
      <MaterialsPanel materials={materials} onCreate={createMaterial} />
      <QuotesPanel materials={materials} />
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
