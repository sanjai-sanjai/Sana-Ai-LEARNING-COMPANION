
CREATE OR REPLACE FUNCTION public.match_youtube_chunks(
  query_embedding vector(1536),
  target_user_id uuid,
  target_video_ids text[],
  match_count integer DEFAULT 6,
  min_start_seconds integer DEFAULT NULL,
  max_end_seconds integer DEFAULT NULL
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
    AND (min_start_seconds IS NULL OR c.end_seconds >= min_start_seconds)
    AND (max_end_seconds IS NULL OR c.start_seconds <= max_end_seconds)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
