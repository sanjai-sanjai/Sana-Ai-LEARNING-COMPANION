
CREATE TABLE public.youtube_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  url text NOT NULL,
  title text,
  description text,
  thumbnail_url text,
  channel_title text,
  channel_id text,
  duration_seconds integer,
  published_at timestamptz,
  view_count bigint,
  language text,
  status text NOT NULL DEFAULT 'ready',
  error text,
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_videos TO authenticated;
GRANT ALL ON public.youtube_videos TO service_role;

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own youtube videos"
  ON public.youtube_videos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER youtube_videos_set_updated_at
  BEFORE UPDATE ON public.youtube_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX youtube_videos_user_recent_idx
  ON public.youtube_videos (user_id, last_opened_at DESC);
