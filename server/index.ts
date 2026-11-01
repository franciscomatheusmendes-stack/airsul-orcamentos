import "dotenv/config";
import pg from "pg";
import { createApp } from "./app.js";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL obrigatória");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
pool.on("error", () => console.error("Conexão ociosa com banco encerrada"));
const server = createApp(pool).listen(Number(process.env.PORT || 3001), "0.0.0.0", () => console.log("AirSul API pronta"));
process.on("SIGTERM", () => {
  server.close(() => { void pool.end().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 25000).unref();
});
