import { runPage, esc, href, param, crest, fmtDate, kickoff, stageLabel, placeholderFor, standingsTable, sectionHead, emptyCard, icon, teamColor, photoGrid } from '../ui.js';
import { chronoCmp, predict } from '../model.js';
import { compareRow, donut, donutLegend, C } from '../charts.js';

runPage('matches', (model, page) => {
  const m = model.match(param('id') || '');
  if (!m) {
    page.innerHTML = `<div class="wrap section">${emptyCard(`Match not found. <a href="${href('matches.html')}">See all matches</a>`)}</div>`;
    return;
  }
  const H = m.home, A = m.away;
  const nameOf = (side) => (m[side] ? m[side].name : placeholderFor(model, m.slot, side));
  document.title = `${nameOf('home')} v ${nameOf('away')} · Kyogyera League`;

  const side = (s) => {
    const t = m[s];
    const inner = `${crest(t, 'xl')}<span class="sb-name">${esc(nameOf(s))}</span>${t && t.years ? `<span class="tyears">${esc(t.years)}</span>` : ''}`;
    return t && t.group ? `<a class="sb-team" href="${href('team.html', { t: t.slug })}">${inner}</a>` : `<div class="sb-team">${inner}</div>`;
  };
  const goalsFor = (s) => m.goals.filter((g) => g.side === s).map((g) =>
    `<li>${esc(g.scorer ? g.scorer.name : 'Goal')}${g.type === 'OG' ? ' (OG)' : g.type === 'PEN' ? ' (P)' : ''} <span>${g.minute ? g.minute.label : ''}</span></li>`).join('');

  const time = m.date && m.date.time ? m.date.d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBC';
  const ordered = [...model.matches].sort(chronoCmp);
  const idx = ordered.indexOf(m);
  const prev = ordered[idx - 1], next = ordered[idx + 1];

  page.innerHTML = `
  <section class="scoreboard" style="--ch:${H ? esc(teamColor(H)) : 'transparent'};--ca:${A ? esc(teamColor(A)) : 'transparent'}">
    <div class="wrap">
      <a class="back" href="${href('matches.html')}">${icon('back', 'ic ic-sm')} All matches</a>
      <p class="sb-stage">${esc(stageLabel(m))} · ${fmtDate(m.date, m.dateRaw, { long: true, noTime: true }) || 'Date TBC'}${kickoff(m) ? ' · ' + esc(kickoff(m)) : ''}</p>
      <div class="sb-main">
        ${side('home')}
        <div class="sb-center">
          ${m.played ? `<div class="sb-score">${m.hs}<i>–</i>${m.as}</div>${m.live ? `<span class="badge badge-livenow"><i class="live-dot"></i>${m.status === 'HT' ? 'Half time' : 'Live'}</span>` : '<span class="badge">Full time</span>'}`
            : `<div class="sb-time">${esc(time)}</div><span class="badge badge-live">Upcoming</span>`}
        </div>
        ${side('away')}
      </div>
      ${m.note ? `<p class="sb-note">${esc(m.note)}</p>` : ''}
      ${m.goals.length ? `<div class="sb-goals"><ul class="home">${goalsFor('home')}</ul>${icon('ball', 'ic ic-sm')}<ul class="away">${goalsFor('away')}</ul></div>` : ''}
      <p class="sb-venue">${icon('pin', 'ic ic-xs')} ${esc(model.cfg.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema')}</p>
    </div>
  </section>

  <div class="wrap">
    ${m.motm ? `<section class="section"><div class="motm">
      <span class="motm-ic">${icon('star')}</span>
      <div><small>Man of the Match</small><b>${esc(m.motm.name)}</b>${m.motm.team ? `<span>${esc(m.motm.team.name)}</span>` : ''}</div>
    </div></section>` : ''}

    ${m.played ? timeline(m) : ''}
    ${m.played ? statsBlock(m) : ''}
    ${!m.played && H && A ? prediction(m) : ''}

    ${m.stage === 'group' ? `<section class="section">${sectionHead('Group ' + esc(m.group) + ' table')}
      <article class="card">${standingsTable(model.groups.find((g) => g.id === m.group).table, { cols: ['p', 'w', 'd', 'l', 'gd', 'pts'], compact: true })}</article></section>` : ''}

    ${(() => {
      const pics = model.photos.filter((ph) => ph.match === m);
      return pics.length ? `<section class="section">${sectionHead('Photos')}${photoGrid(pics, 'match')}</section>` : '';
    })()}

    <nav class="prevnext">
      ${prev ? `<a href="${href('match.html', { id: prev.id })}">${icon('back', 'ic ic-sm')}<span><small>Previous match</small>${esc(short(prev, model))}</span></a>` : '<span></span>'}
      ${next ? `<a class="nx" href="${href('match.html', { id: next.id })}"><span><small>Next match</small>${esc(short(next, model))}</span>${icon('arrow', 'ic ic-sm')}</a>` : '<span></span>'}
    </nav>
  </div>`;
});

function short(m, model) {
  const n = (s) => (m[s] ? m[s].name : placeholderFor(model, m.slot, s));
  return `${n('home')} v ${n('away')}`;
}

function timeline(m) {
  const events = [
    ...m.goals.map((g) => ({ minute: g.minute, side: g.side, html: `${icon('ball', 'ic ic-sm')}<span><b>${esc(g.scorer ? g.scorer.name : 'Goal')}</b>${g.type === 'PEN' ? ' <em>(penalty)</em>' : g.type === 'OG' ? ' <em>(own goal)</em>' : ''}${g.assist ? `<small>Assist: ${esc(g.assist.name)}</small>` : ''}</span>` })),
    ...m.cards.map((c) => ({ minute: c.minute, side: c.side, html: `<span class="card-ic ${c.card === 'R' ? 'red' : 'yellow'}" aria-label="${c.card === 'R' ? 'Red' : 'Yellow'} card"></span><span><b>${esc(c.player ? c.player.name : 'Player')}</b><small>${c.card === 'R' ? 'Red card' : 'Yellow card'}</small></span>` })),
  ].sort((a, b) => (a.minute ? a.minute.sort : 999) - (b.minute ? b.minute.sort : 999));
  if (!events.length) return '';
  return `<section class="section">${sectionHead('Match events')}
    <article class="card pad"><ol class="timeline">${events.map((e) => `
      <li class="ev ev-${e.side}"><span class="ev-min">${e.minute ? e.minute.label : ''}</span><div class="ev-body">${e.html}</div></li>`).join('')}
    </ol></article></section>`;
}

function statsBlock(m) {
  const rows = [];
  const st = m.stats;
  const LOWER = ['fouls', 'offsides'];
  if (st) {
    for (const k of Object.keys({ ...st.home, ...st.away })) {
      if (st.home[k] == null && st.away[k] == null) continue;
      rows.push({ k, label: labelFor(k), h: st.home[k] || 0, a: st.away[k] || 0 });
    }
  }
  const order = ['possession', 'shots', 'shotsontarget', 'corners', 'fouls', 'offsides', 'saves'];
  rows.sort((x, y) => (order.indexOf(x.k) + 1 || 99) - (order.indexOf(y.k) + 1 || 99));
  const yH = m.cards.filter((c) => c.side === 'home' && c.card === 'Y').length, yA = m.cards.filter((c) => c.side === 'away' && c.card === 'Y').length;
  const rH = m.cards.filter((c) => c.side === 'home' && c.card === 'R').length, rA = m.cards.filter((c) => c.side === 'away' && c.card === 'R').length;
  if (!rows.length && !m.cards.length) {
    return `<section class="section">${sectionHead('Match stats')}${emptyCard('Detailed stats (shots, corners, possession…) were not recorded for this match.')}</section>`;
  }
  return `<section class="section">${sectionHead('Match stats')}
    <article class="card pad">
      <div class="cmp-legend"><span><i style="background:${C.home}"></i>${esc(m.home.name)}</span><span><i style="background:${C.away}"></i>${esc(m.away.name)}</span></div>
      ${rows.map((r) => compareRow(r.label, r.h, r.a, { unit: r.k === 'possession' ? '%' : '', lowerIsBetter: LOWER.includes(r.k) })).join('')}
      ${m.cards.length ? compareRow('Yellow cards', yH, yA, { lowerIsBetter: true }) + compareRow('Red cards', rH, rA, { lowerIsBetter: true }) : ''}
    </article></section>`;
}

const LABELS = { possession: 'Possession', shots: 'Total shots', shotsontarget: 'Shots on target', corners: 'Corners', fouls: 'Fouls', offsides: 'Offsides', saves: 'Saves' };
function labelFor(k) {
  return LABELS[k] || k.charAt(0).toUpperCase() + k.slice(1);
}

function prediction(m) {
  const p = predict(m);
  const segs = [
    { label: m.home.name + ' win', value: p.home, color: C.home },
    { label: 'Draw', value: p.draw, color: C.draw },
    { label: m.away.name + ' win', value: p.away, color: C.away },
  ];
  const fav = p.home > p.away ? m.home.name : p.away > p.home ? m.away.name : null;
  return `<section class="section">${sectionHead('Who will win?', 'A light-hearted prediction from each team’s results so far — not the official word!')}
    <article class="card chart-card"><div class="donut-block">
      ${donut(segs, { big: fav ? Math.max(p.home, p.away) + '%' : p.home + '%', small: fav ? esc(fav) : 'each' })}
      ${donutLegend(segs, { showCount: false })}
    </div></article></section>`;
}
