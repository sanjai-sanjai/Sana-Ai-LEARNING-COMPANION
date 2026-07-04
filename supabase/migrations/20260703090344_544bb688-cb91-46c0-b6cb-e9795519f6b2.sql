
CREATE TABLE public.classroom_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  google_sub TEXT,
  google_email TEXT,
  google_name TEXT,
  google_picture TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_connections TO authenticated;
GRANT ALL ON public.classroom_connections TO service_role;

ALTER TABLE public.classroom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own classroom connection"
  ON public.classroom_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER classroom_connections_set_updated_at
  BEFORE UPDATE ON public.classroom_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
