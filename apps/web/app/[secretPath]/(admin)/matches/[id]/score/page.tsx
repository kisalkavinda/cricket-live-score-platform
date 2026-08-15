import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getMatchDetail } from '@/lib/scoring/scoring-service';
import ScoringConsole from '@/components/scoring/ScoringConsole';


export const dynamic = 'force-dynamic';

export default async function AdminScoringPage({
  params,
}: {
  params: Promise<{ secretPath: string; id: string }>;
}) {
  await requireAdminAuth();
  const { id } = await params;
  const entryPath = getAdminEntryPath();

  const match = await getMatchDetail(id);
  if (!match) notFound();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Link
          href={`/${entryPath}/matches`}
          style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          ← Back to Matches List
        </Link>
        <Link
          href={`/scorecard?matchId=${match.id}`}
          target="_blank"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#FFF',
            padding: '6px 12px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          Open Public Scoreboard ↗
        </Link>
      </div>

      <ScoringConsole initialMatch={match} entryPath={entryPath} />
    </div>
  );
}
