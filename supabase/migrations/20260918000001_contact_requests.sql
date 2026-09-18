-- Contact requests from the myGPC chatbot "Güntner Sales kontaktieren" form.
-- Submitted by visitors; read by admins only via service-role.

CREATE TABLE IF NOT EXISTS contact_requests (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text,
  email         text        NOT NULL,
  message       text,
  template_names text[]     DEFAULT '{}',
  context       jsonb,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- No public access — service-role only (backend API).
CREATE POLICY "deny_all_public" ON contact_requests
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false);
