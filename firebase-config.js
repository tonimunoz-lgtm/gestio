// ═══════════════════════════════════════════
//  Gestiona — Firebase Configuration
//  Importat per tots els mòduls
// ═══════════════════════════════════════════

export const FB_CONFIG = {
  apiKey: "AIzaSyBF7P-Soao-ZSams3JceNVRYpr5tNs_RIs",
  authDomain: "campeonato-82be4.firebaseapp.com",
  databaseURL: "https://campeonato-82be4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "campeonato-82be4",
  storageBucket: "campeonato-82be4.firebasestorage.app",
  messagingSenderId: "185901856877",
  appId: "1:185901856877:web:f1336e539b7a92aeb36764"
};

// ── Catàleg de mòduls disponibles ──
export const MODULES_DEF = {
  secretaria:  { label:'Secretaria',        icon:'🗂️', desc:'Alumnes, grups i importació Excel',       nav:'Gestió',       defaultOn:true  },
  classes:     { label:'Classes & Horaris', icon:'📚', desc:'Classes, assignatures i horaris',         nav:'Gestió',       defaultOn:true  },
  absencies:   { label:'Absències',         icon:'📋', desc:'Absències professors i llista alumnes',   nav:'Professorat',  defaultOn:true  },
  llista:      { label:'Passar llista',     icon:'✅', desc:'Control d\'assistència d\'alumnes',        nav:'Professorat',  defaultOn:true  },
  guardies:    { label:'Guàrdies',          icon:'🛡️', desc:'Assignació de guàrdies',                  nav:'Professorat',  defaultOn:true  },
  missatgeria: { label:'Missatgeria',       icon:'✉️', desc:'Comunicació interna i famílies',          nav:'Comunicació',  defaultOn:true  },
  calendari:   { label:'Calendari',         icon:'📅', desc:'Events, reunions i dates clau',           nav:'Comunicació',  defaultOn:true  },
  avaluacions: { label:'Avaluacions',       icon:'📊', desc:'Notes i qualificacions',                  nav:'Acadèmic',     defaultOn:true  },
  pagaments:   { label:'Pagaments',         icon:'💳', desc:'Control econòmic i quotes',               nav:'Acadèmic',     defaultOn:false },
  indicadors:  { label:'Indicadors',        icon:'📈', desc:'Estadístiques i KPIs',                    nav:'Acadèmic',     defaultOn:true  },
  espais:      { label:'Espais',            icon:'🏫', desc:'Reserva i gestió d\'espais',              nav:'Infraestructura', defaultOn:false },
};

// ── Rols del sistema ──
export const ROLES_DEF = {
  admin:       { label:'Administrador',  color:'#ff5f6d', level:10, modules:'*' },
  director:    { label:'Director/a',     color:'#7c3aed', level:8,  modules:['secretaria','classes','absencies','guardies','missatgeria','calendari','avaluacions','pagaments','indicadors','espais'] },
  cap_estudis: { label:'Cap d\'estudis', color:'#00b4a0', level:7,  modules:['classes','absencies','guardies','missatgeria','calendari','avaluacions','indicadors','espais'] },
  secretari:   { label:'Secretari/a',   color:'#f59e0b', level:5,  modules:['secretaria','missatgeria','pagaments','calendari'] },
  professor:   { label:'Professor/a',   color:'#3b82f6', level:3,  modules:['absencies','missatgeria','calendari','avaluacions'] },
  tutor:       { label:'Tutor/a',       color:'#10b981', level:3,  modules:['absencies','missatgeria','calendari','avaluacions'] },
};

// ── Estat global compartit entre mòduls ──
export const G = {
  user:          null,   // Firebase Auth user
  profile:       null,   // Perfil de DB
  modules:       {},     // Mòduls actius globalment
  activeModules: [],     // Mòduls accessibles per aquest rol
  currentPage:   'dashboard',
  notifs:        [],
  unsubs:        [],     // Subscripcions onValue per cancel·lar al logout
};
