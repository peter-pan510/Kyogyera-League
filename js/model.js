/* Turns the raw Sheet tables into everything the pages show:
 * standings, qualification, knockouts, player & team stats, records. */

const CFG = window.KYOGYERA_CONFIG || {};
export const TOP_N = Number(CFG.QUALIFY_TOP_PER_GROUP) || 2;
export const BEST_THIRDS = CFG.QUALIFY_BEST_THIRDS == null ? 2 : Number(CFG.QUALIFY_BEST_THIRDS);

// Bracket shape: which matches feed which.
export const FEEDS = { SF1: ['QF1', 'QF2'], SF2: ['QF3', 'QF4'], FINAL: ['SF1', 'SF2'] };
export const ROUND_ORDER = { GROUP: 0, QF: 1, SF: 2, FINAL: 3 };
export const ROUND_LABEL = { GROUP: 'Group stage', QF: 'Quarterfinal', SF: 'Semifinal', FINAL: 'Final' };

// Known per-team match stat columns (MatchStats tab), in display order.
// Any other numeric column in that tab is shown too, labelled from its header.
const KNOWN_STATS = [
  ['possession', 'Possession', '%'],
  ['shots', 'Total shots'],
  ['shotsontarget', 'Shots on target'],
  ['corners', 'Corners'],
  ['fouls', 'Fouls'],
  ['offsides', 'Offsides'],
  ['saves', 'Saves'],
];

/* ------------------------------------------------------------ normalizing */

// Loose key so "Bataka", "BATAKA FC" and "BATAKA FC 2000-2005" all match.
export function teamKey(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/\d{4}\s*[-–—/]\s*\d{2,4}/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(FC|SC)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function personKey(name) {
  return String(name || '').toUpperCase().replace(/[^A-Z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitName(full) {
  const m = String(full).trim().match(/^(.*?)\s*(\d{4}\s*[-–—/]\s*\d{2,4})$/);
  return m ? { name: m[1].trim(), years: m[2].replace(/\s+/g, '') } : { name: String(full).trim(), years: '' };
}

// Status column: blank (not started / finished once scores are in), Live, HT, FT.
function normStatus(s) {
  s = String(s || '').trim();
  if (/^(ht|half)/i.test(s)) return 'HT';
  if (/^(live|playing|on|1st|2nd|in play|started)/i.test(s)) return 'LIVE';
  if (/^(ft|full|final|done|ended|finished)/i.test(s)) return 'FT';
  return '';
}

const normGroup = (g) => String(g || '').toUpperCase().replace(/^GROUP\s*/, '').trim();
const normId = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

function normSlot(s) {
  s = String(s || '').toUpperCase().replace(/[\s_-]+/g, '');
  return /^(F|FINAL|F1|FINAL1)$/.test(s) ? 'FINAL' : s;
}

function normRound(r, slot) {
  r = String(r || '').toUpperCase().replace(/[\s_-]+/g, '');
  if (/^(QF|QUARTER)/.test(r)) return 'QF';
  if (/^(SF|SEMI)/.test(r)) return 'SF';
  if (/^(F|FINAL)/.test(r)) return 'FINAL';
  if (slot === 'FINAL') return 'FINAL';
  const m = slot.match(/^(QF|SF)/);
  return m ? m[1] : 'QF';
}

function parseScore(s) {
  s = String(s == null ? '' : s).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function parseNum(s) {
  s = String(s == null ? '' : s).replace('%', '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// "45+2", "90'", "12" -> { n: 45, extra: 2, label: "45+2'" }
function parseMinute(s) {
  const m = String(s || '').match(/(\d{1,3})(?:\s*\+\s*(\d{1,2}))?/);
  if (!m) return null;
  const n = +m[1], extra = m[2] ? +m[2] : 0;
  return { n, extra, sort: n + extra / 100, label: n + (extra ? '+' + extra : '') + "'" };
}

// Accepts 2026-12-19, 2026-12-19 14:00, 19/12/2026, 19/12/2026 14:00, or anything Date() understands.
// A time on its own ("09:00", "2:30pm") is placed on `base` — the MatchDate from the Config tab.
export function parseDate(s, base = null) {
  s = String(s || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (m) {
    let h = +m[1];
    if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12;
    if (m[3] && /am/i.test(m[3]) && h === 12) h = 0;
    const d = base ? new Date(base.d) : new Date();
    d.setHours(h, +m[2], 0, 0);
    return { d, time: true, noDay: !base };
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return { d: new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)), time: m[4] != null };
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    let day = +m[1], mon = +m[2];
    if (mon > 12 && day <= 12) [day, mon] = [mon, day]; // US-style 3/20/2027
    return { d: new Date(y, mon - 1, day, +(m[4] || 0), +(m[5] || 0)), time: m[4] != null };
  }
  const d = new Date(s);
  return isNaN(d) ? null : { d, time: /\d:\d/.test(s) };
}

function prettyHeader(h) {
  return String(h).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
}

// Unique 3-letter team codes (BAT, ABO, AKA…) for crests, like UEFA uses.
function assignCodes(list) {
  const used = new Set(list.filter((t) => t.short).map((t) => t.short));
  list.forEach((t) => {
    if (t.short) { t.initials = t.short; return; }
    const w = t.key.replace(/\s+/g, '');
    const cons = [...w.slice(1)].map((c, i) => [c, i + 1]).filter(([c]) => !/[AEIOU0-9]/.test(c));
    const cands = [w.slice(0, 3)];
    for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) cands.push(w[0] + cons[i][0] + cons[j][0]);
    for (let i = 1; i < w.length; i++) for (let j = i + 1; j < w.length; j++) cands.push(w[0] + w[i] + w[j]);
    t.initials = cands.find((c) => !used.has(c) && !/(.)\1/.test(c.slice(1))) || cands.find((c) => !used.has(c)) || w.slice(0, 3);
    used.add(t.initials);
  });
}

/* ---------------------------------------------------------------- tables */

function blankRow(team) {
  return { key: team.key, team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

function applyResult(row, gf, ga) {
  row.p++; row.gf += gf; row.ga += ga; row.gd = row.gf - row.ga;
  if (gf > ga) { row.w++; row.pts += 3; } else if (gf === ga) { row.d++; row.pts += 1; } else row.l++;
}

function tally(rowsByKey, matches) {
  for (const f of matches) {
    if (!f.played) continue;
    const h = rowsByKey[f.home.key], a = rowsByKey[f.away.key];
    if (h && a) { applyResult(h, f.hs, f.as); applyResult(a, f.as, f.hs); }
  }
}

export const byPtsGdGf = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;

// Group table: Pts, GD, GF, then head-to-head mini-league among tied teams.
function computeGroupTable(teams, matches) {
  const rowsByKey = {};
  teams.forEach((t) => { rowsByKey[t.key] = blankRow(t); });
  tally(rowsByKey, matches);
  const rows = teams.map((t) => rowsByKey[t.key]).sort(byPtsGdGf);
  const out = [];
  for (let i = 0; i < rows.length;) {
    let j = i + 1;
    while (j < rows.length && byPtsGdGf(rows[i], rows[j]) === 0) j++;
    const cluster = rows.slice(i, j);
    if (cluster.length > 1) {
      const mini = {};
      cluster.forEach((r) => { mini[r.key] = blankRow(r.team); });
      tally(mini, matches.filter((f) => mini[f.home.key] && mini[f.away.key]));
      cluster.sort((a, b) => byPtsGdGf(mini[a.key], mini[b.key]) || a.team.name.localeCompare(b.team.name));
    }
    out.push(...cluster);
    i = j;
  }
  out.forEach((r, idx) => { r.pos = idx + 1; r.status = ''; });
  return out;
}

function computeFlatTable(teams, matches) {
  const rowsByKey = {};
  teams.forEach((t) => { rowsByKey[t.key] = blankRow(t); });
  tally(rowsByKey, matches);
  const rows = Object.values(rowsByKey)
    .sort((a, b) => byPtsGdGf(a, b) || a.team.name.localeCompare(b.team.name));
  rows.forEach((r, i) => { r.pos = i + 1; r.ppg = r.p ? r.pts / r.p : 0; });
  return rows;
}

/* ----------------------------------------------------------------- build */

export function buildModel(t) {
  const issues = []; // data problems, shown on the admin check page

  const cfg = {};
  t.config.rows.forEach((r) => { if (r.key) cfg[r.key.toLowerCase().replace(/[^a-z0-9]/g, '')] = r.value || ''; });

  /* teams & groups */
  const teams = new Map();
  const groups = new Map();
  const ensureGroup = (id) => {
    if (!groups.has(id)) groups.set(id, { id, teams: [], matches: [] });
    return groups.get(id);
  };
  const teamRef = (name, group) => {
    const key = teamKey(name);
    if (!key) return null;
    let team = teams.get(key);
    if (!team) {
      const s = splitName(name);
      team = {
        key, full: String(name).trim(), name: s.name, years: s.years, group: group || '',
        slug: key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        initials: key.slice(0, 3),
        color: '',
      };
      teams.set(key, team);
      if (group) ensureGroup(group).teams.push(team);
    }
    return team;
  };

  t.teams.rows.forEach((r) => {
    const g = normGroup(r.group);
    if (!r.teamname) return;
    if (!g) issues.push(`Teams: "${r.teamname}" has no Group.`);
    const team = teamRef(r.teamname, g);
    if (r.color) team.color = r.color;
    if (r.short) team.short = r.short.toUpperCase().slice(0, 4);
    if (r.badge || r.logo) team.badge = (r.badge || r.logo).trim();
  });
  assignCodes([...teams.values()]);

  /* matches */
  const matches = [];
  const matchById = new Map();
  let order = 0;

  const matchDay = parseDate(cfg.matchdate);
  const addMatch = (m) => {
    m.order = order++;
    m.status = normStatus(m.statusRaw);
    m.live = (m.status === 'LIVE' || m.status === 'HT') && !!(m.home && m.away);
    if (m.live) { if (m.hs == null) m.hs = 0; if (m.as == null) m.as = 0; }
    m.played = !!(m.home && m.away && m.hs != null && m.as != null);
    m.finished = m.played && !m.live;
    m.goals = []; m.cards = []; m.stats = null; m.motm = null;
    if (matchById.has(normId(m.id))) issues.push(`Match ID "${m.id}" is used twice.`);
    matchById.set(normId(m.id), m);
    matches.push(m);
    return m;
  };

  t.groupFixtures.rows.forEach((r, i) => {
    const g = normGroup(r.group);
    const home = teamRef(r.teamhome, g), away = teamRef(r.teamaway, g);
    if (!home || !away) { issues.push(`GroupFixtures row ${i + 2}: missing TeamHome or TeamAway.`); return; }
    if (home.group && home.group !== g) issues.push(`GroupFixtures ${r.matchid}: ${home.name} is in Group ${home.group}, not ${g}.`);
    if (away.group && away.group !== g) issues.push(`GroupFixtures ${r.matchid}: ${away.name} is in Group ${away.group}, not ${g}.`);
    const m = addMatch({
      id: r.matchid || `G${g}${i + 1}`, stage: 'group', group: g, round: 'GROUP', slot: '',
      home, away, hs: parseScore(r.scorehome), as: parseScore(r.scoreaway),
      dateRaw: r.date || '', date: parseDate(r.date, matchDay), note: r.note || '', statusRaw: r.status || '',
      motmRaw: r.motm || r.manofthematch || '', motmTeamRaw: r.motmteam || '',
    });
    if ((m.hs == null) !== (m.as == null)) issues.push(`${m.id}: only one of ScoreHome/ScoreAway is filled in.`);
    ensureGroup(g).matches.push(m);
  });

  t.knockoutFixtures.rows.forEach((r) => {
    const slot = normSlot(r.slot || r.matchid);
    const m = addMatch({
      id: r.matchid || slot, stage: 'ko', group: '', slot, round: normRound(r.round, slot),
      home: r.teamhome ? teamRef(r.teamhome) : null, away: r.teamaway ? teamRef(r.teamaway) : null,
      hs: parseScore(r.scorehome), as: parseScore(r.scoreaway),
      dateRaw: r.date || '', date: parseDate(r.date, matchDay), note: r.note || '', statusRaw: r.status || '',
      motmRaw: r.motm || r.manofthematch || '', motmTeamRaw: r.motmteam || '',
    });
    for (const side of ['home', 'away']) {
      if (m[side] && !m[side].group) issues.push(`KnockoutFixtures ${m.id}: "${m[side].full}" doesn't match any team in the Teams tab.`);
    }
    m.winner = koWinner(m);
    if (m.finished && m.hs === m.as && !m.winner) issues.push(`${m.id} ended level — add the penalty winner in Note, e.g. "${m.home.name} won 4-3 on penalties".`);
  });

  const bySlot = {};
  matches.filter((m) => m.stage === 'ko').forEach((m) => { if (m.slot) bySlot[m.slot] = m; });

  /* squads (Players tab) */
  const roster = new Map(); // teamKey|PERSON -> { name, number, position }
  const rosterTeams = new Set();
  t.players.rows.forEach((r, i) => {
    const name = r.player || r.name;
    if (!name) return;
    const team = teams.get(teamKey(r.team));
    if (!team) { issues.push(`Players row ${i + 2}: team "${r.team}" is not in the Teams tab.`); return; }
    roster.set(team.key + '|' + personKey(name), { name: name.trim().replace(/\s+/g, ' '), number: r.number || r.no || '', position: r.position || '' });
    rosterTeams.add(team.key);
  });

  /* players, goals, cards, stats */
  const players = new Map();
  const playerRef = (name, team, where = '') => {
    const pk = personKey(name);
    if (!pk) return null;
    const key = (team ? team.key : '?') + '|' + pk;
    let p = players.get(key);
    if (!p) {
      const sq = roster.get(key);
      p = {
        key, name: sq ? sq.name : String(name).trim().replace(/\s+/g, ' '), team, number: sq ? sq.number : '', position: sq ? sq.position : '',
        inSquad: !!sq, goals: 0, pens: 0, ownGoals: 0, assists: 0, motm: 0, yellow: 0, red: 0, matchIds: new Set(),
      };
      players.set(key, p);
    }
    if (where && team && rosterTeams.has(team.key) && !p.inSquad) {
      issues.push(`${where}: "${p.name}" is not in ${team.name}'s squad (Players tab) — check the spelling.`);
    }
    return p;
  };
  roster.forEach((v, k) => playerRef(v.name, teams.get(k.split('|')[0])));

  // Google Form answers: "Not in list" means use the typed name instead.
  const pick = (listed, typed) => {
    const v = String(listed || '').trim();
    return v && !/^(not in (the )?list|other|type (it )?below|none)/i.test(v) ? v : String(typed || '').trim();
  };
  const sideOf = (m, teamName) => {
    const k = teamKey(teamName);
    if (m.home && m.home.key === k) return 'home';
    if (m.away && m.away.key === k) return 'away';
    return null;
  };
  const other = (side) => (side === 'home' ? 'away' : 'home');
  // Match can be "GA1" or a form choice like "GA1 · BATAKA FC v ABOMUTIMA FC".
  const lookupMatch = (raw) => {
    raw = String(raw || '');
    return matchById.get(normId(raw)) || matchById.get(normId((raw.match(/^\s*([A-Za-z0-9]+)/) || ['', ''])[1])) || null;
  };
  const findMatch = (where, r) => {
    const raw = r.matchid || r.match || '';
    const m = lookupMatch(raw);
    if (!m) { if (raw || r.team) issues.push(`${where}: unknown match "${raw}".`); return null; }
    if (!m.home || !m.away) { issues.push(`${where}: match ${m.id} has no teams yet.`); return null; }
    return m;
  };

  const goalRows = t.goals.rows.map((r, i) => ({ r, where: `Goals row ${i + 2}` })).concat(
    t.goalsForm.rows.map((r, i) => ({
      where: `Goals form response ${i + 1}`,
      r: {
        match: r.matchid || r.match, team: r.team, minute: r.minute, type: r.type || r.typeofgoal,
        scorer: pick(r.scorer, r.scorertyped),
        assist: /^no assist/i.test(r.assist || '') ? '' : pick(r.assist, r.assisttyped),
      },
    })));
  goalRows.forEach(({ r, where }) => {
    const m = findMatch(where, r);
    if (!m) return;
    const side = sideOf(m, r.team);
    if (!side) { issues.push(`${where}: team "${r.team}" didn't play in ${m.id}.`); return; }
    const type = /own|^og$/i.test(r.type || '') ? 'OG' : /pen|^p$/i.test(r.type || '') ? 'PEN' : '';
    const scorerSide = type === 'OG' ? other(side) : side;
    const scorer = playerRef(r.scorer || r.player, m[scorerSide], where);
    const assist = type !== 'OG' && r.assist ? playerRef(r.assist, m[side], where) : null;
    const g = { match: m, side, team: m[side], scorer, assist, type, minute: parseMinute(r.minute) };
    m.goals.push(g);
    if (scorer) {
      scorer.matchIds.add(m.id);
      if (type === 'OG') scorer.ownGoals++; else scorer.goals++;
      if (type === 'PEN') scorer.pens++;
    }
    if (assist) { assist.assists++; assist.matchIds.add(m.id); }
  });

  const cardRows = t.cards.rows.map((r, i) => ({ r, where: `Cards row ${i + 2}` })).concat(
    t.cardsForm.rows.map((r, i) => ({
      where: `Cards form response ${i + 1}`,
      r: { match: r.matchid || r.match, team: r.team, minute: r.minute, card: r.card, player: pick(r.player, r.playertyped) },
    })));
  cardRows.forEach(({ r, where }) => {
    const m = findMatch(where, r);
    if (!m) return;
    const side = sideOf(m, r.team);
    if (!side) { issues.push(`${where}: team "${r.team}" didn't play in ${m.id}.`); return; }
    const card = /red|^r$|2nd|second/i.test(r.card || '') ? 'R' : 'Y';
    const player = playerRef(r.player, m[side], where);
    m.cards.push({ match: m, side, team: m[side], player, card, minute: parseMinute(r.minute) });
    if (player) { player.matchIds.add(m.id); if (card === 'R') player.red++; else player.yellow++; }
  });

  const statCols = new Map(KNOWN_STATS.map(([k, label, unit]) => [k, { key: k, label, unit: unit || '', used: false }]));
  t.matchStats.headers.forEach((h) => {
    const k = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k && k !== 'matchid' && k !== 'team' && !statCols.has(k)) statCols.set(k, { key: k, label: prettyHeader(h), unit: '', used: false });
  });
  t.matchStats.rows.forEach((r, i) => {
    const m = findMatch(`MatchStats row ${i + 2}`, r);
    if (!m) return;
    const side = sideOf(m, r.team);
    if (!side) { issues.push(`MatchStats row ${i + 2}: team "${r.team}" didn't play in ${m.id}.`); return; }
    m.stats = m.stats || { home: {}, away: {} };
    for (const [k, col] of statCols) {
      const v = parseNum(r[k]);
      if (v != null) { m.stats[side][k] = v; col.used = true; }
    }
  });
  const statColumns = [...statCols.values()].filter((c) => c.used);

  t.motmForm.rows.forEach((r, i) => {
    const m = findMatch(`MOTM form response ${i + 1}`, r);
    if (m && !m.motmRaw) { m.motmFormName = pick(r.player, r.playertyped); m.motmFormTeam = r.team || ''; }
  });

  matches.forEach((m) => {
    if (!m.motmRaw && m.motmFormName) { m.motmRaw = m.motmFormName; m.motmTeamRaw = m.motmFormTeam; }
    if (m.finished) {
      const counted = { home: 0, away: 0 };
      m.goals.forEach((g) => counted[g.side]++);
      if (m.goals.length && (counted.home !== m.hs || counted.away !== m.as)) {
        issues.push(`${m.id}: score is ${m.hs}-${m.as} but the Goals tab lists ${counted.home}-${counted.away}.`);
      }
    }
    m.goals.sort((a, b) => (a.minute ? a.minute.sort : 999) - (b.minute ? b.minute.sort : 999));
    m.cards.sort((a, b) => (a.minute ? a.minute.sort : 999) - (b.minute ? b.minute.sort : 999));
    if (m.motmRaw && m.home && m.away) {
      let team = null;
      if (m.motmTeamRaw) {
        const s = sideOf(m, m.motmTeamRaw);
        if (s) team = m[s]; else issues.push(`${m.id}: MOTMTeam "${m.motmTeamRaw}" didn't play in this match.`);
      }
      if (!team) {
        const pk = personKey(m.motmRaw);
        team = [m.home, m.away].find((tm) => players.has(tm.key + '|' + pk)) || null;
      }
      const p = playerRef(m.motmRaw, team, `${m.id} Man of the Match`);
      if (p) { p.motm++; p.matchIds.add(m.id); m.motm = p; }
    }
  });

  /* standings */
  const groupList = [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)).map((g) => {
    g.table = computeGroupTable(g.teams, g.matches);
    g.playedCount = g.matches.filter((f) => f.finished).length;
    g.liveCount = g.matches.filter((f) => f.live).length;
    g.complete = g.matches.length > 0 && g.playedCount === g.matches.length;
    g.teams.forEach((tm) => { tm.groupRow = g.table.find((r) => r.key === tm.key); });
    return g;
  });
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const anyPlayed = groupMatches.some((m) => m.played);
  const qual = computeQualifiers(groupList, anyPlayed);

  const teamList = [...teams.values()].filter((tm) => tm.group);
  const overallGroup = computeFlatTable(teamList, groupMatches);
  const overallAll = computeFlatTable(teamList, matches);

  /* per-team aggregates */
  const chrono = [...matches].sort(chronoCmp);
  const koMatches = matches.filter((m) => m.stage === 'ko');
  const champion = bySlot.FINAL && bySlot.FINAL.winner;
  teamList.forEach((tm) => {
    const s = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, cs: 0, fts: 0, yellow: 0, red: 0, statSums: {}, statN: {}, form: [], matches: [] };
    chrono.forEach((m) => {
      if (m.home !== tm && m.away !== tm) return;
      s.matches.push(m);
      if (m.live) tm.liveNow = m;
      if (!m.finished) return;
      const home = m.home === tm;
      const gf = home ? m.hs : m.as, ga = home ? m.as : m.hs;
      s.p++; s.gf += gf; s.ga += ga;
      if (ga === 0) s.cs++;
      if (gf === 0) s.fts++;
      const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
      s[res.toLowerCase()]++;
      s.form.push({ res, match: m, pens: m.stage === 'ko' && gf === ga ? (m.winner === tm ? 'won' : 'lost') : '' });
      if (m.stats) {
        const mine = m.stats[home ? 'home' : 'away'];
        for (const k in mine) { s.statSums[k] = (s.statSums[k] || 0) + mine[k]; s.statN[k] = (s.statN[k] || 0) + 1; }
      }
      m.cards.forEach((c) => { if (c.team === tm) { if (c.card === 'R') s.red++; else s.yellow++; } });
    });
    s.gd = s.gf - s.ga;
    s.winPct = s.p ? Math.round((s.w / s.p) * 100) : 0;
    tm.stats = s;
    tm.stage = stageReached(tm, koMatches, champion, qual, groups.get(tm.group));
  });

  const playerList = [...players.values()];
  teamList.forEach((tm) => {
    tm.squad = playerList.filter((p) => p.team === tm && p.inSquad)
      .sort((a, b) => (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999) || a.name.localeCompare(b.name));
  });
  const content = buildContent(t, lookupMatch, teams);

  // One-day tournament? (every dated match on the same calendar day)
  const days = new Set(matches.filter((m) => m.date && !m.date.noDay).map((m) => m.date.d.toDateString()));
  const oneDay = days.size <= 1 && matches.some((m) => m.date);
  const firstKick = chrono.find((m) => m.date);
  const liveMatches = chrono.filter((m) => m.live);
  const upcoming = chrono.filter((m) => !m.played);

  return {
    cfg, teams, teamList, groups: groupList, matches, matchById, bySlot,
    groupMatches, koMatches, anyPlayed, qual, overallGroup, overallAll, champion,
    oneDay, matchDay: matchDay || (firstKick ? firstKick.date : null), firstKick, liveMatches, upcoming,
    players: playerList, statColumns, tournament: tournamentTotals(matches, teamList, playerList),
    ...content,
    issues: [...new Set(issues)],
    teamBySlug: (slug) => teamList.find((tm) => tm.slug === slug) || null,
    match: (id) => matchById.get(normId(id)) || null,
  };
}

export function chronoCmp(a, b) {
  const da = a.date ? a.date.d.getTime() : Infinity, db = b.date ? b.date.d.getTime() : Infinity;
  return da - db || a.order - b.order;
}

function computeQualifiers(groupList, anyPlayed) {
  const allComplete = groupList.length > 0 && groupList.every((g) => g.complete);
  const direct = [];
  groupList.forEach((g) => {
    g.table.slice(0, TOP_N).forEach((r, i) => {
      if (anyPlayed) r.status = 'q';
      direct.push({ label: g.id + (i + 1), desc: (i === 0 ? 'Winner' : 'Runner-up') + ' Group ' + g.id, team: r.team, row: r, confirmed: g.complete });
    });
  });
  const thirds = groupList
    .map((g) => (g.table[TOP_N] ? { group: g.id, row: g.table[TOP_N] } : null))
    .filter(Boolean)
    .sort((a, b) => byPtsGdGf(a.row, b.row) || a.row.team.name.localeCompare(b.row.team.name));
  thirds.forEach((th, i) => {
    th.qualifies = i < BEST_THIRDS;
    if (anyPlayed) th.row.status = th.qualifies ? 'q3' : 'out3';
  });
  const best = thirds.filter((th) => th.qualifies).map((th, i) => ({
    label: '3rd #' + (i + 1), desc: 'Best 3rd place (Group ' + th.group + ')', team: th.row.team, row: th.row, confirmed: allComplete, third: true,
  }));
  return { list: direct.concat(best), thirds, allComplete };
}

// Winner of a knockout match. Draws are settled by the Note column naming the
// winning team (e.g. "AMARO FC won 4-3 on penalties"); the team named first wins.
function koWinner(m) {
  if (!m.finished) return null;
  if (m.hs > m.as) return m.home;
  if (m.as > m.hs) return m.away;
  const note = ' ' + teamKey(m.note) + ' ';
  const hi = note.indexOf(' ' + m.home.key + ' '), ai = note.indexOf(' ' + m.away.key + ' ');
  if (hi < 0 && ai < 0) return null;
  return ai < 0 || (hi >= 0 && hi < ai) ? m.home : m.away;
}

// Short label for how far a team got: Champion, Final, SF, QF, Qualified, Eliminated…
function stageReached(tm, koMatches, champion, qual, group) {
  if (champion === tm) return { code: 'champ', label: 'Champion', short: 'Champion' };
  let deepest = null;
  koMatches.forEach((m) => {
    if ((m.home === tm || m.away === tm) && (!deepest || ROUND_ORDER[m.round] > ROUND_ORDER[deepest.round])) deepest = m;
  });
  if (deepest) {
    const r = deepest.round;
    const out = deepest.winner && deepest.winner !== tm;
    if (r === 'FINAL') return out ? { code: 'out', label: 'Runner-up', short: 'Runner-up' } : { code: 'alive', label: 'In the Final', short: 'Final' };
    const name = r === 'SF' ? 'Semifinal' : 'Quarterfinal';
    return out ? { code: 'out', label: 'Out in the ' + name, short: 'Out · ' + r } : { code: 'alive', label: 'In the ' + name, short: r };
  }
  const q = qual.list.find((x) => x.team === tm);
  if (q && q.confirmed) return { code: 'alive', label: 'Qualified', short: 'Qualified' };
  const groupDone = group && group.complete;
  if (!q && groupDone && (qual.allComplete || group.table.findIndex((r) => r.team === tm) > TOP_N)) {
    return { code: 'out', label: 'Out in group stage', short: 'Out · Groups' };
  }
  return { code: 'group', label: 'Group stage', short: 'Groups' };
}

function tournamentTotals(matches, teamList, players) {
  const played = matches.filter((m) => m.finished);
  const goals = played.reduce((n, m) => n + m.hs + m.as, 0);
  let homeW = 0, draws = 0, awayW = 0, biggest = null, highest = null;
  played.forEach((m) => {
    if (m.hs > m.as) homeW++; else if (m.hs < m.as) awayW++; else draws++;
    const margin = Math.abs(m.hs - m.as), total = m.hs + m.as;
    if (!biggest || margin > Math.abs(biggest.hs - biggest.as)) biggest = m;
    if (!highest || total > highest.hs + highest.as) highest = m;
  });
  const allGoals = matches.flatMap((m) => m.goals);
  const buckets = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75], [76, 90]].map(([a, b]) => ({ label: a + '–' + b, from: a, to: b, n: 0 }));
  const extra = { label: '90+', n: 0 };
  allGoals.forEach((g) => {
    if (!g.minute) return;
    const n = g.minute.n;
    if (n > 90 || (n === 90 && g.minute.extra)) { extra.n++; return; }
    if (n === 45 && g.minute.extra) { buckets[2].n++; return; }
    const b = buckets.find((x) => n >= x.from && n <= x.to) || buckets[0];
    b.n++;
  });
  if (extra.n) buckets.push(extra);
  const allCards = matches.flatMap((m) => m.cards);
  return {
    total: matches.length,
    played: played.length,
    goals,
    perMatch: played.length ? goals / played.length : 0,
    homeW, draws, awayW,
    biggest: biggest && Math.abs(biggest.hs - biggest.as) > 0 ? biggest : null,
    highest: highest && highest.hs + highest.as > 0 ? highest : null,
    cleanSheets: teamList.reduce((n, tm) => n + tm.stats.cs, 0),
    minuteBuckets: buckets,
    minutesKnown: allGoals.some((g) => g.minute),
    goalTypes: {
      open: allGoals.filter((g) => !g.type).length,
      pen: allGoals.filter((g) => g.type === 'PEN').length,
      og: allGoals.filter((g) => g.type === 'OG').length,
    },
    goalsLogged: allGoals.length,
    yellow: allCards.filter((c) => c.card === 'Y').length,
    red: allCards.filter((c) => c.card === 'R').length,
    scorers: players.filter((p) => p.goals > 0).length,
  };
}

// Light-hearted pre-match prediction from each team's results so far.
export function predict(m) {
  const strength = (tm) => {
    const s = tm.stats;
    if (!s || !s.p) return 1.5;
    return Math.max(0.3, 0.6 + ((s.w * 3 + s.d) / s.p) * 0.7 + (s.gd / s.p) * 0.2);
  };
  const a = strength(m.home) ** 2, b = strength(m.away) ** 2;
  const rawHome = a / (a + b);
  const pDraw = 0.3 * (1 - Math.abs(rawHome - 0.5) * 1.6);
  let home = Math.round(rawHome * (1 - pDraw) * 100);
  let draw = Math.round(pDraw * 100);
  let away = 100 - home - draw;
  return { home, draw, away };
}

/* ------------------------------------------------ announcements, info, photos, sponsors */

const truthy = (v) => v === '' || v == null || /^(y|yes|true|1|on|show|active)$/i.test(String(v).trim());

// Google Drive share links -> direct image links (the file must be shared "anyone with the link").
export function imageUrl(url, width = 1600) {
  url = String(url || '').trim();
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{20,})/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${width}`;
  if (url && !/^(https?:)?\/\//.test(url) && !url.includes('/')) return 'assets/photos/' + url;
  return url;
}

function buildContent(t, lookupMatch, teams) {
  const announcements = t.announcements.rows
    .filter((r) => r.message && truthy(r.active != null ? r.active : r.show))
    .map((r, i) => ({ id: 'a' + i + ':' + r.message.slice(0, 40), time: r.time || '', message: r.message, urgent: /urgent|important|high|red/i.test(r.level || r.priority || '') }))
    .reverse(); // newest (bottom row) first

  const info = [];
  t.info.rows.forEach((r) => {
    if (!r.title && !r.body) return;
    const name = r.section || 'About';
    let sec = info.find((x) => x.name === name);
    if (!sec) { sec = { name, items: [] }; info.push(sec); }
    sec.items.push({ title: r.title || '', body: r.body || '', link: r.link || r.url || '' });
  });

  const photos = t.photos.rows.filter((r) => r.url || r.photo || r.link).map((r, i) => {
    const src = (r.url || r.photo || r.link).trim();
    const m = lookupMatch(r.matchid || r.match);
    const team = r.team ? teams.get(teamKey(r.team)) || null : null;
    // A plain file name lives in assets/photos/ (small version in assets/photos/thumbs/).
    const local = !/^(https?:)?\/\//.test(src) && !src.includes('/');
    return {
      i, full: imageUrl(src, 1600), thumb: local ? 'assets/photos/thumbs/' + src : imageUrl(src, 600),
      caption: r.caption || '', credit: r.credit || r.by || '', season: r.season || '', match: m, team,
    };
  });
  // Newest first: this season's photos (no Season value, or the latest one) before older seasons.
  const seasons = [...new Set(photos.map((p) => p.season))];
  photos.sort((a, b) => seasonRank(b.season, seasons) - seasonRank(a.season, seasons) || (a.season === b.season ? (a.season ? a.i - b.i : b.i - a.i) : 0));

  const ads = t.ads.rows.filter((r) => r.message && truthy(r.active)).map((r) => ({
    message: r.message,
    call: (r.call || r.phone || '').replace(/[^\d+]/g, ''),
    whatsapp: (r.whatsapp || '').replace(/[^\d+]/g, ''),
    link: r.link || r.url || '',
  }));

  const sponsors = t.sponsors.rows.filter((r) => r.name || r.sponsor).map((r) => ({
    name: r.name || r.sponsor, logo: r.logo ? imageUrl(r.logo, 600).replace('assets/photos/', 'assets/sponsors/') : '',
    url: r.url || r.website || '', tier: r.tier || r.level || '',
  }));

  return { announcements, info, photos, sponsors, ads };
}

// Photos with no Season are this season's; otherwise "Season 2" ranks above "Season 1".
function seasonRank(season) {
  if (!season) return 1e9;
  const n = String(season).match(/season\s*(\d+)/i) || String(season).match(/(\d{4})/);
  return n ? +n[1] : 0;
}
