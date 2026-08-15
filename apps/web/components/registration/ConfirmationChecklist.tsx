'use client';

import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { RegistrationFormData } from '@/lib/validations/registration';

interface ConfirmationChecklistProps {
  register: UseFormRegister<RegistrationFormData>;
  setValue: UseFormSetValue<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
}

export default function ConfirmationChecklist({
  register,
  setValue,
  errors,
}: ConfirmationChecklistProps) {
  const checklists = [
    {
      id: 'confirmInfoCorrect',
      label: 'I confirm that all team and roster information provided is true and accurate.',
      error: errors.confirmInfoCorrect,
    },
    {
      id: 'confirmUniversityStudents',
      label: 'I certify that all listed players are currently enrolled university students and meet eligibility criteria.',
      error: errors.confirmUniversityStudents,
    },
    {
      id: 'confirmIndexNumbers',
      label: 'I confirm that all university index numbers are accurate and belong to the respective students.',
      error: errors.confirmIndexNumbers,
    },
    {
      id: 'confirmLeaderInfo',
      label: 'I confirm that the team leader WhatsApp number and university index are correct for official tournament notices.',
      error: errors.confirmLeaderInfo,
    },
  ];

  const handleAcceptAll = () => {
    setValue('confirmInfoCorrect', true, { shouldValidate: true });
    setValue('confirmUniversityStudents', true, { shouldValidate: true });
    setValue('confirmIndexNumbers', true, { shouldValidate: true });
    setValue('confirmLeaderInfo', true, { shouldValidate: true });
  };

  return (
    <section
      aria-labelledby="declaration-heading"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
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
            Section 03
          </span>
          <h3
            id="declaration-heading"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--color-paper)',
              letterSpacing: '0.02em',
            }}
          >
            Official Declaration & Eligibility
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.65)',
              marginTop: '4px',
            }}
          >
            Please review and check each declaration before proceeding to review your submission.
          </p>
        </div>

        {/* Accept All Declarations Button */}
        <button
          type="button"
          onClick={handleAcceptAll}
          style={{
            height: '38px',
            padding: '0 16px',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: 'rgba(192, 39, 45, 0.15)',
            border: '1.5px solid var(--color-accent)',
            color: 'var(--color-paper)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all var(--dur-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent-ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(192, 39, 45, 0.15)';
            e.currentTarget.style.color = 'var(--color-paper)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Accept All Declarations
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {checklists.map((item) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: item.error
                  ? '1px solid var(--color-accent)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'background var(--dur-fast)',
              }}
            >
              <input
                id={item.id}
                type="checkbox"
                {...register(item.id as keyof RegistrationFormData)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  accentColor: 'var(--color-accent)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.45,
                }}
              >
                {item.label}
              </span>
            </label>
            {item.error && (
              <span
                style={{
                  color: 'var(--color-accent-bright)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  marginLeft: '30px',
                }}
              >
                {item.error.message}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
