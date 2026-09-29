/* Small SVG/HTML charts — no libraries. Colours were checked for the dark
 * navy surface (lightness band, colour-blind separation) and every chart
 * carries text labels, so meaning never relies on colour alone. */
import { esc } from './ui.js';

export const C = {
  win: '#26a37a',
  draw: '#5a6480',
  loss: '#d9622b',
  home: '#b88a22',
  away: '#3b8fe0',
  bar: '#b88a22',
  track: 'rgba(148,170,230,0.12)',
};

const pct = (v, total) => (total ? Math.round((v / total) * 100) : 0);

/**
 * Donut / pie chart.
 * segments: [{ label, value, color }]
 */
export function donut(segments, { size = 150, thickness = 20, big = '', small = '', label = '' } = {}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const live = segments.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 2.5 : 0;
  let offset = 0;
  const arcs = total ? segments.map((s) => {
    if (!s.value) return '';
    const len = (s.value / total) * c;
    const dash = Math.max(len - gap, 0.5);
    const el = `<circle class="donut-seg" r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${s.color}" stroke-width="${thickness}"
      stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})">
      <title>${esc(s.label)}: ${s.value} (${pct(s.value, total)}%)</title></circle>`;
    offset += len;
    return el;
  }).join('') : '';
  return `<figure class="donut" role="img" aria-label="${esc(label || segments.map((s) => `${s.label} ${pct(s.value, total)}%`).join(', '))}">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${C.track}" stroke-width="${thickness}"/>
      ${arcs}
    </svg>
    <figcaption class="donut-center"><b>${big}</b><small>${small}</small></figcaption>
  </figure>`;
}

export function donutLegend(segments, { showCount = true } = {}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return `<ul class="chart-legend">${segments.map((s) => `
    <li><span class="sw" style="background:${s.color}"></span><span class="lg-label">${esc(s.label)}</span>
    <span class="lg-val">${showCount ? `<b>${s.value}</b> · ` : ''}${pct(s.value, total)}%</span></li>`).join('')}</ul>`;
}

export function wdlDonut(s, opts = {}) {
  const segs = [
    { label: 'Won', value: s.w, color: C.win },
    { label: 'Drawn', value: s.d, color: C.draw },
    { label: 'Lost', value: s.l, color: C.loss },
  ];
  return `<div class="donut-block">${donut(segs, { big: s.p ? pct(s.w, s.p) + '%' : '–', small: 'win rate', ...opts })}${donutLegend(segs)}</div>`;
}

/**
 * Ranked horizontal bars (single series — the title names it, no legend).
 * items: [{ html, value, display?, title? }]
 */
export function barList(items, { max = null, color = C.bar, rank = true, unit = '' } = {}) {
  if (!items.length) return '<p class="muted small">No data yet.</p>';
  const top = max != null ? max : Math.max(...items.map((i) => i.value), 0) || 1;
  let lastVal = null, lastRank = 0;
  return `<ol class="barlist">${items.map((it, i) => {
    const rk = it.value === lastVal ? lastRank : i + 1;
    lastVal = it.value; lastRank = rk;
    const w = Math.max((it.value / top) * 100, it.value > 0 ? 2 : 0);
    return `<li title="${esc(it.title || '')}">
      ${rank ? `<span class="bl-rank">${rk}</span>` : ''}
      <span class="bl-main"><span class="bl-label">${it.html}</span>
        <span class="bl-track"><span class="bl-fill" style="width:${w}%;background:${color}"></span></span></span>
      <span class="bl-val">${it.display != null ? it.display : it.value}${unit}</span>
    </li>`;
  }).join('')}</ol>`;
}

/**
 * Vertical columns (e.g. goals by minute). buckets: [{ label, n }]
 */
export function columns(buckets, { color = C.bar, height = 140 } = {}) {
  const top = Math.max(...buckets.map((b) => b.n), 1);
  return `<div class="cols" style="--h:${height}px" role="img" aria-label="${esc(buckets.map((b) => `${b.label}: ${b.n}`).join(', '))}">
    ${buckets.map((b) => `<div class="col" title="${esc(b.label)} min: ${b.n} goal${b.n === 1 ? '' : 's'}">
      <span class="col-val">${b.n}</span>
      <span class="col-bar" style="height:${(b.n / top) * 100}%;background:${color}"></span>
      <span class="col-label">${esc(b.label)}</span></div>`).join('')}
  </div>`;
}

/**
 * Head-to-head stat row: home bar grows left, away bar grows right.
 */
export function compareRow(label, h, a, { unit = '', lowerIsBetter = false } = {}) {
  const total = h + a;
  const hp = total ? (h / total) * 100 : 50, ap = total ? (a / total) * 100 : 50;
  const lead = h === a ? '' : (h > a) !== lowerIsBetter ? 'h' : 'a';
  const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(1)) + unit;
  return `<div class="cmp">
    <div class="cmp-top"><b class="${lead === 'h' ? 'lead' : ''}">${fmt(h)}</b><span>${esc(label)}</span><b class="${lead === 'a' ? 'lead' : ''}">${fmt(a)}</b></div>
    <div class="cmp-bars">
      <span class="cmp-h"><i style="width:${hp}%;background:${C.home}"></i></span>
      <span class="cmp-a"><i style="width:${ap}%;background:${C.away}"></i></span>
    </div>
  </div>`;
}
