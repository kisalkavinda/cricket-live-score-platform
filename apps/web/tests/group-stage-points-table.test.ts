import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  computeStageStandings,
  normalizeGroupKey,
  isSameGroupName,
  TeamStanding,
} from '../lib/tournament/nrr-engine';

console.log('\n============================================================');
console.log(' CPL 2026 GROUP STAGE POINTS TABLE & NRR VERIFICATION TEST');
console.log('============================================================\n');

// -------------------------------------------------------------
// 1. Group Key Normalization & Matching
// -------------------------------------------------------------
console.log('--- TEST 1: Group Key Normalization & Matching ---');

assert.strictEqual(normalizeGroupKey('GROUP_A'), 'GROUP_A');
assert.strictEqual(normalizeGroupKey('Group A'), 'GROUP_A');
assert.strictEqual(normalizeGroupKey('groupA'), 'GROUP_A');
assert.strictEqual(normalizeGroupKey('group_a'), 'GROUP_A');
assert.strictEqual(normalizeGroupKey('A'), 'GROUP_A');

assert.strictEqual(normalizeGroupKey('GROUP_B'), 'GROUP_B');
assert.strictEqual(normalizeGroupKey('Group B'), 'GROUP_B');
assert.strictEqual(normalizeGroupKey('groupB'), 'GROUP_B');
assert.strictEqual(normalizeGroupKey('B'), 'GROUP_B');

assert(isSameGroupName('GROUP_A', 'Group A'), 'GROUP_A matches Group A');
assert(isSameGroupName('group_a', 'GROUP_A'), 'group_a matches GROUP_A');
assert(isSameGroupName('A', 'groupA'), 'A matches groupA');
assert(!isSameGroupName('GROUP_A', 'GROUP_B'), 'GROUP_A does not match GROUP_B');
console.log('✅ Test 1 Passed: Group key normalization handles all spacing and casing.');

// -------------------------------------------------------------
// 2. Zero-Match Standings Initialization with Compatibility Aliases
// -------------------------------------------------------------
console.log('\n--- TEST 2: Initial Standings with Zero Matches & Compatibility Aliases ---');

const teams = [
  { id: 't1', name: 'Software Strikers', shortName: 'SS', groupName: 'Group A', logoUrl: '/ss.png' },
  { id: 't2', name: 'Network Ninjas', shortName: 'NN', groupName: 'GROUP_A', logoUrl: '/nn.png' },
  { id: 't3', name: 'Data Destroyers', shortName: 'DD', groupName: 'groupA', logoUrl: null },
  { id: 't4', name: 'Cyber Centurions', shortName: 'CC', groupName: 'A', logoUrl: null },
];

const standings = computeStageStandings(teams, [], 'GROUP', 'GROUP_A');

assert.strictEqual(standings.length, 4, 'Should initialize all 4 teams in Group A');
standings.forEach((s: TeamStanding, idx: number) => {
  // Primary fields
  assert.strictEqual(s.pos, idx + 1);
  assert.strictEqual(s.played, 0);
  assert.strictEqual(s.won, 0);
  assert.strictEqual(s.lost, 0);
  assert.strictEqual(s.points, 0);
  assert.strictEqual(s.nrr, 0);
  assert.strictEqual(s.displayNRR, '0.00');

  // Backwards compatibility aliases
  assert.strictEqual(s.rank, idx + 1, 'rank alias must match pos');
  assert(s.shortName, 'shortName alias must be populated');
  assert(s.name, 'name alias must be populated');
  assert.strictEqual(s.shortName, s.teamShortName, 'shortName must equal teamShortName');
  assert.strictEqual(s.name, s.teamName, 'name must equal teamName');
  assert.strictEqual(s.teamLogoUrl, s.logoUrl, 'teamLogoUrl must equal logoUrl');
});
console.log('✅ Test 2 Passed: 4 teams initialized with rank, shortName, name, and 0 stats.');

// -------------------------------------------------------------
// 3. Match Evaluation & NRR Calculation
// -------------------------------------------------------------
console.log('\n--- TEST 3: Points and NRR Calculation from Completed Match Data ---');

const matchTeams = [
  { id: 't1', name: 'Team Alpha', shortName: 'TA', groupName: 'GROUP_A' },
  { id: 't2', name: 'Team Beta', shortName: 'TB', groupName: 'GROUP_A' },
];

const matches: any[] = [
  {
    id: 'm1',
    tournamentId: 'cpl-2026',
    stage: 'GROUP',
    groupName: 'GROUP_A',
    matchNumber: 1,
    teamAId: 't1',
    teamBId: 't2',
    status: 'COMPLETED',
    result: 'WIN',
    winnerTeamId: 't1',
    oversPerInnings: 4,
    ballsPerOver: 4,
    innings: [
      {
        id: 'inn1',
        inningsNumber: 1,
        battingTeamId: 't1',
        bowlingTeamId: 't2',
        runs: 50,
        wickets: 2,
        overs: 4,
        balls: 0,
        status: 'COMPLETED',
        isAllOut: false,
      },
      {
        id: 'inn2',
        inningsNumber: 2,
        battingTeamId: 't2',
        bowlingTeamId: 't1',
        runs: 40,
        wickets: 3,
        overs: 4,
        balls: 0,
        status: 'COMPLETED',
        isAllOut: false,
      },
    ],
  },
];

const matchStandings = computeStageStandings(matchTeams, matches, 'GROUP', 'GROUP_A');
assert.strictEqual(matchStandings.length, 2);

const winner = matchStandings[0];
assert.strictEqual(winner.teamId, 't1');
assert.strictEqual(winner.pos, 1);
assert.strictEqual(winner.rank, 1);
assert.strictEqual(winner.played, 1);
assert.strictEqual(winner.won, 1);
assert.strictEqual(winner.lost, 0);
assert.strictEqual(winner.points, 2);
assert(Math.abs(winner.nrr - 2.5) < 0.01, `Winner NRR should be +2.50, got ${winner.nrr}`);
assert.strictEqual(winner.displayNRR, '+2.50');

const loser = matchStandings[1];
assert.strictEqual(loser.teamId, 't2');
assert.strictEqual(loser.pos, 2);
assert.strictEqual(loser.rank, 2);
assert.strictEqual(loser.played, 1);
assert.strictEqual(loser.won, 0);
assert.strictEqual(loser.lost, 1);
assert.strictEqual(loser.points, 0);
assert(Math.abs(loser.nrr - (-2.5)) < 0.01, `Loser NRR should be -2.50, got ${loser.nrr}`);
assert.strictEqual(loser.displayNRR, '-2.50');
console.log('✅ Test 3 Passed: Points & ball-based NRR correctly calculated and ranked.');

// -------------------------------------------------------------
// 4. GroundDisplayClient & LiveScoreWidget Code Inspection Verification
// -------------------------------------------------------------
console.log('\n--- TEST 4: Stadium Display & LiveScoreWidget Points Table Inspection ---');

const groundDisplayClientPath = path.resolve(__dirname, '../app/display/GroundDisplayClient.tsx');
const liveScoreWidgetPath = path.resolve(__dirname, '../components/LiveScoreWidget.tsx');
const tournamentServicePath = path.resolve(__dirname, '../lib/tournament/tournament-service.ts');

const groundDisplaySrc = fs.readFileSync(groundDisplayClientPath, 'utf8');
const liveScoreWidgetSrc = fs.readFileSync(liveScoreWidgetPath, 'utf8');
const tournamentServiceSrc = fs.readFileSync(tournamentServicePath, 'utf8');

// 4.1 GroundDisplayClient has computeStageStandings imported
assert(groundDisplaySrc.includes('computeStageStandings'), 'GroundDisplayClient must import computeStageStandings');

// 4.2 GroundDisplayClient uses safe NRR display and fallbacks
assert(groundDisplaySrc.includes('t.pos || t.rank || idx + 1'), 'GroundDisplayClient must support pos and rank');
assert(groundDisplaySrc.includes('t.teamShortName || t.shortName || t.teamName || t.name'), 'GroundDisplayClient must support teamShortName and shortName');
assert(groundDisplaySrc.includes('displayNrr'), 'GroundDisplayClient must use safe displayNrr');

// 4.3 LiveScoreWidget has computeStageStandings imported and safe fallbacks
assert(liveScoreWidgetSrc.includes('computeStageStandings'), 'LiveScoreWidget must import computeStageStandings');
assert(liveScoreWidgetSrc.includes('s.played ?? 0'), 'LiveScoreWidget must use nullish fallback for played');
assert(liveScoreWidgetSrc.includes('s.displayOversFor || \'0.00\''), 'LiveScoreWidget must use fallback for displayOversFor');

// 4.4 tournamentService has aliases and group inference
assert(tournamentServiceSrc.includes('isGroupA'), 'tournament-service must include isGroupA helper');
assert(tournamentServiceSrc.includes('isGroupB'), 'tournament-service must include isGroupB helper');
assert(tournamentServiceSrc.includes('GROUP_A: {'), 'tournament-service must provide GROUP_A alias');
assert(tournamentServiceSrc.includes('groupA: groupAStandings'), 'tournament-service must provide groupA standings alias');

console.log('✅ Test 4 Passed: Both Stadium Display and LiveScoreWidget have all resilience fixes in place.');

console.log('\n============================================================');
console.log(' ALL GROUP STAGE POINTS TABLE TESTS PASSED SUCCESSFULLY! (4/4)');
console.log('============================================================\n');
