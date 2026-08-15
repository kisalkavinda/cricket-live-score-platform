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
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
            Team Roster Overview
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 16px', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
            {registration.teamName}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Tournament:</span>
              <span style={{ fontWeight: 600 }}>{registration.tournament?.name || 'Computing Premier League'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Captain / Leader:</span>
              <span style={{ fontWeight: 700 }}>{registration.leaderName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>WhatsApp Contact:</span>
              <span style={{ fontFamily: 'monospace' }}>{registration.leaderWhatsapp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Leader Index:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#C0272D' }}>
                {registration.leaderIndexNumber}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Registered Squad Size:</span>
              <span style={{ fontWeight: 700 }}>{registration.players.length} Players</span>
            </div>
            {matchingException && (
              <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', padding: '8px 12px', marginTop: '6px' }}>
                <span style={{ color: '#EAB308', fontWeight: 700, fontSize: '0.78rem' }}>
                  ⚡ Exception Rule Applied: Minimum {matchingException.minPlayers} players permitted.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status, Lifecycle & Google Sheets Backup Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
            Lifecycle & Backup Status
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 16px', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
            System Sync
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Registration Status:</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background:
                    registration.status === 'APPROVED'
                      ? 'rgba(34, 197, 94, 0.2)'
                      : registration.status === 'REJECTED'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(234, 179, 8, 0.2)',
                  color:
                    registration.status === 'APPROVED'
                      ? '#22C55E'
                      : registration.status === 'REJECTED'
                      ? '#EF4444'
                      : '#EAB308',
                }}
              >
                {registration.status}
              </span>
            </div>

            {registration.status === 'APPROVED' && (
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                ✓ Approved on {registration.approvedAt ? new Date(registration.approvedAt).toLocaleString() : 'N/A'} by {registration.approvedBy || 'Admin'}
              </div>
            )}

            {registration.status === 'REJECTED' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.78rem' }}>Rejection Reason:</div>
                <div style={{ color: '#FFFFFF', fontSize: '0.82rem', marginTop: '2px' }}>{registration.rejectionReason || registration.notes || 'No reason specified.'}</div>
              </div>
            )}

            {/* Backup Status */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Google Sheets Backup:</span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: registration.backupStatus === 'SYNCED' ? '#22C55E' : registration.backupStatus === 'FAILED' ? '#EF4444' : '#EAB308',
                  }}
                >
                  ● {registration.backupStatus}
                </span>
              </div>
              {registration.backupError && (
                <div style={{ fontSize: '0.75rem', color: '#FF8585', marginBottom: '8px' }}>
                  Error: {registration.backupError}
                </div>
              )}
              {registration.backupStatus !== 'SYNCED' && (
                <button
                  type="button"
                  onClick={handleRetryBackup}
                  disabled={loading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    padding: '5px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
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
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
          Squad Members ({registration.players.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)' }}>
                <th style={{ padding: '10px 12px', width: '60px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>Player Full Name</th>
                <th style={{ padding: '10px 12px' }}>University Index Number</th>
                <th style={{ padding: '10px 12px' }}>Role / Status</th>
              </tr>
            </thead>
            <tbody>
              {registration.players.map((p: any, idx: number) => {
                const isLeader = p.indexNumber.trim().toUpperCase() === registration.leaderIndexNumber.trim().toUpperCase();
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#FFFFFF' }}>{p.name}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: isLeader ? '#C0272D' : 'rgba(255, 255, 255, 0.85)', fontWeight: isLeader ? 800 : 500 }}>
                      {p.indexNumber}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {isLeader ? (
                        <span style={{ background: 'rgba(192, 39, 45, 0.15)', color: '#C0272D', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          👑 CAPTAIN / LEADER
                        </span>
                      ) : idx < 11 ? (
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.78rem' }}>Playing Squad</span>
                      ) : (
                        <span style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                          Registered Substitute {idx - 10}
                        </span>
                      )}
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
