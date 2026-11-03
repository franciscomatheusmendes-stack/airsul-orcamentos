# AirSul Orçamentos

Site público: https://airsul-orcamentos.onrender.com
Painel: https://airsul-orcamentos-api.onrender.com/admin
API: serviço airsul-orcamentos-api no workspace tea-d8vdrd3sq97s73866vfg.
Neon: projeto royal-brook-87944573, database airsul. Administrador único: francisco.matheusmendes@gmail.com.
Não alterar serviços ou dados do ClimaDesk.

## Fluxo do cliente

1. Escolher a necessidade, incluindo “Não sei, preciso de orientação”.
2. Informar apenas os detalhes conhecidos. Kit, capacidade e distância podem ficar a confirmar. Estimador de BTU opcional.
3. Informar nome, WhatsApp com DDD e cidade/bairro.
4. Receber protocolo após confirmação do registro no banco.
5. Opcionalmente, continuar a conversa no WhatsApp com o protocolo preenchido.

Sem login do cliente. O formulário não publica preços. Se o registro não puder ser confirmado, oferece WhatsApp direto e não exibe um protocolo falso. Uma repetição com o mesmo identificador e conteúdo é idempotente. O mesmo identificador com conteúdo diferente é rejeitado.

## Painel

- Solicitações: lista, detalhes, filtro, situação, abertura manual do WhatsApp, conversão em cliente, preparação de orçamento e visita.
- Clientes e materiais: cadastro, busca e edição.
- Orçamentos: cálculo, gravação, edição de rascunhos/em revisão, duplicação e situação comercial. A versão anterior fica no histórico interno; alterações concorrentes são rejeitadas. Aprovados/enviados/aceitos devem ser duplicados antes de alterar a composição.
- Modelos: salvar e reutilizar composição, mão de obra e condições; sem cliente, pedido ou observações privadas. Os materiais são recalculados com o catálogo atual ao calcular/salvar.
- PDF: identidade AirSul, cliente, itens, valor proposto, validade, prazo e pagamento. Sem custos, margens ou notas internas.
- Agenda: visita e serviços, cliente e orçamento vinculados, duração, detecção de sobreposição, cancelamento e conclusão. Horários de Brasília (UTC-3). Não envia confirmação ao cliente automaticamente.

## Desenvolvimento

Node 22. `npm ci`, `npm test`, `npm run build`, `npm run build:api`.
`npm run dev:api` inicia desenvolvimento; `npm run start:api` inicia a API compilada.
O painel é servido na mesma origem da API. Compile com VITE_ADMIN_PANEL=true somente para esse serviço. O site estático público usa o valor padrão false.

## Publicação e segredos

Render gerenciado diretamente, sem Blueprint concorrente. Build da API: `npm ci --include=dev && npm run build && npm run build:api`. Start: `npm run start:api`.
Variáveis do servidor: DATABASE_URL (segredo, role airsul_runtime, pooled, TLS verify-full), ADMIN_ORIGIN, ADMIN_ENABLED=true, NODE_ENV=production, VITE_ADMIN_PANEL=true. PUBLIC_ORIGIN é opcional e assume a URL oficial do site público. CORS permite apenas POST/OPTIONS do formulário e não habilita credenciais entre origens.
VITE_API_ORIGIN é uma URL pública opcional para o frontend; o padrão é a URL oficial da API. Nunca colocar segredos em VITE_*.
Aplicar `db/003_service_workflow.sql` com o usuário mantenedor primeiro em uma branch isolada, validar e depois aplicar no banco AirSul de produção. A migração é aditiva e compatível com a versão anterior.

## Autenticação

Conta única provisionada. /setup não redefine uma conta já existente. Senha definida pelo usuário no navegador; nunca pedir senha no chat. ADMIN_SETUP_TOKEN serve apenas à primeira criação e pode ser removido após o provisionamento. Ainda não há recuperação automática de senha ou MFA.

## Testes

Os testes de unidade/HTTP básicos rodam com `npm test`. Integrações exigem branch Neon isolada e são ignoradas por padrão. `tests/workflow.integration.test.ts` cobre o fluxo comercial e permissões da role runtime. Nunca executar os testes de integração na produção.
O runner `scripts/run-isolated-workflow-tests.mjs` recebe a conexão somente por entrada padrão protegida, não grava segredos em arquivo e exige o hostname independente da branch como primeiro argumento. Modo QA depende de script temporário externo ao repositório. Não registrar a conexão em comandos, logs ou histórico.
Metodologia do estimador e seus limites em docs/PUBLIC_CAPACITY.md.

### PDF e envio ao cliente
No painel, salve o orçamento e use a área PDF para o cliente. O documento inclui a marca AirSul, dados do cliente, descrição pública do serviço, materiais, total e condições; custos, margem e observações internas não são impressos. A descrição pública fica em pricing_input.serviceDescription, com limite de 2.000 caracteres e compatibilidade com registros antigos, sem migração de banco.
Enviar PDF prepara o arquivo. Em aparelhos que permitem compartilhar arquivos, um segundo toque em Compartilhar PDF abre o menu do sistema (escolha WhatsApp e o destinatário). Nos demais, o arquivo é baixado para anexar manualmente. WhatsApp do cliente abre uma conversa com mensagem preenchida e não anexa o PDF. Nenhuma dessas ações altera a situação para enviado automaticamente. O PDF exige sessão administrativa e informa X-Quote-Version para evitar preparar uma versão diferente da exibida.
