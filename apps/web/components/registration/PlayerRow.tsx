'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { RegistrationFormData } from '@/lib/validations/registration';

interface PlayerRowProps {
  index: number;
  totalPlayers: number;
  register: UseFormRegister<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
  onRemove: (index: number) => void;
}

export default function PlayerRow({
  index,
  totalPlayers,
  register,
  errors,
  onRemove,
}: PlayerRowProps) {
  const playerErrors = errors.players?.[index];
  const canRemove = totalPlayers > 7;

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background:
                index === 0
                  ? 'var(--color-accent)'
                  : index >= 11
                  ? 'rgba(192, 39, 45, 0.25)'
                  : 'rgba(255, 255, 255, 0.1)',
              color:
                index === 0
                  ? 'var(--color-accent-ink)'
                  : index >= 11
                  ? 'var(--color-accent-bright)'
                  : 'var(--color-paper)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
            }}
          >
            {index + 1}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: index >= 11 ? 'var(--color-accent-bright)' : 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {index === 0
              ? 'Player 1 (Captain / Leader)'
              : index < 11
              ? `Player ${index + 1} (Playing XI)`
              : `Substitute ${index - 10} (Match-Day Reserve)`}
          </span>
        </div>

        {canRemove && index >= 7 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${index >= 11 ? `Substitute ${index - 10}` : `Player ${index + 1}`}`}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all var(--dur-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-accent-bright)';
              e.currentTarget.style.background = 'rgba(192, 39, 45, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Remove
          </button>
        )}
      </div>

      {/* Inputs Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Player Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor={`player-name-${index}`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            Player Full Name *
          </label>
          <input
            id={`player-name-${index}`}
            type="text"
            placeholder="e.g. John Smith"
            aria-invalid={playerErrors?.name ? 'true' : 'false'}
            {...register(`players.${index}.name` as const)}
            style={{
              height: '42px',
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: playerErrors?.name
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          {playerErrors?.name && (
            <span style={{ color: 'var(--color-accent-bright)', fontSize: '0.75rem', fontWeight: 500 }}>
              {playerErrors.name.message}
            </span>
          )}
        </div>

        {/* University Index Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor={`player-index-${index}`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            University Index Number *
          </label>
          <input
            id={`player-index-${index}`}
            type="text"
            placeholder="e.g. D/B**/2*/0000"
            aria-invalid={playerErrors?.indexNumber ? 'true' : 'false'}
            {...register(`players.${index}.indexNumber` as const)}
            style={{
              height: '42px',
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: playerErrors?.indexNumber
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              outline: 'none',
            }}
          />
          {playerErrors?.indexNumber && (
            <span style={{ color: 'var(--color-accent-bright)', fontSize: '0.75rem', fontWeight: 500 }}>
              {playerErrors.indexNumber.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
