-- Migração aditiva exclusiva AirSul. Aplicar primeiro em branch de teste.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pricing_input jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validity_days integer NOT NULL DEFAULT 15 CHECK (validity_days BETWEEN 1 AND 90);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS execution_deadline text NOT NULL DEFAULT '';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT '';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS service_requests (
 id uuid PRIMARY KEY, payload_hash text NOT NULL,
 customer_name text NOT NULL, phone text NOT NULL, location text NOT NULL,
 service text NOT NULL CHECK(service IN ('installation','cleaning','maintenance','removal','help')),
 capacity_btu integer, has_kit text NOT NULL DEFAULT 'unknown' CHECK(has_kit IN ('yes','no','unknown')),
 line_length_m numeric(8,2), notes text NOT NULL DEFAULT '', estimate jsonb,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','quoted','scheduled','completed','cancelled')),
 customer_id uuid REFERENCES customers(id), quote_id uuid REFERENCES quotes(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_status_created_idx ON service_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS quote_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES quotes(id),
 action text NOT NULL, before_snapshot jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quote_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 pricing_input jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id),
 quote_id uuid REFERENCES quotes(id), request_id uuid REFERENCES service_requests(id),
 starts_at timestamptz NOT NULL, duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 480),
 service_type text NOT NULL CHECK(service_type IN ('visit','installation','cleaning','maintenance','removal')),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments(starts_at) WHERE status='scheduled';
GRANT SELECT,INSERT,UPDATE ON service_requests,appointments TO airsul_runtime;
GRANT SELECT,INSERT ON quote_events,quote_templates TO airsul_runtime;
GRANT UPDATE ON quotes TO airsul_runtime;
GRANT DELETE ON quote_items TO airsul_runtime;
