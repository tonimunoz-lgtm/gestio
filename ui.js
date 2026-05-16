// ═══════════════════════════════════════════
//  Gestiona — UI Helpers
//  Funcions d'interfície compartides
// ═══════════════════════════════════════════

// ── Toast notifications ──
export function showToast(msg, type = '') {
  document.querySelectorAll('.g-toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'g-toast' + (type ? ' ' + type : '');
  const icons = { success: '✅', error: '❌', warn: '⚠️' };
  t.innerHTML = `${icons[type] || 'ℹ️'} ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(8px)'; }, 2600);
  setTimeout(() => t.remove(), 3100);
}

// ── Modals ──
export function showModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}
export function hideModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ── Modal dinàmic (sense HTML previ) ──
export function openDynModal(id, html) {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay hidden';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.classList.remove('hidden');
  return modal;
}

// ── Confirm dialog ──
export function showConfirm(title, msg, onOk) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOkBtn').onclick = () => {
    hideModal('confirmModal');
    onOk();
  };
  showModal('confirmModal');
}

// ── Tabs (pestanyes) ──
export function initTabs(container) {
  container.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('hidden', p.id !== targetId);
      });
    });
  });
  // Activa la primera pestanya per defecte
  const firstBtn = container.querySelector('.tabs .tab-btn');
  if (firstBtn) firstBtn.click();
}

// ── Spinner ──
export function spinner() {
  return `<div style="display:flex;align-items:center;justify-content:center;height:200px">
    <div class="g-spinner"></div>
  </div>`;
}

// ── Empty state ──
export function emptyState(icon, title, sub = '') {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${sub ? `<div class="empty-sub">${sub}</div>` : ''}
  </div>`;
}

// ── Status badge ──
export function badge(text, type = 'gray') {
  const map = { ok: 'badge-ok', warn: 'badge-warn', alert: 'badge-alert', info: 'badge-info', purple: 'badge-purple', gray: 'badge-gray' };
  return `<span class="status-badge ${map[type] || 'badge-gray'}">${text}</span>`;
}

// ── Role chip ──
export function roleChip(rol, ROLES_DEF) {
  const def = ROLES_DEF[rol] || { label: rol, color: '#999' };
  return `<span class="role-chip" style="background:${def.color}18;color:${def.color};border-color:${def.color}40">${def.label}</span>`;
}

// ── Avatar ──
export function avatar(text, color = 'var(--ink-20)', size = 'sm') {
  const sizes = { xs: '24px', sm: '30px', md: '36px', lg: '48px' };
  const fonts = { xs: '10px', sm: '12px', md: '13px', lg: '18px' };
  const s = sizes[size] || sizes.sm;
  const f = fonts[size] || fonts.sm;
  return `<div style="width:${s};height:${s};border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${f};font-weight:700;color:#fff;flex-shrink:0">${text}</div>`;
}

// ── Inicials ──
export function initials(nom = '') {
  return nom.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
}

// ── Format data ──
export function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Exportar CSV ──
export function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Filtrar taula ──
export function filterTable(tbodyId, val) {
  document.querySelectorAll(`#${tbodyId} tr`).forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
  });
}

// Exposem al window per poder cridar des de HTML inline
window.showModal  = showModal;
window.hideModal  = hideModal;
window.showToast  = showToast;
window.showConfirm = showConfirm;
