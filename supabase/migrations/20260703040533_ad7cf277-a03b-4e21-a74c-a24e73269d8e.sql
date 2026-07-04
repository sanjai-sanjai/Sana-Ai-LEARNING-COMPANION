
-- 1. Extend revision_sets
ALTER TABLE public.revision_sets
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📘',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS revision_sets_thread_id_uniq
  ON public.revision_sets(thread_id) WHERE thread_id IS NOT NULL;

-- 2. Extend flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS bookmarked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS hint TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- 3. Quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  set_id UUID NOT NULL REFERENCES public.revision_sets(id) ON DELETE CASCADE,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL DEFAULT 0,
  explanation TEXT,
  code_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz questions" ON public.quiz_questions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Weak areas
CREATE TABLE IF NOT EXISTS public.weak_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  set_id UUID NOT NULL REFERENCES public.revision_sets(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  accuracy_pct INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weak_areas TO authenticated;
GRANT ALL ON public.weak_areas TO service_role;

ALTER TABLE public.weak_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weak areas" ON public.weak_areas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER weak_areas_updated_at BEFORE UPDATE ON public.weak_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
