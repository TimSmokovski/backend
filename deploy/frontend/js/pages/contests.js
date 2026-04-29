// ===== CONTESTS PAGE =====
function renderContestsPage() {
  const page = document.getElementById('page-contests');

  page.innerHTML = `
    <div class="section-title">Розыгрыши</div>
    <div class="section-subtitle">Выигрывайте подарки абсолютно бесплатно!</div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px">
      <div style="font-size:56px">🏆</div>
      <div style="font-size:22px;font-weight:700;color:#fff">Скоро...</div>
      <div style="font-size:14px;color:#8888aa;text-align:center">Розыгрыши появятся совсем скоро.<br>Следите за обновлениями!</div>
    </div>
  `;
}
