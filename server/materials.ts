import { Router } from "express";
import type pg from "pg";
import { requireSession } from "./session.js";
export function materialRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(requireSession(pool));
  router.get("/", async (_req, res) => {
    try {
      const result = await pool.query("SELECT id, name, unit, unit_cost, active, created_at FROM materials ORDER BY name ASC LIMIT 500");
      res.json({materials:result.rows});
    } catch { res.status(500).json({error:"Falha ao consultar materiais"}); }
  });
  router.route(["/", "/:id"]).all(async (req, res, next) => {
    if (!["POST", "PUT"].includes(req.method)) {next();return;}
    const id=req.params.id;
    if ((id && req.method!=="PUT") || (!id && req.method!=="POST")) {res.sendStatus(405);return;}
    if ((req.method === "PUT" && !id) || (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {res.status(400).json({error:"Material inválido"});return;}
    const {name, unit, unitCost} = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 150 ||
        typeof unit !== "string" || !["m","un","kg","l","kit","par"].includes(unit) ||
        typeof unitCost !== "number" || !Number.isFinite(unitCost) || unitCost < 0 || unitCost > 1000000 ||
        !Number.isInteger(Math.round(unitCost * 100)) || Math.abs(unitCost * 100 - Math.round(unitCost * 100)) > 1e-6) {
      res.status(400).json({error:"Nome, unidade ou custo inválido"}); return;
    }
    try {
      const result = id
        ? await pool.query("UPDATE materials SET name=$1,unit=$2,unit_cost=$3 WHERE id=$4 RETURNING id,name,unit,unit_cost,active,created_at",[name.trim(),unit,unitCost.toFixed(2),id])
        : await pool.query("INSERT INTO materials (name,unit,unit_cost) VALUES ($1,$2,$3) RETURNING id,name,unit,unit_cost,active,created_at",[name.trim(),unit,unitCost.toFixed(2)]);
      if (!result.rowCount) {res.status(404).json({error:"Material não encontrado"});return;}
      res.status(id ? 200 : 201).json({material:result.rows[0]});
    } catch { res.status(500).json({error:"Falha ao cadastrar material"}); }
  });
  return router;
}
