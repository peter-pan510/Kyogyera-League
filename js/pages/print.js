/* Printable schedule & results (A4, white paper). Always reflects the sheet. */
import { start } from '../data.js';
import { fmtDate, kickoff, stageLabel, placeholderFor } from '../ui.js';
import { chronoCmp } from '../model.js';

const CFG = window.KYOGYERA_CONFIG || {};
const SITE = CFG.SITE_URL || new URL('./', location.href).href;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qrSvg = (t) => { const q = window.qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); };

start((model) => draw(model), () => {});

function draw(model) {
  const c = model.cfg;
  const matches = [...model.matches].sort(chronoCmp);
  const name = (m, s) => (m[s] ? m[s].name : placeholderFor(model, m.slot, s));
  const winner = (m, s) => (m.finished && ((m.stage === 'ko' && m.winner === m[s]) || (m.stage === 'group' && (s === 'home' ? m.hs > m.as : m.as > m.hs))));
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
  const group = (g) => `<div class="avoid-break"><h3>Group ${esc(g.id)}</h3><table>
      <thead><tr><th>#</th><th>Team</th><th class="c">P</th><th class="c">W</th><th class="c">D</th><th class="c">L</th><th class="c">GD</th><th class="c">Pts</th></tr></thead>
      <tbody>${g.table.map((r) => `<tr class="${model.anyPlayed ? r.status : ''}"><td>${r.pos}</td><td>${esc(r.team.name)}</td><td class="c">${r.p}</td><td class="c">${r.w}</td><td class="c">${r.d}</td><td class="c">${r.l}</td><td class="c">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="c"><b>${r.pts}</b></td></tr>`).join('')}</tbody>
    </table></div>`;
  const scorers = model.players.filter((p) => p.goals).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 10);
  const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  document.getElementById('paper').innerHTML = `
    <header class="p-head">
      <img src="assets/kyogyera-badge-256.png" alt="">
      <div>
        <h1>${esc(c.leaguename || 'Kyogyera League')}</h1>
        <p><b>${esc((c.season || '').replace(/\s*\(demo data\)/i, ''))}</b>${model.matchDay ? ' · ' + fmtDate(model.matchDay, '', { long: true, noTime: true }) : ''}</p>
        <p>${esc(c.venue || '')}</p>
      </div>
      <div class="qr">${qrSvg(SITE)}</div>
    </header>
    <h2>Match-day schedule${model.anyPlayed ? ' &amp; results' : ''}</h2>
    <table>
      <thead><tr><th>Time</th><th>Stage</th><th>Home</th><th class="c">Score</th><th>Away</th><th class="c"></th><th>Notes</th></tr></thead>
      <tbody>${matches.map(row).join('')}</tbody>
    </table>
    <h2>Group standings</h2>
    <div class="groups">${model.groups.map(group).join('')}</div>
    <p class="legend-p">Gold bar = top 2 (qualify) · Blue bar = best third place (qualifies). Win 3, draw 1. Ties: goal difference, goals scored, head-to-head.</p>
    ${scorers.length ? `<h2>Top scorers</h2><table class="avoid-break"><thead><tr><th>#</th><th>Player</th><th>Team</th><th class="c">Goals</th></tr></thead>
      <tbody>${scorers.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${esc(p.team ? p.team.name : '')}</td><td class="c"><b>${p.goals}</b></td></tr>`).join('')}</tbody></table>` : ''}
    <footer class="p-foot"><span>Live scores: ${esc(SITE.replace(/^https?:\/\//, ''))}</span><span>Printed ${esc(now)}</span></footer>`;
}

document.getElementById('print').onclick = () => window.print();
