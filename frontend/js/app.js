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

// ===== DEPOSIT MODAL =====
let _depositAmount = null;

function showDepositModal() {
  _depositAmount = null;
  showModal(`
    <div style="padding:4px 0">
      <div style="font-size:18px;font-weight:800;margin-bottom:6px;text-align:center">Пополнить баланс</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:16px;text-align:center">Выбери пакет или введи свою сумму</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:16px">
        ${[50,100,250,500,1000].map(amt => `
          <button onclick="setDepositAmount(${amt})" id="dep-pkg-${amt}" style="
            padding:10px 4px;border:none;border-radius:12px;cursor:pointer;
            background:linear-gradient(135deg,#1a3a2a,#1e4030);
            border:1px solid #42f5c433;color:#fff;font-size:13px;font-weight:700;
            display:flex;flex-direction:column;align-items:center;gap:3px;
            transition:border-color 0.15s;
          ">
            <img src="assets/tg_star.png" alt="⭐" style="width:15px;height:15px;object-fit:contain">
            ${amt}
          </button>
        `).join('')}
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:#aaa;margin-bottom:6px">Своя сумма (1 — 100 000 ⭐)</div>
        <input id="deposit-input" type="number" min="1" max="100000" placeholder="Например: 300"
          oninput="onDepositInput(this)"
          style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid #42f5c455;
          background:#1a2a20;color:#fff;font-size:16px;font-weight:700;box-sizing:border-box;outline:none;
          -moz-appearance:textfield;">
      </div>
      <button id="deposit-confirm-btn" onclick="confirmDeposit()" disabled style="
        width:100%;padding:14px;border:none;border-radius:14px;cursor:not-allowed;
        background:#2a2a2a;color:#666;font-size:16px;font-weight:800;
        display:flex;align-items:center;justify-content:center;gap:8px;
        transition:background 0.2s,color 0.2s;
      ">
        <img src="assets/tg_star.png" alt="⭐" style="width:20px;height:20px;object-fit:contain;opacity:0.4" id="deposit-star-icon">
        <span id="deposit-btn-label">Пополнить</span>
      </button>
    </div>
  `);
}

function setDepositAmount(amount) {
  _depositAmount = amount;
  const input = document.getElementById('deposit-input');
  if (input) input.value = amount;
  _highlightDepositPkg(amount);
  _updateDepositBtn(amount);
}

function onDepositInput(input) {
  const val = parseInt(input.value);
  _depositAmount = (!isNaN(val) && val >= 1 && val <= 100000) ? val : null;
  _highlightDepositPkg(_depositAmount);
  _updateDepositBtn(_depositAmount);
}

function _highlightDepositPkg(amount) {
  [50, 100, 250, 500, 1000].forEach(a => {
    const btn = document.getElementById(`dep-pkg-${a}`);
    if (btn) btn.style.borderColor = (a === amount) ? '#4ade80' : '#42f5c433';
  });
}

function _updateDepositBtn(amount) {
  const btn = document.getElementById('deposit-confirm-btn');
  const icon = document.getElementById('deposit-star-icon');
  const label = document.getElementById('deposit-btn-label');
  if (!btn) return;
  if (amount && amount >= 1) {
    btn.disabled = false;
    btn.style.cursor = 'pointer';
    btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
    btn.style.color = '#fff';
    if (icon) icon.style.opacity = '1';
    if (label) label.textContent = `Пополнить ${amount} ⭐`;
  } else {
    btn.disabled = true;
    btn.style.cursor = 'not-allowed';
    btn.style.background = '#2a2a2a';
    btn.style.color = '#666';
    if (icon) icon.style.opacity = '0.4';
    if (label) label.textContent = 'Пополнить';
  }
}

async function confirmDeposit() {
  if (!_depositAmount || _depositAmount < 1) return;
  const btn = document.getElementById('deposit-confirm-btn');
  const label = document.getElementById('deposit-btn-label');
  if (btn) { btn.disabled = true; btn.style.cursor = 'not-allowed'; }
  if (label) label.textContent = 'Отправляем...';

  const res = await API.createInvoice(_depositAmount);
  if (!res || res.__error) {
    showToast('❌ Ошибка — попробуй ещё раз');
    if (btn) { btn.disabled = false; btn.style.cursor = 'pointer'; }
    if (label) label.textContent = `Пополнить ${_depositAmount} ⭐`;
    return;
  }
  hideModal();
  showToast('✅ Инвойс отправлен — проверь Telegram!');
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
