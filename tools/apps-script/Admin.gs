/**
 * KYOGYERA LEAGUE — Admin web service
 * ===================================
 * Lets people with a sign-in code update the sheet from the website's Admin page.
 * Deployed as a web app ("Execute as: me", "Who has access: Anyone"); every
 * request except "login" must carry a signed session token, and every change is
 * checked against the person's role and written to the Log tab.
 *
 * Codes are NOT stored in the sheet (the sheet is readable by anyone with its
 * link) and not on GitHub: only a salted SHA-256 hash lives in the script's
 * private Script Properties. Create/see codes with Kyogyera → 6. Admin codes.
 *
 * Roles
 *   admin  — everything
 *   editor — fixtures (times, knockout teams, group & knockout draws), squads, teams
 *   ref    — the match console only (status, score, goals, cards, stats, MOTM, new players)
 */

const KL = {
  SESSION_HOURS: 14,
  MAX_FAILS: 20, // wrong codes allowed per 10 minutes (for everyone together)
  ROLE_NAMES: { admin: 'Admin', editor: 'Editor', ref: 'Referee' },
  TAB_ROLES: {
    Announcements: ['admin'], Sponsors: ['admin'], Ads: ['admin'], Config: ['admin'], Info: ['admin'], Photos: ['admin'],
    Goals: ['admin'], Cards: ['admin'], MatchStats: ['admin'],
    Teams: ['admin', 'editor'], Players: ['admin', 'editor'], GroupFixtures: ['admin', 'editor'], KnockoutFixtures: ['admin', 'editor'],
  },
  MATCH_ROLES: ['admin', 'ref'],
  FIXTURE_ROLES: ['admin', 'editor'],
  STATS: ['Possession', 'Shots', 'ShotsOnTarget', 'Corners', 'Fouls', 'Offsides', 'Saves'],
};

/* ================================================================== HTTP */

function doGet() {
  return klJson({ ok: true, app: 'kyogyera-admin', ready: klCodes().length > 0 });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return klJson({ ok: false, error: 'Bad request.' }); }
  try {
    return klJson(Object.assign({ ok: true }, klHandle(req)));
  } catch (err) {
    const msg = String(err && err.message || err);
    return klJson({ ok: false, error: msg.replace(/^AUTH: /, ''), code: /^AUTH: /.test(msg) ? 'AUTH' : undefined });
  }
}

function klJson(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function klHandle(req) {
  const a = String(req.action || '');
  if (a === 'login') return klLogin(req.pin);
  const who = klVerify(req.token);
  const need = (roles) => { if (roles.indexOf(who.role) < 0) throw new Error('Your code is not allowed to do that.'); };
  const tabOk = (tab) => { const r = KL.TAB_ROLES[tab]; if (!r) throw new Error('Unknown tab "' + tab + '".'); need(r); };
  const withState = (out) => Object.assign(out || {}, { state: klMatchState(req.matchId) });

  switch (a) {
    case 'whoami': return { name: who.name, role: who.role };

    // ---- generic tab editing
    case 'list': tabOk(req.tab); return klList(req.tab);
    case 'add': tabOk(req.tab); return klWrite(who, () => klAdd(req.tab, req.values), 'Added a row to ' + req.tab, req.values);
    case 'update': tabOk(req.tab); return klWrite(who, () => klUpdate(req.tab, req.row, req.values, req.before), 'Edited ' + req.tab + ' row ' + req.row, req.values);
    case 'remove': tabOk(req.tab); return klWrite(who, () => klRemove(req.tab, req.row, req.before), 'Deleted ' + req.tab + ' row ' + req.row, req.before);

    // ---- match console
    case 'matches': need(KL.MATCH_ROLES); return { matches: klMatchList() };
    case 'match': need(KL.MATCH_ROLES); return klMatchState(req.matchId);
    case 'setStatus': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klSetStatus(req.matchId, req.status), req.matchId + ' status → ' + (req.status || 'upcoming')));
    case 'setScore': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klSetScore(req.matchId, req.home, req.away), req.matchId + ' score set to ' + req.home + '-' + req.away));
    case 'addGoal': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klAddGoal(req), req.matchId + ' goal: ' + req.scorer + ' (' + req.side + ')'));
    case 'removeGoal': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klRemoveGoal(req.matchId, req.row, req.before), req.matchId + ' goal removed'));
    case 'addCard': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klAddCard(req), req.matchId + ' ' + req.card + ' card: ' + req.player));
    case 'removeCard': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klRemoveMatchRow('Cards', req.matchId, req.row, req.before), req.matchId + ' card removed'));
    case 'stat': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klStat(req.matchId, req.side, req.stat, req.delta, req.value), req.matchId + ' ' + req.stat + ' ' + req.side + (req.value != null ? ' = ' + req.value : ' ' + (req.delta > 0 ? '+' : '') + req.delta)));
    case 'setMotm': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klSetMotm(req.matchId, req.player, req.side, req.newPlayer), req.matchId + ' Man of the Match: ' + req.player));
    case 'setNote': need(KL.MATCH_ROLES); return withState(klWrite(who, () => klSetCell(req.matchId, 'Note', req.note || ''), req.matchId + ' note: ' + req.note));
    case 'addPlayer': need(KL.MATCH_ROLES.concat(['editor'])); return klWrite(who, () => ({ added: klEnsurePlayer(req.team, req.player, req.number, req.position) }), 'New player ' + req.player + ' (' + req.team + ')');
    case 'setFixture': need(KL.FIXTURE_ROLES); return klWrite(who, () => klSetFixture(req.matchId, req.values), req.matchId + ' fixture updated', req.values);
    case 'fixtures': need(KL.FIXTURE_ROLES); return klFixtureState();
    case 'groupDraw': need(KL.FIXTURE_ROLES); return klWrite(who, () => klGroupDraw(req.groups), 'Group draw', req.groups);
    case 'koDraw': need(KL.FIXTURE_ROLES); return klWrite(who, () => klKoDraw(req.pairs), 'Knockout draw', req.pairs);

    // ---- photos
    case 'uploadPhoto': tabOk('Photos'); return klWrite(who, () => klUploadPhoto(req), 'Uploaded photo "' + (req.caption || '') + '"');

    // ---- admin only
    case 'codes': need(['admin']); return { people: klCodes().map((c) => ({ id: c.id, name: c.name, role: c.role })) };
    case 'addCode': need(['admin']); return klWrite(who, () => klAddCode(req.name, req.role), 'Added a code for ' + req.name + ' (' + req.role + ')');
    case 'resetCode': need(['admin']); return klWrite(who, () => klResetCode(req.id), 'Reset a code');
    case 'removeCode': need(['admin']); return klWrite(who, () => klRemoveCode(req.id, who), 'Removed a code');
    case 'log': need(['admin']); return klLogRows();
    default: throw new Error('Unknown action.');
  }
}

/* ============================================================== sessions */

function klProps() { return PropertiesService.getScriptProperties(); }

function klSecret() {
  let s = klProps().getProperty('sessionSecret');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); klProps().setProperty('sessionSecret', s); }
  return s;
}

function klSign(payload) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, klSecret()));
  return body + '.' + sig;
}

function klVerify(token) {
  if (!token || String(token).indexOf('.') < 0) throw new Error('AUTH: Please sign in.');
  const parts = String(token).split('.');
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], klSecret()));
  if (sig !== parts[1]) throw new Error('AUTH: Your sign-in is no longer valid. Please sign in again.');
  const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (Date.now() > p.exp) throw new Error('AUTH: Your sign-in has expired. Please sign in again.');
  const c = klCodes().find((x) => x.id === p.id);
  if (!c) throw new Error('AUTH: This code was removed. Please sign in again.');
  if (c.v !== p.v) throw new Error('AUTH: This code was changed. Please sign in with the new code.');
  return { id: c.id, name: c.name, role: c.role };
}

function klHash(pin, salt) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + String(pin)));
}

function klLogin(pin) {
  pin = String(pin || '').replace(/\D/g, '');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= KL.MAX_FAILS) throw new Error('Too many wrong codes. Please wait 10 minutes and try again.');
  const c = pin.length >= 4 ? klCodes().find((x) => x.hash === klHash(pin, x.salt)) : null;
  if (!c) {
    cache.put('fails', String(fails + 1), 600);
    Utilities.sleep(700);
    throw new Error('Wrong code.');
  }
  const exp = Date.now() + KL.SESSION_HOURS * 3600 * 1000;
  klLog({ name: c.name, role: c.role }, 'Signed in', '');
  return { token: klSign({ id: c.id, v: c.v, exp }), name: c.name, role: c.role, exp };
}

/* ================================================================= codes */

function klCodes() {
  try { return JSON.parse(klProps().getProperty('codes') || '[]'); } catch (e) { return []; }
}
function klSaveCodes(list) { klProps().setProperty('codes', JSON.stringify(list)); }

function klNewPin(existing) {
  let pin;
  do { pin = String(Math.floor(100000 + Math.random() * 900000)); }
  while (existing.some((c) => c.hash === klHash(pin, c.salt)));
  return pin;
}

function klAddCode(name, role) {
  if (!KL.ROLE_NAMES[role]) throw new Error('Role must be admin, editor or ref.');
  name = String(name || '').trim() || KL.ROLE_NAMES[role];
  const list = klCodes();
  const pin = klNewPin(list);
  const salt = Utilities.getUuid();
  list.push({ id: Utilities.getUuid().slice(0, 8), name, role, salt, hash: klHash(pin, salt), v: 1 });
  klSaveCodes(list);
  return { pin, name, role };
}

function klResetCode(id) {
  const list = klCodes();
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error('Person not found.');
  const pin = klNewPin(list.filter((x) => x !== c));
  c.salt = Utilities.getUuid(); c.hash = klHash(pin, c.salt); c.v = (c.v || 1) + 1;
  klSaveCodes(list);
  return { pin, name: c.name, role: c.role };
}

function klRemoveCode(id, who) {
  const list = klCodes();
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error('Person not found.');
  if (c.role === 'admin' && list.filter((x) => x.role === 'admin').length === 1) throw new Error('You cannot remove the last admin code.');
  klSaveCodes(list.filter((x) => x.id !== id));
  return { removed: c.name };
}

/** Menu: Kyogyera → 6. Admin codes. Creates the first three codes, or shows who has one. */
function showAdminCodes() {
  const ui = SpreadsheetApp.getUi();
  klProps().setProperty('sheetId', SpreadsheetApp.getActive().getId());
  let list = klCodes();
  if (!list.length) {
    const made = [klAddCode('Peterson', 'admin'), klAddCode('Referee', 'ref'), klAddCode('Editor', 'editor')];
    ui.alert('Admin codes created',
      'Keep these private. They are shown only now — write them down.\n\n' +
      made.map((m) => `${KL.ROLE_NAMES[m.role]} (${m.name}):  ${m.pin}`).join('\n') +
      '\n\nSign in on the website: tap the gold ADMIN button.\nLost a code? Run this menu again and choose to reset.', ui.ButtonSet.OK);
    return;
  }
  const r = ui.alert('Admin codes',
    'People with a code:\n\n' + list.map((c) => `• ${c.name} — ${KL.ROLE_NAMES[c.role]}`).join('\n') +
    '\n\nCodes are stored securely and cannot be shown again.\nCreate NEW codes for everyone now? (Old codes stop working.)', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const made = list.map((c) => klResetCode(c.id));
  ui.alert('New admin codes', 'Keep these private — shown only now:\n\n' +
    made.map((m) => `${KL.ROLE_NAMES[m.role]} (${m.name}):  ${m.pin}`).join('\n'), ui.ButtonSet.OK);
}

/* ================================================================ sheets */

function klSS() {
  try { const ss = SpreadsheetApp.getActiveSpreadsheet(); if (ss) return ss; } catch (e) { /* not bound in this context */ }
  return SpreadsheetApp.openById(klProps().getProperty('sheetId'));
}

function klSheet(tab) {
  const sh = klSS().getSheetByName(tab);
  if (!sh) throw new Error('The sheet has no "' + tab + '" tab — run Kyogyera → 1. Set up tabs & dropdowns.');
  return sh;
}

function klHead(sh) {
  return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map((h) => String(h).trim());
}

function klList(tab) {
  const sh = klSheet(tab);
  const head = klHead(sh);
  const last = sh.getLastRow();
  const vals = last > 1 ? sh.getRange(2, 1, last - 1, head.length).getDisplayValues() : [];
  const rows = [];
  vals.forEach((r, i) => { if (r.some(String)) rows.push({ _row: i + 2, _raw: r, values: klObj(head, r) }); });
  return { tab, headers: head, rows };
}

function klObj(head, r) { const o = {}; head.forEach((h, i) => { if (h) o[h] = r[i]; }); return o; }

function klRowArray(head, values, base) {
  return head.map((h, i) => (values && Object.prototype.hasOwnProperty.call(values, h) ? (values[h] == null ? '' : values[h]) : (base ? base[i] : '')));
}

function klAdd(tab, values) {
  const sh = klSheet(tab);
  const head = klHead(sh);
  const row = klRowArray(head, values);
  sh.appendRow(row);
  return { row: sh.getLastRow() };
}

function klCheckRow(sh, head, row, before) {
  row = Number(row);
  if (!(row >= 2) || row > sh.getLastRow()) throw new Error('That row no longer exists — reload and try again.');
  const now = sh.getRange(row, 1, 1, head.length).getDisplayValues()[0];
  if (before && JSON.stringify(now.slice(0, before.length)) !== JSON.stringify(before.slice(0, now.length))) {
    throw new Error('Someone else changed this row just now — reload and try again.');
  }
  return now;
}

function klUpdate(tab, row, values, before) {
  const sh = klSheet(tab);
  const head = klHead(sh);
  const now = klCheckRow(sh, head, row, before);
  sh.getRange(Number(row), 1, 1, head.length).setValues([klRowArray(head, values, now)]);
  return { row: Number(row) };
}

function klRemove(tab, row, before) {
  const sh = klSheet(tab);
  const head = klHead(sh);
  klCheckRow(sh, head, row, before);
  sh.deleteRow(Number(row));
  return { removed: Number(row) };
}

/* ============================================================== matches */

const klShort = (n) => String(n || '').replace(/\s*\d{4}\s*[-–]\s*\d{2,4}\s*$/, '').trim();
const klKey = (n) => klShort(n).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\b(FC|SC)\b/g, ' ').replace(/\s+/g, ' ').trim();
const klPerson = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

function klFindMatch(matchId) {
  const id = String(matchId || '').toUpperCase().trim();
  for (const tab of ['GroupFixtures', 'KnockoutFixtures']) {
    const sh = klSheet(tab);
    const head = klHead(sh);
    const c = head.indexOf('MatchID');
    const last = sh.getLastRow();
    if (last < 2) continue;
    const vals = sh.getRange(2, 1, last - 1, head.length).getDisplayValues();
    const i = vals.findIndex((r) => String(r[c]).toUpperCase().trim() === id);
    if (i >= 0) return { sh, head, row: i + 2, v: klObj(head, vals[i]), tab };
  }
  throw new Error('Match "' + matchId + '" not found.');
}

function klSetCell(matchId, col, value) {
  const m = klFindMatch(matchId);
  const c = m.head.indexOf(col);
  if (c < 0) throw new Error('The ' + m.tab + ' tab has no "' + col + '" column.');
  m.sh.getRange(m.row, c + 1).setValue(value);
  return {};
}

function klMatchList() {
  const out = [];
  ['GroupFixtures', 'KnockoutFixtures'].forEach((tab) => {
    klList(tab).rows.forEach((r) => {
      const v = r.values;
      if (!v.MatchID) return;
      out.push({ id: v.MatchID, stage: tab === 'GroupFixtures' ? 'Group ' + v.Group : (v.Slot || v.Round), home: klShort(v.TeamHome), away: klShort(v.TeamAway), time: v.Date, status: v.Status, hs: v.ScoreHome, as: v.ScoreAway });
    });
  });
  return out;
}

function klSquad(team) {
  const k = klKey(team);
  return klList('Players').rows.filter((r) => klKey(r.values.Team) === k && r.values.Player)
    .map((r) => ({ name: r.values.Player, number: r.values.Number || '', position: r.values.Position || '' }));
}

function klEnsurePlayer(team, name, number, position) {
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (!name || !team) return false;
  if (klSquad(team).some((p) => klPerson(p.name) === klPerson(name))) return false;
  klAdd('Players', { Team: klShort(team), Player: name, Number: number || '', Position: position || '' });
  return true;
}

function klMatchState(matchId) {
  const m = klFindMatch(matchId);
  const v = m.v;
  const id = String(v.MatchID).toUpperCase();
  const mine = (tab) => klList(tab).rows.filter((r) => String(r.values.MatchID).toUpperCase() === id);
  const homeK = klKey(v.TeamHome), awayK = klKey(v.TeamAway);
  const sideOf = (team) => (klKey(team) === homeK ? 'home' : klKey(team) === awayK ? 'away' : '');
  const players = klList('Players').rows;
  const squadOf = (team) => (team ? players.filter((r) => klKey(r.values.Team) === klKey(team) && r.values.Player)
    .map((r) => ({ name: r.values.Player, number: r.values.Number || '', position: r.values.Position || '' })) : []);
  const stats = { home: {}, away: {} };
  mine('MatchStats').forEach((r) => { const s = sideOf(r.values.Team); if (s) KL.STATS.forEach((k) => { stats[s][k] = r.values[k] === '' || r.values[k] == null ? '' : Number(r.values[k]); }); });
  return {
    match: {
      id: v.MatchID, tab: m.tab, stage: m.tab === 'GroupFixtures' ? 'Group ' + v.Group : (v.Slot || v.Round),
      home: klShort(v.TeamHome), away: klShort(v.TeamAway), hs: v.ScoreHome, as: v.ScoreAway, status: v.Status, time: v.Date,
      note: v.Note || '', motm: v.MOTM || '', motmTeam: v.MOTMTeam || '', row: m.row, raw: m.head.map((h) => v[h]),
    },
    goals: mine('Goals').map((r) => ({ row: r._row, before: r._raw, side: sideOf(r.values.Team), team: r.values.Team, scorer: r.values.Scorer, assist: r.values.Assist, minute: r.values.Minute, type: r.values.Type })),
    cards: mine('Cards').map((r) => ({ row: r._row, before: r._raw, side: sideOf(r.values.Team), team: r.values.Team, player: r.values.Player, card: r.values.Card, minute: r.values.Minute })),
    stats,
    squads: { home: squadOf(v.TeamHome), away: squadOf(v.TeamAway) },
  };
}

function klScoreCols(m) {
  return { h: m.head.indexOf('ScoreHome') + 1, a: m.head.indexOf('ScoreAway') + 1, s: m.head.indexOf('Status') + 1 };
}

function klSetStatus(matchId, status) {
  if (['', 'Live', 'HT', 'FT'].indexOf(status) < 0) throw new Error('Status must be Live, HT or FT.');
  const m = klFindMatch(matchId);
  if (!m.v.TeamHome || !m.v.TeamAway) throw new Error('This match has no teams yet.');
  const c = klScoreCols(m);
  m.sh.getRange(m.row, c.s).setValue(status);
  if (status && m.v.ScoreHome === '' && m.v.ScoreAway === '') {
    m.sh.getRange(m.row, c.h).setValue(0);
    m.sh.getRange(m.row, c.a).setValue(0);
  }
  if (!status) { m.sh.getRange(m.row, c.h).setValue(''); m.sh.getRange(m.row, c.a).setValue(''); }
  return {};
}

function klSetScore(matchId, home, away) {
  const m = klFindMatch(matchId);
  const c = klScoreCols(m);
  const n = (x) => (x === '' || x == null ? '' : Math.max(0, Math.floor(Number(x))));
  m.sh.getRange(m.row, c.h).setValue(n(home));
  m.sh.getRange(m.row, c.a).setValue(n(away));
  if (!m.v.Status && (n(home) !== '' || n(away) !== '')) m.sh.getRange(m.row, c.s).setValue('Live');
  return {};
}

function klBump(m, side, delta) {
  const c = klScoreCols(m);
  const col = side === 'home' ? c.h : c.a;
  const other = side === 'home' ? c.a : c.h;
  const cur = Number(m.sh.getRange(m.row, col).getValue()) || 0;
  m.sh.getRange(m.row, col).setValue(Math.max(0, cur + delta));
  if (m.sh.getRange(m.row, other).getDisplayValue() === '') m.sh.getRange(m.row, other).setValue(0);
  if (!m.v.Status) m.sh.getRange(m.row, c.s).setValue('Live'); // a goal means the match is on
}

function klAddGoal(req) {
  const m = klFindMatch(req.matchId);
  if (['home', 'away'].indexOf(req.side) < 0) throw new Error('Pick a team.');
  const scoringTeam = req.side === 'home' ? m.v.TeamHome : m.v.TeamAway;
  const otherTeam = req.side === 'home' ? m.v.TeamAway : m.v.TeamHome;
  const type = /own|og/i.test(req.type || '') ? 'OG' : /pen/i.test(req.type || '') ? 'Penalty' : '';
  const scorer = String(req.scorer || '').trim();
  if (!scorer) throw new Error('Who scored?');
  klEnsurePlayer(type === 'OG' ? otherTeam : scoringTeam, scorer, req.number);
  if (req.assist && type !== 'OG') klEnsurePlayer(scoringTeam, req.assist);
  klAdd('Goals', { MatchID: m.v.MatchID, Team: klShort(scoringTeam), Scorer: scorer, Assist: type === 'OG' ? '' : (req.assist || ''), Minute: String(req.minute || ''), Type: type });
  klBump(m, req.side, +1);
  return {};
}

function klRemoveGoal(matchId, row, before) {
  const m = klFindMatch(matchId);
  const sh = klSheet('Goals');
  const head = klHead(sh);
  const now = klCheckRow(sh, head, row, before);
  const g = klObj(head, now);
  if (String(g.MatchID).toUpperCase() !== String(m.v.MatchID).toUpperCase()) throw new Error('That goal belongs to another match.');
  sh.deleteRow(Number(row));
  const side = klKey(g.Team) === klKey(m.v.TeamHome) ? 'home' : 'away';
  const c = klScoreCols(m);
  const col = side === 'home' ? c.h : c.a;
  m.sh.getRange(m.row, col).setValue(Math.max(0, (Number(m.sh.getRange(m.row, col).getValue()) || 0) - 1));
  return {};
}

function klAddCard(req) {
  const m = klFindMatch(req.matchId);
  const team = req.side === 'home' ? m.v.TeamHome : m.v.TeamAway;
  if (!team) throw new Error('Pick a team.');
  const player = String(req.player || '').trim();
  if (!player) throw new Error('Which player?');
  klEnsurePlayer(team, player, req.number);
  klAdd('Cards', { MatchID: m.v.MatchID, Team: klShort(team), Player: player, Card: /red/i.test(req.card) ? 'Red' : 'Yellow', Minute: String(req.minute || '') });
  return {};
}

function klRemoveMatchRow(tab, matchId, row, before) {
  const sh = klSheet(tab);
  const head = klHead(sh);
  const now = klCheckRow(sh, head, row, before);
  if (String(klObj(head, now).MatchID).toUpperCase() !== String(matchId).toUpperCase()) throw new Error('That row belongs to another match.');
  sh.deleteRow(Number(row));
  return {};
}

function klStat(matchId, side, stat, delta, value) {
  if (KL.STATS.indexOf(stat) < 0) throw new Error('Unknown stat.');
  const m = klFindMatch(matchId);
  const team = side === 'home' ? m.v.TeamHome : m.v.TeamAway;
  if (!team) throw new Error('Pick a team.');
  const sh = klSheet('MatchStats');
  const head = klHead(sh);
  let col = head.indexOf(stat);
  if (col < 0) throw new Error('MatchStats has no "' + stat + '" column.');
  const rows = klList('MatchStats').rows;
  let r = rows.find((x) => String(x.values.MatchID).toUpperCase() === String(m.v.MatchID).toUpperCase() && klKey(x.values.Team) === klKey(team));
  if (!r) { klAdd('MatchStats', { MatchID: m.v.MatchID, Team: klShort(team) }); r = { _row: sh.getLastRow(), values: {} }; }
  const cur = Number(r.values[stat]) || 0;
  let next = value != null && value !== '' ? Number(value) : cur + Number(delta || 0);
  next = Math.max(0, stat === 'Possession' ? Math.min(100, next) : next);
  sh.getRange(r._row, col + 1).setValue(next);
  if (stat === 'Possession') {
    // keep the two sides adding up to 100
    const otherTeam = side === 'home' ? m.v.TeamAway : m.v.TeamHome;
    if (otherTeam) klStatSetRaw(m.v.MatchID, otherTeam, 'Possession', 100 - next);
  }
  return { value: next };
}

function klStatSetRaw(matchId, team, stat, val) {
  const sh = klSheet('MatchStats');
  const head = klHead(sh);
  const rows = klList('MatchStats').rows;
  let r = rows.find((x) => String(x.values.MatchID).toUpperCase() === String(matchId).toUpperCase() && klKey(x.values.Team) === klKey(team));
  if (!r) { klAdd('MatchStats', { MatchID: matchId, Team: klShort(team) }); r = { _row: sh.getLastRow() }; }
  sh.getRange(r._row, head.indexOf(stat) + 1).setValue(val);
}

function klSetMotm(matchId, player, side, newPlayer) {
  const m = klFindMatch(matchId);
  const team = side === 'home' ? m.v.TeamHome : side === 'away' ? m.v.TeamAway : '';
  if (player && team) klEnsurePlayer(team, player);
  klSetCell(matchId, 'MOTM', player || '');
  klSetCell(matchId, 'MOTMTeam', player && team ? klShort(team) : '');
  return {};
}

function klSetFixture(matchId, values) {
  const m = klFindMatch(matchId);
  const allowed = ['Date', 'TeamHome', 'TeamAway', 'Note'];
  Object.keys(values || {}).forEach((k) => {
    if (allowed.indexOf(k) < 0) return;
    const c = m.head.indexOf(k);
    if (c >= 0) m.sh.getRange(m.row, c + 1).setValue(values[k]);
  });
  return {};
}

/* ================================================================ photos */

function klUploadPhoto(req) {
  const m = String(req.data || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) throw new Error('That file is not a photo.');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Photo too large (max 8 MB).');
  const it = DriveApp.getFoldersByName('Kyogyera League Photos');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('Kyogyera League Photos');
  const name = 'kyogyera-' + Utilities.formatDate(new Date(), 'Africa/Kampala', 'yyyyMMdd-HHmmss') + '.jpg';
  const file = folder.createFile(Utilities.newBlob(bytes, m[1], name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  klAdd('Photos', { Url: url, Caption: req.caption || '', MatchID: req.matchId || '', Team: req.team || '', Credit: req.credit || '', Season: req.season || '' });
  return { url };
}

/* =================================================================== log */

function klLog(who, action, details) {
  try {
    const ss = klSS();
    let sh = ss.getSheetByName('Log');
    if (!sh) { sh = ss.insertSheet('Log'); sh.appendRow(['Time', 'Who', 'Role', 'Action', 'Details']); sh.setFrozenRows(1); }
    sh.appendRow([Utilities.formatDate(new Date(), 'Africa/Kampala', 'yyyy-MM-dd HH:mm:ss'), who.name, KL.ROLE_NAMES[who.role] || who.role, action, details ? JSON.stringify(details).slice(0, 400) : '']);
  } catch (e) { /* logging must never block a change */ }
}

function klLogRows() {
  const sh = klSS().getSheetByName('Log');
  if (!sh || sh.getLastRow() < 2) return { rows: [] };
  const n = Math.min(80, sh.getLastRow() - 1);
  const vals = sh.getRange(sh.getLastRow() - n + 1, 1, n, 5).getDisplayValues().reverse();
  return { rows: vals.map((r) => ({ time: r[0], who: r[1], role: r[2], action: r[3], details: r[4] })) };
}

/** Runs a change under a lock (so two phones can't clash) and logs it. */
function klWrite(who, fn, action, details) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('The sheet is busy — try again in a moment.');
  try {
    const out = fn() || {};
    SpreadsheetApp.flush();
    klLog(who, action, details);
    return out;
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================= draws */

// Where the draw stands: teams per group, and whether the group stage has started.
function klFixtureState() {
  const teams = klList('Teams').rows.map((r) => ({ name: r.values.TeamName, group: String(r.values.Group || '').toUpperCase().replace(/^GROUP\s*/, '').trim() }));
  const fixtures = klList('GroupFixtures').rows;
  const started = fixtures.some((r) => r.values.Status || r.values.ScoreHome !== '' || r.values.ScoreAway !== '');
  const ko = klList('KnockoutFixtures').rows.filter((r) => /^QF/i.test(r.values.Slot || r.values.Round));
  const koStarted = ko.some((r) => r.values.Status || r.values.ScoreHome !== '' || r.values.ScoreAway !== '');
  return { teams, started, koStarted };
}

// Round-robin pairings for one group (circle method), as rounds of [home, away].
function klRoundRobin(list) {
  const t = list.slice();
  if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a && b) games.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(games);
    t.splice(1, 0, t.pop()); // rotate all but the first
  }
  return rounds;
}

/** New group draw: groups = { A: [team names], B: [...], ... }. Rebuilds Teams groups and GroupFixtures. */
function klGroupDraw(groups) {
  const state = klFixtureState();
  if (state.started) throw new Error('The group stage has already started — the groups can no longer be reshuffled.');
  const ids = Object.keys(groups || {}).sort();
  const drawn = [].concat.apply([], ids.map((g) => groups[g]));
  const current = state.teams.map((t) => t.name);
  const sizeNow = {}; state.teams.forEach((t) => { sizeNow[t.group] = (sizeNow[t.group] || 0) + 1; });
  if (drawn.length !== current.length || current.some((n) => drawn.indexOf(n) < 0)) throw new Error('The draw must contain every team exactly once.');
  if (ids.some((g) => groups[g].length !== sizeNow[g])) throw new Error('Group sizes must stay the same (' + Object.keys(sizeNow).sort().map((g) => g + ': ' + sizeNow[g]).join(', ') + ').');

  // 1. Teams tab: new group letters
  const tsh = klSheet('Teams');
  const thead = klHead(tsh);
  const gcol = thead.indexOf('Group') + 1, ncol = thead.indexOf('TeamName');
  const trows = tsh.getRange(2, 1, tsh.getLastRow() - 1, thead.length).getDisplayValues();
  trows.forEach((r, i) => {
    const g = ids.find((id) => groups[id].indexOf(r[ncol]) >= 0);
    if (g) tsh.getRange(i + 2, gcol).setValue(g);
  });

  // 2. GroupFixtures: same number of rows and kick-off times, new pairings.
  //    Rounds are interleaved across groups so no team plays twice in a row.
  const fsh = klSheet('GroupFixtures');
  const fhead = klHead(fsh);
  const frows = fsh.getRange(2, 1, fsh.getLastRow() - 1, fhead.length).getDisplayValues();
  const times = frows.map((r) => r[fhead.indexOf('Date')]);
  const perGroup = {};
  ids.forEach((g) => { perGroup[g] = klRoundRobin(groups[g]); });
  const order = [];
  const maxRounds = Math.max.apply(null, ids.map((g) => perGroup[g].length));
  for (let r = 0; r < maxRounds; r++) ids.forEach((g) => (perGroup[g][r] || []).forEach((m) => order.push([g, m])));
  const count = {};
  const out = order.map(([g, m], i) => {
    count[g] = (count[g] || 0) + 1;
    return klRowArray(fhead, { MatchID: 'G' + g + count[g], Group: g, TeamHome: m[0], TeamAway: m[1], ScoreHome: '', ScoreAway: '', Date: times[i] || '', Status: '', MOTM: '', MOTMTeam: '' });
  });
  fsh.getRange(2, 1, Math.max(frows.length, 1), fhead.length).clearContent();
  fsh.getRange(2, 1, out.length, fhead.length).setValues(out);
  return { matches: out.length };
}

/** Knockout draw: pairs = [[home, away] x4] for QF1..QF4. */
function klKoDraw(pairs) {
  const sh = klSheet('KnockoutFixtures');
  const head = klHead(sh);
  const rows = klList('KnockoutFixtures').rows.filter((r) => /^QF\d/i.test(String(r.values.Slot).replace(/\s/g, '')))
    .sort((a, b) => String(a.values.Slot).localeCompare(String(b.values.Slot)));
  if (rows.some((r) => r.values.Status || r.values.ScoreHome !== '' || r.values.ScoreAway !== '')) throw new Error('A quarterfinal has already started — the draw can no longer be changed.');
  if (!Array.isArray(pairs) || pairs.length !== rows.length) throw new Error('The draw must fill all ' + rows.length + ' quarterfinals.');
  const all = [].concat.apply([], pairs);
  if (all.some((t) => !t) || new Set(all).size !== all.length) throw new Error('Each team can only appear once in the draw.');
  rows.forEach((r, i) => {
    sh.getRange(r._row, head.indexOf('TeamHome') + 1).setValue(pairs[i][0]);
    sh.getRange(r._row, head.indexOf('TeamAway') + 1).setValue(pairs[i][1]);
  });
  return { quarterfinals: rows.length };
}
