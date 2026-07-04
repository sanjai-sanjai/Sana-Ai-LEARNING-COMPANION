
-- Courses
CREATE TABLE public.classroom_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  description TEXT,
  room TEXT,
  owner_id TEXT,
  course_state TEXT,
  alternate_link TEXT,
  enrollment_code TEXT,
  google_created_at TIMESTAMPTZ,
  google_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_courses TO authenticated;
GRANT ALL ON public.classroom_courses TO service_role;
ALTER TABLE public.classroom_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own classroom courses" ON public.classroom_courses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER classroom_courses_set_updated_at BEFORE UPDATE ON public.classroom_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX classroom_courses_user_idx ON public.classroom_courses(user_id);

-- Coursework (assignments + materials)
CREATE TABLE public.classroom_coursework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_course_id TEXT NOT NULL,
  google_coursework_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT,
  state TEXT,
  alternate_link TEXT,
  max_points NUMERIC,
  due_at TIMESTAMPTZ,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  google_created_at TIMESTAMPTZ,
  google_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_coursework_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_coursework TO authenticated;
GRANT ALL ON public.classroom_coursework TO service_role;
ALTER TABLE public.classroom_coursework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own coursework" ON public.classroom_coursework
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER classroom_coursework_set_updated_at BEFORE UPDATE ON public.classroom_coursework
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX classroom_coursework_user_course_idx ON public.classroom_coursework(user_id, google_course_id);

-- Announcements
CREATE TABLE public.classroom_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_course_id TEXT NOT NULL,
  google_announcement_id TEXT NOT NULL,
  text TEXT,
  state TEXT,
  alternate_link TEXT,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  google_created_at TIMESTAMPTZ,
  google_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_announcement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_announcements TO authenticated;
GRANT ALL ON public.classroom_announcements TO service_role;
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own announcements" ON public.classroom_announcements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER classroom_announcements_set_updated_at BEFORE UPDATE ON public.classroom_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX classroom_announcements_user_course_idx ON public.classroom_announcements(user_id, google_course_id);

-- Coursework Materials (posts of type material, no submissions)
CREATE TABLE public.classroom_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_course_id TEXT NOT NULL,
  google_material_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  state TEXT,
  alternate_link TEXT,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  google_created_at TIMESTAMPTZ,
  google_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_materials TO authenticated;
GRANT ALL ON public.classroom_materials TO service_role;
ALTER TABLE public.classroom_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own materials" ON public.classroom_materials
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER classroom_materials_set_updated_at BEFORE UPDATE ON public.classroom_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX classroom_materials_user_course_idx ON public.classroom_materials(user_id, google_course_id);
