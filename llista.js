// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Llista d'alumnes
//  Passar llista per classe i data
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, initials, avatar, exportCSV } from './ui.js';

let _db, _ref, _get, _set;

export function initLlistaModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, set: _set } = fbFns);
}

const TODAY     = () => new Date().toISOString().split('T')[0];
const ESTATS    = ['P', 'R', 'A', 'J'];
const ESTAT_LABEL = { P:'Present', R:'Retard', A:'Absent', J:'Justificat' };
const ESTAT_CLS   = { P:'present', R:'retard', A:'absent', J:'justif' };
const ESTAT_ICON  = { P:'✓', R:'R', A:'✗', J:'J' };

// Estat local de la llista activa
let _llistaState = null;

export async function renderLlista() {
  const classesSnap = await _get(_ref(_db, 'gestiona/classes'));
  const classes = classesSnap.exists() ? Object.entries(classesSnap.val()) : [];
  const classeOpts = classes.map(([id, c]) => `<option value="${id}">${c.nom}</option>`).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Passar llista</div>
      <div class="page-sub">Control d'assistència d'alumnes per classe i data</div>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
      <div class="form-group" style="margin-bottom:0;flex:1;min-width:180px">
        <label class="form-label">Classe</label>
        <select class="form-select" id="llistaClasse" onchange="llistaCarregar()">
          <option value="">Selecciona una classe...</option>
          ${classeOpts}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Data</label>
        <input class="form-input" type="date" id="llistaData"
          value="${TODAY()}" onchange="llistaCarregar()">
      </div>
      <button class="btn btn-secondary btn-sm" onclick="llistaExportar()">⬇ Exportar CSV</button>
    </div>
  </div>

  <div id="llistaContainer">
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">Selecciona una classe per passar llista</div>
    </div>
  </div>`;
}

export function bindLlista() {
  window.llistaCarregar = async function () {
    const classeId = document.getElementById('llistaClasse')?.value;
    const data     = document.getElementById('llistaData')?.value || TODAY();
    const container = document.getElementById('llistaContainer');
    if (!classeId) return;

    container.innerHTML = `<div style="padding:40px;text-align:center"><div class="g-spinner"></div></div>`;

    const [classeSnap, alumnesSnap, absSnap] = await Promise.all([
      _get(_ref(_db, `gestiona/classes/${classeId}`)),
      _get(_ref(_db, 'gestiona/alumnes')),
      _get(_ref(_db, `gestiona/alumnesAbsencies/${data}/${classeId}`)),
    ]);

    const classe  = classeSnap.exists() ? classeSnap.val() : null;
    const absData = absSnap.exists() ? absSnap.val() : {};
    const alumnes = alumnesSnap.exists()
      ? Object.entries(alumnesSnap.val())
          .filter(([, a]) => a.grupId === classe?.grupId)
          .sort(([, a], [, b]) => (a.cognoms || '').localeCompare(b.cognoms || ''))
      : [];

    if (!alumnes.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Cap alumne en aquest grup</div>
        <div class="empty-sub">Assigna alumnes al grup de la classe des de Secretaria.</div>
      </div>`;
      return;
    }

    // Inicialitza estat local (P per defecte)
    const estats = {};
    alumnes.forEach(([id]) => { estats[id] = absData[id] || 'P'; });
    _llistaState = { classeId, data, estats };

    _renderLlistaUI(alumnes, estats, container);
  };

  window.llistaSetEstat = function (alumneId, estat) {
    if (!_llistaState) return;
    _llistaState.estats[alumneId] = estat;

    const row = document.getElementById(`lrow_${alumneId}`);
    if (!row) return;
    row.querySelectorAll('.present-btn').forEach((btn, i) => {
      const e = ESTATS[i];
      btn.className = `present-btn${estat === e ? ' ' + ESTAT_CLS[e] : ''}`;
    });
    _updateStats();
  };

  window.llistaMarcarTots = function (estat) {
    if (!_llistaState) return;
    Object.keys(_llistaState.estats).forEach(id => window.llistaSetEstat(id, estat));
  };

  window.llistaGuardar = async function () {
    if (!_llistaState) { showToast('Carrega primer una llista', 'error'); return; }
    const { classeId, data, estats } = _llistaState;
    await _set(_ref(_db, `gestiona/alumnesAbsencies/${data}/${classeId}`), estats);
    showToast('Llista guardada correctament!', 'success');
  };

  window.llistaExportar = async function () {
    if (!_llistaState) { showToast('Carrega primer una llista', 'error'); return; }
    const { classeId, data, estats } = _llistaState;
    const alumnesSnap = await _get(_ref(_db, 'gestiona/alumnes'));
    const alumnes = alumnesSnap.exists() ? alumnesSnap.val() : {};
    const rows = [['Nom', 'Cognoms', 'Estat', 'Descripció', 'Data']];
    Object.entries(estats).forEach(([id, e]) => {
      const a = alumnes[id] || {};
      rows.push([a.nom || '', a.cognoms || '', e, ESTAT_LABEL[e] || e, data]);
    });
    exportCSV(rows, `llista_${classeId}_${data}.csv`);
    showToast('CSV exportat!', 'success');
  };
}

// ── Renderitza la taula de llista ──
function _renderLlistaUI(alumnes, estats, container) {
  const stats = { P: 0, A: 0, R: 0, J: 0 };
  alumnes.forEach(([id]) => { const e = estats[id]; stats[e] = (stats[e] || 0) + 1; });

  const rows = alumnes.map(([id, a], idx) => {
    const estat = estats[id];
    return `<div class="llista-row" id="lrow_${id}">
      <span style="width:28px;font-size:12px;color:var(--ink-20);font-weight:600;text-align:right;flex-shrink:0">${idx + 1}</span>
      ${avatar(initials(a.nom), 'var(--ink-20)', 'sm')}
      <span style="flex:1;font-size:13.5px;font-weight:500;color:var(--ink)">
        ${a.cognoms || ''}, ${a.nom}
      </span>
      <div style="display:flex;gap:5px">
        ${ESTATS.map(e => `
          <button class="present-btn${estat === e ? ' ' + ESTAT_CLS[e] : ''}"
            title="${ESTAT_LABEL[e]}"
            onclick="llistaSetEstat('${id}','${e}')">
            ${ESTAT_ICON[e]}
          </button>`).join('')}
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="grid-4" style="margin-bottom:16px" id="llistaStats">
      <div class="stat-card" style="padding:12px 14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--green)" id="statP">${stats.P || 0}</div>
        <div style="font-size:11px;color:var(--ink-40)">Presents</div>
      </div>
      <div class="stat-card" style="padding:12px 14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--accent)" id="statA">${stats.A || 0}</div>
        <div style="font-size:11px;color:var(--ink-40)">Absents</div>
      </div>
      <div class="stat-card" style="padding:12px 14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--amber)" id="statR">${stats.R || 0}</div>
        <div style="font-size:11px;color:var(--ink-40)">Retards</div>
      </div>
      <div class="stat-card" style="padding:12px 14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--blue)" id="statJ">${stats.J || 0}</div>
        <div style="font-size:11px;color:var(--ink-40)">Justificats</div>
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--ink-40);align-self:center">Marcar tots:</span>
      ${ESTATS.map(e => `
        <button class="btn btn-xs present-btn ${ESTAT_CLS[e]}" onclick="llistaMarcarTots('${e}')">
          ${ESTAT_ICON[e]} ${ESTAT_LABEL[e]}
        </button>`).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:14px">
      ${rows}
    </div>

    <button class="btn btn-primary" onclick="llistaGuardar()">
      💾 Guardar llista
    </button>`;
}

// ── Actualitza comptadors sense re-renderitzar ──
function _updateStats() {
  if (!_llistaState) return;
  const stats = { P: 0, A: 0, R: 0, J: 0 };
  Object.values(_llistaState.estats).forEach(e => { stats[e] = (stats[e] || 0) + 1; });
  ['P', 'A', 'R', 'J'].forEach(e => {
    const el = document.getElementById('stat' + e);
    if (el) el.textContent = stats[e] || 0;
  });
}
