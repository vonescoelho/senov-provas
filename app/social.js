/* ChatMil — rede social dos professores: cadastro, perfil, conversas, grupos, mural e configurações.
   Usa o Firebase (login por e-mail e banco em tempo real). Só entra em ação quando
   app/firebase-config.js tem a configuração do projeto; sem ela, o app funciona como antes. */
(function () {
  "use strict";
  const CFG = window.CHATMIL_FIREBASE;
  if (!CFG || !CFG.apiKey || !window.FB || !window.SOC_EXTRAS) { window.SOCIAL = null; return; }
  const fb = window.FB;
  const { F: FIGS, PACOTES, figurinha, ofensivo } = window.SOC_EXTRAS;

  /* ================= Firebase ================= */
  const app = fb.initializeApp(CFG);
  let auth;
  try { auth = fb.initializeAuth(app, { persistence: [fb.indexedDBLocalPersistence, fb.browserLocalPersistence] }); }
  catch (e) { auth = fb.initializeAuth(app, { persistence: fb.browserLocalPersistence }); }
  auth.languageCode = "pt-BR";
  /* cache no aparelho: conversas e perfil aparecem na hora, mesmo antes da internet responder */
  let db;
  try { db = fb.persistentLocalCache ? fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager ? fb.persistentMultipleTabManager() : undefined }) }) : fb.initializeFirestore(app, {}); }
  catch (e) { console.warn("cache", e); db = fb.initializeFirestore(app, {}); }
  if (CFG.emulador) { fb.connectAuthEmulator(auth, "http://" + CFG.emulador + ":9099", { disableWarnings: true }); fb.connectFirestoreEmulator(db, CFG.emulador, 8080); }
  const D = (...p) => fb.doc(db, ...p);
  const C = (...p) => fb.collection(db, ...p);
  const TS = fb.serverTimestamp;

  /* ================= Ícones ================= */
  const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const K = {
    back: ic('<path d="M15 18l-6-6 6-6"/>'),
    busca: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    gear: ic('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    grupo: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
    smile: ic('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>'),
    clip: ic('<path d="m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
    video: ic('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>'),
    live: ic('<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a10 10 0 0 0 0 14M19 19a10 10 0 0 0 0-14"/>'),
    play: ic('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
    foto: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    baixar: ic('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'),
    maisV: ic('<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>'),
    mais: ic('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
    heart: ic('<path d="M12 20s-7-4.4-9-9.1C1.6 7.3 4 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4 20 4 22.4 7.3 21 10.9 19 15.6 12 20 12 20z"/>'),
    coment: ic('<path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5z"/>'),
    camera: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    lock: ic('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    shield: ic('<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    mail: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    sair: ic('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>'),
    olho: ic('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    olhoX: ic('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>'),
    addUser: ic('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>'),
    copiar: ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
    share: ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    flag: ic('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    ban: ic('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    selo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.9-.9 2.9.9 2.9-2.4 1.9-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8-2.4-1.9.9-2.9-.9-2.9 2.4-1.9 1-2.8 3-.1z" fill="currentColor"/><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lua: ic('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
    texto: ic('<path d="M4 18 9 6l5 12M5.8 14h6.4M15 18l3-7 3 7M16 16h4"/>'),
    chave: ic('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>'),
    codigo: ic('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
    dir: ic('<path d="m9 6 6 6-6 6"/>'),
    mural: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h10M7 17h6"/>'),
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    chat: ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    prova: ic('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>'),
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    mais2: ic('<path d="M12 5v14M5 12h14"/>'),
    lixo: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    proibido: ic('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>'),
    varinha: ic('<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M3 21l9-9"/>'),
    escola: ic('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'),
    megafone: ic('<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>'),
    check: ic('<path d="M20 6 9 17l-5-5"/>'),
    pen: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')
  };

  /* Extensões (social-mais.js): telas, abas, ações e tipos de mensagem extras */
  const EXT = { views: {}, tabViews: {}, acoes: {}, tabs: [], provasSub: [], msg: null, chatBotoes: null, composerBotoes: null, composerFim: null,
    conversasTopo: null, depois: [], avisos: [], muralTopo: [], muralSeg: [], muralFiltro: [], muralCab: [], compositorBotoes: [], compositorPainel: [], compositorAbrir: [], postDados: [], postMeta: [], perfilExtra: null, perfilAv: null, configPriv: [], configExtra: [], aoTrocarUsuario: [], portao: null };

  /* ================= Estado ================= */
  const SO = {
    tab: "conversas", pilha: [], carregando: true, user: null, eu: null, euCarregado: false,
    tela: "boas-vindas", erro: "", ocupado: false,
    chats: [], leituras: {}, perfis: {}, buscando: {}, seguindo: new Set(), bloqueados: new Set(),
    posts: [], feed: "todos", msgs: {}, brutas: {}, coments: {}, rascunho: {}, figAberta: false, pacote: 0,
    busca: "", resultados: null, novos: null, filtroChats: "", contagens: {},
    cad: { nome: "", email: "", senha: "", usuario: "", escola: "", disciplinas: [], foto: null, ok: null, verSenha: false },
    un: {}
  };
  try { const t = localStorage.getItem("cs.tab"); if (["conversas", "mural", "provas", "perfil"].includes(t)) SO.tab = t; } catch (e) { }
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eu = () => SO.user && SO.user.uid;
  const toast = m => window.toast ? window.toast(m) : alert(m);
  const lembrarTab = () => { try { localStorage.setItem("cs.tab", SO.tab); } catch (e) { } };
  const ms = t => !t ? Date.now() : t.toMillis ? t.toMillis() : t.seconds ? t.seconds * 1000 : +new Date(t);
  const dadosDe = s => s.data({ serverTimestamps: "estimate" });
  const semAc = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const inst = u => !!(u && u.emailVerified && /\.(gov|edu)\.br$/i.test(u.email || ""));
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  function horaCurta(t) {
    const d = new Date(ms(t)), h = new Date(), ontem = new Date(h); ontem.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === ontem.toDateString()) return "Ontem";
    if (h - d < 6 * 864e5) return DIAS[d.getDay()];
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  function tempoPost(t) {
    const s = (Date.now() - ms(t)) / 1000;
    if (s < 60) return "agora"; if (s < 3600) return Math.floor(s / 60) + " min"; if (s < 86400) return Math.floor(s / 3600) + " h";
    if (s < 7 * 86400) return Math.floor(s / 86400) + " d"; return new Date(ms(t)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  function diaSep(t) {
    const d = new Date(ms(t)), h = new Date(), ontem = new Date(h); ontem.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return "Hoje";
    if (d.toDateString() === ontem.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  }
  const ERROS = {
    "auth/email-already-in-use": "Este e-mail já tem conta. Toque em “Já tenho conta” para entrar.",
    "auth/invalid-email": "Confira o e-mail: parece que falta alguma parte.",
    "auth/weak-password": "Use uma senha com pelo menos 8 caracteres.",
    "auth/missing-password": "Digite a sua senha.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/user-not-found": "Não encontramos conta com este e-mail.",
    "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem internet. Verifique a conexão e tente de novo.",
    "auth/requires-recent-login": "Por segurança, entre de novo e repita a ação.",
    "permission-denied": "Você não tem permissão para fazer isso.",
    "unavailable": "Sem conexão com o servidor. Tente de novo em instantes."
  };
  const msgErro = e => ERROS[e && e.code] || "Não deu certo. Tente de novo.";
  const CORES = ["#2447C6", "#7C5CFF", "#E11D48", "#EA580C", "#15803D", "#0E7490", "#B45309", "#9333EA"];
  const corDe = s => { let h = 0; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]; };
  const iniciais = n => String(n || "?").trim().split(/[\s._]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
  function av(p, tam, uid) {
    tam = tam || 48;
    const st = `width:${tam}px;height:${tam}px;font-size:${Math.round(tam * 0.38)}px`;
    if (p && p.foto) return `<span class="cs-av" style="${st}"><img src="${esc(p.foto)}" alt=""></span>`;
    return `<span class="cs-av" style="${st};background:${corDe(uid || (p && p.usuario))}">${esc(iniciais(p && p.nome))}</span>`;
  }
  function avGrupo(g, tam) {
    tam = tam || 48;
    const st = `width:${tam}px;height:${tam}px`;
    if (g && g.foto) return `<span class="cs-av" style="${st}"><img src="${esc(g.foto)}" alt=""></span>`;
    return `<span class="cs-av grp" style="${st};background:${corDe(g && g.id)}">${K.grupo}</span>`;
  }
  const seloHtml = p => p && p.inst ? `<span class="cs-selo" title="E-mail institucional confirmado">${K.selo}</span>` : "";

  /* Perfis de outras pessoas (guardados em memória enquanto o app está aberto) */
  /* Para os outros, o professor aparece pelo nome de usuário (o nome completo fica só no próprio perfil) */
  const pub = (uid, d) => ({ uid, ...d, nomeReal: d.nome, nome: d.usuario || d.nome });
  function P(uid) {
    if (!uid) return { nome: "?" };
    if (uid === eu() && SO.eu) return SO.eu;
    if (SO.perfis[uid]) return SO.perfis[uid];
    if (!SO.buscando[uid]) {
      SO.buscando[uid] = true;
      fb.getDoc(D("users", uid)).then(s => {
        SO.perfis[uid] = s.exists() ? pub(uid, s.data()) : { uid, nome: "Conta removida", usuario: "", removido: true }; pintar();
        /* foto só para quem a pessoa segue: o servidor decide se pode ver */
        if (s.exists() && s.data().fotoPriv && !s.data().foto) fb.getDoc(D("fotos", uid)).then(f => { if (f.exists() && SO.perfis[uid]) { SO.perfis[uid].foto = f.data().foto; pintar(); } }).catch(() => { });
      })
        .catch(() => { SO.buscando[uid] = false; });
    }
    return { uid, nome: "…", usuario: "", carregando: true };
  }

  /* ================= Tela protegida contra captura (só no app Android) =================
     Fica ligada enquanto houver um motivo: conversa individual, Flash para pessoas escolhidas, visualização única. */
  const SEG = { k: new Set(), on: false };
  function seguroTela(chave, ligar) {
    if (ligar) SEG.k.add(chave); else SEG.k.delete(chave);
    const q = SEG.k.size > 0; if (q === SEG.on) return; SEG.on = q;
    try { const N = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Nativo; if (N && N.seguro) N.seguro({ ligar: q }).catch(() => { }); } catch (e) { }
  }
  window.CS_SEGURO = seguroTela;

  /* links clicáveis e prévia de vídeos do YouTube nas mensagens */
  function textoComLinks(t) {
    return String(t || "").split(/(https?:\/\/[^\s<>"']+)/g).map((p, i) => i % 2
      ? `<a class="cs-lk" href="${esc(p)}" data-s="link" data-v="${esc(p)}" rel="noopener">${esc(p.length > 64 ? p.slice(0, 61) + "…" : p)}</a>` : esc(p)).join("");
  }
  const ytId = t => { const m = String(t || "").match(/(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ""; };
  function previaYT(t) {
    const id = ytId(t); if (!id) return "";
    return `<button class="cs-yt" data-s="yt-ver" data-v="${id}" aria-label="Assistir vídeo"><img src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy"><span class="cs-yt-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button>`;
  }
  function abrirLink(u) {
    if (!/^https?:\/\//i.test(u || "")) return;
    try { const N = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Nativo; if (N && N.link) { N.link({ url: u }).catch(() => window.open(u, "_blank", "noopener")); return; } } catch (e) { }
    try { window.open(u, "_blank", "noopener"); } catch (e) { location.href = u; }
  }
  window.CS_ABRIR_LINK = abrirLink;

  /* ================= Pintura ================= */
  let pintarPend = false;
  function pintar() {
    if (pintarPend) return; pintarPend = true;
    /* requestAnimationFrame para quando a tela está escondida; o setTimeout garante a atualização mesmo assim */
    const fazer = () => { if (!pintarPend) return; pintarPend = false; if (typeof window.render === "function") window.render(); else { pintarPend = true; setTimeout(fazer, 60); } };
    requestAnimationFrame(fazer); setTimeout(fazer, 120);
  }
  function abrirTela(t) { SO.pilha.push(t); SO.figAberta = false; try { history.pushState({ cs: SO.pilha.length }, ""); } catch (e) { } pintar(); window.scrollTo(0, 0); }
  function voltar() { if (SO.pilha.length) { try { history.back(); } catch (e) { SO.pilha.pop(); pintar(); } } }
  window.addEventListener("popstate", ev => {
    const n = (ev.state && ev.state.cs) || 0;
    if (SO.pilha.length > n) { SO.pilha.length = n; SO.figAberta = false; pintar(); }
  });
  const topo = () => SO.pilha[SO.pilha.length - 1];

  /* ================= Sessão e dados em tempo real ================= */
  const ouvintes = [];
  function pararTudo() { while (ouvintes.length) { try { ouvintes.pop()(); } catch (e) { } } Object.values(SO.un).forEach(f => { try { f(); } catch (e) { } }); SO.un = {}; }
  let ultimoAviso = Date.now();
  fb.onAuthStateChanged(auth, async u => {
    pararTudo();
    const trocou = (SO.user && SO.user.uid) !== (u && u.uid);
    SO.user = u; SO.pres = SO.pres || {}; SO.eu = null; SO.euCarregado = false; SO.fotoPropria = undefined; SO.chats = []; SO.posts = []; SO.pilha = [];
    if (trocou) {
      SO.perfis = {}; SO.buscando = {}; SO.msgs = {}; SO.brutas = {}; SO.coments = {}; SO.rascunho = {}; SO.contagens = {}; SO.novos = null; SO.leituras = {};
      if (u) { SO.tab = "conversas"; lembrarTab(); }
      try { if (typeof CHAT !== "undefined") { CHAT.msgs = []; CHAT.d = {}; CHAT.perg = null; CHAT.espera = null; } } catch (e) { }
    }
    SO.carregando = false;
    EXT.aoTrocarUsuario.forEach(f => { try { f(u); } catch (e) { console.warn(e); } });
    if (!u) { SO.tela = SO.tela === "entrar" ? "entrar" : "boas-vindas"; pintar(); return; }
    pintar();
    ouvintes.push(fb.onSnapshot(D("users", u.uid), s => {
      const tinha = !!SO.eu;
      SO.eu = s.exists() ? { uid: u.uid, ...s.data() } : null; SO.euCarregado = true;
      if (SO.eu && !tinha) iniciarPresenca();
      syncNSeg();
      if (SO.eu && SO.eu.fotoPriv) {
        if (SO.fotoPropria !== undefined) SO.eu.foto = SO.fotoPropria;
        else { SO.fotoPropria = null; fb.getDoc(D("fotos", u.uid)).then(f => { SO.fotoPropria = f.exists() ? f.data().foto : null; if (SO.eu) SO.eu.foto = SO.fotoPropria; pintar(); }).catch(() => { }); }
      }
      if (SO.eu && typeof S !== "undefined" && S.perfil) {
        /* o nome do professor no cabeçalho das provas acompanha o perfil (a menos que tenha sido digitado outro) */
        if (!S.perfil.professor || S.perfil.professor === SO.nomeAuto) { S.perfil.professor = SO.eu.nome; SO.nomeAuto = SO.eu.nome; }
        if (!S.perfil.escola && SO.eu.escola) S.perfil.escola = SO.eu.escola;
      }
      if (SO.eu && inst(SO.user) && !SO.eu.inst) fb.updateDoc(D("users", u.uid), { inst: true }).catch(() => { });
      pintar(); verConvite();
    }, e => { console.warn(e); SO.euCarregado = true; pintar(); }));
    ouvintes.push(fb.onSnapshot(fb.query(C("chats"), fb.where("membros", "array-contains", u.uid)), snap => {
      const antes = new Map(SO.chats.map(c => [c.id, ms(c.atualizadoEm)]));
      SO.chats = snap.docs.map(d => ({ id: d.id, ...dadosDe(d) })).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
      SO.chats.forEach(c => {
        const t = topo(); const aberto = t && t.v === "chat" && t.id === c.id;
        if (c.ultima && c.ultima.autor !== u.uid && ms(c.atualizadoEm) > Math.max(antes.get(c.id) || 0, ultimoAviso) && !aberto && antes.size) {
          const nome = c.tipo === "grupo" ? c.nome : P(c.ultima.autor).nome;
          toast("Nova mensagem de " + nome); try { navigator.vibrate && navigator.vibrate(40); } catch (e) { }
        }
      });
      ultimoAviso = Date.now();
      pintar();
    }, e => console.warn(e)));
    ouvintes.push(fb.onSnapshot(C("users", u.uid, "leituras"), snap => { SO.leituras = {}; snap.docs.forEach(d => SO.leituras[d.id] = ms(dadosDe(d).em)); pintar(); }));
    ouvintes.push(fb.onSnapshot(C("users", u.uid, "seguindo"), snap => {
      SO.seguindo = new Set(snap.docs.map(d => d.id));
      SO.segOculto = new Set(snap.docs.filter(d => d.data().oculto).map(d => d.id));
      /* número público de "seguindo" (sem os seguidos em segredo) */
      if (!(snap.metadata && snap.metadata.hasPendingWrites)) { SO.segPronto = true; syncNSeg(); }
      pintar();
    }));
    ouvintes.push(fb.onSnapshot(C("users", u.uid, "bloqueados"), snap => { SO.bloqueados = new Set(snap.docs.map(d => d.id)); pintar(); }));
    {
      /* mural: públicas + "só para algumas pessoas" (as que me incluem e as minhas) */
      const PB = { pub: [], pa: [], meu: [] };
      SO.postsExtra = {};
      const juntar = () => { const m = new Map(); [...PB.pub, ...PB.pa, ...PB.meu, ...Object.values(SO.postsExtra).flat()].forEach(p => m.set(p.col + ":" + p.id, p)); SO.posts = [...m.values()].sort((a, b) => ms(b.em) - ms(a.em)); pintar(); };
      const ouvir = (q, k, col) => ouvintes.push(fb.onSnapshot(q, snap => { PB[k] = snap.docs.map(d => ({ id: d.id, col, ...dadosDe(d) })); juntar(); }, e => console.warn(e)));
      SO.juntarPosts = juntar;
      ouvir(fb.query(C("posts"), fb.orderBy("em", "desc"), fb.limit(120)), "pub", "posts");
      ouvir(fb.query(C("postsPriv"), fb.where("para", "array-contains", u.uid), fb.limit(60)), "pa", "postsPriv");
      ouvir(fb.query(C("postsPriv"), fb.where("autor", "==", u.uid), fb.limit(60)), "meu", "postsPriv");
    }
  });
  function syncNSeg() {
    if (!SO.eu || !SO.segPronto || !SO.segOculto) return;
    const n = SO.seguindo.size - SO.segOculto.size;
    if (SO.eu.nSeguindo !== n) fb.updateDoc(D("users", eu()), { nSeguindo: n }).catch(() => { });
  }
  function naoLidas(c) { return c.ultima && c.ultima.autor !== eu() && ms(c.atualizadoEm) > (SO.leituras[c.id] || 0); }
  const ultLeitura = {};
  function marcarLida(id) {
    if (!eu()) return;
    const c = SO.chats.find(x => x.id === id), alvo = c ? ms(c.atualizadoEm) : Date.now();
    if ((SO.leituras[id] || 0) >= alvo || (ultLeitura[id] || 0) >= alvo) return;
    ultLeitura[id] = alvo;
    fb.setDoc(D("users", eu(), "leituras", id), { em: TS() }).catch(() => { });
    if (c && SO.eu && SO.eu.privLeitura !== false) fb.updateDoc(D("chats", id), { ["lidos." + eu()]: TS() }).catch(() => { });
  }
  /* ✓ enviada · ✓✓ azul = vista (em grupo, quando todos viram) */
  const TIQUE1 = '<svg class="cs-tq" viewBox="0 0 16 11" aria-label="Enviada"><path d="M1.5 6l3.5 3.5L14.5 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TIQUE2 = '<svg class="cs-tq lido" viewBox="0 0 20 11" aria-label="Vista"><path d="M1.5 6l3.5 3.5L14.5 1M8.5 8.6l1 .9L19 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const RELOGIO = '<svg class="cs-tq" viewBox="0 0 12 12" aria-label="Enviando"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 3.4V6l1.8 1.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function tique(c, m) {
    if (m.autor !== eu()) return "";
    if (!m.em) return RELOGIO;
    if (!SO.eu || SO.eu.privLeitura === false) return TIQUE1;
    const outros = (c.membros || []).filter(u => u !== eu()), lidos = c.lidos || {}, t = ms(m.em);
    return outros.length && outros.every(u => lidos[u] && ms(lidos[u]) >= t) ? TIQUE2 : TIQUE1;
  }
  /* ---- online e visto por último (presenca/{uid}: atualiza a cada minuto com o app aberto) ---- */
  let presT = null;
  function marcarPresenca(on) {
    if (!eu() || !SO.eu || SO.eu.privOnline === false) return;
    fb.setDoc(D("presenca", eu()), { em: TS(), on: !!on }).catch(() => { });
  }
  function iniciarPresenca() {
    clearInterval(presT); marcarPresenca(document.visibilityState === "visible");
    presT = setInterval(() => { if (document.visibilityState === "visible") marcarPresenca(true); }, 60000);
  }
  document.addEventListener("visibilitychange", () => marcarPresenca(document.visibilityState === "visible"));
  window.addEventListener("pagehide", () => marcarPresenca(false));
  function ouvirPresenca(uid) {
    if (!uid || SO.un["p:" + uid]) return;
    SO.un["p:" + uid] = fb.onSnapshot(D("presenca", uid), s => { SO.pres[uid] = s.exists() ? dadosDe(s) : null; const t = topo(); if (t && t.v === "chat") pintarCabecalho(); }, () => { });
  }
  function textoPresenca(uid) {
    if (SO.eu && SO.eu.privOnline === false) return "";
    const pr = SO.pres[uid]; if (!pr || !pr.em) return "";
    const t = ms(pr.em), agora = Date.now();
    if (pr.on && agora - t < 150000) return "online";
    const d = new Date(t), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
    const h = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoje.toDateString()) return "visto por último hoje às " + h;
    if (d.toDateString() === ontem.toDateString()) return "visto por último ontem às " + h;
    return "visto por último em " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + h;
  }
  function pintarCabecalho() {
    const t = topo(), el = $("#cs-chat-sub"); if (!t || t.v !== "chat" || !el) return;
    const c = SO.chats.find(x => x.id === t.id); if (!c || c.tipo === "grupo") return;
    const ti = tituloChat(c), pr = textoPresenca(ti.outro);
    el.textContent = pr || ti.sub; el.classList.toggle("on", pr === "online");
  }
  setInterval(pintarCabecalho, 30000);
  function ouvirMsgs(id) {
    if (SO.un["m:" + id]) return;
    SO.un["m:" + id] = fb.onSnapshot(fb.query(C("chats", id, "msgs"), fb.orderBy("em"), fb.limitToLast(200)), snap => {
      const l = snap.docs.map(d => ({ id: d.id, ...dadosDe(d) }));
      SO.brutas[id] = l;
      const repintar = () => { if (SO.brutas[id] !== l) return; SO.msgs[id] = window.CS_E2E ? CS_E2E.abrirLista(l) : l; const t = topo(); if (t && t.v === "chat" && t.id === id) pintarMsgs(); };
      SO.msgs[id] = window.CS_E2E ? CS_E2E.abrirLista(l, repintar) : l;
      const t = topo(); if (t && t.v === "chat" && t.id === id) { marcarLida(id); pintarMsgs(); }
    }, e => { console.warn(e); SO.msgs[id] = SO.msgs[id] || []; pintarMsgs(); });
  }
  /* depois de digitar o PIN (ou criar chaves), reabre as mensagens já carregadas */
  function reabrirMsgs() {
    Object.keys(SO.brutas).forEach(id => {
      const l = SO.brutas[id], f = () => { if (SO.brutas[id] !== l) return; SO.msgs[id] = CS_E2E.abrirLista(l); const t = topo(); if (t && t.v === "chat" && t.id === id) pintarMsgs(); };
      SO.msgs[id] = CS_E2E.abrirLista(l, f);
    });
    pintar();
  }
  const colP = id => ((SO.posts.find(x => x.id === id) || {}).col) || "posts";
  function ouvirComents(id) {
    if (SO.un["c:" + id]) return;
    SO.un["c:" + id] = fb.onSnapshot(fb.query(C(colP(id), id, "comentarios"), fb.orderBy("em")), snap => {
      SO.coments[id] = snap.docs.map(d => ({ id: d.id, ...dadosDe(d) })); pintar();
    });
  }

  /* ================= Convite por link (?g=CODIGO) ================= */
  let conviteUrl = null;
  try { const g = new URLSearchParams(location.search).get("g"); if (g) conviteUrl = g.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); } catch (e) { }
  function verConvite() { if (conviteUrl && SO.eu) { const c = conviteUrl; conviteUrl = null; sheetEntrarCodigo(c); } }

  /* ================= Cadastro e entrada ================= */
  const USU_RE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
  const RESERVADOS = ["admin", "administrador", "senov", "chatmil", "chatsenov", "suporte", "oficial", "moderacao", "moderador", "sistema", "ajuda"];
  function limparUsuario(t) { return semAc(t).replace(/^@/, "").replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "").slice(0, 20); }
  function problemaUsuario(u) {
    if (u.length < 3) return "Use pelo menos 3 caracteres.";
    if (!USU_RE.test(u) || /\.\.|__|\._|_\./.test(u)) return "Use letras, números, ponto ou _. Não comece nem termine com ponto.";
    if (RESERVADOS.includes(u) || ofensivo(u.replace(/[._]/g, " "))) return "Este nome de usuário não é permitido.";
    return "";
  }
  function sugestoes(nome) {
    const w = semAc(nome).replace(/[^a-z\s]/g, "").split(/\s+/).filter(p => p.length > 1 && !["de", "da", "do", "dos", "das", "e"].includes(p));
    if (!w.length) return [];
    const a = w[0], b = w[w.length - 1], n = String(Math.floor(Math.random() * 90) + 10);
    return [...new Set([w.length > 1 ? `${a}.${b}` : a, `prof.${a}`, w.length > 1 ? `${a}_${b}` : `${a}_prof`, `${a}${n}`])].filter(s => !problemaUsuario(s)).slice(0, 4);
  }
  let checarT = null;
  function checarUsuario() {
    const u = SO.cad.usuario; SO.cad.ok = null;
    const p = problemaUsuario(u); if (p) { SO.cad.ok = { livre: false, msg: p }; atualizarChecagem(); return; }
    SO.cad.ok = { carregando: true }; atualizarChecagem();
    clearTimeout(checarT);
    checarT = setTimeout(() => fb.getDoc(D("usernames", u)).then(s => {
      if (SO.cad.usuario !== u) return;
      const meu = s.exists() && s.data().uid === eu();
      SO.cad.ok = !s.exists() || meu ? { livre: true, msg: meu ? "Este é o seu @usuário" : "Disponível" } : { livre: false, msg: "Já está em uso. Tente outro." };
      atualizarChecagem();
    }).catch(() => { SO.cad.ok = null; atualizarChecagem(); }), 350);
  }
  function atualizarChecagem() {
    const el = $("#cs-usu-ok"); if (!el) return;
    const o = SO.cad.ok;
    el.className = "cs-ok " + (!o ? "" : o.carregando ? "" : o.livre ? "sim" : "nao");
    el.textContent = !o ? "" : o.carregando ? "Verificando…" : (o.livre ? "✓ " : "✗ ") + o.msg;
  }
  async function processarFoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const lado = Math.min(img.naturalWidth, img.naturalHeight), T = 320;
      const cv = document.createElement("canvas"); cv.width = cv.height = T;
      const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high";
      cx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, T, T);
      let q = 0.84, out = cv.toDataURL("image/jpeg", q);
      while (out.length > 90000 && q > 0.4) { q -= 0.1; out = cv.toDataURL("image/jpeg", q); }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  async function criarConta() {
    const c = SO.cad;
    c.nome = ($("#cs-nome") || {}).value?.trim() ?? c.nome; c.email = ($("#cs-email") || {}).value?.trim() ?? c.email; c.senha = ($("#cs-senha") || {}).value ?? c.senha;
    const aceite = $("#cs-aceite") && $("#cs-aceite").checked;
    if (c.nome.length < 3) return erro("Digite o seu nome.");
    if (ofensivo(c.nome)) return erro("O nome tem palavras não permitidas.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return erro("Confira o e-mail.");
    if (c.senha.length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.");
    if (!aceite) return erro("Para continuar, confirme que é professor(a) e aceite os termos.");
    ocupar("Criando…");
    try {
      const r = await fb.createUserWithEmailAndPassword(auth, c.email, c.senha);
      if (window.CS_CHAMADAS_LOGIN) window.CS_CHAMADAS_LOGIN(c.email, c.senha);
      c.senha = "";
      fb.updateProfile(r.user, { displayName: c.nome }).catch(() => { });
      fb.sendEmailVerification(r.user).catch(() => { });
      if (!c.usuario) { c.usuario = sugestoes(c.nome)[0] || ""; }
    } catch (e) { return erro(msgErro(e)); }
    if (c.usuario) setTimeout(checarUsuario, 50);
  }
  function erro(m) {
    SO.erro = m; SO.ocupado = false;
    const el = $("#cs-erro");
    if (el) { el.innerHTML = erroIn(); botao(false); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } else pintar();
    return false;
  }
  async function entrar() {
    const email = $("#cs-email").value.trim(), senha = $("#cs-senha").value;
    if (!email || !senha) return erro("Digite o e-mail e a senha.");
    ocupar("Entrando…");
    try { await fb.signInWithEmailAndPassword(auth, email, senha); SO.erro = ""; if (window.CS_CHAMADAS_LOGIN) window.CS_CHAMADAS_LOGIN(email, senha); }
    catch (e) { erro(msgErro(e)); }
  }
  async function esqueci() {
    const email = ($("#cs-email") || {}).value?.trim();
    if (!email) return erro("Digite o seu e-mail acima e toque de novo em “Esqueci minha senha”.");
    try { await fb.sendPasswordResetEmail(auth, email); SO.erro = ""; toast("Enviamos um link para criar nova senha. Veja o seu e-mail."); }
    catch (e) { erro(msgErro(e)); }
  }
  async function salvarPerfil(novo) {
    /* novo = {nome, usuario, escola, disciplinas, bio, foto}; cria ou atualiza, trocando o @usuário se mudou */
    const uid = eu(), antigo = SO.eu, u = novo.usuario;
    const p = problemaUsuario(u); if (p) throw { msg: p };
    for (const campo of ["nome", "bio", "escola"]) if (novo[campo] && ofensivo(novo[campo])) throw { msg: "Há palavras não permitidas no perfil." };
    const dados = {
      nome: novo.nome.trim().slice(0, 60), usuario: u, nomeBusca: semAc(novo.nome).trim(), escola: (novo.escola || "").trim().slice(0, 100),
      disciplinas: (novo.disciplinas || []).slice(0, 8), bio: (novo.bio || "").trim().slice(0, 300), foto: novo.foto || null,
      privMsg: (antigo && antigo.privMsg) || "todos", inst: inst(SO.user), atualizadoEm: TS()
    };
    if (!antigo) dados.criadoEm = TS();
    if (dados.inst) await SO.user.getIdToken(true).catch(() => { });
    const b = fb.writeBatch(db);
    const pf = (antigo && antigo.privFoto) || "todos";
    if (pf !== "todos") { b.set(D("fotos", uid), { foto: dados.foto, priv: pf }); dados.fotoPriv = !!dados.foto; SO.fotoPropria = dados.foto; dados.foto = null; }
    if (!antigo || antigo.usuario !== u) {
      b.set(D("usernames", u), { uid });
      if (antigo && antigo.usuario) b.delete(D("usernames", antigo.usuario));
    }
    b.set(D("users", uid), dados, { merge: true });
    try { await b.commit(); }
    catch (e) { if (e.code === "permission-denied") throw { msg: "Este @usuário acabou de ser usado por outra pessoa. Escolha outro." }; throw { msg: msgErro(e) }; }
  }
  async function concluirPerfil() {
    const c = SO.cad;
    c.nome = $("#cs-nome").value.trim(); c.usuario = limparUsuario($("#cs-usu").value); c.escola = $("#cs-escola").value;
    if (c.nome.length < 3) return erro("Digite o seu nome.");
    ocupar("Salvando…");
    try { await salvarPerfil(c); SO.tab = "conversas"; lembrarTab(); toast("Bem-vindo(a) ao ChatMil!"); pintar(); }
    catch (e) { erro(e.msg || msgErro(e)); }
  }

  /* ---------- telas de entrada ---------- */
  function campoSenha(id, rotulo, auto) {
    return `<label class="f" for="${id}">${rotulo}<span class="cs-senha"><input class="in" id="${id}" type="${SO.cad.verSenha ? "text" : "password"}" autocomplete="${auto}" minlength="8">
      <button type="button" class="cs-olho" data-s="ver-senha" aria-label="${SO.cad.verSenha ? "Esconder senha" : "Mostrar senha"}">${SO.cad.verSenha ? K.olhoX : K.olho}</button></span></label>`;
  }
  const erroIn = () => SO.erro ? `<div class="notice bad" role="alert">${K.info}<span>${esc(SO.erro)}</span></div>` : "";
  const erroHtml = () => `<div id="cs-erro">${erroIn()}</div>`;
  /* Mostra o estado do botão principal sem redesenhar o formulário (não apaga o que foi digitado) */
  function botao(on, txt) {
    const b = document.querySelector("#main form .cs-grande:not([type=button])"); if (!b) return;
    if (on) { if (!b.dataset.t) b.dataset.t = b.textContent; b.disabled = true; b.textContent = txt || "Aguarde…"; }
    else if (b.dataset.t) { b.disabled = false; b.textContent = b.dataset.t; delete b.dataset.t; }
  }
  function ocupar(txt) { SO.erro = ""; const el = $("#cs-erro"); if (el) el.innerHTML = ""; botao(true, txt); }
  function vBoasVindas() {
    return `<section class="cs-auth cs-bv">
      <div class="cs-figs" aria-hidden="true"><span class="f1">${figurinha("nota10", 92)}</span><span class="f2">${figurinha("cafe", 84)}</span><span class="f3">${figurinha("estudar", 88)}</span></div>
      <div class="cs-logo">${K.chat}</div>
      <h1>ChatMil</h1>
      <p class="cs-lema">Conversas, grupos e provas para professores. Sem anúncios.</p>
      <div class="cs-auth-bt">
        <button class="btn primary cs-grande" data-s="ir" data-v="criar">Criar minha conta</button>
        <button class="btn cs-grande" data-s="ir" data-v="entrar">Já tenho conta</button>
      </div>
      <p class="small muted cs-centro">Cadastro só com e-mail. Não precisa de número de telefone.</p>
    </section>`;
  }
  function vCriar() {
    const c = SO.cad;
    return `<section class="cs-auth">
      <button class="cs-voltar-t" data-s="ir" data-v="boas-vindas" aria-label="Voltar">${K.back}</button>
      <div class="cs-passos"><i class="on"></i><i></i></div>
      <h1>Criar conta</h1><p class="muted">Passo 1 de 2 · Seus dados de acesso</p>
      <form class="stack" id="cs-f-criar" novalidate>
        <label class="f" for="cs-nome">Seu nome<input class="in" id="cs-nome" autocomplete="name" value="${esc(c.nome)}" placeholder="Ex.: Maria da Silva"></label>
        <label class="f" for="cs-email">E-mail<input class="in" id="cs-email" type="email" inputmode="email" autocomplete="email" value="${esc(c.email)}" placeholder="seuemail@exemplo.com"></label>
        ${campoSenha("cs-senha", "Crie uma senha (mínimo 8 caracteres)", "new-password")}
        <label class="cs-aceite" for="cs-aceite"><input type="checkbox" id="cs-aceite"><span>Sou professor(a) e aceito os <button type="button" class="cs-link" data-s="termos">termos de uso e a política de privacidade</button>.</span></label>
        ${erroHtml()}
        <button class="btn primary cs-grande">Continuar</button>
      </form>
      <p class="small muted cs-centro">Já tem conta? <button class="cs-link" data-s="ir" data-v="entrar">Entrar</button></p>
    </section>`;
  }
  function vEntrar() {
    return `<section class="cs-auth">
      <button class="cs-voltar-t" data-s="ir" data-v="boas-vindas" aria-label="Voltar">${K.back}</button>
      <div class="cs-logo sm">${K.chat}</div>
      <h1>Entrar</h1><p class="muted">Use o e-mail e a senha da sua conta.</p>
      <form class="stack" id="cs-f-entrar" novalidate>
        <label class="f" for="cs-email">E-mail<input class="in" id="cs-email" type="email" inputmode="email" autocomplete="email" value="${esc(SO.cad.email)}"></label>
        ${campoSenha("cs-senha", "Senha", "current-password")}
        ${erroHtml()}
        <button class="btn primary cs-grande">Entrar</button>
        <button type="button" class="btn ghost" data-s="esqueci">Esqueci minha senha</button>
      </form>
      <p class="small muted cs-centro">Ainda não tem conta? <button class="cs-link" data-s="ir" data-v="criar">Criar conta</button></p>
    </section>`;
  }
  function chipsDisciplinas(sel, alvo) {
    return `<div class="chips">${(typeof DISCIPLINAS !== "undefined" ? DISCIPLINAS : []).map(d => `<button type="button" class="chip" data-s="disc" data-alvo="${alvo}" data-v="${esc(d)}" aria-pressed="${sel.includes(d)}">${esc(d)}</button>`).join("")}</div>`;
  }
  function campoFoto(foto, nome) {
    return `<div class="cs-foto-campo">
      <label class="cs-foto-bt" for="cs-foto-in" aria-label="Escolher foto">${foto ? `<img src="${esc(foto)}" alt="Sua foto">` : `<span class="cs-foto-vazia" style="background:${corDe(nome)}">${esc(iniciais(nome))}</span>`}<span class="cs-foto-cam">${K.camera}</span></label>
      <input type="file" id="cs-foto-in" accept="image/*" hidden>
      <div class="stack" style="gap:6px"><b>Foto do perfil</b><span class="small muted">Ajuda os colegas a reconhecer você.</span>
      ${foto ? `<button type="button" class="btn ghost sm" data-s="foto-tirar" style="align-self:flex-start">Remover foto</button>` : ""}</div>
    </div>`;
  }
  function vPerfilInicial() {
    const c = SO.cad; if (!c.nome && SO.user) c.nome = SO.user.displayName || "";
    const sug = sugestoes(c.nome);
    return `<section class="cs-auth">
      <div class="cs-passos"><i class="on"></i><i class="on"></i></div>
      <h1>Seu perfil</h1><p class="muted">Passo 2 de 2 · Como os colegas vão ver você</p>
      <form class="stack" id="cs-f-perfil" novalidate>
        ${campoFoto(c.foto, c.nome)}
        <label class="f" for="cs-nome"><span>Nome completo <small class="muted">(só você vê; vai no cabeçalho das provas)</small></span><input class="in" id="cs-nome" value="${esc(c.nome)}"></label>
        <label class="f" for="cs-usu">Nome de usuário<span class="cs-arroba"><span>@</span><input class="in" id="cs-usu" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(c.usuario)}" placeholder="seu.nome"></span></label><small class="muted">É o nome que os outros veem em tudo no ChatMil.</small>
        <span id="cs-usu-ok" class="cs-ok" aria-live="polite"></span>
        ${sug.length ? `<div class="chips cs-sug">${sug.map(s => `<button type="button" class="chip" data-s="sug" data-v="${s}">@${s}</button>`).join("")}</div>` : ""}
        <p class="small muted">É assim que os colegas encontram você, sem precisar do número do celular.</p>
        <label class="f" for="cs-escola"><span>Escola <small class="muted">(opcional)</small></span><input class="in" id="cs-escola" value="${esc(c.escola)}" placeholder="Onde você ensina"></label>
        <div class="f"><span>Disciplinas <small class="muted">(opcional)</small></span>${chipsDisciplinas(c.disciplinas, "cad")}</div>
        ${erroHtml()}
        <button class="btn primary cs-grande">Concluir</button>
        <button type="button" class="btn ghost" data-s="sair">Sair</button>
      </form>
    </section>`;
  }

  /* ================= Conversas ================= */
  function tituloChat(c) {
    if (c.tipo === "grupo") return { nome: c.nome, sub: `${(c.membros || []).length} ${c.membros && c.membros.length === 1 ? "membro" : "membros"}`, av: t => avGrupo(c, t), p: null };
    const outro = (c.membros || []).find(m => m !== eu()) || eu(); const p = P(outro);
    return { nome: p.nome, sub: p.escola || "", av: t => av(p, t, outro), p, outro, selo: seloHtml(p) };
  }
  function prevUltima(c) {
    let u = c.ultima; if (!u) return c.tipo === "grupo" ? "Grupo criado" : "Diga olá 👋";
    if (u.e2e && window.CS_E2E) u = { ...u, ...CS_E2E.previa(c) };
    const quem = u.autor === eu() ? "Você: " : c.tipo === "grupo" ? (P(u.autor).nome || "").split(" ")[0] + ": " : "";
    return quem + (u.fig ? "Figurinha" : u.texto || "");
  }
  function vConversas() {
    const f = semAc(SO.filtroChats);
    const lista = SO.chats.filter(c => (c.tipo === "grupo" || c.ultima || (topo() && topo().id === c.id)) && (!f || semAc(tituloChat(c).nome).includes(f)));
    const assist = !f || "assistente de provas".includes(f);
    return `<div class="cs-cab"><div class="cs-marca"><span class="cs-logo sm" style="width:42px;height:42px;border-radius:14px;box-shadow:none">${K.chat}</span><h1>ChatMil</h1></div><div class="row" style="gap:6px">
        <button class="cs-ico-bt" data-s="novo" aria-label="Contatos e grupos">${K.maisV}</button></div></div>
      ${avisoEmail()}${EXT.avisos.map(f => { try { return f() || ""; } catch (e) { return ""; } }).join("")}
      <label class="cs-busca">${K.busca}<input id="cs-filtro" placeholder="Buscar conversa ou pessoa" value="${esc(SO.filtroChats)}" aria-label="Buscar conversa ou pessoa"></label>
      ${!f && EXT.conversasTopo ? EXT.conversasTopo() : ""}
      <div class="cs-lista" role="list">
        ${assist ? `<button class="cs-item" data-s="assistente" role="listitem"><span class="cs-av bot" style="width:52px;height:52px">${K.varinha}</span>
          <span class="cs-item-t"><b>Assistente de provas <span class="pill">Fixo</span></b><span>Monte uma prova em poucos toques</span></span></button>` : ""}
        ${lista.map(c => { const t = tituloChat(c), nl = naoLidas(c);
          return `<button class="cs-item ${nl ? "nl" : ""}" data-s="abrir-chat" data-id="${esc(c.id)}" role="listitem">${t.av(52)}
            <span class="cs-item-t"><b>${esc(t.nome)}${t.selo || ""}</b><span>${esc(prevUltima(c))}</span></span>
            <span class="cs-item-m"><small>${horaCurta(c.atualizadoEm)}</small>${nl ? '<i class="cs-dot" aria-label="Não lida"></i>' : ""}</span></button>`; }).join("")}
      </div>
      ${f ? `<h2 class="cs-sec">Pessoas</h2><div id="cs-res">${htmlResultados("ver-perfil")}</div>` : ""}
      ${!lista.length && !f ? `<div class="empty"><b>Nenhuma conversa</b><button class="btn primary" data-s="buscar-pessoas">Contatos</button></div>` : ""}
      <button class="cs-fab" data-s="novo" aria-label="Nova conversa ou grupo">${K.mais2}</button>`;
  }
  function sheetNovo() {
    window.abrirSheet(`<div class="sheet-h"><h2>Contatos e grupos</h2></div>
      <div class="cs-menu">
        <button data-s="buscar-pessoas">${K.user}<span><b>Contatos</b><small>Busque colegas pelo nome ou @usuário</small></span></button>
        <button data-s="novo-grupo">${K.grupo}<span><b>Novo grupo</b><small>Ex.: Área de Linguagens, Sala dos professores</small></span></button>
        <button data-s="entrar-codigo">${K.codigo}<span><b>Entrar com código</b><small>Código de convite de um grupo</small></span></button>
      </div>`);
  }
  async function abrirDireto(uid) {
    const id = await garantirDireto(uid); if (!id) return;
    window.fecharSheet(); abrirChat(id);
  }
  /* garante que a conversa com a pessoa existe; devolve o id (ou null) */
  async function garantirDireto(uid) {
    if (!uid || uid === eu()) return null;
    if (SO.bloqueados.has(uid)) { toast("Você bloqueou esta pessoa. Desbloqueie em Configurações."); return null; }
    const id = [eu(), uid].sort().join("_");
    if (!SO.chats.some(c => c.id === id)) {
      /* conversa que ainda não existe: a leitura é negada ou volta vazia; então cria */
      const s = await fb.getDoc(D("chats", id)).catch(() => null);
      if (!s || !s.exists()) {
        try {
          const m = [eu(), uid].sort();
          await fb.setDoc(D("chats", id), { tipo: "direto", membros: m, criadoPor: eu(), criadoEm: TS(), atualizadoEm: TS(), ultima: null });
        } catch (e2) { toast(e2 && e2.code === "unavailable" ? msgErro(e2) : "Não é possível mandar mensagem para esta pessoa agora. Ela pode aceitar mensagens só de quem ela segue."); return null; }
      }
      /* espera a conversa chegar na lista (até 4 s) */
      for (let k = 0; k < 40 && !SO.chats.some(c => c.id === id); k++) await new Promise(r => setTimeout(r, 100));
    }
    return id;
  }
  function abrirChat(id) { contarConversa(id); ouvirMsgs(id); { const c = SO.chats.find(x => x.id === id); if (c && c.tipo !== "grupo") ouvirPresenca((c.membros || []).find(m => m !== eu())); } marcarLida(id); abrirTela({ v: "chat", id }); setTimeout(() => window.scrollTo(0, document.documentElement.scrollHeight), 60); }

  function vChat(id) {
    const c = SO.chats.find(x => x.id === id);
    if (!c) return `<div class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Conversa</b></div><div class="empty"><b>Conversa indisponível</b><span>Você não participa mais desta conversa.</span></div>`;
    const t = tituloChat(c), g = c.tipo === "grupo", admin = g && (c.admins || []).includes(eu());
    const bloq = !g && SO.bloqueados.has(t.outro);
    const podeEscrever = !bloq && (!g || !c.soAdmins || admin);
    if (!g) ouvirPresenca(t.outro);
    return `<header class="cs-chat-h">
        <button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button>
        <button class="cs-chat-quem" data-s="${g ? "info-grupo" : "ver-perfil"}" data-id="${esc(g ? c.id : t.outro)}">${t.av(36)}<span><b>${esc(t.nome)}${t.selo || ""}</b><small id="cs-chat-sub" class="${!g && textoPresenca(t.outro) === "online" ? "on" : ""}">${esc((!g && textoPresenca(t.outro)) || t.sub)}</small></span></button>
        ${EXT.chatBotoes ? EXT.chatBotoes(c) : ""}<button class="cs-ico-bt" data-s="${g ? "info-grupo" : "menu-pessoa"}" data-id="${esc(g ? c.id : t.outro)}" aria-label="Opções">${K.mais}</button>
      </header>
      ${window.CS_E2E ? (() => { const fa = CS_E2E.faltam(); const sem = fa && fa.chat === c.id ? fa.uids.filter(u => u !== eu()) : [];
        return sem.length ? `<button class="cs-e2e-chat" data-s="e2e-info">🔓 ${esc(sem.map(u => P(u).nome).join(", "))} ainda não ativou a criptografia (precisa atualizar o app)</button>`
          : CS_E2E.pronto() ? `<button class="cs-e2e-chat" data-s="${g ? "e2e-info" : "e2e-codigo"}" data-id="${esc(g ? "" : t.outro)}">${K.lock} Protegida de ponta a ponta</button>` : ""; })() : ""}
      <div class="cs-msgs" id="cs-msgs">${htmlMsgs(c)}</div>
      ${podeEscrever ? `${SO.figAberta ? painelFig("fig-msg") : ""}
      <form class="cs-compor ${EXT.composerFim && !(SO.rascunho[id] || "").trim() ? "vazio" : ""}" id="cs-f-msg" data-id="${esc(id)}">
        <button type="button" class="cs-ico-bt ${SO.figAberta ? "on" : ""}" data-s="fig-toggle" aria-label="Figurinhas" aria-pressed="${SO.figAberta}">${K.smile}</button>${EXT.composerBotoes ? EXT.composerBotoes(c) : ""}
        <textarea id="cs-txt" class="in" rows="1" maxlength="2000" placeholder="Mensagem" aria-label="Mensagem" enterkeyhint="send">${esc(SO.rascunho[id] || "")}</textarea>
        ${EXT.composerFim ? EXT.composerFim(c) : ""}<button class="btn primary cs-env" aria-label="Enviar">${K.enviar}</button>
      </form>` : `<div class="cs-compor cs-aviso-comp">${bloq ? `Você bloqueou esta pessoa. <button class="cs-link" data-s="desbloquear" data-id="${esc(t.outro)}">Desbloquear</button>` : "Só administradores enviam mensagens neste grupo."}</div>`}`;
  }
  function htmlMsgs(c) {
    const ocultas = ocultasDe();
    const lista = (SO.msgs[c.id] || []).filter(m => !SO.bloqueados.has(m.autor) && !ocultas.has(c.id + "/" + m.id));
    if (!SO.msgs[c.id]) return `<div class="cs-carr"><div class="spin"></div></div>`;
    if (!lista.length) return `<div class="cs-vazio-chat">${figurinha(c.tipo === "grupo" ? "parabens" : "bomdia", 110)}<p>${c.tipo === "grupo" ? "Grupo criado. Dê as boas-vindas!" : "Mande a primeira mensagem ou uma figurinha."}</p></div>`;
    let h = "", dia = "", ant = null;
    lista.forEach(m => {
      const d = diaSep(m.em); if (d !== dia) { h += `${dia ? "</div>" : ""}<div class="cs-dia-g"><div class="cs-dia"><span>${esc(d)}</span></div>`; dia = d; ant = null; }
      const meu = m.autor === eu(), seq = ant && ant.autor === m.autor && ms(m.em) - ms(ant.em) < 5 * 60e3;
      const nome = c.tipo === "grupo" && !meu && !seq ? `<b class="cs-autor" style="color:${corDe(m.autor)}">${esc(P(m.autor).nome)}</b>` : "";
      const hr = (m.em ? new Date(ms(m.em)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "") + tique(c, m);
      if (m.apagada) { h += `<div class="cs-m ${meu ? "eu" : ""} ${seq ? "seq" : ""}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b cs-apagada">${nome}<span class="cs-tx">${K.proibido}${m.por && m.por !== m.autor ? "Mensagem apagada pelo administrador" : meu ? "Você apagou esta mensagem" : "Mensagem apagada"}</span><span class="cs-h">${hr.replace(/<svg[\s\S]*$/, "")}</span></div></div>`; ant = m; return; }
      if (m.cifrada) { h += `<div class="cs-m ${meu ? "eu" : ""} ${seq ? "seq" : ""}" data-id="${esc(m.id)}"><div class="cs-b cs-trancada">${nome}<span class="cs-tx">${m.cifrada === "pin" ? "🔒 Digite seu PIN para abrir" : m.cifrada === "abrindo" ? "🔒 Abrindo…" : "🔒 Mensagem protegida que este celular não consegue abrir"}</span><span class="cs-h">${hr}</span></div></div>`; ant = m; return; }
      if (EXT.msg && (m.arquivo || m.chamada || m.audio || m.unica)) { h += EXT.msg(m, { meu, seq, nome, hr, chat: c }); ant = m; return; }
      if (m.fig) h += `<div class="cs-m ${meu ? "eu" : ""} ${seq ? "seq" : ""}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0">${nome}<div class="cs-fig">${figurinha(m.fig, 128)}<span class="cs-h">${hr}</span></div></div>`;
      else h += `<div class="cs-m ${meu ? "eu" : ""} ${seq ? "seq" : ""}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b">${nome}<span class="cs-tx">${textoComLinks(m.texto)}</span>${previaYT(m.texto)}<span class="cs-h">${hr}</span></div></div>`;
      ant = m;
    });
    return h + (dia ? "</div>" : "");
  }
  function pintarMsgs() {
    const t = topo(); const el = $("#cs-msgs"); if (!t || t.v !== "chat" || !el) return;
    const c = SO.chats.find(x => x.id === t.id); if (!c) return pintar();
    const perto = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    el.innerHTML = htmlMsgs(c);
    if (perto) window.scrollTo(0, document.documentElement.scrollHeight);
  }
  /* Todas as figurinhas numa só grade; as usadas por último aparecem primeiro */
  const figRecentes = () => { try { return (JSON.parse(localStorage.getItem("cs.figrec") || "[]")).filter(id => FIGS[id]); } catch (e) { return []; } };
  function usarFig(id) { try { localStorage.setItem("cs.figrec", JSON.stringify([id, ...figRecentes().filter(x => x !== id)].slice(0, 8))); } catch (e) { } }
  function painelFig(acao) {
    const rec = figRecentes(), todas = [...rec, ...PACOTES[0].ids.filter(id => !rec.includes(id))];
    return `<div class="cs-figp" role="dialog" aria-label="Figurinhas">
      <div class="cs-figgrid">${todas.map(id => `<button type="button" data-s="${acao}" data-v="${id}" aria-label="${esc(FIGS[id].nome)}">${figurinha(id, 72)}</button>`).join("")}</div></div>`;
  }
  /* frequência de conversa (neste aparelho): quem mais conversa comigo aparece primeiro */
  function freq() { try { return JSON.parse(localStorage.getItem("cs.freq." + eu()) || "{}") || {}; } catch (e) { return {}; } }
  function contarConversa(id) { try { const f = freq(); f[id] = (f[id] || 0) + 1; localStorage.setItem("cs.freq." + eu(), JSON.stringify(f)); } catch (e) { } }
  function contatosOrdenados() {
    const fr = freq(), vistos = new Set(), out = [];
    SO.chats.filter(c => c.tipo !== "grupo").map(c => ({ c, uid: (c.membros || []).find(m => m !== eu()) }))
      .filter(x => x.uid && !SO.bloqueados.has(x.uid))
      .sort((a, b) => ((fr[b.c.id] || 0) - (fr[a.c.id] || 0)) || (ms(b.c.atualizadoEm) - ms(a.c.atualizadoEm)))
      .forEach(x => { if (!vistos.has(x.uid)) { vistos.add(x.uid); out.push(x.uid); } });
    [...(SO.seguindo || [])].forEach(u => { if (!vistos.has(u) && !SO.bloqueados.has(u) && u !== eu()) { vistos.add(u); out.push(u); } });
    return out;
  }
  async function enviarMsg(id, conteudo) {
    const c = SO.chats.find(x => x.id === id); if (!c) return;
    contarConversa(id);
    if (conteudo.texto != null) {
      const t = conteudo.texto.trim(); if (!t) return;
      if (ofensivo(t)) { toast("Mensagem não enviada: tem palavras ofensivas ou preconceituosas."); return false; }
      conteudo = { texto: t.slice(0, 2000) };
    }
    const prev = conteudo.prev || ""; delete conteudo.prev;
    const ult = { texto: conteudo.texto ? conteudo.texto.slice(0, 120) : prev.slice(0, 120), fig: conteudo.fig || null };
    /* criptografia de ponta a ponta: tranca a mensagem para cada participante */
    let sel = null;
    if (window.CS_E2E) { CS_E2E.anexarChaves(conteudo); try { sel = await CS_E2E.selar(c, conteudo, ult); } catch (e) { console.warn("e2e", e); sel = null; } }
    const b = fb.writeBatch(db);
    if (sel) {
      b.set(fb.doc(C("chats", id, "msgs")), { autor: eu(), em: TS(), ...sel.msg });
      b.update(D("chats", id), { ultima: { autor: eu(), ...sel.ultima }, atualizadoEm: TS() });
    } else {
      b.set(fb.doc(C("chats", id, "msgs")), { autor: eu(), em: TS(), ...conteudo });
      b.update(D("chats", id), { ultima: { autor: eu(), ...ult }, atualizadoEm: TS() });
    }
    try { await b.commit(); return true; } catch (e) { toast(msgErro(e)); return false; }
  }
  /* "apagar para mim": some só neste aparelho */
  function ocultasDe() { const k = "cs.ocultas." + eu(); if (!SO.ocultas || SO.ocultas.k !== k) { let a = []; try { a = JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { } SO.ocultas = { k, s: new Set(a) }; } return SO.ocultas.s; }
  function ocultar(chatId, msgId) { const s = ocultasDe(); s.add(chatId + "/" + msgId); try { localStorage.setItem(SO.ocultas.k, JSON.stringify([...s].slice(-3000))); } catch (e) { } }
  function sheetMsg(chatId, msgId) {
    const m = (SO.msgs[chatId] || []).find(x => x.id === msgId); if (!m) return;
    const meu = m.autor === eu(), c = SO.chats.find(x => x.id === chatId);
    const adminGrupo = c && c.tipo === "grupo" && (c.admins || []).includes(eu());
    const paraTodos = !m.apagada && !m.cifrada && (meu || adminGrupo);
    window.abrirSheet(`<div class="sheet-h"><h2>Mensagem</h2></div><div class="cs-menu">
      ${m.texto && !m.apagada ? `<button data-s="copiar" data-v="${esc(m.texto)}">${K.copiar}<span><b>Copiar texto</b></span></button>` : ""}
      ${paraTodos ? `<button data-s="apagar-msg" data-chat="${esc(chatId)}" data-id="${esc(msgId)}" class="perigo">${K.lixo}<span><b>Apagar para todos</b>${!meu ? "<small>Como administrador do grupo</small>" : ""}</span></button>` : ""}
      <button data-s="apagar-mim" data-chat="${esc(chatId)}" data-id="${esc(msgId)}">${K.lixo}<span><b>Apagar para mim</b><small>Some só neste celular</small></span></button>
      ${meu || m.apagada ? "" : `<button data-s="denunciar" data-tipo="mensagem" data-uid="${esc(m.autor)}" data-chat="${esc(chatId)}" data-id="${esc(msgId)}">${K.flag}<span><b>Denunciar</b><small>A equipe do ChatMil vai analisar</small></span></button>
           <button data-s="ver-perfil" data-id="${esc(m.autor)}">${K.user}<span><b>Ver perfil de ${esc(P(m.autor).nome)}</b></span></button>`}
    </div>`);
  }

  /* ---------- Grupos ---------- */
  const novoCodigo = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  function vNovoGrupo() {
    const g = SO.ng || (SO.ng = { nome: "", descricao: "", foto: null, membros: [] });
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Novo grupo</b></header>
      <form class="stack cs-pag" id="cs-f-grupo" novalidate>
        <div class="cs-foto-campo"><label class="cs-foto-bt" for="cs-foto-in">${g.foto ? `<img src="${esc(g.foto)}" alt="">` : `<span class="cs-foto-vazia" style="background:var(--primary)">${K.grupo}</span>`}<span class="cs-foto-cam">${K.camera}</span></label>
          <input type="file" id="cs-foto-in" accept="image/*" hidden><div class="stack" style="gap:4px"><b>Foto do grupo</b><span class="small muted">Opcional</span></div></div>
        <label class="f" for="cs-g-nome">Nome do grupo<input class="in" id="cs-g-nome" maxlength="60" value="${esc(g.nome)}" placeholder="Ex.: Área de Linguagens"></label>
        <div class="chips">${["Área de Linguagens", "Área de Matemática", "Ciências da Natureza", "Ciências Humanas", "Sala dos professores", "Professores do AEE"].map(n => `<button type="button" class="chip" data-s="g-sug" data-v="${n}">${n}</button>`).join("")}</div>
        <label class="f" for="cs-g-desc"><span>Descrição <small class="muted">(opcional)</small></span><textarea class="in" id="cs-g-desc" maxlength="300" rows="2" placeholder="Para que serve o grupo">${esc(g.descricao)}</textarea></label>
        <div class="f"><span>Participantes</span>
          <div class="chips">${g.membros.map(u => `<button type="button" class="chip cs-chip-p" data-s="g-tirar" data-v="${esc(u)}" aria-label="Tirar ${esc(P(u).nome)}">${av(P(u), 22, u)} ${esc(P(u).nome.split(" ")[0])} ✕</button>`).join("")}</div>
          <label class="cs-busca">${K.busca}<input id="cs-g-busca" placeholder="Adicionar pelo nome ou @usuário" autocomplete="off" value="${esc(SO.busca)}"></label>
          <div id="cs-res">${htmlResultados("g-add")}</div>
          <span class="small muted">Você também pode convidar depois, pelo código do grupo.</span></div>
        ${erroHtml()}
        <button class="btn primary cs-grande">Criar grupo</button>
      </form>`;
  }
  async function criarGrupo() {
    const g = SO.ng; g.nome = $("#cs-g-nome").value.trim(); g.descricao = $("#cs-g-desc").value.trim();
    if (g.nome.length < 3) return erro("Dê um nome ao grupo.");
    if (ofensivo(g.nome + " " + g.descricao)) return erro("O nome ou a descrição têm palavras não permitidas.");
    ocupar("Criando…");
    const ref = fb.doc(C("chats")), codigo = novoCodigo();
    const b = fb.writeBatch(db);
    b.set(ref, { tipo: "grupo", nome: g.nome, descricao: g.descricao, foto: g.foto || null, membros: [eu(), ...g.membros.filter(u => u !== eu())], admins: [eu()],
      criadoPor: eu(), criadoEm: TS(), atualizadoEm: TS(), codigo, soAdmins: false, ultima: null });
    b.set(D("convites", codigo), { chatId: ref.id, nome: g.nome });
    try { await b.commit(); SO.ng = null; SO.busca = ""; SO.resultados = null; SO.ocupado = false; SO.pilha.pop(); try { history.replaceState({ cs: SO.pilha.length }, ""); } catch (e) { } abrirChat(ref.id); toast("Grupo criado!"); }
    catch (e) { erro(msgErro(e)); }
  }
  function vInfoGrupo(id) {
    const c = SO.chats.find(x => x.id === id);
    if (!c) return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Grupo</b></header><div class="empty"><b>Você não participa deste grupo.</b></div>`;
    const admin = (c.admins || []).includes(eu());
    const mem = (c.membros || []).slice().sort((a, b) => ((c.admins || []).includes(b) - (c.admins || []).includes(a)) || P(a).nome.localeCompare(P(b).nome, "pt-BR"));
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Dados do grupo</b></header>
      <div class="cs-pag stack">
        <div class="cs-ghead">${avGrupo(c, 96)}<h1>${esc(c.nome)}</h1><span class="muted">Grupo · ${mem.length} ${mem.length === 1 ? "membro" : "membros"}</span>${c.descricao ? `<p class="cs-just">${esc(c.descricao)}</p>` : ""}</div>
        <div class="card cs-codigo"><div><span class="small muted">Código de convite</span><b>${esc(c.codigo || "—")}</b></div>
          <div class="row"><button class="btn sm" data-s="copiar" data-v="${esc(c.codigo)}">${K.copiar} Copiar</button><button class="btn primary sm" data-s="compartilhar-grupo" data-id="${esc(c.id)}">${K.share} Convidar</button></div></div>
        ${admin ? `<div class="cs-menu card flat">
          <button data-s="editar-grupo" data-id="${esc(c.id)}">${K.pen}<span><b>Editar nome, foto e descrição</b></span>${K.dir}</button>
          <button data-s="add-membro" data-id="${esc(c.id)}">${K.addUser}<span><b>Adicionar participantes</b></span>${K.dir}</button>
          <label class="cs-linha-sw" for="cs-soadm">${K.megafone}<span><b>Só administradores enviam</b><small>Bom para grupos de avisos</small></span><input type="checkbox" class="cs-sw" id="cs-soadm" data-id="${esc(c.id)}" ${c.soAdmins ? "checked" : ""}></label>
          <button data-s="novo-codigo" data-id="${esc(c.id)}">${K.codigo}<span><b>Gerar novo código</b><small>O código antigo deixa de funcionar</small></span></button>
        </div>` : ""}
        <h2 class="cs-sec">Participantes</h2>
        <div class="cs-lista">${mem.map(u => { const p = P(u); return `<button class="cs-item" data-s="membro" data-chat="${esc(c.id)}" data-id="${esc(u)}">${av(p, 44, u)}<span class="cs-item-t"><b>${esc(u === eu() ? "Você" : p.nome)}${seloHtml(p)}</b><span>${esc(p.escola || "")}</span></span>${(c.admins || []).includes(u) ? '<span class="pill">Admin</span>' : ""}</button>`; }).join("")}</div>
        <button class="btn cs-perigo" data-s="sair-grupo" data-id="${esc(c.id)}">${K.sair} Sair do grupo</button>
      </div>`;
  }
  async function compartilharGrupo(c) {
    const url = location.origin + location.pathname.replace(/index\.html$/, "") + "?g=" + c.codigo;
    const texto = `Entre no grupo “${c.nome}” no ChatMil. Código: ${c.codigo}`;
    const web = /^https?:/.test(location.origin) && !/localhost/.test(location.host);
    try { if (navigator.share) { await navigator.share({ title: "ChatMil", text: texto, url: web ? url : undefined }); return; } } catch (e) { if (e.name === "AbortError") return; }
    copiar(texto + (web ? " " + url : ""));
  }
  function copiar(t) { try { navigator.clipboard.writeText(t).then(() => toast("Copiado!"), () => toast(t)); } catch (e) { toast(t); } }
  function sheetEntrarCodigo(pre) {
    window.abrirSheet(`<div class="sheet-h"><h2>Entrar em um grupo</h2></div>
      <form class="stack" id="cs-f-codigo"><label class="f" for="cs-cod">Código de convite<input class="in cs-cod-in" id="cs-cod" maxlength="6" autocapitalize="characters" autocomplete="off" value="${esc(pre || "")}" placeholder="Ex.: K7M2QX"></label>
      <div id="cs-cod-res"></div><button class="btn primary cs-grande">Procurar grupo</button></form>`);
    if (pre) setTimeout(() => { const f = $("#cs-f-codigo"); if (f) f.requestSubmit(); }, 50);
  }
  async function procurarCodigo() {
    const cod = $("#cs-cod").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const out = $("#cs-cod-res"); if (cod.length !== 6) { out.innerHTML = `<p class="small" style="color:var(--danger)">O código tem 6 letras e números.</p>`; return; }
    out.innerHTML = `<p class="small muted">Procurando…</p>`;
    try {
      const s = await fb.getDoc(D("convites", cod));
      if (!s.exists()) { out.innerHTML = `<p class="small" style="color:var(--danger)">Nenhum grupo com este código. Confira as letras.</p>`; return; }
      const { chatId, nome } = s.data();
      if (SO.chats.some(c => c.id === chatId)) { window.fecharSheet(); abrirChat(chatId); return; }
      out.innerHTML = `<div class="card flat row"><span class="cs-av grp" style="width:44px;height:44px;background:${corDe(chatId)}">${K.grupo}</span><b style="flex:1">${esc(nome)}</b><button type="button" class="btn primary" data-s="entrar-grupo" data-id="${esc(chatId)}" data-v="${cod}">Entrar</button></div>`;
    } catch (e) { out.innerHTML = `<p class="small" style="color:var(--danger)">${esc(msgErro(e))}</p>`; }
  }
  async function entrarGrupo(chatId, cod) {
    try {
      await fb.updateDoc(D("chats", chatId), { membros: fb.arrayUnion(eu()), entrouCom: cod, atualizadoEm: TS() });
      window.fecharSheet(); toast("Você entrou no grupo!");
      const esperar = () => SO.chats.some(c => c.id === chatId) ? abrirChat(chatId) : setTimeout(esperar, 200); esperar();
    } catch (e) { toast(msgErro(e)); }
  }
  async function sairGrupo(c) {
    const admins = (c.admins || []).filter(a => a !== eu()), membros = (c.membros || []).filter(m => m !== eu());
    const eraAdmin = (c.admins || []).includes(eu());
    try {
      if (eraAdmin) await fb.updateDoc(D("chats", c.id), { membros, admins: admins.length ? admins : membros.slice(0, 1), atualizadoEm: TS() });
      else await fb.updateDoc(D("chats", c.id), { membros: fb.arrayRemove(eu()), atualizadoEm: TS() });
      SO.pilha = []; try { history.go(-(history.state && history.state.cs || 0)); } catch (e) { } toast("Você saiu do grupo."); pintar();
    } catch (e) { toast(msgErro(e)); }
  }
  /* Confirmação clara antes de ações que não dá para desfazer */
  function pedirConfirmacao(titulo, texto, botao, el) {
    const attrs = Object.entries(el.dataset).map(([k, v]) => `data-${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}="${esc(v)}"`).join(" ");
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(titulo)}</h2></div><p class="cs-just">${texto}</p>
      <div class="row"><button class="btn" data-s="fechar" style="flex:1">Cancelar</button><button class="btn cs-perigo-f" ${attrs} data-ok="1" style="flex:1">${esc(botao)}</button></div>`);
  }

  /* ================= Mural ================= */
  /* Confirmar o e-mail é opcional (nada fica bloqueado). Só lembra quem tem e-mail institucional, que ganha o selo. */
  function avisoEmail() {
    if (!SO.user || SO.user.emailVerified || !/\.(gov|edu)\.br$/i.test(SO.user.email || "")) return "";
    try { if (localStorage.getItem("cs.avisoMail") === "nao") return ""; } catch (e) { }
    return `<div class="aviso cs-aviso-mail">${K.mail}<span>Confirme o e-mail institucional para ganhar o selo de professor(a). É opcional.</span><button class="btn sm" data-s="email">Ver</button><button class="btn sm ghost" data-s="aviso-mail-nao" aria-label="Não mostrar de novo">Fechar</button></div>`;
  }
  function htmlPost(p, completo) {
    const a = P(p.autor), meu = p.autor === eu(), curti = (p.curtidas || []).includes(eu()), n = (p.curtidas || []).length;
    const texto = esc(p.texto || "");
    const longo = !completo && (p.texto || "").length > 420;
    return `<article class="card cs-post">
      <div class="cs-post-h"><button class="cs-quem" data-s="ver-perfil" data-id="${esc(p.autor)}">${av(a, 44, p.autor)}<span><b>${esc(meu ? ((SO.eu && SO.eu.usuario) || a.nome) : a.nome)}${seloHtml(a)}</b><small>${tempoPost(p.em)}${EXT.postMeta.map(f => { try { return f(p) || ""; } catch (e) { return ""; } }).join("")}${p.para ? ` · ${K.lock} ${meu ? `para ${p.para.length} pessoa${p.para.length === 1 ? "" : "s"}` : "só para algumas pessoas"}` : ""}</small></span></button>
        <button class="cs-ico-bt" data-s="menu-post" data-id="${esc(p.id)}" aria-label="Opções da publicação">${K.mais}</button></div>
      ${p.texto ? `<div class="cs-post-tx ${longo ? "corte" : ""}">${texto}</div>${longo ? `<button class="cs-link" data-s="abrir-post" data-id="${esc(p.id)}">Ler tudo</button>` : ""}` : ""}
      ${p.fig ? `<div class="cs-post-fig">${figurinha(p.fig, 140)}</div>` : ""}
      ${htmlFotosPost(p)}${htmlArqPost(p)}
      <div class="cs-post-a">
        <button class="cs-acao ${curti ? "on" : ""}" data-s="curtir" data-id="${esc(p.id)}" aria-pressed="${curti}" aria-label="Curtir">${K.heart}<span>${n || ""}</span></button>
        <button class="cs-acao" data-s="abrir-post" data-id="${esc(p.id)}" aria-label="Comentários">${K.coment}<span>${p.nComent || ""}</span></button>
        ${meu ? "" : `<button class="cs-acao" data-s="abrir-direto" data-id="${esc(p.autor)}" aria-label="Mandar mensagem">${K.chat}</button>`}
      </div></article>`;
  }
  function postsVisiveis() {
    return SO.posts.filter(p => !SO.bloqueados.has(p.autor) && (SO.feed !== "seguindo" || p.autor === eu() || SO.seguindo.has(p.autor))
      && EXT.muralFiltro.every(f => { try { return f(p, SO.feed) !== false; } catch (e) { return true; } }));
  }
  function vMural() {
    const lista = postsVisiveis(), eup = SO.eu || {}, h = l => l.map(f => { try { return f() || ""; } catch (e) { console.warn(e); return ""; } }).join("");
    const segs = [["todos", "Todos"], ...EXT.muralSeg, ["seguindo", "Seguindo"]];
    if (!segs.some(x => x[0] === SO.feed)) SO.feed = "todos";
    return `<div class="cs-cab"><h1>Mural</h1>${h(EXT.muralCab)}<button class="cs-ico-bt" data-s="buscar-pessoas" aria-label="Encontrar colegas">${K.busca}</button></div>
      ${avisoEmail()}
      ${h(EXT.muralTopo)}
      <button class="card cs-novo-post" data-s="novo-post">${av(eup, 40, eu())}<span>Nova publicação</span>${K.foto}</button>
      <div class="seg cs-seg">${segs.map(([k, n]) => `<button data-s="feed" data-v="${k}" aria-pressed="${SO.feed === k}">${n}</button>`).join("")}</div>
      ${lista.length ? `<div class="stack">${lista.map(p => htmlPost(p)).join("")}</div>` :
        `<div class="empty">${figurinha("eureca", 96)}<b>Nada por aqui</b>
        <button class="btn primary" data-s="${SO.feed === "seguindo" ? "buscar-pessoas" : "novo-post"}">${SO.feed === "seguindo" ? "Encontrar colegas" : "Publicar"}</button></div>`}
      <button class="cs-fab" data-s="novo-post" aria-label="Nova publicação">${K.mais2}</button>`;
  }
  function sheetNovoPost() {
    SO.postFig = null; (SO.postFotos || []).forEach(f => URL.revokeObjectURL(f.url)); SO.postFotos = []; SO.postPub = "todos"; SO.postArq = null; SO.postLive = false;
    EXT.compositorAbrir.forEach(f => { try { f(); } catch (e) { } });
    window.abrirSheet(`<div class="sheet-h"><h2>Nova publicação</h2></div>
      <form class="stack" id="cs-f-post"><textarea class="in" id="cs-post-tx" maxlength="3000" rows="4" placeholder="Escreva para os colegas…"></textarea>
      <div id="cs-post-figsel"></div>
      <div class="cs-pc-fotos" id="cs-pc-fotos"></div>
      <div id="cs-pc-arq"></div>
      <div class="cs-pc-bar">
        <button type="button" class="btn sm" data-s="mp-fotos">${K.foto}<span>Fotos</span></button>
        <button type="button" class="btn sm" data-s="mp-arq">${K.clip}<span>Arquivo</span></button>
        <button type="button" class="btn sm" data-s="mp-gravar">${K.video}<span>Gravar</span></button>
        <button type="button" class="btn sm" data-s="mp-live">${K.live}<span>Ao vivo</span></button>
        <button type="button" class="btn sm" data-s="mp-fig">${K.smile}<span>Figurinha</span></button>
        <button type="button" class="btn sm" data-s="mp-pub" id="cs-mp-pub">${K.grupo}<span>Todos</span></button>
        ${EXT.compositorBotoes.map(f => { try { return f() || ""; } catch (e) { return ""; } }).join("")}
      </div>
      ${EXT.compositorPainel.map(f => { try { return f() || ""; } catch (e) { return ""; } }).join("")}
      <div id="cs-mp-figs" hidden>${painelFig("fig-post")}</div>
      <div class="cs-mp-pessoas" id="cs-mp-pessoas" hidden>
        <div class="seg"><button type="button" data-s="mp-pubv" data-v="todos" aria-pressed="true">Todos</button><button type="button" data-s="mp-pubv" data-v="escolher" aria-pressed="false">Só pessoas marcadas</button></div>
        <div id="cs-mp-lista" hidden>
          <input class="in" id="cs-mp-filtro" placeholder="Buscar pelo nome" aria-label="Buscar pessoa">
          <button type="button" class="cs-link" data-s="mp-seguidos">Marcar todos que eu sigo</button>
          <div class="cs-mp-ll">${contatosOrdenados().map(u => { const p = P(u); return `<label class="cs-aceite" data-n="${esc(semAc(p.nome || ""))}"><input type="checkbox" class="cs-mp-pp" value="${esc(u)}">${av(p, 32, u)}<span>${esc(p.nome)}</span></label>`; }).join("") || `<p class="small muted">Converse com colegas ou siga alguém para marcar aqui.</p>`}</div>
        </div>
      </div>
      <div class="cs-pc-prog" id="cs-pc-prog" hidden><i></i></div>
      <button class="btn primary cs-grande" id="cs-pc-ok">Publicar</button></form>`);
  }
  function pintarFotosCompositor() {
    const el = $("#cs-pc-fotos"); if (!el) return;
    el.innerHTML = (SO.postFotos || []).map((f, i) => `<span class="cs-pc-f"><img src="${f.url}" alt=""><button type="button" data-s="mp-tirar" data-v="${i}" aria-label="Tirar foto">${K.x}</button></span>`).join("");
  }
  function marcadosPost() { return [...document.querySelectorAll(".cs-mp-pp:checked")].map(x => x.value).slice(0, 400); }
  async function publicar() {
    const t = $("#cs-post-tx").value.trim(), fotos = SO.postFotos || [];
    const arqP = SO.postArq, live = SO.postLive;
    if (!t && !SO.postFig && !fotos.length && !arqP && !live) return toast("Escreva algo ou anexe.");
    if (ofensivo(t)) return toast("Publicação não enviada: tem palavras ofensivas ou preconceituosas.");
    const para = SO.postPub === "escolher" ? marcadosPost() : null;
    if (para && !para.length) return toast("Marque quem vai ver a publicação.");
    const ok = $("#cs-pc-ok"), prog = $("#cs-pc-prog");
    if (ok.disabled) return; ok.disabled = true; ok.textContent = fotos.length ? "Preparando fotos…" : "Publicando…";
    const col = para ? "postsPriv" : "posts", ref = fb.doc(C(col)), criados = [], imgs = []; let criadosArq = null;
    try {
      await SO.user.getIdToken(true).catch(() => { });
      if (prog && fotos.length) prog.hidden = false;
      for (let i = 0; i < fotos.length; i++) {
        const r = await fotos[i].prep; const iid = ref.id + "_" + i;
        if (ok) ok.textContent = `Enviando foto ${i + 1} de ${fotos.length}…`;
        const base = { dono: eu(), em: TS(), ...(para ? { para } : {}) };
        await fb.setDoc(D("postImgs", iid + "m"), { ...base, d: fb.Bytes.fromUint8Array(new Uint8Array(await r.m.arrayBuffer())) }); criados.push(iid + "m");
        if (r.f) { await fb.setDoc(D("postImgs", iid + "f"), { ...base, d: fb.Bytes.fromUint8Array(new Uint8Array(await r.f.arrayBuffer())) }); criados.push(iid + "f"); }
        MI_guardar(iid + "m", r.m); if (r.f) MI.cheia.set(iid + "f", r.f);
        imgs.push({ id: iid, w: r.w, h: r.h, t: r.t, f: !!r.f });
        if (prog) prog.firstElementChild.style.width = Math.round((i + 1) / fotos.length * 100) + "%";
      }
      let arq = null;
      if (arqP) {
        if (ok) ok.textContent = "Enviando arquivo…";
        const r = await arqP.prep, M = EXT.midia;
        const aid = await M.subir(null, r.blob, { nome: r.nome, tipo: r.tipo, extra: para ? { para } : {} }, f => { if (prog) { prog.hidden = false; prog.firstElementChild.style.width = Math.round(f * 100) + "%"; } }, "postArqs");
        criadosArq = aid; M.guardar("postArqs:" + aid, r.blob);
        arq = { id: aid, nome: r.nome, tipo: r.tipo, tamanho: r.blob.size, ...r.extra };
      }
      const aoVivo = live ? "ChatMil-AoVivo-" + eu().slice(0, 6) + "-" + Math.random().toString(36).slice(2, 8) : null;
      const extraP = Object.assign({}, ...EXT.postDados.map(f => { try { return f(para) || {}; } catch (e) { return {}; } }));
      await fb.setDoc(ref, { ...extraP, autor: eu(), texto: t.slice(0, 3000), fig: SO.postFig || null, em: TS(), curtidas: [], nComent: 0, ...(imgs.length ? { imgs } : {}), ...(para ? { para } : {}), ...(arq ? { arq } : {}), ...(aoVivo ? { aoVivo } : {}) });
      if (aoVivo) abrirAoVivo(aoVivo);
      fotos.forEach(f => URL.revokeObjectURL(f.url)); SO.postFotos = []; SO.postArq = null; SO.postLive = false;
      window.fecharSheet(); toast(para ? `Publicado só para ${para.length} pessoa${para.length === 1 ? "" : "s"}.` : "Publicado!"); SO.feed = "todos"; if (SO.tab !== "mural") { SO.tab = "mural"; lembrarTab(); } pintar();
    } catch (e) {
      criados.forEach(id => fb.deleteDoc(D("postImgs", id)).catch(() => { })); if (criadosArq && EXT.midia) EXT.midia.apagarArquivo(criadosArq, "postArqs");
      if (ok) { ok.disabled = false; ok.textContent = "Publicar"; } if (prog) prog.hidden = true;
      toast(e && e.msg ? e.msg : msgErro(e));
    }
  }

  /* ================= Fotos do mural: leves no celular e nítidas =================
     Cada foto vai em 2 tamanhos: "m" (até 1280 px, ~150 KB) aparece no mural;
     "f" (até 2560 px) só baixa quando a pessoa abre a foto. Uma prévia borrada
     de poucos bytes vai junto da publicação e aparece na hora. */
  const MI = { m: new Map(), cheia: new Map(), pend: new Map(), obs: null, el: null };
  function MI_guardar(id, blob) {
    if (MI.m.has(id)) return MI.m.get(id);
    const u = URL.createObjectURL(blob); MI.m.set(id, u);
    while (MI.m.size > 48) { const [k, x] = MI.m.entries().next().value; MI.m.delete(k); setTimeout(() => URL.revokeObjectURL(x), 4000); }
    return u;
  }
  async function abrirImagem(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { } }
    const url = URL.createObjectURL(file);
    try { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  const dimDe = img => [img.naturalWidth || img.width, img.naturalHeight || img.height];
  function blobDe(cv, tipo, q) { return new Promise(r => { try { cv.toBlob(b => r(b), tipo, q); } catch (e) { r(null); } }); }
  async function reduzir(img, lado, q, max) {
    const [w0, h0] = dimDe(img), k = Math.min(1, lado / Math.max(w0, h0));
    const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(w0 * k)); cv.height = Math.max(1, Math.round(h0 * k));
    const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
    let tipo = "image/webp", b = await blobDe(cv, tipo, q);
    if (!b || b.type !== "image/webp") { tipo = "image/jpeg"; b = await blobDe(cv, tipo, q); }
    while (b && b.size > max && q > 0.42) { q -= 0.08; b = await blobDe(cv, tipo, q); }
    if (!b || b.size > max) { cv.width = Math.round(cv.width * 0.75); cv.height = Math.round(cv.height * 0.75); cx.drawImage(img, 0, 0, cv.width, cv.height); b = await blobDe(cv, "image/jpeg", 0.7); }
    if (!b) throw { msg: "Não foi possível preparar esta foto." };
    return { b, w: cv.width, h: cv.height };
  }
  async function prepararFotoPost(file) {
    const img = await abrirImagem(file); const [w, h] = dimDe(img);
    if (!w || !h) throw { msg: "Esta imagem não pôde ser lida." };
    const m = await reduzir(img, 1280, 0.82, 300000);
    const f = Math.max(w, h) > 1400 ? await reduzir(img, 2560, 0.86, 740000) : null;
    const tc = document.createElement("canvas"), k = 24 / Math.max(w, h); tc.width = Math.max(2, Math.round(w * k)); tc.height = Math.max(2, Math.round(h * k));
    tc.getContext("2d").drawImage(img, 0, 0, tc.width, tc.height);
    try { img.close && img.close(); } catch (e) { }
    return { m: m.b, f: f ? f.b : null, w: m.w, h: m.h, t: tc.toDataURL("image/jpeg", 0.5) };
  }
  /* arquivo (PDF, vídeo, slides…) e ao vivo no mural */
  function htmlArqPost(p) {
    let h = "";
    if (p.aoVivo) {
      const fresco = Date.now() - ms(p.em) < 3 * 3600e3;
      h += `<div class="cs-live ${fresco ? "on" : ""}"><span class="cs-live-tag">${fresco ? "AO VIVO" : "Transmissão encerrada"}</span>${fresco ? `<button class="btn sm primary" data-s="mp-assistir" data-v="${esc(p.aoVivo)}">${p.autor === eu() ? "Abrir" : "Assistir"}</button>` : ""}</div>`;
    }
    const a = p.arq; if (!a || !EXT.midia) return h;
    const g = EXT.midia.genero(a), capa = a.thumb && /^data:image\/(jpeg|png|webp);base64,/.test(a.thumb);
    if (g === "video") return h + `<button class="cs-parq-v" data-s="mp-abrir" data-post="${esc(p.id)}" ${capa ? `style="background-image:url(${a.thumb})"` : ""} aria-label="Assistir vídeo"><span class="cs-yt-play">${K.play}</span>${a.dur ? `<i>${Math.floor(a.dur / 60)}:${String(Math.round(a.dur % 60)).padStart(2, "0")}</i>` : ""}</button>`;
    const ext = (String(a.nome || "").split(".").pop() || "").slice(0, 4).toUpperCase();
    return h + `<button class="cs-arq cs-parq ${capa ? "cs-arq-capa" : ""}" data-s="mp-abrir" data-post="${esc(p.id)}">${capa ? `<span class="cs-capa ${g === "slides" || (a.tw > a.th) ? "larga" : "folha"}"><img src="${a.thumb}" alt="" loading="lazy"></span>` : ""}
      <span class="cs-arq-row"><span class="cs-arq-ic" style="--c:${EXT.midia.COR[g]}">${K.clip}<b>${esc(ext)}</b></span><span class="cs-arq-t"><b>${esc(a.nome)}</b><small>${EXT.midia.ROTULO[g]}${a.paginas ? " · " + a.paginas + " pág." : ""}</small></span></span></button>`;
  }
  function abrirAoVivo(sala) {
    const nome = (SO.eu && (SO.eu.usuario || SO.eu.nome)) || "";
    const u = `https://meet.jit.si/${encodeURIComponent(sala)}#userInfo.displayName=${encodeURIComponent(JSON.stringify(nome))}&config.disableDeepLinking=true`;
    abrirLink(u);
  }
  function pintarArqCompositor() {
    const el = $("#cs-pc-arq"); if (!el) return;
    const a = SO.postArq, live = SO.postLive;
    el.innerHTML = (a ? `<div class="cs-pc-a">${K.clip}<span>${esc(a.nome)}</span><button type="button" data-s="mp-arq-tirar" aria-label="Tirar">${K.x}</button></div>` : "")
      + (live ? `<div class="cs-pc-a cs-pc-live">${K.live}<span>Ao vivo ao publicar</span><button type="button" data-s="mp-live" aria-label="Tirar">${K.x}</button></div>` : "");
  }
  const tinyOk = t => typeof t === "string" && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(t) && t.length < 4000;
  function htmlFotosPost(p) {
    const l = (p.imgs || []).slice(0, 6); if (!l.length) return "";
    const n = Math.min(l.length, 4), ar = l.length === 1 ? Math.max(0.65, Math.min(1.9, (l[0].w || 1) / (l[0].h || 1))) : 0;
    return `<div class="cs-pfotos n${n}" ${ar ? `style="--ar:${ar.toFixed(3)}"` : ""}>${l.slice(0, 4).map((m, i) => {
      const u = MI.m.get(m.id + "m");
      return `<button class="cs-pf ${u ? "ok" : ""}" data-s="mf-ver" data-post="${esc(p.id)}" data-v="${i}" data-img="${esc(m.id)}" ${tinyOk(m.t) ? `style="background-image:url(${m.t})"` : ""} aria-label="Abrir foto ${i + 1} de ${l.length}">${u ? `<img src="${u}" alt="" decoding="async">` : ""}${i === 3 && l.length > 4 ? `<i class="cs-pf-mais">+${l.length - 4}</i>` : ""}</button>`;
    }).join("")}</div>`;
  }
  async function baixarFotoPost(id0, col) {
    col = col || "postImgs"; const id = col === "postImgs" ? id0 : col + ":" + id0;
    if (MI.m.has(id)) return MI.m.get(id);
    if (MI.pend.has(id)) return MI.pend.get(id);
    const pr = fb.getDoc(D(col, id0)).then(d => {
      if (!d.exists()) return null; const x = d.data().d; if (!x) return null;
      const u8 = x.toUint8Array(); const tipo = u8[0] === 0x52 && u8[8] === 0x57 ? "image/webp" : "image/jpeg";
      return MI_guardar(id, new Blob([u8], { type: tipo }));
    }).catch(e => { console.warn(e); return null; }).finally(() => MI.pend.delete(id));
    MI.pend.set(id, pr); return pr;
  }
  function observarFotos() {
    const els = document.querySelectorAll(".cs-pf:not(.ok):not(.vig)"); if (!els.length) return;
    const carregar = async b => {
      const u = await baixarFotoPost(b.dataset.img + "m", b.dataset.col); if (!u || !b.isConnected) return;
      const img = new Image(); img.decoding = "async"; img.alt = ""; img.onload = () => { b.prepend(img); b.classList.add("ok"); }; img.src = u;
    };
    if (!("IntersectionObserver" in window)) { els.forEach(b => { b.classList.add("vig"); carregar(b); }); return; }
    if (!MI.obs) MI.obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { MI.obs.unobserve(e.target); carregar(e.target); } }), { rootMargin: "700px 0px" });
    els.forEach(b => { b.classList.add("vig"); MI.obs.observe(b); });
  }
  function apagarFotosPost(p) {
    if (p && p.arq && EXT.midia) EXT.midia.apagarArquivo(p.arq.id, "postArqs");
    if (!p || !p.imgs) return;
    p.imgs.forEach(m => { fb.deleteDoc(D("postImgs", m.id + "m")).catch(() => { }); if (m.f) fb.deleteDoc(D("postImgs", m.id + "f")).catch(() => { }); });
  }
  /* visualizador: arrastar para os lados troca de foto; dois toques ampliam */
  function fecharFotos() { if (!MI.el) return; MI.el.remove(); MI.el = null; document.body.classList.remove("cs-vis-on"); }
  async function verFotosPost(pid, i0) {
    const p = SO.posts.find(x => x.id === pid); if (!p || !p.imgs || !p.imgs.length) return;
    verFotos(p.imgs, i0, "postImgs");
  }
  async function verFotos(l, i0, col) {
    if (!l || !l.length) return;
    fecharFotos(); col = col || "postImgs"; const ck = id => col === "postImgs" ? id : col + ":" + id; let i = Math.max(0, Math.min(l.length - 1, i0 | 0)), z = 1, tx = 0, ty = 0;
    const el = document.createElement("div"); el.className = "cs-mfv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Fotos da publicação");
    el.innerHTML = `<div class="cs-mfv-top"><button class="cs-vbt" data-s="mf-fechar" aria-label="Fechar">${K.x}</button><b id="mfv-n"></b><button class="cs-vbt" data-s="mf-salvar" aria-label="Salvar foto">${K.baixar}</button></div>
      <div class="cs-mfv-palco" id="mfv-palco"><img id="mfv-img" alt="" draggable="false"></div>
      ${l.length > 1 ? `<div class="cs-mfv-pts">${l.map((_, k) => `<i data-k="${k}"></i>`).join("")}</div>` : ""}`;
    document.body.appendChild(el); document.body.classList.add("cs-vis-on"); MI.el = el;
    const img = el.querySelector("#mfv-img"), palco = el.querySelector("#mfv-palco");
    const aplicar = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; };
    const mostrar = async () => {
      z = 1; tx = ty = 0; aplicar(); const m = l[i], meu = i;
      el.querySelector("#mfv-n").textContent = l.length > 1 ? `${i + 1} de ${l.length}` : "";
      el.querySelectorAll(".cs-mfv-pts i").forEach((x, k) => x.classList.toggle("on", k === i));
      img.src = tinyOk(m.t) ? m.t : ""; img.classList.add("bor");
      const um = await baixarFotoPost(m.id + "m", col); if (meu !== i || !MI.el) return; if (um) { img.src = um; img.classList.remove("bor"); }
      if (m.f) {
        let b = MI.cheia.get(ck(m.id + "f"));
        if (!b) { try { const d = await fb.getDoc(D(col, m.id + "f")); if (d.exists()) { const u8 = d.data().d.toUint8Array(); b = new Blob([u8], { type: u8[0] === 0x52 && u8[8] === 0x57 ? "image/webp" : "image/jpeg" }); MI.cheia.set(ck(m.id + "f"), b); while (MI.cheia.size > 4) MI.cheia.delete(MI.cheia.keys().next().value); } } catch (e) { } }
        if (b && meu === i && MI.el) { const u = URL.createObjectURL(b); const pre = new Image(); pre.onload = () => { if (meu === i && MI.el) { const ant = img.src; img.src = u; img.dataset.cheia = u; } else URL.revokeObjectURL(u); }; pre.src = u; }
      }
    };
    MI.salvar = async () => { const m = l[i]; let b = MI.cheia.get(ck(m.id + "f")); if (!b) { const u = await baixarFotoPost(m.id + "m", col); if (u) b = await (await fetch(u)).blob(); } if (!b) return; const nome = "chatmil-foto-" + (i + 1) + (b.type === "image/webp" ? ".webp" : ".jpg"); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); toast("Foto salva."); };
    let x0 = 0, y0 = 0, ult = 0, arr = false, px = 0, py = 0;
    palco.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; px = tx; py = ty; arr = true; });
    palco.addEventListener("pointermove", e => { if (!arr || z === 1) return; tx = px + (e.clientX - x0); ty = py + (e.clientY - y0); aplicar(); });
    palco.addEventListener("pointerup", e => {
      arr = false; const dx = e.clientX - x0, dy = e.clientY - y0, agora = Date.now();
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        if (agora - ult < 300) { if (z === 1) { const r = palco.getBoundingClientRect(); z = 2.5; tx = (r.width / 2 - (e.clientX - r.left)) * 1.5; ty = (r.height / 2 - (e.clientY - r.top)) * 1.5; } else { z = 1; tx = ty = 0; } aplicar(); ult = 0; } else ult = agora;
        return;
      }
      if (z === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { const n = i + (dx < 0 ? 1 : -1); if (n >= 0 && n < l.length) { i = n; mostrar(); } }
      else if (z === 1 && dy > 110) fecharFotos();
    });
    mostrar();
  }

  function vPost(id) {
    const p = SO.posts.find(x => x.id === id);
    const cs = (SO.coments[id] || []).filter(c => !SO.bloqueados.has(c.autor));
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Publicação</b></header>
      <div class="cs-pag stack">${p ? htmlPost(p, true) : `<div class="empty"><b>Esta publicação foi apagada.</b></div>`}
      ${p ? `<h2 class="cs-sec">Comentários</h2>
      ${cs.length ? `<div class="stack">${cs.map(c => { const a = P(c.autor); const pode = c.autor === eu() || p.autor === eu();
        return `<div class="cs-com">${av(a, 36, c.autor)}<div class="cs-com-b"><b>${esc(a.nome)}${seloHtml(a)} <small class="muted">${tempoPost(c.em)}</small></b><span>${esc(c.texto)}</span></div>
          ${pode ? `<button class="cs-ico-bt sm" data-s="apagar-com" data-post="${esc(id)}" data-id="${esc(c.id)}" aria-label="Apagar comentário">${K.lixo}</button>` : `<button class="cs-ico-bt sm" data-s="denunciar" data-tipo="comentario" data-uid="${esc(c.autor)}" data-post="${esc(id)}" data-id="${esc(c.id)}" aria-label="Denunciar comentário">${K.flag}</button>`}</div>`; }).join("")}</div>`
        : `<p class="muted small">Seja o primeiro a comentar.</p>`}` : ""}</div>
      ${p ? `<form class="cs-compor" id="cs-f-com" data-id="${esc(id)}"><textarea id="cs-com-tx" class="in" rows="1" maxlength="1000" placeholder="Escreva um comentário" aria-label="Comentário">${esc(SO.rascunho["c:" + id] || "")}</textarea><button class="btn primary cs-env" aria-label="Enviar">${K.enviar}</button></form>` : ""}`;
  }
  async function comentar(id) {
    const el = $("#cs-com-tx"), t = el.value.trim(); if (!t) return;
    if (ofensivo(t)) return toast("Comentário não enviado: tem palavras ofensivas ou preconceituosas.");
    const b = fb.writeBatch(db);
    b.set(fb.doc(C(colP(id), id, "comentarios")), { autor: eu(), texto: t.slice(0, 1000), em: TS() });
    b.update(D(colP(id), id), { nComent: fb.increment(1) });
    try { await b.commit(); SO.rascunho["c:" + id] = ""; el.value = ""; } catch (e) { toast(msgErro(e)); }
  }

  /* ================= Pessoas e perfil ================= */
  let buscaT = null;
  function buscarPessoas(q) {
    SO.busca = q; clearTimeout(buscaT);
    const t = semAc(q).replace(/^@/, "").trim();
    if (!t) { SO.resultados = null; atualizarResultados(); return; }
    buscaT = setTimeout(async () => {
      try {
        const [a, b] = await Promise.all([
          fb.getDocs(fb.query(C("users"), fb.orderBy("usuario"), fb.startAt(t), fb.endAt(t + ""), fb.limit(12))),
          fb.getDocs(fb.query(C("users"), fb.orderBy("nomeBusca"), fb.startAt(t), fb.endAt(t + ""), fb.limit(12)))]);
        const m = new Map(); [...a.docs, ...b.docs].forEach(d => { if (d.id !== eu()) { const pp = pub(d.id, d.data()); m.set(d.id, pp); SO.perfis[d.id] = pp; } });
        if (SO.busca === q) { SO.resultados = [...m.values()]; atualizarResultados(); }
      } catch (e) { console.warn(e); }
    }, 300);
  }
  function htmlResultados(acao) {
    if (SO.resultados == null) {
      if (acao !== "ver-perfil") return "";
      const meus = [...SO.seguindo].filter(u => !SO.bloqueados.has(u)).map(u => ({ uid: u, ...P(u) }));
      const novos = (SO.novos || []).filter(p => p.uid !== eu() && !SO.seguindo.has(p.uid) && !SO.bloqueados.has(p.uid));
      return (meus.length ? `<h2 class="cs-sec">Seus contatos</h2><div class="cs-lista">${meus.map(p => itemPessoa(p, acao)).join("")}</div>`
        : `<p class="small muted">Você ainda não tem contatos. Busque um colega pelo nome ou @usuário e toque em Seguir.</p>`)
        + (novos.length ? `<h2 class="cs-sec">Novos no ChatMil</h2><div class="cs-lista">${novos.map(p => itemPessoa(p, acao)).join("")}</div>` : "");
    }
    if (!SO.resultados.length) return `<p class="small muted" style="padding:8px 2px">Ninguém encontrado. Confira a grafia do nome ou do @usuário.</p>`;
    return `<div class="cs-lista">${SO.resultados.filter(p => !SO.bloqueados.has(p.uid)).map(p => itemPessoa(p, acao)).join("")}</div>`;
  }
  function itemPessoa(p, acao) {
    const seg = SO.seguindo.has(p.uid);
    return `<div class="cs-item"><button type="button" class="cs-quem" data-s="${acao}" data-id="${esc(p.uid)}">${av(p, 46, p.uid)}<span class="cs-item-t"><b>${esc(p.nome)}${seloHtml(p)}</b><span>${esc(p.escola || (p.disciplinas || []).slice(0, 2).join(", ") || "Professor(a)")}</span></span></button>
      ${acao === "ver-perfil" ? `<button type="button" class="cs-ico-bt" data-s="abrir-direto" data-id="${esc(p.uid)}" aria-label="Mandar mensagem para ${esc(p.nome)}">${K.chat}</button><button type="button" class="btn sm ${seg ? "" : "primary"}" data-s="seguir" data-id="${esc(p.uid)}">${seg ? "Seguindo" : "Seguir"}</button>` : `<button type="button" class="btn sm primary" data-s="${acao}" data-id="${esc(p.uid)}">Adicionar</button>`}</div>`;
  }
  function atualizarResultados() { const el = $("#cs-res"); if (el) { const t = topo(); el.innerHTML = htmlResultados(t && t.v === "novo-grupo" ? "g-add" : t && t.v === "add-membro" ? "m-add" : "ver-perfil"); } }
  function vBuscar() {
    if (!SO.novos) { SO.novos = []; fb.getDocs(fb.query(C("users"), fb.orderBy("criadoEm", "desc"), fb.limit(15))).then(s => { SO.novos = s.docs.map(d => pub(d.id, d.data())); SO.novos.forEach(p => SO.perfis[p.uid] = p); atualizarResultados(); }).catch(() => { }); }
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Contatos</b></header>
      <div class="cs-pag stack"><label class="cs-busca grande">${K.busca}<input id="cs-p-busca" placeholder="Nome ou @usuário" autocomplete="off" autocapitalize="none" value="${esc(SO.busca)}" aria-label="Buscar pessoas"></label>
      <div id="cs-res">${htmlResultados("ver-perfil")}</div></div>`;
  }
  function vAddMembro(id) {
    const c = SO.chats.find(x => x.id === id);
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Adicionar a ${esc(c ? c.nome : "grupo")}</b></header>
      <div class="cs-pag stack"><label class="cs-busca grande">${K.busca}<input id="cs-p-busca" placeholder="Nome ou @usuário" autocomplete="off" autocapitalize="none" value="${esc(SO.busca)}"></label>
      <div id="cs-res">${htmlResultados("m-add")}</div></div>`;
  }
  async function seguir(uid, oculto) {
    const b = fb.writeBatch(db);
    if (SO.seguindo.has(uid)) { b.delete(D("users", eu(), "seguindo", uid)); b.delete(D("users", uid, "seguidores", eu())); }
    else if (oculto) b.set(D("users", eu(), "seguindo", uid), { em: TS(), oculto: true });
    else { b.set(D("users", eu(), "seguindo", uid), { em: TS() }); b.set(D("users", uid, "seguidores", eu()), { em: TS() }); }
    try { await b.commit(); delete SO.contagens[uid]; delete SO.contagens[eu()]; } catch (e) { toast(msgErro(e)); }
  }
  function contar(uid) {
    if (SO.contagens[uid]) return SO.contagens[uid];
    SO.contagens[uid] = { posts: "…", seguidores: "…" };
    Promise.all([
      fb.getCountFromServer(fb.query(C("posts"), fb.where("autor", "==", uid))).then(a => a.data().count, () => "–"),
      fb.getCountFromServer(C("users", uid, "seguidores")).then(b => b.data().count, () => null)
    ]).then(([a, b]) => { SO.contagens[uid] = { posts: a, seguidores: b }; pintar(); });
    return SO.contagens[uid];
  }
  /* seguidores / seguindo que aparecem no perfil (respeitando "esconder") */
  function numerosRede(uid, p, n) {
    const meu = uid === eu(), oculto = !meu && p.privRede;
    return {
      seguidores: oculto || n.seguidores === null ? K.lock : n.seguidores,
      seguindo: meu ? SO.seguindo.size : oculto || p.nSeguindo == null ? K.lock : p.nSeguindo
    };
  }
  function vPerfil(uid, aba) {
    const meu = uid === eu(), p = meu ? (SO.eu || {}) : P(uid), n = contar(uid), seg = SO.seguindo.has(uid);
    const posts = SO.posts.filter(x => x.autor === uid);
    return `${aba ? `<div class="cs-cab"><h1>Perfil</h1><button class="cs-ico-bt" data-s="config" aria-label="Configurações">${K.gear}</button></div>`
      : `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>${esc(p.nome)}</b>${meu ? "" : `<button class="cs-ico-bt" data-s="menu-pessoa" data-id="${esc(uid)}" aria-label="Opções">${K.mais}</button>`}</header>`}
      <div class="${aba ? "" : "cs-pag "}stack">
      <section class="card cs-perfil">
        <div class="cs-perfil-capa" style="--c:${corDe(uid)}"></div>
        <div class="cs-perfil-av">${EXT.perfilAv ? EXT.perfilAv(uid, av(p, 96, uid)) : av(p, 96, uid)}</div>
        <h1>${esc(p.nome)}${seloHtml(p)}</h1>
        ${meu ? `<span class="muted">@${esc(p.usuario || "")}</span>` : ""}
        ${p.inst ? `<span class="pill d1">${K.check} Professor(a) com e-mail institucional</span>` : ""}
        ${p.escola ? `<span class="cs-escola">${K.escola} ${esc(p.escola)}</span>` : ""}
        ${(p.disciplinas || []).length ? `<div class="chips cs-centro-chips">${p.disciplinas.map(d => `<span class="pill">${esc(d)}</span>`).join("")}</div>` : ""}
        ${p.bio ? `<p class="cs-bio">${esc(p.bio)}</p>` : ""}
        ${(() => { const r = numerosRede(uid, p, n); return `<div class="cs-nums"><div><b>${n.posts}</b><span>publicações</span></div><div><b>${r.seguidores}</b><span>seguidores</span></div><div><b>${r.seguindo}</b><span>seguindo</span></div></div>`; })()}
        ${meu ? `<div class="row cs-perfil-bt"><button class="btn" data-s="editar-perfil">${K.pen} Editar perfil</button><button class="btn" data-s="config">${K.gear} Configurações</button></div>`
          : p.removido ? "" : `<div class="row cs-perfil-bt"><button class="btn ${seg ? "" : "primary"}" data-s="seguir" data-id="${esc(uid)}">${seg ? ((SO.segOculto || new Set()).has(uid) ? K.lock + " Em segredo" : K.check + " Seguindo") : K.addUser + " Seguir"}</button><button class="btn" data-s="abrir-direto" data-id="${esc(uid)}">${K.chat} Mensagem</button></div>`}
      </section>
      ${EXT.perfilExtra ? EXT.perfilExtra(uid, meu) : ""}
      ${meu && aba ? avisoEmail() : ""}
      <h2 class="cs-sec">Publicações</h2>
      ${posts.length ? posts.map(x => htmlPost(x)).join("") : `<p class="muted small">${meu ? "Você ainda não publicou no mural." : "Nenhuma publicação ainda."}</p>`}
      </div>`;
  }
  function sheetPessoa(uid) {
    const p = P(uid), bloq = SO.bloqueados.has(uid);
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(p.nome)}</h2></div><div class="cs-menu">
      <button data-s="ver-perfil" data-id="${esc(uid)}">${K.user}<span><b>Ver perfil</b></span></button>
      ${window.CS_E2E ? `<button data-s="e2e-codigo" data-id="${esc(uid)}">${K.lock}<span><b>Código de segurança</b><small>Conferir a criptografia</small></span></button>` : ""}
      ${bloq ? "" : SO.seguindo.has(uid) ? `<button data-s="seguir" data-id="${esc(uid)}">${K.addUser}<span><b>Deixar de seguir</b></span></button>`
        : `<button data-s="seguir-oculto" data-id="${esc(uid)}">${K.lock}<span><b>Seguir em segredo</b><small>A pessoa não fica sabendo</small></span></button>`}
      <button data-s="${bloq ? "desbloquear" : "bloquear"}" data-id="${esc(uid)}" class="${bloq ? "" : "perigo"}">${K.ban}<span><b>${bloq ? "Desbloquear" : "Bloquear"}</b><small>${bloq ? "Voltar a ver mensagens e publicações" : "Esta pessoa não poderá mais mandar mensagens para você"}</small></span></button>
      <button data-s="denunciar" data-tipo="perfil" data-uid="${esc(uid)}" data-id="${esc(uid)}">${K.flag}<span><b>Denunciar perfil</b></span></button>
    </div>`);
  }
  async function bloquear(uid, sim) {
    const b = fb.writeBatch(db);
    if (sim) { b.set(D("users", eu(), "bloqueados", uid), { em: TS() }); b.delete(D("users", eu(), "seguindo", uid)); b.delete(D("users", uid, "seguidores", eu())); }
    else b.delete(D("users", eu(), "bloqueados", uid));
    try { await b.commit(); window.fecharSheet(); toast(sim ? "Pessoa bloqueada." : "Pessoa desbloqueada."); } catch (e) { toast(msgErro(e)); }
  }
  const MOTIVOS = ["Linguagem ofensiva ou preconceito", "Assédio, ameaça ou intimidação", "Conteúdo impróprio", "Golpe, spam ou perfil falso", "Outro motivo"];
  function sheetDenuncia(d) {
    SO.den = d;
    window.abrirSheet(`<div class="sheet-h"><h2>Denunciar</h2></div><p class="small muted">A denúncia é anônima para a pessoa denunciada.</p>
      <form class="stack" id="cs-f-den">${MOTIVOS.map((m, i) => `<label class="cs-radio"><input type="radio" name="motivo" value="${i}" ${i === 0 ? "checked" : ""}><span>${m}</span></label>`).join("")}
      <textarea class="in" id="cs-den-tx" rows="2" maxlength="500" placeholder="Detalhes (opcional)"></textarea>
      <button class="btn primary cs-grande">Enviar denúncia</button></form>`);
  }
  async function enviarDenuncia() {
    const i = +(document.querySelector('input[name="motivo"]:checked') || { value: 4 }).value;
    const d = SO.den || {};
    try {
      const mm = d.tipo === "mensagem" && d.chat ? (SO.msgs[d.chat] || []).find(x => x.id === d.id) : null;
      const conteudo = mm ? (mm.texto || (mm.arquivo && "[arquivo] " + mm.arquivo.nome) || (mm.fig && "[figurinha]") || "").slice(0, 2000) : "";
      await fb.addDoc(C("denuncias"), { autor: eu(), tipo: d.tipo || "", alvo: d.uid || "", id: d.id || "", chat: d.chat || "", post: d.post || "", motivo: MOTIVOS[i], detalhes: $("#cs-den-tx").value.trim().slice(0, 500), ...(conteudo ? { conteudo } : {}), em: TS() });
      window.fecharSheet(); toast("Denúncia enviada. Obrigado por ajudar a manter o ChatMil seguro.");
    } catch (e) { toast(msgErro(e)); }
  }

  /* ================= Editar perfil ================= */
  function vEditar() {
    const e = SO.ed || (SO.ed = { ...SO.eu, disciplinas: [...((SO.eu || {}).disciplinas || [])] });
    if (SO.cad.usuario !== e.usuario && !SO.edIni) { SO.cad.usuario = e.usuario; SO.edIni = true; }
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Editar perfil</b></header>
      <form class="cs-pag stack" id="cs-f-editar" novalidate>
        ${campoFoto(e.foto, e.nome)}
        <label class="f" for="cs-nome"><span>Nome completo <small class="muted">(só você vê; vai no cabeçalho das provas)</small></span><input class="in" id="cs-nome" maxlength="60" value="${esc(e.nome)}"></label>
        <label class="f" for="cs-usu">Nome de usuário<span class="cs-arroba"><span>@</span><input class="in" id="cs-usu" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(SO.cad.usuario)}"></span></label><small class="muted">É o nome que os outros veem em tudo no ChatMil.</small>
        <span id="cs-usu-ok" class="cs-ok" aria-live="polite"></span>
        <label class="f" for="cs-escola">Escola<input class="in" id="cs-escola" maxlength="100" value="${esc(e.escola || "")}"></label>
        <div class="f"><span>Disciplinas</span>${chipsDisciplinas(e.disciplinas, "ed")}</div>
        <label class="f" for="cs-bio"><span>Sobre você <small class="muted">(até 300 caracteres)</small></span><textarea class="in" id="cs-bio" maxlength="300" rows="3" placeholder="Ex.: Professora de Português há 12 anos, apaixonada por leitura.">${esc(e.bio || "")}</textarea></label>
        ${erroHtml()}
        <button class="btn primary cs-grande">Salvar</button>
      </form>`;
  }
  async function salvarEdicao() {
    const e = SO.ed; e.nome = $("#cs-nome").value.trim(); e.usuario = limparUsuario($("#cs-usu").value); e.escola = $("#cs-escola").value; e.bio = $("#cs-bio").value;
    if (e.nome.length < 3) return erro("Digite o seu nome.");
    ocupar("Salvando…");
    try { await salvarPerfil(e); SO.ocupado = false; SO.ed = null; SO.edIni = false; delete SO.contagens[eu()]; toast("Perfil atualizado."); voltar(); }
    catch (x) { erro(x.msg || msgErro(x)); }
  }
  function vEditarGrupo(id) {
    const c = SO.chats.find(x => x.id === id); if (!c) return vInfoGrupo(id);
    const g = SO.eg && SO.eg.id === id ? SO.eg : (SO.eg = { id, nome: c.nome, descricao: c.descricao || "", foto: c.foto || null });
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Editar grupo</b></header>
      <form class="cs-pag stack" id="cs-f-egrupo" novalidate>
        <div class="cs-foto-campo"><label class="cs-foto-bt" for="cs-foto-in">${g.foto ? `<img src="${esc(g.foto)}" alt="">` : `<span class="cs-foto-vazia" style="background:var(--primary)">${K.grupo}</span>`}<span class="cs-foto-cam">${K.camera}</span></label>
          <input type="file" id="cs-foto-in" accept="image/*" hidden><div class="stack" style="gap:6px"><b>Foto do grupo</b>${g.foto ? `<button type="button" class="btn ghost sm" data-s="foto-tirar" style="align-self:flex-start">Remover foto</button>` : ""}</div></div>
        <label class="f" for="cs-g-nome">Nome do grupo<input class="in" id="cs-g-nome" maxlength="60" value="${esc(g.nome)}"></label>
        <label class="f" for="cs-g-desc">Descrição<textarea class="in" id="cs-g-desc" maxlength="300" rows="3">${esc(g.descricao)}</textarea></label>
        ${erroHtml()}<button class="btn primary cs-grande">Salvar</button></form>`;
  }
  async function salvarGrupo() {
    const g = SO.eg; g.nome = $("#cs-g-nome").value.trim(); g.descricao = $("#cs-g-desc").value.trim();
    if (g.nome.length < 3) return erro("Dê um nome ao grupo.");
    if (ofensivo(g.nome + " " + g.descricao)) return erro("O nome ou a descrição têm palavras não permitidas.");
    const c = SO.chats.find(x => x.id === g.id);
    const b = fb.writeBatch(db);
    b.update(D("chats", g.id), { nome: g.nome, descricao: g.descricao, foto: g.foto || null, atualizadoEm: TS() });
    if (c && c.codigo) b.set(D("convites", c.codigo), { chatId: g.id, nome: g.nome });
    try { await b.commit(); SO.eg = null; SO.erro = ""; toast("Grupo atualizado."); voltar(); } catch (e) { erro(msgErro(e)); }
  }

  /* ================= Configurações ================= */
  function tema() { try { return localStorage.getItem("cs.tema") || "auto"; } catch (e) { return "auto"; } }
  function aplicarTema(t) {
    const r = document.documentElement;
    if (t === "claro") r.dataset.theme = "light"; else if (t === "escuro") r.dataset.theme = "dark"; else delete r.dataset.theme;
    try { localStorage.setItem("cs.tema", t); } catch (e) { }
  }
  aplicarTema(tema());
  function vConfig() {
    const u = SO.user, p = SO.eu || {}, z = typeof ZOOM !== "undefined" ? ZOOM : 1, tm = tema();
    const lin = (s, icone, t, sub, extra) => `<button data-s="${s}">${`<span class="cs-lic">${icone}</span>`}<span><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</span>${extra == null ? K.dir : extra}</button>`;
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Configurações</b></header>
      <div class="cs-pag stack cs-cfg">
        <button class="card cs-conta" data-s="editar-perfil">${av(p, 56, eu())}<span><b>${esc(p.nome)}</b><small>@${esc(p.usuario)}</small></span>${K.dir}</button>
        <h2 class="cs-sec">Conta</h2>
        <div class="cs-menu card flat">
          ${lin("editar-perfil", K.user, "Editar perfil", "Foto, nome, @usuário, escola e disciplinas")}
          ${lin("email", K.mail, "E-mail", esc(u.email), `<span class="pill ${u.emailVerified ? "d1" : ""}">${u.emailVerified ? "Confirmado" : "Opcional"}</span>`)}
          ${lin("senha", K.chave, "Alterar senha", "")}
        </div>
        <h2 class="cs-sec">Privacidade e segurança</h2>
        <div class="cs-menu card flat">
          <div class="cs-linha"><span class="cs-lic">${K.lock}</span><span><b>Quem pode me mandar mensagem</b><small>Grupos não mudam</small>
            <span class="seg cs-seg-mini"><button data-s="priv" data-v="todos" aria-pressed="${(p.privMsg || "todos") === "todos"}">Todos</button><button data-s="priv" data-v="seguindo" aria-pressed="${p.privMsg === "seguindo"}">Só quem eu sigo</button></span></span></div>
          <div class="cs-linha"><span class="cs-lic">${K.olho}</span><span><b>Mostrar quando estou online</b><small>Se desligar, você também não vê o dos outros</small>
            <span class="seg cs-seg-mini"><button data-s="priv-on" data-v="sim" aria-pressed="${p.privOnline !== false}">Sim</button><button data-s="priv-on" data-v="nao" aria-pressed="${p.privOnline === false}">Não</button></span></span></div>
          <div class="cs-linha"><span class="cs-lic">${K.check}</span><span><b>Confirmação de leitura</b><small>Os ✓✓ azuis. Se desligar, você também não vê a dos outros</small>
            <span class="seg cs-seg-mini"><button data-s="priv-lido" data-v="sim" aria-pressed="${p.privLeitura !== false}">Sim</button><button data-s="priv-lido" data-v="nao" aria-pressed="${p.privLeitura === false}">Não</button></span></span></div>
          <div class="cs-linha"><span class="cs-lic">${K.user}</span><span><b>Quem vê minha foto de perfil</b>
            <span class="seg cs-seg-mini">${[["todos", "Todos"], ["seguidores", "Seguidores"], ["ninguem", "Ninguém"]].map(([v, t]) => `<button data-s="priv-foto" data-v="${v}" aria-pressed="${((p.privFoto === "seguindo" ? "seguidores" : p.privFoto) || "todos") === v}">${t}</button>`).join("")}</span></span></div>
          <div class="cs-linha"><span class="cs-lic">${K.grupo}</span><span><b>Mostrar seguidores e quem eu sigo</b>
            <span class="seg cs-seg-mini"><button data-s="priv-rede" data-v="sim" aria-pressed="${!p.privRede}">Sim</button><button data-s="priv-rede" data-v="nao" aria-pressed="${!!p.privRede}">Esconder</button></span></span></div>
          ${EXT.configPriv.map(f => f(p)).join("")}
          ${lin("bloqueados", K.ban, "Pessoas bloqueadas", SO.bloqueados.size ? SO.bloqueados.size + (SO.bloqueados.size === 1 ? " pessoa" : " pessoas") : "Nenhuma")}
          ${lin("dicas", K.shield, "Dicas de segurança", "Como se proteger no ChatMil")}
        </div>
        <h2 class="cs-sec">Aparência</h2>
        <div class="cs-menu card flat">
          <div class="cs-linha"><span class="cs-lic">${K.texto}</span><span><b>Tamanho do texto</b>
            <span class="seg cs-seg-mini">${[[1, "Normal"], [1.1, "Grande"], [1.2, "Maior"]].map(([v, t]) => `<button data-a="zoom" data-v="${v}" aria-pressed="${z === v}">${t}</button>`).join("")}</span></span></div>
          <div class="cs-linha"><span class="cs-lic">${K.lua}</span><span><b>Tema</b>
            <span class="seg cs-seg-mini">${[["auto", "Automático"], ["claro", "Claro"], ["escuro", "Escuro"]].map(([v, t]) => `<button data-s="tema" data-v="${v}" aria-pressed="${tm === v}">${t}</button>`).join("")}</span></span></div>
        </div>
        <h2 class="cs-sec">Provas</h2>
        <div class="cs-menu card flat">${lin("dados-escola", K.escola, "Dados da escola", "Nome, logo e professor no cabeçalho das provas")}</div>
        ${EXT.configExtra.map(f => f()).join("")}
        <h2 class="cs-sec">Sobre</h2>
        <div class="cs-menu card flat">${lin("termos", K.info, "Termos de uso e privacidade", "")}</div>
        <button class="btn cs-grande" data-s="sair">${K.sair} Sair da conta</button>
        <button class="btn ghost cs-perigo" data-s="excluir">${K.lixo} Excluir minha conta</button>
        <p class="small muted cs-centro">ChatMil · sem anúncios</p>
      </div>`;
  }
  function sheetEmail(titulo) {
    const u = SO.user;
    window.abrirSheet(`<div class="sheet-h"><h2>${u.emailVerified ? "E-mail confirmado" : "Confirme o seu e-mail"}</h2></div>
      ${titulo ? `<p>${esc(titulo)}</p>` : ""}
      <p class="cs-just">${u.emailVerified ? `O e-mail <b>${esc(u.email)}</b> está confirmado.` : `Confirmar é <b>opcional</b>: você já pode usar tudo no ChatMil. Quem confirma um e-mail institucional (.gov.br ou .edu.br) ganha o selo de professor(a).</p><p class="cs-just">O link vai para <b>${esc(u.email)}</b>, enviado por <b>noreply@chatmil-56408.firebaseapp.com</b>. Pode demorar alguns minutos e cair em <b>Spam</b>, <b>Lixo eletrônico</b> ou <b>Promoções</b>. E-mails de escola às vezes bloqueiam mensagens automáticas.`}</p>
      ${u.emailVerified ? "" : `<div class="stack"><button class="btn primary cs-grande" data-s="ja-confirmei">Já confirmei</button><button class="btn" data-s="reenviar">Enviar o link de novo</button></div>`}`);
  }
  function sheetSenha() {
    window.abrirSheet(`<div class="sheet-h"><h2>Alterar senha</h2></div>
      <form class="stack" id="cs-f-senha">
        <label class="f" for="cs-s-atual">Senha atual<input class="in" id="cs-s-atual" type="password" autocomplete="current-password"></label>
        <label class="f" for="cs-s-nova">Nova senha (mínimo 8 caracteres)<input class="in" id="cs-s-nova" type="password" autocomplete="new-password" minlength="8"></label>
        <label class="f" for="cs-s-conf">Repita a nova senha<input class="in" id="cs-s-conf" type="password" autocomplete="new-password"></label>
        <div id="cs-s-erro"></div><button class="btn primary cs-grande">Salvar nova senha</button></form>`);
  }
  async function trocarSenha() {
    const a = $("#cs-s-atual").value, n = $("#cs-s-nova").value, c = $("#cs-s-conf").value, out = $("#cs-s-erro");
    const falha = m => out.innerHTML = `<div class="notice bad">${K.info}<span>${esc(m)}</span></div>`;
    if (n.length < 8) return falha("A nova senha precisa ter pelo menos 8 caracteres.");
    if (n !== c) return falha("As duas senhas novas não são iguais.");
    try { await fb.reauthenticateWithCredential(SO.user, fb.EmailAuthProvider.credential(SO.user.email, a)); await fb.updatePassword(SO.user, n); window.fecharSheet(); toast("Senha alterada."); }
    catch (e) { falha(msgErro(e)); }
  }
  function vBloqueados() {
    const l = [...SO.bloqueados];
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Pessoas bloqueadas</b></header>
      <div class="cs-pag stack">${l.length ? `<div class="cs-lista">${l.map(u => { const p = P(u); return `<div class="cs-item">${av(p, 44, u)}<span class="cs-item-t"><b>${esc(p.nome)}</b><span>${esc(p.escola || "")}</span></span><button class="btn sm" data-s="desbloquear" data-id="${esc(u)}">Desbloquear</button></div>`; }).join("")}</div>`
        : `<div class="empty"><b>Ninguém bloqueado</b><span>Quando você bloqueia alguém, a pessoa não consegue mais mandar mensagens para você.</span></div>`}</div>`;
  }
  const TXT_DICAS = `<ul class="cs-ul"><li>Nunca informe a sua senha a ninguém. A equipe do ChatMil não pede senha.</li>
    <li>Desconfie de links e pedidos de dinheiro, mesmo de colegas. Confirme por outro meio.</li>
    <li>Não publique dados pessoais de estudantes (nomes completos, fotos, laudos, notas).</li>
    <li>Use <b>Denunciar</b> para mensagens ofensivas, assédio ou golpes, e <b>Bloquear</b> para parar de receber mensagens de alguém.</li>
    <li>Em “Quem pode me mandar mensagem”, escolha “Só quem eu sigo” para mais privacidade.</li></ul>`;
  const TXT_TERMOS = `<p class="cs-just">O ChatMil é uma rede para professores, sem anúncios. Ao usar, você concorda em:</p>
    <ul class="cs-ul"><li>Tratar os colegas com respeito. Palavrões, xingamentos e qualquer forma de preconceito (racismo, LGBTfobia, capacitismo, machismo, xenofobia, intolerância religiosa) são proibidos e bloqueados automaticamente.</li>
    <li>Não publicar dados pessoais de estudantes nem conteúdo impróprio.</li>
    <li>Contas que desrespeitarem as regras podem ser suspensas.</li></ul>
    <p class="cs-just"><b>Privacidade.</b> Guardamos o seu nome, @usuário, foto, escola, disciplinas, bio, publicações e mensagens, só para o funcionamento do app. O seu e-mail não aparece para outras pessoas. Não vendemos dados. Você pode excluir a sua conta a qualquer momento em Configurações. Tratamento de dados conforme a LGPD (Lei 13.709/2018).</p>
    <p class="cs-just">As questões cadastradas no criador de provas seguem o termo de compartilhamento próprio.</p>`;
  function sheetExcluir() {
    window.abrirSheet(`<div class="sheet-h"><h2>Excluir conta</h2></div>
      <p class="cs-just">Isso apaga o seu perfil, as suas publicações e tira você dos grupos. <b>Não dá para desfazer.</b> As mensagens que você já enviou em conversas continuam visíveis para os outros participantes.</p>
      <form class="stack" id="cs-f-excluir"><label class="f" for="cs-x-senha">Digite a sua senha para confirmar<input class="in" id="cs-x-senha" type="password" autocomplete="current-password"></label>
      <div id="cs-x-erro"></div><button class="btn cs-perigo-f cs-grande">Excluir minha conta</button></form>`);
  }
  async function excluirConta() {
    const out = $("#cs-x-erro"); const falha = m => out.innerHTML = `<div class="notice bad">${K.info}<span>${esc(m)}</span></div>`;
    const u = SO.user, uid = u.uid;
    try { await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, $("#cs-x-senha").value)); }
    catch (e) { return falha(msgErro(e)); }
    out.innerHTML = `<p class="small muted">Excluindo…</p>`;
    try {
      const posts = await fb.getDocs(fb.query(C("posts"), fb.where("autor", "==", uid)));
      const postsP = await fb.getDocs(fb.query(C("postsPriv"), fb.where("autor", "==", uid))).catch(() => ({ docs: [] }));
      const seg = await fb.getDocs(C("users", uid, "seguindo"));
      const ops = [];
      for (const d of [...posts.docs, ...postsP.docs]) { const ar = d.data().arq; if (ar && EXT.midia) await EXT.midia.apagarArquivo(ar.id, "postArqs").catch(() => { }); }
      [...posts.docs, ...postsP.docs].forEach(d => { ops.push(b => b.delete(d.ref)); (d.data().imgs || []).forEach(m => { ops.push(b => b.delete(D("postImgs", m.id + "m"))); if (m.f) ops.push(b => b.delete(D("postImgs", m.id + "f"))); }); });
      seg.docs.forEach(d => { ops.push(b => b.delete(d.ref)); ops.push(b => b.delete(D("users", d.id, "seguidores", uid))); });
      for (const sub of ["leituras", "bloqueados"]) (await fb.getDocs(C("users", uid, sub))).docs.forEach(d => ops.push(b => b.delete(d.ref)));
      for (let i = 0; i < ops.length; i += 400) { const b = fb.writeBatch(db); ops.slice(i, i + 400).forEach(f => f(b)); await b.commit(); }
      for (const c of SO.chats.filter(c => c.tipo === "grupo")) {
        const adm = (c.admins || []).includes(uid), mem = (c.membros || []).filter(m => m !== uid), ad = (c.admins || []).filter(a => a !== uid);
        await fb.updateDoc(D("chats", c.id), adm ? { membros: mem, admins: ad.length ? ad : mem.slice(0, 1), atualizadoEm: TS() } : { membros: fb.arrayRemove(uid), atualizadoEm: TS() }).catch(() => { });
      }
      const b = fb.writeBatch(db);
      if (SO.eu && SO.eu.usuario) b.delete(D("usernames", SO.eu.usuario));
      b.delete(D("users", uid)); await b.commit();
      if (window.CS_CHAMADAS_SAIR) window.CS_CHAMADAS_SAIR();
      await fb.deleteUser(u);
      window.fecharSheet(); SO.tela = "boas-vindas"; toast("Sua conta foi excluída.");
    } catch (e) { falha(msgErro(e)); }
  }

  /* ================= Montagem da tela ================= */
  function vProvas() {
    const sub = [["inicio", "Assistente"], ["banco", "Banco"], ["prova", "Nova prova"], ["escola", "Escola"]];
    const extra = EXT.provasSub, ativo = SO.provSub && extra.find(x => x.k === SO.provSub);
    const v = ativo ? ativo.view() : S.tab === "banco" ? vBanco() : S.tab === "prova" ? vProva() : S.tab === "escola" ? vEscola() : vConversa();
    return `<div class="cs-cab"><h1>Provas e aulas</h1></div><div class="chips cs-sub" role="tablist">${sub.map(([k, n]) => `<button class="chip" data-tab="${k}" data-s="prov-sub" data-v="" aria-pressed="${!ativo && S.tab === k}">${n}</button>`).join("")}${extra.map(x => `<button class="chip" data-s="prov-sub" data-v="${x.k}" aria-pressed="${!!ativo && ativo.k === x.k}">${x.n}</button>`).join("")}</div>${v}`;
  }
  function vTela(t) {
    switch (t.v) {
      case "chat": return vChat(t.id);
      case "grupo": return vInfoGrupo(t.id);
      case "novo-grupo": return vNovoGrupo();
      case "editar-grupo": return vEditarGrupo(t.id);
      case "add-membro": return vAddMembro(t.id);
      case "perfil": return vPerfil(t.id, false);
      case "buscar": return vBuscar();
      case "post": return vPost(t.id);
      case "config": return vConfig();
      case "editar": return vEditar();
      case "bloqueados": return vBloqueados();
    }
    return EXT.views[t.v] ? EXT.views[t.v](t) : "";
  }
  const splash = () => `<div class="cs-splash"><div class="stack" style="align-items:center"><div class="cs-logo">${K.chat}</div><div class="spin"></div></div></div>`;
  function renderSocial() {
    const ae = document.activeElement, fid = ae && ae.id;
    let sel = null; try { if (fid && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { }
    const t = topo(), perto = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    let html, full = false, semNav = false, gate = "";
    if (SO.carregando) { html = splash(); semNav = true; }
    else if (!SO.user) { semNav = true; html = SO.tela === "criar" ? vCriar() : SO.tela === "entrar" ? vEntrar() : vBoasVindas(); }
    else if (!SO.euCarregado) { html = splash(); semNav = true; }
    else if (!SO.eu) { semNav = true; html = vPerfilInicial(); }
    else if (EXT.portao && (gate = EXT.portao())) { semNav = true; html = gate; }
    else if (t) { full = true; html = vTela(t); }
    else html = EXT.tabViews[SO.tab] ? EXT.tabViews[SO.tab]() : SO.tab === "mural" ? vMural() : SO.tab === "provas" ? vProvas() : SO.tab === "perfil" ? vPerfil(eu(), true) : vConversas();
    const b = document.body;
    b.classList.add("cs-on");
    b.classList.toggle("cs-sem-nav", semNav || full);
    b.classList.toggle("cs-chatbg", !!(full && t && t.v === "chat"));
    b.classList.toggle("cs-com-compor", !!(full && t && (t.v === "chat" || t.v === "post")));
    const nl = SO.chats.filter(naoLidas).length;
    const tabs = [["conversas", "Conversas", K.chat, nl], ["mural", "Mural", K.mural, 0], ["provas", "Provas", K.prova, 0], ["perfil", "Perfil", K.user, 0]];
    EXT.tabs.forEach(x => tabs.splice(x.pos, 0, [x.k, x.n, x.i, 0]));
    b.classList.toggle("cs-5abas", tabs.length > 4);
    $("#nav").innerHTML = semNav || full ? "" : tabs.map(([k, n, i, c]) => `<button data-st="${k}" ${SO.tab === k ? 'aria-current="page"' : ""}><span class="ico">${i}${c ? `<i class="cs-badge">${c > 99 ? "99+" : c}</i>` : ""}</span>${n}</button>`).join("");
    $("#who").innerHTML = "";
    $("#main").innerHTML = html;
    if (fid) { const el = document.getElementById(fid); if (el && el !== document.body) { try { el.focus({ preventScroll: true }); if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
    document.querySelectorAll("#cs-txt,#cs-com-tx").forEach(autosize);
    if ($("#cs-usu-ok")) atualizarChecagem();
    if (t && t.v === "chat" && perto) window.scrollTo(0, document.documentElement.scrollHeight);
    { const cAt = full && t && t.v === "chat" && SO.chats.find(c => c.id === t.id); seguroTela("chat", !!(cAt && cAt.tipo !== "grupo")); }
    observarFotos();
    EXT.depois.forEach(f => { try { f(t); } catch (e) { console.warn(e); } });
    try { document.title = nl ? `(${nl}) ChatMil` : "ChatMil"; } catch (e) { }
    return true;
  }
  function autosize(ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 140) + "px"; }
  function limparPilha() { const n = SO.pilha.length; SO.pilha = []; if (n) { try { history.go(-n); } catch (e) { } } }
  function ctxFoto() { const t = topo(); return t && t.v === "editar" ? SO.ed : t && t.v === "novo-grupo" ? SO.ng : t && t.v === "editar-grupo" ? SO.eg : SO.cad; }
  const chatAtual = () => { const t = topo(); return t && SO.chats.find(c => c.id === t.id); };

  /* ================= Segurar a mensagem abre o menu (como no WhatsApp) ================= */
  { let lpT = null, lpXY = null, lpFez = false;
    document.addEventListener("pointerdown", e => {
      const m = e.target.closest && e.target.closest(".cs-m[data-s=msg]");
      if (!m || e.target.closest("button,a,audio,video,input,textarea,[data-s]:not(.cs-m)")) return;
      lpFez = false; lpXY = [e.clientX, e.clientY]; clearTimeout(lpT);
      lpT = setTimeout(() => { lpT = null; lpFez = true; try { navigator.vibrate && navigator.vibrate(25); } catch (x) { } const t = topo(); if (t && t.v === "chat") sheetMsg(t.id, m.dataset.id); }, 480);
    });
    document.addEventListener("pointermove", e => { if (lpT && lpXY && Math.hypot(e.clientX - lpXY[0], e.clientY - lpXY[1]) > 10) { clearTimeout(lpT); lpT = null; } });
    ["pointerup", "pointercancel"].forEach(n => document.addEventListener(n, () => { clearTimeout(lpT); lpT = null; }, true));
    window.addEventListener("scroll", () => { clearTimeout(lpT); lpT = null; }, true);
    document.addEventListener("click", e => { if (lpFez) { lpFez = false; e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest(".cs-m")) e.preventDefault(); });
  }

  /* ================= Eventos ================= */
  document.addEventListener("click", async ev => {
    const st = ev.target.closest("[data-st]");
    if (st) { SO.tab = st.dataset.st; lembrarTab(); pintar(); window.scrollTo(0, 0); return; }
    const el = ev.target.closest("[data-s]"); if (!el) return;
    const s = el.dataset.s, id = el.dataset.id, v = el.dataset.v, ok = el.dataset.ok === "1";
    switch (s) {
      case "ir": SO.tela = v; SO.erro = ""; pintar(); window.scrollTo(0, 0); break;
      case "ver-senha": { const inp = el.parentElement.querySelector("input"); const ver = inp.type === "password"; inp.type = ver ? "text" : "password"; SO.cad.verSenha = ver; el.innerHTML = ver ? K.olhoX : K.olho; el.setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha"); break; }
      case "termos": window.abrirSheet(`<div class="sheet-h"><h2>Termos de uso e privacidade</h2></div>${TXT_TERMOS}<button class="btn primary" data-s="fechar">Entendi</button>`); break;
      case "dicas": window.abrirSheet(`<div class="sheet-h"><h2>Dicas de segurança</h2></div>${TXT_DICAS}<button class="btn primary" data-s="fechar">Entendi</button>`); break;
      case "fechar": window.fecharSheet(); break;
      case "link": ev.preventDefault(); abrirLink(v); break;
      case "esqueci": esqueci(); break;
      case "sair": window.fecharSheet(); limparPilha(); SO.tela = "entrar"; SO.cad = { nome: "", email: SO.user ? SO.user.email : "", senha: "", usuario: "", escola: "", disciplinas: [], foto: null, ok: null, verSenha: false }; if (window.CS_CHAMADAS_SAIR) window.CS_CHAMADAS_SAIR(); await fb.signOut(auth); break;
      case "sug": { const i = $("#cs-usu"); if (i) i.value = v; SO.cad.usuario = v; checarUsuario(); break; }
      case "disc": { const alvo = el.dataset.alvo === "ed" ? SO.ed : SO.cad; const l = alvo.disciplinas; const k = l.indexOf(v); if (k >= 0) l.splice(k, 1); else if (l.length < 8) l.push(v); el.setAttribute("aria-pressed", String(l.includes(v))); break; }
      case "foto-tirar": ctxFoto().foto = null; pintar(); break;
      case "assistente": SO.tab = "provas"; S.tab = "inicio"; lembrarTab(); pintar(); window.scrollTo(0, 0); break;
      case "abrir-chat": abrirChat(id); break;
      case "voltar": voltar(); break;
      case "novo": sheetNovo(); break;
      case "buscar-pessoas": window.fecharSheet(); SO.busca = ""; SO.resultados = null; abrirTela({ v: "buscar" }); break;
      case "novo-grupo": window.fecharSheet(); SO.ng = null; SO.busca = ""; SO.resultados = null; SO.erro = ""; abrirTela({ v: "novo-grupo" }); break;
      case "entrar-codigo": sheetEntrarCodigo(); break;
      case "entrar-grupo": entrarGrupo(id, v); break;
      case "info-grupo": abrirTela({ v: "grupo", id }); break;
      case "ver-perfil": window.fecharSheet(); abrirTela({ v: "perfil", id }); break;
      case "menu-pessoa": sheetPessoa(id); break;
      case "abrir-direto": window.fecharSheet(); abrirDireto(id); break;
      case "fig-toggle": SO.figAberta = !SO.figAberta; pintar(); if (SO.figAberta) setTimeout(() => window.scrollTo(0, document.documentElement.scrollHeight), 30); break;
      case "pacote": { SO.pacote = +v; const p = el.closest(".cs-figp"); if (p) p.outerHTML = painelFig(p.closest("#layer") ? "fig-post" : "fig-msg"); break; }
      case "fig-msg": { usarFig(v); const t = topo(); SO.figAberta = false; pintar(); if (t) enviarMsg(t.id, { fig: v }); break; }
      case "fig-post": { usarFig(v); SO.postFig = v; const o = $("#cs-post-figsel"); if (o) o.innerHTML = `<div class="cs-figsel">${figurinha(v, 96)}<button type="button" class="btn ghost sm" data-s="fig-post-tirar">Tirar figurinha</button></div>`; const d = el.closest("details"); if (d) d.open = false; break; }
      case "fig-post-tirar": SO.postFig = null; $("#cs-post-figsel").innerHTML = ""; break;
      case "msg": { const t = topo(); if (t) sheetMsg(t.id, id); break; }
      case "copiar": copiar(v); window.fecharSheet(); break;
      case "apagar-msg": {
        if (!ok) return pedirConfirmacao("Apagar mensagem?", "A mensagem será apagada para todos da conversa.", "Apagar", el);
        const chat = el.dataset.chat, lista = SO.msgs[chat] || [], ult = lista[lista.length - 1];
        const m = lista.find(x => x.id === id), bruta = ((SO.brutas[chat] || []).find(x => x.id === id)) || m || {};
        try {
          /* fica "Mensagem apagada" para todos; o conteúdo (texto, cifra, arquivo) sai do servidor */
          const mud = { apagada: true, por: eu() };
          Object.keys(bruta).forEach(k => { if (!["id", "autor", "em", "apagada", "por"].includes(k)) mud[k] = fb.deleteField(); });
          await fb.updateDoc(D("chats", chat, "msgs", id), mud);
          const arqId = m && ((m.arquivo && m.arquivo.id) || (m.audio && m.audio.id) || (m.unica && m.unica.id));
          if (arqId && m.autor === eu() && EXT.midia) EXT.midia.apagarArquivo(arqId).catch(() => { });
          if (ult && ult.id === id) await fb.updateDoc(D("chats", chat), { ultima: { autor: eu(), texto: "Mensagem apagada", fig: null } }).catch(() => { });
          window.fecharSheet(); toast("Mensagem apagada para todos.");
        } catch (e) { toast(msgErro(e)); }
        break;
      }
      case "apagar-mim": ocultar(el.dataset.chat, id); window.fecharSheet(); pintarMsgs(); toast("Mensagem apagada para você."); break;
      case "denunciar": window.fecharSheet(); sheetDenuncia({ tipo: el.dataset.tipo, uid: el.dataset.uid, id, chat: el.dataset.chat, post: el.dataset.post }); break;
      case "g-sug": { const i = $("#cs-g-nome"); if (i) i.value = v; if (SO.ng) SO.ng.nome = v; break; }
      case "g-add": if (SO.ng && !SO.ng.membros.includes(id)) SO.ng.membros.push(id); SO.busca = ""; SO.resultados = null; pintar(); break;
      case "g-tirar": if (SO.ng) SO.ng.membros = SO.ng.membros.filter(u => u !== v); pintar(); break;
      case "m-add": { const t = topo(); if (!t) break; try { await fb.updateDoc(D("chats", t.id), { membros: fb.arrayUnion(id), atualizadoEm: TS() }); toast(P(id).nome + " foi adicionado(a)."); } catch (e) { toast(msgErro(e)); } break; }
      case "membro": {
        const c = SO.chats.find(x => x.id === el.dataset.chat); if (!c) break;
        const souAdm = (c.admins || []).includes(eu()), ehAdm = (c.admins || []).includes(id), p = P(id);
        if (id === eu()) { abrirTela({ v: "perfil", id }); break; }
        window.abrirSheet(`<div class="sheet-h"><h2>${esc(p.nome)}</h2></div><div class="cs-menu">
          <button data-s="ver-perfil" data-id="${esc(id)}">${K.user}<span><b>Ver perfil</b></span></button>
          <button data-s="abrir-direto" data-id="${esc(id)}">${K.chat}<span><b>Mandar mensagem</b></span></button>
          ${souAdm ? `<button data-s="${ehAdm ? "tirar-admin" : "dar-admin"}" data-chat="${esc(c.id)}" data-id="${esc(id)}">${K.shield}<span><b>${ehAdm ? "Deixar de ser administrador" : "Tornar administrador"}</b></span></button>
          <button class="perigo" data-s="remover-membro" data-chat="${esc(c.id)}" data-id="${esc(id)}">${K.sair}<span><b>Remover do grupo</b></span></button>` : ""}</div>`);
        break;
      }
      case "dar-admin": case "tirar-admin": case "remover-membro": {
        if (s === "remover-membro" && !ok) return pedirConfirmacao("Remover do grupo?", `${esc(P(id).nome)} deixará de participar do grupo.`, "Remover", el);
        const ref = D("chats", el.dataset.chat);
        const up = s === "dar-admin" ? { admins: fb.arrayUnion(id) } : s === "tirar-admin" ? { admins: fb.arrayRemove(id) } : { membros: fb.arrayRemove(id), admins: fb.arrayRemove(id) };
        try { await fb.updateDoc(ref, { ...up, atualizadoEm: TS() }); window.fecharSheet(); } catch (e) { toast(msgErro(e)); }
        break;
      }
      case "editar-grupo": SO.eg = null; SO.erro = ""; abrirTela({ v: "editar-grupo", id }); break;
      case "add-membro": SO.busca = ""; SO.resultados = null; abrirTela({ v: "add-membro", id }); break;
      case "novo-codigo": {
        const c = SO.chats.find(x => x.id === id); if (!c) break;
        if (!ok) return pedirConfirmacao("Gerar novo código?", "O código atual deixa de funcionar. Quem já está no grupo continua.", "Gerar novo", el);
        const cod = novoCodigo(), b = fb.writeBatch(db);
        b.update(D("chats", id), { codigo: cod, atualizadoEm: TS() }); b.set(D("convites", cod), { chatId: id, nome: c.nome });
        if (c.codigo) b.delete(D("convites", c.codigo));
        try { await b.commit(); window.fecharSheet(); toast("Novo código: " + cod); } catch (e) { toast(msgErro(e)); }
        break;
      }
      case "compartilhar-grupo": { const c = SO.chats.find(x => x.id === id); if (c) compartilharGrupo(c); break; }
      case "sair-grupo": {
        const c = SO.chats.find(x => x.id === id); if (!c) break;
        if (!ok) return pedirConfirmacao("Sair do grupo?", "Você deixará de receber as mensagens deste grupo. Para voltar, vai precisar do código de convite.", "Sair do grupo", el);
        window.fecharSheet(); sairGrupo(c); break;
      }
      case "feed": SO.feed = v; pintar(); break;
      case "novo-post": sheetNovoPost(); break;
      case "mp-fotos": {
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
        inp.onchange = () => {
          const fs = [...(inp.files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name));
          const vagas = 6 - (SO.postFotos || []).length; if (fs.length > vagas) toast("Até 6 fotos por publicação.");
          fs.slice(0, Math.max(0, vagas)).forEach(f => { const prep = prepararFotoPost(f); prep.catch(() => { }); SO.postFotos.push({ url: URL.createObjectURL(f), prep }); });
          pintarFotosCompositor();
        };
        inp.click(); break;
      }
      case "mp-arq": case "mp-gravar": {
        if (!EXT.midia) break;
        const usar = f => {
          if (!f) return;
          if (f.size > 20 * 1048576) return toast("Máximo 20 MB.");
          const prep = EXT.midia.prepararArquivo(f); prep.catch(() => { });
          SO.postArq = { nome: f.name || "video.webm", prep }; pintarArqCompositor();
        };
        /* no app Android: câmera própria (CameraX) e vídeo já comprimido no aparelho */
        if (s === "mp-gravar" && EXT.midia_nativa) { const n = await EXT.midia_nativa("camera", { modo: "video", frente: true }); if (n) { usar(n[0]); break; } }
        const inp = document.createElement("input"); inp.type = "file";
        inp.accept = s === "mp-gravar" ? "video/*" : "application/pdf,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods";
        if (s === "mp-gravar") inp.setAttribute("capture", "user");
        inp.onchange = () => usar((inp.files || [])[0]);
        inp.click(); break;
      }
      case "mp-arq-tirar": SO.postArq = null; pintarArqCompositor(); break;
      case "mp-live": SO.postLive = !SO.postLive; pintarArqCompositor(); break;
      case "mp-assistir": abrirAoVivo(v); break;
      case "mp-abrir": { const p = SO.posts.find(x => x.id === el.dataset.post); if (p && p.arq && EXT.midia) EXT.midia.abrirArquivo({ ...p.arq, col: "postArqs" }); break; }
      case "mp-tirar": { const k = +v, f = (SO.postFotos || [])[k]; if (f) { URL.revokeObjectURL(f.url); SO.postFotos.splice(k, 1); pintarFotosCompositor(); } break; }
      case "mp-fig": { const d = $("#cs-mp-figs"); if (d) d.hidden = !d.hidden; break; }
      case "mp-pub": { const d = $("#cs-mp-pessoas"); if (d) d.hidden = !d.hidden; break; }
      case "mp-pubv": {
        SO.postPub = v; document.querySelectorAll('[data-s="mp-pubv"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
        const l = $("#cs-mp-lista"); if (l) l.hidden = v !== "escolher";
        const b = $("#cs-mp-pub"); if (b) b.lastElementChild.textContent = v === "escolher" ? "Pessoas marcadas" : "Todos";
        break;
      }
      case "mp-seguidos": document.querySelectorAll(".cs-mp-pp").forEach(c => { if (SO.seguindo.has(c.value)) c.checked = true; }); break;
      case "mf-ver": verFotosPost(el.dataset.post, +v); break;
      case "mf-fechar": fecharFotos(); break;
      case "mf-salvar": if (MI.salvar) MI.salvar().catch(() => toast("Não foi possível salvar.")); break;
      case "curtir": {
        const p = SO.posts.find(x => x.id === id); if (!p) break;
        const on = (p.curtidas || []).includes(eu());
        fb.updateDoc(D(colP(id), id), { curtidas: on ? fb.arrayRemove(eu()) : fb.arrayUnion(eu()) }).catch(e => toast(msgErro(e)));
        break;
      }
      case "abrir-post": ouvirComents(id); abrirTela({ v: "post", id }); break;
      case "menu-post": {
        const p = SO.posts.find(x => x.id === id); if (!p) break;
        window.abrirSheet(`<div class="sheet-h"><h2>Publicação</h2></div><div class="cs-menu">
          ${p.texto ? `<button data-s="copiar" data-v="${esc(p.texto)}">${K.copiar}<span><b>Copiar texto</b></span></button>` : ""}
          ${p.autor === eu() ? `<button class="perigo" data-s="apagar-post" data-id="${esc(id)}">${K.lixo}<span><b>Apagar publicação</b></span></button>`
            : `<button data-s="ver-perfil" data-id="${esc(p.autor)}">${K.user}<span><b>Ver perfil</b></span></button>
               <button data-s="denunciar" data-tipo="publicacao" data-uid="${esc(p.autor)}" data-id="${esc(id)}">${K.flag}<span><b>Denunciar</b></span></button>
               <button class="perigo" data-s="bloquear" data-id="${esc(p.autor)}">${K.ban}<span><b>Bloquear ${esc(P(p.autor).nome)}</b></span></button>`}</div>`);
        break;
      }
      case "apagar-post": {
        if (!ok) return pedirConfirmacao("Apagar publicação?", "A publicação e as curtidas serão apagadas.", "Apagar", el);
        try { const pp = SO.posts.find(x => x.id === id); await fb.deleteDoc(D(colP(id), id)); apagarFotosPost(pp); window.fecharSheet(); delete SO.contagens[eu()]; const t = topo(); if (t && t.v === "post") voltar(); toast("Publicação apagada."); } catch (e) { toast(msgErro(e)); }
        break;
      }
      case "apagar-com": {
        const cp = colP(el.dataset.post), b = fb.writeBatch(db); b.delete(D(cp, el.dataset.post, "comentarios", id)); b.update(D(cp, el.dataset.post), { nComent: fb.increment(-1) });
        try { await b.commit(); } catch (e) { toast(msgErro(e)); } break;
      }
      case "seguir": seguir(id); break;
      case "seguir-oculto": window.fecharSheet(); await seguir(id, true); toast("Seguindo em segredo: a pessoa não fica sabendo."); break;
      case "bloquear":
        if (!ok) return pedirConfirmacao("Bloquear " + P(id).nome + "?", "A pessoa não poderá mais mandar mensagens para você, e você deixará de ver as publicações e mensagens dela. Ela não é avisada.", "Bloquear", el);
        bloquear(id, true); break;
      case "desbloquear": bloquear(id, false); break;
      case "config": abrirTela({ v: "config" }); break;
      case "editar-perfil": SO.ed = null; SO.edIni = false; SO.erro = ""; abrirTela({ v: "editar" }); setTimeout(checarUsuario, 60); break;
      case "email": sheetEmail(); break;
      case "priv-foto": {
        const foto = (SO.eu && SO.eu.foto) || null, b = fb.writeBatch(db);
        if (v === "todos") { b.update(D("users", eu()), { foto, fotoPriv: false, privFoto: "todos" }); b.delete(D("fotos", eu())); }
        else { b.set(D("fotos", eu()), { foto, priv: v }); b.update(D("users", eu()), { foto: null, fotoPriv: !!foto, privFoto: v }); }
        SO.fotoPropria = foto;
        try { await b.commit(); toast(v === "todos" ? "Todos podem ver sua foto." : v === "seguidores" ? "Só seus seguidores veem sua foto." : "Ninguém vê sua foto."); } catch (e) { toast(msgErro(e)); }
        break;
      }
      case "aviso-mail-nao": try { localStorage.setItem("cs.avisoMail", "nao"); } catch (e) { } pintar(); break;
      case "reenviar": try { await fb.sendEmailVerification(SO.user); toast("Link enviado de novo. Veja o seu e-mail."); } catch (e) { toast(msgErro(e)); } break;
      case "ja-confirmei":
        try {
          await fb.reload(SO.user); await SO.user.getIdToken(true);
          if (SO.user.emailVerified) { window.fecharSheet(); toast("E-mail confirmado!"); if (SO.eu && inst(SO.user)) fb.updateDoc(D("users", eu()), { inst: true }).catch(() => { }); pintar(); }
          else toast("Ainda não confirmado. Toque no link que enviamos para o seu e-mail.");
        } catch (e) { toast(msgErro(e)); }
        break;
      case "senha": sheetSenha(); break;
      case "priv-on": try { const on = v === "sim"; if (!on) await fb.deleteDoc(D("presenca", eu())).catch(() => { }); await fb.updateDoc(D("users", eu()), { privOnline: on }); if (on) setTimeout(iniciarPresenca, 300); toast("Privacidade atualizada."); } catch (e) { toast(msgErro(e)); } break;
      case "priv-lido": try { await fb.updateDoc(D("users", eu()), { privLeitura: v === "sim" }); toast("Privacidade atualizada."); } catch (e) { toast(msgErro(e)); } break;
      case "priv-rede": try { await fb.updateDoc(D("users", eu()), { privRede: v === "nao" }); toast(v === "nao" ? "Seus seguidores e quem você segue ficaram escondidos." : "Seguidores e quem você segue aparecem no perfil."); } catch (e) { toast(msgErro(e)); } break;
      case "priv": try { await fb.updateDoc(D("users", eu()), { privMsg: v }); toast("Privacidade atualizada."); } catch (e) { toast(msgErro(e)); } break;
      case "bloqueados": abrirTela({ v: "bloqueados" }); break;
      case "tema": aplicarTema(v); pintar(); break;
      case "dados-escola": limparPilha(); SO.tab = "provas"; S.tab = "escola"; lembrarTab(); pintar(); break;
      case "excluir": sheetExcluir(); break;
      case "prov-sub": SO.provSub = v || null; pintar(); break;
      default: if (EXT.acoes[s]) EXT.acoes[s](el, ev);
    }
  });
  document.addEventListener("submit", ev => {
    const f = ev.target; if (!f.id || !f.id.startsWith("cs-f-")) return;
    ev.preventDefault();
    switch (f.id) {
      case "cs-f-criar": criarConta(); break;
      case "cs-f-entrar": entrar(); break;
      case "cs-f-perfil": concluirPerfil(); break;
      case "cs-f-editar": salvarEdicao(); break;
      case "cs-f-grupo": criarGrupo(); break;
      case "cs-f-egrupo": salvarGrupo(); break;
      case "cs-f-codigo": procurarCodigo(); break;
      case "cs-f-post": publicar(); break;
      case "cs-f-com": comentar(f.dataset.id); break;
      case "cs-f-senha": trocarSenha(); break;
      case "cs-f-den": enviarDenuncia(); break;
      case "cs-f-excluir": excluirConta(); break;
      case "cs-f-msg": {
        const id = f.dataset.id, ta = $("#cs-txt"), t = ta.value; if (!t.trim()) return;
        ta.value = ""; SO.rascunho[id] = ""; autosize(ta); ta.focus(); if (EXT.composerFim) f.classList.add("vazio");
        enviarMsg(id, { texto: t }).then(r => { if (r === false && !ta.value) { ta.value = t; SO.rascunho[id] = t; autosize(ta); } });
        break;
      }
    }
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing && (ev.target.id === "cs-txt" || ev.target.id === "cs-com-tx")) { ev.preventDefault(); ev.target.form.requestSubmit(); }
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches('[role="button"][data-s]')) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener("input", ev => {
    const el = ev.target, id = el.id; if (!id || !id.startsWith("cs-")) return;
    const t = topo(), ctx = t && t.v === "editar" ? SO.ed : SO.cad;
    switch (id) {
      case "cs-filtro": SO.filtroChats = el.value; buscarPessoas(el.value); pintar(); break;
      case "cs-p-busca": case "cs-g-busca": buscarPessoas(el.value); break;
      case "cs-usu": { const l = limparUsuario(el.value); if (l !== el.value) el.value = l; SO.cad.usuario = l; checarUsuario(); break; }
      case "cs-nome": if (ctx) ctx.nome = el.value; break;
      case "cs-email": SO.cad.email = el.value; break;
      case "cs-escola": if (ctx) ctx.escola = el.value; break;
      case "cs-bio": if (SO.ed) SO.ed.bio = el.value; break;
      case "cs-g-nome": { const g = t && t.v === "editar-grupo" ? SO.eg : SO.ng; if (g) g.nome = el.value; break; }
      case "cs-g-desc": { const g = t && t.v === "editar-grupo" ? SO.eg : SO.ng; if (g) g.descricao = el.value; break; }
      case "cs-txt": if (t) SO.rascunho[t.id] = el.value; autosize(el); if (EXT.composerFim && el.form) el.form.classList.toggle("vazio", !el.value.trim()); break;
      case "cs-com-tx": if (t) SO.rascunho["c:" + t.id] = el.value; autosize(el); break;
      case "cs-cod": el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); break;
    }
  });
  document.addEventListener("input", ev => {
    if (ev.target.id === "cs-mp-filtro") { const q = semAc(ev.target.value); document.querySelectorAll(".cs-mp-ll label").forEach(l => { l.hidden = !!q && !l.dataset.n.includes(q); }); }
  });
  document.addEventListener("change", async ev => {
    const el = ev.target;
    if (el.id === "cs-foto-in" && el.files && el.files[0]) {
      try { const f = await processarFoto(el.files[0]); const c = ctxFoto(); if (c) c.foto = f; pintar(); }
      catch (e) { toast("Não foi possível usar esta imagem. Tente outra foto."); }
    }
    if (el.id === "cs-soadm") { try { await fb.updateDoc(D("chats", el.dataset.id), { soAdmins: el.checked, atualizadoEm: TS() }); } catch (e) { el.checked = !el.checked; toast(msgErro(e)); } }
  });
  const voltarOrig = window.SENOV_voltar;
  window.SENOV_voltar = function () {
    if (MI.el) { fecharFotos(); return true; }
    if ($("#layer") && $("#layer").innerHTML) { window.fecharSheet(); return true; }
    if (SO.pilha.length) { voltar(); return true; }
    if (SO.user && SO.eu && SO.tab !== "conversas") { SO.tab = "conversas"; lembrarTab(); pintar(); return true; }
    if (!SO.user && SO.tela !== "boas-vindas") { SO.tela = "boas-vindas"; pintar(); return true; }
    return false;
  };
  void voltarOrig;

  /* ================= Estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
body.cs-on .topbar{display:none}
html:has(> body.cs-on){padding-top:0}
body.cs-on main{padding-top:calc(6px + env(safe-area-inset-top,0px))}
body.cs-sem-nav .nav{display:none}
body.cs-sem-nav .app{padding-left:0}
body.cs-sem-nav main{padding-bottom:40px}
body.cs-com-compor main{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px) + var(--kb,0px))}
body.cs-chatbg{background-image:radial-gradient(color-mix(in srgb,var(--primary) 11%,transparent) 1.2px,transparent 1.3px);background-size:22px 22px}
.cs-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
.cs-cab h1{font-size:1.55rem}
.cs-marca{display:flex;align-items:center;gap:10px}
.cs-ico-bt{width:46px;height:46px;border-radius:50%;border:0;background:transparent;display:grid;place-items:center;cursor:pointer;color:var(--ink);flex:none;padding:0}
.cs-ico-bt:hover{background:var(--surface-2)}
.cs-ico-bt svg{width:24px;height:24px}
.cs-ico-bt.on{color:var(--primary);background:var(--primary-soft)}
.cs-ico-bt.sm{width:38px;height:38px}.cs-ico-bt.sm svg{width:18px;height:18px}
.cs-busca{display:flex;align-items:center;gap:10px;background:var(--surface-2);border-radius:14px;padding:0 14px;min-height:50px;color:var(--muted);border:1px solid transparent}
.cs-busca:focus-within{border-color:var(--primary);background:var(--surface)}
.cs-busca svg{width:20px;height:20px;flex:none}
.cs-busca input{flex:1;min-width:0;border:0;background:transparent;min-height:48px;outline:none;font-size:1.02rem;color:var(--ink)}
.cs-busca.grande{min-height:56px}
.cs-lista{display:flex;flex-direction:column;gap:2px}
.cs-item{display:flex;align-items:center;gap:14px;padding:10px 8px;border:0;background:none;text-align:left;width:100%;border-radius:16px;cursor:pointer;color:inherit;min-height:74px}
button.cs-item:hover{background:var(--surface-2)}
.cs-item .cs-quem{flex:1}
.cs-item-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cs-item-t b{font-size:1.05rem;display:flex;align-items:center;gap:6px;min-width:0}
.cs-item-t b,.cs-item-t>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-item-t>span{color:var(--muted);font-size:.94rem;display:block}
.cs-item.nl .cs-item-t>span{color:var(--ink);font-weight:700}
.cs-item-m{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none;align-self:flex-start;padding-top:6px}
.cs-item-m small{color:var(--muted);font-size:.8rem}
.cs-item.nl .cs-item-m small{color:var(--primary);font-weight:700}
.cs-dot{width:12px;height:12px;border-radius:50%;background:var(--primary)}
.cs-av{border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-weight:700;font-family:var(--display);overflow:hidden;flex:none;letter-spacing:.02em;line-height:1}
.cs-av img{width:100%;height:100%;object-fit:cover;display:block}
.cs-av.grp svg{width:52%;height:52%}
.cs-av.bot{background:linear-gradient(135deg,var(--primary),#7C5CFF)}
.cs-av.bot svg{width:26px;height:26px}
.cs-selo{display:inline-flex;color:#1D9BF0;width:17px;height:17px;flex:none}
.cs-selo svg{width:100%;height:100%}
.nav .ico{position:relative}
.cs-badge{position:absolute;top:-3px;right:4px;min-width:20px;height:20px;border-radius:99px;background:var(--danger);color:#fff;font-size:.7rem;font-style:normal;display:grid;place-items:center;padding:0 5px;font-weight:800;border:2px solid var(--surface)}
.cs-fab{position:fixed;right:18px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:62px;height:62px;border-radius:20px;border:0;background:var(--primary);color:var(--primary-ink);display:grid;place-items:center;box-shadow:0 12px 26px color-mix(in srgb,var(--primary) 40%,transparent);cursor:pointer;z-index:26}
.cs-fab svg{width:28px;height:28px}
@media (min-width:900px){.cs-fab{bottom:28px;right:28px}}
.cs-menu{display:flex;flex-direction:column}
.cs-menu>button,.cs-menu>.cs-linha,.cs-menu>label{display:flex;align-items:center;gap:14px;padding:12px 10px;border:0;background:none;text-align:left;width:100%;cursor:pointer;color:inherit;border-radius:12px;min-height:62px;font-size:1rem}
.cs-menu>.cs-linha{cursor:default}
.cs-menu>button:hover{background:var(--surface-2)}
.cs-menu>*>span:not(.cs-lic):not(.cs-av){flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.cs-menu small{color:var(--muted);font-size:.86rem;font-weight:400}
.cs-menu>label>svg:first-child{width:24px;height:24px;color:var(--primary);flex:none}
.cs-menu>button>svg:first-child{width:24px;height:24px;color:var(--primary);flex:none}
.cs-menu>button>svg:last-child:not(:first-child){width:20px;height:20px;color:var(--muted);flex:none}
.cs-menu .perigo,.cs-menu .perigo svg{color:var(--danger)!important}
.card.flat.cs-menu{padding:4px}
.cs-lic{width:42px;height:42px;border-radius:13px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;flex:none}
.cs-lic svg{width:22px;height:22px}
.cs-sec{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-family:var(--body);font-weight:700;margin-top:8px}
.cs-seg-mini{margin-top:8px;display:flex;flex-wrap:nowrap}
.cs-seg-mini button{font-size:.86rem;min-height:40px;padding:0 6px}
.cs-sub{margin-top:-6px}
.cs-atalhos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cs-atalhos button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:16px;border:1px solid var(--line);background:var(--surface);cursor:pointer;color:var(--ink);font-weight:700;font-size:.86rem;min-height:76px;text-align:center}
.cs-atalhos button svg{width:24px;height:24px;color:var(--primary)}
.cs-atalhos button:hover{background:var(--primary-soft)}
.cs-chat-h{position:sticky;top:0;z-index:22;display:flex;align-items:center;gap:4px;margin:calc(-6px - env(safe-area-inset-top,0px)) -16px 0;padding:calc(2px + env(safe-area-inset-top,0px)) 4px 2px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);min-height:54px}
.cs-chat-h>b{flex:1;font-family:var(--display);font-size:1.18rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:4px}
.cs-chat-quem{flex:1;display:flex;align-items:center;gap:10px;border:0;background:none;text-align:left;cursor:pointer;min-width:0;color:inherit;padding:0}
.cs-chat-quem>span:not(.cs-av){display:flex;flex-direction:column;min-width:0}
.cs-chat-quem b{font-size:.98rem;line-height:1.2;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-chat-quem b .cs-selo{vertical-align:-2px;margin-left:4px}
.cs-chat-quem small{line-height:1.2}
.cs-chat-quem small{color:var(--muted);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-msgs{display:flex;flex-direction:column;padding:10px 0 12px;min-height:calc(100vh - 170px)}
.cs-dia-g{display:flex;flex-direction:column}
.cs-dia{text-align:center;margin:14px 0 6px;position:sticky;top:calc(58px + env(safe-area-inset-top,0px));z-index:3;pointer-events:none}
.cs-dia span{display:inline-block;background:var(--surface);border:1px solid var(--line);padding:4px 12px;border-radius:99px;font-size:.78rem;color:var(--muted);font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.cs-dia span::first-letter{text-transform:uppercase}
.cs-m{display:flex;flex-direction:column;align-items:flex-start;max-width:84%;margin-top:8px;cursor:pointer;align-self:flex-start}
.cs-m.seq{margin-top:2px}
.cs-m.eu{align-self:flex-end;align-items:flex-end}
.cs-b{background:var(--surface);border-radius:4px 18px 18px 18px;padding:7px 12px 6px;box-shadow:0 1px 1.5px rgba(0,0,0,.1);display:flex;flex-direction:column;min-width:84px}
.cs-m.seq .cs-b{border-radius:18px}
.cs-m.eu .cs-b{background:var(--primary);color:var(--primary-ink);border-radius:18px 4px 18px 18px}
.cs-m.eu.seq .cs-b{border-radius:18px}
.cs-tx{white-space:pre-wrap;overflow-wrap:anywhere;font-size:1.03rem;line-height:1.42}
.cs-tq{width:15px;height:10px;margin-left:3px;vertical-align:-1px;opacity:.85}
.cs-tq.lido{width:18px;color:#34B7F1;opacity:1}
.cs-m.eu .cs-tq.lido{color:#7DD8FF}
#cs-chat-sub.on{color:#16A34A;font-weight:700}
.cs-h{align-self:flex-end;font-size:.7rem;opacity:.72;margin-top:1px;font-variant-numeric:tabular-nums}
.cs-autor{font-size:.83rem;margin-bottom:1px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .cs-autor{filter:brightness(1.8) saturate(.85)}}
:root[data-theme="dark"] .cs-autor{filter:brightness(1.8) saturate(.85)}
.cs-fig{display:flex;flex-direction:column;align-items:inherit}
.cs-fig .cs-h{background:color-mix(in srgb,var(--surface) 88%,transparent);padding:1px 8px;border-radius:99px;color:var(--ink);opacity:1;margin-top:-6px}
.cs-m>.cs-autor{padding-left:6px}
.cs-compor{position:fixed;left:0;right:0;bottom:var(--kb,0px);z-index:25;display:flex;align-items:flex-end;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line)}
.cs-compor .in{flex:1;border-radius:24px;min-height:50px;max-height:140px;resize:none;padding:13px 16px;line-height:1.35;font-size:1.03rem}
.cs-env{width:50px;min-height:50px;height:50px;border-radius:50%;padding:0;flex:none}
.cs-env svg{width:22px;height:22px}
.cs-compor .cs-ico-bt{height:50px;width:50px}
.cs-aviso-comp{justify-content:center;align-items:center;color:var(--muted);font-size:.94rem;min-height:64px;gap:6px}
.cs-figp{position:fixed;left:0;right:0;bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:24;background:var(--surface);border-top:1px solid var(--line);padding:12px;max-height:48vh;overflow:auto;box-shadow:0 -10px 26px rgba(0,0,0,.1);border-radius:20px 20px 0 0}
.cs-figp .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.cs-figp .chips .chip{flex:none}
#layer .cs-figp{position:static;box-shadow:none;border:0;padding:8px 0 0;max-height:none;border-radius:0}
.cs-figgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:4px}
.cs-figgrid button{border:0;background:none;border-radius:16px;padding:4px;cursor:pointer;display:grid;place-items:center}
.cs-figgrid button:hover,.cs-figgrid button:focus-visible{background:var(--surface-2)}
.fig{display:block;overflow:visible}
.cs-vazio-chat{margin:auto;text-align:center;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px;font-weight:700}
.cs-carr{display:grid;place-items:center;padding:60px}
.cs-pag{padding-top:16px}
.cs-post{display:flex;flex-direction:column;gap:10px;padding:14px 14px 8px}
.cs-post-h{display:flex;align-items:center;gap:6px}
.cs-quem{flex:1;display:flex;align-items:center;gap:12px;border:0;background:none;text-align:left;cursor:pointer;min-width:0;color:inherit;padding:0}
.cs-quem>span:not(.cs-av){display:flex;flex-direction:column;min-width:0}
.cs-quem b{display:block;font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-quem b .cs-selo{vertical-align:-2px;margin-left:4px}
.cs-quem small{color:var(--muted);font-size:.84rem}
.cs-post-tx{white-space:pre-wrap;overflow-wrap:anywhere;font-size:1.04rem;line-height:1.55;text-align:justify;hyphens:auto}
.cs-post-tx.corte{max-height:11em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 65%,transparent);mask-image:linear-gradient(#000 65%,transparent)}
.cs-post .cs-link{align-self:flex-start}
.cs-post-fig{display:flex;justify-content:center;padding:4px 0}
.cs-post-a{display:flex;gap:4px;border-top:1px solid var(--line);padding-top:6px}
.cs-acao{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:8px 14px;border-radius:99px;cursor:pointer;color:var(--muted);font-weight:700;min-height:44px;font-size:.95rem}
.cs-acao svg{width:22px;height:22px}
.cs-acao:hover{background:var(--surface-2)}
.cs-acao.on{color:#E11D48}
.cs-acao.on svg{fill:#E11D48}
.cs-novo-post{display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;color:var(--muted);font-size:1rem;width:100%;padding:12px 14px}
.cs-lk{color:inherit;text-decoration:underline;word-break:break-all}
.cs-yt{position:relative;display:block;width:100%;max-width:300px;aspect-ratio:16/9;border:0;padding:0;margin:6px 0 2px;border-radius:10px;overflow:hidden;background:#000;cursor:pointer}
.cs-yt img{width:100%;height:100%;object-fit:cover;display:block}
.cs-yt-play{position:absolute;inset:0;margin:auto;width:54px;height:38px;border-radius:12px;background:rgba(220,38,38,.92);color:#fff;display:grid;place-items:center}
.cs-yt-play svg{width:22px;height:22px}
.cs-cfg .cs-menu small:not(.ver){display:none}
.cs-cfg .cs-menu>button,.cs-cfg .cs-menu>label,.cs-cfg .cs-menu>.cs-linha{min-height:52px;padding:8px 10px}
.cs-cfg .cs-menu b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.cs-on .btn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-novo-post>span:not(.cs-av){flex:1}.cs-novo-post>svg{width:24px;height:24px;color:var(--primary);flex:none}
.cs-pc-bar{display:flex;gap:6px;flex-wrap:wrap}.cs-pc-bar .btn{gap:6px}.cs-pc-bar .btn svg{width:18px;height:18px}
.cs-pc-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}.cs-pc-fotos:empty{display:none}
.cs-pc-f{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--surface-2)}
.cs-pc-f img{width:100%;height:100%;object-fit:cover;display:block}
.cs-pc-f button{position:absolute;top:4px;right:4px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
.cs-pc-f button svg{width:14px;height:14px}
.cs-mp-pessoas{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);border-radius:14px;padding:10px}
.cs-mp-ll{display:flex;flex-direction:column;gap:2px;max-height:260px;overflow:auto}
.cs-mp-ll .cs-aceite{display:flex;align-items:center;gap:10px;padding:6px 4px}
.cs-pc-prog{height:6px;border-radius:6px;background:var(--surface-2);overflow:hidden}.cs-pc-prog i{display:block;height:100%;width:0;background:var(--primary);transition:width .3s}
.cs-post-h small svg{width:12px;height:12px;vertical-align:-1px}
.cs-pc-a{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:12px;margin-bottom:6px}
.cs-pc-a svg{width:18px;height:18px;color:var(--primary);flex:none}.cs-pc-a span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-pc-a button{border:0;background:none;color:var(--muted);cursor:pointer;padding:2px;display:grid}.cs-pc-a button svg{color:var(--muted)}
.cs-pc-live svg{color:#E5484D}
.cs-live{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface-2);margin:8px 0 2px}
.cs-live-tag{font-weight:800;font-size:.78rem;letter-spacing:.06em;color:var(--muted)}
.cs-live.on .cs-live-tag{color:#fff;background:#E5484D;padding:3px 10px;border-radius:999px;animation:csPulso 1.6s infinite}
@keyframes csPulso{50%{opacity:.6}}
.cs-parq{margin:8px 0 2px}
.cs-parq-v{position:relative;display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;margin:8px 0 2px;background:#111 center/cover no-repeat;cursor:pointer}
.cs-parq-v i{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.75);color:#fff;font-style:normal;font-size:.76rem;font-weight:700;padding:1px 7px;border-radius:6px}
.cs-pfotos{display:grid;gap:3px;border-radius:14px;overflow:hidden;margin:8px 0 2px}
.cs-pfotos.n1{grid-template-columns:1fr}.cs-pfotos.n1 .cs-pf{aspect-ratio:var(--ar,1.33);max-height:72vh}
.cs-pfotos.n2{grid-template-columns:1fr 1fr}.cs-pfotos.n2 .cs-pf{aspect-ratio:.82}
.cs-pfotos.n3{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:1.4}.cs-pfotos.n3 .cs-pf:first-child{grid-row:1/3}
.cs-pfotos.n4{grid-template-columns:1fr 1fr}.cs-pfotos.n4 .cs-pf{aspect-ratio:1.2}
.cs-pf{position:relative;border:0;padding:0;margin:0;cursor:pointer;overflow:hidden;background:var(--surface-2) center/cover no-repeat;min-height:0;width:100%;display:block}
.cs-pf::before{content:"";position:absolute;inset:0;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:opacity .35s}
.cs-pf.ok::before{opacity:0}
.cs-pf img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:csfade .35s ease}
@keyframes csfade{from{opacity:0}to{opacity:1}}
.cs-pf-mais{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#fff;font-style:normal;font-weight:800;font-size:1.6rem;z-index:1}
.cs-mfv{position:fixed;inset:0;z-index:300;background:#000;display:flex;flex-direction:column;touch-action:none;user-select:none}
.cs-mfv-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;color:#fff;z-index:2}
.cs-mfv-top b{flex:1;text-align:center;font-size:.95rem}
.cs-mfv .cs-vbt{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer}
.cs-mfv .cs-vbt svg{width:22px;height:22px}
.cs-mfv-palco{flex:1;display:grid;place-items:center;overflow:hidden}
.cs-mfv-palco img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .2s ease,filter .3s;will-change:transform}
.cs-mfv-palco img.bor{filter:blur(14px)}
.cs-mfv-pts{display:flex;justify-content:center;gap:6px;padding:10px 0 calc(14px + env(safe-area-inset-bottom,0px))}
.cs-mfv-pts i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35)}.cs-mfv-pts i.on{background:#fff}

.cs-seg button{flex:1}
.cs-com{display:flex;gap:10px;align-items:flex-start}
.cs-com-b{flex:1;min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:4px 16px 16px 16px;padding:8px 12px;display:flex;flex-direction:column;gap:2px}
.cs-com-b b{display:flex;align-items:center;gap:5px;font-size:.92rem;flex-wrap:wrap}
.cs-com-b span{white-space:pre-wrap;overflow-wrap:anywhere}
.cs-perfil{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:0 16px 18px;overflow:hidden}
.cs-nums b svg{width:20px;height:20px;opacity:.7}
.cs-perfil-capa{height:104px;margin:0 -16px;align-self:stretch;background:radial-gradient(circle at 18% 30%,rgba(255,255,255,.22) 0 22px,transparent 23px),radial-gradient(circle at 82% 70%,rgba(255,255,255,.16) 0 34px,transparent 35px),linear-gradient(120deg,var(--c),color-mix(in srgb,var(--c) 40%,#7C5CFF))}
.cs-perfil-av{margin-top:-52px}
.cs-perfil-av .cs-av{border:4px solid var(--surface);box-sizing:content-box}
.cs-perfil h1{font-size:1.5rem;display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}
.cs-perfil .cs-selo{width:22px;height:22px}
.cs-perfil .pill svg{width:14px;height:14px}
.cs-escola{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:.94rem}
.cs-escola svg{width:18px;height:18px}
.cs-bio{max-width:52ch;line-height:1.5}
.cs-nums{display:grid;grid-template-columns:repeat(3,1fr);width:100%;max-width:400px;margin-top:8px;border-top:1px solid var(--line);padding-top:12px}
.cs-nums b{display:block;font-family:var(--display);font-size:1.35rem;font-variant-numeric:tabular-nums}
.cs-nums span{font-size:.8rem;color:var(--muted)}
.cs-perfil-bt{justify-content:center;margin-top:8px;width:100%;flex-wrap:nowrap}
.cs-perfil-bt .btn{flex:1;max-width:230px}
.cs-perfil-bt .btn svg,.cs-codigo .btn svg,.empty .btn svg,.cs-auth .btn svg,.cs-pag>.btn svg{width:20px;height:20px}
.cs-centro-chips{justify-content:center}
.cs-conta{display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;width:100%}
.cs-conta>span:not(.cs-av){flex:1;display:flex;flex-direction:column;min-width:0}
.cs-conta b{font-size:1.1rem}
.cs-conta small{color:var(--muted)}
.cs-conta>svg{width:20px;height:20px;color:var(--muted)}
.cs-ghead{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}
.cs-ghead p{max-width:52ch}
.cs-codigo{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.cs-codigo b{display:block;font-family:var(--display);font-size:1.7rem;letter-spacing:.2em}
.cs-sw{appearance:none;-webkit-appearance:none;width:52px;height:32px;background:var(--line);border-radius:99px;position:relative;cursor:pointer;flex:none;transition:background .2s;margin:0}
.cs-sw::before{content:"";position:absolute;left:3px;top:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.cs-sw:checked{background:var(--primary)}
.cs-sw:checked::before{transform:translateX(20px)}
.cs-perigo,.btn.cs-perigo{color:var(--danger)}
.cs-perigo-f{background:var(--danger);color:#fff;border-color:transparent}
.cs-chip-p{display:inline-flex;align-items:center;gap:6px;padding:4px 12px 4px 4px}
.cs-auth{max-width:440px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.cs-auth h1{font-size:2.1rem}
.cs-auth .in{min-height:56px;font-size:1.06rem}
.cs-auth label.f,.cs-pag label.f{font-size:.98rem}
.cs-grande{min-height:58px;font-size:1.1rem;border-radius:16px;width:100%}
.cs-bv{align-items:center;text-align:center;justify-content:center;min-height:calc(100vh - 80px);gap:16px}
.cs-logo{width:88px;height:88px;border-radius:28px;background:linear-gradient(135deg,var(--primary),#7C5CFF);color:#fff;display:grid;place-items:center;box-shadow:0 18px 40px color-mix(in srgb,var(--primary) 35%,transparent);flex:none}
.cs-logo svg{width:46px;height:46px}
.cs-logo.sm{width:60px;height:60px;border-radius:19px}
.cs-logo.sm svg{width:30px;height:30px}
.cs-lema{font-size:1.15rem;color:var(--muted);max-width:28ch;line-height:1.45}
.cs-auth-bt{display:flex;flex-direction:column;gap:10px;width:100%;margin-top:8px}
.cs-figs{position:relative;height:118px;width:270px}
.cs-figs span{position:absolute;animation:cs-flutua 5s ease-in-out infinite}
.cs-figs .f1{left:0;top:14px;rotate:-10deg}.cs-figs .f2{left:94px;top:0;animation-delay:-1.6s}.cs-figs .f3{right:0;top:20px;rotate:9deg;animation-delay:-3.2s}
@keyframes cs-flutua{0%,100%{translate:0 0}50%{translate:0 -8px}}
.cs-voltar-t{align-self:flex-start;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--ink);padding:0}
.cs-voltar-t svg{width:22px;height:22px}
.cs-passos{display:flex;gap:6px;max-width:160px}
.cs-passos i{height:6px;flex:1;border-radius:99px;background:var(--line)}
.cs-passos i.on{background:var(--primary)}
.cs-senha{position:relative;display:block}
.cs-senha .in{padding-right:56px}
.cs-olho{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:48px;height:48px;border:0;background:none;cursor:pointer;color:var(--muted);display:grid;place-items:center;padding:0}
.cs-olho svg{width:22px;height:22px}
.cs-aceite{display:flex;gap:12px;align-items:flex-start;font-size:.97rem;line-height:1.45;cursor:pointer}
.cs-aceite input{width:24px;height:24px;flex:none;margin-top:1px;accent-color:var(--primary)}
.cs-link{border:0;background:none;padding:0;color:var(--primary);font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-size:inherit;text-align:inherit}
.cs-centro{text-align:center}
.cs-arroba{display:flex;align-items:center;position:relative}
.cs-arroba>span{position:absolute;left:14px;color:var(--muted);font-weight:700;font-size:1.06rem;pointer-events:none}
.cs-arroba .in{padding-left:34px}
.cs-ok{font-size:.92rem;font-weight:700;min-height:1.3em;margin-top:-6px;color:var(--muted)}
.cs-ok.sim{color:var(--ok)}.cs-ok.nao{color:var(--danger)}
.cs-foto-campo{display:flex;align-items:center;gap:16px}
.cs-foto-bt{position:relative;width:96px;height:96px;border-radius:50%;cursor:pointer;flex:none;display:block}
.cs-foto-bt img,.cs-foto-vazia{width:96px;height:96px;border-radius:50%;object-fit:cover;display:grid;place-items:center;color:#fff;font-family:var(--display);font-size:2rem;font-weight:800}
.cs-foto-vazia svg{width:44px;height:44px}
.cs-foto-cam{position:absolute;right:-2px;bottom:-2px;width:38px;height:38px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center;border:3px solid var(--bg)}
.cs-foto-cam svg{width:18px;height:18px}
.cs-radio{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:14px;cursor:pointer;min-height:52px}
.cs-radio input{width:22px;height:22px;accent-color:var(--primary);flex:none;margin:0}
.cs-radio:has(input:checked){border-color:var(--primary);background:var(--primary-soft)}
.cs-det summary{cursor:pointer;display:flex;align-items:center;gap:8px;font-weight:700;color:var(--primary);list-style:none;min-height:46px}
.cs-det summary::-webkit-details-marker{display:none}
.cs-det summary svg{width:22px;height:22px}
.cs-figsel{display:flex;align-items:center;gap:12px}
.cs-ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;text-align:justify;hyphens:auto}
.cs-just{text-align:justify;hyphens:auto}
.cs-aviso-mail .btn{min-height:34px}
.cs-splash{min-height:70vh;display:grid;place-items:center}
.cs-m{-webkit-touch-callout:none}
.cs-b.cs-apagada .cs-tx{font-style:italic;color:var(--muted);display:inline-flex;align-items:center;gap:6px}
.cs-b.cs-apagada .cs-tx svg{width:15px;height:15px;flex:none}
.cs-m.eu .cs-b.cs-apagada .cs-tx{color:inherit;opacity:.85}
.cs-cod-in{font-family:var(--display);font-size:1.5rem!important;letter-spacing:.3em;text-transform:uppercase;text-align:center}
.cs-sug{margin-top:-4px}
.empty .fig{margin-bottom:-4px}
`;
  document.head.appendChild(css);

  window.SOCIAL = { render: renderSocial, ext: EXT,
    _: { SO, fb, db, D, C, TS, K, ic, esc, P, av, avGrupo, eu, pintar, abrirTela, voltar, topo, enviarMsg, ofensivo, toast, figurinha, msgErro, semAc, corDe, copiar, tituloChat, horaCurta, tempoPost, pintarMsgs, ms, dadosDe, abrirChat, abrirDireto, seloHtml, processarFoto, contatosOrdenados, contarConversa, garantirDireto, seguroTela, reduzir, abrirImagem, abrirLink, ytId, prepararFotoPost, baixarFotoPost, verFotos, MI_guardar, tinyOk, itemPessoa, seguir, pub, reabrirMsgs } };
})();
