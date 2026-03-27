// ===== TASKS PAGE =====
const ICON_MAP = {
  tg: '✈️',
  yt: '▶️',
  ig: '📸',
  link: '🔗',
};

function renderTasksPage() {
  const page = document.getElementById('page-tasks');

  page.innerHTML = `
    <div class="tasks-header">
      <div class="section-title" style="padding:0;font-size:18px">Задания</div>
      <p>Выполняй задания и получай звёзды на свой баланс.</p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px">
      <div style="font-size:56px">📋</div>
      <div style="font-size:22px;font-weight:700;color:#fff">Скоро...</div>
      <div style="font-size:14px;color:#8888aa;text-align:center">Задания появятся совсем скоро.<br>Следите за обновлениями!</div>
    </div>
  `;
}
