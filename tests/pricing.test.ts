import { describe, it, expect } from "vitest";
import { calculateQuote } from "../src/lib/pricing";
describe("calculateQuote", () => {
  it("calcula margem sobre preço de venda, não markup", () => {
    const result = calculateQuote({ supplyMode:"airsul", items:[{description:"Cobre",quantity:2,unitCostCents:5000,suppliedBy:"airsul"}],laborCents:20000,travelCents:0,overheadCents:0,marginPercent:25 });
    expect(result.totalCostCents).toBe(30000);
    expect(result.proposedPriceCents).toBe(40000);
  });
  it("não cobra materiais fornecidos pelo cliente", () => {
    const result = calculateQuote({ supplyMode:"client",items:[{description:"Cobre",quantity:2,unitCostCents:5000,suppliedBy:"client"}],laborCents:20000,travelCents:0,overheadCents:0,marginPercent:0 });
    expect(result.materialCostCents).toBe(0);
    expect(result.proposedPriceCents).toBe(20000);
  });
  it("rejeita margem impossível", () => {
    expect(() => calculateQuote({supplyMode:"partial",items:[],laborCents:0,travelCents:0,overheadCents:0,marginPercent:100})).toThrow();
  });
});
