// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Perfil
// ═══════════════════════════════════════════

import { G, ROLES_DEF } from '../firebase-config.js';
import { showToast, showModal, hideModal, avatar, initials } from '../ui.js';

let _db, _ref, _update;

export function initPerfilModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, update: _update } = fbFns);
}

export async function renderPerfil() {
  const u      = G.profile || {};
  const rolDef = ROLES_DEF[u.rol] || { label: u.rol || '—', color: '#999' };
  const nom    = u.nom || G.user?.email || '';
  const parts  = nom.split(' ');
  const prNom  = parts[0] || '';
  const prCogs = parts.slice(1).join(' ') || '';
  const ini    = initials(nom);

  return `
  <div class="page-header">
    <div>
      <div class="page-title">El meu perfil</div>
      <div class="page-sub">Informació personal i configuració del compte</div>
    </div>
  </div>

  <div class="grid-2">
    <!-- Dades personals -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--ink-05)">
        ${avatar(ini, rolDef.color, 'lg')}
        <div>
          <div style="font-size:17px;font-weight:700;color:var(--ink)">${nom || '—'}</div>
          <span class="role-chip"
            style="margin-top:5px;display:inline-block;
              background:${rolDef.color}18;color:${rolDef.color};border-color:${rolDef.color}40">
            ${rolDef.label}
          </span>
          <div style="font-size:12px;color:var(--ink-40);margin-top:4px">${G.user?.email || '—'}</div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nom</label>
          <input class="form-input" id="pNom" value="${prNom}">
        </div>
        <div class="form-group">
          <label class="form-label">Cognoms</label>
          <input class="form-input" id="pCognoms" value="${prCogs}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Correu electrònic</label>
        <input class="form-input" value="${G.user?.email || ''}" disabled
          style="background:var(--ink-05);color:var(--ink-40)">
      </div>
      <div class="form-group">
        <label class="form-label">Especialitat / Departament</label>
        <input class="form-input" id="pEsp" value="${u.especialitat || ''}"
          placeholder="Matemàtiques, Humanitats...">
      </div>
      <button class="btn btn-primary" onclick="perfilGuardar()">
        💾 Guardar canvis
      </button>
    </div>

    <!-- Seguretat -->
    <div class="card">
      <div class="card-title">Seguretat i sessió</div>

      <div style="margin-bottom:20px">
        <div style="font-size:13px;color:var(--ink-60);margin-bottom:12px;line-height:1.6">
          Per canviar la contrasenya, rebràs un correu a <strong>${G.user?.email}</strong>
          amb les instruccions necessàries.
        </div>
        <button class="btn btn-secondary w-full" onclick="showModal('resetModal')">
          🔑 Canviar contrasenya
        </button>
      </div>

      <div style="padding-top:16px;border-top:1px solid var(--ink-05)">
        <div style="font-size:13px;color:var(--ink-40);margin-bottom:10px">
          Sessió activa com a <strong>${G.user?.email}</strong>
        </div>
        <button class="btn btn-secondary w-full" style="border-color:#fca5a5;color:#991b1b"
          onclick="doLogout()">
          ↩ Tancar sessió
        </button>
      </div>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--ink-05)">
        <div class="card-title" style="margin-bottom:10px">Informació del compte</div>
        <div style="font-size:13px;color:var(--ink-60);display:flex;flex-direction:column;gap:6px">
          <div>🆔 UID: <code style="font-size:11px;background:var(--ink-05);padding:2px 5px;border-radius:4px">${G.user?.uid?.slice(0, 16)}...</code></div>
          <div>📅 Creat: ${new Date(G.profile?.createdAt || Date.now()).toLocaleDateString('ca-ES')}</div>
          <div>🛡 Rol: ${rolDef.label}</div>
        </div>
      </div>
    </div>
  </div>`;
}

export function bindPerfil() {
  window.perfilGuardar = async function () {
    const nom  = document.getElementById('pNom')?.value.trim();
    const cogs = document.getElementById('pCognoms')?.value.trim();
    const esp  = document.getElementById('pEsp')?.value.trim();
    const nomComplet = `${nom} ${cogs}`.trim();

    await _update(_ref(_db, `gestiona/users/${G.user?.uid}`), {
      nom:         nomComplet,
      especialitat: esp,
      updatedAt:   Date.now(),
    });

    // Actualitza G.profile i UI sidebar
    if (G.profile) G.profile.nom = nomComplet;
    const uNameEl = document.getElementById('uName');
    if (uNameEl) uNameEl.textContent = nomComplet;

    showToast('Perfil actualitzat!', 'success');
  };
}
