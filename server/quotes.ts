import { Router } from "express";
import type pg from "pg";
import { requireAdmin } from "./auth.js";

type QuoteLine = { materialId: string; quantity: number; suppliedBy: "airsul" | "client" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cents = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const validLine = (v: unknown): v is QuoteLine => {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return typeof x.materialId === "string" && uuid.test(x.materialId) &&
    typeof x.quantity === "number" && Number.isFinite(x.quantity) &&
    x.quantity > 0 && x.quantity <= 10000 &&
    (x.suppliedBy === "airsul" || x.suppliedBy === "client");
};
export function quoteRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(requireAdmin);
  router.post("/preview", async (req, res) => {
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
      res.json({items,materialCostCents,laborCents,travelCents,overheadCents,totalCostCents,proposedPriceCents,grossProfitCents:proposedPriceCents-totalCostCents,notice:"Simulação interna, não é orçamento aprovado."});
    } catch { res.status(500).json({error:"Falha ao calcular orçamento"}); }
  });
  return router;
}
