import { runPage, esc, pageHero, photoGrid, emptyCard, stageLabel, sectionHead } from '../ui.js';

let model = null;
let filter = 'all';

runPage('gallery', (m, page) => {
  model = m;
  page.innerHTML = pageHero('Gallery', 'Moments from Kitabuguma. Tap a photo to view it full screen and swipe through.') +
    '<div class="wrap section"><div id="g-filters"></div><div id="g-grid"></div></div>';
  draw();
});

const seasonLabel = (s) => s || 'This season';

function draw() {
  const seasons = [...new Set(model.photos.map((p) => p.season))];
  const teams = [...new Set(model.photos.filter((p) => p.team).map((p) => p.team))].sort((a, b) => a.name.localeCompare(b.name));
  const matches = [...new Set(model.photos.filter((p) => p.match).map((p) => p.match))];
  const opts = [
    ['all', 'All photos'],
    ...(seasons.length > 1 ? seasons.map((s) => ['s:' + s, seasonLabel(s)]) : []),
    ...matches.map((m) => ['m:' + m.id, `${stageLabel(m)} · ${m.home ? m.home.name : '?'} v ${m.away ? m.away.name : '?'}`]),
    ...teams.map((t) => ['t:' + t.key, t.name]),
  ];
  if (!opts.some(([v]) => v === filter)) filter = 'all';
  document.getElementById('g-filters').innerHTML = opts.length > 1 ? `
    <label class="select"><span class="sr-only">Show</span><select id="g-filter">
      ${opts.map(([v, l]) => `<option value="${esc(v)}"${v === filter ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select></label>` : '';

  const list = model.photos.filter((p) => filter === 'all'
    || (filter.startsWith('s:') && p.season === filter.slice(2))
    || (filter.startsWith('m:') && p.match && p.match.id === filter.slice(2))
    || (filter.startsWith('t:') && ((p.team && p.team.key === filter.slice(2)) || (p.match && [p.match.home, p.match.away].some((t) => t && t.key === filter.slice(2))))));

  if (!list.length) {
    document.getElementById('g-grid').innerHTML = emptyCard('No photos yet — they will appear here during match day.');
    return;
  }
  // One section per season, newest season first.
  const groups = [...new Set(list.map((p) => p.season))];
  document.getElementById('g-grid').innerHTML = groups.map((s) => {
    const pics = list.filter((p) => p.season === s);
    const head = groups.length > 1 || s ? sectionHead(esc(seasonLabel(s)), `${pics.length} photo${pics.length === 1 ? '' : 's'}`) : '';
    return `<section class="gallery-season">${head}${photoGrid(pics, 'gallery-' + (s || 'now'), { showSeason: false })}</section>`;
  }).join('');
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'g-filter') { filter = e.target.value; draw(); }
});
