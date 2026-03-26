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
    el.innerHTML = `<span class="live-win-emoji">${win.emoji}</span><span class="live-win-name">${win.name}</span><span class="live-win-stars">⭐${win.stars}</span>`;
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
      <span class="live-win-stars">⭐${w.stars}</span>
    </div>
  `).join('');
}


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
        <div class="mode-icon-wrap pvp-icon">⚔️</div>
        <div class="mode-info">
          <div class="mode-name">PvP</div>
          <div class="mode-desc">Сразись с другим игроком</div>
        </div>
        <div class="mode-badge online">● Онлайн</div>
      </div>
      <div class="mode-card free" onclick="openFreeCase()">
        <div class="mode-icon-wrap free-icon">🎁</div>
        <div class="mode-info">
          <div class="mode-name">Бесплатно</div>
          <div class="mode-desc">1 кейс в день бесплатно</div>
        </div>
        <div class="mode-badge free-badge">Бесплатно</div>
      </div>
      <div class="mode-card roulette" onclick="openRoulette()">
        <div class="mode-icon-wrap roulette-icon">🎡</div>
        <div class="mode-info">
          <div class="mode-name">Рулетка</div>
          <div class="mode-desc">Больше ставка — лучше награды</div>
        </div>
        <div class="mode-badge price-badge">⭐ 1</div>
      </div>
      <div class="mode-card crash" onclick="openCrash()">
        <div class="mode-icon-wrap crash-icon">📈</div>
        <div class="mode-info">
          <div class="mode-name">Краш</div>
          <div class="mode-desc">Успей вывести до краша</div>
        </div>
        <div class="mode-badge online">● Онлайн</div>
      </div>
      <div class="mode-card slots" onclick="openSlots()">
        <div class="mode-icon-wrap slots-icon">🎰</div>
        <div class="mode-info">
          <div class="mode-name">Слоты</div>
          <div class="mode-desc">Три символа — и ты богач</div>
        </div>
        <div class="mode-badge price-badge">⭐ 4</div>
      </div>
      <div class="mode-card eggs" onclick="openEggs()">
        <div class="mode-icon-wrap eggs-icon">🥚</div>
        <div class="mode-info">
          <div class="mode-name">Яйца</div>
          <div class="mode-desc">Вскрой яйцо — получи сюрприз</div>
        </div>
        <div class="mode-badge price-badge">⭐ 4</div>
      </div>
      <div class="mode-card upgrade" onclick="openUpgrade()">
        <div class="mode-icon-wrap upgrade-icon">⬆️</div>
        <div class="mode-info">
          <div class="mode-name">Апгрейд</div>
          <div class="mode-desc">Переводи предметы выше</div>
        </div>
      </div>
    </div>
    <div style="padding: 0 12px 12px;">
      <button class="btn-all-cases" onclick="showToast('Скоро!')">🎒 Все кейсы</button>
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
  if (fillEl) fillEl.style.width = `${(pvpLocalTimeLeft / 180) * 100}%`;
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
    showWin(iWon ? '🏆' : '💀', iWon ? 'Ты победил!' : `Победил ${res.winner_name}`, `Котёл: ⭐ ${res.total_pot.toLocaleString()}`);
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
    const pct = (timeLeft / 180) * 100;
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
      <div class="pvp-cauldron-val">⭐ ${lobby.total_pot.toLocaleString()}</div>
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
                  <div class="pvp-room-bet">⭐ ${p.amount.toLocaleString()}</div>
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
    showWin(iWon ? '🏆' : '💀', iWon ? 'Ты победил!' : `Победил ${r.winner_name}`, `Котёл: ⭐ ${r.total_pot.toLocaleString()}`);
    return;
  }
  if (window.appState) window.appState.balance = res.new_balance;
  updateBalance();
  showToast('✅ Ставка принята!');
  await pvpRefreshLobby();
}

// ===== FREE CASE =====
const FREE_ITEMS = [
  { emoji: '⭐', name: 'Звезда',    stars: 5,   rarity: 'common' },
  { emoji: '🌊', name: 'Волна',     stars: 10,  rarity: 'common' },
  { emoji: '🍀', name: 'Клевер',    stars: 15,  rarity: 'common' },
  { emoji: '🎈', name: 'Шарик',     stars: 20,  rarity: 'common' },
  { emoji: '🦊', name: 'Лиса',      stars: 30,  rarity: 'uncommon' },
  { emoji: '⚡', name: 'Молния',    stars: 40,  rarity: 'uncommon' },
  { emoji: '🎃', name: 'Тыква',     stars: 50,  rarity: 'uncommon' },
  { emoji: '🧪', name: 'Зелье',     stars: 75,  rarity: 'rare' },
  { emoji: '👾', name: 'Пришелец',  stars: 90,  rarity: 'rare' },
  { emoji: '🎒', name: 'Рюкзак',    stars: 100, rarity: 'epic' },
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
          <div class="spin-item ${item.rarity === 'epic' ? 'epic' : item.rarity === 'rare' ? 'rare' : ''}">
            <span>${item.emoji}</span>
            <span class="spin-item-stars">⭐${item.stars}</span>
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

  // Находим предмет в списке для анимации
  const winItem = FREE_ITEMS.find(i => i.emoji === res.item?.emoji) || FREE_ITEMS[0];
  const winIdx = FREE_ITEMS.indexOf(winItem);

  const track = document.getElementById('spin-track');
  const itemW = 98;
  const targetOffset = (FREE_ITEMS.length + winIdx) * itemW - (track.parentElement.offsetWidth / 2) + (itemW / 2);
  track.style.transition = 'transform 3.5s cubic-bezier(0.12,0.8,0.3,1)';
  track.style.transform = `translateX(-${targetOffset}px)`;

  setTimeout(() => {
    const item = res.item || winItem;
    document.getElementById('spin-result').innerHTML = `
      <div class="spin-result-item">${item.emoji}</div>
      <div class="spin-result-name">${item.name}</div>
      <div class="spin-result-val">⭐ ${item.stars}</div>
    `;
    document.getElementById('spin-result').style.display = 'block';
    btn.textContent = '⏰ Завтра снова';
    btn.disabled = true;
    if (res.new_balance !== undefined && window.appState) window.appState.balance = res.new_balance;
    updateBalance();
    if (item.rarity === 'epic' || item.rarity === 'legendary') {
      hideModal();
      showWin(item.emoji, item.name, `⭐ ${item.stars}`);
    }
  }, 3600);
}

// ===== ROULETTE =====
const ROULETTE_TIERS = {
  50: [
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '⭐', name: '×1.2',     stars: 60,  color: '#3498db' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🎈', name: '×1.5',     stars: 75,  color: '#9b59b6' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🍀', name: '×2',       stars: 100, color: '#2ecc71' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '⭐', name: '×1.2',     stars: 60,  color: '#3498db' },
    { emoji: '🎁', name: '×3',       stars: 150, color: '#f1c40f' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🎈', name: '×1.5',     stars: 75,  color: '#9b59b6' },
    { emoji: '💎', name: '×5',       stars: 250, color: '#e91e8c' },
  ],
  100: [
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🎯', name: '×1.5',     stars: 150, color: '#3498db' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🌿', name: '×2',       stars: 200, color: '#2ecc71' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🎁', name: '×2',       stars: 200, color: '#9b59b6' },
    { emoji: '🎃', name: '×3',       stars: 300, color: '#e67e22' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🌟', name: '×5',       stars: 500, color: '#f1c40f' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,   color: '#e74c3c' },
    { emoji: '🎯', name: '×1.5',     stars: 150, color: '#3498db' },
    { emoji: '🚀', name: '×10',      stars: 1000,color: '#e91e8c' },
  ],
  250: [
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🧪', name: '×2',       stars: 500,  color: '#9b59b6' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '👾', name: '×2',       stars: 500,  color: '#3498db' },
    { emoji: '🐻', name: '×3',       stars: 750,  color: '#2ecc71' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🧞', name: '×5',       stars: 1250, color: '#f1c40f' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🧪', name: '×2',       stars: 500,  color: '#9b59b6' },
    { emoji: '💎', name: '×7',       stars: 1750, color: '#e91e8c' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🐉', name: '×10',      stars: 2500, color: '#f39c12' },
  ],
  500: [
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🐻', name: '×2',       stars: 1000, color: '#2ecc71' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🧞', name: '×3',       stars: 1500, color: '#9b59b6' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '💎', name: '×5',       stars: 2500, color: '#f1c40f' },
    { emoji: '🐉', name: '×7',       stars: 3500, color: '#f39c12' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '🧞', name: '×3',       stars: 1500, color: '#9b59b6' },
    { emoji: '🚀', name: '×10',      stars: 5000, color: '#e91e8c' },
    { emoji: '💀', name: 'Проигрыш', stars: 0,    color: '#e74c3c' },
    { emoji: '💎', name: '×5',       stars: 2500, color: '#f1c40f' },
  ],
};

let rouletteBet = 100;

function getRouletteItems() {
  const bets = [50, 100, 250, 500];
  const key = bets.reduce((prev, cur) => rouletteBet >= cur ? cur : prev, 50);
  return ROULETTE_TIERS[key];
}

function openRoulette() {
  const items = getRouletteItems();
  const strip = [...items, ...items, ...items];
  const tierLabel = rouletteBet >= 500 ? '🔥 Легендарный тир' : rouletteBet >= 250 ? '💜 Эпический тир' : rouletteBet >= 100 ? '💙 Редкий тир' : '⚪ Обычный тир';

  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">🎡 Рулетка</div>
    <div class="pvp-sub">Больше ставка — лучше награды!</div>
    <div class="spin-track-wrap">
      <div class="spin-pointer"></div>
      <div class="spin-track" id="roulette-track">
        ${strip.map(item => `
          <div class="spin-item" style="border-color:${item.color}40; background:${item.color}10">
            <span style="font-size:28px">${item.emoji}</span>
            <span class="roulette-item-label" style="color:${item.color}">${item.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div id="roulette-result" class="roulette-result"></div>
    <div class="roulette-tier-badge">${tierLabel}</div>
    <div class="pvp-quick-bets" style="margin-bottom:12px">
      ${[50,100,250,500].map(b => `
        <button class="pvp-bet-btn ${b===rouletteBet?'selected':''}" onclick="setRouletteBet(${b})">⭐${b}</button>
      `).join('')}
    </div>
    <button class="btn-pvp-create" id="btn-roulette" style="background:linear-gradient(135deg,#9b59b6,#6c3483)" onclick="spinRoulette()">
      🎡 Крутить · ⭐ ${rouletteBet}
    </button>
  `);
}

function setRouletteBet(b) { rouletteBet = b; openRoulette(); }

function spinRoulette() {
  const btn = document.getElementById('btn-roulette');
  if (btn) btn.disabled = true;
  document.getElementById('roulette-result').innerHTML = '';

  const items = getRouletteItems();
  const track = document.getElementById('roulette-track');
  const itemW = 98;
  const n = items.length;
  const winIdx = Math.floor(Math.random() * n);
  const winItem = items[winIdx];

  const targetOffset = (n + winIdx) * itemW - (track.parentElement.offsetWidth / 2) + (itemW / 2);
  track.style.transition = 'transform 4s cubic-bezier(0.12, 0.8, 0.3, 1)';
  track.style.transform = `translateX(-${targetOffset}px)`;

  setTimeout(() => {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
      resultEl.innerHTML = winItem.stars > 0
        ? `<span style="color:${winItem.color}">✨ ${winItem.name} — ⭐ ${winItem.stars.toLocaleString()}</span>`
        : `<span style="color:var(--red)">💀 Не повезло...</span>`;
    }
    if (winItem.stars > 0) {
      if (window.appState) window.appState.balance += winItem.stars - rouletteBet;
      if (winItem.stars >= 100) API.recordWin(winItem.emoji, winItem.name, winItem.stars);
      if (winItem.stars >= rouletteBet * 5) {
        hideModal();
        showWin(winItem.emoji, winItem.name, `⭐ ${winItem.stars.toLocaleString()}`);
      }
    } else {
      if (window.appState) window.appState.balance -= rouletteBet;
    }
    updateBalance();
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Крутить ещё'; }
    setTimeout(() => {
      if (track) { track.style.transition = 'none'; track.style.transform = 'translateX(0)'; }
    }, 1000);
  }, 4100);
}

// ===== CRASH =====
let crashMultiplier = 1.0;
let crashInterval = null;
let crashBetAmount = 0;
let crashActive = false;
let crashBetPlaced = false;

function openCrash() {
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">📈 Краш</div>
    <div class="pvp-sub">Успей вывести до краша!</div>
    <div class="crash-graph">
      <div class="crash-multiplier" id="crash-mult">1.00x</div>
      <div class="crash-line" id="crash-line"></div>
    </div>
    <div class="crash-bet-row">
      <input class="crash-input" id="crash-input" type="number" placeholder="Ставка" value="100" min="1" max="${window.appState?.balance || 0}">
      <button class="btn-crash-bet" id="crash-btn" onclick="doCrashBet()">Поставить</button>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center">Нажми "Вывести" когда множитель достаточно высокий</div>
  `);
}

function doCrashBet() {
  const input = document.getElementById('crash-input');
  crashBetAmount = parseInt(input.value) || 100;
  if (window.appState && crashBetAmount > window.appState.balance) {
    showToast('Недостаточно звёзд');
    return;
  }
  crashBetPlaced = true;
  input.disabled = true;

  const btn = document.getElementById('crash-btn');
  btn.textContent = 'Вывести';
  btn.className = 'btn-crash-bet cashout';
  btn.onclick = doCashout;

  // Краш в случайный момент
  const crashAt = 1 + Math.random() * 9;
  crashMultiplier = 1.0;
  crashActive = true;

  crashInterval = setInterval(() => {
    if (!crashActive) return;
    crashMultiplier += 0.05 + crashMultiplier * 0.01;
    const multEl = document.getElementById('crash-mult');
    const lineEl = document.getElementById('crash-line');
    if (!multEl) { clearInterval(crashInterval); return; }
    multEl.textContent = crashMultiplier.toFixed(2) + 'x';
    if (lineEl) lineEl.style.width = Math.min(90, (crashMultiplier / 10) * 90) + '%';

    if (crashMultiplier >= crashAt) {
      clearInterval(crashInterval);
      crashActive = false;
      if (multEl) { multEl.className = 'crash-multiplier crashed'; }
      setTimeout(() => {
        hideModal();
        if (window.appState) window.appState.balance -= crashBetAmount;
        updateBalance();
        showWin('💥', 'Краш!', `Множитель: ${crashAt.toFixed(2)}x · Потеря: ⭐${crashBetAmount}`);
      }, 500);
    }
  }, 100);
}

function doCashout() {
  if (!crashBetPlaced || !crashActive) return;
  clearInterval(crashInterval);
  crashActive = false;
  const won = Math.floor(crashBetAmount * crashMultiplier);
  hideModal();
  if (window.appState) window.appState.balance += won - crashBetAmount;
  updateBalance();
  if (won >= 100) API.recordWin('💰', 'Краш', won);
  showWin('💰', 'Вывод!', `⭐ ${won} (x${crashMultiplier.toFixed(2)})`);
}

// ===== SLOTS =====
const SLOT_EMOJIS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🃏', '7️⃣'];
let slotsBet = 50;

function openSlots() {
  showModal(`
    <div class="modal-close-bar"><div class="modal-close-handle"></div></div>
    <div class="pvp-title">🎰 Слоты</div>
    <div class="pvp-sub">Три символа — и ты богач!</div>
    <div class="slots-display">
      <div class="slot-reel" id="slot-0">🍒</div>
      <div class="slot-reel" id="slot-1">🍋</div>
      <div class="slot-reel" id="slot-2">🍊</div>
    </div>
    <div class="slots-win" id="slots-win"></div>
    <div class="slots-bet-row">
      <span class="slots-bet-label">Ставка:</span>
      <div class="slots-bets">
        ${[25,50,100,250].map(b => `<div class="slots-bet-opt ${b===slotsBet?'selected':''}" onclick="setSlotsBet(${b})">⭐${b}</div>`).join('')}
      </div>
    </div>
    <button class="btn-slots-spin" id="btn-slots" onclick="doSlotsSpin()">🎰 Крутить · ⭐ ${slotsBet}</button>
  `);
}

function setSlotsBet(b) { slotsBet = b; openSlots(); }

function doSlotsSpin() {
  const btn = document.getElementById('btn-slots');
  btn.disabled = true;
  document.getElementById('slots-win').textContent = '';

  [0,1,2].forEach(i => document.getElementById(`slot-${i}`)?.classList.add('spinning'));

  const results = [0,1,2].map(() => SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)]);
  // Шанс на выигрыш 30%
  if (Math.random() < 0.3) results[1] = results[0];
  if (Math.random() < 0.15) results[2] = results[0];

  setTimeout(() => {
    [0,1,2].forEach(i => {
      const el = document.getElementById(`slot-${i}`);
      if (el) { el.classList.remove('spinning'); el.textContent = results[i]; }
    });

    const winEl = document.getElementById('slots-win');
    let win = 0;
    if (results[0] === results[1] && results[1] === results[2]) {
      win = slotsBet * (results[0] === '💎' ? 50 : results[0] === '7️⃣' ? 20 : 10);
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
  }, 1200);
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
          <div class="egg-price">⭐ ${e.price}</div>
        </div>
      `).join('')}
    </div>
    <button class="btn-open-egg" onclick="doOpenEgg()">🥚 Открыть · ⭐ ${EGGS[selectedEgg].price}</button>
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
          <span class="upgrade-card-val">⭐ ${fromItem.stars}</span>
        </div>
        <div class="upgrade-card-label" style="margin-top:6px">Твой предмет</div>
      </div>
      <span style="font-size:32px">→</span>
      <div style="text-align:center">
        <div class="upgrade-card-box target">
          <span>${toItem.emoji}</span>
          <span class="upgrade-card-val">⭐ ${toItem.stars}</span>
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
