'use client';

import { useState } from 'react';
import { deletePlayerServerAction } from '@/lib/admin/admin-actions';

interface DeletePlayerButtonProps {
  playerId: string;
  playerName: string;
}

export default function DeletePlayerButton({ playerId, playerName }: DeletePlayerButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();

    const confirmed = window.confirm(
      `⚠️ VERIFICATION REQUIRED\n\nAre you sure you want to permanently delete player "${playerName}"?\n\nThis will remove the player record and all team squad roster assignments. This action CANNOT be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deletePlayerServerAction(playerId);
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err: any) {
      alert(`Failed to delete player: ${err?.message || 'Unknown error'}`);
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
        {isDeleting ? 'Deleting Player...' : '🗑️ Delete Player'}
      </button>
    </form>
  );
}
