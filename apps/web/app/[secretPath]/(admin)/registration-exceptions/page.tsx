import { requireAdminAuth } from '@/lib/auth/admin-auth';
import { getExceptionsList } from '@/lib/admin/admin-service';
import { prisma } from 'database';
import {
  createExceptionServerAction,
  toggleExceptionServerAction,
} from '@/lib/admin/admin-actions';

export default async function RegistrationExceptionsPage() {
  await requireAdminAuth();
  const [exceptions, tournaments] = await Promise.all([
    getExceptionsList(),
    (prisma as any).tournament.findMany({ select: { id: true, name: true, season: true } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #1E2638',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#C0272D',
              textTransform: 'uppercase',
              marginBottom: '4px',
              fontFamily: 'monospace',
            }}
          >
            ELIGIBILITY RULES • {exceptions.length} EXCEPTIONS
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Older-Batch Squad Exceptions
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Pre-approved exception rules allowing older student batches to register with 7–10 squad members instead of the standard 11 players.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Create Rule Form */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid #1E2638',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF' }}>
            Add Exception Rule
          </h3>

          <form action={createExceptionServerAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                Tournament *
              </label>
              <select
                name="tournamentId"
                required
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
                {tournaments.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.season})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                Rule Name / Description
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. 2008 Batch Alumni Exception"
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
                Team Name Match (Optional)
              </label>
              <input
                type="text"
                name="teamName"
                placeholder="e.g. 2008 Batch"
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
                Index Prefix Match (Optional)
              </label>
              <input
                type="text"
                name="indexPrefix"
                placeholder="e.g. IT08 or EN08"
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
                Allowed Minimum Squad Size (Default: 7)
              </label>
              <input
                type="number"
                name="minPlayers"
                defaultValue={7}
                min={7}
                max={10}
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
                Notes
              </label>
              <textarea
                name="notes"
                placeholder="Optional internal justification notes..."
                style={{
                  width: '100%',
                  height: '60px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1A1F2C',
                  border: '1px solid #2A364E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: '6px',
                height: '42px',
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
              + Create Exception Rule
            </button>
          </form>
        </div>

        {/* Existing Exceptions List */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid #1E2638',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF' }}>
            Active Exception Rules ({exceptions.length})
          </h3>

          {exceptions.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8B9BB4', fontSize: '13px' }}>
              No exception rules configured. Standard 11-player minimum applies to all teams.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exceptions.map((ex: any) => (
                <div
                  key={ex.id}
                  style={{
                    backgroundColor: '#141A26',
                    border: '1px solid #1E2638',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '14px' }}>
                      {ex.name || 'Unnamed Rule'}
                    </div>
                    <form
                      action={async () => {
                        'use server';
                        await toggleExceptionServerAction(ex.id, !ex.active);
                      }}
                    >
                      <button
                        type="submit"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          backgroundColor: ex.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: ex.active ? '#34D399' : '#F87171',
                          border: ex.active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        {ex.active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </form>
                  </div>

                  <div style={{ fontSize: '12px', color: '#8B9BB4', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {ex.teamName && <div>Team Match: <strong style={{ color: '#E2E8F0' }}>{ex.teamName}</strong></div>}
                    {ex.indexPrefix && <div>Index Prefix: <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>{ex.indexPrefix}*</strong></div>}
                    <div>Allowed Min: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{ex.minPlayers} players</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
