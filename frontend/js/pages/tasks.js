// ===== TASKS PAGE =====
const ICON_MAP = {
  tg:     '✈️',
  yt:     '▶️',
  ig:     '📸',
  link:   '🔗',
  invite: '👥',
};

async function renderTasksPage() {
  const page = document.getElementById('page-tasks');
  page.innerHTML = `
    <div class="tasks-header">
      <div class="section-title" style="padding:0;font-size:18px">Задания</div>
      <p>Выполняй задания и получай звёзды на баланс.</p>
    </div>
    <div id="tasks-list" style="padding:0 12px 20px;display:flex;flex-direction:column;gap:10px">
      <div style="text-align:center;padding:40px;color:#666">Загрузка...</div>
    </div>`;

  const tasks = await API.getTasks();
  const list = document.getElementById('tasks-list');
  if (!list) return;

  if (!tasks || tasks.__error || !tasks.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#666">Заданий пока нет</div>';
    return;
  }

  list.innerHTML = tasks.map(t => _taskCard(t)).join('');
}

function _taskCard(t) {
  const icon = ICON_MAP[t.icon] || '📌';
  const done = t.done;

  if (t.type === 'invite_friends') {
    const prog = t.progress ?? 0;
    const pct = Math.round((prog / 3) * 100);
    return `
      <div style="background:var(--card);border-radius:16px;padding:16px;border:1px solid rgba(255,255,255,.06);
        ${done ? 'opacity:.55' : ''}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:#1a1a3a;
            display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700">${t.name}</div>
            <div style="font-size:13px;color:#f5c842;margin-top:2px;display:flex;align-items:center;gap:4px">
              <img src="assets/tg_star.png" style="width:13px;height:13px"> +${t.reward} ⭐
            </div>
          </div>
          ${done ? '<div style="font-size:20px">✅</div>' : ''}
        </div>
        ${!done ? `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:5px">
            <span>Приглашено друзей</span><span>${prog}/3</span>
          </div>
          <div style="background:#1a1a2e;border-radius:6px;height:8px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#6c5ce7,#a855f7);border-radius:6px;transition:width .4s"></div>
          </div>
        </div>
        <button onclick="completeTask(${t.id})" ${prog < 3 ? 'disabled' : ''} style="
          width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;
          ${prog >= 3
            ? 'background:linear-gradient(135deg,#6c5ce7,#a855f7);color:#fff;cursor:pointer;'
            : 'background:#2a2a3a;color:#666;cursor:not-allowed;'}
        ">${prog >= 3 ? '🎁 Забрать награду' : `Пригласи ещё ${3 - prog}`}</button>` : ''}
      </div>`;
  }

  if (t.type === 'channel_sub') {
    return `
      <div style="background:var(--card);border-radius:16px;padding:16px;border:1px solid rgba(255,255,255,.06);
        ${done ? 'opacity:.55' : ''}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${done ? '0' : '12px'}">
          <div style="width:44px;height:44px;border-radius:12px;background:#1a1a3a;
            display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700">${t.name}</div>
            <div style="font-size:13px;color:#f5c842;margin-top:2px;display:flex;align-items:center;gap:4px">
              <img src="assets/tg_star.png" style="width:13px;height:13px"> +${t.reward} ⭐
            </div>
          </div>
          ${done ? '<div style="font-size:20px">✅</div>' : ''}
        </div>
        ${!done ? `
        <div style="display:flex;gap:8px">
          <a href="${t.url}" target="_blank" style="
            flex:1;padding:12px;border-radius:12px;text-align:center;text-decoration:none;
            background:#1a3a5a;color:#fff;font-size:14px;font-weight:700;
            border:1px solid #2a6a9a;
          " onclick="openChannel('${t.url}')">✈️ Подписаться</a>
          <button onclick="completeTask(${t.id})" style="
            flex:1;padding:12px;border:none;border-radius:12px;cursor:pointer;
            background:linear-gradient(135deg,#22c55e,#16a34a);
            color:#fff;font-size:14px;font-weight:700;
          ">✅ Проверить</button>
        </div>` : ''}
      </div>`;
  }

  // Обычное задание
  return `
    <div style="background:var(--card);border-radius:16px;padding:16px;
      display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.06);
      ${done ? 'opacity:.55' : ''}">
      <div style="width:44px;height:44px;border-radius:12px;background:#1a1a3a;
        display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700">${t.name}</div>
        <div style="font-size:13px;color:#f5c842;margin-top:2px;display:flex;align-items:center;gap:4px">
          <img src="assets/tg_star.png" style="width:13px;height:13px"> +${t.reward} ⭐
        </div>
      </div>
      ${done
        ? '<div style="font-size:20px">✅</div>'
        : `<button onclick="completeTask(${t.id})" ${t.url ? `data-url="${t.url}"` : ''}
            style="padding:10px 16px;border:none;border-radius:12px;cursor:pointer;
            background:linear-gradient(135deg,#6c5ce7,#a855f7);
            color:#fff;font-size:13px;font-weight:700;white-space:nowrap;">
            ${t.url ? 'Перейти' : 'Выполнить'}
          </button>`
      }
    </div>`;
}

function openChannel(url) {
  if (tg?.openTelegramLink && url.includes('t.me')) {
    tg.openTelegramLink(url);
  }
}

async function completeTask(taskId) {
  const btn = event?.target;
  const origText = btn?.textContent || '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  // Для обычных заданий с url — сначала открываем ссылку
  if (btn?.dataset?.url) {
    const url = btn.dataset.url;
    if (tg?.openTelegramLink && url.includes('t.me')) tg.openTelegramLink(url);
    else window.open(url, '_blank');
    await new Promise(r => setTimeout(r, 1500));
  }

  const res = await API.completeTask(taskId);
  if (!res || res.__error) {
    showToast('❌ ' + (res?.detail || 'Ошибка'));
    if (btn) { btn.disabled = false; btn.textContent = origText; }
    return;
  }
  window.appState.balance = res.new_balance;
  updateBalance();
  showToast(`✅ +${res.reward} ⭐ зачислено!`);
  renderTasksPage();
}
