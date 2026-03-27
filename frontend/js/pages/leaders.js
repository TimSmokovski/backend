// ===== LEADERS PAGE =====
let timerInterval = null;

function _renderLeadersList(leaders) {
  const page = document.getElementById('page-leaders');
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const listsEl = page.querySelector('.top3-wrap');
  const restEl = page.querySelector('.leaders-list');
  if (listsEl) listsEl.innerHTML = `
    ${renderTop3Item(top3[1], 2)}
    ${renderTop3Item(top3[0], 1)}
    ${renderTop3Item(top3[2], 3)}
  `;
  if (restEl) restEl.innerHTML = rest.map(l => renderLeaderItem(l)).join('');
}

async function renderLeadersPage() {
  const page = document.getElementById('page-leaders');

  page.innerHTML = `
    <div class="section-title">Лидеры</div>
    <div class="leaders-timer">
      <p>До следующего итога по лидерам</p>
      <div class="timer-blocks">
        <div class="timer-block"><div class="timer-val" id="t-days">0</div><div class="timer-label">дней</div></div>
        <div class="timer-block"><div class="timer-val" id="t-hours">0</div><div class="timer-label">часов</div></div>
        <div class="timer-block"><div class="timer-val" id="t-mins">0</div><div class="timer-label">минут</div></div>
        <div class="timer-block"><div class="timer-val" id="t-secs">0</div><div class="timer-label">секунд</div></div>
      </div>
    </div>
    <div class="top3-wrap"></div>
    <div class="leaders-list"></div>
  `;

  startTimer();
  _renderLeadersList(MOCK.leaders);

  try {
    const data = await API.getLeaders();
    if (data && data.length) _renderLeadersList(data);
  } catch (e) {}
}

function _avatarHtml(leader, size) {
  if (leader.photo_url) {
    return `<img src="${leader.photo_url}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
  }
  const letter = (leader.name || 'И')[0].toUpperCase();
  return `<span style="font-size:${Math.round(size * 0.45)}px;font-weight:700;">${letter}</span>`;
}

function renderTop3Item(leader, rank) {
  if (!leader) return '<div class="top3-item"></div>';
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const stars = leader.stars >= 1000000
    ? (leader.stars / 1000000).toFixed(2) + 'M'
    : leader.stars >= 1000
    ? (leader.stars / 1000).toFixed(0) + 'K'
    : leader.stars;

  return `
    <div class="top3-item ${rank === 1 ? 'first' : ''}">
      <div class="top3-rank">${medals[rank]}</div>
      <div class="top3-avatar">${_avatarHtml(leader, 48)}</div>
      <div class="top3-name">${leader.name}</div>
      <div class="top3-stars">${stars} ${_goldStar(18)}</div>
      ${leader.prize ? `<div style="font-size:20px;margin-top:6px">${leader.prize}</div>` : ''}
    </div>
  `;
}

function renderLeaderItem(leader) {
  const stars = leader.stars >= 1000000
    ? (leader.stars / 1000000).toFixed(2) + 'M'
    : leader.stars >= 1000
    ? (leader.stars / 1000).toFixed(0) + 'K'
    : leader.stars;

  return `
    <div class="leader-item">
      <div class="leader-rank">${leader.rank}</div>
      <div class="leader-avatar">${_avatarHtml(leader, 38)}</div>
      <div class="leader-info">
        <div class="leader-name">${leader.name}</div>
        <div class="leader-stars">${stars} ${_goldStar(18)}</div>
      </div>
      <div class="leader-prize">${leader.prize || ''}</div>
    </div>
  `;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  // Следующее воскресенье 00:00 UTC
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + (7 - now.getUTCDay()));
  next.setUTCHours(0, 0, 0, 0);

  timerInterval = setInterval(() => {
    const diff = next - new Date();
    if (diff <= 0) { clearInterval(timerInterval); return; }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const d = document.getElementById('t-days');
    const h = document.getElementById('t-hours');
    const m = document.getElementById('t-mins');
    const s = document.getElementById('t-secs');
    if (d) d.textContent = days;
    if (h) h.textContent = hours;
    if (m) m.textContent = mins;
    if (s) s.textContent = secs;
  }, 1000);
}
