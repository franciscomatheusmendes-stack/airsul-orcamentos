import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { createInterface } from "node:readline/promises";

if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL no ambiente do servidor.");
const rl = createInterface({input:process.stdin,output:process.stdout});
const email = (await rl.question("Email do administrador: ")).trim().toLowerCase();
const password = await rl.question("Senha forte (mínimo 12 caracteres): ");
rl.close();
if (!email.includes("@") || email.length > 254 || password.length < 12 || password.length > 256) throw new Error("Email ou senha inválidos.");
const salt = randomBytes(16).toString("hex");
const hash = "scrypt$" + salt + "$" + scryptSync(password,salt,64).toString("hex");
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
try {
  await pool.query("INSERT INTO admin_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING",[email,hash]);
  console.log("Administrador cadastrado, caso o email ainda não existisse.");
} finally { await pool.end(); }
