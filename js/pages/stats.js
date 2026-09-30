import { runPage, esc, pageHero, sectionHead, segTabs, crest, teamLink, matchCard, emptyCard, icon, plural, playerLink } from '../ui.js';
import { barList, donut, donutLegend, columns, C } from '../charts.js';

const VIEWS = [['players', 'Players'], ['teams', 'Teams'], ['tournament', 'Tournament']];
const state = {
  view: VIEWS.some(([v]) => v === location.hash.slice(1)) ? location.hash.slice(1) : 'players',
  expanded: new Set(),
  sort: { players: { key: 'goals', dir: -1 }, teams: { key: 'pts', dir: -1 } },
};
let model = null;

runPage('stats', (m, page) => {
  model = m;
  page.innerHTML = pageHero('Statistics', 'Golden Boot, assists, Man of the Match awards, discipline and every team number.') +
    '<div class="wrap"><div class="controls sticky-controls" id="s-tabs"></div><div id="s-body"></div></div>';
  draw();
});

function draw() {
  document.getElementById('s-tabs').innerHTML = segTabs(VIEWS, state.view);
  const body = document.getElementById('s-body');
  body.innerHTML = state.view === 'players' ? players() : state.view === 'teams' ? teams() : tournament();
}

/* ---------------------------------------------------------------- players */

const playerWho = (p) => `<span class="team">${p.team ? crest(p.team) : ''}<span class="tn"><span class="tname">${playerLink(p)}</span><span class="tyears">${p.team ? esc(p.team.name) : '—'}</span></span></span>`;

function leaderboard(id, title, list, value, { unit = '', note = '' } = {}) {
  const all = list.filter((p) => value(p) > 0).sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
  const open = state.expanded.has(id);
  const shown = open ? all : all.slice(0, 5);
  return `<article class="card board">
    <div class="card-head"><h3>${title}</h3>${note ? `<span class="muted small">${note}</span>` : ''}</div>
    <div class="board-body">${all.length ? barList(shown.map((p) => ({ html: playerWho(p), value: value(p), title: `${p.name}: ${value(p)}` })), { max: value(all[0]), unit }) : '<p class="muted small">Nothing recorded yet.</p>'}</div>
    ${all.length > 5 ? `<button type="button" class="board-more" data-expand="${id}">${open ? 'Show top 5' : `See all ${all.length}`}</button>` : ''}
  </article>`;
}

function award(ic, title, winners, value, sub = '') {
  const lead = winners[0];
  return `<div class="award">
    <span class="award-ic">${icon(ic)}</span>
    <span class="award-title">${title}</span>
    <span class="award-who">${lead ? lead.html : '<span class="muted">To be decided</span>'}</span>
    <span class="award-val">${lead ? value : ''}${winners.length > 1 ? ` <span class="muted">· tied with ${winners.length - 1} other${winners.length > 2 ? 's' : ''}</span>` : ''}</span>
    ${sub ? `<span class="award-sub">${sub}</span>` : ''}
  </div>`;
}

function leaders(list, value) {
  const top = Math.max(0, ...list.map(value));
  return top > 0 ? list.filter((x) => value(x) === top) : [];
}

function players() {
  const P = model.players;
  if (!P.length) {
    return emptyCard('Player stats appear once goals, assists, cards and Man of the Match picks are entered in the score sheet (Goals, Cards tabs and the MOTM column).');
  }
  const ga = (p) => p.goals + p.assists;
  const boot = leaders(P, (p) => p.goals);
  const assist = leaders(P, (p) => p.assists);
  const motm = leaders(P, (p) => p.motm);
  const contrib = leaders(P, ga);
  return `
  <section class="section">
    ${sectionHead('Awards race', 'Leaders right now — these are the season awards.')}
    <div class="awards hscroll">
      ${award('ball', 'Golden Boot', boot.map((p) => ({ html: playerWho(p) })), boot[0] ? plural(boot[0].goals, 'goal') : '')}
      ${award('arrow', 'Top Assists', assist.map((p) => ({ html: playerWho(p) })), assist[0] ? plural(assist[0].assists, 'assist') : '')}
      ${award('star', 'Man of the Match king', motm.map((p) => ({ html: playerWho(p) })), motm[0] ? plural(motm[0].motm, 'award') : '')}
      ${award('stats', 'Most goal involvements', contrib.map((p) => ({ html: playerWho(p) })), contrib[0] ? `${ga(contrib[0])} (G ${contrib[0].goals} + A ${contrib[0].assists})` : '')}
    </div>
  </section>
  <section class="section">
    ${sectionHead('Leaderboards', '<span class="only-mobile">↔ Swipe for more boards</span>')}
    <div class="boards hscroll">
      ${leaderboard('goals', 'Goals', P, (p) => p.goals)}
      ${leaderboard('assists', 'Assists', P, (p) => p.assists)}
      ${leaderboard('ga', 'Goals + Assists', P, ga)}
      ${leaderboard('motm', 'Man of the Match', P, (p) => p.motm)}
      ${leaderboard('pens', 'Penalties scored', P, (p) => p.pens)}
      ${leaderboard('yellow', 'Yellow cards', P, (p) => p.yellow)}
      ${leaderboard('red', 'Red cards', P, (p) => p.red)}
    </div>
  </section>
  <section class="section">
    ${sectionHead('All players', 'Tap a column heading to sort. Swipe sideways on a phone.')}
    <article class="card" id="tbl-players">${playerTable()}</article>
  </section>`;
}

const PLAYER_COLS = [
  ['goals', 'G', 'Goals'], ['assists', 'A', 'Assists'], ['ga', 'G+A', 'Goals + assists'], ['pens', 'Pen', 'Penalties scored'],
  ['motm', 'MOTM', 'Man of the Match awards'], ['yellow', 'YC', 'Yellow cards'], ['red', 'RC', 'Red cards'], ['ownGoals', 'OG', 'Own goals'],
];

function playerTable() {
  const s = state.sort.players;
  const val = (p, k) => (k === 'ga' ? p.goals + p.assists : p[k]);
  const cmp = s.key === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => val(a, s.key) - val(b, s.key);
  const rows = [...model.players].sort((a, b) => s.dir * cmp(a, b) || a.name.localeCompare(b.name));
  return `<div class="tbl-wrap hscroll"><table class="tbl tbl-sort">
    <thead><tr><th class="c-pos">#</th><th class="c-team">${sortBtn('players', 'name', 'Player')}</th><th class="c-wide">Team</th>
      ${PLAYER_COLS.map(([k, l, t]) => `<th title="${t}">${sortBtn('players', k, l)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((p, i) => `<tr><td class="c-pos">${i + 1}</td><th scope="row" class="c-team"><span class="tname">${playerLink(p)}</span></th>
      <td class="c-wide">${p.team ? teamLink(p.team, { years: false }) : '—'}</td>
      ${PLAYER_COLS.map(([k]) => `<td class="${k === s.key ? 'sorted' : ''}">${val(p, k)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function sortBtn(table, key, label) {
  const s = state.sort[table];
  const on = s.key === key;
  return `<button type="button" class="sort${on ? ' on' : ''}" data-sort="${table}:${key}" aria-label="Sort by ${label}">${label}${on ? (s.dir < 0 ? ' ▾' : ' ▴') : ''}</button>`;
}

/* ------------------------------------------------------------------ teams */

function teamRows() {
  return model.teamList.map((t) => {
    const s = t.stats;
    const r = { team: t, ...s, pts: s.w * 3 + s.d, cardPts: s.yellow + s.red * 3 };
    model.statColumns.forEach((c) => {
      r['st_' + c.key] = s.statSums[c.key] != null ? (c.unit === '%' ? s.statSums[c.key] / s.statN[c.key] : s.statSums[c.key]) : null;
    });
    return r;
  });
}

function teams() {
  const rows = teamRows();
  const playedRows = rows.filter((r) => r.p);
  if (!playedRows.length) return emptyCard('Team stats appear after the first match is played.');
  const who = (r) => ({ html: teamLink(r.team, { link: false }) });
  const bestDef = [...playedRows].sort((a, b) => a.ga / a.p - b.ga / b.p);
  const defTop = bestDef.filter((r) => r.ga / r.p === bestDef[0].ga / bestDef[0].p);
  const fair = [...playedRows].sort((a, b) => a.cardPts / a.p - b.cardPts / b.p);
  const fairTop = fair.filter((r) => r.cardPts / r.p === fair[0].cardPts / fair[0].p);

  const board = (title, list, value, opts = {}) => {
    const sorted = [...list].filter((r) => value(r) != null).sort((a, b) => (opts.asc ? value(a) - value(b) : value(b) - value(a)) || a.team.name.localeCompare(b.team.name));
    return `<article class="card board"><div class="card-head"><h3>${title}</h3>${opts.note ? `<span class="muted small">${opts.note}</span>` : ''}</div>
      <div class="board-body">${barList(sorted.map((r) => ({ html: teamLink(r.team, { years: false }), value: value(r), display: opts.fmt ? opts.fmt(value(r)) : value(r) })), { unit: opts.unit || '' })}</div></article>`;
  };

  const hasCards = model.tournament.yellow + model.tournament.red > 0;
  return `
  <section class="section">
    ${sectionHead('Team awards race')}
    <div class="awards hscroll">
      ${award('ball', 'Best attack', leaders(playedRows, (r) => r.gf).map(who), plural(Math.max(...playedRows.map((r) => r.gf)), 'goal'))}
      ${award('shield', 'Best defence', defTop.map(who), `${(defTop[0].ga / defTop[0].p).toFixed(2)} conceded per game`)}
      ${award('teams', 'Most clean sheets', leaders(playedRows, (r) => r.cs).map(who), plural(Math.max(...playedRows.map((r) => r.cs)), 'clean sheet'))}
      ${hasCards ? award('card', 'Fair play', fairTop.map(who), `${(fairTop[0].cardPts / fairTop[0].p).toFixed(1)} card points per game`, 'Yellow = 1 point, red = 3') : ''}
    </div>
  </section>
  <section class="section">
    ${sectionHead('Team rankings', '<span class="only-mobile">↔ Swipe for more</span>')}
    <div class="boards hscroll">
      ${board('Goals scored', playedRows, (r) => r.gf)}
      ${board('Goals conceded', playedRows, (r) => r.ga, { asc: true, note: 'fewest first' })}
      ${board('Clean sheets', playedRows, (r) => r.cs)}
      ${board('Win rate', playedRows, (r) => r.winPct, { unit: '%' })}
      ${model.statColumns.map((c) => board(c.unit === '%' ? c.label + ' (average)' : c.label, playedRows, (r) => r['st_' + c.key], { unit: c.unit, fmt: (v) => (Number.isInteger(v) ? v : v.toFixed(1)) })).join('')}
      ${hasCards ? board('Yellow cards', playedRows, (r) => r.yellow) + board('Red cards', playedRows, (r) => r.red) : ''}
    </div>
  </section>
  <section class="section">
    ${sectionHead('All team stats', 'Every match counted, including knockouts. Tap a heading to sort.')}
    <article class="card" id="tbl-teams">${teamTable()}</article>
  </section>`;
}

function teamCols() {
  return [
    ['p', 'P', 'Played'], ['w', 'W', 'Won'], ['d', 'D', 'Drawn'], ['l', 'L', 'Lost'], ['gf', 'GF', 'Goals for'], ['ga', 'GA', 'Goals against'],
    ['cs', 'CS', 'Clean sheets'], ['winPct', 'Win%', 'Win rate'],
    ...model.statColumns.map((c) => ['st_' + c.key, c.unit === '%' ? 'Poss%' : c.label.replace('Shots on target', 'On target').replace('Total shots', 'Shots'), c.label]),
    ['yellow', 'YC', 'Yellow cards'], ['red', 'RC', 'Red cards'],
  ];
}

function teamTable() {
  const s = state.sort.teams;
  const cols = teamCols();
  const val = (r, k) => (r[k] == null ? -Infinity : r[k]);
  const cmp = s.key === 'name' ? (a, b) => a.team.name.localeCompare(b.team.name) : (a, b) => val(a, s.key) - val(b, s.key);
  const rows = teamRows().sort((a, b) => s.dir * cmp(a, b) || b.pts - a.pts || a.team.name.localeCompare(b.team.name));
  const fmt = (v) => (v == null ? '–' : Number.isInteger(v) ? v : v.toFixed(1));
  return `<div class="tbl-wrap hscroll"><table class="tbl tbl-sort">
    <thead><tr><th class="c-pos">#</th><th class="c-team">${sortBtn('teams', 'name', 'Team')}</th>
      ${cols.map(([k, l, t]) => `<th title="${esc(t)}">${sortBtn('teams', k, esc(l))}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td class="c-pos">${i + 1}</td><th scope="row" class="c-team">${teamLink(r.team, { years: false })}</th>
      ${cols.map(([k]) => `<td class="${k === s.key ? 'sorted' : ''}">${fmt(r[k])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

/* ------------------------------------------------------------- tournament */

function tournament() {
  const t = model.tournament;
  if (!t.played) return emptyCard('Tournament stats appear after the first match is played.');
  const results = [
    { label: 'Home wins', value: t.homeW, color: C.home },
    { label: 'Draws', value: t.draws, color: C.draw },
    { label: 'Away wins', value: t.awayW, color: C.away },
  ];
  const types = [
    { html: 'Open play', value: t.goalTypes.open },
    { html: 'Penalties', value: t.goalTypes.pen },
    { html: 'Own goals', value: t.goalTypes.og },
  ];
  return `
  <section class="section">
    <div class="glance">
      ${tile(`${t.played}<small>/${t.total}</small>`, 'Matches played')}
      ${tile(t.goals, 'Goals')}
      ${tile(t.perMatch.toFixed(2), 'Goals per match')}
      ${tile(t.cleanSheets, 'Clean sheets')}
      ${tile(t.scorers, 'Different scorers')}
      ${tile(`${t.yellow}<small> YC</small> · ${t.red}<small> RC</small>`, 'Cards shown')}
    </div>
  </section>
  <section class="section chart-grid">
    <article class="card chart-card">
      <div class="card-head"><h3>How matches ended</h3></div>
      <div class="donut-block">${donut(results, { big: t.played, small: 'matches' })}${donutLegend(results)}</div>
    </article>
    ${t.minutesKnown ? `<article class="card chart-card">
      <div class="card-head"><h3>When goals are scored</h3><span class="muted small">minute of the match</span></div>
      ${columns(t.minuteBuckets)}
    </article>` : ''}
    ${t.goalsLogged ? `<article class="card chart-card">
      <div class="card-head"><h3>How goals were scored</h3></div>
      <div class="board-body">${barList(types, { rank: false, max: t.goalsLogged })}</div>
    </article>` : ''}
  </section>
  <section class="section">
    ${sectionHead('Records')}
    <div class="records">
      ${t.biggest ? `<div><h3 class="rec-title">${icon('trophy', 'ic ic-sm')} Biggest win</h3>${matchCard(t.biggest, model)}</div>` : ''}
      ${t.highest ? `<div><h3 class="rec-title">${icon('ball', 'ic ic-sm')} Most goals in a match</h3>${matchCard(t.highest, model)}</div>` : ''}
    </div>
  </section>`;
}

function tile(value, label) {
  return `<div class="glance-tile"><b>${value}</b><span>${label}</span></div>`;
}

/* ----------------------------------------------------------------- events */

document.addEventListener('click', (e) => {
  if (!model) return;
  const v = e.target.closest('[data-view]');
  if (v) {
    state.view = v.dataset.view;
    history.replaceState(null, '', '#' + state.view);
    draw();
    return;
  }
  const x = e.target.closest('[data-expand]');
  if (x) {
    const id = x.dataset.expand;
    if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
    draw();
    return;
  }
  const s = e.target.closest('[data-sort]');
  if (s) {
    const [table, key] = s.dataset.sort.split(':');
    const cur = state.sort[table];
    state.sort[table] = cur.key === key ? { key, dir: -cur.dir } : { key, dir: key === 'name' ? 1 : -1 };
    const box = document.getElementById('tbl-' + table);
    const scroller = box && box.querySelector('.hscroll');
    const left = scroller ? scroller.scrollLeft : 0;
    if (box) box.innerHTML = table === 'players' ? playerTable() : teamTable();
    const ns = box && box.querySelector('.hscroll');
    if (ns) ns.scrollLeft = left;
  }
});
