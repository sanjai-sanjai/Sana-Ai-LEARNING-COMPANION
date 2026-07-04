
CREATE EXTENSION IF NOT EXISTS vector;

-- Source documents (one per Drive/Docs/Slides file)
CREATE TABLE public.classroom_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_course_id TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'coursework' | 'material' | 'announcement'
  source_id TEXT NOT NULL,   -- google_coursework_id / material_id / announcement_id
  drive_file_id TEXT NOT NULL,
  mime_type TEXT,
  title TEXT NOT NULL,
  alternate_link TEXT,
  content_length INTEGER,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'indexed' | 'skipped' | 'error'
  error TEXT,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, drive_file_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_documents TO authenticated;
GRANT ALL ON public.classroom_documents TO service_role;
ALTER TABLE public.classroom_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own classroom documents" ON public.classroom_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER classroom_documents_set_updated_at BEFORE UPDATE ON public.classroom_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX classroom_documents_user_course_idx ON public.classroom_documents(user_id, google_course_id);

-- Embedding chunks
CREATE TABLE public.classroom_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.classroom_documents(id) ON DELETE CASCADE,
  google_course_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  token_estimate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_chunks TO authenticated;
GRANT ALL ON public.classroom_chunks TO service_role;
ALTER TABLE public.classroom_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own classroom chunks" ON public.classroom_chunks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX classroom_chunks_user_course_idx ON public.classroom_chunks(user_id, google_course_id);
CREATE INDEX classroom_chunks_doc_idx ON public.classroom_chunks(document_id);

-- Similarity search RPC
CREATE OR REPLACE FUNCTION public.match_classroom_chunks(
  query_embedding vector,
  target_user_id UUID,
  target_course_ids TEXT[] DEFAULT NULL,
  match_count INTEGER DEFAULT 8
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  google_course_id TEXT,
  chunk_index INTEGER,
  content TEXT,
  similarity DOUBLE PRECISION,
  document_title TEXT,
  alternate_link TEXT
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.google_course_id,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.alternate_link
  FROM public.classroom_chunks c
  JOIN public.classroom_documents d ON d.id = c.document_id
  WHERE c.user_id = target_user_id
    AND c.embedding IS NOT NULL
    AND (target_course_ids IS NULL OR c.google_course_id = ANY(target_course_ids))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
