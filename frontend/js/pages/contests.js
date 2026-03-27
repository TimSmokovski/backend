// ===== CONTESTS PAGE =====
function renderContestsPage() {
  const page = document.getElementById('page-contests');
  const contests = MOCK.contests;

  page.innerHTML = `
    <div class="section-title">Розыгрыши</div>
    <div class="section-subtitle">Выигрывайте подарки абсолютно бесплатно!</div>
    <div class="contests-list">
      ${contests.map(c => renderContestCard(c)).join('')}
    </div>
  `;
}

function renderContestCard(c) {
  const parts = c.participants >= 1000
    ? (c.participants / 1000).toFixed(1) + 'K'
    : c.participants;

  return `
    <div class="contest-card">
      <div class="contest-prizes">
        ${c.prizes.map((p, i) => `
          <div class="contest-prize-item" style="${i === 0 ? 'transform:scale(1.05)' : ''}">
            <span style="font-size:${i === 0 ? '40px' : '32px'}">${p.emoji}</span>
            <div class="prize-val">${_goldStar(15)} ${p.stars.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="contest-stats">
        <div class="contest-stat">
          <div class="contest-stat-val">${c.prize_count}</div>
          <div class="contest-stat-label">Призы</div>
        </div>
        <div class="contest-stat">
          <div class="contest-stat-val">${parts}</div>
          <div class="contest-stat-label">Участники</div>
        </div>
      </div>
      <button class="btn-join" onclick="joinContest(${c.id})">Участвовать</button>
    </div>
  `;
}

function joinContest(id) {
  showToast('✅ Вы участвуете в розыгрыше!');
  document.getElementById('contests-badge').style.display = 'none';
  // API вызов
  API.joinContest(id);
}
