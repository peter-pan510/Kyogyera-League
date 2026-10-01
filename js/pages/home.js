import { runPage, esc, href, icon, PAGES, matchCard, teamLink, crest, plural, fmtDate, kickoff, photoGrid, sponsorLogos, getMyTeam, setMyTeam, alertsOn, setAlerts, playerLink } from '../ui.js';
import { chronoCmp } from '../model.js';

const DEFAULT_ABOUT = 'The Kyogyera League brings old boys and old girls back home for the biggest reunion on the calendar. After a brilliant first season in 2026, Season 2 is here: eleven OB/OG teams, each built from a different set of school years, battle it out at Kitabuguma Playground for bragging rights and the Kyogyera trophy.';

runPage('home', (model, page) => {
  const cfg = model.cfg;
  const t = model.tournament;
  const name = cfg.leaguename || 'Kyogyera League';
  const played = model.matches.filter((m) => m.finished).sort((a, b) => chronoCmp(b, a));
  const upcoming = model.matches.filter((m) => !m.played && (m.home || m.away)).sort(chronoCmp);
  const topScorer = [...model.players].filter((p) => p.goals).sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
  const topMotm = [...model.players].filter((p) => p.motm).sort((a, b) => b.motm - a.motm || b.goals - a.goals)[0];
  const leader = model.anyPlayed ? model.overallGroup[0] : null;

  const phase = model.champion ? 'Season complete'
    : model.liveMatches.length ? 'Live now'
    : model.koMatches.some((m) => m.played) ? 'Knockout stage'
      : model.anyPlayed ? 'Group stage in progress' : 'Kick-off coming soon';

  page.innerHTML = `
  <section class="hero">
    <div class="hero-stars" aria-hidden="true"></div>
    <div class="wrap hero-inner">
      <img class="hero-badge" src="assets/kyogyera-badge-400.webp" alt="${esc(name)} badge" width="400" height="400" fetchpriority="high">
      <p class="eyebrow">OBs &amp; OGs Football Tournament${cfg.season ? ' · ' + esc(cfg.season) : ''}</p>
      <h1>${esc(name)}</h1>
      <p class="venue">${icon('pin', 'ic ic-sm')}${esc(cfg.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema')}</p>
      <div class="hero-meta">
        ${model.matchDay ? `<span class="chip chip-gold">${icon('matches', 'ic ic-xs')} ${fmtDate(model.matchDay, '', { long: true, noTime: true })}</span>` : ''}
        <span class="chip${model.liveMatches.length ? ' chip-live' : ''}">${model.liveMatches.length ? '<i class="live-dot"></i>' : ''}${esc(phase)}</span>
        ${cfg.lastupdated ? `<span class="chip">Update: ${esc(cfg.lastupdated)}</span>` : ''}
      </div>
      ${!model.champion && model.defending ? `<a class="defending" href="${href('team.html', { t: model.defending.slug })}">🏆 Defending champions: <b>${esc(model.defending.name)}</b></a>` : ''}
      ${model.champion ? `<a class="champ-banner" href="${href('team.html', { t: model.champion.slug })}">${icon('trophy', 'ic')}<span><small>Champions</small><b>${esc(model.champion.name)}</b></span></a>` : ''}
    </div>
  </section>

  <div class="wrap">
    ${matchDayPanel(model)}
    ${myTeamCard(model)}
    <section class="section">
      <div class="about card">
        <div>
          <h2 class="h-gold">Welcome to the league</h2>
          <p>${esc(cfg.about || DEFAULT_ABOUT)}</p>
        </div>
        <ol class="steps">
          <li><b>Group stage</b><span>3 groups · every team plays each team in its group once. Win 3, draw 1.</span></li>
          <li><b>8 qualify</b><span>Top 2 in each group + the 2 best third-placed teams.</span></li>
          <li><b>Knockouts</b><span>Quarterfinals → Semifinals → Final. One match, winner goes through.</span></li>
          <li><b>All in one day</b><span>Every match — from the first group game to the final — is played on match day.</span></li>
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="glance">
        ${tile(model.teamList.length, 'Teams')}
        ${tile(model.groups.length, 'Groups')}
        ${tile(`${t.played}<small>/${t.total}</small>`, 'Matches played')}
        ${tile(t.goals, 'Goals scored')}
        ${tile(t.played ? t.perMatch.toFixed(1) : '–', 'Goals per match')}
        ${tile(t.cleanSheets, 'Clean sheets')}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Explore</h2><p class="section-sub">Tap a card to open that page.</p></div></div>
      <div class="explore">
        ${PAGES.filter((p) => p.id !== 'home').map((p) => `
          <a class="explore-card" href="${href(p.href)}">
            <span class="ex-ic">${icon(p.icon)}</span>
            <span class="ex-body"><b>${p.label === 'Table' ? 'Kyogyera Table' : p.label}</b><small>${p.desc}</small></span>
            <span class="ex-go">Tap to view ${icon('arrow', 'ic ic-sm')}</span>
          </a>`).join('')}
      </div>
    </section>

    ${played.length ? `
    <section class="section">
      <div class="section-head"><div><h2>Latest results</h2><p class="section-sub">Swipe for more · tap a match for goals and stats</p></div>
        <a class="link-more" href="${href('matches.html')}">All matches ${icon('arrow', 'ic ic-sm')}</a></div>
      <div class="carousel hscroll">${played.slice(0, 8).map((m) => matchCard(m, model)).join('')}</div>
    </section>` : ''}

    ${upcoming.length ? `
    <section class="section">
      <div class="section-head"><div><h2>Coming up</h2></div>
        <a class="link-more" href="${href('matches.html', { view: 'fixtures' })}">Full fixture list ${icon('arrow', 'ic ic-sm')}</a></div>
      <div class="carousel hscroll">${upcoming.slice(0, 8).map((m) => matchCard(m, model)).join('')}</div>
    </section>` : ''}

    <section class="section">
      <div class="section-head"><div><h2>Leaders</h2></div></div>
      <div class="leaders">
        ${leaderCard('table', 'Top of the Kyogyera Table', leader ? teamLink(leader.team, { link: false }) : null, leader ? `${leader.pts} pts · GD ${leader.gd > 0 ? '+' : ''}${leader.gd}` : '', 'table.html')}
        ${leaderCard('ball', 'Golden Boot race', topScorer ? playerLine(topScorer) : null, topScorer ? plural(topScorer.goals, 'goal') : '', 'stats.html')}
        ${leaderCard('star', 'Most Man of the Match awards', topMotm ? playerLine(topMotm) : null, topMotm ? plural(topMotm.motm, 'award') : '', 'stats.html')}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Group leaders</h2></div><a class="link-more" href="${href('groups.html')}">All groups ${icon('arrow', 'ic ic-sm')}</a></div>
      <div class="mini-groups">
        ${model.groups.map((g) => `
          <a class="card mini-group" href="${href('groups.html')}#group-${esc(g.id)}">
            <div class="card-head"><h3>Group ${esc(g.id)}</h3><span class="muted small">${g.playedCount}/${g.matches.length} played</span></div>
            <ol>${g.table.map((r) => `<li class="st-${r.status || 'none'}"><span class="mg-pos">${r.pos}</span>${crest(r.team)}<span class="mg-name">${esc(r.team.name)}</span><span class="mg-pts">${r.pts}</span></li>`).join('')}</ol>
          </a>`).join('')}
      </div>
    </section>

    ${model.photos.length ? `<section class="section">
      <div class="section-head"><div><h2>${model.photos.some((p) => !p.season) ? 'Latest photos' : 'From the gallery'}</h2>${model.photos[0] && model.photos[0].season ? `<p class="section-sub">${esc(model.photos[0].season)}</p>` : ''}</div><a class="link-more" href="${href('gallery.html')}">Gallery ${icon('arrow', 'ic ic-sm')}</a></div>
      ${photoGrid(model.photos, 'home', { limit: 6 })}
    </section>` : ''}

    ${model.sponsors.length ? `<section class="section">
      <div class="section-head"><div><h2>Our sponsors</h2></div></div>
      ${sponsorLogos(model.sponsors, 'sponsors-big')}
    </section>` : ''}
  </div>`;
});

function tile(value, label) {
  return `<div class="glance-tile"><b>${value}</b><span>${label}</span></div>`;
}

function playerLine(p) {
  return `<span class="team">${p.team ? crest(p.team) : ''}<span class="tn"><span class="tname">${esc(p.name)}</span><span class="tyears">${p.team ? esc(p.team.name) : ''}</span></span></span>`;
}

function leaderCard(ic, title, who, value, page) {
  return `<a class="card leader" href="${href(page)}">
    <span class="leader-ic">${icon(ic)}</span>
    <span class="leader-title">${title}</span>
    <span class="leader-who">${who || '<span class="muted">To be decided</span>'}</span>
    <span class="leader-val">${value}</span>
  </a>`;
}

/* ------------------------------------------------------------ match day */

function matchDayPanel(model) {
  const t = model.tournament;
  const first = model.firstKick;
  const next = model.upcoming[0];
  const live = model.liveMatches;
  const now = Date.now();
  const before = first && first.date && !first.date.noDay && now < first.date.d.getTime() && !model.anyPlayed && !live.length;
  const done = model.champion || (t.total && t.played === t.total);
  const pct = t.total ? Math.round((t.played / t.total) * 100) : 0;
  const stageNow = live.length ? live[0] : next;
  const stageName = !stageNow ? '' : stageNow.stage === 'group' ? 'Group stage' : { QF: 'Quarterfinals', SF: 'Semifinals', FINAL: 'The Final' }[stageNow.round];

  let body = '';
  if (before) {
    body = `
      <p class="md-lead">Kick-off in</p>
      <div class="countdown" data-countdown="${first.date.d.getTime()}">
        ${['days', 'hours', 'mins', 'secs'].map((u) => `<div><b data-u="${u}">–</b><span>${u}</span></div>`).join('')}
      </div>
      <p class="md-sub">First match: <b>${esc(first.home ? first.home.name : 'TBD')}</b> v <b>${esc(first.away ? first.away.name : 'TBD')}</b> at ${esc(kickoff(first))}</p>`;
  } else if (done) {
    body = `<p class="md-lead">That's full time on match day — ${plural(t.played, 'match', 'matches')}, ${plural(t.goals, 'goal')}.</p>`;
  } else {
    body = `
      <div class="md-progress" role="progressbar" aria-valuenow="${t.played}" aria-valuemin="0" aria-valuemax="${t.total}" aria-label="Matches played">
        <div class="md-bar"><i style="width:${pct}%"></i></div>
        <span><b>${t.played}</b> of ${t.total} matches played${stageName ? ' · ' + stageName : ''}</span>
      </div>`;
  }
  const cards = [
    ...live.map((m) => matchCard(m, model)),
    ...(next && !done ? [matchCard(next, model, { upNext: true })] : []),
  ];
  return `<section class="section">
    <div class="card matchday${live.length ? ' is-live' : ''}">
      <div class="md-head">
        <div>
          <p class="kicker">${live.length ? '<i class="live-dot"></i> Live now' : 'Match day'}</p>
          <h2>${model.matchDay ? fmtDate(model.matchDay, '', { long: true, noTime: true }) : 'Date to be confirmed'}</h2>
          <p class="md-sub">${plural(t.total, 'match', 'matches')} · ${first && kickoff(first) ? 'first kick-off ' + esc(kickoff(first)) : 'times to be confirmed'}</p>
        </div>
        <a class="link-more" href="${href('matches.html')}">Full schedule ${icon('arrow', 'ic ic-sm')}</a>
      </div>
      ${body}
      ${cards.length ? `<div class="carousel hscroll md-cards">${cards.join('')}</div>` : ''}
    </div>
  </section>`;
}

// Tick the countdown every second (the page itself re-renders only when data changes).
setInterval(() => {
  const el = document.querySelector('[data-countdown]');
  if (!el) return;
  let s = Math.max(0, Math.floor((+el.dataset.countdown - Date.now()) / 1000));
  const parts = { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
  for (const u in parts) {
    const b = el.querySelector(`[data-u="${u}"]`);
    if (b) b.textContent = String(parts[u]).padStart(u === 'days' ? 1 : 2, '0');
  }
}, 1000);

/* ---------------------------------------------------------------- my team */

function myTeamCard(model) {
  const t = model.teams.get(getMyTeam());
  const teams = [...model.teamList].sort((a, b) => a.name.localeCompare(b.name));
  const alertsBtn = `<button type="button" class="btn-ghost" data-alerts>${alertsOn() ? '🔔 Goal alerts on' : '🔕 Goal alerts off'}</button>`;
  if (!t) {
    return `<section class="section"><div class="card pad myteam pick">
      <div><h3 class="a-h">⭐ Follow your team</h3><p class="muted small">Pick your team to see its next match here and have it highlighted everywhere.</p></div>
      <div class="row-2"><label class="select full"><span class="sr-only">Team</span><select data-pick-team><option value="">Choose your team…</option>${teams.map((x) => `<option value="${esc(x.key)}">${esc(x.name)}</option>`).join('')}</select></label></div>
      ${alertsBtn}
    </div></section>`;
  }
  const s = t.stats;
  const live = s.matches.find((m) => m.live);
  const next = s.matches.find((m) => !m.played);
  const last = [...s.matches].reverse().find((m) => m.finished);
  const show = live || next || last;
  return `<section class="section"><div class="card myteam">
    <div class="myteam-head">
      <a class="team" href="${href('team.html', { t: t.slug })}">${crest(t, 'lg')}<span class="tn"><span class="kicker">Your team</span><span class="tname">${esc(t.name)}</span></span></a>
      <span class="muted small">${t.groupRow ? `${t.groupRow.pos}${['th', 'st', 'nd', 'rd'][t.groupRow.pos] || 'th'} in Group ${esc(t.group)} · ${t.groupRow.pts} pts` : ''}</span>
    </div>
    ${show ? `<div class="myteam-match"><p class="muted small">${live ? 'Playing now' : next && show === next ? 'Next match' : 'Last result'}</p>${matchCard(show, model)}</div>` : ''}
    ${t.suspendedNext && t.suspendedNext.length ? `<p class="small warn">⛔ Suspended next match: ${t.suspendedNext.map((x) => playerLink(x.player)).join(', ')}</p>` : ''}
    <div class="myteam-actions">${alertsBtn}<button type="button" class="btn-ghost" data-change-team>Change team</button></div>
  </div></section>`;
}

document.addEventListener('change', (e) => {
  if (e.target.matches('[data-pick-team]') && e.target.value) { setMyTeam(e.target.value); location.reload(); }
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-change-team]')) { setMyTeam(''); location.reload(); }
  const a = e.target.closest('[data-alerts]');
  if (a) { const on = !alertsOn(); setAlerts(on); a.textContent = on ? '🔔 Goal alerts on' : '🔕 Goal alerts off'; }
});
