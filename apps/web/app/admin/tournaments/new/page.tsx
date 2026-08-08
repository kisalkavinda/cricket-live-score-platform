'use client';

import { useState } from 'react';
import { createTournament } from '../../actions';
import { useRouter } from 'next/navigation';

export default function NewTournamentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    await createTournament(formData);
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create New Tournament</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tournament Name</label>
          <input type="text" name="name" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. CPL 2026" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
            <input type="text" name="season" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. 2026" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Format Description</label>
            <input type="text" name="format" required className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. T20 League" />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mt-6">
          <h2 className="text-lg font-bold mb-4">Initial Stage Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overs Per Innings</label>
              <input type="number" name="oversPerInnings" required min="1" className="w-full border-slate-300 rounded-lg p-3 border" placeholder="e.g. 20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Balls Per Over</label>
              <input type="number" name="ballsPerOver" required min="1" defaultValue="6" className="w-full border-slate-300 rounded-lg p-3 border" />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Tournament'}
        </button>
      </form>
    </div>
  );
}
