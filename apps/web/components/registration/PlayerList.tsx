'use client';

import { UseFormRegister, FieldErrors, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { RegistrationFormData } from '@/lib/validations/registration';
import PlayerRow from './PlayerRow';

interface PlayerListProps {
  fields: { id: string }[];
  register: UseFormRegister<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
  append: UseFieldArrayAppend<RegistrationFormData, 'players'>;
  remove: UseFieldArrayRemove;
}

export default function PlayerList({
  fields,
  register,
  errors,
  append,
  remove,
}: PlayerListProps) {
  const count = fields.length;
  const isMax = count >= 13;

  const handleAddPlayer = () => {
    if (!isMax) {
      append({ name: '', indexNumber: '' });
    }
  };

  return (
    <section
      aria-labelledby="squad-roster-heading"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Section Header with Live Counter Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-bright)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Section 02
          </span>
          <h3
            id="squad-roster-heading"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Official Squad Roster
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.65)',
              marginTop: '4px',
            }}
          >
            Enter 11 Main Playing Squad members and up to 2 Registered Substitutes (Max 13 total).
          </p>
        </div>

        {/* Squad Counter Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            background: count >= 11 ? 'rgba(192, 39, 45, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: count >= 11 ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.9rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <span>Squad:</span>
          <span
            style={{
              color: count < 11 ? 'var(--color-accent-bright)' : 'var(--color-paper)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count >= 11
              ? `11 Main ${count > 11 ? `+ ${count - 11} Sub` : ''}`
              : `${count} Players`}
          </span>
        </div>
      </div>

      {errors.players?.root && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(192, 39, 45, 0.2)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-accent-bright)',
            fontSize: '0.85rem',
            marginBottom: 'var(--space-md)',
            fontWeight: 600,
          }}
        >
          {errors.players.root.message}
        </div>
      )}

      {/* Players List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {fields.map((field, index) => (
          <PlayerRow
            key={field.id}
            index={index}
            totalPlayers={count}
            register={register}
            errors={errors}
            onRemove={remove}
          />
        ))}
      </div>

      {/* Add Player Control Bar */}
      <div
        style={{
          marginTop: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          paddingTop: 'var(--space-md)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {count < 11
            ? `Complete your 11 Playing XI members (${11 - count} remaining).`
            : count < 13
            ? `You can add ${13 - count} registered substitute${13 - count === 1 ? '' : 's'} for injury / absence backup.`
            : 'Maximum squad limit reached (11 Playing XI + 2 Substitutes).'}
        </span>

        <button
          type="button"
          onClick={handleAddPlayer}
          disabled={isMax}
          style={{
            height: '42px',
            padding: '0 18px',
            fontSize: '0.88rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: 'var(--radius-sm)',
            cursor: isMax ? 'not-allowed' : 'pointer',
            opacity: isMax ? 0.45 : 1,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all var(--dur-fast)',
          }}
          onMouseEnter={(e) => {
            if (!isMax) {
              e.currentTarget.style.borderColor = 'var(--color-accent-bright)';
              e.currentTarget.style.background = 'rgba(192, 39, 45, 0.25)';
              e.currentTarget.style.color = '#FFFFFF';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMax) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#FFFFFF';
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {count >= 11
            ? `Add Substitute (${Math.max(0, count - 11)}/2)`
            : `Add Player (${count}/11)`}
        </button>
      </div>
    </section>
  );
}
