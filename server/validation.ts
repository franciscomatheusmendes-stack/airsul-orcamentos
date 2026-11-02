export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isId=(value:unknown):value is string=>typeof value==='string'&&uuid.test(value);
export const text=(value:unknown,max:number,min=0):value is string=>typeof value==='string'&&value.trim().length>=min&&value.length<=max;
export const phone=(value:unknown):value is string=>typeof value==='string'&&/^[+()\d\s-]{8,30}$/.test(value)&&value.replace(/\D/g,'').length>=8;
export const services=['installation','cleaning','maintenance','removal','help'];
