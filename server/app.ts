import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import type pg from "pg";
import { materialRoutes } from "./materials.js";
import { quoteRoutes } from "./quotes.js";
import { customerRoutes } from "./customers.js";
import { sessionRoutes } from "./session.js";
import { setupRoutes } from "./setup.js";

export function createApp(pool: pg.Pool) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use("/api/admin", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.use("/api/admin", (req, res, next) => {
    if (process.env.ADMIN_ENABLED !== "true") { res.status(503).json({error:"Painel em validação"}); return; }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        (req.get("origin") !== process.env.ADMIN_ORIGIN || !req.is("application/json"))) {
      res.status(403).json({error:"Origem ou conteúdo não permitido"}); return;
    }
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/setup", setupRoutes(pool));
  app.use("/api/admin", rateLimit({ windowMs: 60000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));
  app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }));
  app.get("/api/health", async (_req, res) => {
    try { await pool.query("SELECT 1"); res.json({status:"ok"}); }
    catch { res.status(503).json({status:"unavailable"}); }
  });
  app.use("/api/admin", sessionRoutes(pool));
  app.use("/api/admin/materials", materialRoutes(pool));
  app.use("/api/admin/customers", customerRoutes(pool));
  app.use("/api/admin/quotes", quoteRoutes(pool));
  app.use("/api", (_req, res) => { res.status(404).json({error:"Rota indisponível"}); });
  app.use("/assets", express.static(path.resolve("dist/assets"), { immutable: true, maxAge: "1y" }));
  app.get(["/admin", "/setup", "/"], (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.path !== "/setup" && process.env.ADMIN_ENABLED !== "true") { res.status(503).send("Painel AirSul em validação."); return; }
    res.sendFile(path.resolve("dist/index.html"));
  });
  app.use((err: {status?:number}, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status === 413 ? 413 : 400).json({error:"Requisição inválida"});
  });
  return app;
}
