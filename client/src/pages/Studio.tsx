import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getLoginUrl } from "@/const";
import { useParams } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, Sparkles, Download, RefreshCw, Loader2, X, Plus, Check,
  ImageIcon, Wand2, ArrowLeft, ArrowRight, Eye, Image as ImageLucide, CheckCircle2, Info, Film, ImagePlus
} from "lucide-react";
import {
  DEFAULT_KEYWORDS, EXTRA_KEYWORDS,
  STICKER_COUNT_OPTIONS, DEFAULT_STICKER_COUNT,
  ANIM_STICKER_COUNT_OPTIONS, DEFAULT_ANIM_STICKER_COUNT,
  LINE_STICKER_WIDTH, LINE_STICKER_HEIGHT,
  LINE_ANIM_STICKER_WIDTH, LINE_ANIM_STICKER_HEIGHT,
} from "@shared/types";
import type { StickerCountOption, AnimStickerCountOption, StickerType } from "@shared/types";

type StudioStep = "upload" | "keywords" | "confirm" | "preview";

export default function Studio() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const params = useParams<{ id?: string }>();

  const [currentStep, setCurrentStep] = useState<StudioStep>("upload");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [projectId, setProjectId] = useState<number | null>(params.id ? parseInt(params.id) : null);
  const [stickerCount, setStickerCount] = useState<number>(DEFAULT_STICKER_COUNT);
  const [stickerType, setStickerType] = useState<StickerType>("static");

  const createProject = trpc.sticker.createProject.useMutation();
  const uploadTemplate = trpc.sticker.uploadTemplate.useMutation();
  const generateStickers = trpc.sticker.generateStickers.useMutation();
  const regenerateSticker = trpc.sticker.regenerateSticker.useMutation();
  const updateKeywords = trpc.sticker.updateKeywords.useMutation();

  const [isGeneratingBg, setIsGeneratingBg] = useState(false);

  const projectQuery = trpc.sticker.getProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId, refetchInterval: isGeneratingBg ? 2000 : false }
  );

  useEffect(() => {
    if (projectQuery.data) {
      const status = projectQuery.data.status;
      if (isGeneratingBg && (status === "completed" || status === "failed")) {
        setIsGeneratingBg(false);
        if (status === "completed") {
          toast.success(stickerType === "animated" ? "動態貼圖生成完成！" : "貼圖生成完成！所有圖片已自動去背處理。");
        } else {
          toast.error("部分貼圖生成失敗，請嘗試重新生成。");
        }
      }
      if (status === "generating" && !isGeneratingBg) {
        setIsGeneratingBg(true);
      }
    }
  }, [projectQuery.data?.status, projectQuery.data?.progress]);

  useEffect(() => {
    if (projectQuery.data) {
      const project = projectQuery.data;
      if (project.templateImageUrl) setTemplatePreview(project.templateImageUrl);
      if (project.keywords) {
        try { setSelectedKeywords(JSON.parse(project.keywords)); } catch {}
      }
      if (project.stickerCount) setStickerCount(project.stickerCount);
      if (project.stickerType) setStickerType(project.stickerType as StickerType);
      if (project.stickers && project.stickers.length > 0) setCurrentStep("preview");
    }
  }, [projectQuery.data]);

  // Get count options based on sticker type
  const countOptions = stickerType === "animated"
    ? ANIM_STICKER_COUNT_OPTIONS
    : STICKER_COUNT_OPTIONS;

  const maxKeywords = stickerCount;

  // Get sticker dimensions based on type
  const stickerW = stickerType === "animated" ? LINE_ANIM_STICKER_WIDTH : LINE_STICKER_WIDTH;
  const stickerH = stickerType === "animated" ? LINE_ANIM_STICKER_HEIGHT : LINE_STICKER_HEIGHT;

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
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <Info className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">僅支援 Google 帳號</CardTitle>
              <CardDescription className="text-base">
                本網站僅支援使用 Google 帳號登入。請登出後，使用 Google 帳號重新登入。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
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

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("請上傳圖片檔案"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("圖片大小不能超過 10MB"); return; }
    setTemplateFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setTemplatePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const toggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(keyword)) return prev.filter(k => k !== keyword);
      if (prev.length >= maxKeywords) { toast.error(`目前設定為 ${maxKeywords} 張，最多只能選擇 ${maxKeywords} 個關鍵字`); return prev; }
      return [...prev, keyword];
    });
  }, [maxKeywords]);

  const addCustomKeyword = useCallback(() => {
    const kw = customKeyword.trim();
    if (!kw) return;
    if (selectedKeywords.includes(kw)) { toast.error("此關鍵字已選擇"); return; }
    if (selectedKeywords.length >= maxKeywords) { toast.error(`最多只能選擇 ${maxKeywords} 個關鍵字`); return; }
    setSelectedKeywords(prev => [...prev, kw]);
    setCustomKeyword("");
  }, [customKeyword, selectedKeywords, maxKeywords]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleStartGeneration = async () => {
    if (!templateFile && !templatePreview) { toast.error("請先上傳模板圖片"); return; }
    if (selectedKeywords.length === 0) { toast.error("請至少選擇一個關鍵字"); return; }
    try {
      let pid = projectId;
      if (!pid) {
        const result = await createProject.mutateAsync({
          title: "我的貼圖",
          keywords: selectedKeywords,
          stickerCount: stickerCount,
          stickerType: stickerType,
        });
        pid = result.projectId;
        setProjectId(pid);
      } else {
        await updateKeywords.mutateAsync({ projectId: pid, keywords: selectedKeywords });
      }
      if (templateFile) {
        const base64 = await fileToBase64(templateFile);
        await uploadTemplate.mutateAsync({ projectId: pid, imageBase64: base64, mimeType: templateFile.type });
      }
      setCurrentStep("preview");
      toast.info(stickerType === "animated"
        ? "開始生成動態貼圖，每張需要 AI 生成 → 去背 → 文字疊加 → APNG 動畫轉換..."
        : "開始生成貼圖，請稍候... 生成過程在背景進行，您可以即時看到進度。"
      );
      await generateStickers.mutateAsync({ projectId: pid });
      setIsGeneratingBg(true);
      projectQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "生成失敗，請重試");
    }
  };

  const handleRegenerate = async (stickerId: number) => {
    if (!projectId) return;
    try {
      toast.info("重新生成中，請稍候...");
      await regenerateSticker.mutateAsync({ projectId, stickerId });
      setIsGeneratingBg(true);
      projectQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "重新生成失敗");
    }
  };

  const handleDownloadZip = async () => {
    if (!projectQuery.data?.stickers) return;
    const completed = projectQuery.data.stickers.filter(s => s.status === "completed" && (s.processedImageUrl || s.originalImageUrl));
    if (completed.length === 0) { toast.error("沒有可下載的貼圖"); return; }
    toast.info("正在準備下載...");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < completed.length; i++) {
        const sticker = completed[i];
        const imageUrl = sticker.processedImageUrl || sticker.originalImageUrl!;
        try {
          const resp = await fetch(imageUrl);
          const blob = await resp.blob();
          zip.file(String(i + 1).padStart(2, "0") + ".png", blob);
        } catch (err) { console.error(`Failed to download sticker ${i}:`, err); }
      }

      if (projectQuery.data.mainImageUrl) {
        try {
          const mainResp = await fetch(projectQuery.data.mainImageUrl);
          const mainBlob = await mainResp.blob();
          zip.file("main.png", mainBlob);
        } catch (err) { console.error("Failed to download main.png:", err); }
      }

      if (projectQuery.data.tabImageUrl) {
        try {
          const tabResp = await fetch(projectQuery.data.tabImageUrl);
          const tabBlob = await tabResp.blob();
          zip.file("tab.png", tabBlob);
        } catch (err) { console.error("Failed to download tab.png:", err); }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const typeLabel = stickerType === "animated" ? "animated-" : "";
      a.download = `line-${typeLabel}stickers-${projectQuery.data.title || "export"}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      const fileDesc = stickerType === "animated" ? "APNG 動態貼圖" : "透明背景貼圖";
      toast.success(`下載完成！ZIP 包含所有${fileDesc} + main.png + tab.png`);
    } catch (error) { toast.error("下載失敗，請重試"); console.error(error); }
  };

  const stickers = projectQuery.data?.stickers || [];
  const isGenerating = isGeneratingBg || generateStickers.isPending;
  const progress = projectQuery.data?.progress || 0;

  const steps: { key: StudioStep; label: string; icon: typeof Upload }[] = [
    { key: "upload", label: "上傳模板", icon: Upload },
    { key: "keywords", label: "選擇表情", icon: Wand2 },
    { key: "confirm", label: "確認生成", icon: Sparkles },
    { key: "preview", label: "預覽下載", icon: Eye },
  ];
  const currentIdx = steps.findIndex(s => s.key === currentStep);

  const quickSelectKeywords = (count: number) => {
    const all = [...DEFAULT_KEYWORDS, ...EXTRA_KEYWORDS];
    setSelectedKeywords(all.slice(0, Math.min(count, all.length)));
  };

  // Handle sticker type change
  const handleStickerTypeChange = (newType: StickerType) => {
    setStickerType(newType);
    // Adjust count if switching to animated and current count exceeds max
    if (newType === "animated" && stickerCount > 24) {
      setStickerCount(24);
      if (selectedKeywords.length > 24) {
        setSelectedKeywords(prev => prev.slice(0, 24));
        toast.info("動態貼圖最多 24 張，已自動調整");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-6 md:py-10">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex items-center gap-2 md:gap-4">
                {idx > 0 && <div className={`hidden sm:block h-px w-8 md:w-16 ${idx <= currentIdx ? "bg-primary" : "bg-border"}`} />}
                <button
                  onClick={() => { if (idx <= currentIdx) setCurrentStep(step.key); }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all ${
                    idx === currentIdx ? "bg-primary text-primary-foreground shadow-md"
                    : idx < currentIdx ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < currentIdx ? <Check className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Upload + Type Selection */}
        {currentStep === "upload" && (
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Sticker Type Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />選擇貼圖類型
                </CardTitle>
                <CardDescription>選擇要製作靜態貼圖或動態貼圖</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleStickerTypeChange("static")}
                    className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                      stickerType === "static"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/30 hover:bg-accent/30"
                    }`}
                  >
                    {stickerType === "static" && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      stickerType === "static" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <ImagePlus className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">靜態貼圖</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG 格式 · 370×320px</p>
                      <p className="text-xs text-muted-foreground">8/16/24/32/40 張</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleStickerTypeChange("animated")}
                    className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                      stickerType === "animated"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/30 hover:bg-accent/30"
                    }`}
                  >
                    {stickerType === "animated" && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      stickerType === "animated" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Film className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">動態貼圖</p>
                      <p className="text-xs text-muted-foreground mt-1">APNG 格式 · 320×270px</p>
                      <p className="text-xs text-muted-foreground">8/16/24 張</p>
                    </div>
                  </button>
                </div>

                {stickerType === "animated" && (
                  <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-700 dark:text-amber-400">
                        <p className="font-medium mb-1">動態貼圖規格說明</p>
                        <ul className="space-y-0.5 list-disc pl-3">
                          <li>每張貼圖為 APNG 動畫格式（320×270px）</li>
                          <li>每張動畫 5-20 個畫格，播放時間最長 4 秒</li>
                          <li>自動套用 10 種動畫效果（跳動、搖擺、脈動等）</li>
                          <li>最多 24 張，循環播放 1-4 次</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />上傳模板圖片</CardTitle>
                <CardDescription>上傳一張角色或人物圖片作為貼圖生成的參考模板。建議使用清晰的正面照或角色圖。</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 md:p-12 transition-all cursor-pointer ${
                    templatePreview ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  {templatePreview ? (
                    <div className="relative">
                      <img src={templatePreview} alt="模板預覽" className="max-h-64 rounded-lg object-contain shadow-md" />
                      <button onClick={(e) => { e.stopPropagation(); setTemplateFile(null); setTemplatePreview(""); }}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm">
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <p className="mt-4 text-sm text-muted-foreground text-center">點擊或拖曳以更換圖片</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                      <p className="text-base font-medium text-foreground mb-1">點擊上傳圖片 或 拖曳至此</p>
                      <p className="text-sm text-muted-foreground">支援 JPG、PNG 格式，最大 10MB</p>
                    </>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setCurrentStep("keywords")} disabled={!templatePreview} className="gap-2">
                    下一步 <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Keywords + Sticker Count */}
        {currentStep === "keywords" && (
          <div className="mx-auto max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />選擇表情關鍵字</CardTitle>
                <CardDescription>
                  選擇 1-{maxKeywords} 個表情關鍵字。已選擇 <span className="font-semibold text-primary">{selectedKeywords.length}</span> / {maxKeywords} 個
                  {stickerType === "animated" && <Badge variant="outline" className="ml-2 text-xs"><Film className="h-3 w-3 mr-1" />動態貼圖</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sticker Count Selector */}
                <div className="rounded-xl bg-accent/30 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold">貼圖張數</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stickerType === "animated"
                          ? "LINE 動態貼圖支援 8/16/24 張"
                          : "LINE 靜態貼圖支援 8/16/24/32/40 張"
                        }
                      </p>
                    </div>
                    <Select
                      value={String(stickerCount)}
                      onValueChange={(v) => {
                        const newCount = parseInt(v);
                        setStickerCount(newCount);
                        if (selectedKeywords.length > newCount) {
                          setSelectedKeywords(prev => prev.slice(0, newCount));
                          toast.info(`已自動調整為前 ${newCount} 個關鍵字`);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countOptions.map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} 張
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-3 block">常用表情</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_KEYWORDS.map((kw) => (
                      <Badge key={kw} variant={selectedKeywords.includes(kw) ? "default" : "outline"}
                        className={`cursor-pointer text-sm py-1.5 px-3 transition-all ${selectedKeywords.includes(kw) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"}`}
                        onClick={() => toggleKeyword(kw)}>
                        {selectedKeywords.includes(kw) && <Check className="h-3 w-3 mr-1" />}{kw}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-semibold mb-3 block">更多表情</Label>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_KEYWORDS.map((kw) => (
                      <Badge key={kw} variant={selectedKeywords.includes(kw) ? "default" : "outline"}
                        className={`cursor-pointer text-sm py-1.5 px-3 transition-all ${selectedKeywords.includes(kw) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"}`}
                        onClick={() => toggleKeyword(kw)}>
                        {selectedKeywords.includes(kw) && <Check className="h-3 w-3 mr-1" />}{kw}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-semibold mb-3 block">自訂關鍵字</Label>
                  <div className="flex gap-2">
                    <Input placeholder="輸入自訂的表情文字..." value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomKeyword(); } }}
                      className="flex-1" />
                    <Button variant="outline" onClick={addCustomKeyword} className="gap-1.5"><Plus className="h-4 w-4" />新增</Button>
                  </div>
                </div>
                {selectedKeywords.length > 0 && (
                  <div className="rounded-xl bg-accent/30 p-4">
                    <Label className="text-sm font-semibold mb-2 block">已選擇的關鍵字 ({selectedKeywords.length}/{maxKeywords})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedKeywords.map((kw, idx) => (
                        <Badge key={`${kw}-${idx}`} variant="default" className="gap-1 bg-primary text-primary-foreground">
                          <span className="text-xs opacity-70">{idx + 1}.</span>{kw}
                          <button onClick={() => toggleKeyword(kw)} className="ml-0.5 hover:opacity-70"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => quickSelectKeywords(stickerCount)} className="text-xs">
                    快速選擇 {stickerCount} 個
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedKeywords([])} className="text-xs text-muted-foreground">清除全部</Button>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCurrentStep("upload")} className="gap-2"><ArrowLeft className="h-4 w-4" />上一步</Button>
                  <Button onClick={() => setCurrentStep("confirm")} disabled={selectedKeywords.length === 0} className="gap-2">下一步 <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Confirm & Generate */}
        {currentStep === "confirm" && (
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />確認並開始生成</CardTitle>
                <CardDescription>
                  確認以下設定後，AI 將自動生成{stickerType === "animated" ? "動態" : "靜態"}貼圖
                  {stickerType === "animated" && <Badge variant="outline" className="ml-2"><Film className="h-3 w-3 mr-1" />動態貼圖</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl bg-accent/30 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {templatePreview && <img src={templatePreview} alt="模板" className="h-16 w-16 rounded-lg object-cover border" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">模板圖片已上傳</p>
                        <Badge variant={stickerType === "animated" ? "default" : "secondary"} className="text-xs">
                          {stickerType === "animated" ? <><Film className="h-3 w-3 mr-1" />動態貼圖</> : <><ImagePlus className="h-3 w-3 mr-1" />靜態貼圖</>}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">將生成 {selectedKeywords.length} 張{stickerType === "animated" ? "動態" : ""}貼圖</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-muted-foreground">貼圖</p>
                      <p className="font-bold text-foreground">{selectedKeywords.length} 張</p>
                      <p className="text-muted-foreground">{stickerW}x{stickerH}px</p>
                      {stickerType === "animated" && <p className="text-primary font-medium">APNG</p>}
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-muted-foreground">主圖 main</p>
                      <p className="font-bold text-foreground">1 張</p>
                      <p className="text-muted-foreground">240x240px</p>
                      {stickerType === "animated" && <p className="text-primary font-medium">APNG</p>}
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-muted-foreground">標籤 tab</p>
                      <p className="font-bold text-foreground">1 張</p>
                      <p className="text-muted-foreground">96x74px</p>
                      <p className="text-muted-foreground">PNG</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">選定的表情關鍵字</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedKeywords.map((kw, idx) => (
                      <Badge key={`${kw}-${idx}`} variant="secondary" className="text-xs">
                        {idx + 1}. {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">自動透明背景</p>
                      <p className="text-xs text-muted-foreground">AI 生成後，伺服器會自動進行智慧去背處理</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">繁體中文文字疊加</p>
                      <p className="text-xs text-muted-foreground">使用 Noto Sans CJK TC 字體，多種風格和位置</p>
                    </div>
                  </div>
                  {stickerType === "animated" && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">自動動畫效果</p>
                        <p className="text-xs text-muted-foreground">每張貼圖自動套用不同動畫效果（跳動、搖擺、脈動、旋轉等），轉換為 APNG 格式</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">LINE 規格自動調整</p>
                      <p className="text-xs text-muted-foreground">自動調整為 LINE 官方規範尺寸，並生成 main.png 和 tab.png</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      生成 {selectedKeywords.length} 張{stickerType === "animated" ? "動態" : ""}貼圖預計需要 {Math.ceil(selectedKeywords.length * (stickerType === "animated" ? 0.7 : 0.5))}-{selectedKeywords.length * (stickerType === "animated" ? 1.5 : 1)} 分鐘，請耐心等候。
                      生成過程在背景進行，您可以即時看到每張貼圖的完成狀態。
                    </p>
                  </div>
                </div>

                <Separator />
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep("keywords")} className="gap-2"><ArrowLeft className="h-4 w-4" />上一步</Button>
                  <Button onClick={handleStartGeneration} disabled={isGenerating || createProject.isPending || uploadTemplate.isPending} className="gap-2 bg-primary hover:bg-primary/90">
                    {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />生成中...</> : <><Sparkles className="h-4 w-4" />開始生成{stickerType === "animated" ? "動態" : ""}貼圖</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Preview & Download */}
        {currentStep === "preview" && (
          <div className="mx-auto max-w-5xl space-y-6">
            {isGenerating && (
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">
                        正在生成{stickerType === "animated" ? "動態" : ""}貼圖並自動處理... ({progress}%)
                      </p>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {stickerType === "animated"
                          ? "每張貼圖：AI 生成 → 去背 → 文字疊加 → APNG 動畫轉換"
                          : "每張貼圖：AI 生成 → 去背處理 → 文字疊加"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  {stickerType === "animated" ? <><Film className="h-5 w-5 text-primary" />動態貼圖預覽</> : "貼圖預覽"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {stickers.filter(s => s.status === "completed").length} / {stickers.length} 張已完成
                  {!isGenerating && stickers.filter(s => s.status === "completed").length > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      （{stickerType === "animated" ? "APNG 動畫格式" : "所有圖片已自動去背"}）
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep("keywords")} className="gap-1.5" disabled={isGenerating}>
                  <ArrowLeft className="h-4 w-4" />修改設定
                </Button>
                <Button onClick={handleDownloadZip} disabled={isGenerating || stickers.filter(s => s.status === "completed").length === 0} className="gap-1.5">
                  <Download className="h-4 w-4" />下載 ZIP
                </Button>
              </div>
            </div>

            {/* Main & Tab preview */}
            {projectQuery.data && (projectQuery.data.mainImageUrl || projectQuery.data.tabImageUrl) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageLucide className="h-4 w-4 text-primary" />LINE 規格圖片
                    {stickerType === "animated" && <Badge variant="outline" className="text-xs">main 為 APNG 動畫</Badge>}
                  </CardTitle>
                  <CardDescription>main.png（主圖）和 tab.png（標籤圖）會自動包含在 ZIP 下載中</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-6">
                    {projectQuery.data.mainImageUrl && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">
                          main.png (240x240) {stickerType === "animated" && <span className="text-primary">APNG</span>}
                        </p>
                        <div className="inline-block rounded-lg border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] p-2">
                          <img src={projectQuery.data.mainImageUrl} alt="main" className="w-[120px] h-[120px] object-contain" />
                        </div>
                      </div>
                    )}
                    {projectQuery.data.tabImageUrl && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">tab.png (96x74)</p>
                        <div className="inline-block rounded-lg border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] p-2">
                          <img src={projectQuery.data.tabImageUrl} alt="tab" className="w-[48px] h-[37px] object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sticker grid */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {stickers.map((sticker) => (
                <Card key={sticker.id} className="overflow-hidden group">
                  <div className={`relative bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] ${
                    stickerType === "animated" ? "aspect-[320/270]" : "aspect-[370/320]"
                  }`}>
                    {sticker.status === "completed" && (sticker.processedImageUrl || sticker.originalImageUrl) ? (
                      <img src={sticker.processedImageUrl || sticker.originalImageUrl!} alt={sticker.keyword}
                        className="absolute inset-0 w-full h-full object-contain" crossOrigin="anonymous" />
                    ) : sticker.status === "generating" ? (
                      <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : sticker.status === "failed" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive"><X className="h-8 w-8 mb-1" /><span className="text-xs">生成失敗</span></div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
                    )}
                    {(sticker.status === "completed" || sticker.status === "failed") && !isGenerating && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" onClick={() => handleRegenerate(sticker.id)} disabled={regenerateSticker.isPending} className="gap-1 text-xs">
                          <RefreshCw className="h-3.5 w-3.5" />重新生成
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="text-center">
                      <Badge variant="secondary" className="text-xs">{sticker.keyword}</Badge>
                    </div>
                    {sticker.status === "completed" && (sticker.processedImageUrl || sticker.originalImageUrl) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-xs h-7"
                        onClick={async () => {
                          const imageUrl = sticker.processedImageUrl || sticker.originalImageUrl!;
                          try {
                            const resp = await fetch(imageUrl);
                            const blob = await resp.blob();
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            const ext = stickerType === "animated" ? "png" : "png";
                            a.download = `${String(stickers.indexOf(sticker) + 1).padStart(2, "0")}-${sticker.keyword}.${ext}`;
                            a.click();
                            URL.revokeObjectURL(a.href);
                          } catch {
                            toast.error("下載失敗，請重試");
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />
                        下載
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* LINE spec info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  LINE {stickerType === "animated" ? "動態" : "靜態"}貼圖上架規格說明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">檔案類型</th>
                        <th className="text-left py-2 px-3 font-medium">尺寸 (px)</th>
                        <th className="text-left py-2 px-3 font-medium">數量</th>
                        <th className="text-left py-2 px-3 font-medium">格式</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">貼圖圖片</td>
                        <td className="py-2 px-3">W {stickerW} x H {stickerH} (最大)</td>
                        <td className="py-2 px-3">{stickerCount} 張</td>
                        <td className="py-2 px-3">{stickerType === "animated" ? "APNG (透明背景)" : "PNG (透明背景)"}</td>
                      </tr>
                      {stickerType === "animated" && (
                        <tr className="border-b">
                          <td className="py-2 px-3">動畫規格</td>
                          <td className="py-2 px-3">5-20 畫格/張</td>
                          <td className="py-2 px-3">-</td>
                          <td className="py-2 px-3">播放時間 ≤ 4 秒，循環 1-4 次</td>
                        </tr>
                      )}
                      <tr className="border-b">
                        <td className="py-2 px-3">main.png（主圖）</td>
                        <td className="py-2 px-3">W 240 x H 240</td>
                        <td className="py-2 px-3">1 張</td>
                        <td className="py-2 px-3">{stickerType === "animated" ? "APNG" : "PNG"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">tab.png（標籤圖）</td>
                        <td className="py-2 px-3">W 96 x H 74</td>
                        <td className="py-2 px-3">1 張</td>
                        <td className="py-2 px-3">PNG</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  下載的 ZIP 檔案已包含所有必要檔案，可直接上傳至 LINE Creators Market。
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
