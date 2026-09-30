import { runPage, esc, href, pageHero, sectionHead, crest, icon, plural, playerLink, teamLink } from '../ui.js';
import { awardCardImage, shareCanvas } from '../share.js';

const top = (list, value, tie = () => 0) => {
  const best = Math.max(0, ...list.map(value));
  return best > 0 ? list.filter((x) => value(x) === best).sort(tie) : [];
};

runPage('awards', (model, page) => {
  const P = model.players, T = model.teamList.filter((t) => t.stats.p);
  const done = !!model.champion;
  const final = model.bySlot.FINAL;
  const runnerUp = done && final ? (final.home === model.champion ? final.away : final.home) : null;
  const perGame = (t, v) => (t.stats.p ? v / t.stats.p : 0);
  const defence = T.length ? [...T].sort((a, b) => perGame(a, a.stats.ga) - perGame(b, b.stats.ga) || b.stats.cs - a.stats.cs) : [];
  const fair = T.length ? [...T].sort((a, b) => perGame(a, a.stats.yellow + a.stats.red * 3) - perGame(b, b.stats.yellow + b.stats.red * 3)) : [];
  const awards = [
    { id: 'champ', ic: 'trophy', title: 'Champions', who: model.champion ? [{ kind: 'team', x: model.champion }] : [], value: runnerUp ? `beat ${runnerUp.name} in the final` : '' },
    { id: 'boot', ic: 'ball', title: 'Golden Boot', who: top(P, (p) => p.goals, (a, b) => b.assists - a.assists).map((x) => ({ kind: 'player', x })), value: (w) => plural(w.goals, 'goal') },
    { id: 'assist', ic: 'arrow', title: 'Top Assists', who: top(P, (p) => p.assists).map((x) => ({ kind: 'player', x })), value: (w) => plural(w.assists, 'assist') },
    { id: 'motm', ic: 'star', title: 'Man of the Match King', who: top(P, (p) => p.motm, (a, b) => b.goals - a.goals).map((x) => ({ kind: 'player', x })), value: (w) => plural(w.motm, 'award') },
    { id: 'attack', ic: 'ball', title: 'Best Attack', who: top(T, (t) => t.stats.gf).map((x) => ({ kind: 'team', x })), value: (w) => plural(w.stats.gf, 'goal') + ' scored' },
    { id: 'defence', ic: 'shield', title: 'Best Defence', who: defence.length ? [{ kind: 'team', x: defence[0] }] : [], value: (w) => `${perGame(w, w.stats.ga).toFixed(2)} conceded per match · ${plural(w.stats.cs, 'clean sheet')}` },
    { id: 'fair', ic: 'card', title: 'Fair Play', who: fair.length && model.tournament.yellow + model.tournament.red ? [{ kind: 'team', x: fair[0] }] : [], value: (w) => `${w.stats.yellow} yellow, ${w.stats.red} red` },
  ];
  const nameOf = (w) => w.x.name;
  page.innerHTML = pageHero('Awards', done ? 'The winners of this season.' : 'The race so far — these become final after the last match.') + `
  <div class="wrap">
    <section class="section">
      ${done ? '' : '<p class="badge badge-live">Provisional — the tournament is still going</p>'}
      <div class="award-grid">${awards.map((a) => {
        const w = a.who[0];
        const val = w ? (typeof a.value === 'function' ? a.value(w.x) : a.value) : '';
        return `<article class="award-card${a.id === 'champ' && w ? ' champ' : ''}">
          <span class="award-ic">${icon(a.ic)}</span>
          <h3>${esc(a.title)}</h3>
          <div class="aw-who">${w ? a.who.map((x) => x.kind === 'team' ? teamLink(x.x, { years: false }) : `<span class="team">${x.x.team ? crest(x.x.team) : ''}<span class="tn"><span class="tname">${playerLink(x.x)}</span><span class="tyears">${esc(x.x.team ? x.x.team.name : '')}</span></span></span>`).join('') : '<span class="muted">To be decided</span>'}</div>
          ${val ? `<p class="aw-val">${esc(val)}${a.who.length > 1 ? ` <span class="muted small">(shared by ${a.who.length})</span>` : ''}</p>` : ''}
          ${w ? `<button type="button" class="btn-ghost" data-share="${a.id}">${icon('arrow', 'ic ic-xs')} Share</button>` : ''}
        </article>`;
      }).join('')}</div>
    </section>
    <p class="muted small center">Awards are worked out automatically from the results. <a href="${href('stats.html')}">See all stats</a></p>
  </div>`;
  page.querySelectorAll('[data-share]').forEach((b) => {
    b.onclick = async () => {
      const a = awards.find((x) => x.id === b.dataset.share);
      const w = a.who[0];
      const sub = typeof a.value === 'function' ? a.value(w.x) : a.value;
      b.disabled = true;
      const canvas = await awardCardImage(a.title, a.who.map(nameOf).join(' & '), sub, model);
      await shareCanvas(canvas, `kyogyera-${a.id}.png`, `${a.title}: ${a.who.map(nameOf).join(' & ')} · Kyogyera League`);
      b.disabled = false;
    };
  });
});
