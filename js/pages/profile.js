// ===== PROFILE PAGE =====
let _refLink = null;

async function renderProfilePage() {
  const page = document.getElementById('page-profile');
  const user = window.appState || MOCK.user;

  const refData = await API.getReferral().catch(() => null) || MOCK.referral;
  _refLink = refData.ref_link || `https://t.me/backendpvp_bot?start=ref_${user?.id || ''}`;
  const ref = refData;

  page.innerHTML = `
    <div class="profile-ref-card">
      <h2>Приглашай друзей и получай<br>10% от их пополнений!</h2>
      <p style="color:#aaa;font-size:13px;margin-top:6px">Реферальный бонус начисляется автоматически и навсегда — за каждого приглашённого друга.</p>
      <div class="ref-stats">
        <div class="ref-stat">
          <div class="ref-stat-val">${ref.friends}</div>
          <div class="ref-stat-label">Друзей</div>
        </div>
        <div class="ref-stat">
          <div class="ref-stat-val">${_goldStar(18)} ${ref.earned}</div>
          <div class="ref-stat-label">Заработано</div>
        </div>
      </div>
      <div class="invite-row">
        <button class="btn-invite" onclick="doInvite()">Пригласить</button>
        <button class="btn-copy" onclick="copyLink()" title="Скопировать ссылку">📋</button>
      </div>
    </div>

    <div style="margin:0 12px 16px;padding:20px;background:linear-gradient(135deg,#1e1a0e,#2a2010);border-radius:18px;border:1px solid #f5c84233;box-shadow:0 4px 24px #f5c84218">
      <div style="font-size:20px;font-weight:800;margin-bottom:4px">Вывод звёзд</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:16px">Через Fragment · минимум 50 ⭐</div>
      ${(() => {
        const realBalance = Math.max(0, (user.balance || 0) - (user.demo_balance || 0));
        return `
        <div style="background:#0e0e1a;border-radius:12px;padding:12px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#aaa">Доступно к выводу</span>
          <span style="font-size:16px;font-weight:800;color:#f5c842;display:flex;align-items:center;gap:5px">
            <img src="assets/tg_star.png" style="width:16px;height:16px;object-fit:contain"> ${realBalance.toLocaleString()}
          </span>
        </div>
        <input id="withdraw-amount" type="number" min="50" max="${realBalance}" placeholder="Сумма (мин. 50 ⭐)"
          oninput="onWithdrawInput()"
          style="width:100%;padding:11px 14px;border-radius:12px;border:1px solid #f5c84233;
          background:#0e0e1a;color:#fff;font-size:15px;font-weight:700;
          box-sizing:border-box;outline:none;margin-bottom:10px;-moz-appearance:textfield;">
        <input id="withdraw-username" type="text" placeholder="Telegram username (без @)"
          oninput="onWithdrawInput()"
          style="width:100%;padding:11px 14px;border-radius:12px;border:1px solid #f5c84233;
          background:#0e0e1a;color:#fff;font-size:15px;
          box-sizing:border-box;outline:none;margin-bottom:14px;">
        <button id="withdraw-btn" onclick="doWithdraw()" disabled style="
          width:100%;padding:14px;border:none;border-radius:14px;cursor:not-allowed;
          background:#2a2a2a;color:#666;font-size:15px;font-weight:800;
          display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;
        ">
          <img src="assets/tg_star.png" style="width:18px;height:18px;object-fit:contain;opacity:.4" id="wd-star">
          <span id="wd-label">Вывести</span>
        </button>`;
      })()}
      <div id="withdrawals-history" style="margin-top:14px"></div>
    </div>
    <div style="margin:0 12px 20px;padding:16px;background:var(--card);border-radius:var(--radius);border:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">Твой профиль</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="topbar-avatar" style="width:52px;height:52px;font-size:20px">${user.avatar || user.name?.[0] || '?'}</div>
        <div>
          <div style="font-size:16px;font-weight:700">${user.name || 'Игрок'}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:4px">${_goldStar(14)} ${(user.balance || 0).toLocaleString()} звёзд</div>
          ${(user.demo_balance > 0) ? `<div style="font-size:11px;color:#e67e22;margin-top:3px">из них ${user.demo_balance.toLocaleString()} демо — нельзя вывести</div>` : ''}
        </div>
      </div>
    </div>
    <div id="admin-btn-slot"></div>
  `;

  // Загружаем историю вывода
  API.myWithdrawals().then(list => {
    const el = document.getElementById('withdrawals-history');
    if (!el || !list || !list.length) return;
    const statusLabel = { pending: '⏳ В обработке', done: '✅ Выведено', rejected: '❌ Отклонено' };
    const statusColor = { pending: '#f5c842', done: '#4ade80', rejected: '#ef4444' };
    el.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#aaa;margin-bottom:8px">История заявок</div>
      ${list.map(w => `
        <div style="background:#0e0e1a;border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px">
              <img src="assets/tg_star.png" style="width:13px;height:13px"> ${w.amount.toLocaleString()}
            </div>
            <div style="font-size:11px;color:#666;margin-top:2px">${w.created_at?.slice(0,10)}</div>
          </div>
          <div style="font-size:12px;font-weight:700;color:${statusColor[w.status] || '#aaa'}">${statusLabel[w.status] || w.status}</div>
        </div>
      `).join('')}`;
  });

  // Проверяем на сервере — является ли текущий пользователь админом
  apiCall('GET', '/admin/check').then(res => {
    if (!res || res.__error) return;
    const slot = document.getElementById('admin-btn-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div style="margin:0 12px 24px">
        <button onclick="openAdminPanel()" style="
          width:100%;padding:14px;border:none;border-radius:14px;
          background:linear-gradient(135deg,#6c5ce7,#a855f7);
          color:#fff;font-size:15px;font-weight:700;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
        ">⚙️ Админ панель</button>
      </div>`;
  });
}

function openAdminPanel() {
  const base = window.location.href.replace(/\/[^/]*$/, '');
  window.location.href = base + '/admin.html';
}

function doInvite() {
  const link = _refLink || `https://t.me/backendpvp_bot?start=ref_${window.appState?.id || ''}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎰 Играй со мной и получи бонус!')}`);
  } else {
    copyToClipboard(link);
    showToast('🔗 Ссылка скопирована!');
  }
}

function copyLink() {
  const link = _refLink || `https://t.me/backendpvp_bot?start=ref_${window.appState?.id || ''}`;
  copyToClipboard(link);
  showToast('📋 Ссылка скопирована!');
}

function onWithdrawInput() {
  const amount = parseInt(document.getElementById('withdraw-amount')?.value);
  const username = (document.getElementById('withdraw-username')?.value || '').trim().replace(/^@/, '');
  const btn = document.getElementById('withdraw-btn');
  const star = document.getElementById('wd-star');
  const label = document.getElementById('wd-label');
  const realBalance = Math.max(0, (window.appState?.balance || 0) - (window.appState?.demo_balance || 0));
  const valid = !isNaN(amount) && amount >= 50 && amount <= realBalance && username.length >= 3;
  if (!btn) return;
  btn.disabled = !valid;
  btn.style.cursor = valid ? 'pointer' : 'not-allowed';
  btn.style.background = valid ? 'linear-gradient(135deg,#f5c842,#f39c12)' : '#2a2a2a';
  btn.style.color = valid ? '#1a1200' : '#666';
  if (star) star.style.opacity = valid ? '1' : '.4';
  if (label) label.textContent = valid ? `Вывести ${amount} ⭐` : 'Вывести';
}

async function doWithdraw() {
  const amount = parseInt(document.getElementById('withdraw-amount')?.value);
  const username = (document.getElementById('withdraw-username')?.value || '').trim().replace(/^@/, '');
  const btn = document.getElementById('withdraw-btn');
  const label = document.getElementById('wd-label');
  if (!amount || !username || btn?.disabled) return;
  if (btn) { btn.disabled = true; btn.style.cursor = 'not-allowed'; }
  if (label) label.textContent = 'Отправляем...';

  const res = await API.requestWithdrawal(amount, username);
  if (!res || res.__error) {
    showToast('❌ ' + (res?.detail || 'Ошибка'));
    if (btn) { btn.disabled = false; btn.style.cursor = 'pointer'; }
    if (label) label.textContent = `Вывести ${amount} ⭐`;
    return;
  }
  showToast(res.message || '✅ Заявка отправлена');
  window.appState.balance = (window.appState.balance || 0) - amount;
  updateBalance();
  renderProfilePage();
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
