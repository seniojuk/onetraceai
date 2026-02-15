import { useState } from "react";
import { Plus, Pencil, Trash2, Layers, Loader2, Star, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTechStackProfiles,
  useCreateTechStackProfile,
  useUpdateTechStackProfile,
  useDeleteTechStackProfile,
  STACK_CATEGORIES,
  type TechStackProfile,
  type StackCategory,
} from "@/hooks/useTechStackProfiles";
import { useToast } from "@/hooks/use-toast";

interface PresetTemplate {
  label: string;
  description: string;
  values: Omit<ProfileFormState, "name" | "description" | "is_default">;
}

const PRESET_TEMPLATES: Record<string, PresetTemplate> = {
  lovable: {
    label: "Lovable",
    description: "React + Vite + Tailwind stack used by Lovable",
    values: {
      frontend: "React 18, TypeScript, Tailwind CSS, Vite, shadcn/ui",
      backend: "Supabase Edge Functions (Deno), Supabase Auth",
      database: "PostgreSQL (Supabase), Row Level Security",
      mobile: "",
      infrastructure: "Supabase Cloud, Lovable Hosting",
      testing: "",
      additional_guidelines: "Use shadcn/ui components. Follow Tailwind semantic tokens. Use Supabase client SDK for data access. Prefer React Query for server state.",
    },
  },
  cursor: {
    label: "Cursor",
    description: "Next.js full-stack commonly used with Cursor",
    values: {
      frontend: "Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS",
      backend: "Next.js API Routes, Server Actions, Prisma ORM",
      database: "PostgreSQL, Prisma, Redis",
      mobile: "",
      infrastructure: "Vercel, Docker",
      testing: "Jest, React Testing Library, Playwright",
      additional_guidelines: "Use App Router with Server Components by default. Prefer Server Actions for mutations. Use Prisma for type-safe database access.",
    },
  },
  codex: {
    label: "OpenAI Codex / ChatGPT",
    description: "Python + FastAPI backend with React frontend",
    values: {
      frontend: "React 18, TypeScript, Tailwind CSS, Vite",
      backend: "Python 3.12, FastAPI, Pydantic, SQLAlchemy",
      database: "PostgreSQL, Alembic migrations, Redis",
      mobile: "",
      infrastructure: "Docker, AWS (ECS, RDS), GitHub Actions",
      testing: "pytest, React Testing Library, Cypress",
      additional_guidelines: "Use Pydantic models for request/response validation. Follow RESTful API conventions. Use async/await for I/O-bound operations.",
    },
  },
  windsurf: {
    label: "Windsurf",
    description: "Full-stack TypeScript with tRPC",
    values: {
      frontend: "Next.js 14, React 18, TypeScript, Tailwind CSS",
      backend: "tRPC, Node.js, Zod, Drizzle ORM",
      database: "PostgreSQL, Drizzle Kit migrations",
      mobile: "",
      infrastructure: "Vercel, PlanetScale, Upstash Redis",
      testing: "Vitest, Playwright",
      additional_guidelines: "Use tRPC for end-to-end type safety. Prefer Drizzle ORM for database queries. Use Zod schemas shared between client and server.",
    },
  },
  mobile_rn: {
    label: "Mobile (React Native)",
    description: "React Native + Expo mobile stack",
    values: {
      frontend: "",
      backend: "Node.js, Express, TypeScript",
      database: "PostgreSQL, Prisma",
      mobile: "React Native, Expo, TypeScript, React Navigation, NativeWind",
      infrastructure: "EAS Build, Firebase (Push Notifications), AWS S3",
      testing: "Jest, Detox",
      additional_guidelines: "Use Expo managed workflow. Follow React Navigation patterns. Use NativeWind for styling consistency with web.",
    },
  },
  flutter: {
    label: "Mobile (Flutter)",
    description: "Flutter + Firebase mobile stack",
    values: {
      frontend: "",
      backend: "Firebase Cloud Functions (Node.js)",
      database: "Firestore, Firebase Realtime Database",
      mobile: "Flutter, Dart, Riverpod, GoRouter",
      infrastructure: "Firebase Hosting, Cloud Storage, Firebase Auth",
      testing: "Flutter Test, Integration Tests",
      additional_guidelines: "Use Riverpod for state management. Follow clean architecture with repository pattern. Use GoRouter for navigation.",
    },
  },
};

interface TechStackProfileManagerProps {
  workspaceId: string;
}

interface ProfileFormState {
  name: string;
  description: string;
  frontend: string;
  backend: string;
  database: string;
  mobile: string;
  infrastructure: string;
  testing: string;
  additional_guidelines: string;
  is_default: boolean;
}

const emptyForm: ProfileFormState = {
  name: "",
  description: "",
  frontend: "",
  backend: "",
  database: "",
  mobile: "",
  infrastructure: "",
  testing: "",
  additional_guidelines: "",
  is_default: false,
};

function profileToForm(p: TechStackProfile): ProfileFormState {
  return {
    name: p.name,
    description: p.description || "",
    frontend: (p.frontend || []).join(", "),
    backend: (p.backend || []).join(", "),
    database: (p.database || []).join(", "),
    mobile: (p.mobile || []).join(", "),
    infrastructure: (p.infrastructure || []).join(", "),
    testing: (p.testing || []).join(", "),
    additional_guidelines: p.additional_guidelines || "",
    is_default: p.is_default,
  };
}

function parseCSV(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export function TechStackProfileManager({ workspaceId }: TechStackProfileManagerProps) {
  const { data: profiles, isLoading } = useTechStackProfiles(workspaceId);
  const createProfile = useCreateTechStackProfile();
  const updateProfile = useUpdateTechStackProfile();
  const deleteProfile = useDeleteTechStackProfile();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);

  const handleOpen = (profile?: TechStackProfile) => {
    if (profile) {
      setEditingId(profile.id);
      setForm(profileToForm(profile));
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      frontend: parseCSV(form.frontend),
      backend: parseCSV(form.backend),
      database: parseCSV(form.database),
      mobile: parseCSV(form.mobile),
      infrastructure: parseCSV(form.infrastructure),
      testing: parseCSV(form.testing),
      additional_guidelines: form.additional_guidelines || null,
      is_default: form.is_default,
    };

    try {
      if (editingId) {
        await updateProfile.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Stack profile updated" });
      } else {
        await createProfile.mutateAsync({ workspaceId, ...payload });
        toast({ title: "Stack profile created" });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile.mutateAsync({ id, workspaceId });
      toast({ title: "Stack profile deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Tech Stack Profiles
            </CardTitle>
            <CardDescription>
              Define reusable technology stacks for consistent code generation across projects
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="w-4 h-4 mr-1" />
            New Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tech stack profiles yet. Create one to ensure consistent code generation.
          </p>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => {
              const allTech = [
                ...p.frontend,
                ...p.backend,
                ...p.database,
                ...p.mobile,
                ...p.infrastructure,
                ...p.testing,
              ];
              return (
                <div
                  key={p.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.is_default && (
                        <Badge variant="secondary" className="text-[10px] h-4">
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          Default
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allTech.slice(0, 8).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] h-4 px-1.5">
                          {t}
                        </Badge>
                      ))}
                      {allTech.length > 8 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          +{allTech.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpen(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Tech Stack Profile</DialogTitle>
              <DialogDescription>
                Define the technologies used across your projects for consistent code generation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!editingId && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Start from a template
                  </Label>
                  <Select
                    onValueChange={(key) => {
                      const preset = PRESET_TEMPLATES[key];
                      if (preset) {
                        setForm((prev) => ({
                          ...prev,
                          name: prev.name || preset.label + " Stack",
                          description: prev.description || preset.description,
                          ...preset.values,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a suggested template to pre-fill fields..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESET_TEMPLATES).map(([key, t]) => (
                        <SelectItem key={key} value={key}>
                          <span className="font-medium">{t.label}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">— {t.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Selecting a template pre-fills the fields below. You can still edit any value.
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Profile Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. SaaS Platform Stack"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description"
                  />
                </div>
              </div>

              {STACK_CATEGORIES.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    value={form[key as StackCategory]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated list</p>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label>Additional Guidelines</Label>
                <Textarea
                  value={form.additional_guidelines}
                  onChange={(e) => setForm({ ...form, additional_guidelines: e.target.value })}
                  placeholder="Architecture patterns, coding conventions, folder structure, naming conventions..."
                  rows={4}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="rounded"
                />
                Set as default profile for new projects
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
