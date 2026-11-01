import { randomBytes, createHash, timingSafeEqual, scryptSync } from "node:crypto";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type pg from "pg";

const cookieName = "airsul_session";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieValue = (req: Request) => (req.headers.cookie || "").split(";").map(v=>v.trim()).find(v=>v.startsWith(cookieName+"="))?.slice(cookieName.length+1) || "";
const secure = () => process.env.NODE_ENV === "production";
const setCookie = (res: Response, value: string, maxAge: number) => res.cookie(cookieName,value,{httpOnly:true,sameSite:"strict",secure:secure(),path:"/api/admin",maxAge});
const attempts = new Map<string,{count:number;until:number}>();
export const adminEmail = "francisco.matheusmendes@gmail.com";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + scryptSync(password,salt,64).toString("hex");
}
function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const a = scryptSync(password,parts[1],64);
  const b = Buffer.from(parts[2],"hex");
  return timingSafeEqual(a,b);
}
export function sessionRoutes(pool: pg.Pool) {
  const router = Router();
  router.post("/login",async(req,res)=>{
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    const key = req.ip || "unknown";
    const now = Date.now();
    if (attempts.size > 10000) attempts.clear();
    const state = attempts.get(key);
    if (state && state.count >= 5 && state.until > now) {res.status(429).json({error:"Aguarde antes de tentar novamente"});return;}
    if (!email.includes("@") || email.length > 254 || typeof password !== "string" || password.length > 256) {res.status(400).json({error:"Dados inválidos"});return;}
    try {
      const result = await pool.query("SELECT id,password_hash FROM admin_users WHERE email=$1",[email]);
      const valid = email === adminEmail && result.rows.length === 1 && verifyPassword(password,result.rows[0].password_hash);
      if (!valid) {
        const count = state && state.until > now ? state.count+1 : 1;
        attempts.set(key,{count,until:now+15*60*1000});
        res.status(401).json({error:"Credenciais inválidas"});return;
      }
      attempts.delete(key);
      const token = randomBytes(32).toString("hex");
      await pool.query("INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')",[sha256(token),result.rows[0].id]);
      setCookie(res,token,8*60*60*1000);
      res.json({authenticated:true,email});
    } catch {res.status(503).json({error:"Autenticação indisponível"});}
  });
  router.post("/logout",async(req,res)=>{
    const token = cookieValue(req);
    if (token) {try{await pool.query("DELETE FROM admin_sessions WHERE token_hash=$1",[sha256(token)]);}catch{res.status(503).json({error:"Falha ao encerrar sessão"});return;}}
    setCookie(res,"",0);
    res.json({authenticated:false});
  });
  router.get("/me",requireSession(pool),(req,res)=>res.json({authenticated:true,user:res.locals.admin}));
  return router;
}
export function requireSession(pool: pg.Pool) {
  return async(req:Request,res:Response,next:NextFunction)=>{
    const token=cookieValue(req);
    if (!/^[a-f0-9]{64}$/.test(token)) {res.status(401).json({error:"Sessão necessária"});return;}
    try {
      const result=await pool.query("SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",[sha256(token)]);
      if (!result.rows.length || result.rows[0].email !== adminEmail) {res.status(401).json({error:"Sessão expirada"});return;}
      res.locals.admin=result.rows[0];next();
    } catch {res.status(503).json({error:"Sessão indisponível"});}
  };
}
