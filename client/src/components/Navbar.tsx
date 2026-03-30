import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { Sparkles, FolderOpen, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            LINE 貼圖生成器
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Link href="/studio">
                <Button
                  variant={location.startsWith("/studio") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">開始製作</span>
                </Button>
              </Link>
              <Link href="/projects">
                <Button
                  variant={location === "/projects" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">我的專案</span>
                </Button>
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 ml-1">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user?.name || "使用者"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => logout()} className="gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm" className="gap-1.5">
                <User className="h-4 w-4" />
                登入
              </Button>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
