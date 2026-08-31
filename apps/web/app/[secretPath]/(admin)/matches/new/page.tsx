import { prisma } from 'database';
import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import NewMatchForm from './NewMatchForm';

export const dynamic = 'force-dynamic';

export default async function NewMatchPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const [tournaments, teams] = await Promise.all([
    (prisma as any).tournament.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        season: true,
        stages: { select: { oversPerInnings: true, ballsPerOver: true } },
      },
    }),
    (prisma as any).team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, shortName: true, logoUrl: true, city: true },
    }),
  ]);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header & Back Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/${entryPath}/matches`}
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
            transition: 'color 0.2s',
          }}
        >
          ← Back to Matches
        </Link>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#F59E0B',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            marginBottom: '4px',
          }}
        >
          MATCH OPERATIONS • FIXTURE ENGINE
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            margin: 0,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
          }}
        >
          Schedule New Match
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#8B9BB4', margin: '6px 0 0' }}>
          Configure fixture details, select contending teams, customize overs & rules, or immediately launch the live scoring engine.
        </p>
      </div>

      {/* Main Form Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
        }}
      >
        <NewMatchForm tournaments={tournaments} teams={teams} entryPath={entryPath} />
      </div>
    </div>
  );
}
