import { OfflineBanner } from "@/components/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <OfflineBanner />
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">iList</span>
        {user && (
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        )}
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-3 pt-3">{children}</main>
      <BottomNav />
    </div>
  );
}
