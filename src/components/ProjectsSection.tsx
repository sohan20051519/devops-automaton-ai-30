import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, Github, Play, RefreshCw, Download, List } from "lucide-react";

type Provider = "github" | "gitlab" | "bitbucket" | "generic";

type Project = {
  id: string;
  repoUrl: string;
  provider: Provider;
  owner?: string;
  name?: string; // repository name (e.g., repo)
  displayName?: string; // user-defined project name for UI
  defaultBranch?: string;
  primaryLanguage?: string;
  workflowFile?: string;
  lastRunAt?: string;
  status?: "idle" | "running" | "failed" | "succeeded";
};

const LOCAL_STORAGE_KEY = "oneops-projects";

function parseProvider(repoUrl: string): Provider {
  try {
    const url = new URL(repoUrl);
    if (url.hostname.includes("github.com")) return "github";
    if (url.hostname.includes("gitlab.com")) return "gitlab";
    if (url.hostname.includes("bitbucket.org")) return "bitbucket";
    return "generic";
  } catch {
    return "generic";
  }
}

function parseGithubOwnerRepo(repoUrl: string): { owner: string; name: string } | null {
  try {
    const url = new URL(repoUrl);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.replace(/^\//, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], name: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

const ProjectsSection = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [workflowFile, setWorkflowFile] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch {
        setProjects([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const canSubmit = useMemo(() => repoUrl.trim().length > 0 && projectName.trim().length > 0, [repoUrl, projectName]);

  useEffect(() => {
    // Auto-suggest project name from repo URL when empty
    if (!projectName && repoUrl) {
      const parsed = parseGithubOwnerRepo(repoUrl);
      if (parsed?.name) {
        setProjectName(parsed.name);
      }
    }
  }, [repoUrl, projectName]);

  const addProject = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const provider = parseProvider(repoUrl);
      let newProject: Project = {
        id: crypto.randomUUID(),
        repoUrl,
        provider,
        workflowFile: workflowFile || undefined,
        displayName: projectName.trim() || undefined,
        status: "idle",
      };

      // Enrich with repo info when GitHub (best-effort; do not fail add if function not reachable)
      if (provider === "github") {
        const parsed = parseGithubOwnerRepo(repoUrl);
        if (!parsed) throw new Error("Invalid GitHub repository URL");
        const { owner, name } = parsed;
        try {
          const { data } = await supabase.functions.invoke("repo-info", {
            body: { repo: `${owner}/${name}` },
          });
          newProject = {
            ...newProject,
            owner,
            name,
            defaultBranch: data?.defaultBranch ?? "main",
            primaryLanguage: data?.primaryLanguage ?? undefined,
          };
        } catch {
          // Fallback without enrichment
          newProject = {
            ...newProject,
            owner,
            name,
            defaultBranch: "main",
          };
          toast({ title: "⚠️ Added without enrichment", description: "Repo info service unreachable. You can still install workflow and run." });
        }
      }

      setProjects((prev) => [newProject, ...prev]);
      setShowAdd(false);
      setRepoUrl("");
      toast({ title: "✅ Project added", description: "You can now run the pipeline." });

      // Auto-install workflow for GitHub repos (best-effort)
      if (newProject.provider === 'github' && newProject.owner && newProject.name) {
        try {
          await installWorkflow(newProject);
        } catch (_) {
          // installWorkflow already surfaces its own error toast
        }
      }
    } catch (err: any) {
      toast({ title: "❌ Failed to add project", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const runPipeline = async (project: Project) => {
    try {
      // Only GitHub is wired for CI/CD trigger here
      if (project.provider === "github" && project.owner && project.name) {
        setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: "running", lastRunAt: new Date().toISOString() } : p)));
        const { error } = await supabase.functions.invoke("github-trigger", {
          body: {
            repo: `${project.owner}/${project.name}`,
            workflow: project.workflowFile || 'oneops.yml',
          },
        });
        if (error) throw error;
        toast({ title: "🚀 Pipeline triggered", description: `${project.owner}/${project.name} → ${project.workflowFile}` });
        setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: "succeeded" } : p)));
      } else {
        toast({ title: "ℹ️ Not supported yet", description: "Only GitHub repos can be triggered right now." });
      }
    } catch (err: any) {
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: "failed" } : p)));
      toast({ title: "❌ Pipeline failed", description: err.message ?? String(err), variant: "destructive" });
    }
  };

  const installWorkflow = async (project: Project) => {
    try {
      if (project.provider !== 'github' || !project.owner || !project.name) {
        toast({ title: 'ℹ️ Only GitHub supported', description: 'Workflow installation supports GitHub repositories at this time.' });
        return;
      }
      const { error } = await supabase.functions.invoke('install-workflow', {
        body: {
          repo: `${project.owner}/${project.name}`,
          workflow: project.workflowFile || 'oneops.yml',
          primaryLanguage: project.primaryLanguage || null,
          branch: project.defaultBranch || 'main'
        }
      });
      if (error) throw error;
      toast({ title: '✅ Workflow installed', description: `.github/workflows/${project.workflowFile || 'oneops.yml'}` });
    } catch (err: any) {
      toast({ title: '❌ Install failed', description: err.message ?? String(err), variant: 'destructive' });
    }
  };

  const viewRuns = async (project: Project) => {
    try {
      if (project.provider !== 'github' || !project.owner || !project.name) {
        toast({ title: 'ℹ️ Only GitHub supported', description: 'Runs status supports GitHub repositories at this time.' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('runs-status', {
        body: { repo: `${project.owner}/${project.name}`, per_page: 5 },
      });
      if (error) throw error;
      const runs = (data?.runs || []) as Array<{ html_url: string; status: string; conclusion: string; run_number: number }>;
      if (runs.length === 0) {
        toast({ title: 'No recent runs', description: 'Trigger a pipeline to see run history.' });
        return;
      }
      // Open the latest run in a new tab
      window.open(runs[0].html_url, '_blank');
    } catch (err: any) {
      toast({ title: '❌ Failed to fetch runs', description: err.message ?? String(err), variant: 'destructive' });
    }
  };

  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Projects</h2>
          <Button onClick={() => setShowAdd(true)} variant="hero" className="gap-2">
            <Plus className="w-4 h-4" /> Add Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Welcome to OneOps</CardTitle>
              <CardDescription>Add your first project to start automated build, test, dockerize, deploy, and monitor.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAdd(true)} variant="glow" className="gap-2">
                <Plus className="w-4 h-4" /> Add Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <Card key={p.id} className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.provider === "github" ? <Github className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      {p.displayName || p.name || 'Project'}
                    </CardTitle>
                    <CardDescription>
                      {p.owner && p.name ? `${p.owner}/${p.name}` : p.repoUrl}
                      {p.primaryLanguage ? ` • ${p.primaryLanguage}` : ""}
                      {` • ${p.workflowFile || 'oneops.yml'}`}
                      {p.lastRunAt ? ` • Last run ${new Date(p.lastRunAt).toLocaleString()}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => runPipeline(p)} disabled={p.status === "running"} className="gap-2">
                      {p.status === "running" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {p.status === "running" ? "Running..." : "Run Pipeline"}
                    </Button>
                    <Button variant="outline" onClick={() => installWorkflow(p)} className="gap-2">
                      <Download className="w-4 h-4" /> Install Workflow
                    </Button>
                    <Button variant="outline" onClick={() => viewRuns(p)} className="gap-2">
                      <List className="w-4 h-4" /> View Runs
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Add Project</CardTitle>
                <CardDescription>Paste your repository URL. GitHub is supported for automated pipeline trigger.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input id="project-name" placeholder="My App" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-url">Repository URL</Label>
                  <Input id="repo-url" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
                </div>
                <div>
                  <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setShowAdvanced((v) => !v)}>
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                  </button>
                </div>
                {showAdvanced && (
                  <div className="space-y-2">
                    <Label htmlFor="workflow-file">Workflow file (GitHub, optional)</Label>
                    <Input id="workflow-file" placeholder="oneops.yml (default)" value={workflowFile} onChange={(e) => setWorkflowFile(e.target.value)} />
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button onClick={addProject} disabled={!canSubmit || isSubmitting} variant="hero">
                    {isSubmitting ? "Adding..." : "Add"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;


