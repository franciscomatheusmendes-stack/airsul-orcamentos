# Segurança do painel administrativo

O catálogo de materiais é acessível apenas na API com `Authorization: Bearer <token>`.

**Estado atual:** autenticação provisória para integração técnica; não é login de usuários nem sessão segura para uso no navegador. Não colocar o token no código React, em variáveis `VITE_*`, no localStorage, nem em URLs. Não publicar o painel antes de implementar autenticação por usuário e permissões.

No servidor configure `DATABASE_URL` e `AIRSUL_ADMIN_API_TOKEN` (segredo aleatório com 32 ou mais caracteres). Nunca versionar valores reais.

Rotas privadas: `GET /api/admin/materials`, `POST /api/admin/materials`. A API usa consultas parametrizadas, validação de entradas e não retorna custos nas rotas públicas. Adicionar rate limit, auditoria, gestão de usuários e proteção de sessão antes da publicação.
