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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
          Eligibility Rules
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '4px 0 0', color: '#FFFFFF' }}>
          Older-Batch Squad Exceptions
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem', marginTop: '6px' }}>
          Pre-approved exception rules allowing older student batches to register with 7–10 squad members instead of the standard 11 players.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        {/* Create Rule Form */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
            Add Exception Rule
          </h3>

          <form action={createExceptionServerAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                Tournament *
              </label>
              <select
                name="tournamentId"
                required
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  background: '#161212',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
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
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
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
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                Index Prefix Match (Optional)
              </label>
              <input
                type="text"
                name="indexPrefix"
                placeholder="e.g. D/BCS/08 or IT08"
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                Allowed Minimum Squad Size (7–10) *
              </label>
              <input
                type="number"
                name="minPlayers"
                defaultValue={7}
                min={7}
                max={10}
                required
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                height: '42px',
                marginTop: '8px',
                borderRadius: '6px',
                background: '#C0272D',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              + Create Exception Rule
            </button>
          </form>
        </div>

        {/* Existing Rules List */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
            Active Exception Rules ({exceptions.length})
          </h3>

          {exceptions.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
              No exception rules configured. All teams currently require 11 players.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exceptions.map((ex: any) => (
                <div
                  key={ex.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem' }}>
                      {ex.name || ex.teamName || ex.indexPrefix || 'Exception Rule'}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: ex.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: ex.active ? '#22C55E' : 'rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      {ex.active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                    Min Squad: <strong>{ex.minPlayers} Players</strong>
                    {ex.teamName && <> · Team: <code>{ex.teamName}</code></>}
                    {ex.indexPrefix && <> · Prefix: <code>{ex.indexPrefix}</code></>}
                  </div>

                  <form action={toggleExceptionServerAction.bind(null, ex.id, !ex.active)} style={{ marginTop: '6px' }}>
                    <button
                      type="submit"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: ex.active ? '#EF4444' : '#22C55E',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {ex.active ? 'Disable Rule' : 'Enable Rule'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
