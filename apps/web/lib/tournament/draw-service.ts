import { prisma } from 'database';
import crypto from 'crypto';
import { broadcastDrawUpdate } from './draw-realtime';

function getDb(): any {
  if ((prisma as any)?.tournamentDraw) {
    return prisma as any;
  }
  try {
    const globalObj = globalThis as any;
    const req = typeof globalObj.__non_webpack_require__ !== 'undefined'
      ? globalObj.__non_webpack_require__
      : (typeof require !== 'undefined' ? require : null);
    if (req) {
      const { PrismaClient } = req('@prisma/client');
      const fresh = new PrismaClient({ log: ['error'] });
      globalObj.prisma = fresh;
      return fresh;
    }
    return prisma as any;
  } catch {
    return prisma as any;
  }
}

export type GroupIdentifier = 'GROUP_A' | 'GROUP_B' | 'GROUP_C';

export const GROUP_LABELS: Record<GroupIdentifier, string> = {
  GROUP_A: 'Group A',
  GROUP_B: 'Group B',
  GROUP_C: 'Group C',
};

const PASSCODE_SALT = process.env.DRAW_PASSCODE_SALT || 'cpl-ceremony-passcode-salt-2026';

/**
 * Cryptographically secure integer in [0, max - 1]
 */
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const range = 0xffffffff;
  const limit = range - (range % max);
  let rand: number;
  do {
    rand = crypto.randomBytes(4).readUInt32BE(0);
  } while (rand >= limit);
  return rand % max;
}

/**
 * Fisher-Yates shuffle using cryptographically secure random integers.
 */
function secureShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Hash captain passcode using SHA-256 and salt
 */
export function hashPasscode(passcode: string): string {
  return crypto
    .createHash('sha256')
    .update(passcode.toUpperCase().trim() + ':' + PASSCODE_SALT)
    .digest('hex');
}

/**
 * Verifies a submitted captain passcode against the stored hash
 */
export function verifyPasscode(passcode: string, storedHash: string): boolean {
  const computed = hashPasscode(passcode);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/**
 * Canonical string representation for cryptographic commitment.
 */
export function buildCanonicalCommitmentString(
  drawId: string,
  secretSalt: string,
  captainOrderTeamIds: string[],
  chits: Array<{ position: number; groupName: string }>
): string {
  const orderStr = captainOrderTeamIds.join(',');
  const chitsSorted = [...chits].sort((a, b) => a.position - b.position);
  const chitsStr = chitsSorted.map((c) => `${c.position}:${c.groupName}`).join('|');
  return `DRAW_ID:${drawId}|SALT:${secretSalt}|ORDER:${orderStr}|CHITS:${chitsStr}`;
}

/**
 * Compute SHA-256 commitment hash from canonical string
 */
export function computeCommitmentHash(canonicalPayload: string): string {
  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

/**
 * Sanitized public/admin draw view.
 * CRITICAL RULE: Chit groupName is strictly NULL for unrevealed chits.
 * Passcode hashes are never sent to any client.
 */
export async function getDrawState(tournamentId: string) {
  const client = getDb();
  let draw: any = null;

  try {
    if (client?.tournamentDraw?.findFirst) {
      draw = await client.tournamentDraw.findFirst({
        where: {
          tournamentId,
          status: { in: ['READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FINALIZED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          captainOrders: {
            include: {
              team: {
                select: { id: true, name: true, shortName: true, logoUrl: true },
              },
            },
            orderBy: { position: 'asc' },
          },
          chits: {
            orderBy: { position: 'asc' },
            include: {
              selectedByTeam: {
                select: { id: true, name: true, shortName: true, logoUrl: true },
              },
            },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
        },
      });
    } else {
      // Resilient raw SQL fallback for long-running Next.js dev server instances
      const draws: any[] = await client.$queryRawUnsafe(
        `SELECT * FROM "TournamentDraw"
         WHERE "tournamentId" = $1 AND "status"::text IN ('READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FINALIZED')
         ORDER BY "createdAt" DESC LIMIT 1`,
        tournamentId
      );

      if (draws && draws.length > 0) {
        draw = draws[0];

        const [captainOrders, chits, auditLogs]: [any[], any[], any[]] = await Promise.all([
          client.$queryRawUnsafe(
            `SELECT co."id", co."drawId", co."position", co."teamId", co."captainName",
                    json_build_object('id', t."id", 'name', t."name", 'shortName', t."shortName", 'logoUrl', t."logoUrl") as "team"
             FROM "TournamentDrawCaptainOrder" co
             JOIN "Team" t ON t."id" = co."teamId"
             WHERE co."drawId" = $1
             ORDER BY co."position" ASC`,
            draw.id
          ),
          client.$queryRawUnsafe(
            `SELECT c."id", c."drawId", c."position", c."groupName", c."isRevealed", c."selectedByTeamId", c."selectedAt",
                    CASE WHEN t."id" IS NOT NULL
                         THEN json_build_object('id', t."id", 'name', t."name", 'shortName', t."shortName", 'logoUrl', t."logoUrl")
                         ELSE NULL END as "selectedByTeam"
             FROM "TournamentDrawChit" c
             LEFT JOIN "Team" t ON t."id" = c."selectedByTeamId"
             WHERE c."drawId" = $1
             ORDER BY c."position" ASC`,
            draw.id
          ),
          client.$queryRawUnsafe(
            `SELECT * FROM "TournamentDrawAudit"
             WHERE "drawId" = $1
             ORDER BY "createdAt" DESC LIMIT 30`,
            draw.id
          ),
        ]);

        draw.captainOrders = captainOrders;
        draw.chits = chits;
        draw.auditLogs = auditLogs;
      }
    }
  } catch (err: any) {
    console.error('[draw-service] Error fetching draw state:', err);
    return null;
  }

  if (!draw) return null;

  // Calculate available remaining chits per group (without revealing which chit is which)
  const remainingCounts = {
    GROUP_A: 3,
    GROUP_B: 3,
    GROUP_C: 3,
  };

  const provisionalGroups = {
    GROUP_A: [] as Array<any>,
    GROUP_B: [] as Array<any>,
    GROUP_C: [] as Array<any>,
  };

  const drawHistory: Array<any> = [];

  for (const chit of draw.chits) {
    if (chit.isRevealed) {
      if (chit.groupName === 'GROUP_A' || chit.groupName === 'GROUP_B' || chit.groupName === 'GROUP_C') {
        remainingCounts[chit.groupName as GroupIdentifier]--;
        if (chit.selectedByTeam) {
          provisionalGroups[chit.groupName as GroupIdentifier].push({
            teamId: chit.selectedByTeam.id,
            name: chit.selectedByTeam.name,
            shortName: chit.selectedByTeam.shortName,
            logoUrl: chit.selectedByTeam.logoUrl,
            chitPosition: chit.position,
            selectedAt: chit.selectedAt,
          });
        }
      }
      if (chit.selectedByTeam) {
        drawHistory.push({
          chitPosition: chit.position,
          team: chit.selectedByTeam,
          groupName: chit.groupName,
          selectedAt: chit.selectedAt,
        });
      }
    }
  }

  // Sort history by selectedAt asc
  drawHistory.sort((a, b) => new Date(a.selectedAt).getTime() - new Date(b.selectedAt).getTime());

  // Determine current active captain
  const currentCaptain =
    draw.currentPickIndex < draw.captainOrders.length
      ? draw.captainOrders[draw.currentPickIndex]
      : null;

  // Sanitize chits: NEVER expose groupName if isRevealed is false!
  const sanitizedChits = draw.chits.map((c: any) => ({
    id: c.id,
    position: c.position,
    isRevealed: c.isRevealed,
    groupName: c.isRevealed ? c.groupName : null,
    selectedByTeam: c.isRevealed ? c.selectedByTeam : null,
    selectedAt: c.isRevealed ? c.selectedAt : null,
  }));

  // Sanitize captain orders: NEVER send passcodeHash
  const sanitizedCaptainOrders = draw.captainOrders.map((co: any) => ({
    id: co.id,
    position: co.position,
    teamId: co.teamId,
    captainName: co.captainName,
    team: co.team,
  }));

  return {
    id: draw.id,
    tournamentId: draw.tournamentId,
    status: draw.status,
    currentPickIndex: draw.currentPickIndex,
    commitmentHash: draw.commitmentHash,
    secretSalt: draw.status === 'FINALIZED' ? draw.secretSalt : null,
    createdAt: draw.createdAt,
    startedAt: draw.startedAt,
    pausedAt: draw.pausedAt,
    completedAt: draw.completedAt,
    finalizedAt: draw.finalizedAt,
    chits: sanitizedChits,
    captainOrders: sanitizedCaptainOrders,
    currentCaptain: currentCaptain
      ? {
          position: currentCaptain.position,
          teamId: currentCaptain.teamId,
          captainName: currentCaptain.captainName,
          team: currentCaptain.team,
        }
      : null,
    remainingCounts,
    provisionalGroups,
    drawHistory,
    auditLogs: draw.auditLogs.map((a: any) => ({
      id: a.id,
      eventType: a.eventType,
      teamId: a.teamId,
      chitPosition: a.chitPosition,
      groupName: a.groupName,
      actor: a.actor,
      description: a.description,
      createdAt: a.createdAt,
    })),
  };
}

/**
 * Pre-draw validation and eligible teams loader.
 */
export async function getEligibleTournamentTeams(tournamentId: string) {
  const client = getDb();
  const tournament = await client.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentTeams: {
        include: {
          team: {
            select: { id: true, name: true, shortName: true, logoUrl: true },
          },
        },
      },
      registrations: {
        where: { status: 'APPROVED' },
        select: {
          teamName: true,
          leaderName: true,
        },
      },
    },
  });

  if (!tournament) throw new Error('Tournament not found.');

  const leaderMap: Record<string, string> = {};
  for (const reg of tournament.registrations || []) {
    leaderMap[reg.teamName.toLowerCase().trim()] = reg.leaderName;
  }

  const teams = (tournament.tournamentTeams || []).map((tt: any) => {
    const teamName = tt.team.name;
    const captainName =
      leaderMap[teamName.toLowerCase().trim()] ||
      leaderMap[tt.team.shortName.toLowerCase().trim()] ||
      'Team Captain';
    return {
      id: tt.team.id,
      name: tt.team.name,
      shortName: tt.team.shortName,
      logoUrl: tt.team.logoUrl,
      captainName,
      groupName: tt.groupName,
    };
  });

  return {
    tournament,
    teams,
    isEligible: teams.length >= 9,
    requiredCount: 9,
    currentCount: teams.length,
  };
}

/**
 * Generate a new authoritative draw.
 * Supports passing exactly 9 selected team IDs if tournament has more than 9 registered teams.
 */
export async function generateDraw(
  tournamentId: string,
  adminActor: string = 'Admin',
  selectedTeamIds?: string[]
) {
  const client = getDb();
  const eligibility = await getEligibleTournamentTeams(tournamentId);

  let drawTeams: any[] = [];

  if (selectedTeamIds && Array.isArray(selectedTeamIds) && selectedTeamIds.length > 0) {
    if (selectedTeamIds.length !== 9) {
      throw new Error(`Group draw requires exactly 9 selected teams. Received ${selectedTeamIds.length}.`);
    }
    const uniqueIds = Array.from(new Set(selectedTeamIds));
    if (uniqueIds.length !== 9) {
      throw new Error(`Group draw requires 9 unique teams. Duplicate selections are not allowed.`);
    }

    const teamMap = new Map(eligibility.teams.map((t: any) => [t.id, t]));
    for (const id of selectedTeamIds) {
      const found = teamMap.get(id);
      if (!found) {
        throw new Error(`Selected team with ID "${id}" is not registered in this tournament.`);
      }
      drawTeams.push(found);
    }
  } else {
    if (eligibility.teams.length < 9) {
      throw new Error(
        `Group draw requires at least 9 registered teams. Found ${eligibility.currentCount} team(s).`
      );
    }
    if (eligibility.teams.length > 9) {
      throw new Error(
        `Tournament has ${eligibility.currentCount} registered teams. Please select exactly 9 teams to participate in the draw.`
      );
    }
    drawTeams = [...eligibility.teams];
  }

  // Check if a finalized draw already exists
  let existingFinalized: any = null;
  if (client?.tournamentDraw?.findFirst) {
    existingFinalized = await client.tournamentDraw.findFirst({
      where: { tournamentId, status: 'FINALIZED' },
    });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(
      `SELECT "id" FROM "TournamentDraw" WHERE "tournamentId" = $1 AND "status"::text = 'FINALIZED' LIMIT 1`,
      tournamentId
    );
    existingFinalized = rows && rows.length > 0 ? rows[0] : null;
  }

  if (existingFinalized) {
    throw new Error('A finalized group draw already exists for this tournament.');
  }

  // Generate 9 chits: exactly 3 Group A, 3 Group B, 3 Group C
  const chitPool: GroupIdentifier[] = [
    'GROUP_A',
    'GROUP_A',
    'GROUP_A',
    'GROUP_B',
    'GROUP_B',
    'GROUP_B',
    'GROUP_C',
    'GROUP_C',
    'GROUP_C',
  ];

  const shuffledChitGroups = secureShuffle(chitPool);
  const chitsData = shuffledChitGroups.map((groupName, idx) => ({
    position: idx + 1,
    groupName,
  }));

  // Shuffle selected teams for captain draw order
  const shuffledTeams: any[] = secureShuffle(drawTeams);

  // Generate random passcodes for each captain (e.g., KND-782 format)
  const plainPasscodes: Record<string, string> = {};
  const captainOrderData = shuffledTeams.map((team: any, idx: number) => {
    const prefix = (team.shortName || team.name.replace(/[^A-Za-z]/g, ''))
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, 'CPL');
    const num = 100 + secureRandomInt(900);
    const plainPasscode = `${prefix}-${num}`;
    plainPasscodes[team.id] = plainPasscode;

    return {
      position: idx + 1,
      teamId: team.id,
      captainName: team.captainName,
      passcodeHash: hashPasscode(plainPasscode),
    };
  });

  const secretSalt = crypto.randomBytes(32).toString('hex');
  const drawId = crypto.randomUUID();

  const canonicalString = buildCanonicalCommitmentString(
    drawId,
    secretSalt,
    captainOrderData.map((c) => c.teamId),
    chitsData
  );
  const commitmentHash = computeCommitmentHash(canonicalString);

  // Atomic database transaction
  await client.$transaction(async (tx: any) => {
    if (tx?.tournamentDraw?.create) {
      await tx.tournamentDraw.updateMany({
        where: {
          tournamentId,
          status: { in: ['DRAFT', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'] },
        },
        data: { status: 'CANCELLED' },
      });

      await tx.tournamentDraw.create({
        data: {
          id: drawId,
          tournamentId,
          status: 'READY',
          currentPickIndex: 0,
          commitmentHash,
          secretSalt,
          createdBy: adminActor,
          captainOrders: {
            create: captainOrderData,
          },
          chits: {
            create: chitsData.map((c) => ({
              position: c.position,
              groupName: c.groupName,
              isRevealed: false,
            })),
          },
          auditLogs: {
            create: [
              {
                eventType: 'DRAW_CREATED',
                actor: adminActor,
                description: 'Tournament group draw initialized with 9 teams and 3 groups.',
              },
              {
                eventType: 'DRAW_ORDER_GENERATED',
                actor: adminActor,
                description: 'Captain drawing order cryptographically randomized.',
              },
              {
                eventType: 'DRAW_COMMITTED',
                actor: adminActor,
                description: `Cryptographic commitment hash created: ${commitmentHash}`,
                metadata: { commitmentHash },
              },
            ],
          },
        },
      });
    } else {
      // Fallback raw SQL
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw" SET "status" = 'CANCELLED'::"TournamentDrawStatus"
         WHERE "tournamentId" = $1 AND "status"::text IN ('DRAFT', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED')`,
        tournamentId
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDraw" ("id", "tournamentId", "status", "currentPickIndex", "commitmentHash", "secretSalt", "createdBy", "createdAt")
         VALUES ($1, $2, 'READY'::"TournamentDrawStatus", 0, $3, $4, $5, NOW())`,
        drawId, tournamentId, commitmentHash, secretSalt, adminActor
      );

      for (const co of captainOrderData) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "TournamentDrawCaptainOrder" ("id", "drawId", "position", "teamId", "captainName", "passcodeHash", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
          drawId, co.position, co.teamId, co.captainName, co.passcodeHash
        );
      }

      for (const ch of chitsData) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "TournamentDrawChit" ("id", "drawId", "position", "groupName", "isRevealed")
           VALUES (gen_random_uuid(), $1, $2, $3, false)`,
          drawId, ch.position, ch.groupName
        );
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'DRAW_CREATED', $2, 'Tournament group draw initialized with 9 teams and 3 groups.', NOW()),
                (gen_random_uuid(), $1, 'DRAW_ORDER_GENERATED', $2, 'Captain drawing order cryptographically randomized.', NOW()),
                (gen_random_uuid(), $1, 'DRAW_COMMITTED', $2, $3, NOW())`,
        drawId, adminActor, `Cryptographic commitment hash created: ${commitmentHash}`
      );
    }
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'draw_created',
    status: 'READY',
    currentPickIndex: 0,
    timestamp: new Date().toISOString(),
  });

  return {
    drawId,
    commitmentHash,
    plainPasscodes,
  };
}

/**
 * Start the live draw ceremony.
 */
export async function startCeremony(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({
      where: { id: drawId },
      include: {
        captainOrders: { orderBy: { position: 'asc' } },
      },
    });
  } else {
    const draws: any[] = await client.$queryRawUnsafe(
      `SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`,
      drawId
    );
    if (draws && draws.length > 0) {
      draw = draws[0];
      draw.captainOrders = await client.$queryRawUnsafe(
        `SELECT * FROM "TournamentDrawCaptainOrder" WHERE "drawId" = $1 ORDER BY "position" ASC`,
        drawId
      );
    }
  }

  if (!draw) throw new Error('Draw not found.');
  if (draw.status !== 'READY') {
    throw new Error(`Cannot start ceremony from status ${draw.status}.`);
  }

  const firstCaptain = draw.captainOrders[0];

  await client.$transaction(async (tx: any) => {
    if (tx?.tournamentDraw?.update) {
      await tx.tournamentDraw.update({
        where: { id: drawId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      await tx.tournamentDrawAudit.createMany({
        data: [
          {
            drawId,
            eventType: 'CEREMONY_STARTED',
            actor: adminActor,
            description: 'Official group draw ceremony is now LIVE.',
          },
          {
            drawId,
            eventType: 'CAPTAIN_ACTIVATED',
            teamId: firstCaptain?.teamId,
            actor: adminActor,
            description: `Pick #1 activated for ${firstCaptain?.captainName}.`,
          },
        ],
      });
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw" SET "status" = 'IN_PROGRESS'::"TournamentDrawStatus", "startedAt" = NOW() WHERE "id" = $1`,
        drawId
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "teamId", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'CEREMONY_STARTED', NULL, $2, 'Official group draw ceremony is now LIVE.', NOW()),
                (gen_random_uuid(), $1, 'CAPTAIN_ACTIVATED', $3, $2, $4, NOW())`,
        drawId, adminActor, firstCaptain?.teamId, `Pick #1 activated for ${firstCaptain?.captainName}.`
      );
    }
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'ceremony_started',
    status: 'IN_PROGRESS',
    currentPickIndex: 0,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: 'IN_PROGRESS' };
}

/**
 * Pause the draw ceremony.
 */
export async function pauseCeremony(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({ where: { id: drawId } });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
    draw = rows?.[0];
  }

  if (!draw) throw new Error('Draw not found.');
  if (draw.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot pause draw with status ${draw.status}.`);
  }

  await client.$transaction(async (tx: any) => {
    if (tx?.tournamentDraw?.update) {
      await tx.tournamentDraw.update({
        where: { id: drawId },
        data: { status: 'PAUSED', pausedAt: new Date() },
      });

      await tx.tournamentDrawAudit.create({
        data: {
          drawId,
          eventType: 'CEREMONY_PAUSED',
          actor: adminActor,
          description: 'Ceremony temporarily paused by tournament administration.',
        },
      });
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw" SET "status" = 'PAUSED'::"TournamentDrawStatus", "pausedAt" = NOW() WHERE "id" = $1`,
        drawId
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'CEREMONY_PAUSED', $2, 'Ceremony temporarily paused by tournament administration.', NOW())`,
        drawId, adminActor
      );
    }
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'draw_paused',
    status: 'PAUSED',
    currentPickIndex: draw.currentPickIndex,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: 'PAUSED' };
}

/**
 * Resume the draw ceremony.
 */
export async function resumeCeremony(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({ where: { id: drawId } });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
    draw = rows?.[0];
  }

  if (!draw) throw new Error('Draw not found.');
  if (draw.status !== 'PAUSED') {
    throw new Error(`Cannot resume draw with status ${draw.status}.`);
  }

  await client.$transaction(async (tx: any) => {
    if (tx?.tournamentDraw?.update) {
      await tx.tournamentDraw.update({
        where: { id: drawId },
        data: { status: 'IN_PROGRESS', pausedAt: null },
      });

      await tx.tournamentDrawAudit.create({
        data: {
          drawId,
          eventType: 'CEREMONY_RESUMED',
          actor: adminActor,
          description: 'Ceremony resumed by tournament administration.',
        },
      });
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw" SET "status" = 'IN_PROGRESS'::"TournamentDrawStatus", "pausedAt" = NULL WHERE "id" = $1`,
        drawId
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'CEREMONY_RESUMED', $2, 'Ceremony resumed by tournament administration.', NOW())`,
        drawId, adminActor
      );
    }
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'draw_resumed',
    status: 'IN_PROGRESS',
    currentPickIndex: draw.currentPickIndex,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: 'IN_PROGRESS' };
}

/**
 * Cancel an unfinalized draw.
 */
export async function cancelDraw(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({ where: { id: drawId } });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
    draw = rows?.[0];
  }

  if (!draw) throw new Error('Draw not found.');
  if (draw.status === 'FINALIZED') {
    throw new Error('Cannot cancel a finalized tournament draw.');
  }

  await client.$transaction(async (tx: any) => {
    if (tx?.tournamentDraw?.update) {
      await tx.tournamentDraw.update({
        where: { id: drawId },
        data: { status: 'CANCELLED' },
      });

      await tx.tournamentDrawAudit.create({
        data: {
          drawId,
          eventType: 'DRAW_CANCELLED',
          actor: adminActor,
          description: 'Official draw ceremony cancelled. Official tournament groups preserved.',
        },
      });
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw" SET "status" = 'CANCELLED'::"TournamentDrawStatus" WHERE "id" = $1`,
        drawId
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'DRAW_CANCELLED', $2, 'Official draw ceremony cancelled. Official tournament groups preserved.', NOW())`,
        drawId, adminActor
      );
    }
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'draw_cancelled',
    status: 'CANCELLED',
    currentPickIndex: draw.currentPickIndex,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: 'CANCELLED' };
}

/**
 * Revert a finalized tournament draw.
 * Only allowed if no matches in the tournament have started/completed.
 * Clears TournamentTeam.groupName back to NULL, marks draw as CANCELLED,
 * records an immutable audit log entry, and broadcasts draw_reverted.
 */
export async function revertFinalizedDraw(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({
      where: { id: drawId },
      include: { tournament: true },
    });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(
      `SELECT d.*, t."status" as "tournamentStatus"
       FROM "TournamentDraw" d
       JOIN "Tournament" t ON t."id" = d."tournamentId"
       WHERE d."id" = $1 LIMIT 1`,
      drawId
    );
    draw = rows?.[0];
  }

  if (!draw) throw new Error('Draw not found.');
  if (draw.status !== 'FINALIZED') {
    throw new Error(`Cannot revert draw with status ${draw.status}. Use cancelDraw for unfinalized draws.`);
  }

  // Safety check: ensure no matches have been played or scored for this tournament
  const activeMatches: any[] = await client.$queryRawUnsafe(
    `SELECT "id", "status" FROM "Match"
     WHERE "tournamentId" = $1 AND "status"::text IN ('LIVE', 'INNINGS_BREAK', 'COMPLETED')
     LIMIT 1`,
    draw.tournamentId
  );

  if (activeMatches && activeMatches.length > 0) {
    throw new Error(
      'Cannot revert finalized draw: one or more tournament matches have already been played or are currently in progress.'
    );
  }

  // Atomic database rollback
  await client.$transaction(async (tx: any) => {
    // 1. Reset TournamentTeam.groupName to NULL for all teams in this tournament
    await tx.$executeRawUnsafe(
      `UPDATE "TournamentTeam" SET "groupName" = NULL WHERE "tournamentId" = $1`,
      draw.tournamentId
    );

    // 2. Mark TournamentDraw as CANCELLED
    await tx.$executeRawUnsafe(
      `UPDATE "TournamentDraw" SET "status" = 'CANCELLED'::"TournamentDrawStatus" WHERE "id" = $1`,
      drawId
    );

    // 3. Insert audit log
    await tx.$executeRawUnsafe(
      `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
       VALUES (gen_random_uuid(), $1, 'DRAW_REVERTED', $2, 'Official finalized group draw was reverted by tournament administration. Group assignments cleared.', NOW())`,
      drawId,
      adminActor
    );
  });

  broadcastDrawUpdate({
    drawId,
    eventType: 'draw_reverted',
    status: 'CANCELLED',
    currentPickIndex: 0,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: 'CANCELLED' };
}

/**
 * Select a sealed chit.
 */
export async function selectChit(
  drawId: string,
  chitPosition: number,
  auth: {
    passcode?: string;
    isAdmin?: boolean;
    actor?: string;
  }
) {
  const client = getDb();
  return await client.$transaction(async (tx: any) => {
    // 0. Concurrency serialization: Acquire exclusive PostgreSQL row-level lock on TournamentDraw
    await tx.$executeRaw`SELECT id FROM "TournamentDraw" WHERE id = ${drawId} FOR UPDATE;`;

    let draw: any = null;

    if (tx?.tournamentDraw?.findUnique) {
      draw = await tx.tournamentDraw.findUnique({
        where: { id: drawId },
        include: {
          captainOrders: { orderBy: { position: 'asc' } },
          chits: { orderBy: { position: 'asc' } },
        },
      });
    } else {
      const rows: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
      if (rows && rows.length > 0) {
        draw = rows[0];
        const [captainOrders, chits]: [any[], any[]] = await Promise.all([
          tx.$queryRawUnsafe(`SELECT * FROM "TournamentDrawCaptainOrder" WHERE "drawId" = $1 ORDER BY "position" ASC`, drawId),
          tx.$queryRawUnsafe(`SELECT * FROM "TournamentDrawChit" WHERE "drawId" = $1 ORDER BY "position" ASC`, drawId),
        ]);
        draw.captainOrders = captainOrders;
        draw.chits = chits;
      }
    }

    if (!draw) throw new Error('Draw not found.');
    if (draw.status !== 'IN_PROGRESS') {
      throw new Error(`Draw is not in progress (current status: ${draw.status}).`);
    }

    const currentPickIndex = draw.currentPickIndex;
    if (currentPickIndex >= 9) {
      throw new Error('All 9 chits have already been selected.');
    }

    const currentCaptain = draw.captainOrders[currentPickIndex];
    if (!currentCaptain) {
      throw new Error('Current captain turn could not be determined.');
    }

    // Verify team has not already selected a chit in this draw
    const teamAlreadySelected = draw.chits.some((c: any) => c.selectedByTeamId === currentCaptain.teamId);
    if (teamAlreadySelected) {
      throw new Error(`Team has already selected a chit in this draw.`);
    }

    // Validate authorization
    if (!auth.isAdmin) {
      if (!auth.passcode) {
        throw new Error('Captain passcode required to select chit.');
      }
      const isValid = verifyPasscode(auth.passcode, currentCaptain.passcodeHash);
      if (!isValid) {
        throw new Error('Invalid captain pass code for the current team.');
      }
    }

    // Validate chit availability
    const targetChit = draw.chits.find((c: any) => c.position === chitPosition);
    if (!targetChit) {
      throw new Error(`Chit #${chitPosition} not found.`);
    }
    if (targetChit.isRevealed || targetChit.selectedByTeamId) {
      throw new Error(`Chit #${chitPosition} has already been opened.`);
    }

    // Verify group capacity
    const revealedForGroup = draw.chits.filter(
      (c: any) => c.isRevealed && c.groupName === targetChit.groupName
    ).length;
    if (revealedForGroup >= 3) {
      throw new Error(`Group ${targetChit.groupName} is already full (max 3 teams).`);
    }

    const now = new Date();
    const newPickIndex = currentPickIndex + 1;
    const isCompleted = newPickIndex === 9;
    const nextStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';

    if (tx?.tournamentDrawChit?.updateMany) {
      const updateRes = await tx.tournamentDrawChit.updateMany({
        where: {
          id: targetChit.id,
          isRevealed: false,
          selectedByTeamId: null,
        },
        data: {
          isRevealed: true,
          selectedByTeamId: currentCaptain.teamId,
          selectedAt: now,
        },
      });

      if (updateRes.count === 0) {
        throw new Error(`Chit #${chitPosition} has already been opened.`);
      }

      await tx.tournamentDraw.update({
        where: { id: drawId },
        data: {
          currentPickIndex: newPickIndex,
          status: nextStatus,
          completedAt: isCompleted ? now : null,
        },
      });

      const auditEntries: any[] = [
        {
          drawId,
          eventType: 'CHIT_SELECTED',
          teamId: currentCaptain.teamId,
          chitPosition,
          actor: auth.actor || currentCaptain.captainName,
          description: `${currentCaptain.captainName} selected sealed chit #${chitPosition}.`,
        },
        {
          drawId,
          eventType: 'CHIT_REVEALED',
          teamId: currentCaptain.teamId,
          chitPosition,
          groupName: targetChit.groupName,
          actor: auth.actor || currentCaptain.captainName,
          description: `Chit #${chitPosition} revealed: ${GROUP_LABELS[targetChit.groupName as GroupIdentifier]}.`,
        },
        {
          drawId,
          eventType: 'TEAM_ASSIGNED_PROVISIONAL',
          teamId: currentCaptain.teamId,
          chitPosition,
          groupName: targetChit.groupName,
          actor: auth.actor || currentCaptain.captainName,
          description: `Team provisionally assigned to ${GROUP_LABELS[targetChit.groupName as GroupIdentifier]}.`,
        },
      ];

      if (isCompleted) {
        auditEntries.push({
          drawId,
          eventType: 'DRAW_COMPLETED',
          teamId: null,
          chitPosition: null as any,
          groupName: null,
          actor: 'System',
          description: 'All 9 teams assigned. Draw completed and awaiting admin finalization.',
        });
      } else {
        const nextCaptain = draw.captainOrders[newPickIndex];
        if (nextCaptain) {
          auditEntries.push({
            drawId,
            eventType: 'CAPTAIN_ACTIVATED',
            teamId: nextCaptain.teamId,
            chitPosition: null as any,
            groupName: null,
            actor: 'System',
            description: `Pick #${newPickIndex + 1} activated for ${nextCaptain.captainName}.`,
          });
        }
      }

      await tx.tournamentDrawAudit.createMany({ data: auditEntries });
    } else {
      // Raw SQL
      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDrawChit"
         SET "isRevealed" = true, "selectedByTeamId" = $1, "selectedAt" = NOW()
         WHERE "id" = $2`,
        currentCaptain.teamId, targetChit.id
      );

      await tx.$executeRawUnsafe(
        `UPDATE "TournamentDraw"
         SET "currentPickIndex" = $1, "status" = $2::"TournamentDrawStatus", "completedAt" = $3
         WHERE "id" = $4`,
        newPickIndex, nextStatus, isCompleted ? now : null, drawId
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "teamId", "chitPosition", "groupName", "actor", "description", "createdAt")
         VALUES (gen_random_uuid(), $1, 'CHIT_SELECTED', $2, $3, NULL, $4, $5, NOW()),
                (gen_random_uuid(), $1, 'CHIT_REVEALED', $2, $3, $6, $4, $7, NOW()),
                (gen_random_uuid(), $1, 'TEAM_ASSIGNED_PROVISIONAL', $2, $3, $6, $4, $8, NOW())`,
        drawId, currentCaptain.teamId, chitPosition, auth.actor || currentCaptain.captainName,
        `${currentCaptain.captainName} selected sealed chit #${chitPosition}.`,
        targetChit.groupName,
        `Chit #${chitPosition} revealed: ${GROUP_LABELS[targetChit.groupName as GroupIdentifier]}.`,
        `Team provisionally assigned to ${GROUP_LABELS[targetChit.groupName as GroupIdentifier]}.`
      );

      if (isCompleted) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
           VALUES (gen_random_uuid(), $1, 'DRAW_COMPLETED', 'System', 'All 9 teams assigned. Draw completed and awaiting admin finalization.', NOW())`,
          drawId
        );
      }
    }

    broadcastDrawUpdate({
      drawId,
      eventType: 'chit_revealed',
      status: nextStatus,
      currentPickIndex: newPickIndex,
      revealedChit: {
        position: chitPosition,
        groupName: targetChit.groupName,
        teamId: currentCaptain.teamId,
      },
      timestamp: now.toISOString(),
    });

    return {
      success: true,
      chitPosition,
      groupName: targetChit.groupName,
      groupLabel: GROUP_LABELS[targetChit.groupName as GroupIdentifier],
      teamId: currentCaptain.teamId,
      nextPickIndex: newPickIndex,
      isCompleted,
    };
  }, { maxWait: 10000, timeout: 25000 });
}

/**
 * Finalize the official group draw.
 */
export async function finalizeDraw(drawId: string, adminActor: string = 'Admin') {
  const client = getDb();
  return await client.$transaction(async (tx: any) => {
    let draw: any = null;

    if (tx?.tournamentDraw?.findUnique) {
      draw = await tx.tournamentDraw.findUnique({
        where: { id: drawId },
        include: {
          tournament: true,
          chits: {
            include: {
              selectedByTeam: true,
            },
          },
        },
      });
    } else {
      const rows: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
      if (rows && rows.length > 0) {
        draw = rows[0];
        const [tournaments, chits]: [any[], any[]] = await Promise.all([
          tx.$queryRawUnsafe(`SELECT * FROM "Tournament" WHERE "id" = $1 LIMIT 1`, draw.tournamentId),
          tx.$queryRawUnsafe(`SELECT * FROM "TournamentDrawChit" WHERE "drawId" = $1`, drawId),
        ]);
        draw.tournament = tournaments?.[0];
        draw.chits = chits;
      }
    }

    if (!draw) throw new Error('Draw not found.');
    if (draw.status !== 'COMPLETED') {
      throw new Error(`Cannot finalize draw with status ${draw.status}. Draw must be COMPLETED.`);
    }

    const chits = draw.chits;
    if (chits.length !== 9 || chits.some((c: any) => !c.isRevealed || !c.selectedByTeamId)) {
      throw new Error('All 9 chits must be selected before finalization.');
    }

    const groupACount = chits.filter((c: any) => c.groupName === 'GROUP_A').length;
    const groupBCount = chits.filter((c: any) => c.groupName === 'GROUP_B').length;
    const groupCCount = chits.filter((c: any) => c.groupName === 'GROUP_C').length;

    if (groupACount !== 3 || groupBCount !== 3 || groupCCount !== 3) {
      throw new Error('Each group must contain exactly 3 teams.');
    }

    // 1. Commit official group assignments to TournamentTeam
    for (const chit of chits) {
      const teamId = chit.selectedByTeamId;
      const groupName = chit.groupName;

      await tx.$executeRawUnsafe(
        `INSERT INTO "TournamentTeam" ("id", "tournamentId", "teamId", "groupName", "matchesPlayed", "wins", "losses", "ties", "noResults", "points", "runsFor", "legalBallsFaced", "runsAgainst", "legalBallsBowled")
         VALUES (gen_random_uuid(), $1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
         ON CONFLICT ("tournamentId", "teamId") DO UPDATE SET "groupName" = EXCLUDED."groupName"`,
        draw.tournamentId,
        teamId,
        groupName
      );
    }

    // 2. Update Tournament status if DRAFT or REGISTRATION
    if (draw.tournament.status === 'DRAFT' || draw.tournament.status === 'REGISTRATION') {
      await tx.$executeRawUnsafe(
        `UPDATE "Tournament" SET "status" = 'SCHEDULED'::"TournamentStatus" WHERE "id" = $1`,
        draw.tournamentId
      );
    }

    // 3. Mark draw FINALIZED
    const now = new Date();
    await tx.$executeRawUnsafe(
      `UPDATE "TournamentDraw" SET "status" = 'FINALIZED'::"TournamentDrawStatus", "finalizedAt" = NOW() WHERE "id" = $1`,
      drawId
    );

    // 4. Audit log
    await tx.$executeRawUnsafe(
      `INSERT INTO "TournamentDrawAudit" ("id", "drawId", "eventType", "actor", "description", "createdAt")
       VALUES (gen_random_uuid(), $1, 'DRAW_FINALIZED', $2, 'Official tournament group assignments committed to TournamentTeam.', NOW())`,
      drawId, adminActor
    );

    broadcastDrawUpdate({
      drawId,
      eventType: 'draw_finalized',
      status: 'FINALIZED',
      currentPickIndex: 9,
      timestamp: now.toISOString(),
    });

    return {
      success: true,
      drawId,
      status: 'FINALIZED',
      commitmentHash: draw.commitmentHash,
      secretSalt: draw.secretSalt,
    };
  }, { maxWait: 10000, timeout: 25000 });
}

/**
 * Verify cryptographic commitment independently.
 */
export async function verifyDrawCommitment(drawId: string) {
  const client = getDb();
  let draw: any = null;

  if (client?.tournamentDraw?.findUnique) {
    draw = await client.tournamentDraw.findUnique({
      where: { id: drawId },
      include: {
        captainOrders: { orderBy: { position: 'asc' } },
        chits: { orderBy: { position: 'asc' } },
      },
    });
  } else {
    const rows: any[] = await client.$queryRawUnsafe(`SELECT * FROM "TournamentDraw" WHERE "id" = $1 LIMIT 1`, drawId);
    if (rows && rows.length > 0) {
      draw = rows[0];
      const [captainOrders, chits]: [any[], any[]] = await Promise.all([
        client.$queryRawUnsafe(`SELECT * FROM "TournamentDrawCaptainOrder" WHERE "drawId" = $1 ORDER BY "position" ASC`, drawId),
        client.$queryRawUnsafe(`SELECT * FROM "TournamentDrawChit" WHERE "drawId" = $1 ORDER BY "position" ASC`, drawId),
      ]);
      draw.captainOrders = captainOrders;
      draw.chits = chits;
    }
  }

  if (!draw) throw new Error('Draw not found.');
  if (!draw.commitmentHash || !draw.secretSalt) {
    throw new Error('Commitment verification data missing.');
  }

  const canonicalString = buildCanonicalCommitmentString(
    draw.id,
    draw.secretSalt,
    draw.captainOrders.map((c: any) => c.teamId),
    draw.chits.map((c: any) => ({ position: c.position, groupName: c.groupName }))
  );

  const recomputedHash = computeCommitmentHash(canonicalString);
  const isValid = recomputedHash === draw.commitmentHash;

  return {
    isValid,
    storedHash: draw.commitmentHash,
    recomputedHash,
    canonicalString,
  };
}
