import { runPage, esc, pageHero, segTabs, matchesByDay, emptyCard, param } from '../ui.js';
import { chronoCmp } from '../model.js';

const VIEWS = ['schedule', 'results', 'fixtures'];
const state = { view: VIEWS.includes(param('view')) ? param('view') : 'schedule', stage: 'ALL', team: '' };
let scrolled = false;
let model = null;

runPage('matches', (m, page) => {
  model = m;
  page.innerHTML = pageHero('Matches', 'The full match-day schedule, live scores and results. Tap any match for goals, cards, Man of the Match and stats.') +
    '<div class="wrap section"><div id="m-controls"></div><div id="m-list"></div></div>';
  draw();
});

function draw() {
  const stages = [['ALL', 'All']].concat(model.groups.map((g) => [g.id, 'Group ' + g.id]), [['KO', 'Knockouts']]);
  if (!stages.some(([id]) => id === state.stage)) state.stage = 'ALL';
  const teams = [...model.teamList].sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('m-controls').innerHTML = `
    <div class="controls">
      ${segTabs([['schedule', 'Schedule'], ['results', 'Results'], ['fixtures', 'Upcoming']], state.view)}
      <div class="chips hscroll" role="group" aria-label="Filter by stage">
        ${stages.map(([id, label]) => `<button type="button" class="chip-btn${id === state.stage ? ' on' : ''}" data-stage="${id}" aria-pressed="${id === state.stage}">${label}</button>`).join('')}
      </div>
      <label class="select"><span class="sr-only">Team</span>
        <select id="team-filter">
          <option value="">All teams</option>
          ${teams.map((t) => `<option value="${t.key}"${t.key === state.team ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select>
      </label>
    </div>`;

  let list = state.view === 'schedule' ? [...model.matches]
    : model.matches.filter((m) => (state.view === 'results' ? m.played : !m.played));
  if (state.stage === 'KO') list = list.filter((m) => m.stage === 'ko');
  else if (state.stage !== 'ALL') list = list.filter((m) => m.group === state.stage);
  if (state.team) list = list.filter((m) => (m.home && m.home.key === state.team) || (m.away && m.away.key === state.team));
  list.sort(state.view === 'results' ? (a, b) => chronoCmp(b, a) : chronoCmp);

  document.getElementById('m-list').innerHTML = matchesByDay(list, model) ||
    emptyCard(state.view === 'results' ? 'No results yet for this selection — check Upcoming.' : 'No upcoming matches for this selection.');

  // On match day, jump to the live (or next) match the first time the schedule opens.
  if (!scrolled && state.view === 'schedule' && model.anyPlayed) {
    scrolled = true;
    const target = model.liveMatches[0] || model.upcoming[0];
    const el = target && document.getElementById('m-' + target.id);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center', inline: 'nearest' }), 50);
  }
}

document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]');
  if (v) { state.view = v.dataset.view; draw(); return; }
  const s = e.target.closest('[data-stage]');
  if (s) { state.stage = s.dataset.stage; draw(); }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'team-filter') { state.team = e.target.value; draw(); }
});
