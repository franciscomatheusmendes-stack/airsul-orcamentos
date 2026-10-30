import { useState } from "react";

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
  const valid = Number.isFinite(Number(meters)) && meters.trim() !== "" && Number(meters) >= 0.5 && Number(meters) <= 100;
  const nameValid = name.trim().length >= 2;
  const canSend = (service !== "installation" || valid) && nameValid && city.trim().length >= 2;

  function requestQuote() {
    if (!canSend) return;
    const message = [
      "Olá! Gostaria de solicitar um orçamento com a AirSul.",
      "Serviço: " + services[service],
      "Nome: " + name.trim(),
      "Cidade / bairro: " + city.trim(),
      "Contato: " + (contact.trim() || "Pelo WhatsApp"),
      "Capacidade: " + btu + " BTU/h",
      ...(service === "installation" ? ["Tubulação estimada: " + meters + " m", "Materiais: " + supplyLabels[supply]] : []),
      "Observações: " + (notes.trim() || "Nenhuma"),
      "Estou ciente de que o orçamento depende de avaliação técnica."
    ].join("\n");
    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
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
      <label>Seu nome
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" maxLength={120}/>
      </label>
      <label>Serviço desejado
        <select value={service} onChange={e => setService(e.target.value)}>
          {Object.entries(services).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label>Cidade e bairro
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex.: Capão da Canoa, Centro" maxLength={120}/>
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
        <input type="number" min="0.5" max="100" step="0.5" value={meters} onChange={e => setMeters(e.target.value)}/>
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
      {!nameValid && <p className="error" role="alert">Informe seu nome (mínimo de 2 caracteres).</p>}
      {city.trim().length < 2 && <p className="error" role="alert">Informe sua cidade ou bairro.</p>}
      {service === "installation" && !valid && <p className="error" role="alert">Informe uma metragem entre 0,5 e 100 metros.</p>}
      <button disabled={!canSend} onClick={requestQuote}>Solicitar pelo WhatsApp</button>
      <p className="footnote">Solicitação não é orçamento definitivo. A equipe confirmará medidas, materiais e requisitos conforme o manual do equipamento.</p>
    </section>
    <footer>AirSul Climatização • Capão da Canoa e Litoral Norte/RS</footer>
  </main>;
}
