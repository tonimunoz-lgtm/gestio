// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Espais
// ═══════════════════════════════════════════

import { G } from '../firebase-config.js';
import { showToast, showModal, hideModal, showConfirm, openDynModal, badge } from '../ui.js';
import { navigate } from '../router.js';

let _db, _ref, _get, _push, _update, _remove;

export function initEspaisModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, push: _push, update: _update, remove: _remove } = fbFns);
}

const TODAY = () => new Date().toISOString().split('T')[0];

export async function renderEspais() {
  const snap   = await _get(_ref(_db, 'gestiona/espais'));
  const espais = snap.exists() ? Object.entries(snap.val()) : [];

  const estatColor = { lliure: 'var(--green)', ocupat: 'var(--accent)', reservat: 'var(--amber)' };
  const estatLabel = { lliure: 'Lliure', ocupat: 'Ocupat', reservat: 'Reservat' };

  const cards = espais.map(([id, e]) => `
    <div class="card" style="border-left:4px solid ${estatColor[e.estat || 'lliure']}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--ink)">${e.nom}</div>
          ${e.descrip ? `<div style="font-size:12px;color:var(--ink-40);margin-top:2px">${e.descrip}</div>` : ''}
        </div>
        <button class="btn-icon" style="color:var(--accent)"
          onclick="espaisEliminar('${id}')">🗑</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        ${badge(estatLabel[e.estat || 'lliure'], e.estat === 'lliure' ? 'ok' : e.estat === 'ocupat' ? 'alert' : 'warn')}
        ${e.capacitat ? `<span style="font-size:12px;color:var(--ink-40)">👥 Capacitat: ${e.capacitat}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="espaisVeureReserves('${id}','${e.nom}')">
          📋 Reserves
        </button>
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="espaisReservar('${id}')">
          📅 Reservar
        </button>
      </div>
    </div>`).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Espais</div>
      <div class="page-sub">Gestió i reserva d'espais del centre</div>
    </div>
    <button class="btn btn-primary" onclick="showModal('newEspaiModal')">+ Nou espai</button>
  </div>

  ${espais.length
    ? `<div class="grid-3">${cards}</div>`
    : `<div class="empty-state">
        <div class="empty-icon">🏫</div>
        <div class="empty-title">Cap espai registrat</div>
        <div class="empty-sub">Afegeix espais per poder-los reservar</div>
      </div>`}

  <div id="newEspaiModal" class="modal-overlay hidden">
    <div class="modal-box modal-sm">
      <div class="modal-title">Nou espai
        <button class="modal-close" onclick="hideModal('newEspaiModal')">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nom *</label>
        <input class="form-input" id="espNom" placeholder="Aula d'informàtica, Gimnàs...">
      </div>
      <div class="form-group">
        <label class="form-label">Descripció</label>
        <input class="form-input" id="espDesc" placeholder="Descripció breu">
      </div>
      <div class="form-group">
        <label class="form-label">Capacitat (persones)</label>
        <input class="form-input" type="number" id="espCap" placeholder="30" min="1">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newEspaiModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="espaisCrear()">Crear espai</button>
      </div>
    </div>
  </div>`;
}

export function bindEspais() {
  window.espaisCrear = async function () {
    const nom = document.getElementById('espNom')?.value.trim();
    if (!nom) { showToast('Introdueix el nom', 'error'); return; }
    await _push(_ref(_db, 'gestiona/espais'), {
      nom,
      descrip:    document.getElementById('espDesc').value.trim(),
      capacitat:  parseInt(document.getElementById('espCap').value) || 0,
      estat:      'lliure',
      createdAt:  Date.now(),
      createdBy:  G.user?.uid,
    });
    hideModal('newEspaiModal');
    showToast('Espai creat!', 'success');
    navigate('espais');
  };

  window.espaisEliminar = function (id) {
    showConfirm('Eliminar espai', 'Vols eliminar aquest espai i totes les seves reserves?', async () => {
      await _remove(_ref(_db, `gestiona/espais/${id}`));
      await _remove(_ref(_db, `gestiona/reserves/${id}`));
      showToast('Espai eliminat');
      navigate('espais');
    });
  };

  window.espaisReservar = function (id) {
    openDynModal('reservaModal', `
      <div class="modal-box modal-sm">
        <div class="modal-title">Reservar espai
          <button class="modal-close" onclick="hideModal('reservaModal')">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data</label>
            <input class="form-input" type="date" id="resData" value="${TODAY()}">
          </div>
          <div class="form-group">
            <label class="form-label">Hora inici</label>
            <input class="form-input" type="time" id="resHi" value="09:00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora fi</label>
            <input class="form-input" type="time" id="resHf" value="10:00">
          </div>
          <div class="form-group">
            <label class="form-label">Motiu</label>
            <input class="form-input" id="resMot" placeholder="Reunió, examen...">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="hideModal('reservaModal')">Cancel·lar</button>
          <button class="btn btn-primary" onclick="espaisConfirmarReserva('${id}')">Confirmar reserva</button>
        </div>
      </div>`);
  };

  window.espaisConfirmarReserva = async function (id) {
    const data  = document.getElementById('resData')?.value;
    const horaI = document.getElementById('resHi')?.value;
    const horaF = document.getElementById('resHf')?.value;
    const motiu = document.getElementById('resMot')?.value.trim();
    await _push(_ref(_db, `gestiona/reserves/${id}`), {
      data, horaI, horaF, motiu,
      reservatPer: G.user?.uid,
      createdAt:   Date.now(),
    });
    await _update(_ref(_db, `gestiona/espais/${id}`), { estat: 'reservat' });
    hideModal('reservaModal');
    showToast('Reserva creada!', 'success');
    navigate('espais');
  };

  window.espaisVeureReserves = async function (id, nom) {
    const snap = await _get(_ref(_db, `gestiona/reserves/${id}`));
    const reserves = snap.exists() ? Object.entries(snap.val()) : [];
    const usersSnap = await _get(_ref(_db, 'gestiona/users'));
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const rows = reserves
      .sort(([, a], [, b]) => (a.data + a.horaI).localeCompare(b.data + b.horaI))
      .map(([rid, r]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--ink-05)">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--ink)">${r.data} · ${r.horaI} – ${r.horaF}</div>
            <div style="font-size:12px;color:var(--ink-40)">${r.motiu || '—'} · ${users[r.reservatPer]?.nom || '—'}</div>
          </div>
          <button class="btn btn-xs" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5"
            onclick="espaisCancellarReserva('${id}','${rid}')">Cancel·lar</button>
        </div>`).join('');

    openDynModal('reservesModal', `
      <div class="modal-box">
        <div class="modal-title">Reserves: ${nom}
          <button class="modal-close" onclick="hideModal('reservesModal')">✕</button>
        </div>
        ${rows || '<p style="color:var(--ink-40);font-size:13px;padding:12px 0">Cap reserva activa</p>'}
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="hideModal('reservesModal')">Tancar</button>
          <button class="btn btn-primary" onclick="espaisReservar('${id}');hideModal('reservesModal')">+ Nova reserva</button>
        </div>
      </div>`);
  };

  window.espaisCancellarReserva = async function (espaiId, resId) {
    await _remove(_ref(_db, `gestiona/reserves/${espaiId}/${resId}`));
    // Si no queden reserves, marca com a lliure
    const snap = await _get(_ref(_db, `gestiona/reserves/${espaiId}`));
    if (!snap.exists()) {
      await _update(_ref(_db, `gestiona/espais/${espaiId}`), { estat: 'lliure' });
    }
    showToast('Reserva cancel·lada');
    hideModal('reservesModal');
    navigate('espais');
  };
}
