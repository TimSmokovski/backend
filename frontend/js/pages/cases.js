// ===== CASES PAGE =====
const ITEMS = [
  { emoji: '🎒', name: 'Рюкзак', stars: 500, rarity: 'common' },
  { emoji: '👾', name: 'Пришелец', stars: 2814, rarity: 'rare' },
  { emoji: '🧞', name: 'Джинн', stars: 5009, rarity: 'epic' },
  { emoji: '🌿', name: 'Листок', stars: 2404, rarity: 'rare' },
  { emoji: '🧪', name: 'Зелье', stars: 1361, rarity: 'rare' },
  { emoji: '🐻', name: 'Мишка', stars: 4653, rarity: 'epic' },
  { emoji: '🎃', name: 'Тыква', stars: 1257, rarity: 'uncommon' },
  { emoji: '🦊', name: 'Лиса', stars: 800, rarity: 'common' },
  { emoji: '🐉', name: 'Дракон', stars: 9999, rarity: 'legendary' },
  { emoji: '💎', name: 'Алмаз', stars: 7500, rarity: 'legendary' },
  { emoji: '🌊', name: 'Волна', stars: 600, rarity: 'common' },
  { emoji: '⚡', name: 'Молния', stars: 950, rarity: 'uncommon' },
];

const LIVE_WINS = [
  { user: 'Алекс', emoji: '🐉', stars: 9999 },
  { user: 'Мария', emoji: '🧞', stars: 5009 },
  { user: 'Иван', emoji: '💎', stars: 7500 },
  { user: 'Дима', emoji: '🐻', stars: 4653 },
  { user: 'Соня', emoji: '👾', stars: 2814 },
  { user: 'Коля', emoji: '🌿', stars: 2404 },
  { user: 'Оля', emoji: '⚡', stars: 950 },
];

let liveLastIds = [];
let liveItems = [];

async function initLiveBar() {
  const wins = await API.recentWins();
  if (wins && wins.length) {
    liveItems = wins.slice(0, 15).reverse();
    renderLiveBar();
  }
  setInterval(pollLiveBar, 6000);
}

async function pollLiveBar() {
  const wins = await API.recentWins();
  if (!wins || !wins.length) return;
  const bar = document.getElementById('live-bar-items');
  if (!bar) return;

  const newKey = wins[0].emoji + wins[0].stars + wins[0].name;
  const oldKey = liveItems.length
    ? liveItems[liveItems.length-1].emoji + liveItems[liveItems.length-1].stars + liveItems[liveItems.length-1].name
    : '';
  if (newKey === oldKey) return;

  const cutIdx = wins.findIndex(w => w.emoji + w.stars + w.name === oldKey);
  const newWins = cutIdx === -1 ? wins : wins.slice(0, cutIdx);
  if (!newWins.length) return;

  newWins.forEach(win => {
    liveItems.push(win);
    const el = document.createElement('div');
    el.className = 'live-win-item live-emoji-enter';
    el.innerHTML = `<span class="live-win-emoji">${win.emoji}</span><span class="live-win-name">${win.name}</span><span class="live-win-stars">${_goldStar(13)}${win.stars}</span>`;
    bar.appendChild(el);
    setTimeout(() => el.classList.remove('live-emoji-enter'), 50);
  });

  while (liveItems.length > 15) {
    liveItems.shift();
    const first = bar.firstChild;
    if (first) {
      first.classList.add('live-emoji-exit');
      setTimeout(() => first.remove(), 300);
    }
  }

}

function renderLiveBar() {
  const bar = document.getElementById('live-bar-items');
  if (!bar) return;
  bar.innerHTML = liveItems.map(w => `
    <div class="live-win-item">
      <span class="live-win-emoji">${w.emoji}</span>
      <span class="live-win-name">${w.name}</span>
      <span class="live-win-stars">${_goldStar(13)}${w.stars}</span>
    </div>
  `).join('');
}


const _modeIcons = {
  pvp: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 5.5V11.5C4 15.8 7.4 19.7 12 21C16.6 19.7 20 15.8 20 11.5V5.5L12 2Z" fill="white" fill-opacity="0.15" stroke="white" stroke-opacity="0.85" stroke-width="1.4" stroke-linejoin="round"/><line x1="7.5" y1="8" x2="16.5" y2="16" stroke="white" stroke-width="2.2" stroke-linecap="round"/><line x1="16.5" y1="8" x2="7.5" y2="16" stroke="white" stroke-width="2.2" stroke-linecap="round"/><line x1="6" y1="9.4" x2="7.5" y2="8" stroke="white" stroke-opacity="0.6" stroke-width="1.8" stroke-linecap="round"/><line x1="18" y1="9.4" x2="16.5" y2="8" stroke="white" stroke-opacity="0.6" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  free: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" fill="white" fill-opacity="0.88"/><rect x="2" y="7.5" width="20" height="4" rx="1.5" fill="white" fill-opacity="0.65"/><rect x="10.5" y="7.5" width="3" height="14.5" fill="#ff6eb4" fill-opacity="0.9"/><rect x="2" y="10" width="20" height="2.2" fill="#ff6eb4" fill-opacity="0.9"/><path d="M11.5 7.5C9 5 5.5 5.5 5.5 7.5C5.5 9 8.5 9.2 11.5 8.2Z" fill="#ff3d87"/><path d="M12.5 7.5C15 5 18.5 5.5 18.5 7.5C18.5 9 15.5 9.2 12.5 8.2Z" fill="#ff3d87"/></svg>`,
  roulette: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" fill="white" fill-opacity="0.1" stroke="white" stroke-opacity="0.9" stroke-width="1.5"/><circle cx="12" cy="12" r="5.5" fill="white" fill-opacity="0.06" stroke="white" stroke-opacity="0.35" stroke-width="1"/><line x1="12" y1="2.5" x2="12" y2="6.5" stroke="white" stroke-opacity="0.85" stroke-width="1.5"/><line x1="12" y1="17.5" x2="12" y2="21.5" stroke="white" stroke-opacity="0.85" stroke-width="1.5"/><line x1="2.5" y1="12" x2="6.5" y2="12" stroke="white" stroke-opacity="0.85" stroke-width="1.5"/><line x1="17.5" y1="12" x2="21.5" y2="12" stroke="white" stroke-opacity="0.85" stroke-width="1.5"/><line x1="4.8" y1="4.8" x2="7.6" y2="7.6" stroke="white" stroke-opacity="0.55" stroke-width="1.3"/><line x1="16.4" y1="16.4" x2="19.2" y2="19.2" stroke="white" stroke-opacity="0.55" stroke-width="1.3"/><line x1="19.2" y1="4.8" x2="16.4" y2="7.6" stroke="white" stroke-opacity="0.55" stroke-width="1.3"/><line x1="7.6" y1="16.4" x2="4.8" y2="19.2" stroke="white" stroke-opacity="0.55" stroke-width="1.3"/><circle cx="12" cy="12" r="2.6" fill="white" fill-opacity="0.95"/><circle cx="12" cy="3" r="1.3" fill="#ff4444"/></svg>`,
  crash: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C9.8 4.5 8.5 8 8.5 12V15.5H15.5V12C15.5 8 14.2 4.5 12 2Z" fill="white" fill-opacity="0.92"/><path d="M10 5C9.5 7.5 9.5 10 9.5 12L10.5 12C10.5 10 10.5 7.5 11 5Z" fill="white" fill-opacity="0.28"/><path d="M8.5 11L5 17L9 15.5Z" fill="white" fill-opacity="0.78"/><path d="M15.5 11L19 17L15 15.5Z" fill="white" fill-opacity="0.78"/><rect x="9.5" y="15" width="5" height="1.2" rx="0.6" fill="black" fill-opacity="0.12"/><path d="M9.5 16.2C9.5 19 10.5 21.5 12 23C13.5 21.5 14.5 19 14.5 16.2Z" fill="#FFD700" fill-opacity="0.95"/><path d="M11 16.2C11 18.5 11.5 20.5 12 22C12.5 20.5 13 18.5 13 16.2Z" fill="white" fill-opacity="0.5"/><circle cx="12" cy="9" r="2.2" fill="none" stroke="#aee4ff" stroke-opacity="0.9" stroke-width="1.4"/><circle cx="12" cy="9" r="1.1" fill="#aee4ff" fill-opacity="0.65"/></svg>`,
  slots: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6.5" width="20" height="13" rx="2.5" fill="white" fill-opacity="0.12" stroke="white" stroke-opacity="0.85" stroke-width="1.3"/><rect x="3.5" y="8.5" width="5" height="9" rx="1.2" fill="white" fill-opacity="0.18"/><rect x="9.5" y="8.5" width="5" height="9" rx="1.2" fill="white" fill-opacity="0.18"/><rect x="15.5" y="8.5" width="5" height="9" rx="1.2" fill="white" fill-opacity="0.18"/><text x="6" y="16" font-size="7.5" font-weight="900" fill="white" text-anchor="middle" font-family="Arial,sans-serif">7</text><text x="12" y="16" font-size="7.5" font-weight="900" fill="#FFD700" text-anchor="middle" font-family="Arial,sans-serif">7</text><text x="18" y="16" font-size="7.5" font-weight="900" fill="white" text-anchor="middle" font-family="Arial,sans-serif">7</text></svg>`,
  miner: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="14" r="7.5" fill="white" fill-opacity="0.88"/><circle cx="9.5" cy="11.5" r="2.8" fill="white" fill-opacity="0.25"/><path d="M12 6.5C13.5 4 16 3.2 17.5 4" stroke="white" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="18" cy="3.5" r="1.8" fill="#FFD700" fill-opacity="0.95"/><line x1="4.5" y1="14" x2="2.5" y2="14" stroke="white" stroke-opacity="0.85" stroke-width="2.2" stroke-linecap="round"/><line x1="19.5" y1="14" x2="21.5" y2="14" stroke="white" stroke-opacity="0.85" stroke-width="2.2" stroke-linecap="round"/><line x1="12" y1="21.5" x2="12" y2="23.5" stroke="white" stroke-opacity="0.85" stroke-width="2.2" stroke-linecap="round"/><line x1="6.9" y1="19.1" x2="5.5" y2="20.5" stroke="white" stroke-opacity="0.85" stroke-width="2.2" stroke-linecap="round"/><line x1="17.1" y1="19.1" x2="18.5" y2="20.5" stroke="white" stroke-opacity="0.85" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

function renderCasesPage() {
  const page = document.getElementById('page-cases');
  page.innerHTML = `
    <div class="live-bar">
      <div class="live-label">LIVE</div>
      <div class="live-bar-scroll">
        <div class="live-bar-items" id="live-bar-items"></div>
      </div>
    </div>
    <div class="modes-list">
      <div class="mode-card pvp" onclick="openPvp()">
        <div class="mode-icon-wrap pvp-icon">${_modeIcons.pvp}</div>
        <div class="mode-info">
          <div class="mode-name">PvP</div>
          <div class="mode-desc">Сразись с другим игроком</div>
        </div>
        <div class="mode-badge online">● Онлайн</div>
      </div>
      <div class="mode-card free" onclick="openFreeCase()">
        <div class="mode-icon-wrap free-icon">${_modeIcons.free}</div>
        <div class="mode-info">
          <div class="mode-name">Бесплатно</div>
          <div class="mode-desc">1 кейс в день бесплатно</div>
        </div>
        <div class="mode-badge free-badge">Бесплатно</div>
      </div>
      <div class="mode-card roulette" onclick="openRoulette()">
        <div class="mode-icon-wrap roulette-icon">${_modeIcons.roulette}</div>
        <div class="mode-info">
          <div class="mode-name">Рулетка</div>
          <div class="mode-desc">Больше ставка — лучше награды</div>
        </div>
      </div>
      <div class="mode-card crash" onclick="openCrash()">
        <div class="mode-icon-wrap crash-icon">${_modeIcons.crash}</div>
        <div class="mode-info">
          <div class="mode-name">Краш</div>
          <div class="mode-desc">Успей вывести до краша</div>
        </div>
        <div class="mode-badge online">● Онлайн</div>
      </div>
      <div class="mode-card slots" onclick="openSlots()">
        <div class="mode-icon-wrap slots-icon">${_modeIcons.slots}</div>
        <div class="mode-info">
          <div class="mode-name">Слоты</div>
          <div class="mode-desc">Три символа — и ты богач</div>
        </div>
      </div>
      <div class="mode-card" onclick="openMiner()">
        <div class="mode-icon-wrap" style="background:linear-gradient(135deg,#546e7a,#37474f)">${_modeIcons.miner}</div>
        <div class="mode-info">
          <div class="mode-name">Сапёр</div>
          <div class="mode-desc">Найди мины — забери приз</div>
        </div>
      </div>
    </div>
    <div style="padding: 0 12px 12px;">
      <button class="btn-all-cases" style="cursor:default;opacity:0.6" onclick="">🎒 Скоро...</button>
    </div>
  `;
}

// ===== PvP =====
const PVP_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#ff6b35','#e91e63','#00bcd4','#c0ca33'];

let pvpBetInput = 100;
let pvpRefreshTimer = null;
let pvpTickTimer = null;
let pvpLocalTimeLeft = null;

async function openPvp() {
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">⚔️ PvP Котёл</div>
    <div class="pvp-sub">Больше ставка — выше шанс победить</div>
    <div id="pvp-lobby-content">
      <div class="pvp-loading">Загрузка...</div>
    </div>
  `);
  await pvpRefreshLobby();
  // API синхронизация каждые 5 сек
  pvpRefreshTimer = setInterval(pvpRefreshLobby, 5000);
  // Локальный тик каждую секунду
  pvpTickTimer = setInterval(pvpTick, 1000);
}

function pvpTick() {
  if (pvpLocalTimeLeft === null) return;
  pvpLocalTimeLeft = Math.max(0, pvpLocalTimeLeft - 1);
  const valEl = document.querySelector('.pvp-timer-val');
  const fillEl = document.querySelector('.pvp-timer-fill');
  const timerEl = document.querySelector('.pvp-timer');
  if (valEl) valEl.textContent = pvpFormatTime(pvpLocalTimeLeft);
  if (fillEl) fillEl.style.width = `${(pvpLocalTimeLeft / 60) * 100}%`;
  if (timerEl) {
    if (pvpLocalTimeLeft < 30) timerEl.classList.add('urgent');
    else timerEl.classList.remove('urgent');
  }
}

function pvpFormatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildPvpWheel(players) {
  let gradientParts = [];
  let cumulative = 0;
  if (players && players.length > 0) {
    players.forEach((p, i) => {
      const color = PVP_COLORS[i % PVP_COLORS.length];
      const end = Math.min(100, cumulative + parseFloat(p.chance));
      gradientParts.push(`${color} ${cumulative.toFixed(2)}% ${end.toFixed(2)}%`);
      cumulative = end;
    });
    if (cumulative < 99.9) {
      gradientParts.push(`rgba(255,255,255,0.06) ${cumulative.toFixed(2)}% 100%`);
    }
  }
  const style = gradientParts.length
    ? `background:conic-gradient(from -90deg, ${gradientParts.join(', ')})`
    : '';
  return `
    <div class="pvp-wheel-wrap">
      <div class="pvp-wheel${gradientParts.length ? '' : ' pvp-wheel-empty'}"${style ? ` style="${style}"` : ''}></div>
      <div class="pvp-wheel-center">🏆</div>
    </div>`;
}

async function pvpRefreshLobby() {
  const lobby = await API.pvpLobby();
  const content = document.getElementById('pvp-lobby-content');
  if (!content) { clearInterval(pvpRefreshTimer); clearInterval(pvpTickTimer); return; }

  if (!lobby) {
    content.innerHTML = `<div class="pvp-loading">Ошибка соединения</div>`;
    return;
  }

  // Авторазыгрывание с сервера
  if (lobby.auto_resolved) {
    clearInterval(pvpRefreshTimer);
    const res = lobby.auto_resolved;
    hideModal();
    const iWon = res.winner_id == window.appState?.id;
    showWin(iWon ? '🏆' : '💀', iWon ? 'Ты победил!' : `Победил ${res.winner_name}`, `Котёл: ${_goldStar(20)} ${res.total_pot.toLocaleString()}`);
    return;
  }

  const myId = window.appState?.id;
  const iAlreadyBet = lobby.players.some(p => p.user_id == myId);
  const playerCount = lobby.player_count || lobby.players.length;

  // Синхронизируем локальный таймер
  if (lobby.time_left !== null && lobby.time_left !== undefined) {
    pvpLocalTimeLeft = lobby.time_left;
  } else {
    pvpLocalTimeLeft = null;
  }
  const timeLeft = pvpLocalTimeLeft;

  // Статус таймера
  let timerHtml = '';
  if (timeLeft !== null && timeLeft !== undefined) {
    const pct = (timeLeft / 60) * 100;
    const urgent = timeLeft < 30;
    timerHtml = `
      <div class="pvp-timer ${urgent ? 'urgent' : ''}">
        <div class="pvp-timer-val">${pvpFormatTime(timeLeft)}</div>
        <div class="pvp-timer-label">до начала битвы</div>
        <div class="pvp-timer-bar"><div class="pvp-timer-fill" style="width:${pct}%"></div></div>
      </div>`;
  } else if (playerCount < 2) {
    timerHtml = `<div class="pvp-timer-waiting">⏳ Ждём второго игрока...</div>`;
  }

  content.innerHTML = `
    <div class="pvp-cauldron-card">
      <div class="pvp-cauldron-label">🔥 КОТЁЛ</div>
      <div class="pvp-cauldron-val">${_goldStar(22)} ${lobby.total_pot.toLocaleString()}</div>
      <div class="pvp-cauldron-players">${playerCount} / ${lobby.max_players || 10} игроков</div>
    </div>

    ${buildPvpWheel(lobby.players)}

    <div class="pvp-players-list">
      ${playerCount === 0
        ? `<div class="pvp-empty">Пока никого нет. Будь первым!</div>`
        : lobby.players.map((p, i) => {
            const color = PVP_COLORS[i % PVP_COLORS.length];
            return `
              <div class="pvp-player-row ${p.user_id == myId ? 'me' : ''}" style="--player-color:${color}">
                <div class="pvp-player-color-bar"></div>
                <div class="pvp-room-avatar" style="background:linear-gradient(135deg,${color},${color}99)">${p.avatar}</div>
                <div class="pvp-player-info">
                  <div class="pvp-room-name">${p.name}${p.user_id == myId ? ' <span class="pvp-me-tag">ты</span>' : ''}</div>
                  <div class="pvp-chance-bar-wrap">
                    <div class="pvp-chance-bar" style="width:${p.chance}%;background:${color}"></div>
                  </div>
                </div>
                <div class="pvp-player-right">
                  <div class="pvp-room-bet">${_goldStar(14)} ${p.amount.toLocaleString()}</div>
                  <div class="pvp-chance-label" style="color:${color}">${p.chance}%</div>
                </div>
              </div>`;
          }).join('')
      }
    </div>

    ${timerHtml}

    ${!iAlreadyBet ? `
      <div class="pvp-bet-label">Твоя ставка</div>
      <div class="pvp-bet-input-row">
        <input class="pvp-bet-input" id="pvp-bet-input" type="number" min="10"
          value="${pvpBetInput}" placeholder="Сумма" oninput="pvpBetInput=+this.value">
        <button class="btn-pvp-create" onclick="doPvpBet()">Поставить</button>
      </div>
      <div class="pvp-quick-bets">
        ${[50,100,250,500,1000].map(b => `
          <button class="pvp-bet-btn" onclick="pvpSetBet(${b})">${b}</button>
        `).join('')}
      </div>
    ` : `
      <div class="pvp-already-bet">✅ Ты в игре! Ждём остальных...</div>
    `}
  `;
}

function pvpSetBet(val) {
  pvpBetInput = val;
  const input = document.getElementById('pvp-bet-input');
  if (input) input.value = val;
}

async function doPvpBet() {
  const amount = parseInt(document.getElementById('pvp-bet-input')?.value) || pvpBetInput;
  if (amount < 10) { showToast('Минимум 10 звёзд'); return; }
  const res = await API.pvpBet(amount);
  await doPvpBetCheck(res);
}

async function doPvpBetCheck(res) {
  if (!res) { showToast('Ошибка — проверь баланс'); return; }
  if (res.auto_resolved) {
    clearInterval(pvpRefreshTimer);
    const r = res.auto_resolved;
    hideModal();
    const iWon = r.winner_id == window.appState?.id;
    showWin(iWon ? '🏆' : '💀', iWon ? 'Ты победил!' : `Победил ${r.winner_name}`, `Котёл: ${_goldStar(20)} ${r.total_pot.toLocaleString()}`);
    return;
  }
  if (window.appState) window.appState.balance = res.new_balance;
  updateBalance();
  showToast('✅ Ставка принята!');
  await pvpRefreshLobby();
}

// ===== БЕСПЛАТНЫЙ КЕЙС =====
const FREE_ITEMS = [
  { stars: 0,   label: '✕',      rarity: 'common',   color: '#e74c3c' },
  { stars: 5,   label: '⭐ 5',   rarity: 'common' },
  { stars: 10,  label: '⭐ 10',  rarity: 'common' },
  { stars: 15,  label: '⭐ 15',  rarity: 'common' },
  { stars: 20,  label: '⭐ 20',  rarity: 'common' },
  { stars: 30,  label: '⭐ 30',  rarity: 'uncommon' },
  { stars: 40,  label: '⭐ 40',  rarity: 'uncommon' },
  { stars: 50,  label: '⭐ 50',  rarity: 'uncommon' },
  { stars: 75,  label: '⭐ 75',  rarity: 'rare' },
  { stars: 90,  label: '⭐ 90',  rarity: 'rare' },
  { stars: 100, label: '⭐ 100', rarity: 'epic' },
];

function openFreeCase() {
  const spinItems = [...FREE_ITEMS, ...FREE_ITEMS, ...FREE_ITEMS];
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="spin-title">🎁 Бесплатный кейс</div>
    <div class="spin-sub">Раз в 24 часа бесплатно!</div>
    <div class="spin-track-wrap">
      <div class="spin-pointer"></div>
      <div class="spin-track" id="spin-track">
        ${spinItems.map(item => `
          <div class="spin-item ${item.rarity === 'epic' ? 'epic' : item.rarity === 'rare' ? 'rare' : ''}"
            ${item.color ? `style="border-color:${item.color}55;background:${item.color}12"` : ''}>
            ${item.stars > 0
              ? `${_rouletteStar(28, item.rarity === 'epic' ? '#e91e8c' : item.rarity === 'rare' ? '#3498db' : '#ffd700')}<span class="spin-item-label">${item.stars}</span>`
              : `<span class="spin-item-label" style="color:${item.color||'var(--gold)'};font-size:26px;font-weight:900">${item.label}</span>`
            }
          </div>
        `).join('')}
      </div>
    </div>
    <div id="spin-result" class="spin-result" style="display:none"></div>
    <button class="btn-spin" id="btn-spin" onclick="doFreeSpin()">🎁 Открыть бесплатно</button>
  `);
}

async function doFreeSpin() {
  const btn = document.getElementById('btn-spin');
  btn.disabled = true;
  btn.textContent = 'Открываем...';

  const res = await API.openCase('free');

  if (!res || res.__error) {
    btn.disabled = false;
    btn.textContent = '🎁 Открыть бесплатно';
    showToast(res?.detail || 'Ошибка соединения');
    return;
  }

  // Находим предмет в списке для анимации по stars
  const winItem = FREE_ITEMS.find(i => i.stars === res.item?.stars) || FREE_ITEMS[0];
  const winIdx = FREE_ITEMS.indexOf(winItem);

  const track = document.getElementById('spin-track');
  const itemW = 98;
  const targetOffset = (FREE_ITEMS.length + winIdx) * itemW - (track.parentElement.offsetWidth / 2) + (itemW / 2);
  track.style.transition = 'transform 3.5s cubic-bezier(0.12,0.8,0.3,1)';
  track.style.transform = `translateX(-${targetOffset}px)`;

  setTimeout(() => {
    const item = res.item || winItem;
    const localItem = FREE_ITEMS.find(i => i.stars === (res.item?.stars ?? -1)) || winItem;
    document.getElementById('spin-result').innerHTML = `
      <div class="spin-result-item" ${localItem.color ? `style="color:${localItem.color}"` : ''}>${localItem.stars > 0 ? `${_goldStar(28)} ${localItem.stars}` : localItem.label}</div>
      <div class="spin-result-val">${localItem.stars > 0 ? `+${localItem.stars} звёзд` : '<span style="color:#e74c3c">Не повезло</span>'}</div>
    `;
    document.getElementById('spin-result').style.display = 'block';
    btn.textContent = '⏰ Завтра снова';
    btn.disabled = true;
    if (res.new_balance !== undefined && window.appState) window.appState.balance = res.new_balance;
    updateBalance();
    if (localItem.rarity === 'epic') {
      hideModal();
      showWin('⭐', `${localItem.stars} звёзд`, `⭐ ${localItem.stars}`);
    }
  }, 3600);
}

// ===== РУЛЕТКА =====

// --- НАСТРОЙКИ АДМИНИСТРАТОРА ---
// Шанс проигрыша (0.0 – 1.0). Для изменения просто правь это значение:
//   ROULETTE_CONFIG.lossChance = 0.5  →  50% проигрышей
//   ROULETTE_CONFIG.lossChance = 0.9  →  90% проигрышей
const ROULETTE_CONFIG = { lossChance: 0.70 };

// Единая рулетка со всеми множителями
const ROULETTE_ITEMS = [
  { name: '×1.1', mult: 1.1, color: '#27ae60', weight: 40 },
  { name: '×1.5', mult: 1.5, color: '#3498db', weight: 20 },
  { name: '×2',   mult: 2,   color: '#9b59b6', weight: 12 },
  { name: '×3',   mult: 3,   color: '#f1c40f', weight: 5  },
  { name: '×5',   mult: 5,   color: '#e91e8c', weight: 1  },
  { name: '×7',   mult: 7,   color: '#8e44ad', weight: 0.3},
  { name: '×10',  mult: 10,  color: '#f39c12', weight: 0.1},
];

const LOSS_ITEM = { name: '×0', mult: 0, color: '#e74c3c', stars: 0 };

let rouletteBet = 100;
let rouletteResetTimeout = null;

function _rouletteStar(size, color) {
  return `<img src="assets/tg_star.png" height="${size}" style="width:auto;flex-shrink:0;display:inline-block;vertical-align:middle;filter:drop-shadow(0 0 5px ${color}bb)">`;
}

function _goldStar(size = 18) { return _rouletteStar(size, '#ffd700'); }

// Визуально только 3 проигрыша в ленте; реальная вероятность задаётся lossChance
function getRouletteItems() {
  const winItems = ROULETTE_ITEMS.map(item => ({
    ...item,
    stars: Math.round(rouletteBet * item.mult),
  }));
  const total = 22;
  const lossAt = new Set([3, 11, 18]);
  const strip = [];
  let wi = 0;
  for (let i = 0; i < total; i++) {
    strip.push(lossAt.has(i) ? { ...LOSS_ITEM } : { ...winItems[wi++ % winItems.length] });
  }
  return strip;
}

function _updateRouletteBetUI() {
  const inp = document.getElementById('roulette-custom-input');
  if (inp) inp.value = rouletteBet;
  document.querySelectorAll('.pvp-bet-btn[data-rbet]').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.rbet) === rouletteBet);
  });
  const spinBtn = document.getElementById('btn-roulette');
  if (spinBtn) spinBtn.innerHTML = `${_goldStar(18)} Крутить &nbsp;·&nbsp; ${_goldStar(18)} ${rouletteBet}`;
}

function openRoulette() {
  const items = getRouletteItems();
  const strip = [...items, ...items, ...items];

  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">${_goldStar(22)} Рулетка</div>
    <div class="pvp-sub">Крутите и умножайте свои звёзды!</div>
    <div class="spin-track-wrap">
      <div class="spin-pointer"></div>
      <div class="spin-track roulette-idle" id="roulette-track">
        ${strip.map(item => `
          <div class="spin-item" style="border-color:${item.color}55;background:${item.color}12">
            ${_rouletteStar(36, item.color)}
            <span class="roulette-item-label" style="color:${item.color}">${item.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div id="roulette-result" class="roulette-result"></div>
    <div class="pvp-quick-bets" style="margin-bottom:8px">
      ${[50,100,250,500].map(b => `
        <button class="pvp-bet-btn ${b===rouletteBet?'selected':''}" data-rbet="${b}"
          onclick="setRouletteBet(${b})">${_goldStar(14)} ${b}</button>
      `).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <input type="number" id="roulette-custom-input"
        placeholder="Введите количество звёзд ⭐" min="10"
        style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #444;background:#1a1a2e;color:#fff;font-size:14px"
        value="${rouletteBet}"
        onkeydown="if(event.key==='Enter')applyCustomBet()">
      <button class="pvp-bet-btn" style="padding:8px 14px" onclick="applyCustomBet()">✓</button>
    </div>
    <button class="btn-pvp-create" id="btn-roulette"
      style="background:linear-gradient(135deg,#9b59b6,#6c3483)" onclick="spinRoulette()">
      ${_goldStar(18)} Крутить &nbsp;·&nbsp; ${_goldStar(18)} ${rouletteBet}
    </button>
  `);
}

function setRouletteBet(b) {
  rouletteBet = b;
  _updateRouletteBetUI();
}

function applyCustomBet() {
  const val = parseInt(document.getElementById('roulette-custom-input')?.value);
  if (!val || val < 10) { showToast('Минимум 10 звёзд'); return; }
  if (window.appState && val > window.appState.balance) { showToast('Недостаточно звёзд'); return; }
  rouletteBet = val;
  document.querySelectorAll('.pvp-bet-btn[data-rbet]').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.rbet) === rouletteBet);
  });
  const spinBtn = document.getElementById('btn-roulette');
  if (spinBtn) spinBtn.innerHTML = `${_goldStar(18)} Крутить &nbsp;·&nbsp; ${_goldStar(18)} ${rouletteBet}`;
}

function spinRoulette() {
  if (window.appState && window.appState.balance < rouletteBet) {
    showToast('Недостаточно звёзд!');
    return;
  }

  const btn = document.getElementById('btn-roulette');
  if (btn) btn.disabled = true;
  document.getElementById('roulette-result').innerHTML = '';

  const items = getRouletteItems();
  const track = document.getElementById('roulette-track');
  const itemW = 98;
  const n = items.length;

  // Отменяем отложенный сброс предыдущего спина
  if (rouletteResetTimeout) {
    clearTimeout(rouletteResetTimeout);
    rouletteResetTimeout = null;
  }

  // Стоп холостой анимации
  track.classList.remove('roulette-idle');
  track.style.animation = 'none';
  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';
  void track.offsetWidth; // форсируем перерисовку

  // Исход определяется lossChance, независимо от состава ленты
  const isLoss = Math.random() < ROULETTE_CONFIG.lossChance;
  const candidates = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => isLoss ? item.mult === 0 : item.mult > 0);

  let winIdx;
  if (isLoss) {
    winIdx = candidates[Math.floor(Math.random() * candidates.length)].i;
  } else {
    const totalWeight = candidates.reduce((s, { item }) => s + (item.weight ?? 1), 0);
    let r = Math.random() * totalWeight;
    winIdx = candidates[candidates.length - 1].i;
    for (const { item, i } of candidates) {
      r -= (item.weight ?? 1);
      if (r <= 0) { winIdx = i; break; }
    }
  }
  const winItem = items[winIdx];

  // Приземляемся на средней (второй) копии ленты
  const targetOffset = (n + winIdx) * itemW - (track.parentElement.offsetWidth / 2) + (itemW / 2);
  track.style.transition = 'transform 6s cubic-bezier(0.08, 0.82, 0.25, 1)';
  track.style.transform = `translateX(-${targetOffset}px)`;

  setTimeout(() => {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
      resultEl.innerHTML = winItem.mult > 0
        ? `${_rouletteStar(20, winItem.color)}<span style="color:${winItem.color}">${winItem.name}</span><span style="color:var(--text2)">—</span>${_goldStar(18)}<span style="color:var(--gold)">${winItem.stars.toLocaleString()}</span>`
        : `<span style="color:#e74c3c">Не повезло...</span>`;
    }
    if (winItem.mult > 0) {
      if (window.appState) window.appState.balance += winItem.stars - rouletteBet;
      if (winItem.stars >= 100) API.recordWin('⭐', winItem.name, winItem.stars);
      if (winItem.stars >= rouletteBet * 5) {
        hideModal();
        showWin('⭐', winItem.name, `⭐ ${winItem.stars.toLocaleString()}`);
      }
    } else {
      if (window.appState) window.appState.balance -= rouletteBet;
    }
    updateBalance();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${_goldStar(18)} Крутить ещё`;
    }
    rouletteResetTimeout = setTimeout(() => {
      rouletteResetTimeout = null;
      if (track) {
        track.style.transition = 'none';
        track.style.transform = 'translateX(0)';
        void track.offsetWidth;
        track.classList.add('roulette-idle');
      }
    }, 1200);
  }, 6100);
}

// ===== CRASH ===== (see full implementation at bottom of file)

// ===== SLOTS =====
const SLOT_EMOJIS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🃏', '7️⃣'];
let slotsBet = 50;

function openSlots() {
  const makeReel = (id, emoji) => `
    <div class="slot-reel" id="slot-${id}">
      <div class="slot-drum" id="slot-drum-${id}">
        <div class="slot-cell">${emoji}</div>
        <div class="slot-cell">${emoji}</div>
        <div class="slot-cell">${emoji}</div>
      </div>
    </div>`;
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">🎰 Слоты</div>
    <div class="pvp-sub">Три символа — и ты богач!</div>
    <div class="slots-display">
      ${makeReel(0, '🍒')}${makeReel(1, '🍋')}${makeReel(2, '🍊')}
    </div>
    <div class="slots-win" id="slots-win"></div>
    <div class="slots-bet-row">
      <span class="slots-bet-label">Ставка:</span>
      <div class="slots-bets">
        ${[25,50,100,250].map(b => `<div class="slots-bet-opt ${b===slotsBet?'selected':''}" onclick="setSlotsBet(${b})">${_goldStar(14)}${b}</div>`).join('')}
      </div>
    </div>
    <button class="btn-slots-spin" id="btn-slots" onclick="doSlotsSpin()">🎰 Крутить · ${_goldStar(16)} ${slotsBet}</button>
  `);
}

function setSlotsBet(b) { slotsBet = b; openSlots(); }

const SLOT_MULT = { '💎': 50, '7️⃣': 20, '⭐': 15, '🍇': 10, '🍒': 8, '🍊': 6, '🍋': 5, '🃏': 4 };
const SLOT_DURATIONS = [1500, 2000, 2500];
const CELL_H = 80;

function doSlotsSpin() {
  const btn = document.getElementById('btn-slots');
  btn.disabled = true;
  document.getElementById('slots-win').textContent = '';

  // Джекпот: 1% при мин. ставке, масштабируется вниз с ростом ставки
  const jackpotChance = 0.25 / slotsBet; // 25→1%, 50→0.5%, 100→0.25%, 250→0.1%
  // Исход: jackpotChance джекпот, 29% пара, остальное проигрыш
  const roll = Math.random();
  const rnd = () => SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
  let results;
  if (roll < jackpotChance) {
    // Джекпот: все три одинаковые
    const sym = rnd();
    results = [sym, sym, sym];
  } else if (roll < 0.30) {
    // Пара: два подряд одинаковых
    const sym = rnd();
    let other; do { other = rnd(); } while (other === sym);
    results = Math.random() < 0.5 ? [sym, sym, other] : [other, sym, sym];
  } else {
    // Проигрыш: никакой пары
    do { results = [rnd(), rnd(), rnd()]; }
    while (results[0] === results[1] || results[1] === results[2]);
  }

  [0,1,2].forEach(i => {
    const drum = document.getElementById(`slot-drum-${i}`);
    if (!drum) return;

    // Полоса: много рандомных, затем результат в центре, затем 1 после
    const prefixLen = 24 + i * 4;
    const cells = Array.from({ length: prefixLen }, () =>
      SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)]
    );
    cells.push(results[i]);
    cells.push(SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)]);

    drum.innerHTML = cells.map(e => `<div class="slot-cell">${e}</div>`).join('');
    drum.style.transition = 'none';
    drum.style.transform = 'translateY(0)';
    void drum.offsetWidth;

    // Сдвигаем так, чтобы results[i] оказался в средней (центральной) строке
    const targetY = -(prefixLen - 1) * CELL_H;
    requestAnimationFrame(() => {
      drum.style.transition = `transform ${SLOT_DURATIONS[i]}ms cubic-bezier(0.05, 0.85, 0.25, 1.0)`;
      drum.style.transform = `translateY(${targetY}px)`;
    });
  });

  setTimeout(() => {
    const winEl = document.getElementById('slots-win');
    let win = 0;
    if (results[0] === results[1] && results[1] === results[2]) {
      win = slotsBet * (SLOT_MULT[results[0]] ?? 4);
      if (winEl) winEl.textContent = `🎉 ДЖЕКПОТ! +⭐${win}`;
    } else if (results[0] === results[1] || results[1] === results[2]) {
      win = slotsBet * 2;
      if (winEl) winEl.textContent = `✨ Выигрыш! +⭐${win}`;
    } else {
      if (winEl) winEl.textContent = 'Не повезло...';
      win = -slotsBet;
    }

    if (window.appState) window.appState.balance += win;
    updateBalance();
    if (win >= 100) API.recordWin(results[0], 'Слоты', win);
    btn.disabled = false;
  }, 2700);
}

// ===== EGGS =====
const EGGS = [
  { emoji: '🥚', name: 'Обычное', price: 50, items: ['🦊','🌊','⚡'] },
  { emoji: '🪺', name: 'Гнездо', price: 150, items: ['👾','🌿','🧪'] },
  { emoji: '🐉', name: 'Дракона', price: 500, items: ['🐉','💎','🧞'] },
];
let selectedEgg = 0;

function openEggs() {
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">🥚 Яйца</div>
    <div class="pvp-sub">Выбери яйцо и вскрой сюрприз</div>
    <div class="eggs-grid">
      ${EGGS.map((e, i) => `
        <div class="egg-item ${i === selectedEgg ? 'selected' : ''}" onclick="selectEgg(${i})">
          <div class="egg-emoji">${e.emoji}</div>
          <div class="egg-name">${e.name}</div>
          <div class="egg-price">${_goldStar(14)} ${e.price}</div>
        </div>
      `).join('')}
    </div>
    <button class="btn-open-egg" onclick="doOpenEgg()">🥚 Открыть · ${_goldStar(16)} ${EGGS[selectedEgg].price}</button>
  `);
}

function selectEgg(i) { selectedEgg = i; openEggs(); }

function doOpenEgg() {
  const egg = EGGS[selectedEgg];
  const itemEmoji = egg.items[Math.floor(Math.random() * egg.items.length)];
  const item = ITEMS.find(it => it.emoji === itemEmoji) || ITEMS[0];
  hideModal();
  if (window.appState) window.appState.balance += item.stars - egg.price;
  updateBalance();
  if (item.stars >= 100) API.recordWin(itemEmoji, item.name, item.stars);
  showWin(itemEmoji, item.name, `⭐ ${item.stars}`);
}

// ===== UPGRADE =====
function openUpgrade() {
  const fromItem = ITEMS[Math.floor(Math.random() * 4)];
  const toItem = ITEMS[4 + Math.floor(Math.random() * 4)];
  const chance = Math.max(10, Math.min(90, Math.floor((fromItem.stars / toItem.stars) * 100)));

  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">⬆️ Апгрейд</div>
    <div class="pvp-sub">Улучши предмет за шанс получить лучший</div>
    <div class="upgrade-arrows">
      <div style="text-align:center">
        <div class="upgrade-card-box">
          <span>${fromItem.emoji}</span>
          <span class="upgrade-card-val">${_goldStar(14)} ${fromItem.stars}</span>
        </div>
        <div class="upgrade-card-label" style="margin-top:6px">Твой предмет</div>
      </div>
      <span style="font-size:32px">→</span>
      <div style="text-align:center">
        <div class="upgrade-card-box target">
          <span>${toItem.emoji}</span>
          <span class="upgrade-card-val">${_goldStar(14)} ${toItem.stars}</span>
        </div>
        <div class="upgrade-card-label" style="margin-top:6px">💰 Профит</div>
      </div>
    </div>
    <div class="upgrade-chance">
      <div class="upgrade-chance-val" style="color:${chance > 50 ? 'var(--green)' : chance > 25 ? 'var(--orange)' : 'var(--red)'}">${chance}%</div>
      <div class="upgrade-chance-bar">
        <div class="upgrade-chance-fill" style="width:${chance}%"></div>
      </div>
      <div class="upgrade-chance-label">Шанс успеха</div>
    </div>
    <button class="btn-upgrade" onclick="doUpgrade(${chance}, '${toItem.emoji}', '${toItem.name}', ${toItem.stars})">⬆️ Апгрейд</button>
  `);
}

function doUpgrade(chance, emoji, name, stars) {
  hideModal();
  const win = Math.random() * 100 < chance;
  setTimeout(() => {
    if (win) {
      showWin(emoji, `Апгрейд успешен!`, `⭐ ${stars}`);
      if (window.appState) window.appState.balance += stars;
      if (stars >= 100) API.recordWin(emoji, 'Апгрейд', stars);
    } else {
      showWin('💀', 'Не удалось', 'Предмет утерян...');
    }
    updateBalance();
  }, 300);
}

// ===== CRASH GAME =====
let crashActive = false;
let crashInterval = null;
let crashMyBet = 100;
let crashRoundId = -1;
let crashInRound = false;

function _crashRocketHTML() {
  return `
    <svg class="crash-rocket-svg" viewBox="0 0 80 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cr-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="40%" stop-color="#4d6ef5"/>
          <stop offset="60%" stop-color="#4d6ef5"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
        <linearGradient id="cr-nose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fb923c"/>
          <stop offset="100%" stop-color="#dc2626"/>
        </linearGradient>
        <radialGradient id="cr-win" cx="35%" cy="30%">
          <stop offset="0%" stop-color="#93c5fd"/>
          <stop offset="55%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#0a1535"/>
        </radialGradient>
        <linearGradient id="cr-fl1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="55%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="rgba(239,68,68,0)"/>
        </linearGradient>
        <linearGradient id="cr-fl2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="45%" stop-color="#fcd34d"/>
          <stop offset="100%" stop-color="rgba(252,211,77,0)"/>
        </linearGradient>
      </defs>

      <!-- Flames -->
      <g class="cr-flames">
        <ellipse class="cr-fl-outer" cx="40" cy="177" rx="14" ry="25" fill="url(#cr-fl1)"/>
        <ellipse class="cr-fl-inner" cx="40" cy="170" rx="7"  ry="15" fill="url(#cr-fl2)"/>
      </g>

      <!-- Left fin -->
      <path d="M21 128 L3 157 L21 149 Z" fill="#1e3a8a"/>
      <path d="M21 128 L5 154 L21 147 Z" fill="#2d50b0" opacity="0.5"/>

      <!-- Right fin -->
      <path d="M59 128 L77 157 L59 149 Z" fill="#1e3a8a"/>
      <path d="M59 128 L75 154 L59 147 Z" fill="#2d50b0" opacity="0.5"/>

      <!-- Body -->
      <rect x="21" y="65" width="38" height="90" rx="6" fill="url(#cr-body)"/>
      <!-- Body shine -->
      <rect x="23" y="67" width="7" height="86" rx="3" fill="rgba(255,255,255,0.07)"/>

      <!-- Nose cone -->
      <path d="M40 10 C29 26,21 46,21 65 L59 65 C59 46,51 26,40 10 Z" fill="url(#cr-nose)"/>
      <!-- Nose shine -->
      <path d="M40 12 C35 26,30 42,29 62 C33 52,38 28,40 12 Z" fill="rgba(255,255,255,0.22)"/>

      <!-- Window ring -->
      <circle cx="40" cy="98" r="13" fill="#0f172a" stroke="#4d6ef5" stroke-width="2.5"/>
      <!-- Window glass -->
      <circle cx="40" cy="98" r="10" fill="url(#cr-win)"/>
      <!-- Window glare -->
      <ellipse cx="35.5" cy="93.5" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.38)" transform="rotate(-25 35.5 93.5)"/>

      <!-- Horizontal bands -->
      <rect x="21" y="117" width="38" height="2" rx="1" fill="rgba(255,255,255,0.10)"/>
      <rect x="21" y="131" width="38" height="2" rx="1" fill="rgba(255,255,255,0.08)"/>

      <!-- Rivets -->
      <circle cx="27" cy="74" r="2" fill="rgba(255,255,255,0.18)"/>
      <circle cx="53" cy="74" r="2" fill="rgba(255,255,255,0.18)"/>
      <circle cx="27" cy="146" r="2" fill="rgba(255,255,255,0.18)"/>
      <circle cx="53" cy="146" r="2" fill="rgba(255,255,255,0.18)"/>

      <!-- Nozzle -->
      <path d="M27 152 L53 152 L56 163 L24 163 Z" fill="#111827"/>
      <path d="M31 158 L49 158 L51 163 L29 163 Z" fill="#1e2840"/>
      <line x1="27" y1="152" x2="53" y2="152" stroke="#4d6ef5" stroke-width="1.5" opacity="0.4"/>
    </svg>

    <!-- Explosion (shown on crash) -->
    <div class="cr-explosion" id="cr-explosion">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g stroke-linecap="round" opacity="0.9">
          <line x1="50" y1="50" x2="50" y2="7"  stroke="#f59e0b" stroke-width="5"/>
          <line x1="50" y1="50" x2="83" y2="17" stroke="#ef4444" stroke-width="4"/>
          <line x1="50" y1="50" x2="93" y2="50" stroke="#f59e0b" stroke-width="5"/>
          <line x1="50" y1="50" x2="83" y2="83" stroke="#ef4444" stroke-width="4"/>
          <line x1="50" y1="50" x2="50" y2="93" stroke="#f59e0b" stroke-width="5"/>
          <line x1="50" y1="50" x2="17" y2="83" stroke="#ef4444" stroke-width="4"/>
          <line x1="50" y1="50" x2="7"  y2="50" stroke="#f59e0b" stroke-width="5"/>
          <line x1="50" y1="50" x2="17" y2="17" stroke="#ef4444" stroke-width="4"/>
        </g>
        <circle cx="50" cy="50" r="22" fill="#f59e0b"/>
        <circle cx="50" cy="50" r="14" fill="#fcd34d"/>
        <circle cx="50" cy="50" r="7"  fill="white"/>
      </svg>
    </div>`;
}

function openCrash() {
  crashActive = true;
  crashInRound = false;
  crashRoundId = -1;

  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="crash-header">
      <div class="crash-title">КРАШ</div>
      <div class="crash-round-badge" id="crash-round-badge">Раунд #—</div>
    </div>

    <div class="crash-sky phase-waiting" id="crash-sky">
      <div class="crash-mult-overlay">
        <div class="crash-mult-val" id="crash-mult-val">1.00x</div>
      </div>
      <div class="crash-rocket-container" id="crash-rocket-container">
        ${_crashRocketHTML()}
      </div>
    </div>

    <div class="crash-fuel-wrap">
      <span class="crash-fuel-label">ТЯГА</span>
      <div class="crash-fuel-bar">
        <div class="crash-fuel-fill" id="crash-fuel-fill" style="width:100%;background:var(--green)"></div>
      </div>
      <span class="crash-fuel-pct" id="crash-fuel-pct">100%</span>
    </div>

    <div class="crash-status-bar" id="crash-status-bar">
      <div class="crash-countdown">
        <div class="crash-cd-label">ПОДКЛЮЧЕНИЕ...</div>
        <div class="crash-cd-val">—</div>
        <div class="crash-cd-track"><div class="crash-cd-fill" style="width:100%"></div></div>
      </div>
    </div>

    <div class="crash-players-wrap">
      <div class="crash-players-title">Пассажиры</div>
      <div class="crash-players-list" id="crash-players-list">
        <div class="crash-no-players">Пусто — займи место!</div>
      </div>
    </div>

    <div class="crash-controls" id="crash-controls">
      <div class="crash-bet-row">
        <input class="crash-bet-input" id="crash-bet-input" type="number" min="10"
          value="${crashMyBet}" oninput="crashMyBet=+this.value">
        <button class="btn-crash-join" onclick="doCrashJoin()">Сесть в ракету</button>
      </div>
      <div class="crash-quick-bets">
        ${[50,100,250,500,1000].map(b =>
          `<button class="crash-qbet" onclick="crashSetBet(${b})">${_goldStar(14)}${b}</button>`
        ).join('')}
      </div>
    </div>
  `);

  crashInterval = setInterval(crashPoll, 300);
  crashPoll();
}

function crashSetBet(v) {
  crashMyBet = v;
  const inp = document.getElementById('crash-bet-input');
  if (inp) inp.value = v;
}

async function doCrashJoin() {
  const btn = document.getElementById('btn-crash-join');
  if (btn) { btn.disabled = true; btn.textContent = 'Садимся...'; }
  const res = await API.crashBet(crashMyBet);
  if (!res || res.__error) {
    showToast(res?.detail || 'Ошибка соединения');
    if (btn) { btn.disabled = false; btn.textContent = 'Сесть в ракету'; }
    return;
  }
  crashInRound = true;
  if (window.appState) window.appState.balance = res.new_balance;
  updateBalance();
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showToast('Вы на борту!');
}

async function doCrashCashout() {
  const btn = document.getElementById('btn-crash-cashout');
  if (btn) { btn.disabled = true; }
  const res = await API.crashCashout();
  if (!res || res.__error) {
    showToast(res?.detail || 'Слишком поздно!');
    return;
  }
  crashInRound = false;
  if (window.appState) window.appState.balance = res.new_balance;
  updateBalance();
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showToast(`Вышли на ${res.multiplier}x — ⭐ ${res.won.toLocaleString()}`);
}

async function crashPoll() {
  if (!crashActive) return;
  const state = await API.crashState();
  if (!crashActive) return;

  if (!state || state.__error) {
    const bar = document.getElementById('crash-status-bar');
    if (bar) bar.innerHTML = `<div class="crash-watch-msg">Нет соединения с сервером...</div>`;
    const list = document.getElementById('crash-players-list');
    if (list) list.innerHTML = `<div class="crash-no-players">Нет соединения...</div>`;
    return;
  }

  const { phase, time_left, multiplier, crash_at, players, round_id } = state;

  if (round_id !== crashRoundId) {
    crashRoundId = round_id;
    if (phase === 'waiting') crashInRound = false;
  }

  _crashRenderRocket(phase, multiplier);
  _crashRenderMult(phase, multiplier, crash_at);
  _crashRenderFuel(multiplier);
  _crashRenderStatus(phase, time_left, crash_at);
  _crashRenderPlayers(players, phase);
  _crashRenderControls(phase, multiplier);

  const badge = document.getElementById('crash-round-badge');
  if (badge) badge.textContent = `Раунд #${round_id + 1}`;
}

function _crashRenderRocket(phase, multiplier) {
  const sky = document.getElementById('crash-sky');
  const wrap = document.getElementById('crash-rocket-container');
  if (!sky || !wrap) return;

  sky.className = 'crash-sky phase-' + phase;

  if (phase === 'waiting') {
    wrap.style.transform = 'translateX(-50%) translateY(0px)';
  } else if (phase === 'flying') {
    const lift = Math.min(115, Math.log(multiplier + 1) * 58);
    wrap.style.transform = `translateX(-50%) translateY(-${lift}px)`;
  } else {
    wrap.style.transform = 'translateX(-50%) translateY(-70px)';
  }
}

function _crashRenderMult(phase, multiplier, crash_at) {
  const el = document.getElementById('crash-mult-val');
  if (!el) return;
  const val = phase === 'crashed' ? crash_at : multiplier;
  el.textContent = val.toFixed(2) + 'x';
  el.className = 'crash-mult-val' +
    (phase === 'crashed' ? ' c-crashed' : phase === 'flying' ? ' c-flying' : '');
}

function _crashRenderFuel(multiplier) {
  const fill = document.getElementById('crash-fuel-fill');
  const pct = document.getElementById('crash-fuel-pct');
  if (!fill || !pct) return;
  const fuel = Math.max(2, Math.round(100 / Math.sqrt(multiplier)));
  fill.style.width = fuel + '%';
  fill.style.background = fuel > 60 ? 'var(--green)' : fuel > 30 ? 'var(--orange)' : 'var(--red)';
  pct.textContent = fuel + '%';
}

function _crashRenderStatus(phase, time_left, crash_at) {
  const bar = document.getElementById('crash-status-bar');
  if (!bar) return;
  if (phase === 'waiting') {
    const pct = (time_left / 10) * 100;
    bar.innerHTML = `
      <div class="crash-countdown">
        <div class="crash-cd-label">СТАРТ ЧЕРЕЗ</div>
        <div class="crash-cd-val">${time_left}</div>
        <div class="crash-cd-track"><div class="crash-cd-fill" style="width:${pct}%"></div></div>
      </div>`;
  } else if (phase === 'flying') {
    bar.innerHTML = `<div class="crash-status-flying">РАКЕТА В ПОЛЁТЕ</div>`;
  } else {
    bar.innerHTML = `<div class="crash-status-crashed">КРАШ НА ${crash_at.toFixed(2)}x</div>`;
  }
}

function _crashRenderPlayers(players, phase) {
  const list = document.getElementById('crash-players-list');
  if (!list) return;
  if (!players.length) {
    list.innerHTML = '<div class="crash-no-players">Пусто — займи место!</div>';
    return;
  }
  list.innerHTML = players.map(p => {
    let st;
    if (p.cashed_out) {
      st = `<span class="crash-p-win">✓ ${p.cashout_mult.toFixed(2)}x</span>`;
    } else if (phase === 'crashed') {
      st = `<span class="crash-p-lose">✗</span>`;
    } else {
      st = `<span class="crash-p-fly">▲</span>`;
    }
    return `<div class="crash-player-item">
      <span class="crash-p-name">${p.name}</span>
      <span class="crash-p-bet">${_goldStar(13)} ${p.bet.toLocaleString()}</span>
      ${st}
    </div>`;
  }).join('');
}

function _crashRenderControls(phase, multiplier) {
  const ctrl = document.getElementById('crash-controls');
  if (!ctrl) return;

  if (phase === 'waiting' && !crashInRound) {
    ctrl.innerHTML = `
      <div class="crash-bet-row">
        <input class="crash-bet-input" id="crash-bet-input" type="number" min="10"
          value="${crashMyBet}" oninput="crashMyBet=+this.value">
        <button class="btn-crash-join" onclick="doCrashJoin()">Сесть в ракету</button>
      </div>
      <div class="crash-quick-bets">
        ${[50,100,250,500,1000].map(b =>
          `<button class="crash-qbet" onclick="crashSetBet(${b})">${_goldStar(14)}${b}</button>`
        ).join('')}
      </div>`;
  } else if (phase === 'waiting' && crashInRound) {
    ctrl.innerHTML = `<div class="crash-on-board">Вы на борту! Ждём старта...</div>`;
  } else if (phase === 'flying' && crashInRound) {
    const won = Math.round(crashMyBet * multiplier);
    ctrl.innerHTML = `
      <button class="btn-crash-cashout" id="btn-crash-cashout" onclick="doCrashCashout()">
        ВЫВЕСТИ ${_goldStar(18)} ${won.toLocaleString()}
      </button>
      <div class="crash-cashout-hint">Текущий множитель: ${multiplier.toFixed(2)}x — жми!</div>`;
  } else if (phase === 'flying') {
    ctrl.innerHTML = `<div class="crash-watch-msg">Наблюдаете за полётом...</div>`;
  } else {
    ctrl.innerHTML = `<div class="crash-next-round">Следующий раунд через несколько секунд...</div>`;
    if (crashInRound) crashInRound = false;
  }
}

// ===== MINER (САПЁР) =====
// Мины не предопределены — решение принимается при каждом клике (on-the-fly)
// Вероятность мины = (честная) × MINER_HOUSE, множитель = честный × MINER_CUT
const MINER_CELLS = 12; // 4 строки × 3 столбца
const MINER_HOUSE = 1.40; // накрутка вероятности мины (+40%)
const MINER_CUT   = 0.93; // выплата 93% от честного за каждый шаг

let _ms = null; // miner state

function openMiner() {
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="miner-header">
      <div class="miner-title">💣 САПЁР</div>
    </div>
    <div id="miner-content"></div>
  `);
  _ms = null;
  _minerSetup();
}

function _minerSetup() {
  const bal = window.appState?.balance ?? 0;
  document.getElementById('miner-content').innerHTML = `
    <div class="miner-section-label">Количество мин</div>
    <div class="miner-mine-row" id="miner-mine-row">
      ${[1,2,3,4,5,6].map(m =>
        `<button class="miner-mine-btn${m===3?' miner-mine-active':''}" onclick="_minerPick(${m})">${m}</button>`
      ).join('')}
    </div>
    <div class="miner-section-label" style="margin-top:14px">Ставка</div>
    <div class="crash-bet-row" style="margin-bottom:8px">
      <input id="miner-bet" class="crash-bet-input" type="number" min="1" max="${bal}" value="100">
      <button class="crash-qbet" style="padding:11px 10px;font-size:13px" onclick="document.getElementById('miner-bet').value=Math.max(1,Math.floor((window.appState?.balance??0)/2))">½</button>
      <button class="crash-qbet" style="padding:11px 10px;font-size:13px" onclick="document.getElementById('miner-bet').value=window.appState?.balance??0">MAX</button>
    </div>
    <div class="crash-quick-bets" style="margin-bottom:16px">
      ${[50,100,250,500,1000].map(b =>
        `<button class="crash-qbet" onclick="document.getElementById('miner-bet').value=${b}">${_goldStar(12)} ${b}</button>`
      ).join('')}
    </div>
    <button class="btn-spin" onclick="_minerStart()">Начать игру</button>
    <div class="miner-rules">Поле 4×3 · Открывай ячейки · Бери выигрыш в любой момент</div>
  `;
  window._minerMines = 3;
}

function _minerPick(n) {
  window._minerMines = n;
  document.querySelectorAll('.miner-mine-btn').forEach((b, i) => {
    b.classList.toggle('miner-mine-active', i + 1 === n);
  });
}

function _minerStart() {
  const bet = parseInt(document.getElementById('miner-bet').value) || 0;
  const mines = window._minerMines || 3;
  if (bet < 1) return showToast('Введите ставку');
  if (bet > (window.appState?.balance ?? 0)) return showToast('Недостаточно звёзд');

  if (window.appState) window.appState.balance -= bet;
  updateBalance();

  _ms = { bet, mines, found: 0, mult: 1.0, active: true,
          cells: new Array(MINER_CELLS).fill(null) };
  _minerRender();
}

function _minerClick(i) {
  if (!_ms?.active || _ms.cells[i] !== null) return;
  const left = MINER_CELLS - _ms.found;
  const p = Math.min(0.92, (_ms.mines / left) * MINER_HOUSE);

  if (Math.random() < p) {
    // МИНА
    _ms.cells[i] = 'mine';
    _ms.active = false;
    _ms.cells = _ms.cells.map(c => c === null ? 'ghost' : c);
    _minerRender();
    if (window.Telegram?.WebApp?.HapticFeedback)
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    setTimeout(() => showToast(`💥 Подорвался! −${_ms.bet.toLocaleString()} ⭐`), 120);
  } else {
    // БЕЗОПАСНО
    _ms.cells[i] = 'safe';
    _ms.found++;
    const stepMult = (left / (left - _ms.mines)) * MINER_CUT;
    _ms.mult *= stepMult;

    const maxSafe = MINER_CELLS - _ms.mines;
    if (_ms.found >= maxSafe) {
      _ms.active = false;
      const win = Math.floor(_ms.bet * _ms.mult);
      if (window.appState) window.appState.balance += win;
      updateBalance();
      _minerRender();
      if (win >= 100) API.recordWin('💎', 'Сапёр', win);
      showWin('💎', 'Все мины найдены!', `⭐ ${win.toLocaleString()}`);
    } else {
      _minerRender();
    }
  }
}

function _minerCashout() {
  if (!_ms?.active || _ms.found === 0) return;
  _ms.active = false;
  const win = Math.floor(_ms.bet * _ms.mult);
  if (window.appState) window.appState.balance += win;
  updateBalance();
  if (win >= 100) API.recordWin('💣', 'Сапёр', win);
  _minerRender();
  showWin('💰', 'Забрал выигрыш!', `⭐ ${win.toLocaleString()}`);
}

function _minerRender() {
  const el = document.getElementById('miner-content');
  if (!el || !_ms) return;
  const { mult, bet, found, mines, active, cells } = _ms;
  const potential = Math.floor(bet * mult);

  const grid = cells.map((c, i) => {
    if (c === 'safe')  return `<div class="miner-cell miner-safe">💎</div>`;
    if (c === 'mine')  return `<div class="miner-cell miner-boom">💥</div>`;
    if (c === 'ghost') return `<div class="miner-cell miner-ghost">💣</div>`;
    if (!active)       return `<div class="miner-cell miner-closed"></div>`;
    return `<div class="miner-cell miner-closed" onclick="_minerClick(${i})"></div>`;
  }).join('');

  const bottom = active && found > 0
    ? `<button class="btn-miner-cashout" onclick="_minerCashout()">
         ВЫВЕСТИ ${_goldStar(18)} ${potential.toLocaleString()} · ${mult.toFixed(2)}x
       </button>`
    : !active
    ? `<button class="btn-spin btn-again" style="margin-top:4px" onclick="_minerSetup()">Сыграть ещё</button>`
    : `<div class="miner-hint">Открывай ячейки · мин: ${mines}</div>`;

  el.innerHTML = `
    <div class="miner-game-top">
      <div>
        <div class="miner-big-mult">${mult.toFixed(2)}x</div>
        <div class="miner-small-label">множитель</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:800;color:var(--gold)">${_goldStar(14)} ${potential.toLocaleString()}</div>
        <div class="miner-small-label">ставка ${bet.toLocaleString()} · мин ${mines}</div>
      </div>
    </div>
    <div class="miner-grid">${grid}</div>
    ${bottom}
  `;
}
