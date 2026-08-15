import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { logoutAdminServerAction } from '@/lib/admin/admin-actions';
import AdminNavLinks from '@/components/admin/AdminNavLinks';

export default async function ManagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secretPath: string }>;
}) {
  const session = await requireAdminAuth();
  const { secretPath } = await params;
  const entryPath = getAdminEntryPath();

  return (
    <div className="min-h-screen bg-[#0A0808] text-white flex flex-col md:flex-row antialiased selection:bg-[#C0272D] selection:text-white">
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-[#120E0E]/95 border-b md:border-b-0 md:border-r border-white/[0.08] p-6 flex flex-col justify-between flex-shrink-0 backdrop-blur-xl z-20">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C0272D] to-[#801317] flex items-center justify-center text-xl shadow-lg shadow-[#C0272D]/30 border border-[#C0272D]/40">
              🏏
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-wider font-display bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CPL COMMAND
              </div>
              <div className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                Tournament Operations
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-6">
            <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-3 mb-2">
              Management
            </div>
            <AdminNavLinks entryPath={entryPath} />
          </div>
        </div>

        {/* User Session & Logout Footer */}
        <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white/80">
              👤
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white/90 truncate">
                {session.username}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </div>
            </div>
          </div>

          <form action={logoutAdminServerAction}>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 text-xs font-semibold transition-all duration-200"
              title="Sign Out"
            >
              Exit
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto bg-gradient-to-b from-[#0F0C0C] via-[#0A0808] to-[#080606]">
        {children}
      </main>
    </div>
  );
}
