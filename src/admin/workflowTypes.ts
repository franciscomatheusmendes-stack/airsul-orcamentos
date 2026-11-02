export type RequestDraft={customer:{id:string;name:string;phone:string;email:string|null};requestId:string;capacity:number|null;meters:string|null;kit:string;service:string};
export type ScheduleDraft={customerId:string;quoteId?:string;requestId?:string;serviceType?:string};
export const serviceLabels:Record<string,string>={installation:'Instalação',cleaning:'Limpeza do aparelho',maintenance:'Conserto / avaliação',removal:'Retirada do aparelho',help:'Precisa de orientação',visit:'Visita técnica'};
