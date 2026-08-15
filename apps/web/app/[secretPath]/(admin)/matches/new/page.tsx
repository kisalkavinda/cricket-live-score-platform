import { prisma } from 'database';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { createMatchAction } from '@/lib/scoring/scoring-actions';

export const dynamic = 'force-dynamic';

export default async function NewMatchPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const [tournaments, teams] = await Promise.all([
    (prisma as any).tournament.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).team.findMany({ orderBy: { name: 'asc' } }),
  ]);

  async function handleCreateMatch(formData: FormData) {
    'use server';
    await requireAdminAuth();

    const tournamentId = formData.get('tournamentId') as string;
    const teamAId = formData.get('teamAId') as string;
    const teamBId = formData.get('teamBId') as string;
    const venue = formData.get('venue') as string;
    const scheduledAt = formData.get('scheduledAt') as string;
    const oversPerInnings = Number(formData.get('oversPerInnings') || 20);

    if (!tournamentId || !teamAId || !teamBId) {
      throw new Error('Tournament, Team A, and Team B are required.');
    }

    if (teamAId === teamBId) {
      throw new Error('Team A and Team B cannot be the same team.');
    }

    const result = await createMatchAction({
      tournamentId,
      teamAId,
      teamBId,
      venue,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      oversPerInnings,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create match.');
    }

    redirect(`/${entryPath}/matches/${result.matchId}/score`);
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/${entryPath}/matches`}
          style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          ← Back to Matches
        </Link>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 0', color: '#FFF' }}>
          Schedule New Match
        </h1>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
        <form action={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tournament */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
              Tournament *
            </label>
            <select
              name="tournamentId"
              required
              style={{
                width: '100%',
                background: '#1A1616',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#FFF',
                fontSize: '0.9rem',
              }}
            >
              <option value="">Select a tournament...</option>
              {tournaments.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </option>
              ))}
            </select>
          </div>

          {/* Teams Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
                Team A *
              </label>
              <select
                name="teamAId"
                required
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Select Team A...</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
                Team B *
              </label>
              <select
                name="teamBId"
                required
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Select Team B...</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Overs & Venue Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
                Overs / Innings *
              </label>
              <select
                name="oversPerInnings"
                defaultValue={20}
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                }}
              >
                <option value={5}>5 Overs (Super-5)</option>
                <option value={8}>8 Overs</option>
                <option value={10}>10 Overs (T10)</option>
                <option value={15}>15 Overs</option>
                <option value={20}>20 Overs (T20)</option>
                <option value={50}>50 Overs (ODI)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
                Venue
              </label>
              <input
                type="text"
                name="venue"
                defaultValue="R. Premadasa International Cricket Stadium, Colombo"
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              name="scheduledAt"
              style={{
                width: '100%',
                background: '#1A1616',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#FFF',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #C0272D 0%, #8E1B20 100%)',
              color: '#FFF',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '10px',
              boxShadow: '0 4px 12px rgba(192, 39, 45, 0.4)',
            }}
          >
            Create Match & Open Console →
          </button>
        </form>
      </div>
    </div>
  );
}
