import {expect,it} from 'vitest';
import {parsePricing,InputError} from '../server/quoteEngine';
const input={lines:[],laborCents:10000,travelCents:0,overheadCents:0,marginPercent:25,supplyMode:'airsul',capacityBtu:12000,lineLengthM:3};
it('preserva a descrição pública e mantém compatibilidade com propostas antigas',()=>{
 expect(parsePricing(input).serviceDescription).toBe('');
 const result=parsePricing({...input,serviceDescription:'Instalação com testes de funcionamento.',notes:'Nota privada'});
 expect(result.serviceDescription).toBe('Instalação com testes de funcionamento.');expect(result.notes).toBe('Nota privada');
 expect(()=>parsePricing({...input,serviceDescription:'x'.repeat(2001)})).toThrow(InputError);
 expect(()=>parsePricing({...input,serviceDescription:{text:'inválido'}})).toThrow(InputError);
});
