import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { logoutAdminServerAction } from '@/lib/admin/admin-actions';

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
    <div style={{ minHeight: '100vh', background: '#0D0B0B', display: 'flex', color: '#FFFFFF', fontFamily: 'var(--font-body)' }}>
      <aside
        style={{
          width: '260px',
          background: 'rgba(20, 16, 16, 0.98)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#C0272D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
              🏏
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em', fontFamily: 'var(--font-display)' }}>CPL ADMIN</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>Tournament Manager</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '20px' }}>
            <Link href={`/${entryPath}/dashboard`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              📊 Dashboard
            </Link>
            <Link href={`/${entryPath}/registrations`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              📋 Registrations
            </Link>
            <Link href={`/${entryPath}/registration-exceptions`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              ⚙️ Older Exceptions
            </Link>
            <Link href={`/${entryPath}/teams`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              🛡️ Official Teams
            </Link>
            <Link href={`/${entryPath}/players`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              🏏 Official Players
            </Link>
            <Link href={`/${entryPath}/tournaments`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              🏆 Tournaments
            </Link>
            <Link href={`/${entryPath}/matches`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', color: '#FFB800', background: 'rgba(255, 184, 0, 0.1)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700, border: '1px solid rgba(255, 184, 0, 0.2)' }}>
              🔴 Live Scoring & Matches
            </Link>
          </nav>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            👤 <strong>{session.username}</strong>
          </div>
          <form action={logoutAdminServerAction}>
            <button
              type="submit"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FF6B6B',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
