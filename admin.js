// ═══════════════════════════════════════════
//  Gestiona — Mòdul Admin
//  Panell d'administrador: mòduls, centre, curs
// ═══════════════════════════════════════════

import { G, MODULES_DEF, ROLES_DEF, FB_CONFIG } from '../firebase-config.js';
import { showToast, showModal, hideModal, showConfirm, openDynModal,
         initTabs, badge, roleChip, initials, avatar, fmtDate } from '../ui.js';
import { createUserViaRest } from '../auth.js';
import { buildSidebar, navigate } from '../router.js';

let _db, _ref, _set, _get, _update, _push, _remove, _onValue;

export function initAdminModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, set: _set, get: _get, update: _update,
     push: _push, remove: _remove, onValue: _onValue } = fbFns);
}

// ════════════════════════════════
//  PANELL ADMIN
// ════════════════════════════════
export async function renderAdmin() {
  const snap = await _get(_ref(_db, 'gestiona/config'));
  const cfg   = snap.exists() ? snap.val() : {};
  const mods  = cfg.modules  || {};
  const centre = cfg.centre  || {};
  const curs   = cfg.curs    || {};

  const modCards = Object.entries(MODULES_DEF).map(([k, def]) => {
    const isOn = mods[k] !== false;
    return `<div class="module-card">
      <div class="module-icon-wrap" style="background:var(--ink-05)">${def.icon}</div>
      <div class="module-info">
        <div class="module-name">${def.label}</div>
        <div class="module-desc">${def.desc}</div>
        <div class="module-toggle-wrap" style="margin-top:10px;display:flex;align-items:center;gap:8px">
          <button class="toggle ${isOn ? 'on' : ''}" id="modtog_${k}"
            onclick="toggleModule('${k}',this)"></button>
          <span id="modstatus_${k}" style="font-size:11.5px;font-weight:600;color:${isOn ? 'var(--green)' : 'var(--ink-20)'}">${isOn ? 'Actiu' : 'Inactiu'}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const periodeOpts = `<option value="3" ${curs.periodes === 3 ? 'selected' : ''}>3 Trimestres</option>
    <option value="2" ${curs.periodes === 2 ? 'selected' : ''}>2 Semestres</option>`;
  const frangesOpts = [6, 7, 8].map(n => `<option value="${n}" ${curs.franges === n ? 'selected' : ''}>${n} franges</option>`).join('');

  return `
  <div class="page-header">
    <div><div class="page-title">Panell d'Administrador</div>
    <div class="page-sub">Gestiona mòduls, centre i paràmetres del curs</div></div>
  </div>

  <div class="tabs">
    <button class="tab-btn" data-tab="tabModuls">🔧 Mòduls</button>
    <button class="tab-btn" data-tab="tabCentre">🏫 Centre</button>
    <button class="tab-btn" data-tab="tabCurs">📅 Curs Escolar</button>
  </div>

  <div id="tabModuls" class="tab-panel">
    <div class="card">
      <div class="card-title">Mòduls del sistema
        <span>Activa o desactiva funcionalitats per a tot el centre</span>
      </div>
      <div class="grid-3">${modCards}</div>
    </div>
  </div>

  <div id="tabCentre" class="tab-panel hidden">
    <div class="card">
      <div class="card-title">Dades del centre educatiu</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom del centre</label>
          <input class="form-input" id="centreNom" value="${centre.nom || ''}" placeholder="Institut Can Batlló"></div>
        <div class="form-group"><label class="form-label">Codi de centre</label>
          <input class="form-input" id="centreCodi" value="${centre.codi || ''}" placeholder="08060850"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Adreça</label>
          <input class="form-input" id="centreAdreca" value="${centre.adreca || ''}"></div>
        <div class="form-group"><label class="form-label">Municipi</label>
          <input class="form-input" id="centreMuni" value="${centre.municipi || ''}" placeholder="Barcelona"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Telèfon</label>
          <input class="form-input" id="centreTel" value="${centre.telefon || ''}"></div>
        <div class="form-group"><label class="form-label">Correu electrònic</label>
          <input class="form-input" id="centreEmail" value="${centre.email || ''}" placeholder="centre@xtec.cat"></div>
      </div>
      <button class="btn btn-primary" onclick="adminSaveCentre()">💾 Guardar dades del centre</button>
    </div>
  </div>

  <div id="tabCurs" class="tab-panel hidden">
    <div class="card">
      <div class="card-title">Configuració del curs escolar</div>
      <div class="form-group"><label class="form-label">Nom del curs</label>
        <input class="form-input" id="cursNom" value="${curs.nom || ''}" placeholder="2024-2025"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Inici del curs</label>
          <input class="form-input" type="date" id="cursInici" value="${curs.inici || ''}"></div>
        <div class="form-group"><label class="form-label">Fi del curs</label>
          <input class="form-input" type="date" id="cursFi" value="${curs.fi || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Períodes d'avaluació</label>
          <select class="form-select" id="cursPerio">${periodeOpts}</select></div>
        <div class="form-group"><label class="form-label">Franges horàries diàries</label>
          <select class="form-select" id="cursFranges">${frangesOpts}</select></div>
      </div>
      <button class="btn btn-primary" onclick="adminSaveCurs()">💾 Guardar configuració del curs</button>
    </div>
  </div>`;
}

export function bindAdmin() {
  initTabs(document.getElementById('pageContainer'));

  window.toggleModule = async function (key, btn) {
    const isOn = btn.classList.toggle('on');
    G.modules[key] = isOn;
    const statusEl = document.getElementById('modstatus_' + key);
    if (statusEl) { statusEl.textContent = isOn ? 'Actiu' : 'Inactiu'; statusEl.style.color = isOn ? 'var(--green)' : 'var(--ink-20)'; }
    await _set(_ref(_db, `gestiona/config/modules/${key}`), isOn);
    // Recarrega mòduls actius i reconstrueix sidebar
    const { loadModulesForCurrentUser } = await import('./auth.js').catch(() => ({}));
    if (loadModulesForCurrentUser) await loadModulesForCurrentUser();
    const centreSnap = await _get(_ref(_db, 'gestiona/config/centre'));
    buildSidebar(centreSnap.exists() ? centreSnap.val().nom : '');
    showToast(`${MODULES_DEF[key]?.label} ${isOn ? 'activat' : 'desactivat'}`, isOn ? 'success' : '');
  };

  window.adminSaveCentre = async function () {
    const centre = {
      nom:      document.getElementById('centreNom').value.trim(),
      codi:     document.getElementById('centreCodi').value.trim(),
      adreca:   document.getElementById('centreAdreca').value.trim(),
      municipi: document.getElementById('centreMuni').value.trim(),
      telefon:  document.getElementById('centreTel').value.trim(),
      email:    document.getElementById('centreEmail').value.trim(),
    };
    await _set(_ref(_db, 'gestiona/config/centre'), centre);
    const centreEl = document.getElementById('sidebarCentre');
    if (centreEl) centreEl.textContent = centre.nom || 'Gestiona';
    showToast('Dades del centre guardades', 'success');
  };

  window.adminSaveCurs = async function () {
    const curs = {
      nom:      document.getElementById('cursNom').value.trim(),
      inici:    document.getElementById('cursInici').value,
      fi:       document.getElementById('cursFi').value,
      periodes: parseInt(document.getElementById('cursPerio').value),
      franges:  parseInt(document.getElementById('cursFranges').value),
    };
    await _set(_ref(_db, 'gestiona/config/curs'), curs);
    showToast('Curs escolar configurat', 'success');
  };
}

// ════════════════════════════════
//  USUARIS I ROLS
// ════════════════════════════════
export async function renderUsuaris() {
  const snap  = await _get(_ref(_db, 'gestiona/users'));
  const users = snap.exists() ? Object.entries(snap.val()) : [];
  const roleOpts = Object.entries(ROLES_DEF).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

  const rows = users.map(([uid, u]) => {
    const rolDef = ROLES_DEF[u.rol] || { label: u.rol, color: '#999' };
    const ini    = initials(u.nom || u.email);
    return `<tr>
      <td><div class="td-main">
        ${avatar(ini, rolDef.color)}
        <div>
          <div style="font-weight:600;color:var(--ink);font-size:13.5px">${u.nom || '—'}</div>
          <div style="font-size:11.5px;color:var(--ink-40)">${u.email}</div>
        </div>
      </div></td>
      <td>${roleChip(u.rol, ROLES_DEF)}</td>
      <td style="font-size:12px;color:var(--ink-40)">${u.especialitat || '—'}</td>
      <td>${badge(u.actiu ? 'Actiu' : 'Inactiu', u.actiu ? 'ok' : 'gray')}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-xs" onclick="openEditUser('${uid}')">✏ Editar</button>
        ${uid !== G.user?.uid
          ? `<button class="btn btn-xs" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5"
              onclick="toggleUserActive('${uid}',${!u.actiu})">${u.actiu ? 'Desactivar' : 'Activar'}</button>`
          : ''}
      </div></td>
    </tr>`;
  }).join('');

  return `
  <div class="page-header">
    <div><div class="page-title">Usuaris i Rols</div>
    <div class="page-sub">Gestiona els usuaris del sistema i els seus permisos</div></div>
    <button class="btn btn-primary" onclick="showModal('newUserModal')">+ Nou usuari</button>
  </div>

  <div class="table-wrap" style="margin-bottom:20px">
    <table class="data-table">
      <thead><tr><th>Usuari</th><th>Rol</th><th>Especialitat</th><th>Estat</th><th>Accions</th></tr></thead>
      <tbody id="usuarisBody">
        ${rows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--ink-40)">Cap usuari</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Modal nou usuari -->
  <div id="newUserModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Nou usuari
        <button class="modal-close" onclick="hideModal('newUserModal')">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom</label>
          <input class="form-input" id="nuNom" placeholder="Joan"></div>
        <div class="form-group"><label class="form-label">Cognoms</label>
          <input class="form-input" id="nuCognoms" placeholder="García Martí"></div>
      </div>
      <div class="form-group"><label class="form-label">Correu electrònic</label>
        <input class="form-input" type="email" id="nuEmail" placeholder="professor@centre.cat"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Rol</label>
          <select class="form-select" id="nuRol">${roleOpts}</select></div>
        <div class="form-group"><label class="form-label">Contrasenya inicial</label>
          <input class="form-input" type="password" id="nuPass" placeholder="Mínim 8 caràcters"></div>
      </div>
      <div class="form-group"><label class="form-label">Especialitat / Departament</label>
        <input class="form-input" id="nuEsp" placeholder="Matemàtiques, Ciències..."></div>
      <div id="nuError" class="login-error" style="margin-bottom:8px"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newUserModal')">Cancel·lar</button>
        <button class="btn btn-primary" id="btnCreateUser" onclick="createUser()">Crear usuari</button>
      </div>
    </div>
  </div>

  <!-- Modal editar usuari -->
  <div id="editUserModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Editar usuari
        <button class="modal-close" onclick="hideModal('editUserModal')">✕</button>
      </div>
      <input type="hidden" id="euUid">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom</label>
          <input class="form-input" id="euNom"></div>
        <div class="form-group"><label class="form-label">Cognoms</label>
          <input class="form-input" id="euCognoms"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Rol</label>
          <select class="form-select" id="euRol">${roleOpts}</select></div>
        <div class="form-group"><label class="form-label">Especialitat</label>
          <input class="form-input" id="euEsp"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('editUserModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="saveEditUser()">Guardar canvis</button>
      </div>
    </div>
  </div>`;
}

export function bindUsuaris() {
  window.createUser = async function () {
    const nom  = document.getElementById('nuNom').value.trim();
    const cogs = document.getElementById('nuCognoms').value.trim();
    const email = document.getElementById('nuEmail').value.trim();
    const pass  = document.getElementById('nuPass').value;
    const rol   = document.getElementById('nuRol').value;
    const esp   = document.getElementById('nuEsp').value.trim();
    const errEl = document.getElementById('nuError');
    const showErr = m => { errEl.textContent = m; errEl.classList.add('show'); };

    if (!nom || !email || !pass) { showErr('Omple tots els camps obligatoris'); return; }
    if (pass.length < 8) { showErr('La contrasenya ha de tenir mínim 8 caràcters'); return; }

    const btn = document.getElementById('btnCreateUser');
    btn.textContent = 'Creant...'; btn.disabled = true;
    try {
      await createUserViaRest(email, pass,
        { nom: `${nom} ${cogs}`.trim(), rol, especialitat: esp },
        FB_CONFIG.apiKey
      );
      hideModal('newUserModal');
      showToast(`Usuari ${nom} creat correctament!`, 'success');
      navigate('usuaris');
    } catch (e) {
      showErr('Error: ' + e.message);
      btn.textContent = 'Crear usuari'; btn.disabled = false;
    }
  };

  window.openEditUser = async function (uid) {
    const snap = await _get(_ref(_db, `gestiona/users/${uid}`));
    const u = snap.val(); if (!u) return;
    const parts = (u.nom || '').split(' ');
    document.getElementById('euUid').value    = uid;
    document.getElementById('euNom').value    = parts[0] || '';
    document.getElementById('euCognoms').value = parts.slice(1).join(' ') || '';
    document.getElementById('euRol').value    = u.rol || 'professor';
    document.getElementById('euEsp').value    = u.especialitat || '';
    showModal('editUserModal');
  };

  window.saveEditUser = async function () {
    const uid  = document.getElementById('euUid').value;
    const nom  = document.getElementById('euNom').value.trim();
    const cogs = document.getElementById('euCognoms').value.trim();
    await _update(_ref(_db, `gestiona/users/${uid}`), {
      nom:         `${nom} ${cogs}`.trim(),
      rol:         document.getElementById('euRol').value,
      especialitat: document.getElementById('euEsp').value.trim(),
      updatedAt:   Date.now(),
    });
    hideModal('editUserModal');
    showToast('Usuari actualitzat', 'success');
    navigate('usuaris');
  };

  window.toggleUserActive = async function (uid, newVal) {
    await _update(_ref(_db, `gestiona/users/${uid}`), { actiu: newVal });
    showToast('Estat actualitzat', 'success');
    navigate('usuaris');
  };
}
