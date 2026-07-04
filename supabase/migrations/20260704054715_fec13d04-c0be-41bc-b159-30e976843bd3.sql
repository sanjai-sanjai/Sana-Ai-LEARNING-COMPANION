
-- Study notes table
CREATE TABLE public.study_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid,
  message_id text NOT NULL,
  topic text,
  style text NOT NULL DEFAULT 'ruled',
  structured jsonb NOT NULL,
  markdown text,
  raw_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_notes TO authenticated;
GRANT ALL ON public.study_notes TO service_role;

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study notes"
  ON public.study_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX study_notes_user_thread_idx ON public.study_notes (user_id, thread_id);

CREATE TRIGGER study_notes_set_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Preferences: study view toggle + chosen style
ALTER TABLE public.onboarding_preferences
  ADD COLUMN IF NOT EXISTS study_view_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_style text NOT NULL DEFAULT 'ruled';
