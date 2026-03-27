// ===== PROFILE PAGE =====
let _refLink = null;

async function renderProfilePage() {
  const page = document.getElementById('page-profile');
  const user = window.appState || MOCK.user;

  const refData = await API.getReferral().catch(() => null) || MOCK.referral;
  _refLink = refData.ref_link || `https://t.me/YourBot?start=ref_${user?.id || ''}`;
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

    <div style="margin:0 12px 16px;padding:24px 20px;background:linear-gradient(135deg,#1e1a0e,#2a2010);border-radius:18px;border:1px solid #f5c84233;text-align:center;box-shadow:0 4px 24px #f5c84218">
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;letter-spacing:0.2px">Вывод звёзд</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:20px">Накопи звёзды и выведи их в Telegram</div>
      <button onclick="showToast('⏳ Вывод будет доступен совсем скоро!')" style="
        width:100%;padding:16px;border:none;border-radius:14px;cursor:pointer;
        background:linear-gradient(135deg,#f5c842,#f39c12);
        color:#1a1200;font-size:16px;font-weight:800;
        display:flex;align-items:center;justify-content:center;gap:10px;
        box-shadow:0 6px 28px #f5c84255;letter-spacing:0.3px;
      ">
        <img src="assets/tg_star.png" alt="⭐" style="width:22px;height:22px;object-fit:contain">
        Вывести звёзды
      </button>
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
  const link = _refLink || `https://t.me/YourBot?start=ref_${window.appState?.id || ''}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎰 Играй со мной и получи бонус!')}`);
  } else {
    copyToClipboard(link);
    showToast('🔗 Ссылка скопирована!');
  }
}

function copyLink() {
  const link = _refLink || `https://t.me/YourBot?start=ref_${window.appState?.id || ''}`;
  copyToClipboard(link);
  showToast('📋 Ссылка скопирована!');
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
