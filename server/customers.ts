import { Router } from "express";
import type pg from "pg";
import { requireSession } from "./session.js";
export function customerRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(requireSession(pool));
  router.get("/", async (_req, res) => {
    try { res.json({customers:(await pool.query("SELECT id,name,phone,email FROM customers ORDER BY name LIMIT 500")).rows}); }
    catch { res.status(503).json({error:"Falha ao consultar clientes"}); }
  });
  router.post("/", async (req, res) => {
    const {name,phone,email} = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 150 ||
        typeof phone !== "string" || !/^[+()\d\s-]{8,25}$/.test(phone) ||
        typeof email !== "string" || email.length > 254 || (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      res.status(400).json({error:"Dados do cliente inválidos"}); return;
    }
    try { res.status(201).json({customer:(await pool.query("INSERT INTO customers(name,phone,email) VALUES($1,$2,$3) RETURNING id,name,phone,email",[name.trim(),phone.trim(),email.trim() || null])).rows[0]}); }
    catch { res.status(503).json({error:"Falha ao cadastrar cliente"}); }
  });
  return router;
}
