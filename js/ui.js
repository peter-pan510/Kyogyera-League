/* Shared layout (header, nav bars, footer) and building blocks used by every page. */
import { DEMO, start } from './data.js';
import { FEEDS, ROUND_LABEL } from './model.js';

/* ---------------------------------------------------------------- basics */

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Link to another page, carrying ?demo along when previewing.
export function href(page, params = {}) {
  const q = new URLSearchParams(params);
  if (DEMO) q.set('demo', '');
  const s = q.toString().replace(/demo=(&|$)/, 'demo$1');
  return page + (s ? '?' + s : '');
}

export const param = (name) => new URLSearchParams(location.search).get(name);

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>',
  matches: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  groups: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  table: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6h1.5M3.5 12h1.5M3.5 18h1.5"/>',
  knockout: '<path d="M3 4h5v6H3M3 14h5v6H3M8 7h4v10H8M12 12h4"/><rect x="16" y="9" width="5" height="6" rx="1"/>',
  stats: '<path d="M5 20V11M11 20V4M17 20v-6M2 20h20"/>',
  teams: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5 7 18.5M8 10 3.5 8.5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  pin: '<path d="M12 21s-7-7.4-7-12a7 7 0 0 1 14 0c0 4.6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  swipe: '<path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4"/>',
  card: '<rect x="7" y="3" width="10" height="16" rx="1.5"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M13 11l8-4v3l-6 3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  megaphone: '<path d="M3 10v4h3l7 4V6L6 10zM16 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
};

export function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export const PAGES = [
  { id: 'home', href: 'index.html', label: 'Home', icon: 'home', desc: 'About the league, latest scores and where to go next.' },
  { id: 'matches', href: 'matches.html', label: 'Matches', icon: 'matches', desc: 'Every fixture and result — tap a match for goals, cards and stats.' },
  { id: 'groups', href: 'groups.html', label: 'Groups', icon: 'groups', desc: 'Group A, B and C standings and the race to qualify.' },
  { id: 'table', href: 'table.html', label: 'Table', icon: 'table', desc: 'The Kyogyera Table — all 11 teams ranked together.' },
  { id: 'knockout', href: 'knockout.html', label: 'Knockouts', icon: 'knockout', desc: 'Who qualified and the bracket from quarterfinals to the final.' },
  { id: 'stats', href: 'stats.html', label: 'Stats', icon: 'stats', desc: 'Top scorers, assists, Man of the Match awards, cards and team stats.' },
  { id: 'teams', href: 'teams.html', label: 'Teams', icon: 'teams', desc: 'Every team’s record, form, win rate and squad.' },
  { id: 'gallery', href: 'gallery.html', label: 'Gallery', icon: 'camera', desc: 'Photos from match day.' },
  { id: 'info', href: 'info.html', label: 'Info', icon: 'info', desc: 'Rules, venue & directions, contacts and sponsors.' },
];
const TOPNAV = ['home', 'matches', 'groups', 'table', 'knockout', 'stats', 'teams'];
const TABBAR = ['home', 'matches', 'groups', 'table', 'stats'];

/* ------------------------------------------------------------------ shell */

let currentPage = 'home';

export function mountShell(pageId) {
  currentPage = pageId;
  const page = $('#page');
  const brand = `
    <a class="brand" href="${href('index.html')}" aria-label="Kyogyera League home">
      <span class="brand-crest">${crestLogo()}</span>
      <span class="brand-text"><b id="brand-name">Kyogyera</b><small>League</small></span>
    </a>`;
  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <div class="wrap topbar-inner">
      ${brand}
      <nav class="topnav" aria-label="Main">
        ${PAGES.filter((p) => TOPNAV.includes(p.id)).map((p) => `<a href="${href(p.href)}"${p.id === pageId ? ' aria-current="page"' : ''}>${p.label}</a>`).join('')}
        <button type="button" class="topnav-more${TOPNAV.includes(pageId) ? '' : ' current'}" data-open-drawer aria-controls="drawer">More ${icon('more', 'ic ic-sm')}</button>
      </nav>
      <span class="live" id="live-status" role="status"><span class="dot"></span><span class="live-text">Loading…</span></span>
    </div>`;
  page.before(header);

  const banners = document.createElement('div');
  banners.innerHTML = `
    ${DEMO ? `<div class="banner banner-demo">Demo mode — made-up scores. <a href="${location.pathname}">Switch to real data</a></div>` : ''}
    <div class="banner banner-error" id="error-banner" hidden></div>
    <div id="announce-bar"></div>`;
  page.before(banners);

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-links">${PAGES.map((p) => `<a href="${href(p.href)}">${p.label}</a>`).join('')}</div>
      <div id="footer-sponsors"></div>
      <p><span id="footer-venue">Kitabuguma Playground, Bishop McAllister, Sheema</span></p>
      <img class="footer-badge" src="${BADGE}" alt="Kyogyera League badge" width="72" height="72" loading="lazy">
      <p class="muted">Scores update automatically from the official score sheet. · <a href="${href('check.html')}">Data check (admin)</a></p>
    </div>`;
  page.after(footer);

  const tabbar = document.createElement('nav');
  tabbar.className = 'tabbar';
  tabbar.setAttribute('aria-label', 'Quick navigation');
  const inBar = TABBAR.includes(pageId);
  tabbar.innerHTML = TABBAR.map((id) => {
    const p = PAGES.find((x) => x.id === id);
    return `<a href="${href(p.href)}"${id === pageId ? ' aria-current="page"' : ''}>${icon(p.icon)}<span>${p.label}</span></a>`;
  }).join('') + `<button type="button" id="more-btn" aria-expanded="false" aria-controls="drawer"${inBar ? '' : ' class="current"'}>${icon('more')}<span>More</span></button>`;
  document.body.appendChild(tabbar);

  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'drawer';
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="drawer-backdrop" data-close></div>
    <div class="drawer-sheet" role="dialog" aria-modal="true" aria-label="All pages">
      <div class="drawer-head"><b>Explore the league</b><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="drawer-grid">
        ${PAGES.map((p) => `<a class="drawer-item${p.id === pageId ? ' current' : ''}" href="${href(p.href)}">${icon(p.icon)}<span><b>${p.label}</b><small>${p.desc}</small></span></a>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(drawer);

  const moreBtn = $('#more-btn');
  const setDrawer = (open) => {
    drawer.hidden = !open;
    moreBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
    if (open) drawer.querySelector('.drawer-item').focus();
  };
  moreBtn.addEventListener('click', () => setDrawer(drawer.hidden));
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-drawer]')) setDrawer(true); });
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) setDrawer(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); });

  // Horizontal scrollers: show edge shadows so people know they can swipe.
  const updateEdges = (el) => {
    el.classList.toggle('can-left', el.scrollLeft > 4);
    el.classList.toggle('can-right', el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  document.addEventListener('scroll', (e) => {
    if (e.target.classList && e.target.classList.contains('hscroll')) updateEdges(e.target);
  }, true);
  const edgeAll = () => document.querySelectorAll('.hscroll').forEach(updateEdges);
  window.addEventListener('resize', edgeAll);
  new MutationObserver(() => requestAnimationFrame(edgeAll)).observe(page, { childList: true, subtree: true });

  // Offline support: cache the site's files on the phone (see sw.js).
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function setStatus(st) {
  const el = $('#live-status');
  if (!el) return;
  el.className = 'live ' + st.state;
  el.querySelector('.live-text').textContent =
    st.state === 'ok' ? 'Live · ' + st.ago
      : st.state === 'stale' ? (navigator.onLine === false ? 'Offline · ' : 'Saved · ') + (st.ago || '')
        : st.state === 'err' ? 'Offline' : 'Loading…';
  el.title = st.state === 'ok' ? 'Scores refresh automatically' : st.message || '';
  const b = $('#error-banner');
  if (b) { b.hidden = !st.message; b.textContent = st.message || ''; }
}

/**
 * Standard page boot: builds the shell, loads the data, and calls
 * render(model) now and again whenever the score sheet changes.
 */
export function runPage(pageId, render) {
  mountShell(pageId);
  const page = $('#page');
  page.innerHTML = '<div class="loading"><span class="spinner"></span>Loading the latest scores…</div>';
  start((model) => {
    applyConfig(model);
    const y = window.scrollY;
    render(model, page);
    window.scrollTo(0, y);
  }, setStatus);
}

function applyConfig(model) {
  renderAnnouncementBar(model);
  renderFooterSponsors(model);
  const name = model.cfg.leaguename || 'Kyogyera League';
  const first = name.replace(/\s+league$/i, '');
  const bn = $('#brand-name'); if (bn) bn.textContent = first;
  const fv = $('#footer-venue'); if (fv && model.cfg.venue) fv.textContent = model.cfg.venue;
  const base = document.title.split(' · ')[0];
  if (!document.title.includes(name)) document.title = base === name ? name : base + ' · ' + name;
}

const BADGE = 'assets/kyogyera-badge-256.webp';

/* ---------------------------------------------------------- announcements */

const DISMISSED_KEY = 'kyogyera:dismissed';
function dismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); } catch (e) { return new Set(); }
}

// Newest active announcement as a banner on every page (can be closed).
function renderAnnouncementBar(model) {
  const bar = $('#announce-bar');
  if (!bar) return;
  const a = model.announcements.find((x) => !dismissed().has(x.id));
  bar.innerHTML = a ? `<div class="announce${a.urgent ? ' urgent' : ''}" role="status">
      <div class="wrap announce-inner">${icon('megaphone', 'ic ic-sm')}
        <span class="announce-text">${a.time ? `<b>${esc(a.time)}</b> · ` : ''}${linkify(a.message)}</span>
        <button type="button" class="announce-x" data-dismiss="${esc(a.id)}" aria-label="Hide this message">${icon('close', 'ic ic-sm')}</button>
      </div></div>` : '';
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dismiss]');
  if (!b) return;
  const d = dismissed(); d.add(b.dataset.dismiss);
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...d].slice(-50))); } catch (err) { /* ignore */ }
  b.closest('.announce').remove();
});

// Escape text, then turn URLs, phone numbers and **bold** into markup.
export function linkify(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(\+?256[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}|0\d{3}[\s-]?\d{3}[\s-]?\d{3})\b/g,
      (m, pre, num) => `${pre}<a href="tel:${num.replace(/[\s-]/g, '')}">${num}</a>`)
    .replace(/\n/g, '<br>');
}

/* --------------------------------------------------------------- sponsors */

export function sponsorLogos(list, cls = '') {
  return `<div class="sponsors ${cls}">${list.map((sp) => {
    const inner = sp.logo ? `<img src="${esc(sp.logo)}" alt="${esc(sp.name)}" loading="lazy">` : `<span class="sp-name">${esc(sp.name)}</span>`;
    return sp.url ? `<a class="sp" href="${esc(sp.url)}" target="_blank" rel="noopener" title="${esc(sp.name)}">${inner}</a>` : `<span class="sp" title="${esc(sp.name)}">${inner}</span>`;
  }).join('')}</div>`;
}

function renderFooterSponsors(model) {
  const el = $('#footer-sponsors');
  if (el) el.innerHTML = model.sponsors.length ? `<p class="sp-title">Proudly supported by</p>${sponsorLogos(model.sponsors, 'sponsors-footer')}` : '';
}

/* ----------------------------------------------------------------- photos */

const photoSets = {};
// Photo grid; tapping a photo opens a full-screen viewer you can swipe through.
export function photoGrid(photos, setId, { limit = 0, showSeason = true } = {}) {
  photoSets[setId] = photos;
  const list = limit ? photos.slice(0, limit) : photos;
  return `<div class="photo-grid">${list.map((ph, i) => `
    <button type="button" class="photo" data-photos="${esc(setId)}" data-i="${i}" aria-label="${esc(ph.caption || 'Open photo')}">
      <img src="${esc(ph.thumb)}" data-full="${esc(ph.full)}" alt="${esc(ph.caption)}" loading="lazy"
        onerror="if(this.dataset.full&&this.getAttribute('src')!==this.dataset.full){this.src=this.dataset.full}else{this.closest('.photo').classList.add('broken')}">
      ${ph.season && showSeason ? `<span class="photo-season">${esc(ph.season)}</span>` : ''}
      ${ph.caption ? `<span class="photo-cap">${esc(ph.caption)}</span>` : ''}
    </button>`).join('')}</div>`;
}

let lb = null;
function openLightbox(setId, index) {
  const list = photoSets[setId];
  if (!list || !list.length) return;
  if (!lb) {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<button type="button" class="lb-x icon-btn" aria-label="Close">${icon('close')}</button>
      <button type="button" class="lb-prev icon-btn" aria-label="Previous photo">${icon('chevL')}</button>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button type="button" class="lb-next icon-btn" aria-label="Next photo">${icon('chevR')}</button>`;
    document.body.appendChild(lb);
    lb.addEventListener('click', (e) => {
      if (e.target.closest('.lb-x') || e.target === lb) close();
      else if (e.target.closest('.lb-prev')) show(lb.i - 1);
      else if (e.target.closest('.lb-next')) show(lb.i + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(lb.i + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(lb.i - 1); else if (e.key === 'ArrowRight') show(lb.i + 1);
    });
  }
  const close = () => { lb.hidden = true; document.body.classList.remove('no-scroll'); };
  const show = (i) => {
    const l = photoSets[lb.set];
    lb.i = (i + l.length) % l.length;
    const ph = l[lb.i];
    lb.querySelector('img').src = ph.full;
    lb.querySelector('img').alt = ph.caption || '';
    lb.querySelector('figcaption').innerHTML = `${ph.season ? `<b>${esc(ph.season)}</b> · ` : ''}${esc(ph.caption)}${ph.credit ? ` <span class="muted">· 📷 ${esc(ph.credit)}</span>` : ''} <span class="muted">(${lb.i + 1}/${l.length})</span>`;
  };
  lb.set = setId;
  lb.hidden = false;
  document.body.classList.add('no-scroll');
  show(index);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-photos]');
  if (b) openLightbox(b.dataset.photos, +b.dataset.i);
});

function crestLogo() {
  return `<img src="${BADGE}" alt="" width="44" height="44">`;
}

/* ---------------------------------------------------------------- teams */

function hueFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}

export function teamColor(team) {
  return team.color || `hsl(${hueFor(team.key)} 55% 38%)`;
}

// Team badge image: a full URL, a path, or just a file name inside assets/badges/.
export function badgeUrl(team) {
  const b = team && team.badge;
  if (!b) return '';
  return /^(https?:)?\/\//.test(b) || b.includes('/') ? b : 'assets/badges/' + b;
}

export function crest(team, size = 'sm') {
  if (!team) return `<span class="crest crest-${size} crest-empty" aria-hidden="true">?</span>`;
  const img = badgeUrl(team);
  // If the badge image fails to load, fall back to the coloured initials.
  return `<span class="crest crest-${size}${img ? ' has-img' : ''}" style="--c:${esc(teamColor(team))}" aria-hidden="true">${esc(team.initials)}${img
    ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}</span>`;
}

export function teamLink(team, { years = true, crestSize = 'sm', link = true } = {}) {
  if (!team) return '<span class="tbd">TBD</span>';
  const inner = `${crest(team, crestSize)}<span class="tn"><span class="tname">${esc(team.name)}</span>${years && team.years ? `<span class="tyears">${esc(team.years)}</span>` : ''}</span>`;
  return link && team.group
    ? `<a class="team" href="${href('team.html', { t: team.slug })}">${inner}</a>`
    : `<span class="team">${inner}</span>`;
}

export function stageBadge(stage) {
  if (!stage) return '';
  const cls = { champ: 'badge-gold', alive: 'badge-live', out: 'badge-out', group: '' }[stage.code] || '';
  return `<span class="badge ${cls}">${stage.code === 'champ' ? icon('trophy', 'ic ic-xs') : ''}${esc(stage.short)}</span>`;
}

export function formDots(form, n = 5, link = true) {
  const last = form.slice(-n);
  if (!last.length) return '<span class="muted">—</span>';
  return `<span class="form">${last.map((f) => {
    const m = f.match;
    const title = `${f.res === 'W' ? 'Won' : f.res === 'L' ? 'Lost' : 'Drew'} ${m.hs}-${m.as} ${m.home.name} v ${m.away.name}${f.pens ? ' (' + f.pens + ' on penalties)' : ''}`;
    return link
      ? `<a class="fd fd-${f.res}" href="${href('match.html', { id: m.id })}" title="${esc(title)}">${f.res}</a>`
      : `<span class="fd fd-${f.res}" title="${esc(title)}">${f.res}</span>`;
  }).join('')}</span>`;
}

/* ---------------------------------------------------------------- dates */

export function fmtDate(p, raw, opts = {}) {
  if (!p) return raw ? esc(raw) : '';
  let out = p.d.toLocaleDateString('en-GB', opts.long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
  if (p.time && !opts.noTime) out += ' · ' + p.d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return esc(out);
}

export function dayKey(m) {
  return m.date ? m.date.d.toDateString() : 'nodate';
}

/* --------------------------------------------------------------- matches */

export function stageLabel(m) {
  return m.stage === 'group' ? 'Group ' + m.group : (ROUND_LABEL[m.round] || m.round) + (m.slot && m.slot !== 'FINAL' ? ' · ' + m.slot : '');
}

export function placeholderFor(model, slot, side) {
  const feed = FEEDS[slot];
  if (!feed) return 'To be confirmed';
  const src = feed[side === 'home' ? 0 : 1];
  const srcMatch = model.bySlot[src];
  return srcMatch && srcMatch.winner ? srcMatch.winner.name : 'Winner ' + src;
}

function scorerSummary(m, side) {
  const bySide = m.goals.filter((g) => g.side === side);
  if (!bySide.length) return '';
  const names = new Map();
  bySide.forEach((g) => {
    const n = g.scorer ? g.scorer.name.split(' ').slice(-1)[0] : 'Goal';
    const k = n + (g.type === 'OG' ? ' (OG)' : '');
    if (!names.has(k)) names.set(k, []);
    names.get(k).push(g.minute ? g.minute.label + (g.type === 'PEN' ? ' P' : '') : (g.type === 'PEN' ? 'P' : ''));
  });
  return [...names].map(([n, mins]) => esc(n) + (mins.filter(Boolean).length ? ' ' + mins.filter(Boolean).join(', ') : '')).join(' · ');
}

export const kickoff = (m) => (m.date && m.date.time ? m.date.d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');

// Match state pill: LIVE / HT / FT / kick-off time.
export function statePill(m) {
  if (m.status === 'HT' && m.live) return '<span class="mc-state is-live">HT</span>';
  if (m.live) return '<span class="mc-state is-live"><i class="live-dot"></i>LIVE</span>';
  if (m.played) return '<span class="mc-state">FT</span>';
  return `<span class="mc-state">${esc(kickoff(m) || 'TBC')}</span>`;
}

export function matchCard(m, model, { showStage = true, upNext = false } = {}) {
  const w = m.stage === 'ko' ? m.winner : m.finished ? (m.hs > m.as ? m.home : m.as > m.hs ? m.away : null) : null;
  const row = (side) => {
    const tm = m[side];
    const sc = side === 'home' ? m.hs : m.as;
    const state = w ? (w === tm ? ' win' : ' lose') : '';
    return `<div class="mc-row${state}">
      ${crest(tm)}
      <span class="mc-name">${tm ? esc(tm.name) : `<span class="tbd">${esc(m.stage === 'ko' ? placeholderFor(model, m.slot, side) : 'TBD')}</span>`}</span>
      <span class="mc-score">${m.played ? sc : ''}</span>
    </div>`;
  };
  const scorers = m.played ? [scorerSummary(m, 'home'), scorerSummary(m, 'away')].filter(Boolean).join(' &nbsp;|&nbsp; ') : '';
  // On a one-day tournament the date is the same for every match, so show the kick-off time instead.
  const when = model.oneDay ? (m.played ? kickoff(m) : '') : (m.played ? '' : fmtDate(m.date, m.dateRaw, { noTime: true }));
  return `<a class="mcard${m.played ? ' played' : ''}${m.live ? ' is-live' : ''}${upNext ? ' is-next' : ''}" href="${href('match.html', { id: m.id })}" id="m-${esc(m.id)}">
    <div class="mc-meta">
      ${upNext ? '<span class="tag tag-next">Up next</span>' : ''}
      ${showStage ? `<span class="tag${m.stage === 'ko' ? ' tag-gold' : ''}">${esc(stageLabel(m))}</span>` : ''}
      <span>${when}</span>
      ${statePill(m)}
    </div>
    ${row('home')}${row('away')}
    ${m.note && m.finished ? `<div class="mc-note">${esc(m.note)}</div>` : ''}
    ${scorers || m.motm ? `<div class="mc-foot">${scorers ? `<span class="mc-goals">${icon('ball', 'ic ic-xs')} ${scorers}</span>` : ''}${m.motm ? `<span class="mc-motm">${icon('star', 'ic ic-xs')} ${esc(m.motm.name)}</span>` : ''}</div>` : ''}
  </a>`;
}

const PHASE_LABEL = { GROUP: 'Group stage', QF: 'Quarterfinals', SF: 'Semifinals', FINAL: 'The Final' };

// Matches under headings: by stage on a one-day tournament, otherwise by date.
export function matchesByDay(list, model, opts = {}) {
  if (!list.length) return '';
  const nextId = model.upcoming.length ? model.upcoming[0].id : null;
  let html = '', last = null;
  list.forEach((m) => {
    const k = model.oneDay ? m.round : dayKey(m);
    if (k !== last) {
      if (last !== null) html += '</div>';
      const title = model.oneDay ? PHASE_LABEL[m.round] || m.round
        : m.date ? fmtDate(m.date, '', { long: true, noTime: true }) : 'Date to be confirmed';
      html += `<h3 class="day-head">${title}</h3><div class="mcard-grid">`;
      last = k;
    }
    html += matchCard(m, model, { ...opts, upNext: m.id === nextId });
  });
  return html + '</div>';
}

/* --------------------------------------------------------------- tables */

const signed = (n) => (n > 0 ? '+' : '') + n;

export const COLS = {
  p: { label: 'P', title: 'Played', v: (r) => r.p },
  w: { label: 'W', title: 'Won', v: (r) => r.w },
  d: { label: 'D', title: 'Drawn', v: (r) => r.d },
  l: { label: 'L', title: 'Lost', v: (r) => r.l },
  gf: { label: 'GF', title: 'Goals for', v: (r) => r.gf },
  ga: { label: 'GA', title: 'Goals against', v: (r) => r.ga },
  gd: { label: 'GD', title: 'Goal difference', v: (r) => signed(r.gd) },
  pts: { label: 'Pts', title: 'Points', v: (r) => r.pts, cls: 'pts' },
  ppg: { label: 'PPG', title: 'Points per game', v: (r) => (r.p ? (r.pts / r.p).toFixed(2) : '–') },
  grp: { label: 'Grp', title: 'Group', v: (r) => esc(r.team.group) },
  form: { label: 'Form', title: 'Last 5 matches', v: (r) => formDots(r.team.stats ? r.team.stats.form : []), cls: 'form-col' },
  stage: { label: 'Status', title: 'How far they have got', v: (r) => stageBadge(r.team.stage), cls: 'stage-col' },
};

/**
 * Premier-League-style table: position and team stay pinned on the left,
 * the stat columns scroll sideways on small screens.
 */
export function standingsTable(rows, { cols = ['p', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts', 'form'], highlight = null, years = true, compact = false, liveAny = false } = {}) {
  const head = cols.map((c) => `<th scope="col" class="${COLS[c].cls || ''}" title="${COLS[c].title}"><abbr title="${COLS[c].title}">${COLS[c].label}</abbr></th>`).join('');
  const body = rows.map((r) => `<tr class="st-${r.status || 'none'}${highlight && r.team === highlight ? ' hl' : ''}">
      <td class="c-pos">${r.pos}</td>
      <th scope="row" class="c-team">${teamLink(r.team, { years: years && !compact })}${r.team.liveNow && (liveAny || r.team.liveNow.stage === 'group') ? `<a class="live-chip" href="${href('match.html', { id: r.team.liveNow.id })}" title="Playing now">LIVE</a>` : ''}</th>
      ${cols.map((c) => `<td class="${COLS[c].cls || ''}">${COLS[c].v(r)}</td>`).join('')}
    </tr>`).join('');
  return `<div class="tbl-wrap hscroll${compact ? ' compact' : ''}"><table class="tbl">
    <thead><tr><th scope="col" class="c-pos">#</th><th scope="col" class="c-team">Team</th>${head}</tr></thead>
    <tbody>${body}</tbody></table></div>`;
}

export const legendQual = () => `<ul class="legend">
  <li><span class="key key-q"></span>Qualifies — top 2</li>
  <li><span class="key key-q3"></span>Qualifies — best 3rd place</li>
</ul>`;

/* ----------------------------------------------------------------- misc */

export function sectionHead(title, sub = '', right = '') {
  return `<div class="section-head"><div><h2>${title}</h2>${sub ? `<p class="section-sub">${sub}</p>` : ''}</div>${right}</div>`;
}

export function pageHero(title, sub = '', kicker = '') {
  return `<div class="page-hero"><div class="wrap">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
}

export const emptyCard = (msg) => `<div class="card empty-card">${msg}</div>`;

// Segmented tabs whose state is kept in the URL hash (so the back button works).
export function segTabs(items, active, name = 'view') {
  return `<div class="seg" role="tablist">${items.map(([id, label]) =>
    `<button type="button" role="tab" data-${name}="${id}" aria-selected="${id === active}" class="${id === active ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}

export function plural(n, word, pl) {
  return n + ' ' + (n === 1 ? word : pl || word + 's');
}
