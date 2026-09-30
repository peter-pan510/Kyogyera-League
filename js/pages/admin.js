/* Admin page: sign in with a code, then update the sheet from the site.
 * What each person sees depends on their role (admin / editor / referee). */
import { runPage, esc, href, icon, crest } from '../ui.js';
import { requestRefresh } from '../data.js';
import { teamKey } from '../model.js';
import { call, login, getSession, clearSession, ROLE_NAMES, AuthError } from '../admin-api.js';

const SECTIONS = [
  ['match', 'Match console', ['admin', 'ref']],
  ['fixtures', 'Fixtures & draw', ['admin', 'editor']],
  ['squads', 'Squads', ['admin', 'editor']],
  ['teams', 'Teams', ['admin', 'editor']],
  ['photos', 'Photos', ['admin']],
  ['info', 'Info & settings', ['admin']],
  ['announce', 'Announcements', ['admin']],
  ['sponsors', 'Sponsors & ads', ['admin']],
  ['codes', 'Codes', ['admin']],
  ['log', 'Activity', ['admin']],
];
const STAT_ROWS = [['Shots', 'Shots'], ['ShotsOnTarget', 'On target'], ['Corners', 'Corners'], ['Fouls', 'Fouls'], ['Offsides', 'Offsides'], ['Saves', 'Saves']];
const NEW = '__new__';

let model = null;
let page = null;
const st = { tab: null, matches: null, matchId: null, m: null, squadTeam: '' };

runPage('admin', (m) => {
  model = m;
  const body = document.getElementById('admin-body');
  if (body && body.dataset.needsModel === '1') renderTab();
});
// Show the sign-in screen straight away — it doesn't need the scores.
page = document.getElementById('page');
show();

/* ================================================================ layout */

function show(message) {
  const s = getSession();
  if (!s) return renderLogin(message);
  renderShell(s);
}

function renderLogin(message) {
  page.innerHTML = `
  <div class="wrap admin-login">
    <form class="card login-card" id="login-form" autocomplete="off">
      <img src="assets/kyogyera-badge-256.webp" alt="" width="96" height="96">
      <h1>Admin</h1>
      <p class="muted">Enter your sign-in code.</p>
      <input id="pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="••••••" aria-label="Sign-in code" required>
      <button type="submit" class="btn btn-big" id="login-btn">Sign in</button>
      <p class="login-err" role="alert">${esc(message || '')}</p>
      <p class="muted small">Only league officials have a code. <a href="${href('index.html')}">Back to the site</a></p>
    </form>
  </div>`;
  const pin = document.getElementById('pin');
  setTimeout(() => pin.focus(), 50);
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const err = page.querySelector('.login-err');
    btn.disabled = true; btn.textContent = 'Checking…'; err.textContent = '';
    try {
      await login(pin.value);
      markAdminButton(true);
      show();
    } catch (ex) {
      err.textContent = ex.message;
      pin.value = ''; pin.focus();
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });
}

function markAdminButton(on) {
  document.querySelectorAll('.admin-btn').forEach((b) => b.classList.toggle('on', on));
}

function allowed(s) { return SECTIONS.filter(([, , roles]) => roles.includes(s.role)); }

function renderShell(s) {
  const secs = allowed(s);
  if (!secs.some(([id]) => id === st.tab)) st.tab = secs[0][0];
  page.innerHTML = `
  <div class="admin-bar"><div class="wrap admin-bar-inner">
    <span>${icon('shield', 'ic ic-sm')} <b>${esc(s.name)}</b> <span class="role-chip role-${esc(s.role)}">${esc(ROLE_NAMES[s.role] || s.role)}</span></span>
    <button type="button" class="btn-ghost" id="signout">Sign out</button>
  </div></div>
  <div class="wrap">
    <div class="admin-tabs hscroll" role="tablist">
      ${secs.map(([id, label]) => `<button type="button" role="tab" class="chip-btn${id === st.tab ? ' on' : ''}" data-tab="${id}" aria-selected="${id === st.tab}">${label}</button>`).join('')}
    </div>
    <div id="admin-body" class="admin-body"></div>
  </div>
  <div class="toast" id="toast" role="status" hidden></div>
  <div class="sheet" id="sheet" hidden><div class="sheet-backdrop" data-close-sheet></div><div class="sheet-panel" role="dialog" aria-modal="true"></div></div>`;
  document.getElementById('signout').onclick = () => { clearSession(); markAdminButton(false); show('Signed out.'); };
  page.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; renderShell(s); }; });
  page.querySelector('[data-close-sheet]').onclick = closeSheet;
  renderTab();
}

function body() { return document.getElementById('admin-body'); }

function renderTab() {
  const el = body();
  if (!el) return;
  el.dataset.needsModel = '';
  const fn = { match: tabMatch, fixtures: tabFixtures, squads: tabSquads, photos: tabPhotos, info: tabInfo, teams: tabTeams, announce: tabAnnounce, sponsors: tabSponsors, codes: tabCodes, log: tabLog }[st.tab];
  Promise.resolve(fn(el)).catch(handleError);
}

function needModel(el) {
  if (model) return false;
  el.dataset.needsModel = '1';
  el.innerHTML = loadingHtml('Loading the league data…');
  return true;
}

const loadingHtml = (t = 'Loading…') => `<div class="loading"><span class="spinner"></span>${esc(t)}</div>`;

let toastTimer = 0;
function toast(msg, kind = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = 'toast ' + kind; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'err' ? 6000 : 2500);
}

function handleError(e) {
  if (e instanceof AuthError) { markAdminButton(false); show(e.message); return; }
  console.error(e);
  toast(e.message || String(e), 'err');
}

/** Runs a change: disables the button, shows the result, refreshes the public data. */
async function act(btn, fn, okMsg = 'Saved ✓') {
  const els = btn ? [btn] : [];
  els.forEach((b) => { b.disabled = true; b.dataset.label = b.innerHTML; b.innerHTML = '<span class="spinner sm"></span>'; });
  try {
    const out = await fn();
    toast(okMsg);
    requestRefresh();
    return out;
  } catch (e) {
    handleError(e);
    return null;
  } finally {
    els.forEach((b) => { b.disabled = false; if (b.dataset.label) b.innerHTML = b.dataset.label; });
  }
}

/* ============================================================ bottom sheet */

function openSheet(html) {
  const sh = document.getElementById('sheet');
  sh.querySelector('.sheet-panel').innerHTML = html;
  sh.hidden = false;
  document.body.classList.add('no-scroll');
  const first = sh.querySelector('select, input, textarea');
  if (first) setTimeout(() => first.focus(), 60);
  return sh.querySelector('.sheet-panel');
}
function closeSheet() {
  const sh = document.getElementById('sheet');
  if (sh) sh.hidden = true;
  document.body.classList.remove('no-scroll');
}

/* ========================================================= match console */

const LIVE = (s) => s === 'Live' || s === 'HT';

async function tabMatch(el) {
  if (!st.matches) {
    el.innerHTML = loadingHtml('Loading matches…');
    st.matches = (await call('matches')).matches;
  }
  if (!st.matchId || !st.matches.some((x) => x.id === st.matchId)) {
    const live = st.matches.find((x) => LIVE(x.status));
    const next = st.matches.find((x) => x.status !== 'FT' && x.home && x.away);
    st.matchId = (live || next || st.matches[0] || {}).id;
  }
  el.innerHTML = `
    <label class="select full"><span class="sr-only">Match</span>
      <select id="m-pick">${matchOptions()}</select>
    </label>
    <div id="console">${loadingHtml('Loading match…')}</div>`;
  el.querySelector('#m-pick').onchange = (e) => { st.matchId = e.target.value; loadMatch(); };
  await loadMatch();
}

function matchOptions() {
  const groups = [['Group stage', st.matches.filter((m) => /^Group/.test(m.stage))], ['Knockouts', st.matches.filter((m) => !/^Group/.test(m.stage))]];
  return groups.map(([label, list]) => list.length ? `<optgroup label="${label}">${list.map((m) => {
    const score = m.hs !== '' && m.as !== '' ? ` ${m.hs}-${m.as}` : '';
    const state = LIVE(m.status) ? ` · ${m.status === 'HT' ? 'HT' : 'LIVE'}${score}` : m.status === 'FT' ? ` · FT${score}` : '';
    return `<option value="${esc(m.id)}"${m.id === st.matchId ? ' selected' : ''}>${esc(m.id)} · ${esc(m.time)} · ${esc(m.home || 'TBD')} v ${esc(m.away || 'TBD')}${esc(state)}</option>`;
  }).join('')}</optgroup>` : '').join('');
}

async function loadMatch() {
  const box = document.getElementById('console');
  if (!box || !st.matchId) return;
  try {
    st.m = await call('match', { matchId: st.matchId });
    syncMatchList();
    drawConsole();
  } catch (e) { handleError(e); box.innerHTML = '<p class="muted">Could not load this match.</p>'; }
}

function teamObj(name) {
  return model && name ? model.teams.get(teamKey(name)) || null : null;
}

/* Changes show on screen straight away and are saved in the background, one
 * after another, in the order they were tapped. The answer to each save carries
 * the updated match, so there is no second trip to reload it. */
const queue = [];
let saving = false;

function enqueue(params, okMsg, optimistic) {
  if (optimistic) { optimistic(st.m); drawConsole(); }
  queue.push({ params: { matchId: st.matchId, ...params }, okMsg });
  pump();
}

async function pump() {
  if (saving) return;
  saving = true;
  showSaving();
  let last = null;
  while (queue.length) {
    const job = queue.shift();
    try {
      const d = await call(job.params.action, job.params);
      last = job.okMsg;
      if (d.state && d.state.match.id === st.matchId && !queue.length) { st.m = d.state; syncMatchList(); drawConsole(); }
    } catch (e) {
      queue.length = 0;
      handleError(e);
      last = null;
      if (!(e instanceof AuthError)) await loadMatch();
    }
  }
  saving = false;
  showSaving();
  if (last) { toast(last); requestRefresh(); }
}

function showSaving() {
  const el = document.getElementById('c-saving');
  if (el) el.hidden = !saving;
}

function syncMatchList() {
  const x = st.matches && st.matches.find((mm) => mm.id === st.matchId);
  if (x) Object.assign(x, { hs: st.m.match.hs, as: st.m.match.as, status: st.m.match.status });
  const pick = document.getElementById('m-pick');
  if (pick) { pick.innerHTML = matchOptions(); pick.value = st.matchId; }
}

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

function drawConsole() {
  const box = document.getElementById('console');
  if (!box || !st.m) return;
  const { match: M, goals, cards, stats } = st.m;
  const ready = M.home && M.away;
  const hs = M.hs === '' ? '–' : M.hs, as = M.as === '' ? '–' : M.as;
  const pill = M.status === 'HT' ? '<span class="mc-state is-live">HT</span>'
    : M.status === 'Live' ? '<span class="mc-state is-live"><i class="live-dot"></i>LIVE</span>'
      : M.status === 'FT' ? '<span class="mc-state">FT</span>' : `<span class="mc-state">${esc(M.time || 'Not started')}</span>`;
  const statusBtns = !ready ? '<p class="muted small">Add the two teams on the Fixtures tab first.</p>'
    : M.status === '' ? btn('Kick off', 'status', { status: 'Live' }, 'btn-go')
      : M.status === 'Live' ? btn('Half time', 'status', { status: 'HT' }) + btn('Full time', 'status', { status: 'FT' }, 'btn-stop')
        : M.status === 'HT' ? btn('Second half', 'status', { status: 'Live' }, 'btn-go') + btn('Full time', 'status', { status: 'FT' }, 'btn-stop')
          : btn('Re-open match', 'status', { status: 'Live' });
  const side = (s) => `
    <div class="c-side">
      <button type="button" class="big-btn goal" data-do="goal" data-side="${s}" ${ready ? '' : 'disabled'}>${icon('ball', 'ic')} Goal</button>
      <div class="c-cards">
        <button type="button" class="card-btn yellow" data-do="card" data-card="Yellow" data-side="${s}" ${ready ? '' : 'disabled'}><i></i>Yellow</button>
        <button type="button" class="card-btn red" data-do="card" data-card="Red" data-side="${s}" ${ready ? '' : 'disabled'}><i></i>Red</button>
      </div>
    </div>`;
  const events = [
    ...goals.map((g) => ({ kind: 'goal', ...g })),
    ...cards.map((c) => ({ kind: 'card', ...c })),
  ].sort((a, b) => (parseFloat(a.minute) || 999) - (parseFloat(b.minute) || 999));
  const squads = st.m.squads;
  const allPlayers = [...squads.home.map((p) => ['home', p.name]), ...squads.away.map((p) => ['away', p.name])];
  const poss = stats.home.Possession;

  box.innerHTML = `
  <div class="card console">
    <p class="c-stage">${esc(M.stage)} · ${esc(M.id)} · ${esc(M.time)} <span class="c-saving" id="c-saving"${saving ? '' : ' hidden'}><span class="spinner sm"></span> Saving…</span></p>
    <div class="c-score">
      <div class="c-team">${crest(teamObj(M.home), 'lg')}<b>${esc(M.home || 'TBD')}</b></div>
      <div class="c-mid"><div class="c-num">${hs}<i>–</i>${as}</div>${pill}</div>
      <div class="c-team">${crest(teamObj(M.away), 'lg')}<b>${esc(M.away || 'TBD')}</b></div>
    </div>
    <div class="c-status">${statusBtns}</div>
    <div class="c-sides">${side('home')}${side('away')}</div>
  </div>

  <div class="card pad">
    <h3 class="a-h">Match stats</h3>
    <div class="stat-rows">
      ${STAT_ROWS.map(([k, label]) => `
        <div class="stat-row">
          <span class="st-ctl"><button type="button" data-do="stat" data-stat="${k}" data-side="home" data-d="-1" aria-label="${label} home minus one" ${ready ? '' : 'disabled'}>−</button><b>${num(stats.home[k])}</b><button type="button" data-do="stat" data-stat="${k}" data-side="home" data-d="1" aria-label="${label} home plus one" ${ready ? '' : 'disabled'}>+</button></span>
          <span class="st-label">${label}</span>
          <span class="st-ctl"><button type="button" data-do="stat" data-stat="${k}" data-side="away" data-d="1" aria-label="${label} away plus one" ${ready ? '' : 'disabled'}>+</button><b>${num(stats.away[k])}</b><button type="button" data-do="stat" data-stat="${k}" data-side="away" data-d="-1" aria-label="${label} away minus one" ${ready ? '' : 'disabled'}>−</button></span>
        </div>`).join('')}
      <form class="stat-row poss" data-form="poss">
        <span class="st-ctl"><input type="number" name="home" min="0" max="100" inputmode="numeric" value="${poss === '' || poss == null ? '' : poss}" placeholder="50" aria-label="Possession home %">%</span>
        <span class="st-label">Possession</span>
        <span class="st-ctl"><span class="muted">${stats.away.Possession === '' || stats.away.Possession == null ? '–' : stats.away.Possession}%</span><button type="submit" class="btn btn-sm" ${ready ? '' : 'disabled'}>Save</button></span>
      </form>
    </div>
  </div>

  <div class="card pad">
    <h3 class="a-h">Goals & cards</h3>
    ${events.length ? `<ul class="ev-list">${events.map((e) => `
      <li>
        <span class="ev-m">${esc(e.minute ? e.minute + "'" : '–')}</span>
        ${e.kind === 'goal' ? icon('ball', 'ic ic-sm') : `<span class="card-ic ${/red/i.test(e.card) ? 'red' : 'yellow'}"></span>`}
        <span class="ev-t${e.pending ? ' pending' : ''}"><b>${esc(e.kind === 'goal' ? e.scorer : e.player)}</b>
          <small>${esc(e.team)}${e.kind === 'goal' && e.type ? ' · ' + (e.type === 'OG' ? 'own goal' : 'penalty') : ''}${e.kind === 'goal' && e.assist ? ' · assist ' + esc(e.assist) : ''}${e.kind === 'card' ? ' · ' + esc(e.card) + ' card' : ''}</small></span>
        ${e.pending ? '<span class="spinner sm"></span>' : `<button type="button" class="icon-btn sm" data-do="undo" data-kind="${e.kind}" data-row="${e.row}" data-before="${esc(JSON.stringify(e.before))}" aria-label="Remove">${icon('close', 'ic ic-sm')}</button>`}
      </li>`).join('')}</ul>` : '<p class="muted small">No goals or cards yet.</p>'}
  </div>

  <form class="card pad" data-form="motm">
    <h3 class="a-h">${icon('star', 'ic ic-sm')} Man of the Match</h3>
    <div class="row-2">
      <select name="player" ${ready ? '' : 'disabled'}>
        <option value="">— none —</option>
        ${['home', 'away'].map((s) => `<optgroup label="${esc(M[s] || s)}">${squads[s].map((p) => `<option value="${esc(s + '|' + p.name)}"${M.motm && p.name === M.motm ? ' selected' : ''}>${esc(p.name)}${p.number ? ' #' + esc(p.number) : ''}</option>`).join('')}<option value="${s}|${NEW}">Someone not on the list…</option></optgroup>`).join('')}
      </select>
      <button type="submit" class="btn" ${ready ? '' : 'disabled'}>Save</button>
    </div>
    <input name="newName" class="hide-until-new" placeholder="Player's name" hidden>
    ${M.motm && !allPlayers.some(([, n]) => n === M.motm) ? `<p class="muted small">Current: ${esc(M.motm)}</p>` : ''}
  </form>

  ${M.tab === 'KnockoutFixtures' ? `
  <form class="card pad" data-form="note">
    <h3 class="a-h">Penalties / note</h3>
    <p class="muted small">If a knockout match ends level, write the winner first, e.g. "${esc(M.home || 'AMARO FC')} won 4-3 on penalties".</p>
    <div class="row-2"><input name="note" value="${esc(M.note)}" placeholder="Winner on penalties…"><button type="submit" class="btn">Save</button></div>
  </form>` : ''}

  <form class="card pad" data-form="score">
    <h3 class="a-h">Correct the score</h3>
    <p class="muted small">Goals added above update the score by themselves. Use this only to fix a mistake.</p>
    <div class="row-3">
      <input name="home" type="number" min="0" inputmode="numeric" value="${esc(M.hs)}" aria-label="${esc(M.home)} goals">
      <span>–</span>
      <input name="away" type="number" min="0" inputmode="numeric" value="${esc(M.as)}" aria-label="${esc(M.away)} goals">
      <button type="submit" class="btn" ${ready ? '' : 'disabled'}>Save</button>
    </div>
    ${M.status ? `<button type="button" class="btn-ghost danger" data-do="status" data-status="">Reset match to "not started"</button>` : ''}
  </form>`;

  // --- wire up
  box.querySelectorAll('[data-do="status"]').forEach((b) => {
    b.onclick = () => {
      const s = b.dataset.status;
      if (s === '' && !confirm('Reset this match to not started? The score will be cleared (goals and cards stay in the sheet).')) return;
      if (s === 'FT' && !confirm('Full time? The result will count as final.')) return;
      enqueue({ action: 'setStatus', status: s }, s === 'Live' ? 'Match is live ✓' : s === 'HT' ? 'Half time ✓' : s === 'FT' ? 'Full time ✓' : 'Match reset', (m) => {
        m.match.status = s;
        if (s && m.match.hs === '' && m.match.as === '') { m.match.hs = 0; m.match.as = 0; }
        if (!s) { m.match.hs = ''; m.match.as = ''; }
      });
    };
  });
  box.querySelectorAll('[data-do="goal"]').forEach((b) => { b.onclick = () => goalSheet(b.dataset.side); });
  box.querySelectorAll('[data-do="card"]').forEach((b) => { b.onclick = () => cardSheet(b.dataset.side, b.dataset.card); });
  box.querySelectorAll('[data-do="stat"]').forEach((b) => {
    b.onclick = () => {
      const side = b.dataset.side, k = b.dataset.stat, d = +b.dataset.d;
      if (d < 0 && num(st.m.stats[side][k]) === 0) return;
      enqueue({ action: 'stat', side, stat: k, delta: d }, 'Stats saved ✓', (m) => { m.stats[side][k] = Math.max(0, num(m.stats[side][k]) + d); });
    };
  });
  box.querySelectorAll('[data-do="undo"]').forEach((b) => {
    b.onclick = () => {
      if (!confirm('Remove this ' + (b.dataset.kind === 'goal' ? 'goal? The score goes down by one.' : 'card?'))) return;
      const before = JSON.parse(b.dataset.before), row = +b.dataset.row, kind = b.dataset.kind;
      enqueue({ action: kind === 'goal' ? 'removeGoal' : 'removeCard', row, before }, 'Removed ✓', (m) => {
        const list = kind === 'goal' ? m.goals : m.cards;
        const i = list.findIndex((x) => x.row === row);
        if (i < 0) return;
        if (kind === 'goal') { const side = list[i].side === 'away' ? 'as' : 'hs'; m.match[side] = Math.max(0, num(m.match[side]) - 1); }
        list.splice(i, 1);
      });
    };
  });
  const poss2 = box.querySelector('[data-form="poss"]');
  poss2.onsubmit = (e) => {
    e.preventDefault();
    const v = poss2.home.value;
    if (v === '') return;
    const h = Math.max(0, Math.min(100, +v));
    enqueue({ action: 'stat', side: 'home', stat: 'Possession', value: h }, 'Possession saved ✓', (m) => { m.stats.home.Possession = h; m.stats.away.Possession = 100 - h; });
  };
  const motm = box.querySelector('[data-form="motm"]');
  motm.player.onchange = () => { motm.newName.hidden = !motm.player.value.endsWith(NEW); };
  motm.onsubmit = (e) => {
    e.preventDefault();
    const [s, p] = motm.player.value ? motm.player.value.split('|') : ['', ''];
    const name = p === NEW ? motm.newName.value.trim() : p;
    if (p === NEW && !name) { toast('Type the player\'s name', 'err'); return; }
    enqueue({ action: 'setMotm', player: name, side: s }, name ? 'Man of the Match saved ✓' : 'Cleared', (m) => { m.match.motm = name; if (name && p === NEW) m.squads[s].push({ name, number: '' }); });
  };
  const note = box.querySelector('[data-form="note"]');
  if (note) note.onsubmit = (e) => { e.preventDefault(); const v = note.note.value; enqueue({ action: 'setNote', note: v }, 'Note saved ✓', (m) => { m.match.note = v; }); };
  const score = box.querySelector('[data-form="score"]');
  score.onsubmit = (e) => {
    e.preventDefault();
    const h = score.home.value, a = score.away.value;
    enqueue({ action: 'setScore', home: h, away: a }, 'Score saved ✓', (m) => { m.match.hs = h; m.match.as = a; if (!m.match.status && (h !== '' || a !== '')) m.match.status = 'Live'; });
  };
}

function btn(label, action, data, cls = '') {
  return `<button type="button" class="btn ${cls}" data-do="${action}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${label}</button>`;
}

function playerSelect(name, list, { withNone = '', selected = '' } = {}) {
  return `<select name="${name}">
    ${withNone ? `<option value="">${withNone}</option>` : ''}
    ${list.map((p) => `<option value="${esc(p.name)}"${p.name === selected ? ' selected' : ''}>${esc(p.name)}${p.number ? ' #' + esc(p.number) : ''}</option>`).join('')}
    <option value="${NEW}">Someone not on the list…</option>
  </select>`;
}

function newPlayerFields(prefix) {
  return `<div class="new-player" data-new="${prefix}" hidden>
    <input name="${prefix}Name" placeholder="Player's name">
    <input name="${prefix}Number" placeholder="No." inputmode="numeric" class="num">
  </div>`;
}

function wireNew(form, sel, prefix) {
  const box = form.querySelector(`[data-new="${prefix}"]`);
  const upd = () => { box.hidden = form[sel].value !== NEW; if (!box.hidden) form[prefix + 'Name'].focus(); };
  form[sel].addEventListener('change', upd);
  upd();
}

function pickName(form, sel, prefix) {
  const v = form[sel].value;
  if (v !== NEW) return { name: v, number: '' };
  return { name: form[prefix + 'Name'].value.trim(), number: form[prefix + 'Number'].value.trim() };
}

function goalSheet(side) {
  const M = st.m.match;
  const other = side === 'home' ? 'away' : 'home';
  const panel = openSheet(`
    <form class="sheet-form" id="goal-form">
      <h3>${icon('ball', 'ic')} Goal — ${esc(M[side])}</h3>
      <div class="seg" role="radiogroup">
        ${['Normal', 'Penalty', 'Own goal'].map((t, i) => `<label><input type="radio" name="type" value="${t}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}
      </div>
      <label>Scorer <span class="muted small" id="og-hint" hidden>(player of ${esc(M[other])} who put it in their own net)</span>
        <div id="scorer-box">${playerSelect('scorer', st.m.squads[side])}</div></label>
      ${newPlayerFields('s')}
      <label id="assist-label">Assist ${playerSelect('assist', st.m.squads[side], { withNone: 'No assist' })}</label>
      ${newPlayerFields('a')}
      <label>Minute <input name="minute" inputmode="numeric" placeholder="e.g. 34 or 45+2" maxlength="6"></label>
      <div class="sheet-actions"><button type="button" class="btn-ghost" data-close-sheet>Cancel</button><button type="submit" class="btn btn-big">Save goal</button></div>
    </form>`);
  const f = panel.querySelector('#goal-form');
  wireNew(f, 'scorer', 's'); wireNew(f, 'assist', 'a');
  panel.querySelector('[data-close-sheet]').onclick = closeSheet;
  f.querySelectorAll('input[name=type]').forEach((r) => {
    r.onchange = () => {
      const og = f.type.value === 'Own goal';
      panel.querySelector('#scorer-box').innerHTML = playerSelect('scorer', st.m.squads[og ? other : side]);
      wireNew(f, 'scorer', 's');
      panel.querySelector('#og-hint').hidden = !og;
      panel.querySelector('#assist-label').hidden = og;
      f.querySelector('[data-new="a"]').hidden = true;
    };
  });
  f.onsubmit = (e) => {
    e.preventDefault();
    const sc = pickName(f, 'scorer', 's');
    if (!sc.name) { toast('Who scored?', 'err'); return; }
    const og = f.type.value === 'Own goal';
    const as = og ? { name: '' } : pickName(f, 'assist', 'a');
    const type = f.type.value === 'Normal' ? '' : f.type.value;
    const minute = f.minute.value.trim();
    closeSheet();
    enqueue({ action: 'addGoal', side, scorer: sc.name, number: sc.number, assist: as.name, type, minute }, 'Goal saved ✓', (m) => {
      const k = side === 'home' ? 'hs' : 'as';
      m.match[k] = num(m.match[k]) + 1;
      if (!m.match.status) m.match.status = 'Live';
      if (m.match[k === 'hs' ? 'as' : 'hs'] === '') m.match[k === 'hs' ? 'as' : 'hs'] = 0;
      m.goals.push({ pending: true, side, team: m.match[side], scorer: sc.name, assist: as.name, minute, type: type === 'Own goal' ? 'OG' : type });
    });
  };
}

function cardSheet(side, card) {
  const M = st.m.match;
  const panel = openSheet(`
    <form class="sheet-form" id="card-form">
      <h3><span class="card-ic ${card === 'Red' ? 'red' : 'yellow'}"></span> ${card} card — ${esc(M[side])}</h3>
      <label>Player ${playerSelect('player', st.m.squads[side])}</label>
      ${newPlayerFields('p')}
      <label>Minute <input name="minute" inputmode="numeric" placeholder="e.g. 61" maxlength="6"></label>
      <div class="sheet-actions"><button type="button" class="btn-ghost" data-close-sheet>Cancel</button><button type="submit" class="btn btn-big">Save card</button></div>
    </form>`);
  const f = panel.querySelector('#card-form');
  wireNew(f, 'player', 'p');
  panel.querySelector('[data-close-sheet]').onclick = closeSheet;
  f.onsubmit = (e) => {
    e.preventDefault();
    const p = pickName(f, 'player', 'p');
    if (!p.name) { toast('Which player?', 'err'); return; }
    const minute = f.minute.value.trim();
    closeSheet();
    enqueue({ action: 'addCard', side, player: p.name, number: p.number, card, minute }, card + ' card saved ✓', (m) => {
      m.cards.push({ pending: true, side, team: m.match[side], player: p.name, card, minute });
    });
  };
}

/* ============================================================== fixtures */

function tabFixtures(el) {
  if (needModel(el)) return;
  const teams = [...model.teamList].sort((a, b) => a.name.localeCompare(b.name));
  const q = model.qual;
  const teamSel = (name, current) => `<select name="${name}"><option value="">TBD</option>${teams.map((t) => `<option value="${esc(t.full)}"${current && teamKey(current) === t.key ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
  el.innerHTML = `
    <div id="draw"></div>
    <div class="card pad note-card"><p>Change kick-off times here, and fill in the knockout teams once the groups are done. Times are on <b>${esc(model.cfg.matchdate || 'match day')}</b> (change the date under Info &amp; settings → Config → MatchDate).</p></div>
    ${model.anyPlayed ? `<div class="card pad"><h3 class="a-h">Qualified so far${q.allComplete ? '' : ' (provisional)'}</h3>
      <p class="q-inline">${q.list.map((x) => `<span><b>${esc(x.label)}</b> ${esc(x.team.name)}</span>`).join('')}</p></div>` : ''}
    <div class="fx-list">${model.matches.map((m) => `
      <form class="card fx-row" data-id="${esc(m.id)}">
        <div class="fx-head"><b>${esc(m.id)}</b><span class="muted small">${esc(m.stage === 'group' ? 'Group ' + m.group : m.slot)}</span></div>
        <label class="fx-time">Kick-off <input name="time" value="${esc(m.dateRaw)}" placeholder="08:00"></label>
        ${m.stage === 'ko'
          ? `<div class="fx-teams">${teamSel('home', m.home && m.home.full)}<span>v</span>${teamSel('away', m.away && m.away.full)}</div>`
          : `<div class="fx-teams fixed"><span>${esc(m.home.name)}</span><span>v</span><span>${esc(m.away.name)}</span></div>`}
        <button type="submit" class="btn btn-sm">Save</button>
      </form>`).join('')}</div>`;
  el.querySelectorAll('.fx-row').forEach((f) => {
    f.onsubmit = (e) => {
      e.preventDefault();
      const values = { Date: f.time.value.trim() };
      if (f.home) { values.TeamHome = f.home.value; values.TeamAway = f.away.value; }
      act(f.querySelector('button'), () => call('setFixture', { matchId: f.dataset.id, values }), f.dataset.id + ' saved ✓').then(() => { st.matches = null; });
    };
  });
  return drawSection(el.querySelector('#draw'));
}

/* ================================================================= draws */

const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

async function drawSection(box) {
  box.innerHTML = loadingHtml('Checking the draw…');
  const fx = await call('fixtures');
  const sizes = {};
  fx.teams.forEach((t) => { sizes[t.group] = (sizes[t.group] || 0) + 1; });
  const ids = Object.keys(sizes).filter(Boolean).sort();
  const q = model.qual;
  const koReady = q.allComplete && q.list.length === 8;
  box.innerHTML = `
    <div class="card pad draw-card">
      <h3 class="a-h">🎲 Group draw</h3>
      ${fx.started
        ? '<p class="muted small">The group stage has started, so the groups are locked.</p>'
        : `<p class="muted small">Randomly reshuffle the ${fx.teams.length} teams into groups ${ids.join(', ')} (${ids.map((g) => sizes[g]).join('/')} teams). All group fixtures are rebuilt with the same kick-off times.</p>
           <button type="button" class="btn" id="gd-go">Reshuffle groups</button>`}
      <div id="gd-preview"></div>
    </div>
    <div class="card pad draw-card">
      <h3 class="a-h">🎲 Knockout draw</h3>
      ${fx.koStarted ? '<p class="muted small">A quarterfinal has started, so the draw is locked.</p>'
        : koReady ? `<p class="muted small">Randomly pair the 8 qualified teams into QF1–QF4, keeping teams from the same group apart where possible.</p>
           <button type="button" class="btn" id="kd-go">Draw the quarterfinals</button>`
          : '<p class="muted small">Available once every group match is at full time and the 8 qualified teams are confirmed.</p>'}
      <div id="kd-preview"></div>
    </div>`;

  const gd = box.querySelector('#gd-go');
  if (gd) {
    const roll = () => {
      const pool = shuffle(fx.teams.map((t) => t.name));
      const groups = {}; let i = 0;
      ids.forEach((g) => { groups[g] = pool.slice(i, i + sizes[g]); i += sizes[g]; });
      const pv = box.querySelector('#gd-preview');
      pv.innerHTML = `
        <div class="draw-groups">${ids.map((g) => `<div><b>Group ${g}</b><ol>${groups[g].map((n) => `<li>${esc(n.replace(/\s*\d{4}\s*[-–]\s*\d{2,4}\s*$/, ''))}</li>`).join('')}</ol></div>`).join('')}</div>
        <div class="draw-actions"><button type="button" class="btn-ghost" id="gd-again">Shuffle again</button><button type="button" class="btn" id="gd-use">Use this draw</button></div>`;
      pv.querySelector('#gd-again').onclick = roll;
      pv.querySelector('#gd-use').onclick = (e) => {
        if (!confirm('Use this draw? The groups and all group fixtures will be replaced.')) return;
        act(e.target, () => call('groupDraw', { groups }), 'New groups saved ✓').then((ok) => { if (ok) { st.matches = null; pv.innerHTML = '<p class="muted small">Saved — the fixtures below update in a few seconds.</p>'; } });
      };
    };
    gd.onclick = roll;
  }

  const kd = box.querySelector('#kd-go');
  if (kd) {
    const roll = () => {
      const teams = q.list.map((x) => x.team);
      let best = null;
      for (let t = 0; t < 400 && !best; t++) {
        const p = shuffle(teams);
        const pairs = [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]], [p[6], p[7]]];
        if (pairs.every(([a, b]) => a.group !== b.group)) best = pairs;
        if (t === 399) best = pairs;
      }
      const pv = box.querySelector('#kd-preview');
      pv.innerHTML = `
        <ul class="draw-ko">${best.map(([a, b], i) => `<li><b>QF${i + 1}</b> ${esc(a.name)} <span class="muted">v</span> ${esc(b.name)}</li>`).join('')}</ul>
        <div class="draw-actions"><button type="button" class="btn-ghost" id="kd-again">Shuffle again</button><button type="button" class="btn" id="kd-use">Use this draw</button></div>`;
      pv.querySelector('#kd-again').onclick = roll;
      pv.querySelector('#kd-use').onclick = (e) => {
        if (!confirm('Use this draw for the quarterfinals?')) return;
        act(e.target, () => call('koDraw', { pairs: best.map(([a, b]) => [a.full, b.full]) }), 'Quarterfinals drawn ✓').then((ok) => { if (ok) { st.matches = null; pv.innerHTML = '<p class="muted small">Saved — see the Knockouts page.</p>'; } });
      };
    };
    kd.onclick = roll;
  }
}

/* ======================================================= generic editor */

/**
 * Lists the rows of a sheet tab with Add / Edit / Delete.
 * cols: [key, label, type ('text'|'textarea'|'number'|'select'), options]
 */
async function editor(el, tab, { cols, filter = null, defaults = {}, summary = null, addLabel = 'Add', empty = 'Nothing here yet.', thumb = null, reverse = false }) {
  el.innerHTML = loadingHtml();
  const data = await call('list', { tab });
  let rows = data.rows.filter((r) => !filter || filter(r.values));
  if (reverse) rows = rows.reverse();
  const field = ([k, label, type, opts], v = '') => {
    const val = v == null ? '' : v;
    const input = type === 'textarea' ? `<textarea name="${esc(k)}" rows="3">${esc(val)}</textarea>`
      : type === 'select' ? `<select name="${esc(k)}">${opts.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o || '—']; return `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`
        : `<input name="${esc(k)}" value="${esc(val)}"${type === 'number' ? ' inputmode="numeric"' : ''}>`;
    return `<label>${esc(label)} ${input}</label>`;
  };
  const sum = summary || ((v) => esc(cols.map(([k]) => v[k]).filter(Boolean).slice(0, 2).join(' · ')));
  el.innerHTML = `
    <details class="card add-box"><summary class="btn">${icon('arrow', 'ic ic-sm')} ${esc(addLabel)}</summary>
      <form class="ed-form" data-add>${cols.map((c) => field(c, defaults[c[0]])).join('')}<button type="submit" class="btn">Save</button></form>
    </details>
    ${rows.length ? `<ul class="ed-list">${rows.map((r) => `
      <li class="card ed-item" data-row="${r._row}">
        <div class="ed-sum">${thumb ? thumb(r.values) : ''}<span class="ed-text">${sum(r.values)}</span>
          <span class="ed-btns"><button type="button" class="btn-ghost" data-edit>Edit</button><button type="button" class="btn-ghost danger" data-del>Delete</button></span></div>
        <form class="ed-form" data-save hidden>${cols.map((c) => field(c, r.values[c[0]])).join('')}<button type="submit" class="btn">Save changes</button></form>
      </li>`).join('')}</ul>` : `<p class="muted">${esc(empty)}</p>`}`;
  const values = (form) => Object.fromEntries(cols.map(([k]) => [k, form[k].value.trim()]));
  const reload = () => editor(el, tab, { cols, filter, defaults, summary, addLabel, empty, thumb, reverse });
  el.querySelector('[data-add]').onsubmit = (e) => {
    e.preventDefault();
    act(e.target.querySelector('button'), () => call('add', { tab, values: values(e.target) }), 'Added ✓').then((ok) => ok && reload());
  };
  el.querySelectorAll('.ed-item').forEach((li) => {
    const r = rows.find((x) => x._row === +li.dataset.row);
    li.querySelector('[data-edit]').onclick = () => { const f = li.querySelector('[data-save]'); f.hidden = !f.hidden; };
    li.querySelector('[data-save]').onsubmit = (e) => {
      e.preventDefault();
      act(e.target.querySelector('button'), () => call('update', { tab, row: r._row, values: values(e.target), before: r._raw }), 'Saved ✓').then((ok) => ok && reload());
    };
    li.querySelector('[data-del]').onclick = (e) => {
      if (!confirm('Delete this? It will be removed from the sheet.')) return;
      act(e.target, () => call('remove', { tab, row: r._row, before: r._raw }), 'Deleted ✓').then((ok) => ok && reload());
    };
  });
}

/* ================================================================ squads */

function tabSquads(el) {
  if (needModel(el)) return;
  const teams = [...model.teamList].sort((a, b) => a.name.localeCompare(b.name));
  if (!st.squadTeam) st.squadTeam = teams[0] ? teams[0].key : '';
  const t = model.teams.get(st.squadTeam);
  el.innerHTML = `
    <label class="select full"><span class="sr-only">Team</span><select id="sq-team">${teams.map((x) => `<option value="${esc(x.key)}"${x.key === st.squadTeam ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div id="sq-ed"></div>`;
  el.querySelector('#sq-team').onchange = (e) => { st.squadTeam = e.target.value; tabSquads(el); };
  return editor(el.querySelector('#sq-ed'), 'Players', {
    cols: [['Player', 'Name', 'text'], ['Number', 'Shirt number', 'number'], ['Position', 'Position', 'select', ['', 'GK', 'DF', 'MF', 'FW']], ['Team', 'Team', 'select', teams.map((x) => [x.name, x.name])]],
    filter: (v) => teamKey(v.Team) === st.squadTeam,
    defaults: { Team: t ? t.name : '' },
    summary: (v) => `${v.Number ? `<b class="num-chip">${esc(v.Number)}</b>` : ''}${esc(v.Player)}${v.Position ? ` <span class="muted small">${esc(v.Position)}</span>` : ''}`,
    addLabel: 'Add a player',
    empty: 'No players in this squad yet.',
  });
}

/* ================================================================ photos */

function tabPhotos(el) {
  el.innerHTML = `
    <form class="card pad upload" id="up-form">
      <h3 class="a-h">${icon('camera', 'ic ic-sm')} Upload photos</h3>
      <p class="muted small">Pick one or more photos from your phone. They are made smaller, saved to the "Kyogyera League Photos" folder in Google Drive, and appear in the Gallery.</p>
      <input type="file" name="files" accept="image/*" multiple required>
      <label>Caption <input name="caption" placeholder="e.g. Kick-off: BATAKA v ABOMUTIMA"></label>
      <label>Season <input name="season" placeholder="Leave empty for this season"></label>
      <button type="submit" class="btn">Upload</button>
      <p class="muted small" id="up-status"></p>
    </form>
    <div id="ph-ed"></div>`;
  const f = el.querySelector('#up-form');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const files = [...f.files.files];
    const status = el.querySelector('#up-status');
    const b = f.querySelector('button');
    b.disabled = true;
    let done = 0;
    for (const file of files) {
      status.textContent = `Uploading ${done + 1} of ${files.length}…`;
      try {
        const data = await shrink(file);
        await call('uploadPhoto', { data, caption: f.caption.value.trim(), season: f.season.value.trim() });
        done++;
      } catch (ex) { handleError(ex); break; }
    }
    b.disabled = false;
    status.textContent = done ? `${done} photo${done === 1 ? '' : 's'} uploaded ✓` : '';
    if (done) { toast('Uploaded ✓'); requestRefresh(); f.reset(); loadPhotos(); }
  };
  const loadPhotos = () => editor(el.querySelector('#ph-ed'), 'Photos', {
    cols: [['Url', 'Photo link (Drive link or file name)', 'text'], ['Caption', 'Caption', 'text'], ['Season', 'Season (empty = this season)', 'text'], ['Team', 'Team (optional)', 'text'], ['MatchID', 'Match ID (optional)', 'text'], ['Credit', 'Photographer', 'text']],
    addLabel: 'Add a photo by link',
    summary: (v) => `${esc(v.Caption || '(no caption)')}<br><span class="muted small">${esc(v.Season || 'This season')}</span>`,
    thumb: (v) => `<img class="ed-thumb" src="${esc(thumbFor(v.Url))}" alt="" loading="lazy">`,
    reverse: true,
  });
  return loadPhotos();
}

function thumbFor(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{20,})/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
  if (url && !/^(https?:)?\/\//.test(url) && !url.includes('/')) return 'assets/photos/thumbs/' + url;
  return url;
}

// Resize on the phone before uploading (max 1600px, JPEG) so uploads are quick on mobile data.
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error(file.name + ' is not a photo the browser can read.'));
    img.src = URL.createObjectURL(file);
  });
}

/* ====================================================== info & settings */

async function tabInfo(el) {
  el.innerHTML = `<h3 class="a-h">Settings (Config tab)</h3><div id="cfg-ed"></div><h3 class="a-h">Rules &amp; contacts (Info tab)</h3><div id="info-ed"></div>`;
  await editor(el.querySelector('#cfg-ed'), 'Config', {
    cols: [['Key', 'Setting', 'select', ['LeagueName', 'Venue', 'Season', 'MatchDate', 'LastUpdated', 'About', 'MapQuery', 'Directions']], ['Value', 'Value', 'textarea']],
    summary: (v) => `<b>${esc(v.Key)}</b><br><span class="muted small">${esc(String(v.Value).slice(0, 90))}${String(v.Value).length > 90 ? '…' : ''}</span>`,
    addLabel: 'Add a setting',
  });
  await editor(el.querySelector('#info-ed'), 'Info', {
    cols: [['Section', 'Section', 'select', ['Rules', 'Contacts', 'About', 'Match day']], ['Title', 'Title', 'text'], ['Body', 'Text (for Contacts: include the phone number)', 'textarea'], ['Link', 'Link (optional)', 'text']],
    summary: (v) => `<b>${esc(v.Title)}</b> <span class="muted small">${esc(v.Section)}</span>`,
    addLabel: 'Add a rule or contact',
  });
}

function tabTeams(el) {
  return editor(el, 'Teams', {
    cols: [['TeamName', 'Team name (with years)', 'text'], ['Group', 'Group', 'select', ['A', 'B', 'C', 'D']], ['Badge', 'Badge (file name in assets/badges or image link)', 'text'], ['Short', '3-letter code', 'text']],
    summary: (v) => `<b>${esc(v.TeamName)}</b> <span class="muted small">Group ${esc(v.Group)}</span>`,
    addLabel: 'Add a team',
  });
}

/* ========================================================== admin only */

function tabAnnounce(el) {
  const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `
    <form class="card pad" id="ann-form">
      <h3 class="a-h">${icon('megaphone', 'ic ic-sm')} Post an announcement</h3>
      <textarea name="message" rows="3" placeholder="e.g. QF1 delayed 15 minutes" required></textarea>
      <label class="check"><input type="checkbox" name="urgent"> Urgent (shows in red)</label>
      <button type="submit" class="btn">Post to every page</button>
    </form>
    <div id="ann-ed"></div>`;
  const f = el.querySelector('#ann-form');
  const load = () => editor(el.querySelector('#ann-ed'), 'Announcements', {
    cols: [['Time', 'Time', 'text'], ['Message', 'Message', 'textarea'], ['Level', 'Level', 'select', [['', 'Normal'], ['Urgent', 'Urgent']]], ['Active', 'Showing?', 'select', [['yes', 'Yes — showing'], ['no', 'No — hidden']]]],
    summary: (v) => `${v.Active === 'no' ? '<span class="muted small">(hidden)</span> ' : ''}${v.Level === 'Urgent' ? '<b class="urgent-chip">URGENT</b> ' : ''}<b>${esc(v.Time)}</b> ${esc(v.Message)}`,
    addLabel: 'Add with full options', reverse: true,
  });
  f.onsubmit = (e) => {
    e.preventDefault();
    act(f.querySelector('button'), () => call('add', { tab: 'Announcements', values: { Time: now(), Message: f.message.value.trim(), Level: f.urgent.checked ? 'Urgent' : '', Active: 'yes' } }), 'Posted ✓')
      .then((ok) => { if (ok) { f.reset(); load(); } });
  };
  return load();
}

async function tabSponsors(el) {
  el.innerHTML = `<h3 class="a-h">Adverts (slide across every page)</h3><div id="ads-ed"></div><h3 class="a-h">Sponsors (logos on Home, Info and footers)</h3><div id="sp-ed"></div>`;
  await editor(el.querySelector('#ads-ed'), 'Ads', {
    cols: [['Message', 'Message', 'textarea'], ['Call', 'Phone to call', 'text'], ['WhatsApp', 'WhatsApp number', 'text'], ['Link', 'Or a website link', 'text'], ['Active', 'Showing?', 'select', [['yes', 'Yes — showing'], ['no', 'No — hidden']]]],
    defaults: { Active: 'yes' },
    summary: (v) => `${v.Active === 'no' ? '<span class="muted small">(hidden)</span> ' : ''}${esc(v.Message)}`,
    addLabel: 'Add an advert',
  });
  await editor(el.querySelector('#sp-ed'), 'Sponsors', {
    cols: [['Name', 'Sponsor name', 'text'], ['Logo', 'Logo (image link, or file name in assets/sponsors)', 'text'], ['Url', 'Website (optional)', 'text'], ['Tier', 'Tier (e.g. Main, Partner)', 'text']],
    summary: (v) => `<b>${esc(v.Name)}</b> <span class="muted small">${esc(v.Tier)}</span>`,
    addLabel: 'Add a sponsor',
  });
}

async function tabCodes(el) {
  el.innerHTML = loadingHtml();
  const { people } = await call('codes');
  const roleOpts = Object.entries(ROLE_NAMES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  el.innerHTML = `
    <div class="card pad note-card"><p>Everyone signs in with their own 6-digit code. Codes are stored securely inside the sheet's script, so they <b>can't be shown again</b> — if someone forgets theirs, give them a new one here. <b>Referee</b>: match console only. <b>Editor</b>: everything except announcements, sponsors, ads and codes.</p></div>
    <div id="code-new"></div>
    <ul class="ed-list">${people.map((p) => `
      <li class="card ed-item"><div class="ed-sum"><span class="ed-text"><b>${esc(p.name)}</b> <span class="role-chip role-${esc(p.role)}">${esc(ROLE_NAMES[p.role])}</span></span>
        <span class="ed-btns"><button type="button" class="btn-ghost" data-reset="${esc(p.id)}">New code</button><button type="button" class="btn-ghost danger" data-remove="${esc(p.id)}">Remove</button></span></div></li>`).join('')}</ul>
    <form class="card pad ed-form" id="code-add"><h3 class="a-h">Give someone a code</h3>
      <label>Name <input name="name" placeholder="e.g. Assistant referee" required></label>
      <label>Role <select name="role">${roleOpts}</select></label>
      <button type="submit" class="btn">Create code</button></form>`;
  const showPin = (d) => {
    el.querySelector('#code-new').innerHTML = `<div class="card pad pin-card"><p>New code for <b>${esc(d.name)}</b> (${esc(ROLE_NAMES[d.role])}):</p><p class="pin-big">${esc(d.pin)}</p><p class="muted small">Write it down or send it privately — it won't be shown again.</p></div>`;
    el.querySelector('#code-new').scrollIntoView({ block: 'center' });
  };
  el.querySelectorAll('[data-reset]').forEach((b) => {
    b.onclick = () => { if (confirm('Make a new code for this person? Their old code stops working.')) act(b, () => call('resetCode', { id: b.dataset.reset }), 'New code made ✓').then((d) => d && showPin(d)); };
  });
  el.querySelectorAll('[data-remove]').forEach((b) => {
    b.onclick = () => { if (confirm('Remove this person\'s code? They will be signed out.')) act(b, () => call('removeCode', { id: b.dataset.remove }), 'Removed ✓').then((ok) => ok && tabCodes(el)); };
  });
  const f = el.querySelector('#code-add');
  f.onsubmit = (e) => {
    e.preventDefault();
    act(f.querySelector('button'), () => call('addCode', { name: f.name.value.trim(), role: f.role.value }), 'Code created ✓')
      .then((d) => { if (d) { tabCodes(el).then(() => showPin(d)); } });
  };
}

async function tabLog(el) {
  el.innerHTML = loadingHtml();
  const { rows } = await call('log');
  el.innerHTML = rows.length ? `<ul class="log-list">${rows.map((r) => `
    <li><span class="muted small">${esc(r.time)}</span><b>${esc(r.who)}</b> <span class="role-chip">${esc(r.role)}</span><span>${esc(r.action)}</span></li>`).join('')}</ul>`
    : '<p class="muted">No activity yet.</p>';
}
