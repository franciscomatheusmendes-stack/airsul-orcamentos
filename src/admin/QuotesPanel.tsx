import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Material } from "./MaterialsPanel";
type Customer = {id:string;name:string;phone:string};
type Quote = {id:string;customer_name:string;status:string;proposed_price:string};
type Line = {materialId:string;quantity:number;suppliedBy:"airsul"|"client"};
const currency=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
export default function QuotesPanel({materials}:{materials:Material[]}) {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [quotes,setQuotes]=useState<Quote[]>([]);
  const [customerId,setCustomerId]=useState("");
  const [lines,setLines]=useState<Line[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState<{totalCostCents:number;proposedPriceCents:number;grossProfitCents:number}|null>(null);
  async function refresh() {
    const responses=await Promise.all([fetch("/api/admin/customers"),fetch("/api/admin/quotes")]);
    if(responses.some(r=>!r.ok)) throw new Error("Falha ao carregar clientes e orçamentos.");
    setCustomers((await responses[0].json()).customers);setQuotes((await responses[1].json()).quotes);
  }
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message));},[]);
  async function customer(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;const data=new FormData(form);setBusy(true);setMessage("");
    try {
      const r=await fetch("/api/admin/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:data.get("name"),phone:data.get("phone"),email:data.get("email")})});
      if(!r.ok) throw new Error("Verifique os dados do cliente.");
      const result=await r.json();await refresh();setCustomerId(result.customer.id);form.reset();setMessage("Cliente cadastrado.");
    } catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }
  async function quote(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setMessage("");setPreview(null);
    const data=new FormData(e.currentTarget);
    const money=(name:string)=>Math.round(Number(String(data.get(name)).replace(",","."))*100);
    const mode=String(data.get("supplyMode"));
    const save=(e.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="save";
    try {
      const r=await fetch("/api/admin/quotes"+(save?"":"/preview"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId,capacityBtu:Number(data.get("capacity")),lineLengthM:Number(data.get("length")),notes:data.get("notes"),lines:lines.map(l=>({...l,suppliedBy:mode==="partial"?l.suppliedBy:mode})),laborCents:money("labor"),travelCents:money("travel"),overheadCents:money("overhead"),marginPercent:Number(data.get("margin")),supplyMode:mode})});
      if(!r.ok) throw new Error("Não foi possível calcular ou salvar. Confira os campos e os materiais.");
      setPreview(await r.json());if(save){await refresh();setMessage("Orçamento salvo como rascunho.");}
    } catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }
  return <><section className="panel"><h2>Clientes</h2><form onSubmit={customer}><label>Nome<input name="name" required minLength={2} maxLength={150}/></label><label>Telefone<input name="phone" required maxLength={25} type="tel"/></label><label>Email<input name="email" type="email" maxLength={254}/></label><button disabled={busy}>Cadastrar cliente</button></form><p>{customers.length} cliente(s) cadastrado(s)</p></section>
  <section className="panel"><h2>Novo orçamento</h2><form onSubmit={quote} onChange={()=>setPreview(null)}><label>Cliente<select required value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">Selecione</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Capacidade (BTU)<input name="capacity" type="number" min={1000} max={200000} defaultValue={12000} required/></label><label>Linha (m)<input name="length" type="number" min={0} max={1000} step="0.01" defaultValue={3} required/></label><label>Fornecimento<select name="supplyMode" defaultValue="airsul"><option value="airsul">AirSul</option><option value="client">Cliente</option><option value="partial">Parcial</option></select></label>
  {lines.map((line,i)=><fieldset key={i}><legend>Material {i+1}</legend><select aria-label="Material" value={line.materialId} onChange={e=>setLines(v=>v.map((l,j)=>j===i?{...l,materialId:e.target.value}:l))} required><option value="">Selecione</option>{materials.filter(m=>m.active).map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select><input aria-label="Quantidade" type="number" min="0.001" max="10000" step="0.001" value={line.quantity} onChange={e=>setLines(v=>v.map((l,j)=>j===i?{...l,quantity:Number(e.target.value)}:l))} required/><select aria-label="Fornecedor quando parcial" value={line.suppliedBy} onChange={e=>setLines(v=>v.map((l,j)=>j===i?{...l,suppliedBy:e.target.value as Line["suppliedBy"]}:l))}><option value="airsul">AirSul</option><option value="client">Cliente</option></select><button type="button" onClick={()=>{setLines(v=>v.filter((_,j)=>j!==i));setPreview(null);}}>Remover</button></fieldset>)}
  <button type="button" disabled={lines.length>=100} onClick={()=>{setLines(v=>[...v,{materialId:"",quantity:1,suppliedBy:"airsul"}]);setPreview(null);}}>Adicionar material</button>
  {[["labor","Mão de obra"],["travel","Deslocamento"],["overhead","Despesas"]].map(([name,label])=><label key={name}>{label} (R$)<input name={name} type="number" min={0} max={1000000} step="0.01" defaultValue={0} required/></label>)}<label>Margem sobre venda (%)<input name="margin" type="number" min={0} max={90} step="0.01" defaultValue={25} required/></label><label>Observações internas<input name="notes" maxLength={2000} defaultValue=""/></label><button value="preview" disabled={busy}>Calcular</button> <button value="save" disabled={busy}>Salvar rascunho</button></form>
  {preview&&<p role="status">Custo interno: {currency(preview.totalCostCents/100)} · Preço proposto: {currency(preview.proposedPriceCents/100)} · Lucro bruto: {currency(preview.grossProfitCents/100)}</p>}
  <p role="status">{message}</p><h3>Orçamentos salvos</h3>{quotes.map(q=><p key={q.id}>{q.customer_name} · {currency(Number(q.proposed_price))} · Rascunho <a href={"/api/admin/quotes/"+q.id+"/pdf"}>Baixar PDF</a></p>)}</section></>;
}
