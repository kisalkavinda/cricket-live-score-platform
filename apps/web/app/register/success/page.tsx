import { Metadata } from 'next';
import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';
import RegistrationSuccess from '@/components/registration/RegistrationSuccess';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getRegistrationReceipt } from '@/lib/registrations/registration-service';

export const metadata: Metadata = {
  title: `Registration Submitted | ${tournamentConfig.name}`,
  description: `Your team registration has been submitted successfully.`,
};

export default async function RegisterSuccessPage(props: {
  searchParams: Promise<{ registration?: string }>;
}) {
  const searchParams = await props.searchParams;
  const registrationCode = searchParams.registration;

  const receipt = registrationCode ? await getRegistrationReceipt(registrationCode) : null;

  return (
    <main
      style={{
        background: 'var(--color-paper-dark)',
        minHeight: '100vh',
        color: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          padding: '120px 20px 80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {registrationCode ? (
          <RegistrationSuccess
            registrationCode={registrationCode}
            tournamentName={receipt?.tournament?.name || tournamentConfig.name}
            receipt={receipt}
          />
        ) : (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-2xl) var(--space-xl)',
              textAlign: 'center',
              maxWidth: '560px',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                color: 'var(--color-paper)',
                marginBottom: '16px',
              }}
            >
              No Registration Reference Found
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px' }}>
              Please complete the team registration form to submit your official squad roster.
            </p>
            <Link href="/register" className="btn-hallmark-primary">
              Go to Registration Form →
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
