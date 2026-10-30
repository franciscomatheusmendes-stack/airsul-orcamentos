# AirSul Orçamentos

Aplicativo independente para simulação e gestão de orçamentos de instalação de ar-condicionado da AirSul Climatização (Capão da Canoa e Litoral Norte/RS).

## Estado

- Banco Neon PostgreSQL criado em São Paulo, projeto `royal-brook-87944573`, banco `airsul`.
- Tabelas iniciais: `customers`, `materials`, `quotes`, `quote_items`.
- Frontend React + Vite preparado no pacote inicial, ainda pendente de importação.
- Backend, autenticação, motor de precificação, PDF e deploy ainda pendentes.

## Segurança

Nunca publicar `DATABASE_URL`, tokens ou senhas. A conexão PostgreSQL deve existir apenas no backend. Os custos e margens não devem ser expostos ao público. O projeto não compartilha recursos com o ClimaDesk.

## Próxima etapa

Importar os arquivos do pacote inicial, configurar ambiente local e desenvolver backend TypeScript, autenticação, CRUD de materiais, precificação e testes. Não divulgar preços sem aprovação.
