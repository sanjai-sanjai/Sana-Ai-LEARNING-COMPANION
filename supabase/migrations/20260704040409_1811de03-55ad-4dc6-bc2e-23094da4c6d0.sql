-- Restrict client access to sensitive OAuth token columns on classroom_connections.
-- Server-side code uses the service_role client (supabaseAdmin) for tokens.
REVOKE SELECT (access_token, refresh_token, token_expires_at, scope) ON public.classroom_connections FROM authenticated;
REVOKE UPDATE (access_token, refresh_token, token_expires_at, scope) ON public.classroom_connections FROM authenticated;
REVOKE INSERT (access_token, refresh_token, token_expires_at, scope) ON public.classroom_connections FROM authenticated;

-- Add missing UPDATE policy on storage.objects for the user-uploads bucket,
-- mirroring the existing ownership check.
DROP POLICY IF EXISTS "user-uploads update own" ON storage.objects;
CREATE POLICY "user-uploads update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-uploads' AND owner = auth.uid())
WITH CHECK (bucket_id = 'user-uploads' AND owner = auth.uid());
