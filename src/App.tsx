import { useState } from "react";
import type {FormEvent} from "react";

const phone = "5551998193796";
const services: Record<string, string> = { installation: "Instalação", cleaning: "Higienização", maintenance: "Manutenção / diagnóstico", removal: "Desinstalação" };
const capacities = ["9000", "12000", "18000", "24000", "30000", "36000"];
const supplyLabels: Record<string, string> = {
  airsul: "AirSul fornece os materiais",
  client: "Cliente fornece os materiais",
  partial: "Fornecimento parcial"
};

export default function App() {
  const [name, setName] = useState("");
  const [service, setService] = useState("installation");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [btu, setBtu] = useState("12000");
  const [meters, setMeters] = useState("3");
  const [supply, setSupply] = useState("airsul");
  const [notes, setNotes] = useState("");
  const [submitted,setSubmitted]=useState(false);
  const meterValue=Number(meters.replace(",","."));
  const valid = /^\d+(?:[.,]\d{1,2})?$/.test(meters.trim()) && Number.isFinite(meterValue) && meterValue >= 0.5 && meterValue <= 100;
  const nameValid = name.trim().length >= 2;
  const contactValid=!contact.trim() || /^[+()\d\s-]{8,30}$/.test(contact.trim());
  const canSend = (service !== "installation" || valid) && nameValid && city.trim().length >= 2 && contactValid;

  function requestQuote(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setSubmitted(true);
    if (!canSend) return;
    const message = [
      "Olá! Gostaria de solicitar um orçamento com a AirSul.",
      "Serviço: " + services[service],
      "Nome: " + name.trim(),
      "Cidade / bairro: " + city.trim(),
      "Contato: " + (contact.trim() || "Pelo WhatsApp"),
      "Capacidade: " + btu + " BTU/h",
      ...(service === "installation" ? ["Tubulação estimada: " + meterValue.toLocaleString("pt-BR") + " m", "Materiais: " + supplyLabels[supply]] : []),
      "Observações: " + (notes.trim() || "Nenhuma"),
      "Estou ciente de que o orçamento depende de avaliação técnica."
    ].join("\n");
    window.location.assign("https://wa.me/" + phone + "?text=" + encodeURIComponent(message));
  }

  return <main>
    <header className="header">
      <div className="brand">❄ AirSul <small>CLIMATIZAÇÃO</small></div>
      <a className="contact" href={"https://wa.me/" + phone}>WhatsApp</a>
    </header>
    <section className="hero">
      <span className="eyebrow">CAPÃO DA CANOA • LITORAL NORTE / RS</span>
      <h1>Solicite seu serviço de climatização com praticidade.</h1>
      <p>Instalação, higienização e manutenção de ar-condicionado no Litoral Norte do RS.</p>
    </section>
    <section className="panel">
      <h2>Solicitar orçamento</h2>
      <p className="muted">Os valores serão confirmados pela equipe após avaliação técnica.</p>
      <form onSubmit={requestQuote} noValidate>
      <label>Seu nome
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={submitted&&!nameValid}/>
      </label>
      <label>Serviço desejado
        <select value={service} onChange={e => setService(e.target.value)}>
          {Object.entries(services).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label>Cidade e bairro
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex.: Capão da Canoa, Centro" required minLength={2} maxLength={120} aria-invalid={submitted&&city.trim().length<2}/>
      </label>
      <label>Telefone para contato (opcional)
        <input type="tel" inputMode="tel" autoComplete="tel" value={contact} onChange={e => setContact(e.target.value)} placeholder="(51) 99999-9999" maxLength={30}/>
      </label>
      <label>Capacidade do ar-condicionado
        <select value={btu} onChange={e => setBtu(e.target.value)}>
          {capacities.map(v => <option key={v} value={v}>{Number(v).toLocaleString("pt-BR")} BTU/h</option>)}
        </select>
      </label>
      {service === "installation" && <><label>Comprimento estimado da tubulação (metros)
        <input inputMode="decimal" value={meters} onChange={e => setMeters(e.target.value)} required aria-invalid={submitted&&!valid}/>
      </label>
      <fieldset>
        <legend>Quem fornece os materiais?</legend>
        {Object.entries(supplyLabels).map(([key, title]) => <label className="option" key={key}>
          <input type="radio" name="supply" checked={supply === key} onChange={() => setSupply(key)}/>{title}
        </label>)}
      </fieldset></>}
      <label>Observações
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Ex.: parede-parede, altura, ponto elétrico..."/>
      </label>
      {submitted&&!nameValid && <p className="error" role="alert">Informe seu nome (mínimo de 2 caracteres).</p>}
      {submitted&&city.trim().length < 2 && <p className="error" role="alert">Informe sua cidade ou bairro.</p>}
      {submitted&&!contactValid&&<p className="error" role="alert">Confira o telefone informado ou deixe o campo vazio.</p>}
      {submitted&&service === "installation" && !valid && <p className="error" role="alert">Informe uma metragem entre 0,5 e 100 metros, com até duas casas decimais.</p>}
      <button type="submit">Continuar no WhatsApp</button>
      </form>
      <p className="muted">O WhatsApp será aberto com seu pedido preenchido. Confira a mensagem e toque em enviar para concluir a solicitação.</p>
      <p className="footnote">Solicitação não é orçamento definitivo. A equipe confirmará medidas, materiais e requisitos conforme o manual do equipamento.</p>
    </section>
    <footer>AirSul Climatização • Capão da Canoa e Litoral Norte/RS <a className="admin-link" href="https://airsul-orcamentos-api.onrender.com/admin">Área administrativa</a></footer>
  </main>;
}
