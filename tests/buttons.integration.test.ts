import {it,expect} from "vitest";
import request from "supertest";
import pg from "pg";
import {randomBytes,createHash} from "node:crypto";
import {createApp} from "../server/app";
it.skipIf(process.env.AIRSUL_INTEGRATION_TEST!=="buttons-isolated-branch")("edita cadastros, preserva snapshots e protege os botões da API",async()=>{
 if(!process.env.DATABASE_URL||!process.env.AIRSUL_TEST_HOST||new URL(process.env.DATABASE_URL).hostname!==process.env.AIRSUL_TEST_HOST)throw Error("Exige banco isolado");
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2});
 process.env.ADMIN_ENABLED="true";process.env.ADMIN_ORIGIN="https://airsul-test.invalid";
 const app=createApp(pool);
 try{
  expect((await pool.query("SELECT current_user")).rows[0].current_user).toBe("airsul_runtime");
  const admin=(await pool.query("SELECT id FROM admin_users WHERE email=$1",["francisco.matheusmendes@gmail.com"])).rows[0];
  const token=randomBytes(32).toString("hex");
  await pool.query("INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[createHash("sha256").update(token).digest("hex"),admin.id]);
  const cookie="airsul_session="+token;
  const post=(url:string,body:unknown)=>request(app).post(url).set("Origin",process.env.ADMIN_ORIGIN!).set("Cookie",cookie).send(body);
  const put=(url:string,body:unknown)=>request(app).put(url).set("Origin",process.env.ADMIN_ORIGIN!).set("Cookie",cookie).send(body);
  const material=await post("/api/admin/materials",{name:"Regressão botões",unit:"m",unitCost:25.5});expect(material.status).toBe(201);
  const mid=material.body.material.id;
  expect((await put("/api/admin/materials/"+mid,{name:"Regressão editado",unit:"un",unitCost:30})).status).toBe(200);
  expect((await put("/api/admin/materials/"+mid,{name:"Inválido",unit:"un",unitCost:-1})).status).toBe(400);
  const customer=await post("/api/admin/customers",{name:"Cliente regressão",phone:"51999999999",email:""});expect(customer.status).toBe(201);
  const cid=customer.body.customer.id;
  expect((await put("/api/admin/customers/"+cid,{name:"Cliente regressão editado",phone:"51988888888",email:"teste@example.com"})).status).toBe(200);
  expect((await put("/api/admin/customers/invalid",{name:"Cliente regressão",phone:"51999999999",email:""})).status).toBe(400);
  expect((await request(app).put("/api/admin/customers/"+cid).set("Origin",process.env.ADMIN_ORIGIN!).send({})).status).toBe(401);
  expect((await request(app).put("/api/admin/materials/"+mid).set("Cookie",cookie).set("Origin","https://evil.invalid").send({})).status).toBe(403);
  const input={lines:[{materialId:mid,quantity:2,suppliedBy:"airsul"}],laborCents:20000,travelCents:0,overheadCents:0,marginPercent:25,supplyMode:"airsul",capacityBtu:12000,lineLengthM:3,notes:"Nota confidencial"};
  const preview=await post("/api/admin/quotes/preview",input);expect(preview.status).toBe(200);expect(preview.body.proposedPriceCents).toBe(34667);
  expect((await post("/api/admin/quotes",input)).status).toBe(400);
  const saved=await post("/api/admin/quotes",{...input,customerId:cid});expect(saved.status).toBe(201);
  await put("/api/admin/materials/"+mid,{name:"Regressão custo alterado",unit:"un",unitCost:90});
  const snapshot=(await pool.query("SELECT internal_cost,proposed_price FROM quotes WHERE id=$1",[saved.body.quoteId])).rows[0];expect(snapshot.internal_cost).toBe("260.00");expect(snapshot.proposed_price).toBe("346.67");
  const pdf=await request(app).get("/api/admin/quotes/"+saved.body.quoteId+"/pdf").set("Cookie",cookie);expect(pdf.status).toBe(200);expect(pdf.headers["content-type"]).toContain("application/pdf");
  expect((await post("/api/admin/logout",{})).status).toBe(200);
  expect((await put("/api/admin/materials/"+mid,{name:"Bloqueado",unit:"un",unitCost:1})).status).toBe(401);
 }finally{await pool.end();}
},60000);
