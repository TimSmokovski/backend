// ===== PROFILE PAGE =====
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  const ref = MOCK.referral;
  const user = window.appState || MOCK.user;

  page.innerHTML = `
    <div class="profile-ref-card">
      <h2>Приглашай друзей и получай<br>10% от их пополнений!</h2>
      <p>А ты знал что у тебя есть как минимум 1 человек, кто даст не более 30${_goldStar(14)} в день.</p>
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
    <div class="gifts-section">
      <h3>Ваши подарки</h3>
      <div class="gifts-empty">
        <div style="font-size:48px">🎁</div>
        <p>У вас ещё нет подарков</p>
        <button class="btn-add-gift" onclick="openFreeCase()">Получить бесплатный кейс</button>
      </div>
    </div>
    <div style="margin:0 12px 20px;padding:16px;background:var(--card);border-radius:var(--radius);border:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">Твой профиль</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="topbar-avatar" style="width:52px;height:52px;font-size:20px">${user.avatar || user.name?.[0] || '?'}</div>
        <div>
          <div style="font-size:16px;font-weight:700">${user.name || 'Игрок'}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:2px;display:flex;align-items:center;gap:4px">${_goldStar(14)} ${(user.balance || 0).toLocaleString()} звёзд</div>
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
  const user = window.appState;
  const link = `https://t.me/YourBot?start=ref_${user?.id || 'user'}`;
  if (tg?.switchInlineQuery) {
    tg.switchInlineQuery(`Играй со мной в DC_GalaxySpinBot и получи бонус! ${link}`);
  } else {
    copyToClipboard(link);
    showToast('🔗 Ссылка скопирована!');
  }
}

function copyLink() {
  const user = window.appState;
  const link = `https://t.me/YourBot?start=ref_${user?.id || 'user'}`;
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
