/* Share cards: draws a square image of a match (or an award) for WhatsApp,
 * then opens the phone's share sheet — or downloads the image on a computer. */
import { teamColor, stageLabel, kickoff } from './ui.js';

const W = 1080;
const FONT_D = '"Barlow Condensed", "Arial Narrow", sans-serif';
const FONT_B = 'Inter, system-ui, sans-serif';

function loadImg(src, cors) {
  return new Promise((resolve) => {
    const i = new Image();
    if (cors) i.crossOrigin = 'anonymous'; // photos from other sites must allow it, or they're skipped
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

// Canvas text only uses a web font once it's loaded, so load the ones we draw with first.
async function fontsReady() {
  if (!document.fonts) return;
  await Promise.all([`800 64px ${FONT_D}`, `700 30px ${FONT_B}`, `600 30px ${FONT_B}`, `500 28px ${FONT_B}`].map((f) => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready;
}

/* ---- one dim crowd / playground photo behind every shared picture */
const CFG = window.KYOGYERA_CONFIG || {};
const SHARE_PHOTOS = (CFG.SHARE_PHOTOS || ['sn1-17.jpg', 'sn1-04.jpg', 'sn1-02.jpg', 'sn1-19.jpg'])
  .map((f) => (/^(https?:)?\/\/|\//.test(f) ? f : 'assets/photos/' + f));
let lastPhoto = -1;
function cover(ctx, img, dx, dy, dw, dh) {
  const s = Math.max(dw / img.width, dh / img.height), sw = dw / s, sh = dh / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, dx, dy, dw, dh);
}

/** Navy background with one of the crowd photos very dim behind it (a different one each time). */
export async function photoBackdrop(ctx, model, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b1a4a'); g.addColorStop(1, '#050b1f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (!SHARE_PHOTOS.length) return false;
  let i = Math.floor(Math.random() * SHARE_PHOTOS.length);
  if (SHARE_PHOTOS.length > 1 && i === lastPhoto) i = (i + 1) % SHARE_PHOTOS.length;
  lastPhoto = i;
  const img = await loadImg(SHARE_PHOTOS[i], /^https?:/.test(SHARE_PHOTOS[i]));
  if (!img) return false;
  cover(ctx, img, 0, 0, w, h);
  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, 'rgba(11,26,74,0.84)'); veil.addColorStop(0.5, 'rgba(8,18,52,0.88)'); veil.addColorStop(1, 'rgba(5,11,31,0.92)');
  ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
  return true;
}

async function base(ctx, model) {
  const withPhotos = await photoBackdrop(ctx, model, W, W);
  const r = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 700);
  r.addColorStop(0, 'rgba(62,166,255,0.35)'); r.addColorStop(1, 'rgba(62,166,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, W);
  if (!withPhotos) { // no photos yet: a few stars instead
    ctx.fillStyle = 'rgba(220,230,255,0.7)';
    for (let i = 0; i < 60; i++) { const x = (i * 197) % W, y = (i * 331) % W; ctx.beginPath(); ctx.arc(x, y, (i % 3) * 0.7 + 0.8, 0, 7); ctx.fill(); }
  }
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; // keeps text readable over the photos
  const badge = await loadImg('assets/kyogyera-badge-400.webp');
  if (badge) ctx.drawImage(badge, W / 2 - 90, 40, 180, 180);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c14e';
  ctx.font = `800 64px ${FONT_D}`;
  ctx.fillText('KYOGYERA LEAGUE', W / 2, 280);
}

function footer(ctx, text) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(242,193,78,0.14)';
  ctx.fillRect(0, W - 110, W, 110);
  ctx.fillStyle = '#cdd7f5';
  ctx.font = `600 30px ${FONT_B}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, W - 62);
  ctx.fillStyle = '#9aa8cf';
  ctx.font = `500 24px ${FONT_B}`;
  ctx.fillText(((window.KYOGYERA_CONFIG || {}).SITE_URL || location.host + location.pathname.replace(/[^/]*$/, '')).replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, W - 28);
}

function fit(ctx, text, maxW, size, weight = 800, font = FONT_D) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
}

async function crest(ctx, team, x, y, r) {
  const img = team && team.badge ? await loadImg(/^(https?:)?\/\//.test(team.badge) || team.badge.includes('/') ? team.badge : 'assets/badges/' + team.badge) : null;
  if (img) { ctx.drawImage(img, x - r, y - r, r * 2, r * 2); return; }
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  ctx.fillStyle = team ? teamColor(team) : '#34427a'; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.62)}px ${FONT_D}`;
  ctx.fillText(team ? team.initials : '?', x, y + 4);
  ctx.textBaseline = 'alphabetic';
}

export async function matchCardImage(m, model) {
  await fontsReady();
  const c = document.createElement('canvas'); c.width = W; c.height = W;
  const ctx = c.getContext('2d');
  await base(ctx, model);
  ctx.fillStyle = '#3ea6ff'; ctx.font = `700 34px ${FONT_B}`; ctx.textAlign = 'center';
  const status = m.live ? (m.status === 'HT' ? 'HALF TIME' : 'LIVE') : m.played ? 'FULL TIME' : `KICK-OFF ${kickoff(m) || 'TBC'}`;
  ctx.fillText(`${stageLabel(m).toUpperCase()} · ${status}`, W / 2, 345);

  const nm = (t, side) => (t ? t.name : side === 'home' ? 'TBD' : 'TBD');
  await crest(ctx, m.home, 250, 500, 95);
  await crest(ctx, m.away, 830, 500, 95);
  ctx.fillStyle = '#fff';
  fit(ctx, nm(m.home, 'home'), 380, 46); ctx.fillText(nm(m.home, 'home'), 250, 650);
  fit(ctx, nm(m.away, 'away'), 380, 46); ctx.fillText(nm(m.away, 'away'), 830, 650);
  ctx.font = `800 ${m.played ? 190 : 110}px ${FONT_D}`;
  ctx.fillStyle = m.played ? '#ffffff' : '#9aa8cf';
  ctx.fillText(m.played ? `${m.hs}–${m.as}` : 'v', W / 2, m.played ? 575 : 540);

  // scorers under each team
  ctx.font = `500 28px ${FONT_B}`; ctx.fillStyle = '#d7def7';
  ['home', 'away'].forEach((side, i) => {
    const lines = m.goals.filter((g) => g.side === side).slice(0, 5)
      .map((g) => `${g.scorer ? g.scorer.name.split(' ').slice(-1)[0] : 'Goal'} ${g.minute ? g.minute.label : ''}${g.type === 'PEN' ? ' (P)' : g.type === 'OG' ? ' (OG)' : ''}`);
    lines.forEach((t, k) => ctx.fillText(t, i ? 830 : 250, 715 + k * 40));
  });
  if (m.note && m.played) { ctx.fillStyle = '#ffdd85'; ctx.font = `600 30px ${FONT_B}`; ctx.fillText(m.note, W / 2, 900); }
  if (m.motm) { ctx.fillStyle = '#ffdd85'; ctx.font = `700 30px ${FONT_B}`; ctx.fillText(`★ Man of the Match: ${m.motm.name}`, W / 2, m.note ? 940 : 920); }
  footer(ctx, (model.cfg.venue || 'Kitabuguma Playground') + (m.date ? ' · ' + m.date.d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''));
  return c;
}

export async function awardCardImage(title, name, sub, model) {
  await fontsReady();
  const c = document.createElement('canvas'); c.width = W; c.height = W;
  const ctx = c.getContext('2d');
  await base(ctx, model);
  ctx.fillStyle = '#3ea6ff'; ctx.font = `700 36px ${FONT_B}`; ctx.textAlign = 'center';
  ctx.fillText((model.cfg.season || '').toUpperCase(), W / 2, 345);
  ctx.fillStyle = '#ffdd85'; fit(ctx, title.toUpperCase(), 900, 96); ctx.fillText(title.toUpperCase(), W / 2, 500);
  ctx.fillStyle = '#ffffff'; fit(ctx, name, 940, 120); ctx.fillText(name, W / 2, 660);
  ctx.fillStyle = '#cdd7f5'; ctx.font = `600 40px ${FONT_B}`; ctx.fillText(sub || '', W / 2, 740);
  footer(ctx, model.cfg.venue || 'Kitabuguma Playground');
  return c;
}

/** Share a canvas via the phone's share sheet (WhatsApp etc.), or download it. */
export async function shareCanvas(canvas, filename, text) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
