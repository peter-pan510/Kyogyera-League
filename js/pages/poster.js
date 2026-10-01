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

// Picture version (1080×1350) to post on WhatsApp status and groups.
document.getElementById('png').onclick = async () => {
  if (!model) return;
  // Canvas text only uses a web font once it's loaded, so load the ones we draw with first.
  await Promise.all(['800 104px "Barlow Condensed"', '700 30px Inter', '600 30px Inter', '500 26px Inter'].map((f) => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1a4a'); g.addColorStop(1, '#050b1f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const badge = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'assets/kyogyera-badge-400.webp'; });
  if (badge) x.drawImage(badge, W / 2 - 130, 50, 260, 260);
  x.textAlign = 'center';
  x.fillStyle = '#3ea6ff'; x.font = '700 30px Inter'; x.fillText('OBs & OGs FOOTBALL TOURNAMENT', W / 2, 355);
  x.fillStyle = '#f2c14e'; x.font = '800 104px "Barlow Condensed"'; x.fillText((model.cfg.leaguename || 'Kyogyera League').toUpperCase(), W / 2, 460);
  x.fillStyle = '#ffdd85'; x.font = '800 46px "Barlow Condensed"';
  x.fillText([(model.cfg.season || '').replace(/\s*\(demo data\)/i, ''), model.matchDay ? model.matchDay.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : ''].filter(Boolean).join(' · '), W / 2, 530);
  // QR code on a white card
  const q = qr(SITE), n = q.getModuleCount(), size = 520, cell = size / n, ox = (W - size) / 2, oy = 580;
  x.fillStyle = '#fff'; x.fillRect(ox - 30, oy - 30, size + 60, size + 60);
  x.fillStyle = '#0b1638';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) x.fillRect(ox + col * cell, oy + r * cell, Math.ceil(cell), Math.ceil(cell));
  x.fillStyle = '#fff'; x.font = '800 54px "Barlow Condensed"'; x.fillText('SCAN FOR LIVE SCORES', W / 2, 1200);
  // The site link, as big as fits the width.
  const link = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');
  let fs = 44;
  do { x.font = `700 ${fs}px Inter`; } while (x.measureText(link).width > W - 80 && --fs > 20);
  x.fillStyle = '#ffdd85'; x.fillText(link, W / 2, 1255);
  x.fillStyle = '#9aa8cf'; x.font = '500 26px Inter'; x.fillText(model.cfg.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema', W / 2, 1310);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'kyogyera-league-qr.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
};
