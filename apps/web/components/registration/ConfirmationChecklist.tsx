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
      title: 'University Enrollment & Batch Uniformity',
      desc: 'All registered playing members and substitutes are currently enrolled university students belonging to the exact same intake batch. No mixed-intake members are permitted.',
    },
    {
      num: '03',
      title: 'Index Number Authenticity',
      desc: 'All university student index numbers belong to the respective students and will undergo official verification by the tournament organizing committee.',
    },
    {
      num: '04',
      title: 'Official Captains WhatsApp Group',
      desc: 'The team captain must join the official CPL Captains WhatsApp group upon registration to receive official match schedules, pitch allocations, toss calls, and referee updates.',
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
            textTransform: 'uppercase',
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

      {/* Clean Hallmark Single Declaration Card */}
      <div
        style={{
          background: isChecked ? 'rgba(192, 39, 45, 0.08)' : 'rgba(0, 0, 0, 0.3)',
          border: isChecked
            ? '1.5px solid var(--color-accent)'
            : errors.confirmTermsAgreement
            ? '1.5px solid var(--color-accent-bright)'
            : '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          transition: 'all var(--dur-fast) var(--ease-out)',
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
              marginTop: '2px',
              accentColor: 'var(--color-accent)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--color-paper)' }}>
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
                color: 'var(--color-accent-bright)',
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
              fontFamily: 'var(--font-body)',
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

      {/* Hallmark Modal Dialog for Agreement Terms (No Scrollbar) */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="no-scrollbar"
            style={{
              backgroundColor: 'var(--color-paper-dark)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '580px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              padding: 'var(--space-lg)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              color: 'var(--color-paper)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
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
                    color: 'var(--color-accent-bright)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  Official Regulations
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    color: 'var(--color-paper)',
                    margin: 0,
                  }}
                >
                  Tournament Rules & Declarations
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all var(--dur-fast)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Clauses List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {agreementClauses.map((clause) => (
                <div
                  key={clause.num}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: 'var(--color-accent-bright)',
                      backgroundColor: 'rgba(192, 39, 45, 0.18)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {clause.num}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        color: 'var(--color-paper)',
                        marginBottom: '2px',
                      }}
                    >
                      {clause.title}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.82rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.45,
                      }}
                    >
                      {clause.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Bottom Actions */}
            <div
              style={{
                marginTop: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--space-xs)',
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-hallmark-outline"
                style={{
                  height: '42px',
                  padding: '0 20px',
                  color: 'var(--color-paper)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  fontSize: '0.95rem',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAgreeAndClose}
                className="btn-hallmark-primary"
                style={{
                  height: '42px',
                  padding: '0 24px',
                  fontSize: '0.95rem',
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
