
-- study_call_reminders
CREATE TABLE public.study_call_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  phone_e164 text NOT NULL,
  study_topic text,
  motivation_style text NOT NULL DEFAULT 'friendly_coach',
  scheduled_at timestamptz NOT NULL,
  repeat_type text NOT NULL DEFAULT 'once' CHECK (repeat_type IN ('once','daily','weekly')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','calling','done','missed','cancelled','snoozed')),
  last_called_at timestamptz,
  next_call_at timestamptz,
  miss_count int NOT NULL DEFAULT 0,
  twilio_call_sid text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX study_call_reminders_user_idx ON public.study_call_reminders(user_id);
CREATE INDEX study_call_reminders_due_idx ON public.study_call_reminders(scheduled_at) WHERE status = 'scheduled';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_call_reminders TO authenticated;
GRANT ALL ON public.study_call_reminders TO service_role;

ALTER TABLE public.study_call_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminders" ON public.study_call_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER study_call_reminders_set_updated_at
  BEFORE UPDATE ON public.study_call_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- call_sessions
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES public.study_call_reminders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_call_sid text UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  mood text,
  topics text[] NOT NULL DEFAULT '{}',
  promises jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_taken text,
  follow_up_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed','no_answer','busy','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_sessions_user_idx ON public.call_sessions(user_id);
CREATE INDEX call_sessions_reminder_idx ON public.call_sessions(reminder_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own call sessions" ON public.call_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER call_sessions_set_updated_at
  BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Store user's default phone number on profile if not already there
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;
