import { runPage, esc, href, param, crest, teamColor, sectionHead, emptyCard, icon, plural, stageLabel } from '../ui.js';

runPage('player', (model, page) => {
  const p = model.playerBySlug(param('p') || '');
  if (!p) {
    page.innerHTML = `<div class="wrap section">${emptyCard(`Player not found. <a href="${href('stats.html')}">See all players</a>`)}</div>`;
    return;
  }
  document.title = p.name + ' · Kyogyera League';
  const t = p.team;
  const LABEL = { goal: 'Goal', og: 'Own goal', assist: 'Assist', yellow: 'Yellow card', red: 'Red card', motm: 'Man of the Match' };
  const ICON = { goal: icon('ball', 'ic ic-sm'), og: icon('ball', 'ic ic-sm'), assist: icon('arrow', 'ic ic-sm'), motm: icon('star', 'ic ic-sm'), yellow: '<span class="card-ic yellow"></span>', red: '<span class="card-ic red"></span>' };
  const events = [...p.events].sort((a, b) => a.match.order - b.match.order || (a.minute ? a.minute.sort : 0) - (b.minute ? b.minute.sort : 0));
  const tile = (v, l) => `<div class="glance-tile"><b>${v}</b><span>${l}</span></div>`;
  const suspended = t && t.suspendedNext && t.suspendedNext.some((x) => x.player === p);

  page.innerHTML = `
  <section class="team-hero" style="--c:${esc(t ? teamColor(t) : '#34427a')}">
    <div class="wrap">
      <a class="back" href="${t ? href('team.html', { t: t.slug }) : href('stats.html')}">${icon('back', 'ic ic-sm')} ${t ? esc(t.name) : 'Stats'}</a>
      <div class="th-main">
        ${p.photo ? `<img class="player-photo" src="${esc(p.photo)}" alt="" onerror="this.remove()">` : `<span class="player-num">${esc(p.number || '')}</span>`}
        <div>
          <p class="kicker">${t ? esc(t.name) : ''}${p.position ? ' · ' + esc({ GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' }[p.position] || p.position) : ''}${p.number ? ' · #' + esc(p.number) : ''}</p>
          <h1>${esc(p.name)}</h1>
          ${suspended ? '<span class="badge badge-out">⛔ Suspended next match</span>' : ''}
        </div>
      </div>
    </div>
  </section>
  <div class="wrap">
    <section class="section"><div class="glance">
      ${tile(p.goals, 'Goals')}${tile(p.assists, 'Assists')}${tile(p.motm, 'Man of the Match')}${tile(p.pens, 'Penalties')}${tile(p.yellow, 'Yellow cards')}${tile(p.red, 'Red cards')}
    </div></section>
    <section class="section">
      ${sectionHead('Match by match')}
      ${events.length ? `<ul class="p-events">${events.map((e) => `
        <li><a href="${href('match.html', { id: e.match.id })}">
          <span class="pe-ic">${ICON[e.kind]}</span>
          <span class="pe-t"><b>${LABEL[e.kind]}${e.minute ? ' · ' + e.minute.label : ''}${e.type === 'PEN' ? ' (pen)' : ''}</b>
          <small>${esc(stageLabel(e.match))} · ${esc(e.match.home ? e.match.home.name : '')} ${e.match.played ? e.match.hs + '–' + e.match.as : 'v'} ${esc(e.match.away ? e.match.away.name : '')}</small></span>
        </a></li>`).join('')}</ul>` : emptyCard('No goals, assists, cards or awards yet.')}
    </section>
  </div>`;
});
