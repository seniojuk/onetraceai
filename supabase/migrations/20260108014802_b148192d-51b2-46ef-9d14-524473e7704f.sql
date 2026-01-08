-- Create a trigger function to automatically add the workspace creator as an OWNER member
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add the creator as an OWNER of the workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.created_by, 'OWNER', now());
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();