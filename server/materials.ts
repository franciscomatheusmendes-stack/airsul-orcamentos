import { Router } from "express";
import type pg from "pg";
import { requireAdmin } from "./auth.js";
export function materialRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(requireAdmin);
  router.get("/", async (_req, res) => {
    try {
      const result = await pool.query("SELECT id, name, unit, unit_cost, active, created_at FROM materials ORDER BY name ASC LIMIT 500");
      res.json({materials:result.rows});
    } catch { res.status(500).json({error:"Falha ao consultar materiais"}); }
  });
  router.post("/", async (req, res) => {
    const {name, unit, unitCost} = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 150 ||
        typeof unit !== "string" || !["m","un","kg","l","kit","par"].includes(unit) ||
        typeof unitCost !== "number" || !Number.isFinite(unitCost) || unitCost < 0 || unitCost > 1000000 ||
        !Number.isInteger(Math.round(unitCost * 100)) || Math.abs(unitCost * 100 - Math.round(unitCost * 100)) > 1e-6) {
      res.status(400).json({error:"Nome, unidade ou custo inválido"}); return;
    }
    try {
      const result = await pool.query("INSERT INTO materials (name,unit,unit_cost) VALUES ($1,$2,$3) RETURNING id,name,unit,unit_cost,active,created_at",[name.trim(),unit,unitCost.toFixed(2)]);
      res.status(201).json({material:result.rows[0]});
    } catch { res.status(500).json({error:"Falha ao cadastrar material"}); }
  });
  return router;
}
