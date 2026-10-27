/* ChatMil — Conexões (só para maiores de 18 com idade confirmada): pessoas da região em cartões
   (pular / seguir / dizer oi), quem frequenta a mesma região nos mesmos dias da semana, alcance das
   publicações e distância aproximada na lista de Amigos. Depende de social.js.
   Privacidade: a posição é arredondada (~2 km); os lugares frequentes são células de ~5 km
   guardadas só como código embaralhado (hash) por dia da semana — ninguém vê o lugar. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, K, ic, esc, P, av, eu, pintar, abrirTela, voltar, topo, toast, msgErro, semAc, seloHtml, corDe } = A;
  const $ = s => document.querySelector(s);
  const I = {
    pin: ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    coracao: ic('<path d="M12 20s-7.5-4.6-9.3-9.2A5 5 0 0 1 12 6a5 5 0 0 1 9.3 4.8C19.5 15.4 12 20 12 20z"/>'),
    oi: ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    filtro: ic('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    alvo: ic('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    gente: ic('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>'),
    voltar: ic('<path d="M15 18l-6-6 6-6"/>'),
    estrela: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>')
  };
  const ALCANCES = [5, 10, 20, 50, 100, 300, 600, 0];
  const INTERESSES = ["Música", "Dança", "Humor e memes", "Animes", "Games", "Filmes e séries", "Fotografia", "Vídeos", "Moda", "Beleza", "Esportes", "Academia",
    "Viagens", "Culinária", "Natureza", "Pets", "Tecnologia", "Leitura", "Arte", "Teatro", "Fé", "Voluntariado", "Educação", "Concursos", "Libras", "Inclusão"];
  const adulto = () => !!(A.ehAdulto && A.ehAdulto());
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const ST = { lista: null, chave: "", em: 0, carregando: false, erro: "", idx: 0, so: false, cidades: null, ouvPerto: null, chPerto: "", buscaCid: "" };

  /* ---------- geohash e distância ---------- */
  const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  function gh(la, lo, n) {
    const a = [-90, 90], b = [-180, 180]; let h = "", bit = 0, ch = 0, ev = true;
    while (h.length < n) {
      const r = ev ? b : a, v = ev ? lo : la, m = (r[0] + r[1]) / 2;
      if (v >= m) { ch = ch * 2 + 1; r[0] = m; } else { ch = ch * 2; r[1] = m; }
      ev = !ev; if (++bit === 5) { h += B32[ch]; bit = 0; ch = 0; }
    }
    return h;
  }
  function celulas(la, lo, n) {
    const bits = 5 * n, dLo = 360 / 2 ** Math.ceil(bits / 2), dLa = 180 / 2 ** Math.floor(bits / 2), s = new Set();
    for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) {
      const a = Math.max(-89.999, Math.min(89.999, la + i * dLa)); let o = lo + j * dLo; if (o > 180) o -= 360; if (o < -180) o += 360;
      s.add(gh(a, o, n));
    }
    return [...s];
  }
  /* precisão do geohash que cobre o raio com 3×3 células */
  const precisao = km => !km ? 0 : km <= 19 ? 4 : km <= 150 ? 3 : km <= 600 ? 2 : 0;
  function km(a, b) {
    if (!a || !b || a.la == null || b.la == null) return null;
    const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.la - a.la), dLo = r(b.lo - a.lo);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.la)) * Math.cos(r(b.la)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  /* distância aproximada, nunca exata */
  const fmtKm = d => d == null ? "" : d < 3 ? "bem perto" : d < 100 ? "a uns " + Math.max(5, Math.round(d / 5) * 5) + " km" : "a uns " + (Math.round(d / 50) * 50) + " km";
  const meuLoc = () => (SO.eu && SO.eu.loc && SO.eu.loc.la != null) ? SO.eu.loc : null;
  const alcance = () => { const v = lerLS("cs.alc." + eu(), 50); return ALCANCES.includes(v) ? v : 50; };
  const nomeAlc = v => v ? "até " + v + " km" : "sem limite";
  const pulados = () => { const m = lerLS("cs.pul." + eu(), {}), lim = Date.now() - 14 * 864e5; for (const k in m) if (m[k] < lim) delete m[k]; return m; };

  /* ---------- localização (aproximada) ---------- */
  const arred = v => Math.round(v * 50) / 50; // ~2 km
  async function nomeCidade(la, lo) {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=pt-BR&lat=${la}&lon=${lo}`);
    const j = await r.json(), a = j.address || {};
    const cid = a.city || a.town || a.municipality || a.village || a.county || "";
    const uf = (a["ISO3166-2-lvl4"] || "").replace(/^BR-/, "");
    return cid ? cid + (uf ? ", " + uf : "") : "";
  }
  async function salvarLocal(la, lo, cid) {
    la = arred(la); lo = arred(lo);
    if (!cid) cid = await nomeCidade(la, lo).catch(() => "");
    const loc = { la, lo, g2: gh(la, lo, 2), g3: gh(la, lo, 3), g4: gh(la, lo, 4), cid: String(cid || "").slice(0, 80), em: TS() };
    const extra = (SO.eu && SO.eu.perto === false) ? {} : { perto: true };
    await fb.updateDoc(D("users", eu()), { loc, ...extra });
    if (SO.eu) Object.assign(SO.eu, { loc: { ...loc, em: new Date() }, ...extra });
    ST.lista = null; ST.chave = "";
    return loc;
  }
  function pegarGPS() {
    return new Promise((ok, no) => {
      if (!navigator.geolocation) return no({ msg: "Este aparelho não informa a localização. Digite a cidade." });
      navigator.geolocation.getCurrentPosition(p => ok(p.coords), e => no({ msg: e && e.code === 1 ? "Localização não permitida. Digite a cidade ou permita nas configurações do celular." : "Não deu para achar a localização agora. Digite a cidade." }),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 6 * 3600e3 });
    });
  }
  async function usarGPS(bt) {
    if (bt) { bt.disabled = true; bt.textContent = "Localizando…"; }
    try { const c = await pegarGPS(); const l = await salvarLocal(c.latitude, c.longitude); toast(l.cid ? "Local: " + l.cid : "Localização salva."); window.fecharSheet(); pintar(); }
    catch (e) { toast(e && e.msg ? e.msg : msgErro(e)); if (bt) { bt.disabled = false; bt.textContent = "Usar minha localização"; } }
  }
  function sheetCidade() {
    ST.cidades = null; ST.buscaCid = "";
    window.abrirSheet(`<div class="sheet-h"><h2>Sua cidade</h2></div>
      <form class="stack" id="pt-cid-f"><input class="in" id="pt-cid" placeholder="Ex.: Quixadá, CE" autocomplete="off" aria-label="Cidade">
      <button class="btn primary">Buscar</button></form><div id="pt-cid-r" class="cs-menu"></div>`);
    setTimeout(() => { const i = $("#pt-cid"); if (i) i.focus(); }, 60);
  }
  async function buscarCidade(q) {
    const el = $("#pt-cid-r"); if (!el) return;
    el.innerHTML = `<p class="small muted" style="padding:8px">Buscando…</p>`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&addressdetails=1&accept-language=pt-BR&q=${encodeURIComponent(q)}`);
      const l = (await r.json()).filter(x => x.lat && x.lon);
      ST.cidades = l.map(x => { const a = x.address || {}, uf = (a["ISO3166-2-lvl4"] || "").replace(/^BR-/, ""); const n = a.city || a.town || a.municipality || a.village || x.name || ""; return { la: +x.lat, lo: +x.lon, nome: n ? n + (uf ? ", " + uf : "") : x.display_name.split(",").slice(0, 2).join(",") }; });
      el.innerHTML = ST.cidades.length ? ST.cidades.map((c, i) => `<button data-s="pt-cid-ok" data-v="${i}">${I.pin}<span><b>${esc(c.nome)}</b></span></button>`).join("") : `<p class="small muted" style="padding:8px">Nada encontrado. Confira a grafia.</p>`;
    } catch (e) { el.innerHTML = `<p class="small muted" style="padding:8px">Sem conexão com o serviço de mapas. Tente de novo.</p>`; }
  }
  document.addEventListener("submit", e => {
    if (e.target.id !== "pt-cid-f") return; e.preventDefault();
    const q = ($("#pt-cid").value || "").trim(); if (q.length < 3) return toast("Digite o nome da cidade.");
    buscarCidade(q);
  });

  /* ---------- lugares frequentes (mesma região, mesmos dias da semana) ---------- */
  async function hashCel(g5, dia) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("chatmil|" + g5 + "|" + dia));
    return [...new Uint8Array(b)].slice(0, 6).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  let freqFeito = 0;
  async function registrarFreq() {
    if (!adulto() || !navigator.geolocation || Date.now() - freqFeito < 30 * 60e3) return;
    freqFeito = Date.now();
    try {
      const st = navigator.permissions ? await navigator.permissions.query({ name: "geolocation" }).catch(() => null) : null;
      if (!st || st.state !== "granted") return;
      const c = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(p => ok(p.coords), no, { enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60e3 }));
      const dia = "d" + new Date().getDay(), h = await hashCel(gh(c.latitude, c.longitude, 5), dia);
      const f = { ...((SO.eu && SO.eu.freq) || {}) }, l = (f[dia] || []).filter(x => x !== h);
      l.unshift(h); f[dia] = l.slice(0, 5);
      if ((((SO.eu && SO.eu.freq) || {})[dia] || [])[0] === h) return;
      await fb.updateDoc(D("users", eu()), { freq: f }); if (SO.eu) SO.eu.freq = f;
      const lo = meuLoc(); if (!lo || km(lo, { la: c.latitude, lo: c.longitude }) > 3) salvarLocal(c.latitude, c.longitude).catch(() => { });
    } catch (e) { }
  }
  function mesmosLugares(p) {
    const a = (SO.eu && SO.eu.freq) || {}, b = (p && p.freq) || {}; let n = 0;
    for (const d in a) { const s = new Set(b[d] || []); (a[d] || []).forEach(h => { if (s.has(h)) n++; }); }
    return n;
  }

  /* ---------- quem está perto ---------- */
  async function carregar(forca) {
    const loc = meuLoc(), r = alcance(), n = loc ? precisao(r) : 0;
    const chave = loc ? `${loc.la},${loc.lo}|${r}` : "brasil";
    if (!forca && ST.lista && ST.chave === chave && Date.now() - ST.em < (ST.lista.length ? 90000 : 12000)) return;
    if (ST.carregando) return;
    ST.carregando = true; ST.erro = "";
    try {
      const q = n ? fb.query(C("users"), fb.where("loc.g" + n, "in", celulas(loc.la, loc.lo, n)), fb.limit(200))
        : fb.query(C("users"), fb.where("perto", "==", true), fb.limit(200));
      const s = await fb.getDocs(q);
      const l = [];
      s.docs.forEach(d => {
        if (d.id === eu()) return;
        const p = A.pub(d.id, d.data()); SO.perfis[d.id] = { ...(SO.perfis[d.id] || {}), ...p };
        if (p.perto !== true || p.adulto !== true || SO.bloqueados.has(d.id) || p.removido) return;
        const dist = loc ? km(loc, p.loc) : null;
        if (loc && r && (dist == null || dist > r)) return;
        l.push({ uid: d.id, dist });
      });
      const minhas = new Set((SO.eu && SO.eu.disciplinas) || []), meusI = new Set((SO.eu && SO.eu.interesses) || []);
      l.forEach(x => {
        const p = SO.perfis[x.uid] || {};
        x.comum = (p.disciplinas || []).filter(d => minhas.has(d)).length + (p.interesses || []).filter(d => meusI.has(d)).length;
        x.lugares = mesmosLugares(p);
        x.nota = (x.dist == null ? 500 : x.dist) - x.comum * 15 - x.lugares * 40 - (p.foto ? 8 : 0) - (p.bio ? 4 : 0);
      });
      l.sort((a, b) => a.nota - b.nota);
      ST.lista = l; ST.chave = chave; ST.em = Date.now(); ST.idx = 0;
    } catch (e) { console.warn(e); ST.erro = msgErro(e); ST.lista = ST.lista || []; ST.chave = chave; ST.em = Date.now(); }
    ST.carregando = false; pintar();
  }
  const filtrar = l => (l || []).filter(x => !SO.bloqueados.has(x.uid) && !(SO.perfis[x.uid] || {}).menor && (!ST.so || ((SO.perfis[x.uid] || {}).interesses || []).some(d => ((SO.eu || {}).interesses || []).includes(d))));
  function baralho() { const pl = pulados(); return filtrar(ST.lista).filter(x => !SO.seguindo.has(x.uid) && !pl[x.uid]); }

  /* ---------- mural: faixa "Colegas perto de você" ---------- */
  function foto(p, uid, cls) {
    return p.foto ? `<img class="${cls}" src="${esc(p.foto)}" alt="" loading="lazy">`
      : `<span class="${cls} pt-ini" style="background:${corDe(uid || p.usuario)}">${esc(String(p.nome || "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?")}</span>`;
  }
  function cartaoMini(x) {
    const p = P(x.uid), d = (p.interesses || [])[0] || "";
    return `<button class="pt-mini" data-s="pt-ver" data-id="${esc(x.uid)}" aria-label="${esc(p.nome)}">
      ${foto(p, x.uid, "pt-mini-f")}${SO.seguindo.has(x.uid) ? `<i class="pt-seg">${K.check}</i>` : ""}
      <span class="pt-mini-t"><b>${esc(p.nome)}</b><small>${esc(d)}${x.dist != null ? " · " + fmtKm(x.dist) : ""}</small></span></button>`;
  }
  /* ---------- tela "Conhecer colegas" (cartões) ---------- */
  function cartaGrande(x) {
    const p = P(x.uid), dis = p.disciplinas || [], int = p.interesses || [], meusD = new Set((SO.eu || {}).disciplinas || []), meusI = new Set((SO.eu || {}).interesses || []);
    return `<article class="pt-carta" id="pt-carta" data-id="${esc(x.uid)}">
      ${foto(p, x.uid, "pt-carta-f")}
      <span class="pt-selo pt-selo-sim">SEGUIR</span><span class="pt-selo pt-selo-nao">PULAR</span>
      <div class="pt-carta-t">
        <h2>${esc(p.nome)}${seloHtml(p)}</h2>
        <p>${x.dist != null ? `${I.pin} ${esc(fmtKm(x.dist))}` : ""}${p.loc && p.loc.cid ? ` · ${esc(p.loc.cid)}` : ""}</p>
        ${x.lugares ? `<p class="pt-lug">${I.estrela} Mesmos lugares, mesmos dias</p>` : ""}
        ${p.escola ? `<p>${K.escola || ""} ${esc(p.escola)}</p>` : ""}
        ${dis.length || int.length ? `<div class="pt-chips">${dis.map(d => `<span class="${meusD.has(d) ? "on" : ""}">${esc(d)}</span>`).join("")}${int.map(d => `<span class="i ${meusI.has(d) ? "on" : ""}">${esc(d)}</span>`).join("")}</div>` : ""}
        ${p.bio ? `<p class="pt-bio">${esc(p.bio)}</p>` : ""}
        <button class="cs-link pt-perfil" data-s="ver-perfil" data-id="${esc(x.uid)}">Ver perfil e publicações</button>
      </div></article>`;
  }
  function corpoCartas() {
    carregar();
    const b = baralho(), x = b[0], loc = meuLoc();
    let corpo;
    if (!loc && !ST.lista) corpo = `<div class="empty">${I.gente}<b>Ative a localização</b>
      <button class="btn primary" data-s="pt-gps">Usar localização</button><button class="btn" data-s="pt-cidade">Digitar cidade</button></div>`;
    else if (!ST.lista || (ST.carregando && !b.length)) corpo = `<div class="empty"><div class="spin"></div></div>`;
    else if (!x) corpo = `<div class="empty">${I.coracao}<b>Você viu todos ${alcance() ? "até " + alcance() + " km" : ""}</b>
      <div class="stack" style="width:100%;max-width:300px">${alcance() && alcance() < 600 ? `<button class="btn primary" data-s="pt-alc" data-v="${ALCANCES[ALCANCES.indexOf(alcance()) + 1]}">Aumentar para ${nomeAlc(ALCANCES[ALCANCES.indexOf(alcance()) + 1])}</button>` : ""}
      ${Object.keys(pulados()).length ? `<button class="btn" data-s="pt-rever">Rever quem eu pulei</button>` : ""}
      <button class="btn" data-s="pt-convidar">Convidar amigos</button></div></div>`;
    else corpo = `<div class="pt-deck">${b[1] ? `<div class="pt-atras">${foto(P(b[1].uid), b[1].uid, "pt-carta-f")}</div>` : ""}${cartaGrande(x)}</div>
      <div class="pt-acoes">
        <button class="pt-b pt-b-nao" data-s="pt-pular" data-id="${esc(x.uid)}" aria-label="Pular">${I.x}</button>
        <button class="pt-b pt-b-oi" data-s="pt-oi" data-id="${esc(x.uid)}" aria-label="Dizer oi">${I.oi}</button>
        <button class="pt-b pt-b-sim" data-s="pt-seguir" data-id="${esc(x.uid)}" aria-label="Seguir">${I.coracao}</button>
      </div>`;
    return `${ST.erro ? `<p class="aviso">${esc(ST.erro)}</p>` : ""}${corpo}`;
  }
  const botaoAlc = () => `<button class="pt-alc-bt" data-s="pt-ajustes">${I.filtro}<span>${alcance() ? alcance() + " km" : "Brasil"}</span></button>`;
  X.views["pt-descobrir"] = () => `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Conexões</b>${botaoAlc()}</header>
    <div class="cs-pag pt-pag">${adulto() ? corpoCartas() : ""}</div>`;
  /* aba Conexões */
  X.tabViews.conexoes = () => {
    if (!adulto()) return `<div class="cs-carr"><div class="spin"></div></div>`;
    registrarFreq();
    return `<div class="cs-cab"><h1>Conexões</h1>${botaoAlc()}</div><div class="pt-pag pt-aba">${corpoCartas()}</div>`;
  };
  /* Amigos (lupa do Mural): distância aproximada e sugestões da região, só para +18 confirmados */
  X.pessoaSub = (uid, p) => { if (!adulto()) return ""; const me = meuLoc(), d = me && p && p.loc ? km(me, p.loc) : null; return d != null ? fmtKm(d) + (p.loc.cid ? " · " + p.loc.cid : "") : ""; };
  X.pessoaOrdem = uid => { if (!adulto()) return 0; const me = meuLoc(), p = P(uid), d = me && p.loc ? km(me, p.loc) : null; return d == null ? 1e6 : d; };
  X.descobrir = () => { if (!adulto() || !meuLoc()) return []; carregar(); return filtrar(ST.lista).slice(0, 30).map(x => x.uid); };

  /* arrastar o cartão (eventos no documento: o cartão pode ser redesenhado no meio do gesto) */
  let arr = null;
  const posCarta = () => {
    const c = $("#pt-carta"); if (!c) return;
    if (!arr) { c.style.transform = ""; c.style.setProperty("--sim", 0); c.style.setProperty("--nao", 0); c.classList.remove("arr"); return; }
    c.classList.add("arr"); c.style.transform = `translate(${arr.dx}px,${arr.dy * .2}px) rotate(${arr.dx / 18}deg)`;
    c.style.setProperty("--sim", Math.max(0, Math.min(1, arr.dx / 110))); c.style.setProperty("--nao", Math.max(0, Math.min(1, -arr.dx / 110)));
  };
  document.addEventListener("pointerdown", e => {
    const c = e.target.closest && e.target.closest("#pt-carta"); if (!c || e.target.closest("button") || e.button > 0) return;
    arr = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, id: e.pointerId, uid: c.dataset.id };
  });
  document.addEventListener("pointermove", e => {
    if (!arr || e.pointerId !== arr.id) return;
    arr.dx = e.clientX - arr.x; arr.dy = e.clientY - arr.y;
    if (Math.abs(arr.dx) > 6) { e.preventDefault(); posCarta(); }
  }, { passive: false });
  const fimArr = e => {
    if (!arr || (e && e.pointerId !== arr.id)) return;
    const { dx, uid } = arr; arr = null;
    const c = $("#pt-carta");
    if (Math.abs(dx) > 100 && c) {
      c.classList.remove("arr"); c.style.transition = "transform .22s";
      c.style.transform = `translate(${dx > 0 ? 600 : -600}px,0) rotate(${dx > 0 ? 25 : -25}deg)`;
      setTimeout(() => dx > 0 ? seguirCarta(uid) : pular(uid), 180);
    } else posCarta();
  };
  document.addEventListener("pointerup", fimArr); document.addEventListener("pointercancel", fimArr);
  X.depois.push(() => { if (arr) posCarta(); });
  /* ao voltar para o Mural, atualiza quem está perto */
  let abaAnt = "";
  X.depois.push(t => { const k = t ? t.v : SO.tab; if (k !== abaAnt) { if ((k === "conexoes" || k === "pt-descobrir") && Date.now() - ST.em > 8000 && meuLoc() && adulto()) { ST.em = 0; setTimeout(() => carregar(), 0); } abaAnt = k; } });
  function pular(uid) { const m = pulados(); m[uid] = Date.now(); gravarLS("cs.pul." + eu(), m); pintar(); }
  async function seguirCarta(uid) {
    if (!uid) return;
    if (!SO.seguindo.has(uid)) { await A.seguir(uid); SO.seguindo.add(uid); }
    pintar();
    /* conexão: os dois se seguem */
    try {
      const s = await fb.getDoc(D("users", eu(), "seguidores", uid));
      if (s.exists()) {
        const p = P(uid);
        window.abrirSheet(`<div class="pt-match"><div class="pt-match-av">${av(SO.eu, 84, eu())}${av(p, 84, uid)}</div>
          <h2>Conexão!</h2><p class="muted">Você e ${esc(p.nome)} se seguem.</p>
          <button class="btn primary cs-grande" data-s="pt-oi" data-id="${esc(uid)}">${I.oi} Dizer oi</button>
          <button class="btn" data-s="fechar">Continuar</button></div>`);
      } else toast("Seguindo " + P(uid).nome + ".");
    } catch (e) { }
  }
  async function dizerOi(uid) {
    const p = P(uid), id = await A.garantirDireto(uid); if (!id) return;
    const nome = String(p.nome || "").replace(/^@/, "");
    if (!(SO.rascunho[id] || "").trim()) SO.rascunho[id] = `Oi, ${nome}! Tudo bem?`;
    window.fecharSheet(); A.abrirChat(id);
  }

  /* ---------- ajustes: alcance, disciplina, visibilidade, interesses, local ---------- */
  function sheetAjustes() {
    const loc = meuLoc(), r = alcance(), e = SO.eu || {};
    window.abrirSheet(`<div class="sheet-h"><h2>Conexões</h2></div><div class="stack">
      <div class="f"><span>Alcance</span><div class="pt-alcs">${ALCANCES.map(v => `<button type="button" data-s="pt-alc" data-v="${v}" aria-pressed="${v === r}">${v ? v + " km" : "Brasil"}</button>`).join("")}</div></div>
      <div class="cs-menu card flat">
        <label class="cs-linha" for="pt-so" style="display:flex;align-items:center;gap:12px"><span class="cs-lic">${I.filtro}</span><span style="flex:1"><b>Mesmos interesses</b></span><input type="checkbox" class="cs-sw" id="pt-so" ${ST.so ? "checked" : ""}></label>
        <label class="cs-linha" for="pt-vis" style="display:flex;align-items:center;gap:12px"><span class="cs-lic">${I.gente}</span><span style="flex:1"><b>Aparecer em Conexões</b></span><input type="checkbox" class="cs-sw" id="pt-vis" ${e.perto !== false && loc ? "checked" : ""}></label>
        <button data-s="pt-local">${I.pin}<span><b>${loc ? esc(loc.cid || "Local aproximado salvo") : "Definir minha cidade"}</b></span></button>
        ${loc ? `<button data-s="pt-tirar-local">${I.x}<span><b>Apagar minha localização</b></span></button>` : ""}
      </div>
      <div class="f"><span>Meus interesses <small class="muted">(até 8)</small></span><div class="chips">${INTERESSES.map(t => `<button type="button" class="chip" data-s="pt-int" data-v="${esc(t)}" aria-pressed="${(e.interesses || []).includes(t)}">${esc(t)}</button>`).join("")}</div></div>
      <button class="btn primary" data-s="fechar">Pronto</button></div>`);
  }
  async function salvarCampos(o) {
    try { await fb.updateDoc(D("users", eu()), o); if (SO.eu) Object.assign(SO.eu, o); }
    catch (e) { toast(msgErro(e)); throw e; }
  }
  document.addEventListener("change", async e => {
    const id = e.target.id;
    if (id === "pt-so") { ST.so = e.target.checked; ST.idx = 0; pintar(); }
    if (id === "pt-vis") {
      if (e.target.checked && !meuLoc()) { e.target.checked = false; return sheetLocal(); }
      try { await salvarCampos({ perto: e.target.checked }); toast(e.target.checked ? "Você aparece em Conexões." : "Você não aparece mais em Conexões."); } catch (er) { e.target.checked = !e.target.checked; }
    }
  });
  function sheetLocal() {
    window.abrirSheet(`<div class="sheet-h"><h2>Sua região</h2></div>
      <div class="stack"><button class="btn primary cs-grande" data-s="pt-gps">${I.pin} Usar minha localização</button><button class="btn" data-s="pt-cidade">Digitar a cidade</button></div>`);
  }

  /* ---------- ações ---------- */
  Object.assign(X.acoes, {
    "pt-descobrir": () => { window.fecharSheet(); abrirTela({ v: "pt-descobrir" }); },
    "pt-ver": el => {
      const id = el.dataset.id; if (SO.seguindo.has(id)) return abrirTela({ v: "perfil", id });
      const pl = pulados(); if (pl[id]) { delete pl[id]; gravarLS("cs.pul." + eu(), pl); }
      ST.primeiro = id; abrirTela({ v: "pt-descobrir" });
    },
    "pt-convidar": async () => {
      const url = "https://vonescoelho.github.io/senov-provas/", t = "Estou no ChatMil: vídeos, amigos e conversas, sem anúncios. Entre também: " + url;
      try { if (navigator.share) { await navigator.share({ title: "ChatMil", text: t }); return; } } catch (e) { return; }
      A.copiar(t); toast("Convite copiado. Cole no WhatsApp.");
    },
    "pt-pular": el => pular(el.dataset.id),
    "pt-seguir": el => seguirCarta(el.dataset.id),
    "pt-oi": el => dizerOi(el.dataset.id),
    "pt-rever": () => { gravarLS("cs.pul." + eu(), {}); pintar(); },
    "pt-ajustes": () => sheetAjustes(),
    "pt-local": () => sheetLocal(),
    "pt-gps": el => usarGPS(el),
    "pt-cidade": () => sheetCidade(),
    "pt-cid-ok": async el => { const c = (ST.cidades || [])[+el.dataset.v]; if (!c) return; try { await salvarLocal(c.la, c.lo, c.nome); toast("Local: " + c.nome); window.fecharSheet(); pintar(); } catch (e) { toast(msgErro(e)); } },
    "pt-tirar-local": async () => { try { await salvarCampos({ loc: fb.deleteField ? fb.deleteField() : null, perto: false }); if (SO.eu) { delete SO.eu.loc; SO.eu.perto = false; } ST.lista = null; window.fecharSheet(); toast("Localização apagada."); pintar(); } catch (e) { } },
    "pt-fechar": () => { gravarLS("cs.ptFechou." + eu(), Date.now()); pintar(); },
    "pt-alc": el => {
      const v = +el.dataset.v; gravarLS("cs.alc." + eu(), v); ST.lista = null; ST.chave = "";
      document.querySelectorAll('[data-s="pt-alc"]').forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === v)));
      if (v && !meuLoc()) { sheetLocal(); return; }
      pintar();
    },
    "pt-int": async el => {
      const v = el.dataset.v, l = [...((SO.eu || {}).interesses || [])], k = l.indexOf(v);
      if (k >= 0) l.splice(k, 1); else { if (l.length >= 8) return toast("Escolha até 8 interesses."); l.push(v); }
      el.setAttribute("aria-pressed", String(k < 0));
      try { await salvarCampos({ interesses: l }); } catch (e) { el.setAttribute("aria-pressed", String(k >= 0)); }
    },
    /* compositor: alcance da publicação */
    "pt-calc": () => { const p = $("#pt-calc-p"); if (p) p.hidden = !p.hidden; },
    "pt-calc-v": el => {
      const v = +el.dataset.v;
      if (v && !meuLoc()) { toast("Defina sua cidade para limitar por distância."); return; }
      SO.postAlc = v; document.querySelectorAll('[data-s="pt-calc-v"]').forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === v)));
      const bt = $("#pt-calc"); if (bt) bt.lastElementChild.textContent = v ? "Até " + v + " km" : "Qualquer distância";
    }
  });
  /* abre a tela já no cartão tocado na faixa */
  X.depois.push(t => {
    if (!t || t.v !== "pt-descobrir" || !ST.primeiro || !ST.lista) return;
    const id = ST.primeiro; ST.primeiro = null;
    const i = ST.lista.findIndex(x => x.uid === id);
    if (i > 0) { const [x] = ST.lista.splice(i, 1); ST.lista.unshift(x); pintar(); }
  });

  /* ---------- mural: aba "Perto", alcance das publicações ---------- */
  const geoDe = p => p.geo || (P(p.autor) || {}).loc;
  X.muralFiltro.push((p, feed) => {
    if (p.autor === eu()) return true;
    const me = meuLoc();
    if (p.alc) { const d = me && km(me, p.geo); if (d == null || d > p.alc) return false; }
    if (feed === "perto") { if (!me) return false; const d = km(me, geoDe(p)); const r = alcance(); return d != null && (!r || d <= r); }
    return true;
  });
  X.postMeta.push(p => {
    const me = meuLoc(), d = p.autor !== eu() && me ? km(me, p.geo) : null;
    return (d != null ? ` · ${esc(fmtKm(d))}` : "") + (p.alc && p.autor === eu() ? ` · ${I.pin} até ${p.alc} km` : "");
  });
  X.compositorAbrir.push(() => { SO.postAlc = 0; });
  X.compositorBotoes.push(() => !adulto() ? "" : `<button type="button" class="btn sm" data-s="pt-calc" id="pt-calc">${I.alvo}<span>Qualquer distância</span></button>`);
  X.compositorPainel.push(() => !adulto() ? "" : `<div class="pt-alcs" id="pt-calc-p" hidden>${[0, 10, 20, 50, 100, 300].map(v => `<button type="button" data-s="pt-calc-v" data-v="${v}" aria-pressed="${v === 0}">${v ? "Até " + v + " km" : "Qualquer distância"}</button>`).join("")}</div>`);
  X.postDados.push(para => {
    if (para) return {};
    const me = meuLoc(), alc = SO.postAlc || 0;
    if (!me || !adulto() || (SO.eu.perto === false && !alc)) return {};
    return { geo: { la: me.la, lo: me.lo, g2: me.g2, g3: me.g3, g4: me.g4 }, ...(alc ? { alc } : {}) };
  });
  /* publicações perto (além das 120 mais recentes do Brasil) */
  X.depois.push(() => {
    const me = meuLoc(), r = alcance(), n = precisao(r || 600) || 2;
    const quer = SO.tab === "mural" && SO.feed === "perto" && me;
    const ch = quer ? `${me.g4}|${n}` : "";
    if (!quer || ch === ST.chPerto) return;
    if (ST.ouvPerto) { ST.ouvPerto(); ST.ouvPerto = null; }
    ST.chPerto = ch;
    const cel = celulas(me.la, me.lo, n), campo = "geo.g" + n;
    const aplicar = s => { SO.postsExtra.perto = s.docs.map(d => ({ id: d.id, col: "posts", ...A.dadosDe(d) })); if (SO.juntarPosts) SO.juntarPosts(); };
    try {
      ST.ouvPerto = fb.onSnapshot(fb.query(C("posts"), fb.where(campo, "in", cel), fb.orderBy("em", "desc"), fb.limit(80)), aplicar, e => {
        console.warn("perto (índice)", e); /* sem índice composto: lista sem ordem e ordena aqui */
        if (ST.ouvPerto) ST.ouvPerto();
        ST.ouvPerto = fb.onSnapshot(fb.query(C("posts"), fb.where(campo, "in", cel), fb.limit(120)), aplicar, e2 => console.warn(e2));
      });
    } catch (e) { console.warn(e); }
  });
  X.aoTrocarUsuario.push(() => { if (ST.ouvPerto) { ST.ouvPerto(); ST.ouvPerto = null; } ST.chPerto = ""; ST.lista = null; ST.chave = ""; if (SO.postsExtra) SO.postsExtra.perto = []; });

  /* ---------- perfil: distância e interesses ---------- */
  const perfilAnt = X.perfilExtra;
  X.perfilExtra = (uid, meu) => {
    const p = meu ? (SO.eu || {}) : P(uid), me = meuLoc(), d = !meu && me && adulto() ? km(me, p.loc) : null, int = p.interesses || [];
    const h = (d != null || int.length || meu) ? `<section class="card flat pt-perfil-x">
      ${d != null ? `<p>${I.pin} ${esc(fmtKm(d))}${p.loc && p.loc.cid ? " · " + esc(p.loc.cid) : ""}</p>` : meu && p.loc ? `<p>${I.pin} ${esc(p.loc.cid || "Local aproximado")}${p.perto === false ? " · oculto" : ""}</p>` : ""}
      ${int.length ? `<div class="pt-chips">${int.map(t => `<span class="i">${esc(t)}</span>`).join("")}</div>` : ""}
      ${meu ? `<button class="cs-link" data-s="pt-ajustes">${int.length || p.loc ? "Editar interesses" : "Adicionar interesses"}</button>` : ""}</section>` : "";
    return h + (perfilAnt ? perfilAnt(uid, meu) : "");
  };
  X.configPriv.push(() => !adulto() ? "" : `<button class="cs-linha" data-s="pt-ajustes" style="display:flex;align-items:center;gap:12px;width:100%"><span class="cs-lic">${I.pin}</span><span style="flex:1;text-align:left"><b>Conexões</b></span></button>`);

  /* ---------- estilos ---------- */
  const css = document.createElement("style");
  css.textContent = `
.pt-alc-bt{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:99px;padding:6px 10px;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;margin-left:auto}
.pt-alc-bt svg{width:16px;height:16px;color:var(--primary)}
.cs-cab .pt-alc-bt+.cs-ico-bt{margin-left:4px}
.pt-convite{display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center;padding:14px;background:linear-gradient(135deg,color-mix(in srgb,#E11D48 14%,var(--surface)),color-mix(in srgb,var(--primary) 14%,var(--surface)))}
.pt-conv-ic{width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,#E11D48,#7C5CFF);color:#fff;display:grid;place-items:center}
.pt-conv-ic svg{width:26px;height:26px}
.pt-conv-t b{display:block}.pt-conv-t small{color:var(--muted)}
.pt-conv-bt{grid-column:1/-1;gap:8px;flex-wrap:nowrap}.pt-conv-bt .cs-ico-bt{margin-left:auto}
.pt-faixa{margin:2px 0 4px}
.pt-faixa-h{display:flex;align-items:baseline;gap:8px;padding:0 2px 8px}
.pt-faixa-h small{color:var(--muted);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-faixa-l{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 2px 6px;scrollbar-width:none}
.pt-faixa-l::-webkit-scrollbar{display:none}
.pt-mini{position:relative;flex:none;width:118px;height:162px;border-radius:18px;overflow:hidden;border:0;padding:0;cursor:pointer;scroll-snap-align:start;background:var(--surface-2);box-shadow:0 6px 16px rgba(0,0,0,.12)}
.pt-mini-f{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pt-ini{display:grid;place-items:center;color:#fff;font-weight:800;font-size:2.2rem;letter-spacing:.02em}
.pt-mini-t{position:absolute;left:0;right:0;bottom:0;padding:26px 8px 8px;background:linear-gradient(transparent,rgba(0,0,0,.78));color:#fff;text-align:left}
.pt-mini-t b{display:block;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-mini-t small{display:block;font-size:.7rem;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-seg{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center}.pt-seg svg{width:14px;height:14px}
.pt-mais{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#fff;font-weight:700;font-size:.82rem;background:linear-gradient(160deg,#E11D48,#7C5CFF)}
.pt-mais svg{width:30px;height:30px}
.pt-vazio{padding:10px 4px}
.pt-pag{display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:8px}
.pt-aba{padding-bottom:20px}.pt-lug{color:#FFD166}
.pt-deck{position:relative;width:100%;max-width:420px;aspect-ratio:3/4.3;max-height:calc(100vh - 230px)}
.pt-atras{position:absolute;inset:10px 10px -6px;border-radius:24px;overflow:hidden;opacity:.55;transform:scale(.96)}
.pt-atras .pt-carta-f{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pt-carta{position:absolute;inset:0;border-radius:24px;overflow:hidden;background:var(--surface-2);box-shadow:0 14px 34px rgba(0,0,0,.22);touch-action:pan-y;user-select:none;--sim:0;--nao:0;transition:transform .2s}
.pt-carta.arr{transition:none;cursor:grabbing}
.pt-carta-f{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.pt-carta-f.pt-ini{font-size:5rem}
.pt-carta-t{position:absolute;left:0;right:0;bottom:0;padding:70px 16px 14px;background:linear-gradient(transparent,rgba(0,0,0,.84) 38%);color:#fff;max-height:78%;overflow:auto}
.pt-carta-t h2{margin:0 0 4px;font-size:1.5rem;display:flex;align-items:center;gap:6px}
.pt-carta-t p{margin:2px 0;font-size:.9rem;opacity:.95;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.pt-carta-t p svg{width:16px;height:16px}
.pt-bio{display:block!important;line-height:1.35}
.pt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.pt-chips span{font-size:.74rem;font-weight:700;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.18);color:inherit;border:1px solid rgba(255,255,255,.28)}
.pt-chips span.i{background:rgba(124,92,255,.32)}
.pt-chips span.on{background:#E11D48;border-color:#E11D48;color:#fff}
.pt-perfil-x .pt-chips span{background:var(--primary-soft);border-color:transparent;color:var(--primary)}
.pt-perfil-x{padding:12px}.pt-perfil-x p{margin:0 0 6px;display:flex;align-items:center;gap:6px}.pt-perfil-x p svg{width:16px;height:16px;color:var(--primary)}
.pt-perfil{color:#fff!important;text-decoration:underline;margin-top:4px}
.pt-selo{position:absolute;top:22px;padding:6px 12px;border:3px solid;border-radius:10px;font-weight:900;font-size:1.3rem;letter-spacing:.06em;z-index:2;pointer-events:none}
.pt-selo-sim{left:18px;color:#16A34A;transform:rotate(-14deg);opacity:var(--sim)}
.pt-selo-nao{right:18px;color:#E11D48;transform:rotate(14deg);opacity:var(--nao)}
.pt-acoes{display:flex;align-items:center;justify-content:center;gap:22px}
.pt-b{width:64px;height:64px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;background:var(--surface);box-shadow:0 8px 20px rgba(0,0,0,.16);transition:transform .12s}
.pt-b:active{transform:scale(.9)}
.pt-b svg{width:30px;height:30px}
.pt-b-nao{color:#E11D48}.pt-b-oi{width:52px;height:52px;color:var(--primary)}.pt-b-oi svg{width:24px;height:24px}
.pt-b-sim{color:#fff;background:linear-gradient(135deg,#E11D48,#F97316)}
.pt-b-sim svg{fill:currentColor}
.pt-dica{margin:0;text-align:center}
.pt-alcs{display:flex;flex-wrap:wrap;gap:6px}
.pt-alcs button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:99px;padding:7px 12px;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer}
.pt-alcs button[aria-pressed="true"]{background:var(--primary);border-color:var(--primary);color:var(--primary-ink)}
.cs-novo-post+.cs-seg,#cs-f-post .pt-alcs{margin-top:2px}
.pt-match{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:8px 0}
.pt-match h2{margin:6px 0 0;font-size:1.8rem;background:linear-gradient(90deg,#E11D48,#7C5CFF);-webkit-background-clip:text;background-clip:text;color:transparent}
.pt-match p{margin:0}
.pt-match .btn{width:100%;max-width:320px}
.pt-match-av{display:flex}.pt-match-av .cs-av{border:4px solid var(--surface);box-shadow:0 6px 16px rgba(0,0,0,.2)}.pt-match-av .cs-av+.cs-av{margin-left:-18px}
`;
  document.head.appendChild(css);
})();
