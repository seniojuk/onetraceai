import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Artifact, useCreateArtifact } from "./useArtifacts";

export interface FileArtifact extends Artifact {
  content_json: {
    file_name: string;
    file_size: number;
    file_type: string;
    storage_path: string;
  };
}

export interface ArtifactFileAssociation {
  id: string;
  file_artifact_id: string;
  associated_artifact_id: string;
  workspace_id: string;
  project_id: string;
  created_at: string;
  created_by: string | null;
}

export function useFileArtifacts(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["file-artifacts", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("artifacts")
        .select("*")
        .eq("project_id", projectId)
        .eq("type", "FILE")
        .neq("status", "ARCHIVED")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FileArtifact[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useFileAssociations(artifactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["file-associations", artifactId],
    queryFn: async () => {
      if (!artifactId) return [];

      const { data, error } = await supabase
        .from("artifact_file_associations")
        .select("*")
        .eq("associated_artifact_id", artifactId);

      if (error) throw error;
      return data as ArtifactFileAssociation[];
    },
    enabled: !!user && !!artifactId,
  });
}

export function useFilesForArtifact(artifactId: string | undefined, projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["files-for-artifact", artifactId],
    queryFn: async () => {
      if (!artifactId || !projectId) return [];

      // Get associations for this artifact
      const { data: associations, error: assocError } = await supabase
        .from("artifact_file_associations")
        .select("file_artifact_id")
        .eq("associated_artifact_id", artifactId);

      if (assocError) throw assocError;

      if (!associations || associations.length === 0) return [];

      const fileIds = associations.map(a => a.file_artifact_id);

      // Get the file artifacts
      const { data: files, error: filesError } = await supabase
        .from("artifacts")
        .select("*")
        .in("id", fileIds)
        .eq("type", "FILE");

      if (filesError) throw filesError;
      return files as FileArtifact[];
    },
    enabled: !!user && !!artifactId && !!projectId,
  });
}

export function useArtifactsForFile(fileArtifactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["artifacts-for-file", fileArtifactId],
    queryFn: async () => {
      if (!fileArtifactId) return [];

      // Get associations for this file
      const { data: associations, error: assocError } = await supabase
        .from("artifact_file_associations")
        .select("associated_artifact_id")
        .eq("file_artifact_id", fileArtifactId);

      if (assocError) throw assocError;

      if (!associations || associations.length === 0) return [];

      const artifactIds = associations.map(a => a.associated_artifact_id);

      // Get the artifacts
      const { data: artifacts, error: artifactsError } = await supabase
        .from("artifacts")
        .select("*")
        .in("id", artifactIds)
        .neq("type", "FILE");

      if (artifactsError) throw artifactsError;
      return artifacts as Artifact[];
    },
    enabled: !!user && !!fileArtifactId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createArtifact = useCreateArtifact();

  return useMutation({
    mutationFn: async ({
      file,
      workspaceId,
      projectId,
      associatedArtifactId,
    }: {
      file: File;
      workspaceId: string;
      projectId: string;
      associatedArtifactId?: string;
    }) => {
      // Create a unique path for the file
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${projectId}/${timestamp}_${sanitizedFileName}`;

      // Upload the file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("artifact-files")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create the FILE artifact
      const artifact = await createArtifact.mutateAsync({
        workspaceId,
        projectId,
        type: "FILE",
        title: file.name,
        contentJson: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
        },
      });

      // If there's an associated artifact, create the association
      if (associatedArtifactId) {
        const { error: assocError } = await supabase
          .from("artifact_file_associations")
          .insert({
            file_artifact_id: artifact.id,
            associated_artifact_id: associatedArtifactId,
            workspace_id: workspaceId,
            project_id: projectId,
            created_by: user?.id,
          });

        if (assocError) throw assocError;
      }

      return artifact as FileArtifact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["file-artifacts", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.projectId] });
      if (variables.associatedArtifactId) {
        queryClient.invalidateQueries({ queryKey: ["files-for-artifact", variables.associatedArtifactId] });
        queryClient.invalidateQueries({ queryKey: ["file-associations", variables.associatedArtifactId] });
      }
    },
  });
}

export function useAssociateFile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fileArtifactId,
      associatedArtifactId,
      workspaceId,
      projectId,
    }: {
      fileArtifactId: string;
      associatedArtifactId: string;
      workspaceId: string;
      projectId: string;
    }) => {
      const { data, error } = await supabase
        .from("artifact_file_associations")
        .insert({
          file_artifact_id: fileArtifactId,
          associated_artifact_id: associatedArtifactId,
          workspace_id: workspaceId,
          project_id: projectId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ArtifactFileAssociation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files-for-artifact", variables.associatedArtifactId] });
      queryClient.invalidateQueries({ queryKey: ["file-associations", variables.associatedArtifactId] });
      queryClient.invalidateQueries({ queryKey: ["artifacts-for-file", variables.fileArtifactId] });
    },
  });
}

export function useDisassociateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileArtifactId,
      associatedArtifactId,
    }: {
      fileArtifactId: string;
      associatedArtifactId: string;
    }) => {
      const { error } = await supabase
        .from("artifact_file_associations")
        .delete()
        .eq("file_artifact_id", fileArtifactId)
        .eq("associated_artifact_id", associatedArtifactId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files-for-artifact", variables.associatedArtifactId] });
      queryClient.invalidateQueries({ queryKey: ["file-associations", variables.associatedArtifactId] });
      queryClient.invalidateQueries({ queryKey: ["artifacts-for-file", variables.fileArtifactId] });
    },
  });
}

export function useDeleteFileArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileArtifact,
    }: {
      fileArtifact: FileArtifact;
    }) => {
      // Delete from storage
      const storagePath = fileArtifact.content_json.storage_path;
      if (storagePath) {
        await supabase.storage.from("artifact-files").remove([storagePath]);
      }

      // Delete all associations
      await supabase
        .from("artifact_file_associations")
        .delete()
        .eq("file_artifact_id", fileArtifact.id);

      // Archive the artifact
      const { error } = await supabase
        .from("artifacts")
        .update({ status: "ARCHIVED" })
        .eq("id", fileArtifact.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["file-artifacts", variables.fileArtifact.project_id] });
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.fileArtifact.project_id] });
    },
  });
}

export function getFileDownloadUrl(storagePath: string): string {
  const { data } = supabase.storage.from("artifact-files").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function downloadFile(storagePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("artifact-files")
    .download(storagePath);

  if (error) throw error;

  // Create blob and download
  const blob = new Blob([data], { type: data.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
