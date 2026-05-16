// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Missatgeria
// ═══════════════════════════════════════════

import { G } from '../firebase-config.js';
import { showToast, showModal, hideModal, initials, avatar } from '../ui.js';
import { navigate } from '../router.js';

let _db, _ref, _get, _push, _update;

export function initMissateriaModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, push: _push, update: _update } = fbFns);
}

export async function renderMissatgeria() {
  const [msgsSnap, usersSnap] = await Promise.all([
    _get(_ref(_db, `gestiona/missatgeria/${G.user?.uid}`)),
    _get(_ref(_db, 'gestiona/users')),
  ]);

  const msgs  = msgsSnap.exists()
    ? Object.entries(msgsSnap.val()).sort(([, a], [, b]) => b.ts - a.ts)
    : [];
  const users = usersSnap.exists() ? usersSnap.val() : {};

  const destOpts = Object.entries(users)
    .filter(([uid]) => uid !== G.user?.uid)
    .map(([uid, u]) => `<option value="${uid}">${u.nom}</option>`)
    .join('');

  const msgItems = msgs.map(([id, m]) => {
    const other = users[m.enviat ? m.a : m.de];
    const nom   = other?.nom || '—';
    const ini   = initials(nom);
    return `
    <div class="msg-item${m.unread && !m.enviat ? ' msg-unread' : ''}"
      id="msgitem_${id}" onclick="missatgeriaObrir('${id}')">
      <div style="display:flex;gap:9px;align-items:center">
        ${avatar(ini, m.enviat ? 'var(--blue)' : 'var(--teal)', 'sm')}
        <div style="flex:1;overflow:hidden">
          <div style="display:flex;justify-content:space-between;gap:6px">
            <span style="font-size:13px;font-weight:${m.unread && !m.enviat ? '700' : '600'};color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${m.enviat ? '→ ' : ''}${nom}
            </span>
            <span style="font-size:10.5px;color:var(--ink-20);flex-shrink:0">
              ${new Date(m.ts).toLocaleDateString('ca-ES')}
            </span>
          </div>
          <div style="font-size:12px;color:var(--ink-40);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">
            ${m.assumpte || m.text?.slice(0, 60) || '—'}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Missatgeria</div>
      <div class="page-sub">Comunicació interna entre usuaris del centre</div>
    </div>
    <button class="btn btn-primary" onclick="showModal('newMsgModal')">✏ Nou missatge</button>
  </div>

  <div style="display:flex;gap:0;min-height:560px;background:var(--white);border:1px solid var(--ink-10);border-radius:var(--radius);overflow:hidden">
    <!-- Llista de missatges -->
    <div style="width:290px;flex-shrink:0;border-right:1px solid var(--ink-10);display:flex;flex-direction:column">
      <div style="padding:12px 14px;border-bottom:1px solid var(--ink-10);font-size:13.5px;font-weight:700;color:var(--ink)">
        Tots els missatges (${msgs.length})
      </div>
      <div style="overflow-y:auto;flex:1">
        ${msgItems || '<div style="padding:32px;text-align:center;color:var(--ink-40);font-size:13px">Cap missatge</div>'}
      </div>
    </div>

    <!-- Vista del missatge -->
    <div id="msgPane" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--ink-20);font-size:13.5px">
      Selecciona un missatge per llegir-lo
    </div>
  </div>

  <!-- Modal nou missatge -->
  <div id="newMsgModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Nou missatge
        <button class="modal-close" onclick="hideModal('newMsgModal')">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Destinatari</label>
        <select class="form-select" id="msgDest">${destOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Assumpte</label>
        <input class="form-input" id="msgAssumpte" placeholder="Reunió, consulta, informació...">
      </div>
      <div class="form-group">
        <label class="form-label">Missatge</label>
        <textarea class="form-textarea" id="msgText" style="min-height:130px"
          placeholder="Escriu el missatge aquí..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newMsgModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="missatgeriaEnviar()">Enviar missatge</button>
      </div>
    </div>
  </div>`;
}

export function bindMissatgeria() {
  window.missatgeriaEnviar = async function () {
    const dest     = document.getElementById('msgDest')?.value;
    const assumpte = document.getElementById('msgAssumpte')?.value.trim();
    const text     = document.getElementById('msgText')?.value.trim();
    if (!text) { showToast('Escriu el contingut del missatge', 'error'); return; }
    const msg = {
      de:       G.user.uid,
      a:        dest,
      assumpte: assumpte || '(Sense assumpte)',
      text,
      ts:       Date.now(),
      unread:   true,
    };
    await _push(_ref(_db, `gestiona/missatgeria/${dest}`), msg);
    await _push(_ref(_db, `gestiona/missatgeria/${G.user.uid}`), { ...msg, unread: false, enviat: true });
    hideModal('newMsgModal');
    showToast('Missatge enviat!', 'success');
    navigate('missatgeria');
  };

  window.missatgeriaObrir = async function (id) {
    const snap = await _get(_ref(_db, `gestiona/missatgeria/${G.user.uid}/${id}`));
    const m    = snap.val(); if (!m) return;

    // Marca com a llegit
    if (m.unread) {
      await _update(_ref(_db, `gestiona/missatgeria/${G.user.uid}/${id}`), { unread: false });
      const el = document.getElementById('msgitem_' + id);
      el?.classList.remove('msg-unread');
    }

    const usersSnap = await _get(_ref(_db, 'gestiona/users'));
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const other = m.enviat ? users[m.a] : users[m.de];

    document.getElementById('msgPane').innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;width:100%">
        <!-- Capçalera -->
        <div style="padding:16px 20px;border-bottom:1px solid var(--ink-10)">
          <div style="font-size:15px;font-weight:700;color:var(--ink)">${m.assumpte}</div>
          <div style="font-size:12.5px;color:var(--ink-40);margin-top:5px;display:flex;align-items:center;gap:8px">
            ${avatar(initials(other?.nom || ''), 'var(--teal)', 'xs')}
            ${m.enviat ? 'A: ' : 'De: '}<strong>${other?.nom || '—'}</strong>
            · ${new Date(m.ts).toLocaleString('ca-ES')}
          </div>
        </div>
        <!-- Cos -->
        <div style="flex:1;padding:20px 24px;font-size:13.5px;color:var(--ink-60);line-height:1.8;white-space:pre-wrap">${m.text}</div>
        <!-- Respondre -->
        ${!m.enviat ? `
        <div style="padding:12px 16px;border-top:1px solid var(--ink-10);display:flex;gap:8px">
          <input class="form-input" style="flex:1;font-size:13px;padding:9px 12px"
            id="replyText" placeholder="Escriu una resposta ràpida...">
          <button class="btn btn-primary btn-sm"
            onclick="missatgeriaRespondre('${m.de}','${m.assumpte}')">Respondre</button>
        </div>` : ''}
      </div>`;
  };

  window.missatgeriaRespondre = async function (destUid, assumpte) {
    const text = document.getElementById('replyText')?.value.trim();
    if (!text) return;
    const msg = {
      de:       G.user.uid,
      a:        destUid,
      assumpte: `Re: ${assumpte}`,
      text,
      ts:       Date.now(),
      unread:   true,
    };
    await _push(_ref(_db, `gestiona/missatgeria/${destUid}`), msg);
    await _push(_ref(_db, `gestiona/missatgeria/${G.user.uid}`), { ...msg, unread: false, enviat: true });
    showToast('Resposta enviada!', 'success');
    navigate('missatgeria');
  };
}
