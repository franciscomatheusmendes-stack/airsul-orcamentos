# AirSul Orçamentos

Formulário público independente para solicitar instalações pelo WhatsApp e painel privado de orçamentos.

## Serviços

- Público: https://airsul-orcamentos.onrender.com
- API e painel: serviço `airsul-orcamentos-api`, no workspace `tea-d8vdrd3sq97s73866vfg`.
- Neon: projeto `royal-brook-87944573`, database `airsul`.
- Administrador exclusivo: francisco.matheusmendes@gmail.com.

O ClimaDesk não integra este projeto. Não alterar seus recursos.

## Desenvolvimento e validação

Node 22. Execute `npm ci`, `npm test`, `npm run build` e `npm run build:api`.
`npm run dev:api` inicia a API; `npm run start:api` inicia o JavaScript compilado.
Para compilar o painel, defina `VITE_ADMIN_PANEL=true`. O serviço estático público não deve ter essa variável habilitada. O painel é servido na mesma origem da API e usa URLs relativas; não requer cookies entre domínios ou CORS.

## Publicação

Configuração de produção gerenciada diretamente no Render, sem Blueprint concorrente.
API: build `npm ci --include=dev && npm run build && npm run build:api`; start `npm run start:api`; Node 22; plano free; região Virginia.
Variáveis: `DATABASE_URL` (segredo, role airsul_runtime, TLS verify-full, pooled), `ADMIN_ORIGIN` (URL exata da API, sem barra final), `ADMIN_ENABLED`, `ADMIN_SETUP_TOKEN` (segredo aleatório de 64 caracteres), `VITE_ADMIN_PANEL=true`, `NODE_ENV=production`.
O endpoint `/api/health` verifica o banco. Se `ADMIN_ENABLED` não for `true`, os endpoints administrativos permanecem fechados. `/setup` continua disponível para primeiro acesso protegido pelo segredo.

## Primeiro acesso

1. Abra Environment do serviço AirSul API no Render e copie o valor de `ADMIN_SETUP_TOKEN`.
2. Abra `https://airsul-orcamentos-api.onrender.com/setup` e insira o código no campo protegido.
3. Defina e confirme uma senha exclusiva com pelo menos 14 caracteres. Não envie a senha pelo chat.
4. Entre em `/admin` com o email exclusivo acima e a senha criada.

O provisionamento só funciona enquanto não existir administrador. Usa transação e lock consultivo para impedir duas criações simultâneas. Não permite redefinir senha existente. Após criar a conta, pode-se remover o código do Render. Ainda não há recuperação automática de senha; uma recuperação exige procedimento administrativo separado e revogação de sessões.

## Funcionalidades

Cadastro, busca, listagem e edição de clientes e materiais; simulação interna com margem sobre venda; fornecimento AirSul, cliente ou parcial; gravação transacional de rascunhos; PDF autenticado com cliente, itens e valor proposto. Custos, margens e observações internas não são incluídos no PDF. A exclusão de cadastros, as aprovações e o acompanhamento comercial permanecem para a próxima evolução. O acesso público do cliente continua pelo WhatsApp, sem login.

## Teste integrado

`tests/admin.integration.test.ts` exige explicitamente uma branch Neon isolada e vazia. Não apontar para produção. Variáveis em arquivo ignorado `.env.integration`: `DATABASE_URL`, `AIRSUL_TEST_HOST` e `AIRSUL_INTEGRATION_TEST=isolated-neon-branch`. Para role restrita, forneça também `AIRSUL_TEST_MAINTENANCE_URL` com o usuário mantenedor exclusivamente da branch, usado para simular expiração.
Execute `node --env-file=.env.integration node_modules/vitest/vitest.mjs run tests/admin.integration.test.ts`.
O teste cria dados apenas na branch isolada; para repeti-lo, use uma branch nova e vazia. Nunca redefina produção para executar testes.
