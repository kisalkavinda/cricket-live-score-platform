'use client';

import { useState } from 'react';
import { createPlayerServerAction } from '@/lib/admin/admin-actions';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function NewPlayerPage() {
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
        .from('player-images')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload image.');
        setIsSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('player-images')
        .getPublicUrl(fileName);

      formData.set('profileImageUrl', publicUrlData.publicUrl);
    }

    await createPlayerServerAction(formData);
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Add New Player</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Player Name</label>
          <input type="text" name="name" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. John Doe" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select name="role" required className="w-full border-slate-300 rounded-lg p-3 border bg-white">
            <option value="BATTER">Batter</option>
            <option value="BOWLER">Bowler</option>
            <option value="ALL_ROUNDER">All Rounder</option>
            <option value="WICKET_KEEPER">Wicket Keeper</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batting Style</label>
            <input type="text" name="battingStyle" className="w-full border-slate-300 rounded-lg p-3 border" placeholder="Right Hand Bat" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bowling Style</label>
            <input type="text" name="bowlingStyle" className="w-full border-slate-300 rounded-lg p-3 border" placeholder="Right Arm Fast" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border-slate-300 rounded-lg p-2 border" 
          />
          <p className="text-xs text-slate-500 mt-2">Note: For players under 18, ensure you have consent before uploading photos.</p>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Add Player'}
        </button>
      </form>
    </div>
  );
}
