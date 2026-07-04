import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotebookDocSchema } from "@/lib/study-notes.schema";
import {
  NotebookViewer,
  NotebookViewerSkeleton,
} from "./notebook/NotebookViewer";
import type { StudyStyleT } from "@/lib/study-notes.schema";

export function StudyNoteRenderer({
  messageId,
  threadId,
  userQuestion,
  assistantMarkdown,
  style,
}: {
  messageId: string;
  threadId: string | null;
  userQuestion: string;
  assistantMarkdown: string;
  style: StudyStyleT;
  pageNumber?: number;
}) {
  const [cachedDoc, setCachedDoc] = useState<any>(null);
  const [loadingCache, setLoadingCache] = useState(true);
  const enabled = !!messageId && !!assistantMarkdown.trim();

  // Try fetching cache first
  useEffect(() => {
    if (!enabled) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingCache(false);
        return;
      }
      const { data } = await supabase
        .from("study_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("message_id", messageId)
        .maybeSingle();
        
      if (data?.structured) {
        setCachedDoc(data.structured);
      }
      setLoadingCache(false);
    }
    load();
  }, [messageId, enabled]);

  const { object, submit, isLoading } = useObject({
    api: "/api/public/study-notes/stream",
    schema: NotebookDocSchema,
  });

  // Start stream if not cached
  useEffect(() => {
    if (!loadingCache && !cachedDoc && enabled && !isLoading && !object) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        submit({
          userId: user?.id,
          messageId,
          threadId,
          userQuestion,
          assistantMarkdown,
          style,
        });
      });
    }
  }, [loadingCache, cachedDoc, enabled, isLoading, object, submit, messageId, threadId, userQuestion, assistantMarkdown, style]);

  if (loadingCache) return <NotebookViewerSkeleton />;
  
  const docToRender = cachedDoc || object;
  
  // Need to provide a safe fallback for partial objects since streaming might not have title/blocks yet
  const safeDoc = {
    title: docToRender?.title || "Sana is writing...",
    subtitle: docToRender?.subtitle || null,
    blocks: docToRender?.blocks || [],
  };

  if (!cachedDoc && !object && isLoading) return <NotebookViewerSkeleton />;
  if (!safeDoc.blocks.length && !isLoading && !cachedDoc) return <NotebookViewerSkeleton />;

  return <NotebookViewer doc={safeDoc as any} />;
}
