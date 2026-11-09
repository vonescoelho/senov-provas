/* FlashPapo — recursos das conversas:
   - Localização (enviar a posição; aparece num mapinho e abre no Google Maps);
   - SOS: até 2 contatos de segurança; o NotePino (ou qualquer app) abre
       https://vonescoelho.github.io/senov-provas/?sos=1&para=@USUARIO&lat=LATITUDE&lng=LONGITUDE
     ou, direto no app Android,  flashpapo://sos?para=@USUARIO&lat=LATITUDE&lng=LONGITUDE
     e o FlashPapo manda o pedido de socorro com o mapa na conversa com esse @ (com data e hora);
   - Figurinhas próprias: foto da galeria, recorte, moldura, texto e Salvar (cada pessoa tem as suas);
   - IA grátis (chave do Gemini) nas Configurações.
   Depende de social.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, TS, ic, esc, P, av, eu, pintar, topo, toast, msgErro, enviarMsg, abrirChat, garantirDireto, abrirLink, copiar } = A;
  const $ = s => document.querySelector(s);
  const I = {
    pin: ic('<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>'),
    sos: ic('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
    mapa: ic('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    ia: ic('<path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    x: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
    img: ic('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    resp: ic('<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'),
    salvar: ic('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>')
  };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const dataHora = t => { const d = new Date(t || Date.now()); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };

  /* ================= Mapa leve (4 quadrinhos do OpenStreetMap, ponto no meio) ================= */
  function mapa(lat, lng, sos) {
    const z = 16, n = 2 ** z, xt = (lng + 180) / 360 * n, r = lat * Math.PI / 180, yt = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
    const x0 = Math.floor(xt) - (xt % 1 < 0.5 ? 1 : 0), y0 = Math.floor(yt) - (yt % 1 < 0.5 ? 1 : 0);
    const W = 240, H = 150, px = (xt - x0) * 256, py = (yt - y0) * 256, ox = Math.round(W / 2 - px), oy = Math.round(H / 2 - py);
    const t = (dx, dy) => `<img src="https://tile.openstreetmap.org/${z}/${x0 + dx}/${y0 + dy}.png" style="left:${dx * 256}px;top:${dy * 256}px" alt="" loading="lazy" referrerpolicy="no-referrer">`;
    return `<span class="cs-mapa"><span class="cs-mapa-t" style="transform:translate(${ox}px,${oy}px)">${t(0, 0)}${t(1, 0)}${t(0, 1)}${t(1, 1)}</span><i class="cs-mapa-pin ${sos ? "sos" : ""}">${I.pin}</i><small class="cs-mapa-cr">© OpenStreetMap</small></span>`;
  }
  const linkMaps = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  /* ================= Mensagens: localização / SOS e figurinha própria ================= */
  X.msgExtra = (m, o) => {
    const cls = `cs-m ${o.meu ? "eu" : ""} ${o.seq ? "seq" : ""}`;
    if (m.local) {
      const l = m.local, lat = +l.lat, lng = +l.lng; if (!isFinite(lat) || !isFinite(lng)) return "";
      return `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b cs-loc ${l.sos ? "sos" : ""}">${o.nome}
        ${l.sos ? `<div class="cs-loc-sos">${I.sos}<b>SOS</b><span>${esc(dataHora(l.em || (m.em && m.em.toMillis ? m.em.toMillis() : 0)))}</span></div>` : ""}
        <button type="button" class="cs-loc-m" data-s="loc-abrir" data-v="${lat},${lng}" aria-label="Abrir no mapa">${mapa(lat, lng, l.sos)}</button>
        <div class="cs-loc-p"><span>${I.pin}${l.sos ? "Pedido de socorro" : "Localização"}</span><span class="cs-h">${o.hr}</span></div></div></div>`;
    }
    if (m.figImg && /^data:image\/(webp|png|jpeg);base64,/.test(m.figImg)) {
      return `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0">${o.nome}<div class="cs-fig" data-s="fig-ver" data-v="${esc(m.id)}"><img class="cs-figc" src="${m.figImg}" width="128" height="128" alt="Figurinha"><span class="cs-h">${o.hr}</span></div></div>`;
    }
    return "";
  };
  X.acoes["loc-abrir"] = el => { const [lat, lng] = String(el.dataset.v).split(","); abrirLink(linkMaps(lat, lng)); };

  /* ================= Enviar localização ================= */
  function posicao() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("sem gps"));
      navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
    });
  }
  X.acoes["loc-enviar"] = async el => {
    const id = el.dataset.id; window.fecharSheet();
    toast("Pegando sua localização…");
    try {
      const c = await posicao();
      await enviarMsg(id, { local: { lat: +c.latitude.toFixed(6), lng: +c.longitude.toFixed(6), prec: Math.round(c.accuracy || 0) }, prev: "📍 Localização" });
    } catch (e) { toast(e && e.code === 1 ? "Permita a localização para enviar." : "Não deu para achar sua localização agora."); }
  };

  /* ================= SOS ================= */
  let SOS = { uids: [], usuarios: [], hist: [] }, sosCarregado = "";
  async function carregarSos() {
    if (!eu() || sosCarregado === eu()) return SOS;
    try { const s = await fb.getDoc(D("users", eu(), "privado", "sos")); SOS = s.exists() ? { uids: [], usuarios: [], hist: [], ...s.data() } : { uids: [], usuarios: [], hist: [] }; sosCarregado = eu(); } catch (e) { }
    return SOS;
  }
  async function salvarSos() { try { await fb.setDoc(D("users", eu(), "privado", "sos"), { uids: SOS.uids.slice(0, 2), usuarios: SOS.usuarios.slice(0, 2), hist: (SOS.hist || []).slice(-20) }); } catch (e) { toast(msgErro(e)); } }
  X.aoTrocarUsuario.push(u => { sosCarregado = ""; SOS = { uids: [], usuarios: [], hist: [] }; if (u) carregarSos().then(() => setTimeout(processarLinkSos, 1200)); });
  X.configPriv.push(() => `<button class="cs-linha" data-s="sos-cfg" style="display:flex;align-items:center;gap:12px;width:100%;cursor:pointer"><span class="cs-lic">${I.sos}</span><span style="flex:1;text-align:left"><b>Contatos de SOS</b></span><span class="pill">${(SOS.uids || []).length}/2</span></button>`);
  X.acoes["sos-cfg"] = async () => {
    await carregarSos();
    const pessoas = (A.contatosOrdenados ? A.contatosOrdenados() : []).filter(u => SO.seguindo && SO.seguindo.has(u));
    window.abrirSheet(`<div class="sheet-h"><h2>Contatos de SOS</h2></div>
      <div class="cs-sos-l">${pessoas.map(u => { const p = P(u); return `<label class="cs-aceite"><input type="checkbox" class="sos-pp" value="${esc(u)}" ${SOS.uids.includes(u) ? "checked" : ""}>${av(p, 32, u)}<span>${esc(p.nome)}<small> @${esc(p.usuario || "")}</small></span></label>`; }).join("") || `<p class="small muted">Siga alguém primeiro.</p>`}</div>
      <div class="row"><button class="btn primary" data-s="sos-ok" style="flex:1">Salvar</button><button class="btn" data-s="sos-link" style="flex:1">Link do NotePino</button></div>`);
    document.querySelectorAll(".sos-pp").forEach(c => c.addEventListener("change", () => { const m = [...document.querySelectorAll(".sos-pp:checked")]; if (m.length > 2) { c.checked = false; toast("Até 2 contatos."); } }));
  };
  X.acoes["sos-ok"] = async () => {
    const uids = [...document.querySelectorAll(".sos-pp:checked")].map(x => x.value).slice(0, 2);
    SOS.uids = uids; SOS.usuarios = uids.map(u => (P(u).usuario || "").toLowerCase()).filter(Boolean);
    await salvarSos(); window.fecharSheet(); toast("Salvo."); pintar();
  };
  const LINK_SOS = "https://vonescoelho.github.io/senov-provas/?sos=1&para=@USUARIO&lat=LATITUDE&lng=LONGITUDE";
  X.acoes["sos-link"] = () => copiar(LINK_SOS);

  /* link de fora: ?sos=1&para=@x&lat=..&lng=.. (site) ou flashpapo://sos?para=@x&lat=..&lng=.. (app) */
  function lerParametros(u) {
    try {
      const url = new URL(u, location.href), q = url.searchParams;
      const h = new URLSearchParams((url.hash || "").replace(/^#\/?/, "").replace(/^[^?]*\?/, ""));
      const g = k => q.get(k) || h.get(k);
      const ehSos = /^flashpapo:/i.test(u) ? /sos/i.test(url.host || url.pathname) : (g("sos") != null || /\/sos\/?$/i.test(url.pathname));
      if (!ehSos) return null;
      const para = String(g("para") || "").trim().replace(/^@/, "").toLowerCase(), lat = parseFloat(g("lat")), lng = parseFloat(g("lng") || g("lon"));
      if (!para || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { erro: true };
      return { para, lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    } catch (e) { return null; }
  }
  /* no site: tenta abrir o app instalado; se não abrir em ~1,5 s, segue na web */
  const nativo = () => { const c = window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform()); };
  let esperaApp = 0, foiProApp = false;
  function tentarApp(caminho, q) {
    if (nativo() || !/android/i.test(navigator.userAgent || "")) return false;
    try { if (new URLSearchParams(location.search).get("web")) return false; } catch (e) { }
    const volta = location.origin + location.pathname + "?" + q + "&web=1";
    esperaApp = Date.now() + 1600;
    document.addEventListener("visibilitychange", () => { if (document.hidden && Date.now() < esperaApp) foiProApp = true; });
    window.addEventListener("pagehide", () => { if (Date.now() < esperaApp) foiProApp = true; });
    try { location.href = "intent://" + caminho + "?" + q + "#Intent;scheme=flashpapo;package=br.com.senov.provas;S.browser_fallback_url=" + encodeURIComponent(volta) + ";end"; } catch (e) { esperaApp = 0; return false; }
    return true;
  }
  { const p = lerParametros(location.href); if (p) { try { sessionStorage.setItem("cs.sos.pend", JSON.stringify(p)); history.replaceState(null, "", location.pathname); } catch (e) { } if (!p.erro) tentarApp("sos", "para=" + encodeURIComponent("@" + p.para) + "&lat=" + p.lat + "&lng=" + p.lng); } }
  async function processarLinkSos() {
    if (esperaApp && Date.now() < esperaApp) { setTimeout(processarLinkSos, esperaApp - Date.now() + 50); return; }
    if (foiProApp) { try { sessionStorage.removeItem("cs.sos.pend"); } catch (e) { } return; }
    let p = null; try { p = JSON.parse(sessionStorage.getItem("cs.sos.pend") || "null"); } catch (e) { }
    if (!p || !eu()) return; try { sessionStorage.removeItem("cs.sos.pend"); } catch (e) { }
    if (p.erro) return toast("Link de SOS incompleto.");
    sosCarregado = ""; await carregarSos();
    if (!(SOS.usuarios || []).includes(p.para)) { toast("@" + p.para + " não está nos seus Contatos de SOS."); return X.acoes["sos-cfg"](); }
    try {
      const s = await fb.getDoc(D("usernames", p.para)); const uid = s.exists() ? s.data().uid : null;
      if (!uid) return toast("Não achei @" + p.para + ".");
      const chatId = await garantirDireto(uid); if (!chatId) return;
      const em = Date.now();
      const ok = await enviarMsg(chatId, { local: { lat: p.lat, lng: p.lng, sos: true, em }, prev: "🆘 SOS" });
      if (ok === false) return;
      SOS.hist = [...(SOS.hist || []), { para: p.para, lat: p.lat, lng: p.lng, em }].slice(-20); salvarSos();
      abrirChat(chatId); toast("SOS enviado para @" + p.para + ".");
    } catch (e) { console.warn(e); toast(msgErro(e)); }
  }
  /* link do QR code do perfil: ?u=usuario → abre o perfil (depois de entrar ou criar a conta) */
  try { const q = new URLSearchParams(location.search).get("u"); if (q) { const nm = q.replace(/^@/, "").toLowerCase(); sessionStorage.setItem("cs.perfil.pend", nm); history.replaceState(null, "", location.pathname); tentarApp("perfil", "u=" + encodeURIComponent(nm)); } } catch (e) { }
  function abrirPerfilPend() {
    if (esperaApp && Date.now() < esperaApp) return setTimeout(abrirPerfilPend, esperaApp - Date.now() + 50);
    let nome = ""; try { nome = sessionStorage.getItem("cs.perfil.pend") || ""; sessionStorage.removeItem("cs.perfil.pend"); } catch (e) { }
    if (!nome || foiProApp || !eu()) return;
    fb.getDoc(D("usernames", nome)).then(s => { if (s.exists()) A.abrirTela({ v: "perfil", id: s.data().uid }); }, () => { });
  }
  X.aoTrocarUsuario.push(u => {
    if (u) setTimeout(abrirPerfilPend, 1500);
  });
  window.CS_SOS = { link: u => {
    if (/^flashpapo:\/\/perfil/i.test(u)) { try { const nm = new URL(u).searchParams.get("u"); if (nm) { sessionStorage.setItem("cs.perfil.pend", nm.replace(/^@/, "").toLowerCase()); abrirPerfilPend(); } } catch (e) { } return; }
    const p = lerParametros(u); if (!p) return; try { sessionStorage.setItem("cs.sos.pend", JSON.stringify(p)); } catch (e) { } processarLinkSos(); } };

  /* ================= Papel de parede (conversas em Destaque) — fica só neste aparelho ================= */
  const FUNDOS = [
    ["f1", "linear-gradient(160deg,#fde2e4,#e2ece9 60%,#dfe7fd)"], ["f2", "linear-gradient(160deg,#c9f2e9,#b8d8f8)"],
    ["f3", "linear-gradient(160deg,#ffe8c2,#ffc8dd)"], ["f4", "linear-gradient(160deg,#e9d5ff,#c7d2fe 55%,#bae6fd)"],
    ["f5", "linear-gradient(160deg,#0f172a,#312e81)"], ["f6", "linear-gradient(160deg,#052e2b,#134e4a 60%,#1e3a8a)"],
    ["f7", "radial-gradient(circle at 20% 20%,#fef9c3 0,transparent 40%),radial-gradient(circle at 80% 70%,#fbcfe8 0,transparent 45%),#f1f5f9"],
    ["f8", "radial-gradient(circle at 25% 25%,rgba(124,58,237,.55) 0,transparent 45%),radial-gradient(circle at 75% 75%,rgba(219,39,119,.5) 0,transparent 45%),#111827"]
  ];
  const chaveFundo = () => "cs.fundos." + eu();
  const fundoDe = chatId => (lerLS(chaveFundo(), {}) || {})[chatId] || "";
  function cssFundo(v) {
    if (!v) return "";
    if (/^data:image\/(jpeg|webp|png);base64,/.test(v)) return `background:url('${v}') center/cover no-repeat`;
    const f = FUNDOS.find(x => x[0] === v); return f ? `background:${f[1]}` : "";
  }
  window.CS_FUNDO = {
    html: chatId => { const c = cssFundo(fundoDe(chatId)); return c ? `<div class="cs-fundo-chat" style="${c}"></div>` : ""; },
    tem: chatId => !!fundoDe(chatId)
  };
  function gravarFundo(chatId, v) {
    const m = lerLS(chaveFundo(), {}) || {};
    if (v) m[chatId] = v; else delete m[chatId];
    const fotos = Object.keys(m).filter(k => /^data:/.test(m[k])); if (fotos.length > 6) delete m[fotos[0]];
    try { localStorage.setItem(chaveFundo(), JSON.stringify(m)); } catch (e) { toast("Sem espaço para a foto."); return false; }
    return true;
  }
  X.acoes["fundo-cfg"] = el => {
    const id = el.dataset.id, atual = fundoDe(id);
    window.abrirSheet(`<div class="sheet-h"><h2>Papel de parede</h2></div>
      <div class="cs-fundos">${FUNDOS.map(([k, v]) => `<button data-s="fundo-ok" data-id="${esc(id)}" data-v="${k}" aria-pressed="${atual === k}" style="background:${v}" aria-label="Fundo ${k.slice(1)}"></button>`).join("")}
        <button class="cs-fundo-gal" data-s="fundo-gal" data-id="${esc(id)}" aria-label="Da galeria" aria-pressed="${/^data:/.test(atual)}" ${/^data:/.test(atual) ? `style="background:url('${atual}') center/cover"` : ""}>${/^data:/.test(atual) ? "" : I.img}</button></div>
      ${atual ? `<div class="cs-menu"><button data-s="fundo-ok" data-id="${esc(id)}" data-v="">${I.x}<span><b>Sem papel de parede</b></span></button></div>` : ""}`);
  };
  X.acoes["fundo-ok"] = el => { if (gravarFundo(el.dataset.id, el.dataset.v)) { window.fecharSheet(); pintar(); } };
  X.acoes["fundo-gal"] = el => {
    const id = el.dataset.id, inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const bm = await createImageBitmap(f), lado = 1080, esc_ = Math.min(1, lado / Math.max(bm.width, bm.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(bm.width * esc_); cv.height = Math.round(bm.height * esc_);
        const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(bm, 0, 0, cv.width, cv.height);
        let u = cv.toDataURL("image/webp", 0.72); if (!/^data:image\/webp/.test(u)) u = cv.toDataURL("image/jpeg", 0.75);
        if (gravarFundo(id, u)) { window.fecharSheet(); pintar(); }
      } catch (e) { console.warn(e); toast("Não deu para usar esta foto."); }
    };
    inp.click();
  };

  /* ================= Figurinhas próprias ================= */
  const FG = { lista: lerLS("cs.figc", []), uid: "" };
  async function carregarFigs() {
    if (!eu() || FG.uid === eu()) return; FG.uid = eu();
    try { const s = await fb.getDoc(D("users", eu(), "privado", "figurinhas")); if (s.exists()) { FG.lista = (s.data().l || []).filter(f => f && f.id && f.src); gravarLS("cs.figc", FG.lista); } } catch (e) { }
  }
  X.aoTrocarUsuario.push(u => { FG.uid = ""; if (u) carregarFigs(); else FG.lista = []; });
  async function salvarFigs() { gravarLS("cs.figc", FG.lista); try { await fb.setDoc(D("users", eu(), "privado", "figurinhas"), { l: FG.lista.slice(0, 24) }); } catch (e) { toast(msgErro(e)); } }
  window.CS_FIG = { lista: () => FG.lista };
  function fecharPainelEmoji() { SO.figAberta = false; document.body.classList.remove("cs-com-emo"); }
  X.acoes["figc-msg"] = el => { const f = FG.lista.find(x => x.id === el.dataset.v), t = topo(); if (!f || !t) return; fecharPainelEmoji(); pintar(); enviarMsg(t.id, { figImg: f.src, prev: "Figurinha" }); };
  /* tocar numa figurinha recebida: Salvar ou Responder */
  X.acoes["fig-ver"] = el => {
    const t = topo(); if (!t) return;
    const m = (SO.msgs[t.id] || []).find(x => x.id === el.dataset.v); if (!m) return;
    const img = m.figImg ? `<img src="${m.figImg}" width="180" height="180" alt="">` : A.figurinha(m.fig, 180);
    const jaTem = m.figImg && FG.lista.some(f => f.src === m.figImg);
    window.abrirSheet(`<div class="cs-fig-ver">${img}</div><div class="cs-menu">
      ${A.responder ? `<button data-s="fig-resp" data-v="${esc(m.id)}">${I.resp}<span><b>Responder</b></span></button>` : ""}
      ${m.figImg && !jaTem ? `<button data-s="fig-salvar" data-v="${esc(m.id)}">${I.salvar}<span><b>Salvar figurinha</b></span></button>` : ""}</div>`);
  };
  X.acoes["fig-resp"] = el => { const t = topo(); window.fecharSheet(); if (t && A.responder) A.responder(t.id, el.dataset.v); };
  X.acoes["fig-salvar"] = async el => {
    const t = topo(); const m = t && (SO.msgs[t.id] || []).find(x => x.id === el.dataset.v); if (!m || !m.figImg) return;
    if (FG.lista.length >= 24) { window.fecharSheet(); return toast("Até 24 figurinhas. Apague uma antes."); }
    FG.lista = [{ id: "f" + Date.now().toString(36), src: m.figImg }, ...FG.lista]; await salvarFigs(); window.fecharSheet(); toast("Figurinha salva.");
  };
  X.acoes["figc-apagar"] = async el => { FG.lista = FG.lista.filter(f => f.id !== el.dataset.v); await salvarFigs(); window.fecharSheet(); toast("Apagada."); };

  /* ---- criador: foto da galeria → recorte (arrastar e zoom) → moldura → texto → Salvar ---- */
  const ED = { img: null, x: 0, y: 0, z: 1, forma: "redondo", texto: "" };
  const FORMAS = [["redondo", "Quadrado"], ["circulo", "Círculo"], ["retangulo", "Retângulo"], ["livre", "Sem moldura"]];
  function caminho(cx, forma, S) {
    const m = S * 0.06;
    cx.beginPath();
    if (forma === "circulo") cx.arc(S / 2, S / 2, S / 2 - m, 0, Math.PI * 2);
    else if (forma === "retangulo") { const h = S * 0.66, y = (S - h) / 2; cx.roundRect ? cx.roundRect(m, y, S - 2 * m, h, S * 0.06) : cx.rect(m, y, S - 2 * m, h); }
    else if (forma === "redondo") cx.roundRect ? cx.roundRect(m, m, S - 2 * m, S - 2 * m, S * 0.16) : cx.rect(m, m, S - 2 * m, S - 2 * m);
    else cx.rect(0, 0, S, S);
  }
  function desenhar(cv, S) {
    const cx = cv.getContext("2d"); cx.clearRect(0, 0, S, S); if (!ED.img) return;
    const i = ED.img, base = S / Math.min(i.naturalWidth, i.naturalHeight), k = base * ED.z;
    const w = i.naturalWidth * k, h = i.naturalHeight * k;
    cx.save(); caminho(cx, ED.forma, S); cx.clip();
    cx.imageSmoothingQuality = "high"; cx.drawImage(i, S / 2 - w / 2 + ED.x * S, S / 2 - h / 2 + ED.y * S, w, h); cx.restore();
    if (ED.forma !== "livre") { cx.save(); caminho(cx, ED.forma, S); cx.lineWidth = S * 0.035; cx.strokeStyle = "#fff"; cx.shadowColor = "rgba(0,0,0,.25)"; cx.shadowBlur = S * 0.02; cx.stroke(); cx.restore(); }
    const t = ED.texto.trim();
    if (t) {
      let tam = S * 0.13; cx.font = `800 ${tam}px Outfit, Inter, system-ui, sans-serif`;
      while (cx.measureText(t).width > S * 0.84 && tam > S * 0.06) { tam -= 2; cx.font = `800 ${tam}px Outfit, Inter, system-ui, sans-serif`; }
      cx.textAlign = "center"; cx.textBaseline = "alphabetic"; cx.lineJoin = "round";
      const y = ED.forma === "retangulo" ? S * 0.78 : S * 0.86;
      cx.lineWidth = tam * 0.22; cx.strokeStyle = "#111"; cx.strokeText(t, S / 2, y); cx.fillStyle = "#fff"; cx.fillText(t, S / 2, y);
    }
  }
  function redesenhar() { const cv = $("#fge-cv"); if (cv) desenhar(cv, cv.width); }
  async function escolherFoto() {
    return new Promise(res => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.style.display = "none"; document.body.appendChild(inp);
      inp.onchange = () => { res(inp.files[0] || null); inp.remove(); }; inp.click();
    });
  }
  X.acoes["figc-criar"] = async () => {
    const f = await escolherFoto(); if (!f) return;
    const url = URL.createObjectURL(f);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }).catch(() => null);
    if (!img) return toast("Não deu para abrir esta foto.");
    Object.assign(ED, { img, url, x: 0, y: 0, z: 1, forma: "redondo", texto: "" });
    const el = document.createElement("div"); el.className = "cs-fge"; el.id = "cs-fge"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Criar figurinha");
    el.innerHTML = `<div class="cs-fge-top"><button class="cs-ico-bt" data-s="fge-fechar" aria-label="Fechar">${I.x}</button><b>Figurinha</b><button class="btn primary sm" data-s="fge-salvar">Salvar</button></div>
      <div class="cs-fge-palco"><canvas id="fge-cv" width="600" height="600"></canvas></div>
      <input type="range" id="fge-z" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
      <div class="cs-fge-formas" role="radiogroup">${FORMAS.map(([k, n]) => `<button data-s="fge-forma" data-v="${k}" aria-pressed="${k === ED.forma}" class="fge-${k}"><i></i><span>${n}</span></button>`).join("")}</div>
      <input class="in" id="fge-tx" maxlength="24" placeholder="Texto" autocomplete="off">`;
    document.body.appendChild(el); document.body.classList.add("cs-fge-on");
    redesenhar();
    const cv = el.querySelector("#fge-cv");
    let arr = null;
    cv.addEventListener("pointerdown", e => { arr = { x: e.clientX, y: e.clientY, ox: ED.x, oy: ED.y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => { if (!arr) return; const r = cv.getBoundingClientRect(); ED.x = arr.ox + (e.clientX - arr.x) / r.width; ED.y = arr.oy + (e.clientY - arr.y) / r.height; redesenhar(); });
    ["pointerup", "pointercancel"].forEach(n => cv.addEventListener(n, () => { arr = null; }));
    el.querySelector("#fge-z").addEventListener("input", e => { ED.z = +e.target.value; redesenhar(); });
    el.querySelector("#fge-tx").addEventListener("input", e => { ED.texto = e.target.value; redesenhar(); });
  };
  function fecharEditor() { const el = $("#cs-fge"); if (el) el.remove(); document.body.classList.remove("cs-fge-on"); if (ED.url) URL.revokeObjectURL(ED.url); ED.img = null; }
  X.acoes["fge-fechar"] = fecharEditor;
  X.acoes["fge-forma"] = el => { ED.forma = el.dataset.v; document.querySelectorAll("[data-s=fge-forma]").forEach(b => b.setAttribute("aria-pressed", String(b === el))); redesenhar(); };
  X.acoes["fge-salvar"] = async () => {
    if (!ED.img) return;
    if (FG.lista.length >= 24) return toast("Até 24 figurinhas. Apague uma antes.");
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; desenhar(cv, 256);
    let src = cv.toDataURL("image/webp", 0.82); if (!/^data:image\/webp/.test(src)) src = cv.toDataURL("image/png");
    FG.lista = [{ id: "f" + Date.now().toString(36), src }, ...FG.lista];
    await salvarFigs(); fecharEditor(); toast("Figurinha salva.");
    const c = $("#cs-emo-corpo"); if (c && X.painelEmojiGrade) c.innerHTML = X.painelEmojiGrade();
  };
  /* segurar uma figurinha própria no painel: apagar */
  X.acoes["figc-menu"] = el => window.abrirSheet(`<div class="cs-fig-ver"><img src="${(FG.lista.find(f => f.id === el.dataset.v) || {}).src || ""}" width="140" height="140" alt=""></div><div class="cs-menu"><button class="perigo" data-s="figc-apagar" data-v="${esc(el.dataset.v)}">${I.x}<span><b>Apagar figurinha</b></span></button></div>`);

  /* ================= IA grátis (chave do Gemini) — fácil de achar nas Configurações ================= */
  const chaveIA = () => { try { return (JSON.parse(localStorage.getItem("senov.ia") || "null") || {}).gemini || ""; } catch (e) { return ""; } };
  X.configExtra.push(() => `<h2 class="cs-sec">Inteligência artificial</h2><div class="cs-menu card flat"><button data-s="ia-chave"><span class="cs-lic">${I.ia}</span><span><b>IA grátis (Gemini)</b></span><span class="pill ${chaveIA() || window.CS_IA_GEMINI ? "d1" : ""}">${chaveIA() || window.CS_IA_GEMINI ? "Ligada" : "Desligada"}</span></button></div>`);
  X.acoes["ia-chave"] = () => window.abrirSheet(`<div class="sheet-h cs-ia-h"><h2>IA grátis (Gemini)</h2><button type="button" class="cs-ajuda" data-s="ia-criar" aria-label="Como conseguir a chave">?</button></div>
    <form class="stack" id="ia-chave-f"><input class="in" id="ia-chave-in" type="password" autocomplete="off" placeholder="${chaveIA() ? "Chave salva · cole outra para trocar" : "Cole a chave (AIza…)"}">
    <button class="btn primary">Salvar</button>
    ${chaveIA() ? `<button type="button" class="btn ghost" data-s="ia-tirar">Remover</button>` : ""}</form>`);
  X.acoes["ia-criar"] = () => abrirLink("https://aistudio.google.com/apikey");
  X.acoes["ia-tirar"] = () => { try { const c = JSON.parse(localStorage.getItem("senov.ia") || "null") || {}; delete c.gemini; localStorage.setItem("senov.ia", JSON.stringify(c)); } catch (e) { } window.fecharSheet(); toast("Removida."); pintar(); };
  document.addEventListener("submit", async e => {
    if (e.target.id !== "ia-chave-f") return; e.preventDefault();
    const k = $("#ia-chave-in").value.trim(); if (!/^AIza[0-9A-Za-z_\-]{30,}$/.test(k)) return toast("A chave começa com AIza.");
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=" + encodeURIComponent(k));
      if (!r.ok) return toast("O Google recusou esta chave.");
      let c = {}; try { c = JSON.parse(localStorage.getItem("senov.ia") || "null") || {}; } catch (er) { }
      c.gemini = k; localStorage.setItem("senov.ia", JSON.stringify(c));
      window.fecharSheet(); toast("IA ligada."); pintar();
    } catch (er) { toast("Sem internet agora."); }
  });

  const css = document.createElement("style");
  css.textContent = `
.cs-loc{padding:4px!important;width:248px;max-width:72vw}
.cs-loc-m{display:block;border:0;padding:0;background:none;cursor:pointer;width:100%}
.cs-mapa{display:block;position:relative;width:100%;height:150px;border-radius:12px;overflow:hidden;background:#dfe6ee}
.cs-mapa-t{position:absolute;left:0;top:0;width:512px;height:512px}
.cs-mapa-t img{position:absolute;width:256px;height:256px;max-width:none}
.cs-mapa-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-92%);color:#B026FF;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
.cs-mapa-pin svg{width:34px;height:34px;fill:currentColor;stroke:#fff;stroke-width:1.5}
.cs-mapa-pin.sos{color:#E5484D}
.cs-mapa-cr{position:absolute;right:4px;bottom:2px;font-size:.6rem;background:rgba(255,255,255,.75);color:#333;padding:0 4px;border-radius:4px}
.cs-loc-p{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 6px 2px;font-size:.85rem;font-weight:600}
.cs-loc-p>span:first-child{display:flex;align-items:center;gap:4px;white-space:nowrap}.cs-loc-p svg{width:15px;height:15px}
.cs-loc .cs-h{position:static!important}
.cs-loc-sos{display:flex;align-items:center;gap:6px;margin:2px 4px 6px;padding:6px 10px;border-radius:10px;background:#E5484D;color:#fff;font-size:.85rem}
.cs-loc-sos b{font-size:.95rem;letter-spacing:.06em}.cs-loc-sos span{margin-left:auto;opacity:.9;white-space:nowrap}.cs-loc-sos svg{width:18px;height:18px}
.cs-figc{display:block;width:128px;height:128px;object-fit:contain}
.cs-ia-h{display:flex;align-items:center;gap:8px}.cs-ajuda{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line);background:none;color:var(--muted);font:700 .8rem/1 inherit;cursor:pointer;display:grid;place-items:center;padding:0}
.cs-fundo-chat{position:fixed;inset:0;z-index:0;pointer-events:none}
body.cs-chatbg .cs-msgs{position:relative;z-index:1}
.cs-fundos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:4px 2px 12px}
.cs-fundos button{aspect-ratio:9/14;border-radius:16px;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.cs-fundos button[aria-pressed=true]{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 25%,transparent)}
.cs-fundo-gal{display:grid;place-items:center;background:var(--surface-2,rgba(127,127,127,.12));color:var(--muted)}.cs-fundo-gal svg{width:28px;height:28px}
.cs-fig-ver{display:grid;place-items:center;padding:6px 0}.cs-fig-ver img,.cs-fig-ver svg{width:160px;height:160px}
.cs-sos-l{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.cs-sos-l small{color:var(--muted)}
.cs-emo-mais{font-size:2rem;font-weight:300;color:var(--primary);border:2px dashed var(--line)!important;border-radius:16px!important;display:grid;place-items:center}
.cs-fge{position:fixed;inset:0;z-index:140;background:var(--bg);display:flex;flex-direction:column;gap:12px;padding:calc(8px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px))}
.cs-fge-top{display:flex;align-items:center;gap:10px}.cs-fge-top b{flex:1;font-size:1.05rem}
.cs-fge-palco{align-self:center;width:min(86vw,360px);aspect-ratio:1;border-radius:18px;background:repeating-conic-gradient(var(--line) 0 25%,transparent 0 50%) 0 0/24px 24px;touch-action:none}
.cs-fge-palco canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
#fge-z{width:min(86vw,360px);align-self:center;accent-color:var(--primary)}
.cs-fge-formas{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.cs-fge-formas button{display:flex;flex-direction:column;align-items:center;gap:4px;border:1.5px solid var(--line);background:var(--surface);color:inherit;border-radius:14px;padding:8px 10px;font:inherit;font-size:.78rem;cursor:pointer;min-width:72px}
.cs-fge-formas button[aria-pressed=true]{border-color:var(--primary);color:var(--primary)}
.cs-fge-formas i{width:26px;height:26px;border:2.5px solid currentColor;border-radius:7px}
.fge-circulo i{border-radius:50%!important}.fge-retangulo i{height:17px!important;margin:4.5px 0}.fge-livre i{border-style:dashed!important;border-radius:2px!important}
#fge-tx{align-self:center;width:min(86vw,360px)}
body.cs-fge-on{overflow:hidden}`;
  document.head.appendChild(css);
})();
