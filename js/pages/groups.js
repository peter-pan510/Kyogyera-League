import { runPage, esc, pageHero, standingsTable, legendQual, matchCard, teamLink, sectionHead } from '../ui.js';
import { TOP_N, BEST_THIRDS, chronoCmp } from '../model.js';

runPage('groups', (model, page) => {
  const groupsHtml = model.groups.map((g) => {
    const status = g.liveCount ? '<span class="badge badge-livenow"><i class="live-dot"></i>Live table</span>'
      : g.complete ? '<span class="badge badge-done">Complete</span>'
      : g.playedCount ? `<span class="badge badge-live">${g.playedCount}/${g.matches.length} played</span>`
        : '<span class="badge">Not started</span>';
    const q = g.table.slice(0, TOP_N);
    const third = g.table[TOP_N];
    const foot = model.anyPlayed ? `<p class="group-foot">
        <strong>${g.complete ? 'Qualified' : 'Currently qualifying'}:</strong> ${q.map((r) => esc(r.team.name)).join(' &amp; ')}
        ${third ? `<br><span class="muted">3rd: ${esc(third.team.name)} — ${third.status === 'q3' ? 'in a best-3rd spot' : 'outside the best-3rd spots'}${model.qual.allComplete ? '' : ' (provisional)'}</span>` : ''}
      </p>` : '';
    const matches = [...g.matches].sort(chronoCmp);
    return `<article class="card group-block" id="group-${esc(g.id)}">
      <div class="card-head"><h3>Group ${esc(g.id)}</h3>${status}</div>
      ${standingsTable(g.table)}
      ${foot}
      <details class="group-matches">
        <summary>Group ${esc(g.id)} matches (${g.playedCount}/${g.matches.length} played)</summary>
        <div class="carousel hscroll">${matches.map((m) => matchCard(m, model, { showStage: false })).join('')}</div>
      </details>
    </article>`;
  }).join('');

  const thirds = model.qual.thirds.map((t, i) => {
    const r = t.row;
    return `<tr class="st-${model.anyPlayed ? r.status : 'none'}"><td class="c-pos">${i + 1}</td>
      <th scope="row" class="c-team">${teamLink(r.team)}</th><td>${esc(t.group)}</td><td>${r.p}</td>
      <td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td>${r.gf}</td><td class="pts">${r.pts}</td></tr>`;
  }).join('');

  page.innerHTML = pageHero('Group Standings', 'Win 3 · Draw 1 · Loss 0. Ranked by points, then goal difference, goals scored, then head-to-head.') + `
  <div class="wrap">
    <p class="swipe-note">↔ Swipe a table sideways to see every column</p>
    <div class="group-stack">${groupsHtml}</div>
    ${legendQual()}

    <section class="section">
      ${sectionHead('Race for the best 3rd place', `The ${BEST_THIRDS} best third-placed teams also qualify — compared on points, then goal difference, then goals scored.`)}
      <article class="card">
        <div class="tbl-wrap hscroll"><table class="tbl">
          <thead><tr><th class="c-pos">#</th><th class="c-team">Team</th><th>Grp</th><th>P</th><th>GD</th><th>GF</th><th class="pts">Pts</th></tr></thead>
          <tbody>${thirds}</tbody></table></div>
        <p class="group-foot muted">Group C has 3 teams, so its teams play one game fewer than Groups A and B.</p>
      </article>
    </section>
  </div>`;

  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el && !page.dataset.scrolled) { page.dataset.scrolled = '1'; setTimeout(() => el.scrollIntoView(), 0); }
  }
});
