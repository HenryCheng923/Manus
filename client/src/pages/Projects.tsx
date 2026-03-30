import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Sparkles, FolderOpen, Plus, Clock, CheckCircle2, Loader2, AlertCircle, Film, ImagePlus } from "lucide-react";

export default function Projects() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const projectsQuery = trpc.sticker.listProjects.useQuery(undefined, { enabled: isAuthenticated && user?.loginMethod === "google" });

  if (!authLoading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Google-only access check
  if (!authLoading && isAuthenticated && user?.loginMethod !== "google") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">僅支援 Google 帳號</h2>
              <p className="text-muted-foreground mb-6">
                本網站僅支援使用 Google 帳號登入。請登出後，使用 Google 帳號重新登入。
              </p>
              <a href={getLoginUrl()}>
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  使用 Google 帳號登入
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const projects = projectsQuery.data || [];

  const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "草稿", icon: Clock, variant: "outline" },
    generating: { label: "生成中", icon: Loader2, variant: "secondary" },
    completed: { label: "已完成", icon: CheckCircle2, variant: "default" },
    failed: { label: "失敗", icon: AlertCircle, variant: "destructive" },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              我的專案
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理你建立的所有貼圖專案</p>
          </div>
          <Link href="/studio">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              新增專案
            </Button>
          </Link>
        </div>

        {projectsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">還沒有任何專案</h2>
            <p className="text-muted-foreground mb-6">開始製作你的第一套 LINE 貼圖吧！</p>
            <Link href="/studio">
              <Button className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                開始製作
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const config = statusConfig[project.status] || statusConfig.draft;
              const StatusIcon = config.icon;
              return (
                <Link key={project.id} href={`/studio/${project.id}`}>
                  <Card className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                          <Badge variant="outline" className="shrink-0 text-xs gap-1">
                            {(project as any).stickerType === "animated" ? <><Film className="h-3 w-3" />動態</> : <><ImagePlus className="h-3 w-3" />靜態</>}
                          </Badge>
                        </div>
                        <Badge variant={config.variant} className="shrink-0 ml-2 gap-1">
                          <StatusIcon className={`h-3 w-3 ${project.status === "generating" ? "animate-spin" : ""}`} />
                          {config.label}
                        </Badge>
                      </div>
                      {project.templateImageUrl && (
                        <div className="mb-3 h-24 rounded-lg bg-muted overflow-hidden">
                          <img src={project.templateImageUrl} alt="模板" className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>進度: {project.progress}%</span>
                        <span>{new Date(project.createdAt).toLocaleDateString("zh-TW")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
