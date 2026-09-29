import { runPage, esc, href, pageHero, crest, stageBadge, formDots } from '../ui.js';
import { donut, C } from '../charts.js';

runPage('teams', (model, page) => {
  page.innerHTML = pageHero('Teams', 'Eleven OB/OG sides, each from a different set of school years. Tap a team to see its full profile.') +
    `<div class="wrap">${model.groups.map((g) => `
      <section class="section">
        <div class="section-head"><div><h2>Group ${esc(g.id)}</h2></div></div>
        <div class="team-grid">${g.table.map((r) => card(r.team, r)).join('')}</div>
      </section>`).join('')}</div>`;
});

function card(t, row) {
  const s = t.stats;
  const segs = [
    { label: 'Won', value: s.w, color: C.win },
    { label: 'Drawn', value: s.d, color: C.draw },
    { label: 'Lost', value: s.l, color: C.loss },
  ];
  return `<a class="team-card" href="${href('team.html', { t: t.slug })}">
    <div class="tc-top">
      ${crest(t, 'lg')}
      <div class="tc-name"><b>${esc(t.name)}</b><span>${esc(t.years)}</span></div>
      ${stageBadge(t.stage)}
    </div>
    <div class="tc-body">
      ${donut(segs, { size: 84, thickness: 11, big: s.p ? s.winPct + '%' : '–', small: 'wins' })}
      <dl class="tc-stats">
        <div><dt>Group pos</dt><dd>${row.pos}</dd></div>
        <div><dt>Played</dt><dd>${s.p}</dd></div>
        <div><dt>W-D-L</dt><dd>${s.w}-${s.d}-${s.l}</dd></div>
        <div><dt>Goals</dt><dd>${s.gf}:${s.ga}</dd></div>
      </dl>
    </div>
    <div class="tc-form"><span class="muted small">Form</span>${formDots(s.form, 5, false)}</div>
  </a>`;
}
