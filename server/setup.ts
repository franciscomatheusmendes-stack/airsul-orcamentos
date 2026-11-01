import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type pg from "pg";
import { rateLimit } from "express-rate-limit";
import { adminEmail, hashPassword } from "./session.js";
export function setupRoutes(pool: pg.Pool) {
  const router = Router();
  router.use(rateLimit({windowMs:3600000,limit:10,legacyHeaders:false}));
  router.post("/",async(req,res)=>{
    if (req.get("origin") !== process.env.ADMIN_ORIGIN || !req.is("application/json")) {res.sendStatus(403);return;}
    const {token,password} = req.body || {};
    const expected = process.env.ADMIN_SETUP_TOKEN || "";
    const digest = (s:string) => createHash("sha256").update(s).digest();
    if (expected.length < 64 || typeof token !== "string" || token.length > 256 || !timingSafeEqual(digest(token),digest(expected))) {res.sendStatus(403);return;}
    if (typeof password !== "string" || password.length < 14 || password.length > 256) {res.status(400).json({error:"Use uma senha de 14 a 256 caracteres"});return;}
    let client: pg.PoolClient | undefined;
    try {
      const hash = hashPassword(password);
      client = await pool.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(82345321)");
      if ((await client.query("SELECT 1 FROM admin_users LIMIT 1")).rowCount) {await client.query("ROLLBACK");res.status(409).json({error:"Conta já provisionada"});return;}
      await client.query("INSERT INTO admin_users(email,password_hash) VALUES($1,$2)",[adminEmail,hash]);
      await client.query("COMMIT");
      res.status(201).json({created:true,email:adminEmail});
    } catch { if (client) await client.query("ROLLBACK").catch(()=>{});res.status(503).json({error:"Provisionamento indisponível"}); }
    finally {client?.release();}
  });
  return router;
}
