import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from 'database';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  updateTournamentServerAction,
  addTournamentStageServerAction,
} from '@/lib/admin/admin-actions';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string; secretPath: string }>;
}) {
  await requireAdminAuth();
  const { id } = await params;
  const entryPath = getAdminEntryPath();

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { stageOrder: 'asc' },
      },
      tournamentTeams: {
        include: {
          team: true,
        },
      },
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
        orderBy: { scheduledAt: 'asc' },
      },
      _count: {
        select: {
          registrations: true,
          tournamentSquads: true,
        },
      },
    },
  });

  if (!tournament) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            ● LIVE IN PROGRESS
          </span>
        );
      case 'REGISTRATION':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            REGISTRATION OPEN
          </span>
        );
      case 'SCHEDULED':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            SCHEDULED
          </span>
        );
      case 'COMPLETED':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: '#1E2638', color: '#94A3B8' }}>
            COMPLETED
          </span>
        );
      default:
        return (
          <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: '#1E2638', color: '#94A3B8' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back Navigation */}
      <div>
        <Link
          href={`/${entryPath}/tournaments`}
          style={{
            color: '#8B9BB4',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          ← Back to Tournaments
        </Link>
      </div>

      {/* Tournament Header Card */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
            }}
          >
            🏆
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {tournament.name}
              </h1>
              {getStatusBadge(tournament.status)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#8B9BB4' }}>
              <span>Season: <strong style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>{tournament.season}</strong></span>
              <span>Format: <strong style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>{tournament.format}</strong></span>
              <span>ID: <code style={{ fontFamily: 'monospace', color: '#8B9BB4' }}>{tournament.id.substring(0, 8)}...</code></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={`/${entryPath}/matches/new`}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#C0272D',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid #D32F35',
            }}
          >
            + Schedule Match
          </Link>
        </div>
      </div>

      {/* Grid: Settings Form (1 col) & Stages + Fixtures (1 col) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: General Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px' }}>
              Tournament Configuration
            </h3>

            <form
              action={async (formData: FormData) => {
                'use server';
                await updateTournamentServerAction(tournament.id, formData);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={tournament.name}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                    Season *
                  </label>
                  <input
                    type="text"
                    name="season"
                    required
                    defaultValue={tournament.season}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                    Format *
                  </label>
                  <input
                    type="text"
                    name="format"
                    required
                    defaultValue={tournament.format}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Tournament Status *
                </label>
                <select
                  name="status"
                  defaultValue={tournament.status}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="REGISTRATION">REGISTRATION - Open for Team Entries</option>
                  <option value="DRAFT">DRAFT - Internal Preparation</option>
                  <option value="SCHEDULED">SCHEDULED - Fixtures Scheduled</option>
                  <option value="LIVE">LIVE - Matches Actively In Progress</option>
                  <option value="KNOCKOUT">KNOCKOUT - Playoffs / Knockout Stage</option>
                  <option value="COMPLETED">COMPLETED - Championship Concluded</option>
                  <option value="CANCELLED">CANCELLED - Event Cancelled</option>
                </select>
                <p style={{ fontSize: '11px', color: '#8B9BB4', margin: '4px 0 0' }}>
                  Setting status to <strong>REGISTRATION</strong> or <strong>LIVE</strong> enables public squad registration.
                </p>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#C0272D',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: '1px solid #D32F35',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
                }}
              >
                Save Tournament Settings
              </button>
            </form>
          </div>

          {/* Participating Teams List */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 14px' }}>
              Participating Teams ({tournament.tournamentTeams?.length || 0})
            </h3>

            {tournament.tournamentTeams?.length === 0 ? (
              <div style={{ color: '#8B9BB4', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No teams officially enrolled yet. Approved team registrations are automatically allocated.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tournament.tournamentTeams.map((tt: any) => (
                  <div
                    key={tt.id}
                    style={{
                      backgroundColor: '#141A26',
                      border: '1px solid #1E2638',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13px' }}>
                        {tt.team.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>
                        {tt.team.shortName} • {tt.points} pts
                      </div>
                    </div>
                    <Link
                      href={`/${entryPath}/teams/${tt.team.id}`}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: '#1E2638',
                        color: '#CBD5E1',
                        fontSize: '11px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Roster →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stages & Overs Configuration + Fixtures */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tournament Stages */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px' }}>
              Tournament Stages & Match Rules
            </h3>

            {tournament.stages?.length === 0 ? (
              <div style={{ color: '#8B9BB4', fontSize: '13px', marginBottom: '16px' }}>
                No stages defined yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {tournament.stages.map((stage: any) => (
                  <div
                    key={stage.id}
                    style={{
                      backgroundColor: '#141A26',
                      border: '1px solid #1E2638',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '14px' }}>
                        {stage.name}
                      </span>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#FBBF24', fontSize: '11px', fontFamily: 'monospace' }}>
                        Order: {stage.stageOrder}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', color: '#8B9BB4', marginTop: '8px' }}>
                      <div>Overs: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{stage.oversPerInnings}</strong></div>
                      <div>Balls/Over: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{stage.ballsPerOver}</strong></div>
                      <div>Win: <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>{stage.pointsForWin} pts</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Stage Form */}
            <div style={{ borderTop: '1px solid #1E2638', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
                + Add Tournament Stage
              </div>
              <form
                action={async (formData: FormData) => {
                  'use server';
                  await addTournamentStageServerAction(tournament.id, formData);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Stage Name (e.g. Semi Finals, Finals)"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    name="oversPerInnings"
                    defaultValue={20}
                    placeholder="Overs (20)"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    name="stageOrder"
                    defaultValue={(tournament.stages?.length || 0) + 1}
                    placeholder="Stage Order"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: '#1E2638',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Stage
                </button>
              </form>
            </div>
          </div>

          {/* Fixtures & Matches */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Scheduled Fixtures ({tournament.matches?.length || 0})
              </h3>
              <Link
                href={`/${entryPath}/matches/new`}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#C0272D',
                  textDecoration: 'none',
                }}
              >
                + Add Fixture
              </Link>
            </div>

            {tournament.matches?.length === 0 ? (
              <div style={{ color: '#8B9BB4', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No fixtures scheduled for this tournament yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tournament.matches.map((m: any) => (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: '#141A26',
                      border: '1px solid #1E2638',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13px' }}>
                        {m.teamA.name} vs {m.teamB.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace', marginTop: '2px' }}>
                        Status: <span style={{ color: m.status === 'LIVE' ? '#34D399' : '#FBBF24' }}>{m.status}</span>
                      </div>
                    </div>
                    <Link
                      href={`/${entryPath}/matches/${m.id}/score`}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: m.status === 'LIVE' ? '#F59E0B' : '#1E2638',
                        color: m.status === 'LIVE' ? '#000000' : '#CBD5E1',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {m.status === 'LIVE' ? 'Scoring Console ⚡' : 'Open Match →'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
