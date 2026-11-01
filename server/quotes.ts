import { Router } from "express";
import type pg from "pg";
import { requireSession } from "./session.js";
import PDFDocument from "pdfkit";

type QuoteLine = { materialId: string; quantity: number; suppliedBy: "airsul" | "client" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cents = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const validLine = (v: unknown): v is QuoteLine => {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return typeof x.materialId === "string" && uuid.test(x.materialId) &&
    typeof x.quantity === "number" && Number.isFinite(x.quantity) &&
    x.quantity > 0 && x.quantity <= 10000 && Math.abs(x.quantity*1000-Math.round(x.quantity*1000)) < 1e-6 &&
    (x.suppliedBy === "airsul" || x.suppliedBy === "client");
};
export function quoteRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(requireSession(pool));
  router.get("/", async (_req, res) => {
    try { res.json({quotes:(await pool.query("SELECT q.id,q.status,q.proposed_price,q.created_at,c.name AS customer_name FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id ORDER BY q.created_at DESC LIMIT 100")).rows}); }
    catch { res.status(503).json({error:"Falha ao consultar orçamentos"}); }
  });
  router.get("/:id/pdf", async (req,res) => {
    if (!uuid.test(req.params.id)) {res.status(400).json({error:"ID inválido"});return;}
    try {
      const quote = (await pool.query("SELECT q.id,q.capacity_btu,q.line_length_m,q.supply_mode,q.proposed_price,q.created_at,c.name AS customer_name FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=$1",[req.params.id])).rows[0];
      if (!quote) {res.status(404).json({error:"Orçamento inexistente"});return;}
      const items = (await pool.query("SELECT description,quantity FROM quote_items WHERE quote_id=$1 ORDER BY id",[quote.id])).rows;
      const doc = new PDFDocument({size:"A4",margin:50,info:{Title:"Orçamento AirSul"}});
      res.type("application/pdf").set("Content-Disposition",'attachment; filename="airsul-'+quote.id+'.pdf"');
      doc.pipe(res);
      doc.fontSize(24).fillColor("#126879").text("AirSul Climatização");
      doc.moveDown().fontSize(16).fillColor("#172936").text("Proposta de instalação");
      doc.moveDown().fontSize(10).text("Referência: "+quote.id);
      doc.text("Cliente: "+quote.customer_name);
      doc.text("Capacidade: "+quote.capacity_btu+" BTU | Linha: "+quote.line_length_m+" m");
      doc.text("Materiais: "+({airsul:"AirSul",client:"Cliente",partial:"Fornecimento parcial"}[quote.supply_mode as string] || quote.supply_mode));
      doc.moveDown().fontSize(12).text("Materiais previstos");
      items.forEach(item => {doc.moveDown(0.5).fontSize(10).text(item.quantity+" x "+item.description);});
      doc.moveDown().fontSize(16).text("Valor proposto: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(quote.proposed_price)));
      doc.moveDown().fontSize(10).text("Proposta sujeita à confirmação técnica e às condições acordadas com a AirSul. Este documento não confirma agendamento ou contratação.");
      doc.end();
    } catch { if (!res.headersSent) res.status(503).json({error:"Falha ao gerar PDF"}); else res.end(); }
  });
  router.post(["/preview", "/"], async (req, res) => {
    const { lines, laborCents, travelCents, overheadCents, marginPercent, supplyMode } = req.body || {};
    if (!Array.isArray(lines) || lines.length > 100 || !lines.every(validLine) ||
        !cents(laborCents) || !cents(travelCents) || !cents(overheadCents) ||
        typeof marginPercent !== "number" || !Number.isFinite(marginPercent) ||
        marginPercent < 0 || marginPercent > 90 ||
        !["airsul","client","partial"].includes(supplyMode) ||
        (supplyMode === "airsul" && lines.some((x: QuoteLine) => x.suppliedBy !== "airsul")) ||
        (supplyMode === "client" && lines.some((x: QuoteLine) => x.suppliedBy !== "client"))) {
      res.status(400).json({ error: "Dados inválidos" }); return;
    }
    try {
      const ids = [...new Set((lines as QuoteLine[]).map(x => x.materialId))];
      const result = await pool.query("SELECT id, name, unit, unit_cost FROM materials WHERE active = true AND id = ANY($1::uuid[])", [ids]);
      if (result.rows.length !== ids.length) { res.status(400).json({error:"Material inexistente ou inativo"}); return; }
      const byId = new Map<string, {name:string;unit:string;unit_cost:string}>(result.rows.map(r => [r.id,r]));
      const items = (lines as QuoteLine[]).map(line => {
        const material = byId.get(line.materialId)!;
        const unitCostCents = Math.round(Number(material.unit_cost) * 100);
        const costCents = line.suppliedBy === "airsul" ? Math.round(unitCostCents * line.quantity) : 0;
        return {materialId:line.materialId,name:material.name,unit:material.unit,quantity:line.quantity,suppliedBy:line.suppliedBy,costCents};
      });
      const materialCostCents = items.reduce((sum,item) => sum + item.costCents, 0);
      const totalCostCents = materialCostCents + laborCents + travelCents + overheadCents;
      const proposedPriceCents = Math.round(totalCostCents / (1 - marginPercent / 100));
      if (!Number.isSafeInteger(proposedPriceCents)) {res.status(400).json({error:"Total fora do limite"});return;}
      const summary = {items,materialCostCents,laborCents,travelCents,overheadCents,totalCostCents,proposedPriceCents,grossProfitCents:proposedPriceCents-totalCostCents,notice:"Simulação interna, não é orçamento aprovado."};
      if (req.path === "/preview") {res.json(summary);return;}
      const {customerId,capacityBtu,lineLengthM,notes} = req.body;
      if (typeof customerId !== "string" || !uuid.test(customerId) || !Number.isInteger(capacityBtu) || capacityBtu < 1000 || capacityBtu > 200000 || typeof lineLengthM !== "number" || !Number.isFinite(lineLengthM) || lineLengthM < 0 || lineLengthM > 1000 || typeof notes !== "string" || notes.length > 2000) {
        res.status(400).json({error:"Dados de instalação inválidos"});return;
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (!(await client.query("SELECT id FROM customers WHERE id=$1",[customerId])).rowCount) {await client.query("ROLLBACK");res.status(400).json({error:"Cliente inexistente"});return;}
        const quote = (await client.query("INSERT INTO quotes(customer_id,capacity_btu,line_length_m,supply_mode,status,internal_cost,proposed_price,notes) VALUES($1,$2,$3,$4,'draft',$5,$6,$7) RETURNING id",[customerId,capacityBtu,lineLengthM,supplyMode,(totalCostCents/100).toFixed(2),(proposedPriceCents/100).toFixed(2),notes])).rows[0];
        for (const item of items) {
          const unitCost = item.suppliedBy === "client" ? "0.00" : byId.get(item.materialId)!.unit_cost;
          await client.query("INSERT INTO quote_items(quote_id,material_id,description,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)",[quote.id,item.materialId,item.name+" ("+item.unit+"; "+(item.suppliedBy === "client" ? "cliente" : "AirSul")+")",item.quantity,unitCost]);
        }
        await client.query("COMMIT");
        res.status(201).json({quoteId:quote.id,...summary});
      } catch (err) {await client.query("ROLLBACK");throw err;} finally {client.release();}
    } catch { res.status(500).json({error:"Falha ao calcular orçamento"}); }
  });
  return router;
}
