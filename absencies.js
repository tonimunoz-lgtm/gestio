// ═══════════════════════════════════════════
//  Gestiona — Mòdul Absències
//  Absències professors + Passar llista alumnes
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, showModal, hideModal, openDynModal, initTabs,
         badge, initials, avatar, fmtDate } from './ui.js';
import { navigate } from './router.js';

let _db, _ref, _set, _get, _update, _push, _remove;

export function initAbsenciesModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, set: _set, get: _get, update: _update,
     push: _push, remove: _remove } = fbFns);
}

const TODAY = () => new Date().toISOString().split('T')[0];
const ESTAT_LABELS = { P: 'Present', A: 'Absent', R: 'Retard', J: 'Justificat' };

// ════════════════════════════════
//  RENDER
// ════════════════════════════════
export async function renderAbsencies() {
  const avui = TODAY();
  const [usersSnap, classesSnap, absSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/users')),
    _get(_ref(_db, 'gestiona/classes')),
    _get(_ref(_db, `gestiona/absencies/${avui}`)),
  ]);
  const professors = usersSnap.exists()
    ? Object.entries(usersSnap.val()).filter(([, u]) =>
        ['professor', 'tutor', 'cap_estudis', 'director'].includes(u.rol) && u.actiu !== false)
    : [];
  const classes = classesSnap.exists() ? Object.entries(classesSnap.val()) : [];
  const absAvui  = absSnap.exists() ? absSnap.val() : {};

  const dataHuman = new Date().toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const absents   = professors.filter(([uid]) => absAvui[uid]);
  const presents  = professors.filter(([uid]) => !absAvui[uid]);
  const classeOpts = classes.map(([id, c]) => `<option value="${id}">${c.nom}</option>`).join('');

  const profRows = professors.map(([uid, u]) => {
    const abs = absAvui[uid];
    const ini = initials(u.nom);
    return `<tr>
      <td><div class="td-main">
        ${avatar(ini, abs ? 'var(--accent)' : 'var(--blue)', 'sm')}
        <div>
          <div style="font-weight:600;color:var(--ink)">${u.nom}</div>
          <div style="font-size:11px;color:var(--ink-40)">${u.especialitat || '—'}</div>
        </div>
      </div></td>
      <td>${badge(abs ? 'Absent' : 'Present', abs ? 'alert' : 'ok')}</td>
      <td style="font-size:12.5px;color:var(--ink-60)">${abs?.motiu || '—'}</td>
      <td style="font-size:12px;color:var(--ink-40)">${abs?.obs || '—'}</td>
      <td><div style="display:flex;gap:5px">
        ${abs
          ? `<button class="btn btn-xs btn-secondary" onclick="absMarcarPresent('${uid}','${avui}')">✓ Marcar present</button>`
          : `<button class="btn btn-xs" style="background:var(--accent-light);color:var(--accent-dark);border:1px solid var(--accent-light)"
              onclick="absObrir('${uid}')">✗ Marcar absent</button>`
        }
      </div></td>
    </tr>`;
  }).join('');

  return `
  <div class="page-header">
    <div><div class="page-title">Absències</div>
    <div class="page-sub">Control d'assistència · ${dataHuman.charAt(0).toUpperCase() + dataHuman.slice(1)}</div></div>
    <div class="page-actions">
      <span class="status-badge ${absents.length ? 'badge-alert' : 'badge-ok'}">
        ${absents.length} absent${absents.length !== 1 ? 's' : ''} avui
      </span>
      <span class="status-badge badge-ok">${presents.length} presents</span>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn" data-tab="absProfessors">👨‍🏫 Professors</button>
    <button class="tab-btn" data-tab="absLlista">📋 Llista alumnes</button>
    <button class="tab-btn" data-tab="absHistorial">🗓 Historial</button>
  </div>

  <!-- TAB: PROFESSORS -->
  <div id="absProfessors" class="tab-panel">
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Professor/a</th><th>Estat avui</th><th>Motiu</th><th>Observacions</th><th>Acció</th></tr></thead>
        <tbody>
          ${profRows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--ink-40)">Cap professor registrat</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB: LLISTA ALUMNES -->
  <div id="absLlista" class="tab-panel hidden">
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
          <label class="form-label">Classe</label>
          <select class="form-select" id="selClasseLlista" onchange="absCarregarLlista()">
            <option value="">Selecciona una classe...</option>${classeOpts}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Data</label>
          <input class="form-input" type="date" id="llistaData" value="${avui}" onchange="absCarregarLlista()">
        </div>
        <button class="btn btn-secondary btn-sm" onclick="absExportarLlista()">⬇ Exportar</button>
      </div>
    </div>
    <div id="llistaContainer">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Selecciona una classe i una data</div>
      </div>
    </div>
  </div>

  <!-- TAB: HISTORIAL -->
  <div id="absHistorial" class="tab-panel hidden">
    <div class="card">
      <div class="card-title">Historial d'absències de professors</div>
      <div id="historialBody" style="font-size:13px;color:var(--ink-40)">Carregant...</div>
    </div>
  </div>

  <!-- MODAL MARCAR ABSENT -->
  <div id="marcarAbsentModal" class="modal-overlay hidden">
    <div class="modal-box modal-sm">
      <div class="modal-title">Marcar absent
        <button class="modal-close" onclick="hideModal('marcarAbsentModal')">✕</button>
      </div>
      <input type="hidden" id="absentUid">
      <div class="form-group"><label class="form-label">Motiu</label>
        <select class="form-select" id="absentMotiu">
          <option>Malaltia</option>
          <option>Permís personal</option>
          <option>Formació</option>
          <option>Gràcia</option>
          <option>Sense justificar</option>
          <option>Altre</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Observacions (opcional)</label>
        <textarea class="form-textarea" id="absentObs" style="min-height:70px"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('marcarAbsentModal')">Cancel·lar</button>
        <button class="btn btn-danger" onclick="absConfirmar()">Marcar absent</button>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════
//  BIND
// ════════════════════════════════
export function bindAbsencies() {
  initTabs(document.getElementById('pageContainer'));

  // Carrega historial quan es fa clic a la pestanya
  document.querySelector('[data-tab="absHistorial"]')?.addEventListener('click', absCarregarHistorial);

  // ── Marcar absent ──
  window.absObrir = function (uid) {
    document.getElementById('absentUid').value = uid;
    document.getElementById('absentMotiu').selectedIndex = 0;
    document.getElementById('absentObs').value = '';
    showModal('marcarAbsentModal');
  };

  window.absConfirmar = async function () {
    const uid   = document.getElementById('absentUid').value;
    const motiu = document.getElementById('absentMotiu').value;
    const obs   = document.getElementById('absentObs').value.trim();
    const avui  = TODAY();
    await _set(_ref(_db, `gestiona/absencies/${avui}/${uid}`), {
      motiu, obs, registratPer: G.user?.uid, ts: Date.now()
    });
    hideModal('marcarAbsentModal');
    showToast('Absència registrada', 'success');
    navigate('absencies');
  };

  // ── Marcar present (elimina absència) ──
  window.absMarcarPresent = async function (uid, data) {
    await _remove(_ref(_db, `gestiona/absencies/${data}/${uid}`));
    showToast('Marcat com a present', 'success');
    navigate('absencies');
  };

  // ── Carregar llista alumnes ──
  window.absCarregarLlista = async function () {
    const classeId = document.getElementById('selClasseLlista')?.value;
    const data     = document.getElementById('llistaData')?.value || TODAY();
    const container = document.getElementById('llistaContainer');
    if (!classeId) return;

    container.innerHTML = '<div style="padding:20px;text-align:center"><div class="g-spinner"></div></div>';

    const [classeSnap, alumnesSnap, absSnap] = await Promise.all([
      _get(_ref(_db, `gestiona/classes/${classeId}`)),
      _get(_ref(_db, 'gestiona/alumnes')),
      _get(_ref(_db, `gestiona/alumnesAbsencies/${data}/${classeId}`)),
    ]);
    const classe  = classeSnap.exists() ? classeSnap.val() : null;
    const alumnes = alumnesSnap.exists()
      ? Object.entries(alumnesSnap.val()).filter(([, a]) => a.grupId === classe?.grupId)
      : [];
    const absData = absSnap.exists() ? absSnap.val() : {};

    // Inicialitza estats: per defecte Present
    window._llistaState = { classeId, data, estats: {} };
    alumnes.forEach(([id]) => { window._llistaState.estats[id] = absData[id] || 'P'; });

    if (!alumnes.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Cap alumne en aquest grup</div></div>';
      return;
    }

    // Stats
    const stats = { P: 0, A: 0, R: 0, J: 0 };
    alumnes.forEach(([id]) => { const e = window._llistaState.estats[id]; stats[e] = (stats[e] || 0) + 1; });

    const rows = alumnes.map(([id, a], idx) => {
      const estat = window._llistaState.estats[id];
      return `<div class="llista-row" id="lrow_${id}">
        <span style="width:24px;font-size:12px;color:var(--ink-40);font-weight:600">${idx + 1}</span>
        ${avatar(initials(a.nom), 'var(--ink-20)', 'sm')}
        <span style="flex:1;font-size:13.5px;font-weight:500;color:var(--ink)">${a.nom} ${a.cognoms || ''}</span>
        <div style="display:flex;gap:6px">
          ${['P', 'R', 'A', 'J'].map(e => `
            <button class="present-btn ${estat === e ? _estatClass(e) : ''}"
              title="${ESTAT_LABELS[e]}" onclick="absSetEstat('${id}','${e}')">
              ${_estatIcon(e)}
            </button>`).join('')}
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <div class="card" style="padding:12px 16px;flex:1;min-width:80px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--green)">${stats.P || 0}</div>
          <div style="font-size:11px;color:var(--ink-40)">Presents</div>
        </div>
        <div class="card" style="padding:12px 16px;flex:1;min-width:80px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--accent)">${stats.A || 0}</div>
          <div style="font-size:11px;color:var(--ink-40)">Absents</div>
        </div>
        <div class="card" style="padding:12px 16px;flex:1;min-width:80px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--amber)">${stats.R || 0}</div>
          <div style="font-size:11px;color:var(--ink-40)">Retards</div>
        </div>
        <div class="card" style="padding:12px 16px;flex:1;min-width:80px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--blue)">${stats.J || 0}</div>
          <div style="font-size:11px;color:var(--ink-40)">Justificats</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:14px">${rows}</div>
      <button class="btn btn-primary" onclick="absGuardarLlista()">💾 Guardar llista</button>`;
  };

  window.absSetEstat = function (alumneId, estat) {
    if (!window._llistaState) return;
    window._llistaState.estats[alumneId] = estat;
    const row = document.getElementById('lrow_' + alumneId);
    if (!row) return;
    row.querySelectorAll('.present-btn').forEach((btn, i) => {
      const e = ['P', 'R', 'A', 'J'][i];
      btn.className = 'present-btn ' + (estat === e ? _estatClass(e) : '');
    });
  };

  window.absGuardarLlista = async function () {
    const { classeId, data, estats } = window._llistaState || {};
    if (!classeId) { showToast('Selecciona primer una classe', 'error'); return; }
    await _set(_ref(_db, `gestiona/alumnesAbsencies/${data}/${classeId}`), estats);
    showToast('Llista guardada!', 'success');
  };

  window.absExportarLlista = async function () {
    if (!window._llistaState) { showToast('Carrega primer una llista', 'error'); return; }
    const { classeId, data, estats } = window._llistaState;
    const alumnesSnap = await _get(_ref(_db, 'gestiona/alumnes'));
    const alumnes = alumnesSnap.exists() ? alumnesSnap.val() : {};
    const rows = [['Nom', 'Cognoms', 'Estat', 'Data']];
    Object.entries(estats).forEach(([id, e]) => {
      const a = alumnes[id] || {};
      rows.push([a.nom || '', a.cognoms || '', ESTAT_LABELS[e] || e, data]);
    });
    const { exportCSV } = await import('./ui.js');
    exportCSV(rows, `llista_${classeId}_${data}.csv`);
    showToast('Exportat!', 'success');
  };

  // ── Historial ──
  async function absCarregarHistorial() {
    const [absSnap, usersSnap] = await Promise.all([
      _get(_ref(_db, 'gestiona/absencies')),
      _get(_ref(_db, 'gestiona/users')),
    ]);
    const el = document.getElementById('historialBody');
    if (!el) return;
    if (!absSnap.exists()) { el.innerHTML = 'Cap absència registrada'; return; }
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const rows = [];
    Object.entries(absSnap.val())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20)
      .forEach(([data, abs]) => {
        Object.entries(abs).forEach(([uid, info]) => {
          rows.push(`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--ink-05)">
            ${avatar(initials(users[uid]?.nom || ''), 'var(--accent)', 'sm')}
            <div style="flex:1">
              <div style="font-weight:600;color:var(--ink);font-size:13px">${users[uid]?.nom || uid}</div>
              <div style="font-size:11.5px;color:var(--ink-40)">${info.motiu || '—'} ${info.obs ? '· ' + info.obs : ''}</div>
            </div>
            <div style="font-size:11.5px;color:var(--ink-20)">${data}</div>
            ${badge('Absent', 'alert')}
          </div>`);
        });
      });
    el.innerHTML = rows.join('') || 'Cap absència registrada';
  }
  window.absCarregarHistorial = absCarregarHistorial;
}

// ── Helpers visuals ──
function _estatClass(e) {
  return { P: 'present', A: 'absent', R: 'retard', J: 'justif' }[e] || '';
}
function _estatIcon(e) {
  return { P: '✓', A: '✗', R: 'R', J: 'J' }[e] || e;
}
