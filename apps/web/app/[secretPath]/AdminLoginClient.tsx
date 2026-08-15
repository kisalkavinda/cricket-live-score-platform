'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdminServerAction } from '@/lib/admin/admin-actions';

export default function AdminLoginClient({ secretPath }: { secretPath: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginAdminServerAction(password);
      if (res.success) {
        router.push(`/${secretPath}/dashboard`);
        router.refresh();
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0909',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#C0272D',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              marginBottom: '12px',
            }}
          >
            🛡️
          </div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#FFFFFF',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.02em',
              margin: 0,
            }}
          >
            CPL Tournament Portal
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.82rem', marginTop: '6px' }}>
            Enter administrator passkey to access tournament console.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(192, 39, 45, 0.2)',
              border: '1px solid #C0272D',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#FF8585',
              fontSize: '0.82rem',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
              Master Passkey
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoFocus
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '48px',
              marginTop: '8px',
              borderRadius: '8px',
              background: '#C0272D',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.92rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Console →'}
          </button>
        </form>
      </div>
    </div>
  );
}
