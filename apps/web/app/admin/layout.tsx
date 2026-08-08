import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl flex flex-col">
        <h2 className="text-2xl font-bold mb-8 text-blue-400">Admin Panel</h2>
        <nav className="flex flex-col gap-4">
          <Link href="/admin/tournaments" className="hover:text-blue-300 transition-colors">🏆 Tournaments</Link>
          <Link href="/admin/teams" className="hover:text-blue-300 transition-colors">🛡️ Teams</Link>
          <Link href="/admin/players" className="hover:text-blue-300 transition-colors">🏏 Players</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8 text-slate-900 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
