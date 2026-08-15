'use client';

import { useState } from 'react';
import { deleteRegistrationServerAction } from '@/lib/admin/admin-actions';

interface DeleteRegistrationButtonProps {
  registrationId: string;
  registrationCode: string;
  teamName: string;
  isIconOnly?: boolean;
}

export default function DeleteRegistrationButton({
  registrationId,
  registrationCode,
  teamName,
  isIconOnly = false,
}: DeleteRegistrationButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `⚠️ VERIFICATION REQUIRED\n\nAre you sure you want to permanently delete registration "${registrationCode}" for team "${teamName}"?\n\nThis will remove the entire registration application and player list. This action CANNOT be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteRegistrationServerAction(registrationId);
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err: any) {
      alert(`Failed to delete registration: ${err?.message || 'Unknown error'}`);
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleDelete} style={{ display: 'inline-block' }}>
      <button
        type="submit"
        disabled={isDeleting}
        title={`Delete registration ${registrationCode}`}
        style={
          isIconOnly
            ? {
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }
            : {
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
              }
        }
      >
        {isDeleting ? '...' : isIconOnly ? '🗑️' : '🗑️ Delete Registration'}
      </button>
    </form>
  );
}
