// ===== TASKS PAGE =====
const ICON_MAP = {
  tg: '✈️',
  yt: '▶️',
  ig: '📸',
  link: '🔗',
};

function renderTasksPage() {
  const page = document.getElementById('page-tasks');
  const tasks = MOCK.tasks;

  page.innerHTML = `
    <div class="tasks-header">
      <div class="section-title" style="padding:0;font-size:18px">Задания</div>
      <p>Зарабатывайте билеты, выполняя интересные задания. Эти билеты можно использовать для открытия бесплатных кейсов.</p>
    </div>
    <div class="tasks-section-title">Особые задания</div>
    ${tasks.slice(0, 2).map(t => renderTaskItem(t)).join('')}
    <div class="tasks-section-title">Подписки</div>
    ${tasks.slice(2).map(t => renderTaskItem(t)).join('')}
  `;
}

function renderTaskItem(task) {
  const done = task.done;
  return `
    <div class="task-item" id="task-${task.id}">
      <div class="task-icon ${task.icon}">${ICON_MAP[task.icon] || '🔗'}</div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-reward">${_goldStar(14)} ${task.reward} билет</div>
      </div>
      <button class="task-action ${done ? 'done' : ''}" onclick="doTask(${task.id}, '${task.url || ''}')" ${done ? 'disabled' : ''}>
        ${done ? '✓' : 'Принять'}
      </button>
    </div>
  `;
}

function doTask(id, url) {
  const task = MOCK.tasks.find(t => t.id === id);
  if (!task || task.done) return;

  if (url && url !== '#' && url !== 'undefined') {
    tg?.openLink ? tg.openLink(url) : window.open(url, '_blank');
  }

  // Задержка перед завершением (пользователь должен перейти)
  setTimeout(() => {
    task.done = true;
    const btn = document.querySelector(`#task-${id} .task-action`);
    if (btn) {
      btn.textContent = '✓';
      btn.className = 'task-action done';
      btn.disabled = true;
    }
    if (window.appState) window.appState.balance += task.reward;
    updateBalance();
    showToast(`✅ Задание выполнено! +⭐${task.reward}`);

    const badge = document.getElementById('tasks-badge');
    const remaining = MOCK.tasks.filter(t => !t.done).length;
    if (badge) badge.textContent = remaining || '';
    if (!remaining && badge) badge.style.display = 'none';

    API.completeTask(id);
  }, url && url !== '#' ? 2000 : 100);
}
