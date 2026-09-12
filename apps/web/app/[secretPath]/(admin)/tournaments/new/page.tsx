'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createTournamentServerAction } from '@/lib/admin/admin-actions';
import { useParams } from 'next/navigation';

export default function NewTournamentPage() {
  const params = useParams();
  const secretPath = (params?.secretPath as string) || 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'6_TEAM' | '7_TEAM' | '8_TEAM'>('8_TEAM');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const season = formData.get('season') as string;
      const format = formData.get('format') as string;
      const oversPerInnings = Number(formData.get('oversPerInnings'));
      const ballsPerOver = Number(formData.get('ballsPerOver'));

      if (!name?.trim() || !season?.trim() || !format?.trim()) {
        setError('Please fill in all tournament information fields.');
        setIsSubmitting(false);
        return;
      }

      if (oversPerInnings < 1 || ballsPerOver < 1) {
        setError('Overs and balls per over must be at least 1.');
        setIsSubmitting(false);
        return;
      }

      await createTournamentServerAction(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header & Back Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/${secretPath}/tournaments`}
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
            transition: 'color 0.2s',
          }}
        >
          ← Back to Tournaments
        </Link>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#F59E0B',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            marginBottom: '4px',
          }}
        >
          TOURNAMENT SETUP • NEW CHAMPIONSHIP
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            margin: 0,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
          }}
        >
          Create New Tournament
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#8B9BB4', margin: '6px 0 0' }}>
          Configure championship details, tournament format, and initial stage match rules.
        </p>
      </div>

      {/* Main Form Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>⚠️ {error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FCA5A5',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Tournament Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Tournament Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Colombo Premier League"
              style={{
                width: '100%',
                background: '#1A1616',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tournament Format Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Tournament Structure & Format *
            </label>
            <input type="hidden" name="tournamentFormat" value={selectedFormat} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {/* 6-Team Option */}
              <button
                type="button"
                onClick={() => setSelectedFormat('6_TEAM')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: selectedFormat === '6_TEAM' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedFormat === '6_TEAM' ? 'rgba(56, 189, 248, 0.12)' : '#1A1616',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: selectedFormat === '6_TEAM' ? '#38BDF8' : '#FFF' }}>
                    6 Teams
                  </span>
                  {selectedFormat === '6_TEAM' && <span style={{ color: '#38BDF8', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  2 Groups of 3 · 13 Matches Total
                </div>
              </button>

              {/* 7-Team Option */}
              <button
                type="button"
                onClick={() => setSelectedFormat('7_TEAM')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: selectedFormat === '7_TEAM' ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedFormat === '7_TEAM' ? 'rgba(245, 158, 11, 0.12)' : '#1A1616',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: selectedFormat === '7_TEAM' ? '#F59E0B' : '#FFF' }}>
                    7 Teams
                  </span>
                  {selectedFormat === '7_TEAM' && <span style={{ color: '#F59E0B', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  Groups: 4 & 3 · 11 Matches Total
                </div>
              </button>

              {/* 8-Team Option */}
              <button
                type="button"
                onClick={() => setSelectedFormat('8_TEAM')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: selectedFormat === '8_TEAM' ? '2px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedFormat === '8_TEAM' ? 'rgba(16, 185, 129, 0.12)' : '#1A1616',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: selectedFormat === '8_TEAM' ? '#10B981' : '#FFF' }}>
                    8 Teams
                  </span>
                  {selectedFormat === '8_TEAM' && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  2 Groups of 4 · 15 Matches Total
                </div>
              </button>
            </div>

            {/* Dynamic Format Requirement Breakdown */}
            <div
              style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.8rem',
                color: '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                {selectedFormat === '6_TEAM' && (
                  <span>
                    📋 <strong>6-Team Structure:</strong> 6 Teams Required · Group A (3) + Group B (3) · 6 Round-Robin + 3 Wildcard (WC1-3) + 3 Playoffs + Final.
                  </span>
                )}
                {selectedFormat === '7_TEAM' && (
                  <span>
                    📋 <strong>7-Team Structure:</strong> 7 Teams Required · Group A (4, Square Graph) + Group B (3, Round-Robin) · 7 Group + 3 Playoffs + Final.
                  </span>
                )}
                {selectedFormat === '8_TEAM' && (
                  <span>
                    📋 <strong>8-Team Structure:</strong> 8 Teams Required · Group A (4) + Group B (4) · 8 Group + 3 Qualification + 3 Playoffs + Final.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Season & Format Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Season *
              </label>
              <input
                type="text"
                name="season"
                required
                defaultValue="2026"
                placeholder="e.g. 2026"
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Format Description *
              </label>
              <input
                type="text"
                name="format"
                required
                defaultValue="Championship League"
                placeholder="e.g. Intake League, Knockout Cup"
                style={{
                  width: '100%',
                  background: '#1A1616',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Initial Stage Section */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#F59E0B',
                  margin: '0 0 4px',
                  letterSpacing: '0.02em',
                }}
              >
                Initial Stage Configuration
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#8B9BB4', margin: 0 }}>
                Sets default overs limit and delivery rules for the initial stage matches.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginBottom: '6px',
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  Overs Per Innings *
                </label>
                <input
                  type="number"
                  name="oversPerInnings"
                  required
                  min={1}
                  max={100}
                  defaultValue={6}
                  placeholder="6"
                  style={{
                    width: '100%',
                    background: '#1A1616',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginBottom: '6px',
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  Balls Per Over *
                </label>
                <input
                  type="number"
                  name="ballsPerOver"
                  required
                  min={1}
                  max={20}
                  defaultValue={6}
                  placeholder="6"
                  style={{
                    width: '100%',
                    background: '#1A1616',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(135deg, #C0272D 0%, #8E1B20 100%)',
              color: '#FFFFFF',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(192, 39, 45, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? 'Creating Tournament...' : '🏆 Create Tournament →'}
          </button>
        </form>
      </div>
    </div>
  );
}
