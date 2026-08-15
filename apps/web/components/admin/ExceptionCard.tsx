'use client';

import { useState } from 'react';
import {
  toggleExceptionServerAction,
  updateExceptionServerAction,
  deleteExceptionServerAction,
} from '@/lib/admin/admin-actions';

interface ExceptionCardProps {
  exception: {
    id: string;
    tournamentId: string;
    name: string | null;
    teamName: string | null;
    indexPrefix: string | null;
    minPlayers: number;
    active: boolean;
    notes: string | null;
  };
  tournaments: { id: string; name: string; season: string }[];
}

export default function ExceptionCard({ exception, tournaments }: ExceptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleToggle() {
    try {
      await toggleExceptionServerAction(exception.id, !exception.active);
    } catch (err: any) {
      alert(`Failed to toggle status: ${err?.message || 'Unknown error'}`);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `⚠️ VERIFICATION REQUIRED\n\nAre you sure you want to permanently delete exception rule "${exception.name || 'this rule'}"?\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteExceptionServerAction(exception.id);
    } catch (err: any) {
      alert(`Failed to delete exception rule: ${err?.message || 'Unknown error'}`);
      setIsDeleting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateExceptionServerAction(exception.id, formData);
      setIsEditing(false);
    } catch (err: any) {
      alert(`Failed to update exception: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#141A26',
        border: '1px solid #1E2638',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      {/* Top Row: Title, Toggle & Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '15px' }}>
          {exception.name || 'Unnamed Exception Rule'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggle}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'monospace',
              backgroundColor: exception.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: exception.active ? '#34D399' : '#F87171',
              border: exception.active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
            }}
          >
            {exception.active ? '● ACTIVE' : '○ DISABLED'}
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            title="Edit rule"
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isEditing ? 'rgba(192, 39, 45, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: isEditing ? '#F87171' : '#E2E8F0',
              border: '1px solid #2A364E',
              cursor: 'pointer',
            }}
          >
            {isEditing ? '✕ Cancel' : '✏️ Edit'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete rule"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? '...' : '🗑️'}
          </button>
        </div>
      </div>

      {/* View Mode */}
      {!isEditing ? (
        <div style={{ fontSize: '12px', color: '#8B9BB4', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            Allowed Min Squad: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{exception.minPlayers} players</strong>
          </div>
          {exception.teamName && (
            <div>
              Team Match: <strong style={{ color: '#E2E8F0' }}>{exception.teamName}</strong>
            </div>
          )}
          {exception.indexPrefix && (
            <div>
              Index Prefix: <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>{exception.indexPrefix}*</strong>
            </div>
          )}
          {exception.notes && (
            <div style={{ color: '#64748B', fontStyle: 'italic', marginTop: '4px' }}>
              Note: {exception.notes}
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode Form */
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid #1E2638' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
              Tournament
            </label>
            <select
              name="tournamentId"
              defaultValue={exception.tournamentId}
              required
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                backgroundColor: '#1A1F2C',
                border: '1px solid #2A364E',
                color: '#FFFFFF',
                fontSize: '12px',
              }}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
              Rule Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={exception.name || ''}
              required
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                backgroundColor: '#1A1F2C',
                border: '1px solid #2A364E',
                color: '#FFFFFF',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
                Team Name Match
              </label>
              <input
                type="text"
                name="teamName"
                defaultValue={exception.teamName || ''}
                placeholder="Optional"
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  backgroundColor: '#1A1F2C',
                  border: '1px solid #2A364E',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
                Index Prefix
              </label>
              <input
                type="text"
                name="indexPrefix"
                defaultValue={exception.indexPrefix || ''}
                placeholder="e.g. IT08"
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  backgroundColor: '#1A1F2C',
                  border: '1px solid #2A364E',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
                Min Squad Size
              </label>
              <input
                type="number"
                name="minPlayers"
                defaultValue={exception.minPlayers}
                min={7}
                max={10}
                required
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  backgroundColor: '#1A1F2C',
                  border: '1px solid #2A364E',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
                Status
              </label>
              <select
                name="active"
                defaultValue={exception.active ? 'true' : 'false'}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  backgroundColor: '#1A1F2C',
                  border: '1px solid #2A364E',
                  color: '#FFFFFF',
                  fontSize: '12px',
                }}
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '3px' }}>
              Notes
            </label>
            <input
              type="text"
              name="notes"
              defaultValue={exception.notes || ''}
              placeholder="Optional notes..."
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                backgroundColor: '#1A1F2C',
                border: '1px solid #2A364E',
                color: '#FFFFFF',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #2A364E',
                color: '#8B9BB4',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#C0272D',
                border: '1px solid #D32F35',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
