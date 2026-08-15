'use client';

import { useState } from 'react';
import { deleteTeamServerAction } from '@/lib/admin/admin-actions';

interface DeleteTeamButtonProps {
  teamId: string;
  teamName: string;
}

export default function DeleteTeamButton({ teamId, teamName }: DeleteTeamButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();

    const confirmed = window.confirm(
      `⚠️ VERIFICATION REQUIRED\n\nAre you sure you want to permanently delete "${teamName}"?\n\nThis will remove the team and all player assignments from this roster. This action CANNOT be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteTeamServerAction(teamId);
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err: any) {
      alert(`Failed to delete team: ${err?.message || 'Unknown error'}`);
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleDelete}>
      <button
        type="submit"
        disabled={isDeleting}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          fontSize: '12px',
          fontWeight: 700,
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          opacity: isDeleting ? 0.6 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        {isDeleting ? 'Deleting Team...' : '🗑️ Delete Team'}
      </button>
    </form>
  );
}
