-- Pending workspace invitations
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  token text NOT NULL UNIQUE,
  invited_by uuid,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_pending_email
  ON public.workspace_invitations(workspace_id, lower(email))
  WHERE status = 'PENDING';

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Owners/admins of the workspace can view invitations
CREATE POLICY "Admins view workspace invitations"
ON public.workspace_invitations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_invitations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
));

-- Owners/admins create invitations (edge function performs writes via service role; this is a defense-in-depth policy)
CREATE POLICY "Admins create workspace invitations"
ON public.workspace_invitations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_invitations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
));

-- Owners/admins update (revoke) invitations
CREATE POLICY "Admins update workspace invitations"
ON public.workspace_invitations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_invitations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
));

CREATE TRIGGER trg_workspace_invitations_updated_at
BEFORE UPDATE ON public.workspace_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
