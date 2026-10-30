import { useState } from "react";
import type { FormEvent } from "react";

export type Material = { id: string; name: string; unit: string; unit_cost: string; active: boolean };
export type NewMaterial = { name: string; unit: string; unitCost: number };
type Props = {
  materials: Material[];
  loading?: boolean;
  onCreate: (material: NewMaterial) => Promise<void>;
};

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(value);

/**
 * Componente visual reutilizável.
 * NÃO montar em rota pública até haver sessão de usuário e autorização no backend.
 * Nunca inserir token administrativo neste componente.
 */
export default function MaterialsPanel({ materials, loading = false, onCreate }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("m");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const value = Number(cost.replace(",", "."));
  const valid = name.trim().length >= 2 && Number.isFinite(value) && value >= 0 && value <= 1000000;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError("");
    try {
      await onCreate({name:name.trim(),unit,unitCost:Math.round(value*100)/100});
      setName("");setCost("");
    } catch { setError("Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }

  return <section className="panel" aria-label="Catálogo de materiais">
    <h2>Materiais e custos</h2>
    <p className="muted">Área interna da AirSul. Custos não devem ser mostrados aos clientes.</p>
    <form onSubmit={submit}>
      <label>Material<input value={name} onChange={e=>setName(e.target.value)} maxLength={150} placeholder="Ex.: tubo de cobre 1/4 pol."/></label>
      <label>Unidade<select value={unit} onChange={e=>setUnit(e.target.value)}>
        <option value="m">Metro</option><option value="un">Unidade</option><option value="kg">Quilo</option>
        <option value="l">Litro</option><option value="kit">Kit</option><option value="par">Par</option>
      </select></label>
      <label>Custo unitário (R$)<input inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0,00"/></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" disabled={!valid || busy}>{busy?"Salvando...":"Cadastrar material"}</button>
    </form>
    <h3>Catálogo ({materials.length})</h3>
    {loading ? <p>Carregando...</p> : materials.length === 0 ? <p className="muted">Nenhum material cadastrado.</p> :
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th align="left">Material</th><th align="left">Unidade</th><th align="right">Custo</th></tr></thead>
        <tbody>{materials.map(m=><tr key={m.id}><td>{m.name}</td><td>{m.unit}</td><td align="right">{currency(Number(m.unit_cost))}</td></tr>)}</tbody>
      </table></div>}
  </section>;
}
