// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Classes & Horaris
// ═══════════════════════════════════════════

import { G } from '../firebase-config.js';
import { showToast, showModal, hideModal, showConfirm, openDynModal } from '../ui.js';
import { navigate } from '../router.js';

let _db, _ref, _get, _push, _update, _remove;

export function initClassesModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, push: _push, update: _update, remove: _remove } = fbFns);
}

export async function renderClasses() {
  const [classesSnap, grupsSnap, usersSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/classes')),
    _get(_ref(_db, 'gestiona/grups')),
    _get(_ref(_db, 'gestiona/users')),
  ]);

  const classes = classesSnap.exists() ? Object.entries(classesSnap.val()) : [];
  const grups   = grupsSnap.exists()   ? grupsSnap.val() : {};
  const profs   = usersSnap.exists()
    ? Object.values(usersSnap.val()).filter(u => ['professor','tutor','cap_estudis'].includes(u.rol))
    : [];

  const grupOpts = Object.entries(grups)
    .map(([id, g]) => `<option value="${id}">${g.nom}</option>`).join('');
  const profOpts = profs.map(u => `<option>${u.nom}</option>`).join('');

  const colors = ['var(--accent)','var(--teal)','var(--purple)','var(--amber)','var(--blue)','#ec4899'];

  const cards = classes.map(([id, c], i) => `
    <div class="card" style="border-top:3px solid ${colors[i % colors.length]}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--ink)">${c.nom}</div>
          <div style="font-size:12px;color:var(--ink-40);margin-top:2px">
            ${grups[c.grupId]?.nom || '—'} · ${c.assignatura || '—'}
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" onclick="classesEdit('${id}')">✏</button>
          <button class="btn-icon" style="color:var(--accent)" onclick="classesDelete('${id}')">🗑</button>
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--ink-60);display:flex;flex-direction:column;gap:5px">
        <span>👤 ${c.professor || 'Sense professor'}</span>
        <span>🏫 ${c.aula || 'Sense aula'}</span>
        <span>📅 ${c.horari || 'Sense horari'}</span>
        ${c.hores ? `<span>⏱ ${c.hores}h/setmana</span>` : ''}
      </div>
    </div>`).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Classes & Horaris</div>
      <div class="page-sub">Gestiona classes, assignatures i professors assignats</div>
    </div>
    <button class="btn btn-primary" onclick="showModal('newClasseModal')">+ Nova classe</button>
  </div>

  ${classes.length
    ? `<div class="grid-3">${cards}</div>`
    : `<div class="empty-state">
         <div class="empty-icon">📚</div>
         <div class="empty-title">Cap classe creada</div>
         <div class="empty-sub">Crea la primera classe del centre</div>
       </div>`}

  <div id="newClasseModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Nova classe
        <button class="modal-close" onclick="hideModal('newClasseModal')">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nom *</label>
          <input class="form-input" id="cNom" placeholder="Matemàtiques 2n ESO B">
        </div>
        <div class="form-group">
          <label class="form-label">Assignatura</label>
          <input class="form-input" id="cAssig" placeholder="Matemàtiques">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Grup</label>
          <select class="form-select" id="cGrup">
            <option value="">Sense grup</option>${grupOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Professor/a</label>
          <select class="form-select" id="cProf">
            <option value="">Sense assignar</option>${profOpts}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Horari (ex: Dl 9-10, Dc 11-12)</label>
        <input class="form-input" id="cHorari" placeholder="Dl 9-10, Dc 11-12, Dv 9-10">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Aula</label>
          <input class="form-input" id="cAula" placeholder="Aula 203">
        </div>
        <div class="form-group">
          <label class="form-label">Hores setmanals</label>
          <input class="form-input" type="number" id="cHores" min="1" max="20">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newClasseModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="classesCreate()">Crear classe</button>
      </div>
    </div>
  </div>`;
}

export function bindClasses() {
  window.classesCreate = async function () {
    const nom = document.getElementById('cNom').value.trim();
    if (!nom) { showToast('Introdueix el nom de la classe', 'error'); return; }
    await _push(_ref(_db, 'gestiona/classes'), {
      nom,
      assignatura: document.getElementById('cAssig').value.trim(),
      grupId:      document.getElementById('cGrup').value,
      professor:   document.getElementById('cProf').value,
      horari:      document.getElementById('cHorari').value.trim(),
      aula:        document.getElementById('cAula').value.trim(),
      hores:       parseInt(document.getElementById('cHores').value) || 0,
      createdAt:   Date.now(),
      createdBy:   G.user?.uid,
    });
    hideModal('newClasseModal');
    showToast('Classe creada!', 'success');
    navigate('classes');
  };

  window.classesDelete = function (id) {
    showConfirm('Eliminar classe', 'Vols eliminar aquesta classe? Les notes associades es conservaran.', async () => {
      await _remove(_ref(_db, `gestiona/classes/${id}`));
      showToast('Classe eliminada');
      navigate('classes');
    });
  };

  window.classesEdit = async function (id) {
    const [snap, gSnap, uSnap] = await Promise.all([
      _get(_ref(_db, `gestiona/classes/${id}`)),
      _get(_ref(_db, 'gestiona/grups')),
      _get(_ref(_db, 'gestiona/users')),
    ]);
    const c = snap.val(); if (!c) return;
    const grups = gSnap.exists() ? Object.entries(gSnap.val()) : [];
    const profs = uSnap.exists()
      ? Object.values(uSnap.val()).filter(u => ['professor','tutor','cap_estudis'].includes(u.rol))
      : [];

    const grupOpts = grups.map(([gid, g]) =>
      `<option value="${gid}" ${c.grupId === gid ? 'selected' : ''}>${g.nom}</option>`).join('');
    const profOpts = profs.map(u =>
      `<option ${c.professor === u.nom ? 'selected' : ''}>${u.nom}</option>`).join('');

    openDynModal('editClasseModal', `
      <div class="modal-box">
        <div class="modal-title">Editar classe
          <button class="modal-close" onclick="hideModal('editClasseModal')">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom</label>
            <input class="form-input" id="ecNom" value="${c.nom || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Assignatura</label>
            <input class="form-input" id="ecAssig" value="${c.assignatura || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Grup</label>
            <select class="form-select" id="ecGrup">
              <option value="">Sense grup</option>${grupOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Professor/a</label>
            <select class="form-select" id="ecProf">
              <option value="">Sense assignar</option>${profOpts}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Horari</label>
          <input class="form-input" id="ecHorari" value="${c.horari || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Aula</label>
            <input class="form-input" id="ecAula" value="${c.aula || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Hores setmanals</label>
            <input class="form-input" type="number" id="ecHores" value="${c.hores || ''}">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="hideModal('editClasseModal')">Cancel·lar</button>
          <button class="btn btn-primary" onclick="classesUpdate('${id}')">Guardar canvis</button>
        </div>
      </div>`);
  };

  window.classesUpdate = async function (id) {
    await _update(_ref(_db, `gestiona/classes/${id}`), {
      nom:         document.getElementById('ecNom').value.trim(),
      assignatura: document.getElementById('ecAssig').value.trim(),
      grupId:      document.getElementById('ecGrup').value,
      professor:   document.getElementById('ecProf').value,
      horari:      document.getElementById('ecHorari').value.trim(),
      aula:        document.getElementById('ecAula').value.trim(),
      hores:       parseInt(document.getElementById('ecHores').value) || 0,
      updatedAt:   Date.now(),
    });
    hideModal('editClasseModal');
    showToast('Classe actualitzada!', 'success');
    navigate('classes');
  };
}
