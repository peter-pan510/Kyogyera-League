import { runPage, esc, href, param, crest, teamColor, stageBadge, formDots, standingsTable, matchesByDay, sectionHead, emptyCard, icon, plural, photoGrid, playerLink, getMyTeam, setMyTeam } from '../ui.js';
import { wdlDonut, barList, compareRow } from '../charts.js';

runPage('teams', (model, page) => {
  const t = model.teamBySlug(param('t') || '');
  if (!t) {
    page.innerHTML = `<div class="wrap section">${emptyCard(`Team not found. <a href="${href('teams.html')}">See all teams</a>`)}</div>`;
    return;
  }
  document.title = t.name + ' · Kyogyera League';
  const s = t.stats;
  const g = model.groups.find((x) => x.id === t.group);
  const squad = model.players.filter((p) => p.team === t);
  const scorers = squad.filter((p) => p.goals).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  const assisters = squad.filter((p) => p.assists).sort((a, b) => b.assists - a.assists);
  const motms = squad.filter((p) => p.motm).sort((a, b) => b.motm - a.motm);
  const played = s.matches.filter((m) => m.played).reverse();
  const upcoming = s.matches.filter((m) => !m.played);

  // Team per-match averages vs the tournament average for each MatchStats column.
  const avgRows = model.statColumns.map((c) => {
    const n = s.statN[c.key];
    if (!n) return '';
    const mine = s.statSums[c.key] / n;
    let tot = 0, cnt = 0;
    model.teamList.forEach((o) => { if (o.stats.statN[c.key]) { tot += o.stats.statSums[c.key]; cnt += o.stats.statN[c.key]; } });
    return compareRow(c.label + (c.unit === '%' ? '' : ' per match'), mine, cnt ? tot / cnt : 0, { unit: c.unit, lowerIsBetter: c.key === 'fouls' || c.key === 'offsides' });
  }).join('');

  const who = (p, v) => ({ html: `<span class="tname">${playerLink(p)}</span>`, value: v });

  page.innerHTML = `
  <section class="team-hero" style="--c:${esc(teamColor(t))}">
    <div class="wrap">
      <a class="back" href="${href('teams.html')}">${icon('back', 'ic ic-sm')} All teams</a>
      <div class="th-main">
        ${crest(t, 'xl')}
        <div>
          <p class="kicker">Group ${esc(t.group)} · Class of ${esc(t.years || '—')}</p>
          <h1>${esc(t.name)}</h1>
          <div class="th-badges">${stageBadge(t.stage)}${t.groupRow ? `<span class="badge">${ordinal(t.groupRow.pos)} in Group ${esc(t.group)}</span>` : ''}</div>
          <button type="button" class="btn-mine${getMyTeam() === t.key ? ' on' : ''}" id="my-team">${getMyTeam() === t.key ? '★ My team' : '☆ Make this my team'}</button>
        </div>
      </div>
    </div>
  </section>

  <div class="wrap">
    <section class="section">
      <div class="glance glance-4">
        ${tile(s.p, 'Played')}${tile(s.w, 'Won')}${tile(s.d, 'Drawn')}${tile(s.l, 'Lost')}
        ${tile(s.gf, 'Goals for')}${tile(s.ga, 'Goals against')}${tile(s.cs, 'Clean sheets')}${tile(s.yellow + s.red ? `${s.yellow}<small>Y</small> ${s.red}<small>R</small>` : '0', 'Cards')}
      </div>
    </section>

    <section class="section two-col">
      <article class="card chart-card">
        <div class="card-head"><h3>Results</h3><span class="muted small">${plural(s.p, 'match', 'matches')}</span></div>
        ${s.p ? wdlDonut(s) : '<p class="muted pad">No matches played yet.</p>'}
        <div class="form-line"><span class="muted small">Form (oldest → latest)</span>${formDots(s.form, 10)}</div>
      </article>
      <article class="card">
        <div class="card-head"><h3>Group ${esc(t.group)}</h3><a class="link-more" href="${href('groups.html')}#group-${esc(t.group)}">Full table ${icon('arrow', 'ic ic-sm')}</a></div>
        ${g ? standingsTable(g.table, { cols: ['p', 'gd', 'pts'], highlight: t, compact: true }) : ''}
      </article>
    </section>

    ${scorers.length || assisters.length || motms.length ? `
    <section class="section">
      ${sectionHead('Players', `<span class="only-mobile">↔ Swipe for more</span>`)}
      <div class="boards hscroll">
        <article class="card board"><div class="card-head"><h3>Goals</h3></div><div class="board-body">${barList(scorers.map((p) => who(p, p.goals)))}</div></article>
        <article class="card board"><div class="card-head"><h3>Assists</h3></div><div class="board-body">${barList(assisters.map((p) => who(p, p.assists)))}</div></article>
        <article class="card board"><div class="card-head"><h3>Man of the Match</h3></div><div class="board-body">${barList(motms.map((p) => who(p, p.motm)))}</div></article>
      </div>
    </section>` : ''}

    ${t.suspendedNext && t.suspendedNext.length ? `<section class="section"><div class="card pad suspended">
      <h3 class="a-h">⛔ Suspended for the next match</h3>
      <ul>${t.suspendedNext.map((x) => `<li>${playerLink(x.player)} <span class="muted small">(red card in ${esc(x.from.id)})</span></li>`).join('')}</ul>
    </div></section>` : ''}

    ${t.squad.length ? `
    <section class="section">
      ${sectionHead('Squad', plural(t.squad.length, 'player'))}
      <article class="card"><div class="tbl-wrap hscroll"><table class="tbl squad">
        <thead><tr><th class="c-pos">No.</th><th class="c-team">Player</th><th>Pos</th><th title="Goals">G</th><th title="Assists">A</th><th title="Man of the Match">MOTM</th><th title="Yellow cards">YC</th><th title="Red cards">RC</th></tr></thead>
        <tbody>${t.squad.map((p) => `<tr><td class="c-pos">${esc(p.number || '–')}</td><th scope="row" class="c-team"><span class="tname">${playerLink(p)}</span></th>
          <td>${esc(p.position || '–')}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.motm}</td><td>${p.yellow}</td><td>${p.red}</td></tr>`).join('')}</tbody>
      </table></div></article>
    </section>` : ''}

    ${(() => {
      const pics = model.photos.filter((ph) => ph.team === t || (ph.match && (ph.match.home === t || ph.match.away === t)));
      return pics.length ? `<section class="section">${sectionHead('Photos')}${photoGrid(pics, 'team')}</section>` : '';
    })()}

    ${avgRows ? `
    <section class="section">
      ${sectionHead('Team stats vs league average', '')}
      <article class="card pad">
        <div class="cmp-legend"><span><i style="background:var(--chart-home)"></i>${esc(t.name)}</span><span><i style="background:var(--chart-away)"></i>League average</span></div>
        ${avgRows}
      </article>
    </section>` : ''}

    ${upcoming.length ? `<section class="section">${sectionHead('Next matches')}${matchesByDay(upcoming, model)}</section>` : ''}
    <section class="section">${sectionHead('Results')}${played.length ? matchesByDay(played, model) : emptyCard('No matches played yet.')}</section>
  </div>`;
  page.querySelector('#my-team').onclick = (ev) => {
    const on = getMyTeam() !== t.key;
    setMyTeam(on ? t.key : '');
    ev.target.classList.toggle('on', on);
    ev.target.textContent = on ? '★ My team' : '☆ Make this my team';
  };
});

function tile(v, label) {
  return `<div class="glance-tile"><b>${v}</b><span>${label}</span></div>`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
