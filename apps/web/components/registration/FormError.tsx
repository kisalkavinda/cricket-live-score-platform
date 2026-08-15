'use client';

interface FormErrorProps {
  message?: string | null;
  details?: Record<string, string[]>;
}

export default function FormError({ message, details }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(192, 39, 45, 0.15)',
        border: '1.5px solid var(--color-accent)',
        color: 'var(--color-paper)',
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            color: 'var(--color-accent-ink)',
            fontSize: '0.8rem',
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          !
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.92rem',
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {message}
        </span>
      </div>

      {details && Object.keys(details).length > 0 && (
        <ul
          style={{
            marginLeft: '32px',
            marginTop: '4px',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {Object.entries(details).map(([key, errors]) =>
            errors.map((err, idx) => (
              <li key={`${key}-${idx}`}>{err}</li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
