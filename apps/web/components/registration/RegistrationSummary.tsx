'use client';

import { RegistrationFormData } from '@/lib/validations/registration';

interface RegistrationSummaryProps {
  data: RegistrationFormData;
  tournamentName?: string;
  isSubmitting: boolean;
  onEdit: () => void;
  onSubmit: () => void;
}

export default function RegistrationSummary({
  data,
  tournamentName = 'University Cricket Tournament',
  isSubmitting,
  onEdit,
  onSubmit,
}: RegistrationSummaryProps) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Review Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-accent-bright)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Review & Confirmation Step
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 900,
            color: 'var(--color-paper)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          Review Registration Summary
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.92rem',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '560px',
            margin: '8px auto 0',
          }}
        >
          Please verify all details carefully for <strong style={{ color: 'var(--color-paper)' }}>{tournamentName}</strong> before final submission.
        </p>
      </div>

      {/* Team & Captain Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        {/* Team Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-ink-subtle)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Team Name
          </span>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.7rem',
              fontWeight: 800,
              color: 'var(--color-paper)',
            }}
          >
            {data.teamName}
          </h3>
        </div>

        {/* Leader Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-ink-subtle)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Captain / Team Leader
          </span>
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              fontWeight: 800,
              color: 'var(--color-paper)',
              marginBottom: '4px',
            }}
          >
            {data.leaderName}
          </h4>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.85rem',
              color: 'rgba(255, 255, 255, 0.75)',
            }}
          >
            <span>📱 {data.leaderWhatsapp}</span>
            <span>🎓 {data.leaderIndexNumber.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Squad Roster Table */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-md)',
          }}
        >
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--color-paper)',
              textTransform: 'uppercase',
            }}
          >
            Squad Roster ({data.players.length} Players)
          </h4>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent-bright)',
            }}
          >
            {data.players.length >= 11
              ? `11 Playing XI ${data.players.length > 11 ? `+ ${data.players.length - 11} Sub` : ''}`
              : `${data.players.length} Players`}
          </span>
        </div>

        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-ink-subtle)', width: '50px' }}>#</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-ink-subtle)', width: '140px' }}>Role / Slot</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-ink-subtle)' }}>Player Full Name</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-ink-subtle)', width: '180px' }}>University Index No.</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((player, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: index === data.players.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                    background: index >= 11 ? 'rgba(192, 39, 45, 0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-data)', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 700, color: index === 0 ? 'var(--color-accent-bright)' : index >= 11 ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-paper)' }}>
                    {index === 0
                      ? 'Captain / XI'
                      : index < 11
                      ? 'Playing XI'
                      : `Substitute ${index - 10}`}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-paper)' }}>
                    {player.name}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-data)', fontSize: '0.9rem', color: 'var(--color-accent-bright)', fontWeight: 700 }}>
                    {player.indexNumber.toUpperCase().replace(/\s+/g, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Substitute Rule Reminder */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '10px',
            lineHeight: 1.45,
          }}
        >
          * <strong>Tournament Rule:</strong> Only registered substitutes listed above are eligible to replace players in the event of injury or non-participation. If no registered substitutes remain, the team must continue with their remaining players.
        </p>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          disabled={isSubmitting}
          style={{
            height: '48px',
            padding: '0 24px',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: 'var(--radius-sm)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            color: '#FFFFFF',
            transition: 'all var(--dur-fast)',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = 'var(--color-accent-bright)';
              e.currentTarget.style.background = 'rgba(192, 39, 45, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }
          }}
        >
          ← Edit Information
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-hallmark-primary"
          style={{ height: '48px', padding: '0 28px', minWidth: '220px' }}
        >
          {isSubmitting ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg
                style={{ animation: 'spin 1s linear infinite' }}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
              </svg>
              Submitting Roster...
            </span>
          ) : (
            <span>Submit Official Registration →</span>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
