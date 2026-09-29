import { runPage, pageHero, standingsTable, segTabs } from '../ui.js';

let mode = 'group';
let model = null;

runPage('table', (m, page) => {
  model = m;
  page.innerHTML = pageHero('The Kyogyera Table', 'All 11 teams ranked together — who is really the best in the league?') +
    '<div class="wrap section" id="t-body"></div>';
  draw();
});

function draw() {
  const rows = mode === 'group' ? model.overallGroup : model.overallAll;
  // Mark qualification colours from the group stage so the table reads like a league-phase table.
  rows.forEach((r) => {
    const q = model.qual.list.find((x) => x.team === r.team);
    r.status = model.anyPlayed && q ? (q.third ? 'q3' : 'q') : '';
  });
  document.getElementById('t-body').innerHTML = `
    <div class="controls">
      ${segTabs([['group', 'Group stage'], ['all', 'All matches']], mode, 'mode')}
    </div>
    <p class="swipe-note">↔ Swipe the table sideways to see form and status</p>
    <article class="card">
      ${standingsTable(rows, { cols: ['grp', 'p', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts', 'ppg', 'form', 'stage'], liveAny: true })}
    </article>
    <ul class="legend">
      <li><span class="key key-q"></span>Qualified via top 2 in group</li>
      <li><span class="key key-q3"></span>Qualified as a best 3rd-placed team</li>
    </ul>
    <div class="card note-card">
      <p><b>How this table works.</b> ${mode === 'group'
        ? 'Counts group-stage matches only, ranked by points, then goal difference, then goals scored.'
        : 'Counts every match played, including knockouts (a knockout draw counts as a draw here, whatever happened on penalties).'}
      Group C has 3 teams, so its teams play one game fewer in the group stage — the <b>PPG</b> (points per game) column gives a fairer comparison.
      Qualification is decided by the group tables, not this one.</p>
    </div>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (b && model) { mode = b.dataset.mode; draw(); }
});
