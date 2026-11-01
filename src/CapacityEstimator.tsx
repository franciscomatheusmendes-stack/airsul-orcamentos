import {useState} from "react";
import {estimateCapacity} from "./lib/capacity";
import type {CapacityEstimate} from "./lib/capacity";

type Props={onUse:(estimate:CapacityEstimate)=>void;onInvalidate:()=>void;appliedEstimate:CapacityEstimate|null};
const number=(value:number)=>value.toLocaleString("pt-BR");
export default function CapacityEstimator({onUse,onInvalidate,appliedEstimate}:Props){
  const [width,setWidth]=useState("");
  const [length,setLength]=useState("");
  const [people,setPeople]=useState("1");
  const [electronics,setElectronics]=useState("0");
  const [sun,setSun]=useState("");
  const [result,setResult]=useState<CapacityEstimate|null>(null);
  const [error,setError]=useState("");
  const applied=result!==null&&result===appliedEstimate;
  function changed(){setResult(null);setError("");onInvalidate();}
  function calculate(){
    setError("");setResult(null);onInvalidate();
    if(!width.trim()||!length.trim()||!people.trim()||!electronics.trim()||!sun){setError("Preencha as medidas, pessoas, eletrônicos e a incidência de sol.");return;}
    try{setResult(estimateCapacity({width:Number(width.replace(",",".")),length:Number(length.replace(",",".")),people:Number(people),electronics:Number(electronics),directSun:sun==="yes"}));}
    catch(e){setError((e as Error).message);}
  }
  return <details className="capacity-help"><summary>Não sei a capacidade. Como calcular os BTUs?</summary><div className="capacity-content" onKeyDown={e=>{if(e.key==="Enter"&&(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)){e.preventDefault();calculate();}}}><h4>Uma referência para o seu ambiente</h4><p>BTU/h indica a capacidade de refrigeração. Informe as medidas do cômodo e como ele é usado.</p>
    <div className="public-grid"><label>Largura do ambiente (m)<input inputMode="decimal" value={width} onChange={e=>{setWidth(e.target.value);changed();}} placeholder="Ex.: 3"/></label><label>Comprimento do ambiente (m)<input inputMode="decimal" value={length} onChange={e=>{setLength(e.target.value);changed();}} placeholder="Ex.: 4"/></label><label>Pessoas no ambiente<input type="number" inputMode="numeric" min={1} max={20} step={1} value={people} onChange={e=>{setPeople(e.target.value);changed();}}/></label><label>TVs e computadores em uso<input type="number" inputMode="numeric" min={0} max={20} step={1} value={electronics} onChange={e=>{setElectronics(e.target.value);changed();}}/></label></div>
    <label>O ambiente recebe sol direto?<select aria-label="O ambiente recebe sol direto?" value={sun} onChange={e=>{setSun(e.target.value);changed();}}><option value="">Selecione</option><option value="no">Não, fica na sombra</option><option value="yes">Sim, recebe sol direto</option></select></label>
    <button type="button" className="public-secondary" onClick={calculate}>Estimar capacidade</button>
    {error&&<p role="alert" className="error">{error}</p>}
    {result&&<div className="capacity-result" role="status"><span>Referência para {number(result.area)} m²</span><strong>{result.suggestedBtu?number(result.suggestedBtu)+" BTU/h":"Avaliação técnica necessária"}</strong><p>Carga simplificada estimada: {number(result.estimatedBtu)} BTU/h.{!result.suggestedBtu&&" O resultado ultrapassa 36.000 BTU/h. A AirSul avaliará a solução adequada."}</p><button type="button" className="public-secondary" disabled={applied} onClick={()=>onUse(result)}>{applied?"Estimativa incluída no pedido":result.suggestedBtu?"Usar esta referência no pedido":"Incluir dados para avaliação"}</button></div>}
    <p className="footnote">Estimativa para cômodos residenciais fechados, com pé-direito comum. Janelas grandes, teto alto, cozinha e ambientes integrados precisam de avaliação específica. A AirSul confirma a capacidade antes da instalação.</p>
    <details className="capacity-method"><summary>Como a estimativa é feita</summary><p>Área × 600 BTU/h, ou × 800 com sol direto. Somam-se 600 BTU/h por pessoa além da primeira e por TV ou computador em uso. A referência é arredondada para a próxima capacidade da lista.</p><a href="https://www.consul.com.br/facilita-consul/ihhh-agora/como-escolher-os-btus-certos-do-seu-ar-condicionado" target="_blank" rel="noopener noreferrer">Consultar a orientação da Consul</a></details>
  </div></details>;
}

