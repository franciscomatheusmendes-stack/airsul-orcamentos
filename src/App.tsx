import {useState} from "react";
import type {FormEvent} from "react";
import CapacityEstimator from "./CapacityEstimator";
import {capacities} from "./lib/capacity";
import type {CapacityEstimate} from "./lib/capacity";

const phone="5551998193796";
const services:Record<string,string>={installation:"Instalação",cleaning:"Higienização",maintenance:"Manutenção / diagnóstico",removal:"Desinstalação"};
const number=(value:number)=>value.toLocaleString("pt-BR");

export default function App(){
  const [name,setName]=useState("");
  const [service,setService]=useState("installation");
  const [city,setCity]=useState("");
  const [contact,setContact]=useState("");
  const [btu,setBtu]=useState("");
  const [meters,setMeters]=useState("");
  const [kit,setKit]=useState("");
  const [notes,setNotes]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [estimate,setEstimate]=useState<CapacityEstimate|null>(null);
  const meterValue=Number(meters.replace(",","."));
  const metersKnown=meters.trim()!=="";
  const validMeters=!metersKnown||(/^\d+(?:[.,]\d{1,2})?$/.test(meters.trim())&&meterValue>=0.5&&meterValue<=100);
  const nameValid=name.trim().length>=2;
  const cityValid=city.trim().length>=2;
  const contactValid=!contact.trim()||(/^[+()\d\s-]{8,30}$/.test(contact.trim())&&contact.replace(/\D/g,"").length>=8);
  const canSend=nameValid&&cityValid&&contactValid&&(service!=="installation"||(validMeters&&!!kit));

  function requestQuote(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSubmitted(true);
    if(!canSend){requestAnimationFrame(()=>document.querySelector<HTMLElement>(".customer-page [aria-invalid=true]")?.focus());return;}
    const message=[
      "Olá! Gostaria de solicitar um orçamento com a AirSul.",
      "Serviço: "+services[service],
      "Nome: "+name.trim(),
      "Cidade / bairro: "+city.trim(),
      "Contato: "+(contact.trim()||"Pelo WhatsApp"),
      "Capacidade: "+(btu?number(Number(btu))+" BTU/h":"A confirmar com a AirSul"),
      ...(service==="installation"?[
        "Possui kit de instalação: "+(kit==="yes"?"Sim (conferir itens e compatibilidade)":"Não (incluir materiais no orçamento)"),
        "Distância estimada entre as unidades: "+(metersKnown?number(meterValue)+" m":"A confirmar")
      ]:[]),
      ...(estimate?[
        "Estimativa inicial, sujeita à avaliação técnica:",
        "Ambiente: "+number(estimate.width)+" × "+number(estimate.length)+" m ("+number(estimate.area)+" m²).",
        "Pessoas: "+estimate.people+"; TVs/computadores em uso: "+estimate.electronics+"; sol direto: "+(estimate.directSun?"sim":"não")+".",
        "Carga simplificada: "+number(estimate.estimatedBtu)+" BTU/h; referência: "+(estimate.suggestedBtu?number(estimate.suggestedBtu)+" BTU/h":"solicitar avaliação específica")+"."
      ]:[]),
      "Observações: "+(notes.trim()||"Nenhuma"),
      "Estou ciente de que o orçamento e a capacidade dependem de avaliação técnica."
    ].join("\n");
    window.location.assign("https://wa.me/"+phone+"?text="+encodeURIComponent(message));
  }
  function useEstimate(value:CapacityEstimate){setEstimate(value);setBtu(value.suggestedBtu?String(value.suggestedBtu):"");}
  function invalidateEstimate(){if(estimate){setEstimate(null);setBtu("");}}
  function openEstimator(){document.querySelector<HTMLDetailsElement>(".capacity-help")?.setAttribute("open","");}

  return <main className="customer-page">
    <header className="header"><div className="brand">❄ AirSul <small>CLIMATIZAÇÃO</small></div><a className="contact" href={"https://wa.me/"+phone}>Falar com a AirSul</a></header>
    <section className="hero public-hero"><div className="public-hero-inner"><h1>Seu ambiente mais confortável, sem complicação.</h1><p>Instalação, higienização e manutenção de ar-condicionado em Capão da Canoa e no Litoral Norte/RS.</p><a className="estimator-shortcut" href="#calculo-btu" onClick={openEstimator}>Não sabe quantos BTUs precisa? Descubra aqui <span aria-hidden="true">↗</span></a></div></section>
    <section className="panel public-panel" id="pedido"><h2>Vamos preparar seu orçamento?</h2><p className="muted public-intro">Conte o que você precisa. A conversa continua pelo WhatsApp, sem cadastro.</p>
      <form onSubmit={requestQuote} noValidate>
        <fieldset className="request-step"><legend><span aria-hidden="true">1</span> Sobre o serviço</legend>
          <label>Serviço desejado<select aria-label="Serviço desejado" value={service} onChange={e=>{setService(e.target.value);setSubmitted(false);}}>{Object.entries(services).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label htmlFor="capacidade-aparelho">Capacidade do ar-condicionado</label><select id="capacidade-aparelho" value={btu} onChange={e=>{setBtu(e.target.value);setEstimate(null);}}><option value="">Ainda não sei / confirmar com a AirSul</option>{capacities.map(v=><option key={v} value={v}>{number(v)} BTU/h</option>)}</select>
          <p className="field-help">Se já tem o aparelho, essa informação costuma estar na etiqueta ou no manual.</p>
          <div id="calculo-btu"><CapacityEstimator onUse={useEstimate} onInvalidate={invalidateEstimate} appliedEstimate={estimate}/></div>
          {estimate&&<p className="estimate-applied" role="status">{estimate.suggestedBtu?"Referência de "+number(estimate.suggestedBtu)+" BTU/h incluída no pedido.":"Dados do ambiente incluídos para avaliação da AirSul."}</p>}
        </fieldset>
        {service==="installation"&&<fieldset className="request-step"><legend><span aria-hidden="true">2</span> Sobre a instalação</legend>
          <fieldset className="kit-question" aria-describedby="kit-description"><legend>Você possui kit de instalação?</legend><div className="kit-choices">
            <label className={"kit-choice"+(kit==="yes"?" selected":"")}><input type="radio" name="installation-kit" value="yes" checked={kit==="yes"} onChange={()=>setKit("yes")} aria-invalid={submitted&&!kit}/><span><strong>Sim</strong><small>Já tenho os materiais</small></span></label>
            <label className={"kit-choice"+(kit==="no"?" selected":"")}><input type="radio" name="installation-kit" value="no" checked={kit==="no"} onChange={()=>setKit("no")} aria-invalid={submitted&&!kit}/><span><strong>Não</strong><small>Preciso incluir no orçamento</small></span></label>
          </div><div className="kit-description" id="kit-description"><strong>O que é o kit de instalação?</strong><p>É o material que liga a unidade interna à externa: tubos de cobre isolados, cabo de interligação e dreno (mangueira para saída da água). Suportes e acabamentos variam.</p><p>A AirSul confere medidas e compatibilidade. Se tiver só parte do kit, marque “Sim” e descreva nas observações.</p></div>
          {submitted&&!kit&&<p className="error" role="alert">Informe se você possui o kit de instalação.</p>}
          </fieldset>
          <label>Distância estimada entre as unidades (m) — opcional<input inputMode="decimal" value={meters} onChange={e=>setMeters(e.target.value)} placeholder="Ex.: 3" aria-invalid={submitted&&!validMeters}/></label><p className="field-help">É o percurso da parte interna até a parte externa. Se não souber, deixe em branco.</p>
          {submitted&&!validMeters&&<p className="error" role="alert">Informe uma distância entre 0,5 e 100 metros, com até duas casas decimais, ou deixe em branco.</p>}
        </fieldset>}
        <fieldset className="request-step"><legend><span aria-hidden="true">{service==="installation"?"3":"2"}</span> Seus dados para contato</legend>
          <div className="public-grid"><div><label>Seu nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={submitted&&!nameValid}/></label>{submitted&&!nameValid&&<p className="error" role="alert">Informe seu nome (mínimo de 2 caracteres).</p>}</div><div><label>Telefone para contato (opcional)<input type="tel" inputMode="tel" autoComplete="tel" value={contact} onChange={e=>setContact(e.target.value)} placeholder="(51) 99999-9999" maxLength={30} aria-invalid={submitted&&!contactValid}/></label>{submitted&&!contactValid&&<p className="error" role="alert">Confira o telefone ou deixe o campo vazio.</p>}</div></div>
          <label>Cidade e bairro<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex.: Capão da Canoa, Centro" required minLength={2} maxLength={120} aria-invalid={submitted&&!cityValid}/></label>{submitted&&!cityValid&&<p className="error" role="alert">Informe sua cidade ou bairro.</p>}
          <label>Observações (opcional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Ex.: tenho parte do kit, o ambiente tem teto alto, preciso de ajuda para escolher o aparelho..."/></label>
        </fieldset>
        <div className="public-submit"><button type="submit">Continuar no WhatsApp <span aria-hidden="true">→</span></button><p>Você confere a mensagem no WhatsApp e toca em enviar para concluir a solicitação.</p></div>
      </form>
      <p className="footnote">A solicitação não confirma preço ou agendamento. A equipe avalia o local, os materiais e as orientações do fabricante antes de fechar o orçamento.</p>
    </section>
    <footer>AirSul Climatização • Capão da Canoa e Litoral Norte/RS<a className="admin-link" href="https://airsul-orcamentos-api.onrender.com/admin">Área administrativa</a></footer>
  </main>;
}
