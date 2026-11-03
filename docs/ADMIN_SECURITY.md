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

Fluxo comercial (migração 003):
- Registro público apenas por POST JSON com Origin permitida, sem cookies/CORS de credenciais. Limite de 15 tentativas por hora/IP. Não há consulta pública das solicitações.
- O protocolo só é devolvido após persistência confirmada. O identificador de envio e o hash do conteúdo impedem duplicações por repetição da mesma submissão. A resposta não retorna dados pessoais do pedido.
- Nome, telefone, localização e texto têm validação e limites de tamanho. Estimativas têm estrutura e intervalos validados, sem serem tratadas como dimensão técnica definitiva.
- Novas rotas administrativas continuam exigindo sessão e Origin nas escritas. A role runtime pode atualizar solicitações, agenda e orçamentos, inserir modelos/eventos e novas revisões de itens pela API de edição protegida. Não recebe DELETE em quote_items; as revisões anteriores são preservadas.
- Orçamentos têm controle de versão e histórico anterior em quote_events. Não se edita composição de aprovado/enviado/aceito/recusado; usa-se duplicação. Não se muda o cliente de orçamento vinculado a pedido sem duplicar.
- A agenda serializa a criação e rejeita sobreposição de serviços agendados. Cancelamentos e conclusões são preservados no banco, sem exclusão de registros.
- Botões de WhatsApp abrem conversas para ação do administrador/cliente; não há envio automático de mensagens.
