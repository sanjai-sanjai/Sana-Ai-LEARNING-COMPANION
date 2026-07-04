
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transcript_source text,
  ADD COLUMN IF NOT EXISTS chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcript_error text;

CREATE TABLE IF NOT EXISTS public.youtube_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  video_row_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  start_seconds integer NOT NULL DEFAULT 0,
  end_seconds integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_row_id, chunk_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_chunks TO authenticated;
GRANT ALL ON public.youtube_chunks TO service_role;

ALTER TABLE public.youtube_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own youtube chunks"
  ON public.youtube_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS youtube_chunks_video_idx
  ON public.youtube_chunks (video_row_id, chunk_index);

CREATE INDEX IF NOT EXISTS youtube_chunks_embedding_idx
  ON public.youtube_chunks USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_youtube_chunks(
  query_embedding vector(1536),
  target_user_id uuid,
  target_video_ids text[],
  match_count integer DEFAULT 6
)
RETURNS TABLE (
  video_id text,
  chunk_index integer,
  start_seconds integer,
  end_seconds integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    c.video_id,
    c.chunk_index,
    c.start_seconds,
    c.end_seconds,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.youtube_chunks c
  WHERE c.user_id = target_user_id
    AND c.video_id = ANY(target_video_ids)
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
