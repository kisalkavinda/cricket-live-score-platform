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
  register,
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
          Confirm your team eligibility and agree to tournament terms before reviewing your submission.
        </p>
      </div>

      {/* Unified Single Checkbox Card */}
      <div
        style={{
          background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 0, 0, 0.3)',
          border: isChecked
            ? '1.5px solid rgba(34, 197, 94, 0.4)'
            : errors.confirmTermsAgreement
            ? '1.5px solid var(--color-accent)'
            : '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
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
              width: '22px',
              height: '22px',
              marginTop: '2px',
              accentColor: '#C0272D',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1 }}>
            <label
              htmlFor="confirmTermsAgreement"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--color-paper)',
                cursor: 'pointer',
                lineHeight: 1.45,
                display: 'block',
              }}
            >
              I certify that all team members are eligible university students and I accept the Official Tournament Terms & Declaration.
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Includes student index verification and WhatsApp fixture notice terms.
              </span>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#FBBF24',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📜</span>
                <span>View Full Agreement & Rules ↗</span>
              </button>
            </div>
          </div>
        </div>

        {errors.confirmTermsAgreement && (
          <div
            style={{
              color: 'var(--color-accent-bright)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginTop: '10px',
              paddingLeft: '36px',
            }}
          >
            {errors.confirmTermsAgreement.message as string}
          </div>
        )}
      </div>

      {/* Modal Dialog for Agreement Clauses */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1.5px solid #1E2638',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
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
                borderBottom: '1px solid #1E2638',
                marginBottom: '20px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#C0272D',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                  }}
                >
                  OFFICIAL TOURNAMENT AGREEMENT
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: '#FFFFFF' }}>
                  Declaration & Eligibility Terms
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#1E2638',
                  border: '1px solid #2A364E',
                  color: '#94A3B8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Clauses List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: 1.5, color: '#CBD5E1' }}>
              <div style={{ backgroundColor: '#141A26', padding: '14px 16px', borderRadius: '8px', border: '1px solid #1E2638' }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  1. Roster & Identity Accuracy
                </div>
                <div>
                  I confirm that all team names, student names, and player designations provided in this submission are 100% true, genuine, and accurate.
                </div>
              </div>

              <div style={{ backgroundColor: '#141A26', padding: '14px 16px', borderRadius: '8px', border: '1px solid #1E2638' }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  2. University Student Enrollment
                </div>
                <div>
                  I certify that all listed players are currently enrolled university students and meet all official tournament eligibility and batch rules.
                </div>
              </div>

              <div style={{ backgroundColor: '#141A26', padding: '14px 16px', borderRadius: '8px', border: '1px solid #1E2638' }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  3. Index Number Authenticity
                </div>
                <div>
                  I confirm that all university index numbers belong to the respective students and will undergo official verification by the tournament committee.
                </div>
              </div>

              <div style={{ backgroundColor: '#141A26', padding: '14px 16px', borderRadius: '8px', border: '1px solid #1E2638' }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  4. Official Communications & WhatsApp
                </div>
                <div>
                  I confirm that the captain’s WhatsApp number is valid for receiving match fixtures, toss timings, and official disciplinary notices.
                </div>
              </div>

              <div style={{ backgroundColor: '#141A26', padding: '14px 16px', borderRadius: '8px', border: '1px solid #1E2638' }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  5. Spirit of Cricket & Code of Conduct
                </div>
                <div>
                  All players agree to abide by umpire decisions, tournament committee regulations, and the spirit of the game.
                </div>
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #1E2638',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#1E2638',
                  border: '1px solid #2A364E',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleAgreeAndClose}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#C0272D',
                  border: '1px solid #D32F35',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
                }}
              >
                ✓ I Understand & Accept Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
