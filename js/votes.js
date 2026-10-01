/* Fan votes: "Fans' Man of the Match" (per match, from kick-off) and
 * "Fans' Player of the Tournament". One vote per phone; voting again changes it. */
import { esc, crest } from './ui.js';
import { call } from './admin-api.js';
import { requestRefresh } from './data.js';

function voterId() {
  try {
    let v = localStorage.getItem('kyogyera:vid');
    if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20); localStorage.setItem('kyogyera:vid', v); }
    return v;
  } catch (e) { return ''; }
}
const myVotes = () => { try { return JSON.parse(localStorage.getItem('kyogyera:myvotes') || '{}'); } catch (e) { return {}; } };
function remember(key, name) { const v = myVotes(); v[key] = name; try { localStorage.setItem('kyogyera:myvotes', JSON.stringify(v)); } catch (e) { /* ignore */ } }

/**
 * kind: 'motm' | 'pott'; groups: [[label, [player objects]]]; tally: { list, total }
 */
export function voteBlock({ kind, matchId = '', title, sub = '', groups, tally, closed = false, official = '' }) {
  const key = kind + ':' + (matchId || '');
  const mine = myVotes()[key];
  const top = tally.list.slice(0, 6);
  const max = top.length ? top[0].count : 1;
  const results = tally.total ? `<ol class="vote-results">${top.map((x) => `
      <li><span class="vr-name">${x.team ? crest(x.team) : ''}<span>${esc(x.name)}</span></span>
        <span class="vr-bar"><i style="width:${Math.max(4, (x.count / max) * 100)}%"></i></span>
        <span class="vr-pct">${Math.round((x.count / tally.total) * 100)}%</span></li>`).join('')}</ol>
      <p class="muted small">${tally.total} vote${tally.total === 1 ? '' : 's'} so far</p>` : '<p class="muted small">No votes yet — be the first!</p>';
  const form = closed ? '<p class="muted small">Voting is closed.</p>' : `
    <form class="vote-form" data-vote-kind="${kind}" data-vote-match="${esc(matchId)}">
      <select name="player" required>
        <option value="">${mine ? 'Change your vote…' : 'Choose a player…'}</option>
        ${groups.map(([label, list]) => list.length ? `<optgroup label="${esc(label)}">${list.map((p) => `<option value="${esc(p.name)}"${p.name === mine ? ' selected' : ''}>${esc(p.name)}${p.number ? ' #' + esc(p.number) : ''}</option>`).join('')}</optgroup>` : '').join('')}
      </select>
      <button type="submit" class="btn">${mine ? 'Change vote' : 'Vote'}</button>
      <p class="vote-msg small" role="status">${mine ? `Your vote: <b>${esc(mine)}</b>` : 'One vote per phone.'}</p>
    </form>`;
  return `<article class="card pad vote-card">
    <h3 class="a-h">🗳️ ${esc(title)}</h3>
    ${sub ? `<p class="muted small">${sub}</p>` : ''}
    ${official ? `<p class="small">Official choice: <b>${esc(official)}</b></p>` : ''}
    ${results}${form}
  </article>`;
}

document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-vote-kind]');
  if (!f) return;
  e.preventDefault();
  const player = f.player.value;
  if (!player) return;
  const btn = f.querySelector('button');
  const msg = f.querySelector('.vote-msg');
  btn.disabled = true; msg.textContent = 'Sending your vote…';
  try {
    const d = await call('vote', { kind: f.dataset.voteKind, matchId: f.dataset.voteMatch, player, voter: voterId() });
    remember(f.dataset.voteKind + ':' + (f.dataset.voteMatch || ''), d.voted);
    msg.innerHTML = `${d.changed ? 'Vote changed' : 'Thanks for voting'} ✓ <b>${esc(d.voted)}</b> — results update in a moment.`;
    btn.textContent = 'Change vote';
    requestRefresh();
  } catch (err) {
    msg.textContent = err.message;
  }
  btn.disabled = false;
});
