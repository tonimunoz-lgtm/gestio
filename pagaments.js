// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Pagaments
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, showModal, hideModal, showConfirm, badge } from './ui.js';
import { navigate } from './router.js';

let _db, _ref, _get, _push, _update, _remove;

export function initPagamentsModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, push: _push, update: _update, remove: _remove } = fbFns);
}

export async function renderPagaments() {
  const snap = await _get(_ref(_db, 'gestiona/pagaments'));
  const pags = snap.exists() ? Object.entries(snap.val()) : [];

  const totalPagat = pags
    .filter(([, p]) => p.estat === 'pagat')
    .reduce((s, [, p]) => s + (parseFloat(p.import) || 0), 0);
  const nPagats   = pags.filter(([, p]) => p.estat === 'pagat').length;
  const nPendents = pags.filter(([, p]) => p.estat === 'pendent').length;
  const nVençuts  = pags.filter(([, p]) => p.estat === 'vençut').length;

  const rows = pags.map(([id, p]) => `
    <tr>
      <td style="font-weight:600;color:var(--ink)">${p.alumne || '—'}</td>
      <td style="color:var(--ink-60)">${p.concepte || '—'}</td>
      <td style="font-weight:700">${p.import || 0}€</td>
      <td style="font-size:12px;color:var(--ink-40)">${p.venciment || '—'}</td>
      <td>${badge(p.estat, p.estat === 'pagat' ? 'ok' : p.estat === 'pendent' ? 'warn' : 'alert')}</td>
      <td>
        <div style="display:flex;gap:5px">
          ${p.estat !== 'pagat' ? `
            <button class="btn btn-xs"
              style="background:var(--green-light);color:#065f46;border:1px solid var(--green-light)"
              onclick="pagMarcarPagat('${id}')">✓ Pagat</button>` : ''}
          <button class="btn btn-xs"
            style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5"
            onclick="pagEliminar('${id}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Pagaments</div>
      <div class="page-sub">Control econòmic i quotes del centre</div>
    </div>
    <button class="btn btn-primary" onclick="showModal('newPagamentModal')">+ Nova quota</button>
  </div>

  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-val" style="font-size:22px">${totalPagat.toFixed(0)}€</div>
      <div class="stat-label">Total recaptat</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-val" style="color:var(--green)">${nPagats}</div>
      <div class="stat-label">Pagats</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏳</div>
      <div class="stat-val" style="color:var(--amber)">${nPendents}</div>
      <div class="stat-label">Pendents</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⚠️</div>
      <div class="stat-val" style="color:var(--accent)">${nVençuts}</div>
      <div class="stat-label">Vençuts</div>
    </div>
  </div>

  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr><th>Alumne/a</th><th>Concepte</th><th>Import</th><th>Venciment</th><th>Estat</th><th>Accions</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-40)">Cap pagament registrat</td></tr>'}
      </tbody>
    </table>
  </div>

  <div id="newPagamentModal" class="modal-overlay hidden">
    <div class="modal-box modal-sm">
      <div class="modal-title">Nova quota
        <button class="modal-close" onclick="hideModal('newPagamentModal')">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Alumne/a *</label>
        <input class="form-input" id="pAlumne" placeholder="Nom de l'alumne/a">
      </div>
      <div class="form-group">
        <label class="form-label">Concepte *</label>
        <input class="form-input" id="pConcepte" placeholder="Sortida, material...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Import (€)</label>
          <input class="form-input" type="number" id="pImport" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Venciment</label>
          <input class="form-input" type="date" id="pVenc">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newPagamentModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="pagCrear()">Crear quota</button>
      </div>
    </div>
  </div>`;
}

export function bindPagaments() {
  window.pagCrear = async function () {
    const alumne   = document.getElementById('pAlumne')?.value.trim();
    const concepte = document.getElementById('pConcepte')?.value.trim();
    if (!alumne || !concepte) { showToast('Omple els camps obligatoris', 'error'); return; }
    await _push(_ref(_db, 'gestiona/pagaments'), {
      alumne, concepte,
      import:    parseFloat(document.getElementById('pImport').value) || 0,
      venciment: document.getElementById('pVenc').value,
      estat:     'pendent',
      createdBy: G.user?.uid,
      createdAt: Date.now(),
    });
    hideModal('newPagamentModal');
    showToast('Quota creada!', 'success');
    navigate('pagaments');
  };

  window.pagMarcarPagat = async function (id) {
    await _update(_ref(_db, `gestiona/pagaments/${id}`), { estat: 'pagat', pagatAt: Date.now() });
    showToast('Marcat com a pagat!', 'success');
    navigate('pagaments');
  };

  window.pagEliminar = function (id) {
    showConfirm('Eliminar pagament', 'Vols eliminar aquest registre?', async () => {
      await _remove(_ref(_db, `gestiona/pagaments/${id}`));
      showToast('Pagament eliminat');
      navigate('pagaments');
    });
  };
}
