import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pg from "pg";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({limit:"16kb"}));
const allowedOrigin = process.env.FRONTEND_ORIGIN;
if (allowedOrigin) app.use(cors({origin:allowedOrigin}));
const pool = process.env.DATABASE_URL ? new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:5}) : null;
app.get("/api/health", async (_req,res) => {
  if (!pool) { res.status(503).json({status:"unconfigured"}); return; }
  try { await pool.query("SELECT 1"); res.json({status:"ok"}); }
  catch { res.status(503).json({status:"unavailable"}); }
});
// Não expor dados comerciais nem permitir CRUD sem autenticação e autorização.
app.use("/api", (_req,res) => res.status(404).json({error:"Rota indisponível"}));
const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log("AirSul API listening on port",port));
