// Recebe a conexão isolada por stdin, sem gravar credenciais ou usar argumentos.
import {spawn} from 'node:child_process';
process.stdin.setEncoding('utf8');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
let input='';
process.stdout.write('Teste isolado pronto para receber entrada protegida.\n');
process.stdin.on('data',chunk=>{
 if(chunk.includes('\u0003'))process.exit(1);
 input+=chunk;
 if(!input.trim().endsWith('}'))return;
 process.stdin.pause();
 try{
  const {url,mode}=JSON.parse(input.trim());input='';
  const parsed=new URL(url);
  const expectedHost=process.argv[2];
  if(!expectedHost||parsed.hostname!==expectedHost||!parsed.hostname.endsWith('.neon.tech'))throw Error('Conexão de teste inválida');
  const args=mode==='qa'?['../qa-airsul-workflow.cjs']:['node_modules/vitest/vitest.mjs','run','tests/workflow.integration.test.ts'];
  const child=spawn(process.execPath,args,{stdio:['ignore','inherit','inherit'],env:{...process.env,DATABASE_URL:url,AIRSUL_TEST_HOST:parsed.hostname,AIRSUL_INTEGRATION_TEST:'workflow-isolated-branch'}});
  child.on('exit',code=>process.exit(code??1));
  child.on('error',()=>{console.error('Não foi possível iniciar o teste.');process.exit(1);});
 }catch{console.error('Entrada de teste inválida.');process.exit(1);}
});
