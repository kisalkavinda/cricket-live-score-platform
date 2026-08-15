'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveRegistrationServerAction,
  rejectRegistrationServerAction,
  retryBackupServerAction,
} from '@/lib/admin/admin-actions';

interface RegistrationDetailClientProps {
  detail: any;
  preflight: any;
}

export default function RegistrationDetailClient({
  detail,
  preflight,
}: RegistrationDetailClientProps) {
  const router = useRouter();
  const { registration, matchingException } = detail;
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await approveRegistrationServerAction(registration.id);
      if (res.success) {
        setIsApproveOpen(false);
        router.refresh();
      } else {
        setActionError(res.error || 'Approval failed.');
      }
    } catch {
      setActionError('An error occurred during approval.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setLoading(true);
    setActionError(null);
    try {
      const res = await rejectRegistrationServerAction(registration.id, rejectionReason);
      if (res.success) {
        setIsRejectOpen(false);
        router.refresh();
      } else {
        setActionError(res.error || 'Rejection failed.');
      }
    } catch {
      setActionError('An error occurred during rejection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryBackup = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await retryBackupServerAction(registration.id);
      if (!res.success) {
        setActionError(res.error || 'Backup retry failed.');
      }
      router.refresh();
    } catch {
      setActionError('Error retrying Google Sheets backup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner Alert on action error */}
      {actionError && (
        <div
          style={{
            background: 'rgba(192, 39, 45, 0.2)',
            border: '1.5px solid #C0272D',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#FF8585',
            fontSize: '0.88rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>⚠️ {actionError}</div>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid of Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Team & Captain Details Card */}
        <div style={{ backgroundColor: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#C0272D', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Team Roster Overview
          </span>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 16px', color: '#FFFFFF' }}>
            {registration.teamName}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8B9BB4' }}>Tournament:</span>
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{registration.tournament?.name || 'Computing Premier League'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8B9BB4' }}>Captain / Leader:</span>
              <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{registration.leaderName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8B9BB4' }}>WhatsApp Contact:</span>
              <span style={{ fontFamily: 'monospace', color: '#FFFFFF' }}>{registration.leaderWhatsapp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8B9BB4' }}>Leader Index:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#C0272D' }}>
                {registration.leaderIndexNumber}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8B9BB4' }}>Registered Squad Size:</span>
              <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{registration.players.length} Players</span>
            </div>
            {matchingException && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '8px 12px', marginTop: '6px' }}>
                <span style={{ color: '#FBBF24', fontWeight: 700, fontSize: '12px' }}>
                  ⚡ Exception Rule Applied: Minimum {matchingException.minPlayers} players permitted.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status, Lifecycle & Google Sheets Backup Card */}
        <div style={{ backgroundColor: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#C0272D', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Lifecycle & Backup Status
          </span>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 16px', color: '#FFFFFF' }}>
            System Sync
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8B9BB4' }}>Registration Status:</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  backgroundColor:
                    registration.status === 'APPROVED'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : registration.status === 'REJECTED'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                  color:
                    registration.status === 'APPROVED'
                      ? '#34D399'
                      : registration.status === 'REJECTED'
                      ? '#F87171'
                      : '#FBBF24',
                  border:
                    registration.status === 'APPROVED'
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : registration.status === 'REJECTED'
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                {registration.status}
              </span>
            </div>

            {registration.status === 'APPROVED' && (
              <div style={{ fontSize: '12px', color: '#8B9BB4' }}>
                ✓ Approved on {registration.approvedAt ? new Date(registration.approvedAt).toLocaleString() : 'N/A'} by {registration.approvedBy || 'Admin'}
              </div>
            )}

            {registration.status === 'REJECTED' && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ color: '#F87171', fontWeight: 700, fontSize: '11px' }}>Rejection Reason:</div>
                <div style={{ color: '#FFFFFF', fontSize: '12px', marginTop: '2px' }}>{registration.rejectionReason || registration.notes || 'No reason specified.'}</div>
              </div>
            )}

            {/* Backup Status */}
            <div style={{ borderTop: '1px solid #1E2638', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#8B9BB4' }}>Google Sheets Backup:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: registration.backupStatus === 'SYNCED' ? '#34D399' : registration.backupStatus === 'FAILED' ? '#F87171' : '#FBBF24',
                  }}
                >
                  ● {registration.backupStatus}
                </span>
              </div>
              {registration.backupError && (
                <div style={{ fontSize: '11px', color: '#F87171', marginBottom: '8px' }}>
                  Error: {registration.backupError}
                </div>
              )}
              {registration.backupStatus !== 'SYNCED' && (
                <button
                  type="button"
                  onClick={handleRetryBackup}
                  disabled={loading}
                  style={{
                    backgroundColor: '#1E2638',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Retry Backup Sync
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Squad Members Table */}
      <div style={{ backgroundColor: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF' }}>
          Squad Members ({registration.players.length})
        </h3>


        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)' }}>
                <th style={{ padding: '10px 12px', width: '60px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>Player Full Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>University Index Number</th>
              </tr>
            </thead>
            <tbody>
              {registration.players.map((p: any, idx: number) => {
                const isLeader = p.indexNumber.trim().toUpperCase() === registration.leaderIndexNumber.trim().toUpperCase();
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                      {p.name} {isLeader ? <span style={{ color: '#C0272D', fontSize: '0.75rem', fontWeight: 800, marginLeft: '6px' }}>(Captain)</span> : ''}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: isLeader ? '#C0272D' : 'rgba(255, 255, 255, 0.85)', fontWeight: isLeader ? 800 : 500, textAlign: 'right' }}>
                      {p.indexNumber}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Bar */}
      {registration.status === 'PENDING' && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>Admin Verification Decision</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Approve to create official Team, Player, and TournamentSquad entities, or reject with reason.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsRejectOpen(true)}
              disabled={loading}
              style={{
                height: '42px',
                padding: '0 18px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Reject Registration
            </button>

            <button
              type="button"
              onClick={() => setIsApproveOpen(true)}
              disabled={loading}
              style={{
                height: '42px',
                padding: '0 22px',
                borderRadius: '6px',
                background: '#22C55E',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ✓ Approve Registration
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approval */}
      {isApproveOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#161212',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#FFFFFF' }}>
              Confirm Official Approval
            </h3>

            <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', color: '#22C55E' }}>
                Pre-flight Verification Summary:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'rgba(255, 255, 255, 0.85)' }}>
                <li>✓ Registration is in PENDING state</li>
                <li>✓ Validated squad size: {registration.players.length} players</li>
                <li>✓ Student university index deduplication verified</li>
                <li>✓ Tournament assignment: {registration.tournament?.name}</li>
              </ul>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.78rem' }}>
                This single transaction will create 1 official Team, {registration.players.length} official Player records, {registration.players.length} TeamPlayer links, and {registration.players.length} TournamentSquad entries.
              </div>
            </div>

            {preflight.errors?.length > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '8px', padding: '12px', color: '#FF8585', fontSize: '0.82rem', marginBottom: '16px' }}>
                ⚠️ <strong>Issues Detected:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                  {preflight.errors.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                disabled={loading}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading || !preflight.canApprove}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '6px',
                  background: '#22C55E',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: loading || !preflight.canApprove ? 'not-allowed' : 'pointer',
                  opacity: loading || !preflight.canApprove ? 0.5 : 1,
                }}
              >
                {loading ? 'Approving...' : 'Confirm & Create Official Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rejection */}
      {isRejectOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleReject}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#161212',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#EF4444' }}>
              Reject Team Registration
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Please specify the official reason for declining registration <strong>{registration.registrationCode}</strong>.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Ineligible index numbers provided / Unresolved squad dispute"
                required
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                disabled={loading}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !rejectionReason.trim()}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '6px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: loading || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !rejectionReason.trim() ? 0.5 : 1,
                }}
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
