// ===== MAIN APP =====
window.appState = {
  id: null,
  name: 'Игрок',
  avatar: '?',
  balance: 5000,
};

// Init Telegram Web App
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0e0e1a');
  tg.setBackgroundColor('#0e0e1a');

  const user = tg.initDataUnsafe?.user;
  if (user) {
    window.appState.id = user.id;
    window.appState.name = user.first_name || 'Игрок';
    window.appState.photo_url = user.photo_url || null;
    window.appState.avatar = (user.first_name || 'И')[0].toUpperCase();
  }
}

// ===== NAVIGATION =====
const PAGE_RENDERERS = {
  cases:    renderCasesPage,
  contests: renderContestsPage,
  tasks:    renderTasksPage,
  leaders:  renderLeadersPage,
  profile:  renderProfilePage,
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (pageEl) pageEl.classList.remove('hidden');
  if (navBtn) navBtn.classList.add('active');

  if (PAGE_RENDERERS[page]) PAGE_RENDERERS[page]();

  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

// ===== MODAL =====
function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.remove('hidden');

  overlay.onclick = (e) => {
    if (e.target === overlay) hideModal();
  };
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  if (typeof crashActive !== 'undefined') {
    crashActive = false;
    if (crashInterval) clearInterval(crashInterval);
  }
  if (typeof pvpRefreshTimer !== 'undefined' && pvpRefreshTimer) {
    clearInterval(pvpRefreshTimer);
    pvpRefreshTimer = null;
  }
  if (typeof pvpTickTimer !== 'undefined' && pvpTickTimer) {
    clearInterval(pvpTickTimer);
    pvpTickTimer = null;
  }
  if (typeof pvpLocalTimeLeft !== 'undefined') pvpLocalTimeLeft = null;
}

// ===== WIN SCREEN =====
function showWin(emoji, title, sub) {
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

  const overlay = document.createElement('div');
  overlay.className = 'win-overlay';
  overlay.innerHTML = `
    <div class="win-emoji">${emoji}</div>
    <div class="win-text">${title}</div>
    <div class="win-sub">${sub}</div>
    <button class="win-close" onclick="this.closest('.win-overlay').remove()">Забрать</button>
  `;

  // Конфетти
  const colors = ['#f5c842','#4d6ef5','#e91e8c','#2ecc71','#e67e22','#9b59b6'];
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1 + Math.random()}s;
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
    `;
    overlay.appendChild(c);
  }

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 5000);
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ===== BALANCE =====
function updateBalance() {
  const el = document.getElementById('user-balance');
  if (el) el.textContent = (window.appState.balance || 0).toLocaleString();
}

function _setTopbarAvatar() {
  const el = document.getElementById('user-avatar');
  if (!el) return;
  const photo = window.appState.photo_url;
  if (photo) {
    el.innerHTML = `<img src="${photo}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
  } else {
    el.textContent = window.appState.avatar || window.appState.name?.[0] || '?';
  }
}

// ===== INIT =====
function showApp() {
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
}

async function init() {
  // Применяем реферала если пришли по реф-ссылке (fire & forget)
  const _refParam = new URLSearchParams(window.location.search).get('ref')
    || (tg?.initDataUnsafe?.start_param?.startsWith('ref_')
        ? tg.initDataUnsafe.start_param.replace('ref_', '')
        : null);
  if (_refParam) API.applyRef(_refParam);

  // Проверяем бан до показа приложения
  const userData = await Promise.race([
    API.getMe(),
    new Promise(r => setTimeout(() => r(null), 3000)),
  ]);

  if (userData?.__banned) return; // оставляем лоадер навсегда

  // Применяем реальные данные ДО рендера, чтобы не мигал баланс
  if (userData) {
    window.appState = { ...window.appState, ...userData };
  }

  // Проверяем права админа (fire & forget, результат сохраняем в appState)
  apiCall('GET', '/admin/check').then(res => {
    window.appState.isAdmin = !!(res && !res.__error);
  }).catch(() => {});

  try {
    document.getElementById('user-name').textContent = window.appState.name;
    _setTopbarAvatar();
    updateBalance();
    renderCasesPage();
    initLiveBar();
  } catch (e) {
    console.error('Render error:', e);
    document.getElementById('page-cases').innerHTML = `<div style="color:red;padding:20px;font-size:12px">Ошибка: ${e.message}</div>`;
  }

  showApp();
}

init();
