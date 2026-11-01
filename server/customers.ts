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
  router.route(["/", "/:id"]).all(async (req, res, next) => {
    if (!["POST", "PUT"].includes(req.method)) {next();return;}
    const id=req.params.id;
    if ((id && req.method!=="PUT") || (!id && req.method!=="POST")) {res.sendStatus(405);return;}
    if ((req.method === "PUT" && !id) || (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {res.status(400).json({error:"Cliente inválido"});return;}
    const {name,phone,email} = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 150 ||
        typeof phone !== "string" || !/^[+()\d\s-]{8,25}$/.test(phone) ||
        typeof email !== "string" || email.length > 254 || (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      res.status(400).json({error:"Dados do cliente inválidos"}); return;
    }
    try {
      const values=[name.trim(),phone.trim(),email.trim() || null];
      const result=id ? await pool.query("UPDATE customers SET name=$1,phone=$2,email=$3 WHERE id=$4 RETURNING id,name,phone,email",[...values,id]) : await pool.query("INSERT INTO customers(name,phone,email) VALUES($1,$2,$3) RETURNING id,name,phone,email",values);
      if (!result.rowCount) {res.status(404).json({error:"Cliente não encontrado"});return;}
      res.status(id ? 200 : 201).json({customer:result.rows[0]});
    }
    catch { res.status(503).json({error:"Falha ao cadastrar cliente"}); }
  });
  return router;
}
