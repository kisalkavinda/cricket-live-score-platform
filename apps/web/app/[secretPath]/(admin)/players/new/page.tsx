'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createPlayerServerAction } from '@/lib/admin/admin-actions';
import { createClient } from '@/utils/supabase/client';

export default function NewPlayerPage() {
  const params = useParams();
  const secretPath = (params?.secretPath as string) || 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;

      if (!name?.trim()) {
        setError('Please provide the player full name.');
        setIsSubmitting(false);
        return;
      }

      if (file) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB

        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        if (!allowedMimes.includes(file.type) || !allowedExts.includes(fileExt)) {
          setError('Invalid image format. Only JPEG, PNG, and WebP portrait photos are allowed (SVGs are rejected).');
          setIsSubmitting(false);
          return;
        }

        if (file.size > maxSizeBytes) {
          setError('Player photo file size exceeds the 5MB limit.');
          setIsSubmitting(false);
          return;
        }

        const supabase = createClient();
        const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const fileName = `${safeId}.${fileExt}`;
        const { data, error: uploadErr } = await supabase.storage
          .from('player-images')
          .upload(fileName, file, { contentType: file.type });

        if (uploadErr) {
          console.error('Error uploading file:', uploadErr);
          setError('Failed to upload player photo.');
          setIsSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('player-images')
          .getPublicUrl(fileName);

        formData.set('profileImageUrl', publicUrlData.publicUrl);
      }

      await createPlayerServerAction(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to add player.');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header & Back Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/${secretPath}/players`}
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
          ← Back to Players
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
          PLAYER ROSTER • NEW ATHLETE
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
          Add New Player
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#8B9BB4', margin: '6px 0 0' }}>
          Register a player to the university tournament database with index number and profile avatar.
        </p>
      </div>

      {/* Main Form Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
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
                borderRadius: '10px',
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

          {/* Player Name */}
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
              Player Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Charith Asalanka"
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Index Number & Role */}
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
                University Index / Registration No.
              </label>
              <input
                type="text"
                name="indexNumber"
                placeholder="e.g. IT22001920"
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
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
                Primary Playing Role
              </label>
              <select
                name="role"
                defaultValue="BATTER"
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="BATTER">🏏 Top-Order / Batter</option>
                <option value="BOWLER">⚡ Bowler (Pace/Spin)</option>
                <option value="ALL_ROUNDER">🌟 All-Rounder</option>
                <option value="WICKET_KEEPER">🧤 Wicketkeeper Batter</option>
              </select>
            </div>
          </div>

          {/* Player Photo */}
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
              Profile Photo
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#141A26',
                border: '1px dashed #2A364E',
                borderRadius: '12px',
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #F59E0B',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#1E2638',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  👤
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    display: 'block',
                    width: '100%',
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    cursor: 'pointer',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '4px 0 0' }}>
                  Upload clear portrait photograph for public team squads and scorecards.
                </p>
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
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: '0 4px 16px rgba(192, 39, 45, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? 'Saving Player...' : '👤 Save Player →'}
          </button>
        </form>
      </div>
    </div>
  );
}
