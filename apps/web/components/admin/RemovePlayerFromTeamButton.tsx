'use client';

import { useState } from 'react';
import { removePlayerFromTeamServerAction } from '@/lib/admin/admin-actions';

interface RemovePlayerProps {
  teamPlayerId: string;
  teamId: string;
  playerName: string;
  teamName?: string;
}

export default function RemovePlayerFromTeamButton({
  teamPlayerId,
  teamId,
  playerName,
  teamName,
}: RemovePlayerProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `⚠️ CONFIRMATION REQUIRED\n\nAre you sure you want to remove "${playerName}" from the squad roster${teamName ? ` of "${teamName}"` : ''}?\n\nThis will remove their squad assignment.`
    );

    if (!confirmed) return;

    setIsRemoving(true);
    try {
      await removePlayerFromTeamServerAction(teamPlayerId, teamId);
    } catch (err: any) {
      alert(`Failed to remove player: ${err?.message || 'Unknown error'}`);
      setIsRemoving(false);
    }
  }

  return (
    <form onSubmit={handleRemove} style={{ display: 'inline-block' }}>
      <button
        type="submit"
        disabled={isRemoving}
        title={`Remove ${playerName} from team`}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#EF4444',
          fontSize: '11px',
          fontWeight: 700,
          cursor: isRemoving ? 'not-allowed' : 'pointer',
          opacity: isRemoving ? 0.6 : 1,
        }}
      >
        {isRemoving ? 'Removing...' : 'Remove'}
      </button>
    </form>
  );
}
