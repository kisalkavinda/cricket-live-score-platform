'use client';

import { useState } from 'react';
import { createTeamServerAction } from '@/lib/admin/admin-actions';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function NewTeamPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    if (file) {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('team-logos')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload logo.');
        setIsSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);

      formData.set('logoUrl', publicUrlData.publicUrl);
    }

    await createTeamServerAction(formData);
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create New Team</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
          <input type="text" name="name" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. Thunderbolts CC" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Short Name (Code)</label>
          <input type="text" name="shortName" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. TCC" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input type="text" name="city" className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. Colombo" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Team Logo</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border-slate-300 rounded-lg p-2 border" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Team'}
        </button>
      </form>
    </div>
  );
}
