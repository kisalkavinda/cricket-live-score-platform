'use client';

import { useState } from 'react';
import { UseFormRegister, UseFormSetValue, FieldErrors, UseFormWatch } from 'react-hook-form';
import { RegistrationFormData } from '@/lib/validations/registration';

interface ConfirmationChecklistProps {
  register: UseFormRegister<RegistrationFormData>;
  setValue: UseFormSetValue<RegistrationFormData>;
  watch?: UseFormWatch<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
}

export default function ConfirmationChecklist({
  setValue,
  watch,
  errors,
}: ConfirmationChecklistProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const isChecked = watch ? watch('confirmTermsAgreement') : false;

  const handleAgreeAndClose = () => {
    setValue('confirmTermsAgreement', true, { shouldValidate: true });
    setValue('confirmInfoCorrect', true, { shouldValidate: true });
    setValue('confirmUniversityStudents', true, { shouldValidate: true });
    setValue('confirmIndexNumbers', true, { shouldValidate: true });
    setValue('confirmLeaderInfo', true, { shouldValidate: true });
    setModalOpen(false);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setValue('confirmTermsAgreement', val, { shouldValidate: true });
    setValue('confirmInfoCorrect', val, { shouldValidate: true });
    setValue('confirmUniversityStudents', val, { shouldValidate: true });
    setValue('confirmIndexNumbers', val, { shouldValidate: true });
    setValue('confirmLeaderInfo', val, { shouldValidate: true });
  };

  const agreementClauses = [
    {
      num: '01',
      title: 'Roster & Identity Accuracy',
      desc: 'All team names, player names, and contact credentials provided in this submission are 100% genuine, true, and accurate.',
    },
    {
      num: '02',
      title: 'University Student Enrollment',
      desc: 'All registered playing members and substitutes are currently enrolled university students who meet all tournament eligibility rules.',
    },
    {
      num: '03',
      title: 'Index Number Authenticity',
      desc: 'All university student index numbers belong to the respective students and will undergo official verification by the tournament organizing committee.',
    },
    {
      num: '04',
      title: 'Official Communications & WhatsApp',
      desc: 'The team captain’s WhatsApp contact will be used for all official match schedules, toss calls, umpire notices, and tournament updates.',
    },
    {
      num: '05',
      title: 'Code of Conduct & Fair Play',
      desc: 'All team members agree to uphold the spirit of cricket, respect umpire and match official decisions, and adhere to university code of conduct standards.',
    },
  ];

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
      {/* Section Header */}
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
            margin: 0,
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
          Confirm your squad eligibility to complete registration.
        </p>
      </div>

      {/* Clean Single Declaration Card */}
      <div
        style={{
          background: isChecked ? 'rgba(34, 197, 94, 0.06)' : 'rgba(0, 0, 0, 0.25)',
          border: isChecked
            ? '1.5px solid rgba(34, 197, 94, 0.35)'
            : errors.confirmTermsAgreement
            ? '1.5px solid var(--color-accent)'
            : '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <input
            id="confirmTermsAgreement"
            type="checkbox"
            checked={!!isChecked}
            onChange={handleCheckboxChange}
            style={{
              width: '20px',
              height: '20px',
              marginTop: '3px',
              accentColor: '#C0272D',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--color-paper)' }}>
            <label htmlFor="confirmTermsAgreement" style={{ cursor: 'pointer', fontWeight: 600 }}>
              I certify that all team members are eligible university students and I accept the{' '}
            </label>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#FFB800',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                display: 'inline',
              }}
            >
              Tournament Rules & Eligibility Terms
            </button>
            <span>.</span>
          </div>
        </div>

        {errors.confirmTermsAgreement && (
          <div
            style={{
              color: 'var(--color-accent-bright)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginTop: '8px',
              paddingLeft: '34px',
            }}
          >
            {errors.confirmTermsAgreement.message as string}
          </div>
        )}
      </div>

      {/* Clean Modal Dialog for Agreement Terms (No Scrollbar) */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="no-scrollbar"
            style={{
              backgroundColor: '#0D111A',
              border: '1px solid #1E283C',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              padding: '24px 28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
              color: '#FFFFFF',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #1A2336',
                marginBottom: '18px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: '#C0272D',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                  }}
                >
                  TOURNAMENT ELIGIBILITY AGREEMENT
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: '#FFFFFF' }}>
                  Official Terms & Declarations
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
                style={{
                  background: '#151C2C',
                  border: '1px solid #23304A',
                  color: '#94A3B8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Clauses List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agreementClauses.map((clause) => (
                <div
                  key={clause.num}
                  style={{
                    backgroundColor: '#121824',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #1A2336',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#C0272D',
                      backgroundColor: 'rgba(192, 39, 45, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    {clause.num}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '2px' }}>
                      {clause.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.45 }}>
                      {clause.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Bottom Actions */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #1A2336',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #23304A',
                  color: '#94A3B8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAgreeAndClose}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#C0272D',
                  border: '1px solid #D32F35',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
                }}
              >
                Accept & Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
