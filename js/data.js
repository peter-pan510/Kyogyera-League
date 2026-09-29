/* Downloads the Google Sheet tabs as CSV, keeps the last good copy on the
 * phone (so the site still works with a weak signal), and refreshes the
 * match-day tabs every REFRESH_SECONDS. */
import { buildModel } from './model.js';

const CFG = window.KYOGYERA_CONFIG || {};
const SHEET_ID = String(CFG.SHEET_ID || '').trim();
const URLS = CFG.SHEET_CSV_URLS || {};
const TAB_NAMES = CFG.TAB_NAMES || {};
const REFRESH_MS = Math.max(15, Number(CFG.REFRESH_SECONDS) || 45) * 1000;
const SLOW_REFRESH_MS = Math.max(60, Number(CFG.SLOW_REFRESH_SECONDS) || 300) * 1000;
export const DEMO = /[?&]demo\b/.test(location.search);

// live: re-downloaded every REFRESH_SECONDS; others every SLOW_REFRESH_SECONDS.
// expect: header columns that prove we got the right tab (each inner list = "any of these").
export const TABS = {
  teams: { tab: 'Teams', required: true, expect: [['teamname']] },
  groupFixtures: { tab: 'GroupFixtures', required: true, live: true, expect: [['teamhome'], ['group']] },
  knockoutFixtures: { tab: 'KnockoutFixtures', live: true, expect: [['slot', 'round']] },
  config: { tab: 'Config', expect: [['key'], ['value']] },
  goals: { tab: 'Goals', live: true, expect: [['scorer']] },
  cards: { tab: 'Cards', live: true, expect: [['card']] },
  matchStats: { tab: 'MatchStats', live: true, expect: [['corners', 'shots', 'possession', 'fouls']] },
  players: { tab: 'Players', expect: [['player'], ['team']] },
  goalsForm: { tab: 'GoalsForm', live: true, expect: [['timestamp'], ['scorer', 'scorertyped']] },
  cardsForm: { tab: 'CardsForm', live: true, expect: [['timestamp'], ['card']] },
  motmForm: { tab: 'MOTMForm', live: true, expect: [['timestamp'], ['player', 'playertyped']] },
  announcements: { tab: 'Announcements', live: true, expect: [['message']] },
  info: { tab: 'Info', expect: [['section'], ['body']] },
  photos: { tab: 'Photos', expect: [['url', 'photo', 'link']] },
  sponsors: { tab: 'Sponsors', expect: [['logo', 'sponsor']] },
  ads: { tab: 'Ads', live: true, expect: [['message'], ['whatsapp', 'call', 'link']] },
};
const KEYS = Object.keys(TABS);
const CACHE_KEY = 'kyogyera:raw:v2:' + (DEMO ? 'demo' : 'live');

/* ------------------------------------------------------------------- CSV */

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// -> { headers: [original header text], rows: [{ normalizedheader: value }] }
// Repeated headers (Google Forms makes one "Scorer" column per team section)
// are merged: the first non-empty value wins.
export function toTable(text) {
  const rows = parseCSV(text || '');
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const keys = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return {
    headers,
    rows: rows.slice(1)
      .filter((r) => r.some((c) => c.trim() !== ''))
      .map((r) => {
        const o = {};
        keys.forEach((k, i) => {
          if (!k) return;
          const v = (r[i] || '').trim();
          if (!o[k]) o[k] = v;
        });
        return o;
      }),
  };
}

/* ----------------------------------------------------------------- fetch */

// Where each tab comes from, in order of preference:
//  1. SHEET_ID  → Google's live CSV export (updates within seconds; sheet shared "anyone with the link")
//  2. SHEET_CSV_URLS[key] → "Publish to web" CSV link (can lag a few minutes)
//  3. data/<Tab>.csv in this repo (starter data, or data/demo/ with ?demo)
export function sourceFor(key) {
  const tab = TAB_NAMES[key] || TABS[key].tab;
  if (DEMO) return { url: 'data/demo/' + TABS[key].tab + '.csv', kind: 'demo' };
  if (SHEET_ID) {
    return { url: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`, kind: 'sheet' };
  }
  if ((URLS[key] || '').trim()) return { url: URLS[key].trim(), kind: 'published' };
  return { url: 'data/' + TABS[key].tab + '.csv', kind: 'local' };
}

export async function fetchTab(key) {
  const { url, kind } = sourceFor(key);
  const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
  const name = TABS[key].tab;
  if (!res.ok) {
    // Missing optional tabs are fine — the feature just stays hidden.
    if (!TABS[key].required && (res.status === 404 || (kind === 'sheet' && res.status === 400))) return '';
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (/^\s*</.test(text)) {
    if (!TABS[key].required) return '';
    throw new Error(kind === 'sheet'
      ? `${name}: Google returned a web page — share the sheet as "Anyone with the link: Viewer".`
      : `${name}: got a web page instead of CSV — publish it as "Comma-separated values (.csv)".`);
  }
  // Google's live export silently returns the FIRST tab when a tab name doesn't exist,
  // so check the header row really belongs to this tab.
  if (text.trim() && !hasExpectedColumns(key, text)) {
    if (!TABS[key].required) return '';
    throw new Error(`${name}: tab not found or its header row is wrong (row 1 must have the column names).`);
  }
  return text;
}

function hasExpectedColumns(key, text) {
  const first = parseCSV(text.slice(0, 2000))[0] || [];
  const cols = new Set(first.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return (TABS[key].expect || []).every((anyOf) => anyOf.some((c) => cols.has(c)));
}

function build(raw) {
  const tables = {};
  KEYS.forEach((k) => { tables[k] = toTable(raw[k]); });
  return buildModel(tables);
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
}
function writeCache(raw) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), raw })); } catch (e) { /* storage full or blocked */ }
}

/**
 * start(onModel, onStatus)
 *  onModel(model)  — called whenever the data changes (and once from the saved copy).
 *  onStatus({ state: 'loading'|'ok'|'stale'|'err', ago, message }) — live indicator.
 */
export function start(onModel, onStatus) {
  const cached = readCache();
  const raw = cached && cached.raw ? { ...cached.raw } : {};
  let lastRawKey = null, lastOk = 0, hasModel = false, failing = false, errMsg = '', inFlight = false, lastSlow = 0;
  const savedAt = cached ? cached.t : 0;

  const emit = () => {
    const rawKey = KEYS.map((k) => raw[k] || '').join('\u0000');
    if (rawKey === lastRawKey) return;
    lastRawKey = rawKey;
    try {
      const model = build(raw);
      hasModel = true;
      onModel(model);
    } catch (e) {
      console.error(e);
      errMsg = 'The score sheet has something the site could not read: ' + e.message;
    }
  };

  const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    return s < 5 ? 'just now' : s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago'
      : new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  const status = () => {
    if (!hasModel) return onStatus({ state: failing ? 'err' : 'loading', message: errMsg });
    if (failing || !lastOk) {
      return onStatus({ state: failing ? 'stale' : 'loading', ago: ago(lastOk || savedAt), message: errMsg });
    }
    onStatus({ state: 'ok', ago: ago(lastOk), message: errMsg });
  };

  if (cached && cached.raw && (raw.teams || raw.groupFixtures)) emit();
  status();

  async function refresh(all) {
    if (inFlight) return;
    inFlight = true;
    const keys = all ? KEYS : KEYS.filter((k) => TABS[k].live);
    const results = await Promise.all(keys.map((k) => fetchTab(k).then((text) => ({ k, text }), (err) => ({ k, err }))));
    const errors = [];
    results.forEach((r) => { if (r.err) errors.push(r.err.message); else raw[r.k] = r.text; });
    const essentialFailed = results.some((r) => r.err && TABS[r.k].required);
    if (essentialFailed) {
      failing = true;
      errMsg = hasModel
        ? (navigator.onLine === false ? 'You are offline — showing the scores saved on this phone.' : 'Could not reach the score sheet — showing the last scores loaded. Retrying automatically.')
        : 'Could not load the league data. ' + errors.join(' · ');
    } else {
      failing = false;
      errMsg = errors.length ? 'Some data could not be loaded: ' + errors.join(' · ') : '';
      lastOk = Date.now();
      if (all) lastSlow = lastOk;
      writeCache(raw);
      emit();
    }
    inFlight = false;
    status();
  }

  refresh(true);
  setInterval(() => {
    if (document.hidden) return;
    refresh(Date.now() - lastSlow > SLOW_REFRESH_MS);
  }, REFRESH_MS);
  setInterval(status, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(Date.now() - lastSlow > SLOW_REFRESH_MS); });
  window.addEventListener('online', () => refresh(true));
}
