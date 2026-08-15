import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getRegistrationDetail, verifyApprovalPreflight } from '@/lib/admin/admin-service';
import RegistrationDetailClient from './RegistrationDetailClient';

export default async function AdminRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string; secretPath: string }>;
}) {
  await requireAdminAuth();
  const { id } = await params;
  const entryPath = getAdminEntryPath();

  const [detail, preflight] = await Promise.all([
    getRegistrationDetail(id),
    verifyApprovalPreflight(id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/${entryPath}/registrations`}
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.82rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          ← Back to Registrations Queue
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
              Registration Dossier
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '4px 0 0', color: '#FFFFFF' }}>
              {detail.registration.registrationCode}
            </h1>
          </div>
        </div>
      </div>

      <RegistrationDetailClient detail={detail} preflight={preflight} />
    </div>
  );
}
