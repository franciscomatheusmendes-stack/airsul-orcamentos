-- Apenas AirSul. Permite editar o catálogo e os dados comerciais do cliente.
-- Não concede UPDATE em sessões, usuários ou orçamentos salvos.
GRANT UPDATE (name, unit, unit_cost) ON materials TO airsul_runtime;
GRANT UPDATE (name, phone, email) ON customers TO airsul_runtime;
