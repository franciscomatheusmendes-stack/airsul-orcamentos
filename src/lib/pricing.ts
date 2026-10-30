export type SupplyMode = "airsul" | "client" | "partial";
export type QuoteItem = { description: string; quantity: number; unitCostCents: number; suppliedBy: "airsul" | "client" };
export type QuoteInput = { items: QuoteItem[]; laborCents: number; travelCents: number; overheadCents: number; marginPercent: number; supplyMode: SupplyMode };
export type QuoteResult = { materialCostCents: number; laborCents: number; travelCents: number; overheadCents: number; totalCostCents: number; proposedPriceCents: number; grossProfitCents: number };
function integer(value: number, label: string) { if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + " deve ser um inteiro não negativo em centavos"); return value; }
export function calculateQuote(input: QuoteInput): QuoteResult {
  if (!Array.isArray(input.items)) throw new Error("Itens inválidos");
  if (!Number.isFinite(input.marginPercent) || input.marginPercent < 0 || input.marginPercent >= 100) throw new Error("Margem deve estar entre 0 e 100% (exclusivo)");
  if (!["airsul","client","partial"].includes(input.supplyMode)) throw new Error("Modalidade inválida");
  let materialCostCents = 0;
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0 || !Number.isSafeInteger(item.unitCostCents) || item.unitCostCents < 0) throw new Error("Item inválido");
    if (!["airsul","client"].includes(item.suppliedBy)) throw new Error("Fornecedor inválido");
    if (input.supplyMode === "airsul" && item.suppliedBy !== "airsul") throw new Error("Materiais devem ser fornecidos pela AirSul");
    if (input.supplyMode === "client" && item.suppliedBy !== "client") throw new Error("Materiais devem ser fornecidos pelo cliente");
    if (item.suppliedBy === "airsul") materialCostCents += Math.round(item.quantity * item.unitCostCents);
  }
  integer(materialCostCents, "Custo dos materiais");
  const laborCents = integer(input.laborCents,"Mão de obra");
  const travelCents = integer(input.travelCents,"Deslocamento");
  const overheadCents = integer(input.overheadCents,"Despesas");
  const totalCostCents = integer(materialCostCents + laborCents + travelCents + overheadCents,"Custo total");
  const proposedPriceCents = Math.round(totalCostCents / (1 - input.marginPercent / 100));
  integer(proposedPriceCents,"Preço");
  return { materialCostCents, laborCents, travelCents, overheadCents, totalCostCents, proposedPriceCents, grossProfitCents: proposedPriceCents - totalCostCents };
}
