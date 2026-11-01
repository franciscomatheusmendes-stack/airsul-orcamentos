# Segurança administrativa

- Autorização no servidor restrita a francisco.matheusmendes@gmail.com; nenhuma rota pública retorna custos.
- Senhas scrypt com sal aleatório. Não há senha padrão, senha no Git ou token administrativo no frontend.
- Sessões opacas de 256 bits; somente SHA-256 do token fica no banco. Cookie HttpOnly, Secure em produção, SameSite=Strict, escopo /api/admin, duração de oito horas.
- Logout revoga a sessão no banco; falha de revogação não é apresentada como sucesso.
- Escritas exigem Origin exata e JSON; não há CORS entre origens. O frontend administrativo é servido pela própria API.
- Limites por IP para login, primeiro acesso e API; limites em memória, adequados apenas à instância única atual. Reinício zera contadores; escalabilidade exige armazenamento compartilhado.
- Consultas parametrizadas, validação de entradas, respostas privadas sem cache e cabeçalhos Helmet.
- ADMIN_ENABLED fecha o painel por padrão. ADMIN_SETUP_TOKEN fica somente no Render; formulário de primeiro acesso não aceita escolher outro email nem sobrescrever conta.
- Runtime usa a role SQL airsul_runtime: sem criação de bancos/roles ou bypass RLS. SELECT/INSERT nas tabelas da aplicação e DELETE somente em admin_sessions para logout. Não usa proprietário do banco.
- PDF exige sessão e consulta somente campos comerciais. Não contém custos, margem ou notas internas. Rascunhos não confirmam contratação.

Limitações conhecidas: ainda não há MFA, recuperação de senha, trilha de auditoria persistente ou limpeza programada das sessões expiradas. Expiração é sempre verificada nas consultas. Aprovação comercial e preços públicos não são automatizados.

Edição de cadastros: a role runtime recebe UPDATE apenas nas colunas name/unit/unit_cost de materials e name/phone/email de customers. A alteração de custos não recalcula orçamentos já salvos.
