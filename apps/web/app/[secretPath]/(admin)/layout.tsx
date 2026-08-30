import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  if (secretPath !== entryPath) {
    notFound();
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0A0D14',
        color: '#E2E8F0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* SOLID DEDICATED SIDEBAR */}
      <aside
        style={{
          width: '260px',
          minWidth: '260px',
          maxWidth: '260px',
          backgroundColor: '#10141E',
          borderRight: '1px solid #1E2638',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '20px',
              borderBottom: '1px solid #1E2638',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #C0272D 0%, #7D1014 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(192, 39, 45, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
              }}
            >
              🏏
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '15px',
                  letterSpacing: '0.04em',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                }}
              >
                CPL COMMAND
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#8B9BB4',
                  marginTop: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tournament Admin
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#5A6B85',
                textTransform: 'uppercase',
                paddingLeft: '12px',
                marginBottom: '10px',
              }}
            >
              Menu
            </div>
            <AdminNavLinks entryPath={entryPath} />
          </div>
        </div>

        {/* User Session & Logout Footer */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid #1E2638',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#1E2638',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#CBD5E1',
                flexShrink: 0,
              }}
            >
              👤
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {session.username}
              </div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>
                ● Active
              </div>
            </div>
          </div>

          <form action={logoutAdminServerAction}>
            <button
              type="submit"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Exit
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTAINER */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '36px 48px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          backgroundColor: '#0A0D14',
        }}
      >
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
