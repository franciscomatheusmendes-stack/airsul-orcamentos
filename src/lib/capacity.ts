export const capacities = [9000, 12000, 18000, 24000, 30000, 36000] as const;
export type CapacityInput = {
  width: number;
  length: number;
  people: number;
  electronics: number;
  directSun: boolean;
};
export type CapacityEstimate = CapacityInput & {
  area: number;
  estimatedBtu: number;
  suggestedBtu: number | null;
};

/** Referência simplificada residencial. Não substitui cálculo de carga térmica.
 * Consul: 600 BTU/h por m² (800 com sol direto), +600 por pessoa além da
 * primeira e +600 por eletrônico em uso. Ver docs/PUBLIC_CAPACITY.md.
 */
export function estimateCapacity(input: CapacityInput): CapacityEstimate {
  if (!Number.isFinite(input.width) || input.width < 1 || input.width > 20 ||
      !Number.isFinite(input.length) || input.length < 1 || input.length > 20 ||
      !Number.isInteger(input.people) || input.people < 1 || input.people > 20 ||
      !Number.isInteger(input.electronics) || input.electronics < 0 || input.electronics > 20 ||
      typeof input.directSun !== "boolean") {
    throw new Error("Confira as medidas (1 a 20 m), pessoas (1 a 20) e eletrônicos (0 a 20).");
  }
  const area = Math.round(input.width * input.length * 100) / 100;
  const estimatedBtu = Math.ceil(area * (input.directSun ? 800 : 600) + Math.max(0,input.people-1)*600 + input.electronics*600);
  const suggestedBtu = capacities.find(capacity => capacity >= estimatedBtu) ?? null;
  return {...input, area, estimatedBtu, suggestedBtu};
}
