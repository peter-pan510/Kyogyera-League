import { runPage, esc, pageHero, photoGrid, emptyCard, stageLabel } from '../ui.js';

let model = null;
let filter = 'all';

runPage('gallery', (m, page) => {
  model = m;
  page.innerHTML = pageHero('Gallery', 'Moments from match day at Kitabuguma. Tap a photo to view it full screen and swipe through.') +
    '<div class="wrap section"><div id="g-filters"></div><div id="g-grid"></div></div>';
  draw();
});

function draw() {
  const teams = [...new Set(model.photos.filter((p) => p.team).map((p) => p.team))];
  const matches = [...new Set(model.photos.filter((p) => p.match).map((p) => p.match))];
  const opts = [['all', 'All photos'], ...matches.map((m) => ['m:' + m.id, `${stageLabel(m)} · ${m.home ? m.home.name : '?'} v ${m.away ? m.away.name : '?'}`]), ...teams.map((t) => ['t:' + t.key, t.name])];
  if (!opts.some(([v]) => v === filter)) filter = 'all';
  document.getElementById('g-filters').innerHTML = opts.length > 1 ? `
    <label class="select"><span class="sr-only">Show</span><select id="g-filter">
      ${opts.map(([v, l]) => `<option value="${esc(v)}"${v === filter ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select></label>` : '';
  const list = model.photos.filter((p) => filter === 'all'
    || (filter.startsWith('m:') && p.match && p.match.id === filter.slice(2))
    || (filter.startsWith('t:') && ((p.team && p.team.key === filter.slice(2)) || (p.match && [p.match.home, p.match.away].some((t) => t && t.key === filter.slice(2))))));
  document.getElementById('g-grid').innerHTML = list.length
    ? photoGrid(list, 'gallery')
    : emptyCard('No photos yet — they will appear here during match day.');
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'g-filter') { filter = e.target.value; draw(); }
});
