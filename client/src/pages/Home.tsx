import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { Link } from "wouter";
import { Sparkles, Upload, Wand2, Download, ArrowRight, CheckCircle2, Film } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container relative py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              AI 驅動的 LINE 貼圖製作工具（靜態 + 動態）
            </div>
            <h1 className="mb-6 text-4xl font-black tracking-tight text-foreground md:text-6xl leading-tight">
              一鍵生成
              <span className="text-primary"> 專屬 LINE 貼圖</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl leading-relaxed max-w-2xl mx-auto">
              上傳你的角色圖片，選擇表情關鍵字，AI 自動生成精美貼圖。
              支援靜態貼圖（8-40 張）和動態貼圖（APNG 8-24 張），智慧去背、繁體中文文字，完美符合 LINE 官方規範。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/25">
                    <Sparkles className="h-5 w-5" />
                    開始製作貼圖
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <Button size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/25">
                      <Sparkles className="h-5 w-5" />
                      使用 Google 帳號登入
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">僅支援 Google 帳號登入</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">簡單四步驟，完成你的貼圖</h2>
            <p className="text-muted-foreground text-lg">從上傳到下載，全程 AI 輔助，無需設計經驗</p>
          </div>
          <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Upload, step: "01", title: "上傳模板", desc: "上傳角色或人物圖片作為貼圖的參考模板" },
              { icon: Wand2, step: "02", title: "選擇表情", desc: "從 35+ 個常用表情關鍵字中選擇，或自訂文字" },
              { icon: Sparkles, step: "03", title: "AI 生成", desc: "AI 自動生成靜態或動態貼圖，自動套用動畫效果" },
              { icon: Download, step: "04", title: "去背下載", desc: "智慧去背處理後，一鍵打包下載 ZIP 檔案" },
            ].map((item) => (
              <div key={item.step} className="group relative rounded-2xl border border-border/50 bg-background p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="mb-4 text-xs font-bold text-primary/50 tracking-widest">STEP {item.step}</div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">強大功能，專業品質</h2>
            <p className="text-muted-foreground text-lg">為 LINE 貼圖創作者量身打造的完整工具</p>
          </div>
          <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title: "AI 智慧生成", desc: "根據參考圖片和關鍵字，自動生成風格統一的貼圖組" },
              { title: "繁體中文文字", desc: "每張貼圖自動加上清晰可讀的繁體中文文字" },
              { title: "動態貼圖支援", desc: "一鍵生成 APNG 動態貼圖，自動套用 10 種動畫效果（跳動、搖擺、脈動等）" },
              { title: "LINE 規範尺寸", desc: "自動調整為 LINE 官方規範尺寸，含 main.png 及 tab.png" },
              { title: "單張重新生成", desc: "不滿意的貼圖可以單獨重新生成，不影響其他" },
              { title: "一鍵打包下載", desc: "所有貼圖打包成 ZIP，含 main.png 主圖和 tab.png 標籤圖" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl p-4 transition-colors hover:bg-accent/50">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">準備好製作你的專屬貼圖了嗎？</h2>
            <p className="text-muted-foreground mb-8">立即開始，幾分鐘內就能擁有一套完整的 LINE 貼圖</p>
            {isAuthenticated ? (
              <Link href="/studio">
                <Button size="lg" className="gap-2 rounded-xl px-8">
                  <Sparkles className="h-5 w-5" />
                  前往工作室
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="gap-2 rounded-xl px-8">
                  <Sparkles className="h-5 w-5" />
                  使用 Google 帳號登入
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>LINE 貼圖智慧生成器 — AI 驅動的個人化貼圖製作工具</p>
        </div>
      </footer>
    </div>
  );
}
