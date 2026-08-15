'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { RegistrationFormData } from '@/lib/validations/registration';

interface TeamDetailsFormProps {
  register: UseFormRegister<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
}

export default function TeamDetailsForm({ register, errors }: TeamDetailsFormProps) {
  return (
    <section
      aria-labelledby="team-info-heading"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ marginBottom: 'var(--space-lg)' }}>
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
          Section 01
        </span>
        <h3
          id="team-info-heading"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--color-paper)',
            letterSpacing: '0.02em',
          }}
        >
          Team & Leader Information
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.65)',
            marginTop: '4px',
          }}
        >
          Provide your official team name and captain/leader contact credentials.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* Team Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="teamName"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Team Name <span style={{ color: 'var(--color-accent-bright)' }}>*</span>
          </label>
          <input
            id="teamName"
            type="text"
            placeholder="e.g. Computing Strikers"
            aria-invalid={errors.teamName ? 'true' : 'false'}
            aria-describedby={errors.teamName ? 'teamName-error' : undefined}
            {...register('teamName')}
            style={{
              height: '46px',
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: errors.teamName
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color var(--dur-fast)',
            }}
          />
          {errors.teamName && (
            <span
              id="teamName-error"
              style={{
                color: 'var(--color-accent-bright)',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {errors.teamName.message}
            </span>
          )}
        </div>

        {/* Team Leader Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="leaderName"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Team Leader / Captain Name <span style={{ color: 'var(--color-accent-bright)' }}>*</span>
          </label>
          <input
            id="leaderName"
            type="text"
            placeholder="e.g. John Smith"
            aria-invalid={errors.leaderName ? 'true' : 'false'}
            aria-describedby={errors.leaderName ? 'leaderName-error' : undefined}
            {...register('leaderName')}
            style={{
              height: '46px',
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: errors.leaderName
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color var(--dur-fast)',
            }}
          />
          {errors.leaderName && (
            <span
              id="leaderName-error"
              style={{
                color: 'var(--color-accent-bright)',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {errors.leaderName.message}
            </span>
          )}
        </div>

        {/* WhatsApp Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="leaderWhatsapp"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Leader WhatsApp Number <span style={{ color: 'var(--color-accent-bright)' }}>*</span>
          </label>
          <input
            id="leaderWhatsapp"
            type="tel"
            placeholder="e.g. 0771234567 or +94771234567"
            aria-invalid={errors.leaderWhatsapp ? 'true' : 'false'}
            aria-describedby={errors.leaderWhatsapp ? 'leaderWhatsapp-error' : undefined}
            {...register('leaderWhatsapp')}
            style={{
              height: '46px',
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: errors.leaderWhatsapp
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color var(--dur-fast)',
            }}
          />
          {errors.leaderWhatsapp && (
            <span
              id="leaderWhatsapp-error"
              style={{
                color: 'var(--color-accent-bright)',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {errors.leaderWhatsapp.message}
            </span>
          )}
        </div>

        {/* Leader University Index Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="leaderIndexNumber"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Leader University Index No. <span style={{ color: 'var(--color-accent-bright)' }}>*</span>
          </label>
          <input
            id="leaderIndexNumber"
            type="text"
            placeholder="e.g. D/B**/2*/0000"
            aria-invalid={errors.leaderIndexNumber ? 'true' : 'false'}
            aria-describedby={errors.leaderIndexNumber ? 'leaderIndexNumber-error' : undefined}
            {...register('leaderIndexNumber')}
            style={{
              height: '46px',
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: errors.leaderIndexNumber
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              outline: 'none',
              transition: 'border-color var(--dur-fast)',
            }}
          />
          {errors.leaderIndexNumber && (
            <span
              id="leaderIndexNumber-error"
              style={{
                color: 'var(--color-accent-bright)',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {errors.leaderIndexNumber.message}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            Note: The captain must also be listed in the squad roster below.
          </span>
        </div>
      </div>
    </section>
  );
}
