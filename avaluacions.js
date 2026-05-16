// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Avaluacions
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, badge, exportCSV } from './ui.js';

let _db, _ref, _get, _set;

export function initAvaluacionsModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, set: _set } = fbFns);
}

export async function renderAvaluacions() {
  const [classesSnap, cfgSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/classes')),
    _get(_ref(_db, 'gestiona/config/curs')),
  ]);

  const classes    = classesSnap.exists() ? Object.entries(classesSnap.val()) : [];
  const numPeriodes = cfgSnap.exists() ? (cfgSnap.val().periodes || 3) : 3;
  const periodes   = numPeriodes === 2
    ? [{ val: '1', label: '1r Semestre' }, { val: '2', label: '2n Semestre' }]
    : [{ val: '1', label: '1r Trimestre' }, { val: '2', label: '2n Trimestre' }, { val: '3', label: '3r Trimestre' }];

  const classeOpts  = classes.map(([id, c]) => `<option value="${id}">${c.nom}</option>`).join('');
  const periodeOpts = periodes.map(p => `<option value="${p.val}">${p.label}</option>`).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Avaluacions</div>
      <div class="page-sub">Notes per competències (CA1, CA2, CA3) i períodes</div>
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end">
    <div class="form-group" style="margin-bottom:0;min-width:200px">
      <label class="form-label">Classe</label>
      <select class="form-select" id="avalClasse" onchange="avalCarregar()">
        <option value="">Selecciona classe...</option>${classeOpts}
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Període</label>
      <select class="form-select" id="avalPeriode" onchange="avalCarregar()">${periodeOpts}</select>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="avalExportar()">⬇ Exportar CSV</button>
  </div>

  <div id="avalContainer">
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">Selecciona una classe i un període</div>
      <div class="empty-sub">Les notes es guarden per classe, periode i alumne</div>
    </div>
  </div>`;
}

export function bindAvaluacions() {
  window.avalCarregar = async function () {
    const classeId = document.getElementById('avalClasse')?.value;
    const periode  = document.getElementById('avalPeriode')?.value;
    if (!classeId) return;

    const container = document.getElementById('avalContainer');
    container.innerHTML = '<div style="padding:40px;text-align:center"><div class="g-spinner"></div></div>';

    const [classeSnap, alumnesSnap, notesSnap] = await Promise.all([
      _get(_ref(_db, `gestiona/classes/${classeId}`)),
      _get(_ref(_db, 'gestiona/alumnes')),
      _get(_ref(_db, `gestiona/notes/${classeId}/${periode}`)),
    ]);

    const classe  = classeSnap.val();
    const notes   = notesSnap.exists() ? notesSnap.val() : {};
    const alumnes = alumnesSnap.exists()
      ? Object.entries(alumnesSnap.val())
          .filter(([, a]) => a.grupId === classe?.grupId)
          .sort(([, a], [, b]) => (a.cognoms || '').localeCompare(b.cognoms || ''))
      : [];

    if (!alumnes.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Cap alumne en aquest grup</div></div>';
      return;
    }

    const rows = alumnes.map(([id, a]) => {
      const n     = notes[id] || {};
      const ca1   = parseFloat(n.ca1) || 0;
      const ca2   = parseFloat(n.ca2) || 0;
      const ca3   = parseFloat(n.ca3) || 0;
      const avg   = n.ca1 || n.ca2 || n.ca3 ? ((ca1 + ca2 + ca3) / 3).toFixed(1) : '—';
      const estat = avg === '—' ? 'gray' : parseFloat(avg) >= 5 ? 'ok' : parseFloat(avg) >= 3 ? 'warn' : 'alert';
      const estTxt = avg === '—' ? 'Sense nota' : parseFloat(avg) >= 5 ? 'Assolit' : parseFloat(avg) >= 3 ? 'Parcial' : 'No assolit';

      const input = (key, val) =>
        `<input id="nota_${id}_${key}" value="${val}"
          style="width:52px;border:1px solid var(--ink-20);border-radius:6px;padding:5px 6px;
            font-size:13px;text-align:center;font-family:var(--font);outline:none"
          onblur="this.style.borderColor='var(--ink-20)'"
          onfocus="this.style.borderColor='var(--accent)'">`;

      return `<tr>
        <td style="font-weight:600;color:var(--ink)">${a.cognoms || ''}, ${a.nom}</td>
        <td>${input('ca1', n.ca1 || '')}</td>
        <td>${input('ca2', n.ca2 || '')}</td>
        <td>${input('ca3', n.ca3 || '')}</td>
        <td>
          <select id="nota_${id}_act"
            style="border:1px solid var(--ink-20);border-radius:6px;padding:5px 7px;font-size:12.5px;font-family:var(--font)">
            ${['A','B','C','D'].map(v => `<option ${(n.act || 'A') === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td style="font-weight:800;font-size:16px;color:var(--ink)">${avg}</td>
        <td>${badge(estTxt, estat)}</td>
        <td>
          <button class="btn btn-xs btn-secondary"
            onclick="avalGuardarNota('${classeId}','${periode}','${id}')">💾</button>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Alumne/a</th>
              <th>CA1</th><th>CA2</th><th>CA3</th>
              <th>Actitud</th>
              <th>Nota final</th>
              <th>Estat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-primary"
          onclick="avalGuardarTotes('${classeId}','${periode}',[${alumnes.map(([id]) => `'${id}'`).join(',')}])">
          💾 Guardar totes les notes
        </button>
      </div>`;
  };

  window.avalGuardarNota = async function (classeId, periode, alumneId) {
    await _set(_ref(_db, `gestiona/notes/${classeId}/${periode}/${alumneId}`), {
      ca1: document.getElementById(`nota_${alumneId}_ca1`)?.value || '',
      ca2: document.getElementById(`nota_${alumneId}_ca2`)?.value || '',
      ca3: document.getElementById(`nota_${alumneId}_ca3`)?.value || '',
      act: document.getElementById(`nota_${alumneId}_act`)?.value || 'A',
      updatedAt: Date.now(),
    });
    showToast('Nota guardada!', 'success');
  };

  window.avalGuardarTotes = async function (classeId, periode, ids) {
    for (const id of ids) await window.avalGuardarNota(classeId, periode, id);
    showToast('Totes les notes guardades!', 'success');
  };

  window.avalExportar = async function () {
    const classeId = document.getElementById('avalClasse')?.value;
    const periode  = document.getElementById('avalPeriode')?.value;
    if (!classeId) { showToast('Selecciona primer una classe', 'error'); return; }

    const [classeSnap, alumnesSnap, notesSnap] = await Promise.all([
      _get(_ref(_db, `gestiona/classes/${classeId}`)),
      _get(_ref(_db, 'gestiona/alumnes')),
      _get(_ref(_db, `gestiona/notes/${classeId}/${periode}`)),
    ]);

    const classe  = classeSnap.val();
    const notes   = notesSnap.exists() ? notesSnap.val() : {};
    const alumnes = alumnesSnap.exists()
      ? Object.entries(alumnesSnap.val()).filter(([, a]) => a.grupId === classe?.grupId)
      : [];

    const rows = [['Nom', 'Cognoms', 'CA1', 'CA2', 'CA3', 'Actitud', 'Nota final']];
    alumnes.forEach(([id, a]) => {
      const n   = notes[id] || {};
      const avg = n.ca1 || n.ca2 || n.ca3
        ? ((parseFloat(n.ca1 || 0) + parseFloat(n.ca2 || 0) + parseFloat(n.ca3 || 0)) / 3).toFixed(1)
        : '';
      rows.push([a.nom, a.cognoms || '', n.ca1 || '', n.ca2 || '', n.ca3 || '', n.act || '', avg]);
    });
    exportCSV(rows, `notes_${classeId}_t${periode}.csv`);
    showToast('Notes exportades!', 'success');
  };
}
