// ===== API CLIENT =====
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://backend-production-128d.up.railway.app';

const tg = window.Telegram?.WebApp;

function _adminLuck() {
  if (!window.appState?.isAdmin) return {};
  const stored = localStorage.getItem('admin_luck_override');
  if (stored === null) return {};
  const luck = parseInt(stored);
  return (!isNaN(luck) && luck >= 0 && luck <= 100) ? { luck } : {};
}

async function apiCall(method, path, data = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Init-Data': tg?.initData || 'test_user',
    },
  };
  if (data) opts.body = JSON.stringify(data);
  try {
    const res = await fetch(API_BASE + path, opts);
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if ((data.detail || '').includes('заблокирован')) {
        return { __banned: true };
      }
      throw new Error(`HTTP 403`);
    }
    if (res.status === 429 || res.status === 400) {
      const data = await res.json();
      return { __error: true, detail: data.detail || 'Ошибка' };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('API error:', e);
    return null;
  }
}

const API = {
  getMe: ()                     => apiCall('GET', '/users/me'),
  getLeaders: ()                => apiCall('GET', '/leaderboard'),
  getContests: ()               => apiCall('GET', '/contests'),
  joinContest: (id)             => apiCall('POST', `/contests/${id}/join`),
  getTasks: ()                  => apiCall('GET', '/tasks'),
  completeTask: (id)            => apiCall('POST', `/tasks/${id}/complete`),
  getReferral: ()               => apiCall('GET', '/referral'),
  applyRef: (ref_id)           => apiCall('POST', '/ref/apply', { ref_id }),
  openCase: (type)              => apiCall('POST', '/cases/open', { type, ..._adminLuck() }),
  recentWins: ()                => apiCall('GET', '/cases/recent'),
  recordWin: (emoji, name, stars) => apiCall('POST', '/cases/record_win', { emoji, name, stars }),
  pvpLobby: ()                  => apiCall('GET', '/pvp/lobby'),
  pvpBet: (amount)              => apiCall('POST', '/pvp/bet', { amount, ..._adminLuck() }),
  pvpDraw: ()                   => apiCall('POST', '/pvp/draw'),
  spinRoulette: (bet, section) => {
    const data = { bet, section };
    const stored = localStorage.getItem('admin_luck_override');
    if (stored !== null) {
      const luck = parseInt(stored);
      if (!isNaN(luck) && luck >= 0 && luck <= 100) data.luck = luck;
    }
    return apiCall('POST', '/roulette/spin', data);
  },
  crashState: ()                => apiCall('GET',  '/crash/state'),
  crashBet: (amount)            => apiCall('POST', '/crash/bet', { amount, ..._adminLuck() }),
  crashCashout: ()              => apiCall('POST', '/crash/cashout'),
  spinSlots: (bet)              => apiCall('POST', '/slots/spin', { bet, ..._adminLuck() }),
  upgrade: (itemId, targetId)   => apiCall('POST', '/upgrade', { item_id: itemId, target_id: targetId }),
  createInvoice: (amount)       => apiCall('POST', '/payments/create_invoice', { amount }),
  requestWithdrawal: (amount, ton_address) => apiCall('POST', '/withdrawals/request', { amount, ton_address }),
  myWithdrawals: ()             => apiCall('GET', '/withdrawals/my'),
};

// Мок-данные для локальной разработки (если API недоступен)
const MOCK = {
  user: { id: 1, name: 'Тестовый', balance: 5000, avatar: 'Т' },
  leaders: [
    { rank: 1, name: 'KO3489KO',     stars: 1960504, avatar: '🔥', prize: '💎' },
    { rank: 2, name: 'pipnikbob',    stars: 750481,  avatar: '💎', prize: '🏆' },
    { rank: 3, name: 'moongrabb',    stars: 644506,  avatar: '🎯', prize: '🥇' },
    { rank: 4, name: 'Пользователь', stars: 640430,  avatar: '🌙', prize: '🚀' },
    { rank: 5, name: 'Пользователь', stars: 602276,  avatar: '🎮', prize: '💰' },
    { rank: 6, name: 'Пользователь', stars: 448026,  avatar: '🦊', prize: '💍' },
    { rank: 7, name: 'smuc236',      stars: 310500,  avatar: '🎲', prize: '🪙' },
  ],
  contests: [
    { id: 1, prizes: [{ emoji: '🧞', stars: 5009 }, { emoji: '👾', stars: 2814 }, { emoji: '👾', stars: 2814 }], prize_count: 12, participants: 308 },
    { id: 2, prizes: [{ emoji: '🌿', stars: 2404 }, { emoji: '🌿', stars: 2404 }, { emoji: '🧪', stars: 1361 }], prize_count: 12, participants: 1200 },
    { id: 3, prizes: [{ emoji: '🐻', stars: 4653 }, { emoji: '🎃', stars: 1257 }, { emoji: '🎃', stars: 1257 }], prize_count: 9, participants: 3800 },
  ],
  tasks: [
    { id: 1, name: 'Ссылка', type: 'link', icon: 'link', reward: 1, done: false },
    { id: 2, name: 'История', type: 'story', icon: 'link', reward: 1, done: false },
    { id: 3, name: 'Подписаться на наш канал', type: 'tg', icon: 'tg', reward: 1, url: 'https://t.me/example', done: false },
    { id: 4, name: 'Подписаться на Instagram', type: 'ig', icon: 'ig', reward: 1, url: '#', done: false },
    { id: 5, name: 'Подписаться на YouTube', type: 'yt', icon: 'yt', reward: 1, url: '#', done: false },
    { id: 6, name: 'Подписаться на канал', type: 'tg', icon: 'tg', reward: 1, url: '#', done: false },
    { id: 7, name: 'Подписаться на канал', type: 'tg', icon: 'tg', reward: 1, url: '#', done: false },
    { id: 8, name: 'Подписаться на IMac', type: 'tg', icon: 'tg', reward: 1, url: '#', done: false },
  ],
  pvpRooms: [
    { id: 1, host: 'Алексей', avatar: 'А', bet: 100 },
    { id: 2, host: 'Мария', avatar: 'М', bet: 500 },
    { id: 3, host: 'Иван', avatar: 'И', bet: 250 },
  ],
  referral: { friends: 0, earned: 0 },
};
