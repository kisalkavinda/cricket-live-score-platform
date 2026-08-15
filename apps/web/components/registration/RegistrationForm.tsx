'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registrationFormSchema,
  RegistrationFormData,
} from '@/lib/validations/registration';
import { submitRegistration } from '@/lib/api/registrations';
import TeamDetailsForm from './TeamDetailsForm';
import PlayerList from './PlayerList';
import ConfirmationChecklist from './ConfirmationChecklist';
import RegistrationSummary from './RegistrationSummary';
import FormError from './FormError';

interface RegistrationFormProps {
  tournamentId: string;
  tournamentName?: string;
}

export default function RegistrationForm({
  tournamentId,
  tournamentName = 'University Cricket Tournament',
}: RegistrationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<'FORM' | 'REVIEW'>('FORM');
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorDetails, setServerErrorDetails] = useState<Record<string, string[]> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with standard 11 player rows by default
  const initialPlayers = Array.from({ length: 11 }, () => ({
    name: '',
    indexNumber: '',
  }));

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      tournamentId,
      teamName: '',
      leaderName: '',
      leaderWhatsapp: '',
      leaderIndexNumber: '',
      players: initialPlayers,
      confirmInfoCorrect: false,
      confirmUniversityStudents: false,
      confirmIndexNumbers: false,
      confirmLeaderInfo: false,
    },
    mode: 'onTouched',
  });

  const leaderName = watch('leaderName');
  const leaderIndexNumber = watch('leaderIndexNumber');

  // Auto-sync Captain / Leader details directly into Player 1 slot
  useEffect(() => {
    setValue('players.0.name', leaderName || '', { shouldValidate: !!leaderName });
  }, [leaderName, setValue]);

  useEffect(() => {
    setValue('players.0.indexNumber', leaderIndexNumber || '', { shouldValidate: !!leaderIndexNumber });
  }, [leaderIndexNumber, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'players',
  });

  // Handler for advancing to Review stage
  const handleProceedToReview = async () => {
    setServerError(null);
    setServerErrorDetails(undefined);

    const isValid = await trigger();
    if (isValid) {
      setStep('REVIEW');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      setServerError('Please correct the highlighted fields before reviewing your submission.');
    }
  };

  // Final submission handler
  const handleFinalSubmit = async () => {
    if (isSubmitting) return; // Prevent double click

    setIsSubmitting(true);
    setServerError(null);
    setServerErrorDetails(undefined);

    const values = getValues();

    try {
      const response = await submitRegistration(values);

      if (response.success && response.registrationCode) {
        // Redirect to success page with only the safe registration code in the URL
        router.push(`/register/success?registration=${encodeURIComponent(response.registrationCode)}`);
      } else {
        setServerError(response.error || 'Failed to submit registration. Please try again.');
        setServerErrorDetails(response.details);
        setStep('FORM'); // Return to form so user can fix issues
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setServerError(`Unable to connect to the server: ${msg}. Please try again.`);
      setStep('FORM');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
      {/* Top Error Alert Banner */}
      <FormError message={serverError} details={serverErrorDetails} />

      {step === 'FORM' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProceedToReview();
          }}
          noValidate
        >
          {/* Section 1: Team & Leader Details */}
          <TeamDetailsForm register={register} errors={errors} />

          {/* Section 2: Player Squad List (7–13) */}
          <PlayerList
            fields={fields}
            register={register}
            errors={errors}
            append={append}
            remove={remove}
          />

          {/* Section 3: Official Declaration */}
          <ConfirmationChecklist register={register} setValue={setValue} errors={errors} />

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingTop: 'var(--space-md)',
            }}
          >
            <button
              type="submit"
              className="btn-hallmark-primary"
              id="btn-review-registration"
              style={{
                height: '50px',
                padding: '0 32px',
                fontSize: '1.1rem',
              }}
            >
              Review Registration →
            </button>
          </div>
        </form>
      ) : (
        /* Review Screen */
        <RegistrationSummary
          data={getValues()}
          tournamentName={tournamentName}
          isSubmitting={isSubmitting}
          onEdit={() => {
            setStep('FORM');
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onSubmit={handleFinalSubmit}
        />
      )}
    </div>
  );
}
