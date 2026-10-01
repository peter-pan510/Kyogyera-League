/* QR-code poster: A4, prints to PDF, plus a picture version for WhatsApp. */
import { start } from '../data.js';
import { fmtDate } from '../ui.js';

const CFG = window.KYOGYERA_CONFIG || {};
const SITE = CFG.SITE_URL || new URL('./', location.href).href;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function qr(text) {
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q;
}

let model = null;
start((m) => { model = m; draw(); }, () => {});

function draw() {
  const c = model.cfg;
  const date = model.matchDay ? fmtDate(model.matchDay, '', { long: true, noTime: true }) : '';
  document.getElementById('poster').innerHTML = `
    <img class="badge" src="assets/kyogyera-badge.png" alt="Kyogyera League badge">
    <p class="eyebrow">OBs &amp; OGs Football Tournament</p>
    <h1>${esc(c.leaguename || 'Kyogyera League')}</h1>
    <p class="season">${esc((c.season || '').replace(/\s*\(demo data\)/i, ''))}</p>
    ${date ? `<p class="date">${date}</p>` : ''}
    <p class="venue">📍 ${esc(c.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema')}</p>
    <div class="qr">${qr(SITE).createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div>
    <p class="scan">Scan for live scores</p>
    <p class="what">Live scores · Tables · Stats · Photos · Fan votes</p>
    <p class="url">${esc(SITE.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</p>
    ${model.defending ? `<p class="champs">🏆 Defending champions: <b>${esc(model.defending.name)}</b></p>` : '<p class="champs"></p>'}
    <p class="foot">Open your phone camera, point it at the code, and tap the link.</p>`;
}

document.getElementById('print').onclick = () => window.print();

// Picture version (1080×1350) to post on WhatsApp status and groups:
// a faint collage of league photos behind the poster, reshuffled on demand.
const W = 1080, H = 1350, COLS = 4, ROWS = 5;
const loadImg = (src, cors) => new Promise((r) => {
  const i = new Image();
  if (cors) i.crossOrigin = 'anonymous'; // photos from other sites must allow it, or they're skipped
  i.onload = () => r(i); i.onerror = () => r(null); i.src = src;
});
let photoPool = null;
async function photos() {
  if (!photoPool) {
    const list = (model.photos || []).map((p) => p.thumb).filter(Boolean);
    photoPool = (await Promise.all(list.map((src) => loadImg(src, /^https?:/.test(src))))).filter(Boolean);
  }
  return photoPool;
}
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function cover(x, img, dx, dy, dw, dh) {
  const s = Math.max(dw / img.width, dh / img.height), sw = dw / s, sh = dh / s;
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, dx, dy, dw, dh);
}

async function drawPicture() {
  // Canvas text only uses a web font once it's loaded, so load the ones we draw with first.
  await Promise.all(['800 104px "Barlow Condensed"', '700 30px Inter', '600 30px Inter', '500 26px Inter'].map((f) => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1a4a'); g.addColorStop(1, '#050b1f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // Photo collage, then a navy veil so the text and QR stay crisp.
  const pics = await photos();
  if (pics.length) {
    let deck = [];
    const tw = W / COLS, th = H / ROWS;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!deck.length) deck = shuffle(pics);
      cover(x, deck.pop(), c * tw + 3, r * th + 3, tw - 6, th - 6);
    }
    const veil = x.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, 'rgba(11,26,74,0.72)'); veil.addColorStop(0.45, 'rgba(8,18,52,0.8)'); veil.addColorStop(1, 'rgba(5,11,31,0.86)');
    x.fillStyle = veil; x.fillRect(0, 0, W, H);
  }

  const badge = await loadImg('assets/kyogyera-badge-400.webp');
  if (badge) x.drawImage(badge, W / 2 - 130, 50, 260, 260);
  x.textAlign = 'center';
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 12;
  x.fillStyle = '#3ea6ff'; x.font = '700 30px Inter'; x.fillText('OBs & OGs FOOTBALL TOURNAMENT', W / 2, 355);
  x.fillStyle = '#f2c14e'; x.font = '800 104px "Barlow Condensed"'; x.fillText((model.cfg.leaguename || 'Kyogyera League').toUpperCase(), W / 2, 460);
  x.fillStyle = '#ffdd85'; x.font = '800 46px "Barlow Condensed"';
  x.fillText([(model.cfg.season || '').replace(/\s*\(demo data\)/i, ''), model.matchDay ? model.matchDay.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : ''].filter(Boolean).join(' · '), W / 2, 530);
  // QR code on a white card
  const q = qr(SITE), n = q.getModuleCount(), size = 520, cell = size / n, ox = (W - size) / 2, oy = 580;
  x.fillStyle = '#fff'; x.fillRect(ox - 30, oy - 30, size + 60, size + 60);
  x.shadowBlur = 0;
  x.fillStyle = '#0b1638';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) x.fillRect(ox + col * cell, oy + r * cell, Math.ceil(cell), Math.ceil(cell));
  x.shadowBlur = 12;
  x.fillStyle = '#fff'; x.font = '800 54px "Barlow Condensed"'; x.fillText('SCAN FOR LIVE SCORES', W / 2, 1200);
  // The site link, as big as fits the width.
  const link = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');
  let fs = 44;
  do { x.font = `700 ${fs}px Inter`; } while (x.measureText(link).width > W - 80 && --fs > 20);
  x.fillStyle = '#ffdd85'; x.fillText(link, W / 2, 1255);
  x.fillStyle = '#cdd7f5'; x.font = '500 26px Inter'; x.fillText(model.cfg.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema', W / 2, 1310);
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}

// Preview first: shuffle the photos until it looks right, then share or save.
const sheet = document.getElementById('pic-sheet');
const preview = document.getElementById('pic-img');
let current = null;
async function render() {
  sheet.classList.add('busy');
  current = await drawPicture();
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.src = URL.createObjectURL(current);
  sheet.classList.remove('busy');
}
document.getElementById('png').onclick = () => { if (!model) return; sheet.hidden = false; render(); };
document.getElementById('pic-shuffle').onclick = render;
document.getElementById('pic-close').onclick = () => { sheet.hidden = true; };
document.getElementById('pic-share').onclick = async () => {
  if (!current) return;
  const file = new File([current], 'kyogyera-league-qr.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(current); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
};
