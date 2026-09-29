import { runPage, esc, pageHero, plural } from '../ui.js';
import { TABS, sourceFor, fetchTab, toTable, DEMO } from '../data.js';

// Admin helper: tests the connection to every sheet tab and lists anything
// in the score sheet the site could not make sense of.
runPage('check', (model, page) => {
  const t = model.tournament;
  const counts = [
    ['Teams', model.teamList.length],
    ['Players in squads (Players tab)', model.players.filter((p) => p.inSquad).length],
    ['Group matches', model.groupMatches.length],
    ['Knockout matches', model.koMatches.length],
    ['Matches with a score', t.played],
    ['Goals logged (Goals tab + form)', t.goalsLogged],
    ['Cards logged (Cards tab + form)', t.yellow + t.red],
    ['Matches with stats (MatchStats tab)', model.matches.filter((m) => m.stats).length],
    ['Man of the Match picks', model.matches.filter((m) => m.motm).length],
    ['Announcements showing', model.announcements.length],
    ['Photos', model.photos.length],
    ['Sponsors', model.sponsors.length],
  ];
  ensureSkeleton(page);
  page.querySelector('#issues').innerHTML = model.issues.length
    ? `<h3 class="h-warn">${plural(model.issues.length, 'thing')} to fix</h3><ul class="issues">${model.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
    : '<h3 class="h-ok">✓ Everything in the score sheet looks good.</h3>';
  page.querySelector('#counts').innerHTML = counts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
});

// The connection test must work even when the sheet can't be loaded at all.
ensureSkeleton(document.getElementById('page'));

function ensureSkeleton(page) {
  if (!page.querySelector('#conn')) {
    page.innerHTML = pageHero('Data check', 'For the league admin: is the sheet connected, and is anything in it wrong?') + `
    <div class="wrap section">
      <article class="card pad" id="issues"></article>
      <article class="card pad" style="margin-top:16px">
        <div class="conn-head"><h3>Connection test</h3><button type="button" class="btn btn-sm" id="conn-run">Test again</button></div>
        <p class="muted small">Downloads every tab now and shows how long it took. "Live link" = the fast Google link (SHEET_ID). "Published" = Publish-to-web link (can lag a few minutes).</p>
        <div id="conn"></div>
      </article>
      <article class="card pad" style="margin-top:16px"><h3>What the site sees</h3><dl class="kv" id="counts"></dl></article>
    </div>`;
    page.querySelector('#issues').innerHTML = '<p class="muted">Waiting for the score sheet… if this doesn\'t change, see the connection test below.</p>';
    runTest();
  }
}

const KIND = { sheet: 'Live link', published: 'Published', local: 'Starter file', demo: 'Demo file' };

async function runTest() {
  const box = document.getElementById('conn');
  box.innerHTML = '<p class="muted">Testing…</p>';
  const rows = await Promise.all(Object.keys(TABS).map(async (k) => {
    const src = sourceFor(k);
    const t0 = performance.now();
    try {
      const text = await fetchTab(k);
      const n = toTable(text).rows.length;
      const ms = Math.round(performance.now() - t0);
      const ok = text !== '' || !TABS[k].required;
      return `<tr><td>${esc(TABS[k].tab)}</td><td>${KIND[src.kind]}</td><td class="${ok ? 'ok' : 'bad'}">${text === '' ? (TABS[k].required ? '✗ empty' : '– not set up') : '✓ ' + plural(n, 'row')}</td><td>${ms} ms</td></tr>`;
    } catch (e) {
      return `<tr><td>${esc(TABS[k].tab)}</td><td>${KIND[src.kind]}</td><td class="bad" colspan="2">✗ ${esc(e.message)}</td></tr>`;
    }
  }));
  box.innerHTML = `${DEMO ? '<p class="muted small">Demo mode is on — this tests the demo files, not your sheet.</p>' : ''}
    <div class="tbl-wrap hscroll"><table class="tbl conn-tbl"><thead><tr><th>Tab</th><th>Source</th><th>Result</th><th>Time</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

document.addEventListener('click', (e) => { if (e.target.id === 'conn-run') runTest(); });
