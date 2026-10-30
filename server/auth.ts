import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.AIRSUL_ADMIN_API_TOKEN;
  if (!configured || configured.length < 32) { res.status(503).json({error:"Autenticação administrativa não configurada"}); return; }
  const authorization = req.get("authorization") || "";
  const candidate = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = Buffer.from(configured, "utf8");
  const received = Buffer.from(candidate, "utf8");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    res.status(401).json({error:"Não autorizado"}); return;
  }
  next();
}
