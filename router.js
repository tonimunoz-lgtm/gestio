// ═══════════════════════════════════════════
//  Gestiona — Router & Sidebar
//  Navegació principal i construcció del sidebar
// ═══════════════════════════════════════════

import { G, MODULES_DEF, ROLES_DEF } from './firebase-config.js';
import { spinner } from './ui.js';

// Registry de mòduls carregats dinàmicament
const MODULE_REGISTRY = {};

// ── Registra un mòdul ──
export function registerModule(name, { render, bind }) {
  MODULE_REGISTRY[name] = { render, bind };
}

// ── Navega a una pàgina ──
export async function navigate(page, params = {}) {
  G.currentPage = page;

  // Actualitza sidebar
  document.querySelectorAll('.nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // Breadcrumb
  setBreadcrumb(page);

  // Amaga notificacions
  document.getElementById('notifPanel')?.classList.add('hidden');

  // Renderitza
  const container = document.getElementById('pageContainer');
  container.innerHTML = spinner();

  try {
    const mod = MODULE_REGISTRY[page];
    if (!mod) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div>
        <div class="empty-title">Mòdul no disponible</div>
        <div class="empty-sub">La pàgina "${page}" no existeix o no tens permisos.</div></div>`;
      return;
    }
    container.innerHTML = await mod.render(params);
    if (mod.bind) await mod.bind(params);
  } catch (e) {
    console.error(`Error renderitzant "${page}":`, e);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>
      <div class="empty-title">Error carregant la pàgina</div>
      <div class="empty-sub">${e.message}</div></div>`;
  }
}

// ── Construeix la sidebar ──
export function buildSidebar(centreNom = '') {
  const rol    = G.profile?.rol || 'professor';
  const isAdmin = rol === 'admin';
  let html = '';

  // Admin
  if (isAdmin) {
    html += `<div class="nav-label">Administració</div>
    <button class="nav-item" data-page="admin"><span class="nav-icon">⚙️</span> Panell Admin</button>
    <button class="nav-item" data-page="usuaris"><span class="nav-icon">👥</span> Usuaris i Rols</button>`;
  }

  // Mòduls per grup de navegació
  const groups = {};
  G.activeModules.forEach(m => {
    const def = MODULES_DEF[m];
    if (!def) return;
    if (!groups[def.nav]) groups[def.nav] = [];
    groups[def.nav].push(m);
  });

  Object.entries(groups).forEach(([grp, mods]) => {
    html += `<div class="nav-label">${grp}</div>`;
    mods.forEach(m => {
      const def = MODULES_DEF[m];
      html += `<button class="nav-item" data-page="${m}">
        <span class="nav-icon">${def.icon}</span> ${def.label}
      </button>`;
    });
  });

  // Compte
  html += `<div class="nav-label">Compte</div>
  <button class="nav-item" data-page="perfil"><span class="nav-icon">👤</span> El meu perfil</button>`;

  const nav = document.getElementById('sidebarNav');
  if (nav) nav.innerHTML = html;

  // Listeners de navegació
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Nom del centre
  const centreEl = document.getElementById('sidebarCentre');
  if (centreEl) centreEl.textContent = centreNom || 'Gestiona';
}

// ── Breadcrumb ──
function setBreadcrumb(page) {
  const LABELS = {
    dashboard:   'Inici',
    admin:       'Panell Admin',
    usuaris:     'Usuaris i Rols',
    secretaria:  'Secretaria',
    classes:     'Classes & Horaris',
    absencies:   'Absències',
    llista:      'Passar llista',
    guardies:    'Guàrdies',
    missatgeria: 'Missatgeria',
    calendari:   'Calendari',
    avaluacions: 'Avaluacions',
    pagaments:   'Pagaments',
    indicadors:  'Indicadors',
    espais:      'Espais',
    perfil:      'El meu perfil',
  };
  const el = document.getElementById('breadcrumb');
  if (el) el.innerHTML = `<span class="bc-cur">${LABELS[page] || page}</span>`;
}

// ── Mobile menu ──
export function initMobileMenu() {
  const bar = document.getElementById('mobileBar');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!bar || !sidebar || !overlay) return;

  document.getElementById('btnMobileMenu')?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  });

  const mq = window.matchMedia('(max-width: 768px)');
  const apply = (e) => { bar.style.display = e.matches ? 'flex' : 'none'; };
  mq.addEventListener('change', apply);
  apply(mq);
}

// Exposem navigate globalment
window.navigate = navigate;
