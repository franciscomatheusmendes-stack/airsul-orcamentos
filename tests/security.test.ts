import { it,expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import type pg from "pg";
it("mantém painel fechado por padrão e trata JSON malformado",async()=>{
  delete process.env.ADMIN_ENABLED;
  const pool={query:async()=>({rows:[]})} as unknown as pg.Pool;
  const app=createApp(pool);
  expect((await request(app).get("/api/admin/me")).status).toBe(503);
  expect((await request(app).get("/admin")).status).toBe(503);
  expect((await request(app).post("/api/setup").set("Content-Type","application/json").send("{")).status).toBe(400);
});
