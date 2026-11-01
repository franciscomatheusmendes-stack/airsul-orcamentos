import {describe,it,expect} from "vitest";
import {estimateCapacity} from "../src/lib/capacity";
const room={width:3,length:4,people:1,electronics:0,directSun:false};
describe("estimativa residencial de capacidade",()=>{
 it("usa área e arredonda para uma capacidade sem subdimensionar a referência",()=>{const r=estimateCapacity(room);expect(r.area).toBe(12);expect(r.estimatedBtu).toBe(7200);expect(r.suggestedBtu).toBe(9000);});
 it("considera sol, pessoas adicionais e eletrônicos",()=>{const r=estimateCapacity({...room,directSun:true,people:3,electronics:2});expect(r.estimatedBtu).toBe(12000);expect(r.suggestedBtu).toBe(12000);});
 it("não limita indevidamente um ambiente acima de 36000 BTU/h",()=>{const r=estimateCapacity({...room,width:10,length:10,directSun:true});expect(r.estimatedBtu).toBe(80000);expect(r.suggestedBtu).toBeNull();});
 it("trata dimensões decimais",()=>{const r=estimateCapacity({...room,width:3.5,length:4});expect(r.area).toBe(14);expect(r.estimatedBtu).toBe(8400);});
 it.each([{width:NaN},{length:0},{width:Infinity},{people:0},{people:1.5},{electronics:-1}])("rejeita dados inválidos: %j",patch=>{expect(()=>estimateCapacity({...room,...patch})).toThrow();});
});
