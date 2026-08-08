'use server';

import { prisma } from 'database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTeam(formData: FormData) {
  const name = formData.get('name') as string;
  const shortName = formData.get('shortName') as string;
  const city = formData.get('city') as string;
  const logoUrl = formData.get('logoUrl') as string | null;

  await prisma.team.create({
    data: {
      name,
      shortName,
      city,
      logoUrl,
    },
  });

  revalidatePath('/admin/teams');
  redirect('/admin/teams');
}

export async function createPlayer(formData: FormData) {
  const name = formData.get('name') as string;
  const role = formData.get('role') as any;
  const battingStyle = formData.get('battingStyle') as string;
  const bowlingStyle = formData.get('bowlingStyle') as string;
  const profileImageUrl = formData.get('profileImageUrl') as string | null;

  await prisma.player.create({
    data: {
      name,
      role,
      battingStyle,
      bowlingStyle,
      profileImageUrl,
    },
  });

  revalidatePath('/admin/players');
  redirect('/admin/players');
}

export async function createTournament(formData: FormData) {
  const name = formData.get('name') as string;
  const season = formData.get('season') as string;
  const format = formData.get('format') as string;
  const oversPerInnings = parseInt(formData.get('oversPerInnings') as string, 10);
  const ballsPerOver = parseInt(formData.get('ballsPerOver') as string, 10);

  const tournament = await prisma.tournament.create({
    data: {
      name,
      season,
      format,
      stages: {
        create: [
          {
            name: "Group Stage",
            stageOrder: 1,
            oversPerInnings,
            ballsPerOver,
          }
        ]
      }
    },
  });

  revalidatePath('/admin/tournaments');
  redirect('/admin/tournaments');
}
