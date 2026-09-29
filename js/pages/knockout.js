import { runPage, esc, href, pageHero, sectionHead, crest, fmtDate, kickoff, statePill, placeholderFor, matchCard, emptyCard, icon, $ } from '../ui.js';
import { ROUND_ORDER, chronoCmp } from '../model.js';

let model = null;

runPage('knockout', (m, page) => {
  model = m;
  page.innerHTML = pageHero('Knockout Stage', 'Eight teams. One match each round. Win or go home.') + `
  <div class="wrap">
    <section class="section">${qualified()}</section>
    <section class="section">
      ${sectionHead('The bracket', '<span class="only-mobile">↔ Swipe sideways to follow the road to the final</span>')}
      <div class="bracket-scroll hscroll"><div class="bracket" id="bracket">${bracket()}</div></div>
    </section>
    <section class="section">
      ${sectionHead('Knockout matches')}
      ${koList()}
    </section>
  </div>`;
  drawLines();
});

function qualified() {
  const head = sectionHead('Qualified teams', 'Top 2 in each group + the 2 best third-placed teams.');
  if (!model.anyPlayed) return head + emptyCard('The qualification picture appears here once the first group results are in.');
  const status = model.qual.allComplete
    ? '<span class="badge badge-done">Group stage complete — final list</span>'
    : '<span class="badge badge-live">Live — provisional until every group game is played</span>';
  return head + `<div class="q-status">${status}</div><div class="q-grid">${model.qual.list.map((q) => `
    <a class="q-chip${q.confirmed ? ' confirmed' : ''}${q.third ? ' third' : ''}" href="${href('team.html', { t: q.team.slug })}">
      <span class="q-label">${esc(q.label)}</span>
      <span class="q-team">${crest(q.team)}<span class="tn"><span class="tname">${esc(q.team.name)}</span><span class="tyears">${esc(q.team.years)}</span></span></span>
      <span class="q-desc">${esc(q.desc)} · ${q.row.pts} pts</span>
      <span class="q-state">${q.confirmed ? '✓ Confirmed' : 'Provisional'}</span>
    </a>`).join('')}</div>`;
}

function bracketMatch(slot) {
  const k = model.bySlot[slot] || { slot, home: null, away: null, played: false };
  const line = (side) => {
    const team = k[side];
    const score = side === 'home' ? k.hs : k.as;
    const won = k.winner && k.winner === team, lost = k.winner && team && k.winner !== team;
    return `<div class="b-team${won ? ' won' : ''}${lost ? ' lost' : ''}">
      ${team ? crest(team) : '<span class="crest crest-sm crest-empty"></span>'}
      <span class="b-name">${team ? esc(team.name) : `<span class="tbd">${esc(placeholderFor(model, slot, side))}</span>`}</span>
      <span class="b-score">${k.played ? score : ''}</span></div>`;
  };
  const pens = k.played && k.hs === k.as && k.note ? `<div class="b-note">${esc(k.note)}</div>` : '';
  const tag = k.id ? 'a' : 'div';
  return `<${tag} class="b-match${k.played ? ' played' : ''}" data-slot="${slot}"${k.id ? ` href="${href('match.html', { id: k.id })}"` : ''}>
    <div class="b-meta"><span>${slot === 'FINAL' ? 'Final' : slot}</span><span>${k.live ? statePill(k) : model.oneDay ? esc(kickoff(k)) : k.date ? fmtDate(k.date, '', { noTime: true }) : esc(k.dateRaw || '')}</span></div>
    ${line('home')}${line('away')}${pens}</${tag}>`;
}

function bracket() {
  const champ = model.champion;
  const cols = [['Quarterfinals', ['QF1', 'QF2', 'QF3', 'QF4']], ['Semifinals', ['SF1', 'SF2']], ['Final', ['FINAL']]];
  return cols.map((c) => `<div class="b-head">${c[0]}</div>`).join('') + '<div class="b-head">Champion</div>' +
    cols.map((c) => `<div class="b-col">${c[1].map(bracketMatch).join('')}</div>`).join('') +
    `<div class="b-col"><div class="b-champ${champ ? ' crowned' : ''}" data-slot="CHAMP">
      ${icon('trophy', 'ic trophy')}
      <span class="champ-name">${champ ? esc(champ.name) : 'To be decided'}</span>
      ${champ && champ.years ? `<span class="tyears">${esc(champ.years)}</span>` : ''}
    </div></div>
    <svg class="b-lines" aria-hidden="true"></svg>`;
}

function drawLines() {
  const inner = $('#bracket');
  const svg = inner && inner.querySelector('.b-lines');
  if (!svg || !model) return;
  const box = inner.getBoundingClientRect();
  svg.setAttribute('width', inner.scrollWidth);
  svg.setAttribute('height', inner.scrollHeight);
  const links = [['QF1', 'SF1'], ['QF2', 'SF1'], ['QF3', 'SF2'], ['QF4', 'SF2'], ['SF1', 'FINAL'], ['SF2', 'FINAL'], ['FINAL', 'CHAMP']];
  svg.innerHTML = links.map(([from, to]) => {
    const a = inner.querySelector(`[data-slot="${from}"]`), b = inner.querySelector(`[data-slot="${to}"]`);
    if (!a || !b) return '';
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.right - box.left, y1 = ra.top + ra.height / 2 - box.top;
    const x2 = rb.left - box.left, y2 = rb.top + rb.height / 2 - box.top;
    const mx = (x1 + x2) / 2;
    const won = model.bySlot[from] && model.bySlot[from].winner ? ' won' : '';
    return `<path class="b-link${won}" d="M${x1} ${y1} H${mx} V${y2} H${x2}"/>`;
  }).join('');
}

function koList() {
  const list = model.koMatches.filter((k) => k.home || k.away || k.played)
    .sort((a, b) => (ROUND_ORDER[b.round] || 0) - (ROUND_ORDER[a.round] || 0) || chronoCmp(b, a));
  if (!list.length) return emptyCard('Knockout fixtures appear here once the teams are confirmed.');
  return `<div class="mcard-grid">${list.map((k) => matchCard(k, model)).join('')}</div>`;
}

let raf = 0;
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawLines); };
window.addEventListener('resize', schedule);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
