import { runPage, esc, href, pageHero, sectionHead, emptyCard, icon, photoGrid, crest } from '../ui.js';
import { teamKey } from '../model.js';

runPage('history', (model, page) => {
  const seasons = [...model.history].sort((a, b) => String(b.year).localeCompare(String(a.year)));
  const current = model.champion
    ? { season: model.cfg.season || 'This season', champion: model.champion.name }
    : null;
  const oldPhotos = model.photos.filter((p) => p.season);
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>` : '');
  // Link the champion to its team page when it is one of this season's teams.
  const champ = (name) => {
    const t = model.teams.get(teamKey(name));
    return t && t.group ? `<a class="team" href="${href('team.html', { t: t.slug })}">${crest(t, 'lg')}<span class="tname">${esc(t.name)}</span></a>` : esc(name.replace(/\s*\d{4}\s*[-–]\s*\d{2,4}\s*$/, ''));
  };
  page.innerHTML = pageHero('History', 'Every season of the Kyogyera League — champions, award winners and memories.') + `
  <div class="wrap">
    <section class="section">
      <div class="history-list">
        ${current ? `<article class="card pad season-card now"><p class="kicker">${esc(current.season)}</p><h2>🏆 ${esc(current.champion)}</h2>
          <p><a href="${href('awards.html')}">See this season's awards ${icon('arrow', 'ic ic-xs')}</a></p></article>` : ''}
        ${seasons.length ? seasons.map((s) => `
          <article class="card pad season-card">
            <p class="kicker">${esc(s.season)}${s.year ? ' · ' + esc(s.year) : ''}</p>
            <h2>${s.champion ? `🏆 ${champ(s.champion)}` : 'Champions to be added'}</h2>
            <dl class="kv">${row('Runner-up', s.runnerUp)}${row('Golden Boot', s.topScorer)}${row('Man of the Match king', s.motmKing)}</dl>
            ${s.notes ? `<p class="muted">${esc(s.notes)}</p>` : ''}
          </article>`).join('') : emptyCard('Past seasons appear here once they are added to the History tab.')}
      </div>
    </section>
    ${oldPhotos.length ? `<section class="section">${sectionHead('Memories', `${oldPhotos.length} photos from earlier seasons`)}${photoGrid(oldPhotos, 'history', { limit: 8 })}
      <p class="center"><a class="link-more" href="${href('gallery.html')}">Open the gallery ${icon('arrow', 'ic ic-sm')}</a></p></section>` : ''}
  </div>`;
});
