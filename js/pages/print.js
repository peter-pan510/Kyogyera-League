/* Printable sheets (A4, white paper), admins only. Always reflects the sheet.
 * print.html?part=standings | groups | stats | all (default). */
import { start } from '../data.js';
import { fmtDate, kickoff, stageLabel, placeholderFor } from '../ui.js';
import { chronoCmp, TOP_N } from '../model.js';
import { getSession } from '../admin-api.js';

const CFG = window.KYOGYERA_CONFIG || {};
const SITE = CFG.SITE_URL || new URL('./', location.href).href;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qrSvg = (t) => { const q = window.qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); };

const PARTS = [['standings', 'Standings'], ['groups', 'Group performance'], ['stats', 'Stats'], ['all', 'Whole document']];
const TITLES = { standings: 'Standings', groups: 'Group performance', stats: 'Statistics', all: 'Schedule, results & stats' };
const paper = document.getElementById('paper');
const bar = document.getElementById('parts');
let part = new URLSearchParams(location.search).get('part');
if (!PARTS.some(([p]) => p === part)) part = 'all';
let model = null;

const session = getSession();
if (!session || session.role !== 'admin') {
  document.getElementById('print').hidden = true;
  paper.innerHTML = `<div class="locked"><h2>Admins only</h2>
    <p>Printing is for league admins. Sign in on the Admin page with an admin code, then open <b>Print &amp; poster</b>.</p>
    <p><a href="admin.html">Go to Admin sign-in →</a></p></div>`;
} else {
  bar.hidden = false;
  start((m) => { model = m; draw(); }, () => {});
  document.getElementById('print').onclick = () => window.print();
}

function drawBar() {
  bar.innerHTML = PARTS.map(([p, label]) => `<button type="button" data-part="${p}" class="${p === part ? 'on' : ''}">${label}</button>`).join('');
  bar.querySelectorAll('[data-part]').forEach((b) => {
    b.onclick = () => {
      part = b.dataset.part;
      history.replaceState(null, '', '?part=' + part);
      draw();
    };
  });
}

function draw() {
  drawBar();
  if (!model) return;
  const c = model.cfg;
  const sections = {
    standings: () => groupGrid() + overall(),
    groups: () => groupPerformance(),
    stats: () => stats(),
    all: () => schedule() + groupGrid() + overall() + groupPerformance() + stats(),
  };
  const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  document.title = `${TITLES[part]} · Kyogyera League`;
  paper.innerHTML = `
    <header class="p-head">
      <img src="assets/kyogyera-badge-256.png" alt="">
      <div>
        <h1>${esc(c.leaguename || 'Kyogyera League')}</h1>
        <p><b>${esc((c.season || '').replace(/\s*\(demo data\)/i, ''))}</b>${model.matchDay ? ' · ' + fmtDate(model.matchDay, '', { long: true, noTime: true }) : ''}</p>
        <p>${esc(c.venue || '')}</p>
        <p class="p-kind">${esc(TITLES[part])}</p>
      </div>
      <div class="qr">${qrSvg(SITE)}</div>
    </header>
    ${sections[part]()}
    <footer class="p-foot"><span>Live scores: ${esc(SITE.replace(/^https?:\/\//, ''))}</span><span>Printed ${esc(now)}</span></footer>`;
}

/* ---------------------------------------------------------------- pieces */

const name = (m, s) => (m[s] ? m[s].name : placeholderFor(model, m.slot, s));
const winner = (m, s) => (m.finished && ((m.stage === 'ko' && m.winner === m[s]) || (m.stage === 'group' && (s === 'home' ? m.hs > m.as : m.as > m.hs))));
const signed = (n) => (n > 0 ? '+' : '') + n;
const legend = () => `<p class="legend-p">Gold bar = top ${TOP_N} (qualify)${model.qual.bestThirds ? ' · Blue bar = best third place (qualifies)' : ''}. Win 3, draw 1. Ties: goal difference, goals scored, head-to-head.</p>`;

function schedule() {
  const matches = [...model.matches].sort(chronoCmp);
  const status = (m) => (m.live ? `<span class="live">${m.status === 'HT' ? 'HT' : 'LIVE'}</span>` : m.finished ? 'FT' : '');
  const row = (m) => `<tr>
      <td>${esc(kickoff(m) || m.dateRaw)}</td>
      <td class="stage">${esc(stageLabel(m))}</td>
      <td class="${winner(m, 'home') ? 'win' : ''}">${esc(name(m, 'home'))}</td>
      <td class="score">${m.played ? `${m.hs} – ${m.as}` : 'v'}</td>
      <td class="${winner(m, 'away') ? 'win' : ''}">${esc(name(m, 'away'))}</td>
      <td class="c">${status(m)}</td>
      <td class="stage">${m.note && m.finished ? esc(m.note) : m.motm ? '★ ' + esc(m.motm.name) : ''}</td>
    </tr>`;
  return `<h2>Match-day schedule${model.anyPlayed ? ' &amp; results' : ''}</h2>
    <table class="sched">
      <thead><tr><th>Time</th><th>Stage</th><th>Home</th><th class="c">Score</th><th>Away</th><th class="c"></th><th>Notes</th></tr></thead>
      <tbody>${matches.map(row).join('')}</tbody>
    </table>`;
}

// Compact tables, two per row — Group C, D, E… wrap underneath, never off the page.
function groupGrid() {
  const group = (g) => `<div class="avoid-break"><h3>Group ${esc(g.id)}</h3><table class="gt">
      <thead><tr><th>#</th><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">GD</th><th class="c">Pts</th></tr></thead>
      <tbody>${g.table.map((r) => `<tr class="${model.anyPlayed ? r.status : ''}"><td>${r.pos}</td><td>${esc(r.team.name)}</td><td class="c">${r.p}</td><td class="c">${r.w}</td><td class="c">${r.d}</td><td class="c">${r.l}</td><td class="c">${signed(r.gd)}</td><td class="c"><b>${r.pts}</b></td></tr>`).join('')}</tbody>
    </table></div>`;
  return `<h2>Group standings</h2><div class="groups">${model.groups.map(group).join('')}</div>${legend()}`;
}

function overall() {
  const qualified = new Set(model.qual.list.map((x) => x.team));
  const rows = model.overallGroup;
  return `<div class="avoid-break"><h2>League table — all ${rows.length} teams</h2>
    <table>
      <thead><tr><th>#</th><th>Team</th><th class="c">Grp</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">GF</th><th class="c">GA</th><th class="c">GD</th><th class="c">Pts</th><th class="c">PPG</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${model.anyPlayed && qualified.has(r.team) ? 'q' : ''}"><td>${i + 1}</td><td>${esc(r.team.name)}</td><td class="c">${esc(r.team.group)}</td><td class="c">${r.p}</td><td class="c">${r.w}</td><td class="c">${r.d}</td><td class="c">${r.l}</td><td class="c">${r.gf}</td><td class="c">${r.ga}</td><td class="c">${signed(r.gd)}</td><td class="c"><b>${r.pts}</b></td><td class="c">${r.p ? (r.pts / r.p).toFixed(2) : '–'}</td></tr>`).join('')}</tbody>
    </table>
    <p class="legend-p">Group-stage matches only. Gold bar = qualified for the knockouts. PPG = points per game (fairer when groups have different sizes).</p></div>`;
}

function groupPerformance() {
  const block = (g) => {
    const ms = [...g.matches].sort(chronoCmp);
    const top = g.table[0];
    const goals = ms.filter((m) => m.played).reduce((n, m) => n + m.hs + m.as, 0);
    const played = ms.filter((m) => m.played).length;
    return `<section class="g-perf avoid-break">
      <h3>Group ${esc(g.id)} <span>${g.teams.length} teams · ${played}/${ms.length} played · ${goals} goal${goals === 1 ? '' : 's'}${g.complete ? ' · complete' : ''}</span></h3>
      <table>
        <thead><tr><th>#</th><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">GF</th><th class="c">GA</th><th class="c">GD</th><th class="c">Pts</th><th class="c">Form</th></tr></thead>
        <tbody>${g.table.map((r) => `<tr class="${model.anyPlayed ? r.status : ''}"><td>${r.pos}</td><td>${esc(r.team.name)}</td><td class="c">${r.p}</td><td class="c">${r.w}</td><td class="c">${r.d}</td><td class="c">${r.l}</td><td class="c">${r.gf}</td><td class="c">${r.ga}</td><td class="c">${signed(r.gd)}</td><td class="c"><b>${r.pts}</b></td><td class="c form">${form(r.team, g.matches)}</td></tr>`).join('')}</tbody>
      </table>
      <ul class="g-results">${ms.map((m) => `<li><span class="${winner(m, 'home') ? 'win' : ''}">${esc(name(m, 'home'))}</span><b>${m.played ? `${m.hs} – ${m.as}` : esc(kickoff(m) || 'v')}</b><span class="${winner(m, 'away') ? 'win' : ''}">${esc(name(m, 'away'))}</span></li>`).join('')}</ul>
      ${model.anyPlayed && top && top.p ? `<p class="legend-p">${g.complete ? 'Winner' : 'Leading'}: <b>${esc(top.team.name)}</b> (${top.pts} pts).</p>` : ''}
    </section>`;
  };
  return `<h2>Group performance</h2>${model.groups.map(block).join('')}${legend()}`;
}

function form(team, matches) {
  return matches.filter((m) => m.played && (m.home === team || m.away === team)).sort(chronoCmp)
    .map((m) => { const gf = m.home === team ? m.hs : m.as, ga = m.home === team ? m.as : m.hs; return gf > ga ? 'W' : gf < ga ? 'L' : 'D'; }).join(' ') || '–';
}

function stats() {
  const t = model.tournament;
  const board = (title, list, value, label) => {
    const rows = list.filter((p) => value(p) > 0).sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name)).slice(0, 10);
    return `<div class="avoid-break"><h3>${title}</h3>${rows.length ? `<table class="gt"><thead><tr><th>#</th><th>Player</th><th>Team</th><th class="c">${label}</th></tr></thead>
      <tbody>${rows.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${esc(p.team ? p.team.name : '')}</td><td class="c"><b>${value(p)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="legend-p">None yet.</p>'}</div>`;
  };
  const teams = [...model.teamList].sort((a, b) => b.stats.gf - a.stats.gf || a.stats.ga - b.stats.ga || a.name.localeCompare(b.name));
  return `<h2>Statistics</h2>
    <div class="glance-p">
      <div><b>${t.played}<small>/${t.total}</small></b>Matches played</div>
      <div><b>${t.goals}</b>Goals</div>
      <div><b>${t.perMatch.toFixed(2)}</b>Goals per match</div>
      <div><b>${t.cleanSheets}</b>Clean sheets</div>
      <div><b>${t.yellow} / ${t.red}</b>Yellow / red cards</div>
    </div>
    ${t.biggest || t.highest ? `<p class="legend-p">${t.biggest ? `Biggest win: <b>${esc(name(t.biggest, 'home'))} ${t.biggest.hs} – ${t.biggest.as} ${esc(name(t.biggest, 'away'))}</b>` : ''}${t.biggest && t.highest ? ' · ' : ''}${t.highest ? `Most goals: <b>${esc(name(t.highest, 'home'))} ${t.highest.hs} – ${t.highest.as} ${esc(name(t.highest, 'away'))}</b>` : ''}</p>` : ''}
    <div class="groups">
      ${board('Top scorers', model.players, (p) => p.goals, 'G')}
      ${board('Assists', model.players, (p) => p.assists, 'A')}
      ${board('Man of the Match', model.players, (p) => p.motm, '★')}
      ${board('Discipline', model.players, (p) => p.yellow + p.red * 3, 'Pts')}
    </div>
    <p class="legend-p">Discipline: yellow card = 1 point, red = 3.</p>
    <div class="avoid-break"><h3 class="h3-gap">Team stats (all matches)</h3>
    <table>
      <thead><tr><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">GF</th><th class="c">GA</th><th class="c">GD</th><th class="c">CS</th><th class="c">YC</th><th class="c">RC</th></tr></thead>
      <tbody>${teams.map((tm) => { const s = tm.stats; return `<tr><td>${esc(tm.name)}</td><td class="c">${s.p}</td><td class="c">${s.w}</td><td class="c">${s.d}</td><td class="c">${s.l}</td><td class="c">${s.gf}</td><td class="c">${s.ga}</td><td class="c">${signed(s.gd)}</td><td class="c">${s.cs}</td><td class="c">${s.yellow}</td><td class="c">${s.red}</td></tr>`; }).join('')}</tbody>
    </table>
    <p class="legend-p">CS = clean sheets · YC / RC = yellow / red cards.</p></div>`;
}
