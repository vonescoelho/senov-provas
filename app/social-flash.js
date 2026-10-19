/* ChatMil — Flash: foto ou vídeo de até 30 segundos que fica 24 horas (como o “status”).
   - câmera própria com efeitos leves (suavizar pele, iluminar, tom de pele) ou foto/vídeo da galeria;
   - música da galeria ou som do celular;
   - quem vê: todos, só quem eu sigo ou pessoas escolhidas;
   - Destaques: até 5 fotos ou vídeos que ficam no perfil.
   Nada fica “ouvindo” o servidor: os Flashes são buscados quando a aba Conversas abre (poupa bateria e internet). */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext || !window.SOCIAL.ext.midia) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._, M = X.midia;
  const { SO, fb, D, C, TS, ic, esc, eu, pintar, toast, msgErro, P, av, ofensivo, enviarMsg } = A;
  const $ = s => document.querySelector(s);
  const I = Object.assign({}, M.I, {
    flash: ic('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    virar: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><path d="M9 13a3 3 0 0 1 5-2.2M15 13a3 3 0 0 1-5 2.2"/><path d="M14 9v2h-2M10 17v-2h2"/>'),
    varinha: ic('<path d="m15 4 5 5L9 20H4v-5z"/><path d="M14 5l5 5"/><path d="M4 4l1.5 1.5M8 2v2M2 8h2"/>'),
    musica: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    estrela: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    pessoas: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>'),
    som: ic('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    semSom: ic('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>')
  });
  const DIA = 24 * 3600e3, MAXDEST = 5, MAXDUR = 30, PARTE = 700 * 1024;
  const lerLS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const mmss = M.mmss;
  const haQuanto = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)} h`; };

  /* ================= Guardar e buscar (em partes de 700 KB) ================= */
  async function subirPartes(col, id, sub, blob, onProg) {
    const buf = new Uint8Array(await blob.arrayBuffer()), n = Math.max(1, Math.ceil(buf.length / PARTE)); let prox = 0, feitos = 0;
    const um = async () => { while (prox < n) { const i = prox++; await fb.setDoc(D(col, id, sub, String(i).padStart(4, "0")), { d: fb.Bytes.fromUint8Array(buf.subarray(i * PARTE, (i + 1) * PARTE)) }); feitos++; if (onProg) onProg(feitos / n); } };
    await Promise.all([um(), um(), um()]); return n;
  }
  const BL = new Map();
  function baixar(col, id, sub, tipo) {
    const k = col + "/" + id + "/" + sub; if (BL.has(k)) return BL.get(k);
    const p = fb.getDocs(C(col, id, sub)).then(s => { if (!s.docs.length) throw { code: "not-found" }; return new Blob(s.docs.slice().sort((a, b) => a.id.localeCompare(b.id)).map(d => d.data().d.toUint8Array()), { type: tipo }); });
    BL.set(k, p); p.catch(() => BL.delete(k));
    if (BL.size > 24) { const k0 = BL.keys().next().value; BL.delete(k0); }
    return p;
  }
  async function apagarTudo(col, id) {
    for (const sub of ["partes", "som", "vistos"]) { try { const s = await fb.getDocs(C(col, id, sub)); await Promise.all(s.docs.map(d => fb.deleteDoc(d.ref))); } catch (e) { } }
    try { await fb.deleteDoc(D(col, id)); } catch (e) { }
  }

  /* ================= Lista de Flashes (Conversas e perfis) ================= */
  const FL = { porUid: new Map(), meus: [], carregando: false, ultimo: 0, vistos: new Set(), dest: new Map() };
  X.aoTrocarUsuario.push(u => { FL.porUid = new Map(); FL.meus = []; FL.ultimo = 0; FL.dest = new Map(); FL.vistos = new Set(u ? lerLS("cs.flv." + u.uid, []) : []); });
  const ativo = f => (f.expira || 0) > Date.now();
  async function carregarFlashes(forcar) {
    const nSeg = (SO.seguindo || new Set()).size;
    if (FL.nSeg !== nSeg) { FL.nSeg = nSeg; forcar = true; }
    if (!eu() || FL.carregando || (!forcar && Date.now() - FL.ultimo < 120000)) return;
    FL.carregando = true;
    try {
      const seg = [...(SO.seguindo || [])].filter(u => !SO.bloqueados.has(u)), lotes = [];
      for (let i = 0; i < seg.length && i < 300; i += 30) lotes.push(seg.slice(i, i + 30));
      const res = await Promise.all([
        fb.getDocs(fb.query(C("flashes"), fb.where("dono", "==", eu()))),
        fb.getDocs(fb.query(C("flashesPriv"), fb.where("dono", "==", eu()))),
        fb.getDocs(fb.query(C("flashesPriv"), fb.where("para", "array-contains", eu()))),
        ...lotes.map(l => fb.getDocs(fb.query(C("flashes"), fb.where("dono", "in", l))))
      ].map(p => p.catch(e => { console.warn(e); return { docs: [] }; })));
      const todos = [];
      res.forEach((s, i) => s.docs.forEach(d => todos.push({ id: d.id, col: i === 1 || i === 2 ? "flashesPriv" : "flashes", ...d.data() })));
      const vistosIds = new Set(); const unicos = todos.filter(f => !vistosIds.has(f.col + f.id) && vistosIds.add(f.col + f.id));
      /* os meus que venceram: apaga para liberar espaço */
      unicos.filter(f => f.dono === eu() && !ativo(f)).forEach(f => apagarTudo(f.col, f.id));
      const vivos = unicos.filter(f => ativo(f) && !SO.bloqueados.has(f.dono)).sort((a, b) => (a.criado || 0) - (b.criado || 0));
      FL.meus = vivos.filter(f => f.dono === eu());
      FL.porUid = new Map();
      vivos.filter(f => f.dono !== eu()).forEach(f => { if (!FL.porUid.has(f.dono)) FL.porUid.set(f.dono, []); FL.porUid.get(f.dono).push(f); });
      FL.ultimo = Date.now();
    } finally { FL.carregando = false; pintar(); }
  }
  const todosVistos = lista => lista.every(f => FL.vistos.has(f.id));
  function marcarVisto(f) {
    if (FL.vistos.has(f.id) || f.dono === eu()) return;
    FL.vistos.add(f.id); gravarLS("cs.flv." + eu(), [...FL.vistos].slice(-400));
    fb.setDoc(D(f.col, f.id, "vistos", eu()), { em: TS() }).catch(() => { });
  }
  const anel = (uid, html, tam) => {
    const l = uid === eu() ? FL.meus : FL.porUid.get(uid);
    if (!l || !l.length) return html;
    return `<button class="cs-fl-anel ${todosVistos(l) ? "visto" : ""}" data-s="fl-ver" data-id="${esc(uid)}" aria-label="Ver Flash" style="--t:${tam || 96}px">${html}</button>`;
  };
  X.perfilAv = (uid, html) => anel(uid, html, 96);

  /* faixa no topo das Conversas */
  X.conversasTopo = () => {
    carregarFlashes(false);
    const pessoas = [...FL.porUid.entries()].sort((a, b) => (todosVistos(a[1]) - todosVistos(b[1])) || (b[1][b[1].length - 1].criado - a[1][a[1].length - 1].criado));
    const meu = SO.eu || {};
    return `<div class="cs-fl-faixa" role="list" aria-label="Flashes">
      <button class="cs-fl-it" data-s="fl-meu" role="listitem">${FL.meus.length ? `<span class="cs-fl-anel ${todosVistos(FL.meus) ? "visto" : ""}" style="--t:58px">${av(meu, 58, eu())}</span>` : `<span class="cs-fl-novo">${av(meu, 58, eu())}<i>${I.mais}</i></span>`}<span>Seu Flash</span></button>
      ${pessoas.map(([uid, l]) => { const p = P(uid); return `<button class="cs-fl-it" data-s="fl-ver" data-id="${esc(uid)}" role="listitem"><span class="cs-fl-anel ${todosVistos(l) ? "visto" : ""}" style="--t:58px">${av(p, 58, uid)}</span><span>${esc((p.nome || "").split(" ")[0])}</span></button>`; }).join("")}
    </div>`;
  };
  X.acoes["fl-meu"] = () => {
    if (!FL.meus.length) return abrirCriador("flash");
    window.abrirSheet(`<div class="sheet-h"><h2>Seu Flash</h2></div><div class="cs-menu">
      <button data-s="fl-ver" data-id="${esc(eu())}">${I.olho}<span><b>Ver meus Flashes</b><small>${FL.meus.length} ativo${FL.meus.length > 1 ? "s" : ""} · somem 24 h depois</small></span></button>
      <button data-s="fl-novo">${I.camera}<span><b>Novo Flash</b><small>Foto ou vídeo de até 30 segundos</small></span></button></div>`);
  };
  X.acoes["fl-novo"] = () => { window.fecharSheet(); abrirCriador("flash"); };
  X.acoes["fl-ver"] = el => {
    window.fecharSheet(); const uid = el.dataset.id;
    const lista = uid === eu() ? FL.meus : FL.porUid.get(uid); if (!lista || !lista.length) return;
    const ordem = uid === eu() ? [eu()] : [...FL.porUid.keys()];
    const i0 = lista.findIndex(f => !FL.vistos.has(f.id));
    abrirVisor({ grupos: ordem.map(u => ({ uid: u, itens: u === eu() ? FL.meus : FL.porUid.get(u) })), g: Math.max(0, ordem.indexOf(uid)), i: uid === eu() ? 0 : Math.max(0, i0), tipo: "flash" });
  };

  /* ================= Destaques no perfil ================= */
  function carregarDest(uid) {
    if (FL.dest.has(uid)) return FL.dest.get(uid);
    FL.dest.set(uid, null);
    fb.getDocs(fb.query(C("destaques"), fb.where("dono", "==", uid))).then(s => {
      FL.dest.set(uid, s.docs.map(d => ({ id: d.id, col: "destaques", ...d.data() })).sort((a, b) => (a.criado || 0) - (b.criado || 0))); pintar();
    }).catch(e => { console.warn(e); FL.dest.set(uid, []); });
    return null;
  }
  X.perfilExtra = (uid, meu) => {
    const l = carregarDest(uid);
    if (!meu && (!l || !l.length)) return "";
    return `<section class="cs-dest"><h2 class="cs-sec">${I.estrela} Destaques ${meu ? `<small class="muted">${(l || []).length}/${MAXDEST}</small>` : ""}</h2>
      <div class="cs-dest-l">
        ${(l || []).map((d, i) => `<button class="cs-dest-it" data-s="dest-ver" data-id="${esc(uid)}" data-v="${i}" aria-label="Ver destaque ${i + 1}">${d.thumb ? `<img src="${d.thumb}" alt="">` : `<span>${d.tipo === "video" ? I.play : I.img}</span>`}${d.tipo === "video" ? `<i>${I.play}</i>` : ""}</button>`).join("")}
        ${meu && (l || []).length < MAXDEST ? `<button class="cs-dest-it novo" data-s="dest-novo" aria-label="Adicionar destaque">${I.mais}<small>Adicionar</small></button>` : ""}
        ${l == null ? `<span class="spin sm"></span>` : ""}
      </div>${meu && l && !l.length ? `<p class="small muted">Escolha até ${MAXDEST} fotos ou vídeos para ficarem no seu perfil. Também dá para destacar um Flash.</p>` : ""}</section>`;
  };
  X.acoes["dest-ver"] = el => { const l = FL.dest.get(el.dataset.id) || []; if (l.length) abrirVisor({ grupos: [{ uid: el.dataset.id, itens: l }], g: 0, i: +el.dataset.v || 0, tipo: "destaque" }); };
  X.acoes["dest-novo"] = () => {
    const l = FL.dest.get(eu()) || [];
    if (l.length >= MAXDEST) return toast(`Você já tem ${MAXDEST} destaques. Remova um para adicionar outro.`);
    if (FL.meus.length) return window.abrirSheet(`<div class="sheet-h"><h2>Novo destaque</h2></div><div class="cs-menu">
      <button data-s="dest-criar">${I.camera}<span><b>Foto ou vídeo novo</b><small>Câmera ou galeria</small></span></button>
      <button data-s="fl-ver" data-id="${esc(eu())}">${I.flash}<span><b>Destacar um dos meus Flashes</b><small>Abra o Flash e toque em “Destacar”</small></span></button></div>`);
    abrirCriador("destaque");
  };
  X.acoes["dest-criar"] = () => { window.fecharSheet(); abrirCriador("destaque"); };

  /* ================= Visualizador de Flashes e Destaques ================= */
  const VW = { el: null, s: null, t0: 0, pausa: false, dur: 6, gasto: 0, raf: 0, midia: null, aud: null, urls: [] };
  function abrirVisor(estado) {
    fecharVisorFl();
    const el = document.createElement("div"); el.className = "cs-flv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", estado.tipo === "destaque" ? "Destaques" : "Flash");
    document.body.appendChild(el); VW.el = el; VW.s = estado; document.body.classList.add("cs-vis-on");
    let x0 = 0, y0 = 0, tq = 0, segurou = null;
    el.addEventListener("pointerdown", e => { if (e.target.closest("button,input,textarea,.cs-flv-pe")) return; x0 = e.clientX; y0 = e.clientY; tq = Date.now(); segurou = setTimeout(() => pausar(true), 220); });
    el.addEventListener("pointerup", e => {
      if (e.target.closest("button,input,textarea,.cs-flv-pe")) return;
      clearTimeout(segurou); const longo = Date.now() - tq > 220; if (VW.pausa && longo) { pausar(false); return; }
      const dy = e.clientY - y0; if (dy > 90) return fecharVisorFl();
      if (!longo) navegar(e.clientX < el.clientWidth * 0.33 ? -1 : 1);
    });
    mostrarItem();
  }
  function itemAtual() { const s = VW.s, g = s && s.grupos[s.g]; return g && g.itens[s.i]; }
  function limparMidia() {
    cancelAnimationFrame(VW.raf);
    if (VW.midia && VW.midia.pause) { VW.midia.pause(); VW.midia.removeAttribute("src"); }
    if (VW.aud) { VW.aud.pause(); VW.aud.removeAttribute("src"); }
    VW.urls.forEach(u => URL.revokeObjectURL(u)); VW.urls = []; VW.midia = null; VW.aud = null;
  }
  async function mostrarItem() {
    limparMidia();
    const s = VW.s, g = s.grupos[s.g], f = itemAtual(); if (!f) return fecharVisorFl();
    const meu = g.uid === eu(), p = P(g.uid);
    if (window.CS_SEGURO) window.CS_SEGURO("flash", f.col === "flashesPriv");
    VW.dur = f.tipo === "video" ? (f.dur || 10) : (f.dur || 6); VW.gasto = 0; VW.pausa = false;
    VW.el.innerHTML = `<div class="cs-flv-barras">${g.itens.map((_, i) => `<i><b style="width:${i < s.i ? 100 : 0}%"></b></i>`).join("")}</div>
      <div class="cs-flv-top">${av(p, 38, g.uid)}<span><b>${esc(meu ? "Você" : p.nome || "")}</b><small>${s.tipo === "destaque" ? "Destaque" : haQuanto(f.criado || Date.now())}${f.col === "flashesPriv" ? " · para algumas pessoas" : ""}</small></span>
        ${f.musica ? `<button class="cs-vbt" data-s="flv-som" aria-label="Som">${lerLS("cs.flsom", true) ? I.som : I.semSom}</button>` : ""}
        <button class="cs-vbt" data-s="flv-fechar" aria-label="Fechar">${I.fechar}</button></div>
      <div class="cs-flv-palco"><div class="spin"></div></div>
      ${f.legenda ? `<p class="cs-flv-leg">${esc(f.legenda)}</p>` : ""}
      <div class="cs-flv-pe">${meu ? `${s.tipo === "flash" ? `<button class="cs-flv-bt" data-s="flv-vistos">${I.olho}<span id="flv-nv">Visto por…</span></button><button class="cs-flv-bt" data-s="flv-destacar">${I.estrela}<span>Destacar</span></button>` : ""}
          <button class="cs-flv-bt" data-s="flv-apagar">${I.lixo}<span>${s.tipo === "destaque" ? "Remover" : "Apagar"}</span></button>`
        : s.tipo === "flash" ? `<input class="in cs-flv-resp" id="flv-resp" maxlength="500" placeholder="Responder a ${esc((p.nome || "").split(" ")[0])}…" aria-label="Responder"><button class="cs-flv-bt env" data-s="flv-responder" aria-label="Enviar resposta">${I.enviar}</button>` : ""}</div>`;
    if (meu && s.tipo === "flash") fb.getCountFromServer(C(f.col, f.id, "vistos")).then(n => { const e = $("#flv-nv"); if (e) e.textContent = `Visto por ${n.data().count}`; }).catch(() => { });
    const meuItem = f;
    try {
      const blob = await baixar(f.col, f.id, "partes", f.mime || (f.tipo === "video" ? "video/webm" : "image/jpeg"));
      if (itemAtual() !== meuItem || !VW.el) return;
      const u = URL.createObjectURL(blob); VW.urls.push(u);
      const palco = VW.el.querySelector(".cs-flv-palco");
      if (f.tipo === "video") {
        palco.innerHTML = `<video playsinline preload="auto" src="${u}"></video>`; VW.midia = palco.querySelector("video");
        VW.midia.volume = f.musica ? 0.35 : 1; VW.midia.muted = f.semSomOriginal || false;
        await new Promise(r => { VW.midia.onloadedmetadata = r; VW.midia.onerror = r; setTimeout(r, 4000); });
        if (isFinite(VW.midia.duration) && VW.midia.duration > 0) VW.dur = Math.min(MAXDUR, VW.midia.duration);
        VW.midia.play().catch(() => { });
      } else palco.innerHTML = `<img src="${u}" alt="">`;
      if (f.musica) {
        try {
          const mb = await baixar(f.col, f.id, "som", f.musicaMime || "audio/webm"); if (itemAtual() !== meuItem) return;
          const mu = URL.createObjectURL(mb); VW.urls.push(mu); VW.aud = new Audio(mu); VW.aud.muted = !lerLS("cs.flsom", true); VW.aud.play().catch(() => { });
        } catch (e) { }
      }
      if (s.tipo === "flash") marcarVisto(f);
      VW.t0 = performance.now(); tique();
      preCarregar();
    } catch (e) {
      console.warn(e); const palco = VW.el && VW.el.querySelector(".cs-flv-palco");
      if (palco) palco.innerHTML = `<div class="cs-ap-erro"><b>${e && e.code === "not-found" ? "Este Flash não está mais disponível." : "Não foi possível carregar."}</b></div>`;
      VW.t0 = performance.now(); VW.dur = 3; tique();
    }
  }
  function preCarregar() {
    const s = VW.s, g = s.grupos[s.g], prox = g.itens[s.i + 1] || (s.grupos[s.g + 1] && s.grupos[s.g + 1].itens[0]);
    if (prox) baixar(prox.col, prox.id, "partes", prox.mime || "").catch(() => { });
  }
  function tique() {
    cancelAnimationFrame(VW.raf);
    const passo = () => {
      if (!VW.el) return;
      const agora = performance.now();
      if (!VW.pausa) { VW.gasto += (agora - VW.t0) / 1000; }
      VW.t0 = agora;
      const p = Math.min(1, VW.gasto / VW.dur), b = VW.el.querySelectorAll(".cs-flv-barras b")[VW.s.i]; if (b) b.style.width = (p * 100) + "%";
      if (p >= 1) return navegar(1);
      VW.raf = requestAnimationFrame(passo);
    };
    VW.raf = requestAnimationFrame(passo);
  }
  function pausar(sim) {
    VW.pausa = sim; if (VW.midia && VW.midia.play) sim ? VW.midia.pause() : VW.midia.play().catch(() => { });
    if (VW.aud) sim ? VW.aud.pause() : VW.aud.play().catch(() => { });
    if (VW.el) VW.el.classList.toggle("pausado", sim);
  }
  function navegar(d) {
    const s = VW.s; if (!s) return;
    const g = s.grupos[s.g];
    if (d > 0) { if (s.i < g.itens.length - 1) s.i++; else if (s.g < s.grupos.length - 1) { s.g++; s.i = 0; } else return fecharVisorFl(); }
    else { if (s.i > 0) s.i--; else if (s.g > 0) { s.g--; s.i = s.grupos[s.g].itens.length - 1; } else { VW.gasto = 0; return; } }
    mostrarItem();
  }
  function fecharVisorFl() {
    limparMidia(); if (VW.el) VW.el.remove(); VW.el = null; VW.s = null;
    if (window.CS_SEGURO) window.CS_SEGURO("flash", false);
    if (!document.querySelector(".cs-vis")) document.body.classList.remove("cs-vis-on");
    pintar();
  }
  X.acoes["flv-fechar"] = fecharVisorFl;
  X.acoes["flv-som"] = el => { const on = !lerLS("cs.flsom", true); gravarLS("cs.flsom", on); if (VW.aud) VW.aud.muted = !on; el.innerHTML = on ? I.som : I.semSom; };
  document.addEventListener("focusin", e => { if (e.target.id === "flv-resp") pausar(true); });
  document.addEventListener("keydown", e => {
    if (!VW.el) return;
    if (e.target.id === "flv-resp") { if (e.key === "Enter") { e.preventDefault(); X.acoes["flv-responder"](); } return; }
    if (e.key === "Escape") fecharVisorFl(); if (e.key === "ArrowRight") navegar(1); if (e.key === "ArrowLeft") navegar(-1);
  });
  X.acoes["flv-responder"] = async () => {
    const inp = $("#flv-resp"), t = inp ? inp.value.trim() : "", f = itemAtual(); if (!t || !f) return;
    if (ofensivo(t)) return toast("Mensagem não enviada: tem palavras ofensivas ou preconceituosas.");
    const id = [eu(), f.dono].sort().join("_");
    try {
      if (!SO.chats.some(c => c.id === id)) {
        const s = await fb.getDoc(D("chats", id)).catch(() => null);
        if (!s || !s.exists()) await fb.setDoc(D("chats", id), { tipo: "direto", membros: [eu(), f.dono].sort(), criadoPor: eu(), criadoEm: TS(), atualizadoEm: TS(), ultima: null });
        await new Promise(r => setTimeout(r, 400));
      }
      if (!SO.chats.some(c => c.id === id)) SO.chats.push({ id, tipo: "direto", membros: [eu(), f.dono].sort() });
      const ok = await enviarMsg(id, { texto: "↩ Flash: " + t });
      if (ok !== false) { inp.value = ""; inp.blur(); toast("Resposta enviada."); pausar(false); }
    } catch (e) { toast("Não foi possível responder: a pessoa pode aceitar mensagens só de quem ela segue."); }
  };
  X.acoes["flv-vistos"] = async () => {
    const f = itemAtual(); if (!f) return; pausar(true);
    try {
      const s = await fb.getDocs(C(f.col, f.id, "vistos"));
      const l = s.docs.map(d => d.id);
      window.abrirSheet(`<div class="sheet-h"><h2>Visto por ${l.length}</h2></div>${l.length ? `<div class="cs-menu">${l.map(u => { const p = P(u); return `<button data-s="ver-perfil" data-id="${esc(u)}">${av(p, 40, u)}<span><b>${esc(p.nome)}</b><small>@${esc(p.usuario || "")}</small></span></button>`; }).join("")}</div>` : `<p class="muted">Ninguém viu ainda.</p>`}`);
    } catch (e) { toast(msgErro(e)); }
  };
  X.acoes["flv-apagar"] = async () => {
    const f = itemAtual(), s = VW.s; if (!f) return; pausar(true);
    window.abrirSheet(`<div class="sheet-h"><h2>${s.tipo === "destaque" ? "Remover este destaque?" : "Apagar este Flash?"}</h2></div>
      <button class="btn perigo cs-grande" data-s="flv-apagar-ok">${I.lixo} ${s.tipo === "destaque" ? "Remover" : "Apagar"}</button><button class="btn ghost" data-s="fechar">Cancelar</button>`);
  };
  X.acoes["flv-apagar-ok"] = async () => {
    window.fecharSheet(); const f = itemAtual(), s = VW.s; if (!f) return;
    await apagarTudo(f.col, f.id);
    if (s.tipo === "destaque") FL.dest.set(eu(), (FL.dest.get(eu()) || []).filter(x => x.id !== f.id)); else FL.meus = FL.meus.filter(x => x.id !== f.id);
    const g = s.grupos[s.g]; g.itens = g.itens.filter(x => x.id !== f.id);
    toast(s.tipo === "destaque" ? "Destaque removido." : "Flash apagado.");
    if (!g.itens.length) return fecharVisorFl(); s.i = Math.min(s.i, g.itens.length - 1); mostrarItem();
  };
  X.acoes["flv-destacar"] = async () => {
    const f = itemAtual(); if (!f) return; pausar(true);
    const l = FL.dest.get(eu()) || (await fb.getDocs(fb.query(C("destaques"), fb.where("dono", "==", eu()))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []));
    if (l.length >= MAXDEST) return toast(`Você já tem ${MAXDEST} destaques. Remova um no seu perfil.`);
    if (l.some(d => d.origem === f.id)) return toast("Este Flash já está nos destaques.");
    const barra = M.barraEnvio("destaque");
    try {
      const midia = await baixar(f.col, f.id, "partes", f.mime), som = f.musica ? await baixar(f.col, f.id, "som", f.musicaMime).catch(() => null) : null;
      await gravar("destaques", { midia, mime: f.mime, tipo: f.tipo, dur: f.dur, legenda: f.legenda || "", thumb: f.thumb || null, som, somMime: f.musicaMime, semSomOriginal: !!f.semSomOriginal, origem: f.id }, barra);
      FL.dest.delete(eu()); toast("Adicionado aos Destaques do seu perfil.");
    } catch (e) { console.warn(e); toast(msgErro(e)); }
    barra(null); pausar(false);
  };

  /* ================= Criar Flash: câmera, efeitos, música, quem vê ================= */
  const TONS = [["natural", "Natural", ""], ["quente", "Quente", "sepia(.16) saturate(1.12)"], ["rosado", "Rosado", "hue-rotate(-6deg) saturate(1.16)"],
    ["bronze", "Bronze", "sepia(.28) saturate(1.28) contrast(1.04)"], ["frio", "Frio", "hue-rotate(8deg) saturate(.92) brightness(1.02)"], ["pb", "P&B", "grayscale(1) contrast(1.08)"]];
  const CR = { el: null, destino: "flash", stream: null, frente: true, modo: "foto", ef: lerLS("cs.flef", { suave: 0.35, luz: 0.2, tom: "natural" }),
    gravando: null, partes: [], tGrav: 0, timer: null, raf: 0, fonte: null, fonteTipo: null, blob: null, musica: null, legenda: "", publico: null, para: [], somOriginal: true, cv: null };
  function filtroDe(ef, extra) {
    const luz = ef.luz ? `brightness(${(1 + ef.luz * 0.22).toFixed(3)}) contrast(${(1 - ef.luz * 0.06).toFixed(3)})` : "";
    const tom = (TONS.find(t => t[0] === ef.tom) || TONS[0])[2];
    return [extra || "", luz, tom].join(" ").trim() || "none";
  }
  function dims(src) { return src.videoWidth ? [src.videoWidth, src.videoHeight] : [src.naturalWidth || src.width, src.naturalHeight || src.height]; }
  function cobrir(cx, src, W, H, espelho) {
    const [w, h] = dims(src); if (!w || !h) return;
    const k = Math.max(W / w, H / h), dw = w * k, dh = h * k;
    cx.save(); if (espelho) { cx.translate(W, 0); cx.scale(-1, 1); }
    cx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh); cx.restore();
  }
  /* efeitos leves: “suavizar pele” mistura uma cópia desfocada clareando só as partes mais escuras (marcas, rugas) */
  function comEfeito(cx, W, H, src, ef, espelho) {
    cx.filter = filtroDe(ef); cobrir(cx, src, W, H, espelho);
    if (ef.suave > 0.01) {
      const r = Math.max(1.5, Math.min(W, H) / 160) * (0.6 + ef.suave);
      cx.globalCompositeOperation = "lighten"; cx.globalAlpha = Math.min(0.75, ef.suave * 0.7);
      cx.filter = filtroDe(ef, `blur(${r.toFixed(1)}px)`); cobrir(cx, src, W, H, espelho);
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = ef.suave * 0.22; cobrir(cx, src, W, H, espelho);
      cx.globalAlpha = 1;
    }
    cx.filter = "none";
  }
  function abrirCriador(destino) {
    fecharCriador();
    Object.assign(CR, { destino, modo: "foto", fonte: null, fonteTipo: null, blob: null, musica: null, legenda: "", somOriginal: true, publico: destino === "flash" ? ((SO.eu && SO.eu.privFlash) || "todos") : null, para: [] });
    const el = document.createElement("div"); el.className = "cs-flc"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", destino === "flash" ? "Novo Flash" : "Novo destaque");
    document.body.appendChild(el); CR.el = el; document.body.classList.add("cs-vis-on");
    telaCamera();
  }
  function fecharCriador() {
    pararCamera(); cancelAnimationFrame(CR.raf); clearInterval(CR.timer);
    if (CR.fonteUrl) URL.revokeObjectURL(CR.fonteUrl); CR.fonteUrl = null;
    if (CR.prevAud) { CR.prevAud.pause(); CR.prevAud = null; }
    if (CR.el) CR.el.remove(); CR.el = null;
    if (!document.querySelector(".cs-vis,.cs-flv")) document.body.classList.remove("cs-vis-on");
  }
  function pararCamera() { if (CR.stream) CR.stream.getTracks().forEach(t => t.stop()); CR.stream = null; if (CR.gravando) { try { CR.gravando.stop(); } catch (e) { } CR.gravando = null; } }
  function painelEfeitos() {
    return `<div class="cs-flc-ef">
      <div class="cs-flc-tons">${TONS.map(([k, n]) => `<button data-s="flc-tom" data-v="${k}" aria-pressed="${CR.ef.tom === k}">${n}</button>`).join("")}</div>
      <label>Suavizar pele<input type="range" id="flc-suave" min="0" max="100" value="${Math.round(CR.ef.suave * 100)}"></label>
      <label>Iluminar rosto<input type="range" id="flc-luz" min="0" max="100" value="${Math.round(CR.ef.luz * 100)}"></label></div>`;
  }
  async function telaCamera() {
    const el = CR.el; if (!el) return;
    el.innerHTML = `<div class="cs-flc-top"><button class="cs-vbt" data-s="flc-fechar" aria-label="Fechar">${I.fechar}</button><b>${CR.destino === "flash" ? "Novo Flash" : "Novo destaque"}</b>
        <button class="cs-vbt" data-s="flc-virar" aria-label="Trocar câmera">${I.virar}</button></div>
      <div class="cs-flc-palco"><canvas id="flc-cv"></canvas><div class="cs-flc-sem" id="flc-sem" hidden><b>Câmera indisponível</b><span>Escolha uma foto ou vídeo da galeria.</span></div><span class="cs-flc-rec" id="flc-rec" hidden></span></div>
      ${painelEfeitos()}
      <div class="cs-flc-baixo">
        <button class="cs-flc-gal" data-s="flc-galeria" aria-label="Escolher da galeria">${I.img}<small>Galeria</small></button>
        <button class="cs-flc-disp ${CR.modo}" data-s="flc-disparar" id="flc-disp" aria-label="${CR.modo === "foto" ? "Tirar foto" : "Gravar vídeo"}"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="aro"/><circle cx="50" cy="50" r="46" class="prog" id="flc-prog"/></svg><i></i></button>
        <div class="seg cs-flc-modo"><button data-s="flc-modo" data-v="foto" aria-pressed="${CR.modo === "foto"}">Foto</button><button data-s="flc-modo" data-v="video" aria-pressed="${CR.modo === "video"}">Vídeo</button></div>
      </div>`;
    CR.cv = el.querySelector("#flc-cv");
    try {
      if (!CR.stream) CR.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CR.frente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      try { CR.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CR.frente ? "user" : "environment" }, audio: false }); } catch (e2) { CR.stream = null; }
    }
    if (!CR.el) { pararCamera(); return; }
    if (!CR.stream) { el.querySelector("#flc-sem").hidden = false; return; }
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream(CR.stream.getVideoTracks()); await v.play().catch(() => { });
    CR.fonte = v; CR.fonteTipo = "camera";
    const desenhar = () => {
      if (!CR.el || CR.fonte !== v) return;
      const [w, h] = dims(v);
      if (w) {
        const cv = CR.cv, alvoH = Math.min(1280, Math.max(w, h)), W = Math.round(alvoH * 9 / 16 / 2) * 2, H = alvoH;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        comEfeito(cv.getContext("2d"), W, H, v, CR.ef, CR.frente);
      }
      CR.raf = requestAnimationFrame(desenhar);
    };
    desenhar();
  }
  X.acoes["flc-fechar"] = () => { if (CR.gravando) return; fecharCriador(); };
  X.acoes["flc-virar"] = async () => { if (CR.gravando) return; CR.frente = !CR.frente; pararCamera(); telaCamera(); };
  X.acoes["flc-modo"] = el => {
    if (CR.gravando) return; CR.modo = el.dataset.v;
    el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
    const d = $("#flc-disp"); if (d) { d.className = "cs-flc-disp " + CR.modo; d.setAttribute("aria-label", CR.modo === "foto" ? "Tirar foto" : "Gravar vídeo"); }
  };
  X.acoes["flc-tom"] = el => { CR.ef.tom = el.dataset.v; gravarLS("cs.flef", CR.ef); el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el))); redesenharPrevia(); };
  document.addEventListener("input", e => {
    if (e.target.id === "flc-suave") { CR.ef.suave = e.target.value / 100; gravarLS("cs.flef", CR.ef); redesenharPrevia(); }
    if (e.target.id === "flc-luz") { CR.ef.luz = e.target.value / 100; gravarLS("cs.flef", CR.ef); redesenharPrevia(); }
    if (e.target.id === "flc-mus-ini" && CR.musica) { CR.musica.inicio = +e.target.value; const t = $("#flc-mus-t"); if (t) t.textContent = "começa em " + mmss(CR.musica.inicio); if (CR.prevAud) { CR.prevAud.currentTime = CR.musica.inicio; } }
    if (e.target.id === "flc-leg") CR.legenda = e.target.value;
  });
  X.acoes["flc-disparar"] = async () => {
    if (!CR.fonte || CR.fonteTipo !== "camera") return toast("Câmera indisponível. Use a galeria.");
    if (CR.modo === "foto") {
      const b = await new Promise(r => CR.cv.toBlob(r, "image/jpeg", 0.88));
      CR.fotoPronta = true; usarFoto(b, true); return;
    }
    if (CR.gravando) { CR.gravando.stop(); return; }
    /* vídeo: grava o quadro já com os efeitos + o som do microfone */
    const faixas = [...CR.cv.captureStream(30).getVideoTracks(), ...CR.stream.getAudioTracks()];
    const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(t => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(new MediaStream(faixas), { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1200000, audioBitsPerSecond: 64000 });
    CR.partes = []; rec.ondataavailable = e => { if (e.data && e.data.size) CR.partes.push(e.data); };
    rec.onstop = () => {
      clearInterval(CR.timer); CR.gravando = null;
      const dur = (Date.now() - CR.tGrav) / 1000, b = new Blob(CR.partes, { type: (mime || "video/webm").split(";")[0] });
      if (dur < 1) return toast("Vídeo muito curto."); usarVideo(b, Math.min(MAXDUR, dur), true);
    };
    CR.gravando = rec; CR.tGrav = Date.now(); rec.start(500);
    const d = $("#flc-disp"); d.classList.add("gravando"); const rc = $("#flc-rec"); rc.hidden = false;
    const prog = $("#flc-prog"), L = 2 * Math.PI * 46; prog.style.strokeDasharray = L;
    CR.timer = setInterval(() => {
      const t = (Date.now() - CR.tGrav) / 1000; rc.textContent = "● " + mmss(t) + " / 0:30"; prog.style.strokeDashoffset = L * (1 - t / MAXDUR);
      if (t >= MAXDUR) rec.stop();
    }, 200);
  };
  X.acoes["flc-galeria"] = async () => {
    if (CR.gravando) return;
    const [f] = await M.escolher("image/*,video/*", false); if (!f || !CR.el) return;
    if (f.type.startsWith("video/")) {
      const info = await M.miniVideo(f).catch(() => null);
      usarVideo(f, info ? info.dur : 0, false);
    } else usarFoto(f, false);
  };
  /* ---------- edição ---------- */
  async function usarFoto(blob, jaComEfeito) {
    pararCamera(); cancelAnimationFrame(CR.raf);
    const url = URL.createObjectURL(blob); const img = await M.carregarImg(url);
    if (CR.fonteUrl) URL.revokeObjectURL(CR.fonteUrl); CR.fonteUrl = url;
    Object.assign(CR, { fonte: img, fonteTipo: "foto", jaComEfeito, blob, dur: 6 });
    telaEditar();
  }
  async function usarVideo(blob, dur, jaComEfeito) {
    pararCamera(); cancelAnimationFrame(CR.raf);
    const url = URL.createObjectURL(blob), v = document.createElement("video"); v.src = url; v.playsInline = true; v.loop = true; v.muted = false; v.preload = "auto";
    if (CR.fonteUrl) URL.revokeObjectURL(CR.fonteUrl); CR.fonteUrl = url;
    await new Promise(r => { v.onloadedmetadata = r; v.onerror = r; setTimeout(r, 6000); });
    let d = isFinite(v.duration) && v.duration > 0 ? v.duration : dur;
    Object.assign(CR, { fonte: v, fonteTipo: "video", jaComEfeito, blob, dur: Math.min(MAXDUR, d || MAXDUR), durTotal: d || 0, inicioVideo: 0 });
    telaEditar();
  }
  function textoPublico() {
    return { todos: "Todos", seguindo: "Só quem eu sigo", escolher: `${CR.para.length} pessoa${CR.para.length === 1 ? "" : "s"} escolhida${CR.para.length === 1 ? "" : "s"}` }[CR.publico] || "Todos";
  }
  function telaEditar() {
    const el = CR.el; if (!el) return;
    const video = CR.fonteTipo === "video", longo = video && CR.durTotal > MAXDUR + 0.5;
    el.innerHTML = `<div class="cs-flc-top"><button class="cs-vbt" data-s="flc-refazer" aria-label="Voltar para a câmera">${I.ant}</button><b>${video ? "Vídeo" : "Foto"}</b>
        <button class="cs-vbt" data-s="flc-fechar" aria-label="Fechar">${I.fechar}</button></div>
      <div class="cs-flc-palco"><canvas id="flc-cv"></canvas></div>
      ${CR.jaComEfeito ? "" : painelEfeitos()}
      <div class="cs-flc-ed">
        ${longo ? `<label class="cs-flc-linha">${I.tela}<span>Trecho de 30 s · começa em <b id="flc-vini-t">0:00</b></span><input type="range" id="flc-vini" min="0" max="${Math.floor(CR.durTotal - MAXDUR)}" value="0"></label>` : ""}
        <button class="cs-flc-linha" data-s="flc-musica">${I.musica}<span>${CR.musica ? `<b>${esc(CR.musica.nome)}</b> <small id="flc-mus-t">começa em ${mmss(CR.musica.inicio)}</small>` : "Adicionar música ou som do celular"}</span>${CR.musica ? `<i data-s="flc-mus-tirar" role="button" aria-label="Tirar música">${I.fechar}</i>` : ""}</button>
        ${CR.musica ? `<input type="range" id="flc-mus-ini" min="0" max="${Math.max(0, Math.floor((CR.musica.dur || 0) - CR.dur))}" value="${CR.musica.inicio}" aria-label="Início da música">` : ""}
        ${video ? `<button class="cs-flc-linha" data-s="flc-somorig">${CR.somOriginal ? I.som : I.semSom}<span>Som do vídeo: <b>${CR.somOriginal ? "ligado" : "desligado"}</b></span></button>` : ""}
        <input class="in" id="flc-leg" maxlength="200" placeholder="Escreva uma legenda (opcional)" value="${esc(CR.legenda)}">
        ${CR.destino === "flash" ? `<button class="cs-flc-linha" data-s="flc-publico">${I.pessoas}<span>Quem vê: <b>${esc(textoPublico())}</b></span>${I.prox}</button>` : ""}
        <button class="btn primary cs-grande" data-s="flc-publicar">${CR.destino === "flash" ? `${I.flash} Publicar Flash` : `${I.estrela} Salvar nos Destaques`}</button>
        ${CR.destino === "flash" ? `<small class="muted cs-centro">Some depois de 24 horas.</small>` : ""}
      </div>`;
    CR.cv = el.querySelector("#flc-cv");
    const src = CR.fonte, [w, h] = dims(src), k = Math.min(1, 1280 / Math.max(w, h));
    CR.cv.width = Math.round(w * k / 2) * 2 || 2; CR.cv.height = Math.round(h * k / 2) * 2 || 2;
    if (video) {
      src.currentTime = CR.inicioVideo || 0; src.play().catch(() => { });
      const loop = () => {
        if (!CR.el || CR.fonte !== src) return;
        if (src.currentTime > (CR.inicioVideo || 0) + CR.dur) src.currentTime = CR.inicioVideo || 0;
        desenharPrevia(); CR.raf = requestAnimationFrame(loop);
      };
      loop();
    } else desenharPrevia();
    if (CR.musica) tocarPreviaMusica();
  }
  function desenharPrevia() {
    if (!CR.cv || !CR.fonte || CR.fonteTipo === "camera") return;
    const cx = CR.cv.getContext("2d");
    if (CR.jaComEfeito) { cx.filter = "none"; cobrir(cx, CR.fonte, CR.cv.width, CR.cv.height, false); }
    else comEfeito(cx, CR.cv.width, CR.cv.height, CR.fonte, CR.ef, false);
  }
  function redesenharPrevia() { if (CR.fonteTipo === "foto") desenharPrevia(); }
  document.addEventListener("input", e => {
    if (e.target.id === "flc-vini" && CR.fonteTipo === "video") { CR.inicioVideo = +e.target.value; CR.fonte.currentTime = CR.inicioVideo; const t = $("#flc-vini-t"); if (t) t.textContent = mmss(CR.inicioVideo); }
  });
  X.acoes["flc-refazer"] = () => { if (CR.prevAud) { CR.prevAud.pause(); CR.prevAud = null; } if (CR.fonte && CR.fonte.pause) CR.fonte.pause(); CR.fonte = null; telaCamera(); };
  X.acoes["flc-somorig"] = () => { CR.somOriginal = !CR.somOriginal; if (CR.fonte) CR.fonte.muted = !CR.somOriginal; telaEditar(); };
  X.acoes["flc-musica"] = async (el, ev) => {
    if (ev && ev.target.closest("[data-s='flc-mus-tirar']")) return X.acoes["flc-mus-tirar"]();
    const [f] = await M.escolher("audio/*", false); if (!f || !CR.el) return;
    const u = URL.createObjectURL(f), a = new Audio(u);
    await new Promise(r => { a.onloadedmetadata = r; a.onerror = r; setTimeout(r, 5000); });
    URL.revokeObjectURL(u);
    if (!isFinite(a.duration) || !a.duration) return toast("Não foi possível usar este arquivo de som.");
    CR.musica = { arq: f, nome: (f.name || "Música").replace(/\.\w+$/, "").slice(0, 60), dur: a.duration, inicio: a.duration > 60 ? Math.floor(a.duration * 0.3) : 0 };
    telaEditar();
  };
  X.acoes["flc-mus-tirar"] = () => { if (CR.prevAud) { CR.prevAud.pause(); CR.prevAud = null; } CR.musica = null; telaEditar(); };
  function tocarPreviaMusica() {
    if (CR.prevAud) CR.prevAud.pause();
    const u = URL.createObjectURL(CR.musica.arq), a = new Audio(u); CR.prevAud = a; a.currentTime = CR.musica.inicio; a.volume = 0.8;
    a.ontimeupdate = () => { if (a.currentTime > CR.musica.inicio + CR.dur) a.currentTime = CR.musica.inicio; };
    a.play().catch(() => { });
    if (CR.fonte && CR.fonteTipo === "video") CR.fonte.volume = 0.35;
  }
  X.acoes["flc-publico"] = () => {
    const seg = [...(SO.seguindo || [])];
    window.abrirSheet(`<div class="sheet-h"><h2>Quem vê este Flash</h2></div><div class="cs-menu">
      <button data-s="flc-pub" data-v="todos" aria-pressed="${CR.publico === "todos"}">${I.pessoas}<span><b>Todos</b><small>Quem segue você e quem abrir o seu perfil</small></span>${CR.publico === "todos" ? I.check : ""}</button>
      <button data-s="flc-pub" data-v="seguindo" aria-pressed="${CR.publico === "seguindo"}">${I.olho}<span><b>Só quem eu sigo</b><small>${seg.length} pessoa${seg.length === 1 ? "" : "s"}</small></span>${CR.publico === "seguindo" ? I.check : ""}</button></div>
      <h3 class="cs-clip-h">Ou escolha as pessoas</h3>
      <div class="cs-flc-pessoas">${pessoasParaEscolher().map(u => { const p = P(u); return `<label class="cs-aceite"><input type="checkbox" class="flc-pp" value="${esc(u)}" ${CR.para.includes(u) ? "checked" : ""}>${av(p, 32, u)}<span>${esc(p.nome)}</span></label>`; }).join("") || `<p class="small muted">Siga colegas ou converse com eles para escolher aqui.</p>`}</div>
      <button class="btn primary" data-s="flc-pub-escolher">Usar as pessoas marcadas</button>`);
  };
  function pessoasParaEscolher() {
    const s = new Set(SO.seguindo || []);
    SO.chats.forEach(c => { if (c.tipo === "direto") (c.membros || []).forEach(m => { if (m !== eu()) s.add(m); }); });
    return [...s].filter(u => !SO.bloqueados.has(u)).slice(0, 200);
  }
  X.acoes["flc-pub"] = el => { CR.publico = el.dataset.v; CR.para = []; window.fecharSheet(); telaEditar(); };
  X.acoes["flc-pub-escolher"] = () => {
    const l = [...document.querySelectorAll(".flc-pp:checked")].map(i => i.value);
    if (!l.length) return toast("Marque pelo menos uma pessoa.");
    CR.publico = "escolher"; CR.para = l; window.fecharSheet(); telaEditar();
  };
  /* recorta a música no trecho escolhido (grava em tempo real, leve: ~60 kbps) */
  async function cortarMusica(arq, inicio, dur, onProg) {
    const u = URL.createObjectURL(arq), a = new Audio(u); a.preload = "auto";
    const ac = new (window.AudioContext || window.webkitAudioContext)(), dest = ac.createMediaStreamDestination();
    try {
      await new Promise(r => { a.onloadedmetadata = r; a.onerror = r; });
      ac.createMediaElementSource(a).connect(dest); await ac.resume().catch(() => { });
      a.currentTime = inicio; await new Promise(r => { a.onseeked = r; setTimeout(r, 2000); });
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find(t => MediaRecorder.isTypeSupported(t)) || "";
      const rec = new MediaRecorder(dest.stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 64000 }), partes = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
      const fim = new Promise(r => rec.onstop = r);
      rec.start(500); await a.play();
      const t0 = Date.now();
      await new Promise(r => { const iv = setInterval(() => { const t = (Date.now() - t0) / 1000; if (onProg) onProg(t / dur); if (t >= dur || a.ended) { clearInterval(iv); r(); } }, 200); });
      a.pause(); rec.stop(); await fim;
      return { blob: new Blob(partes, { type: (mime || "audio/webm").split(";")[0] }), mime: (mime || "audio/webm").split(";")[0] };
    } finally { try { ac.close(); } catch (e) { } URL.revokeObjectURL(u); }
  }
  async function miniatura(fonte) { const cv = document.createElement("canvas"), [w, h] = dims(fonte), k = 200 / Math.max(w, h); cv.width = Math.round(w * k) || 1; cv.height = Math.round(h * k) || 1; cv.getContext("2d").drawImage(fonte, 0, 0, cv.width, cv.height); const u = cv.toDataURL("image/jpeg", 0.55); cv.width = cv.height = 0; return u; }
  async function gravar(col, o, barra) {
    const ref = fb.doc(C(col)), agora = Date.now();
    const doc = { dono: eu(), tipo: o.tipo, mime: o.mime, dur: Math.round(o.dur || 0), legenda: o.legenda || "", thumb: o.thumb || null, musica: !!o.som, musicaMime: o.som ? (o.somMime || o.som.type) : null,
      semSomOriginal: !!o.semSomOriginal, tamanho: o.midia.size, partes: Math.max(1, Math.ceil(o.midia.size / PARTE)), criado: agora, criadoEm: TS(), ...(o.origem ? { origem: o.origem } : {}) };
    if (col !== "destaques") doc.expira = agora + DIA;
    if (col === "flashesPriv") doc.para = o.para;
    await fb.setDoc(ref, doc);
    await subirPartes(col, ref.id, "partes", o.midia, f => barra && barra(f * (o.som ? 0.85 : 1)));
    if (o.som) await subirPartes(col, ref.id, "som", o.som, f => barra && barra(0.85 + f * 0.15));
    return { id: ref.id, col, ...doc };
  }
  X.acoes["flc-publicar"] = async () => {
    if (!CR.fonte || CR.publicando) return;
    const leg = ($("#flc-leg") || {}).value || ""; if (leg && ofensivo(leg)) return toast("A legenda tem palavras não permitidas.");
    CR.publicando = true;
    if (CR.prevAud) { CR.prevAud.pause(); }
    const video = CR.fonteTipo === "video";
    if (video) CR.fonte.pause();
    const barra = M.barraEnvio(CR.destino === "flash" ? "Flash" : "destaque"), txt = document.querySelector(".cs-up span");
    const fase = t => { if (txt) txt.textContent = t; };
    try {
      let midia, mime, dur = CR.dur, thumb = await miniatura(CR.fonte);
      if (!video) {
        const cv = document.createElement("canvas"), [w, h] = dims(CR.fonte), k = Math.min(1, 1440 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        const cx = cv.getContext("2d"); if (CR.jaComEfeito) cx.drawImage(CR.fonte, 0, 0, cv.width, cv.height); else comEfeito(cx, cv.width, cv.height, CR.fonte, CR.ef, false);
        midia = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85)); mime = "image/jpeg"; cv.width = cv.height = 0;
        dur = CR.musica ? Math.min(MAXDUR, 15) : 6;
      } else {
        const precisa = !CR.jaComEfeito || CR.durTotal > MAXDUR + 0.5 || CR.blob.size > 12e6;
        if (precisa) {
          fase("Preparando o vídeo…");
          midia = await M.recodificar(CR.blob, { maxLado: 960, bps: 1100000, inicio: CR.inicioVideo || 0, dur: MAXDUR, somOriginal: true,
            efeito: CR.jaComEfeito ? null : (cx, W, H, v) => comEfeito(cx, W, H, v, CR.ef, false), onProg: f => barra(f * 0.5) });
        } else midia = CR.blob;
        mime = midia.type || "video/webm"; dur = Math.min(MAXDUR, CR.dur);
      }
      let som = null, somMime = null;
      if (CR.musica) { fase("Preparando a música…"); const r = await cortarMusica(CR.musica.arq, CR.musica.inicio, dur, f => barra(0.5 + f * 0.2)); som = r.blob; somMime = r.mime; }
      fase(CR.destino === "flash" ? "Publicando o Flash…" : "Salvando o destaque…");
      if (CR.destino === "destaque") {
        await gravar("destaques", { midia, mime, tipo: video ? "video" : "foto", dur, legenda: leg.trim(), thumb, som, somMime, semSomOriginal: video && !CR.somOriginal }, f => barra(0.7 + f * 0.3));
        FL.dest.delete(eu()); toast("Salvo nos Destaques do seu perfil.");
      } else {
        const priv = CR.publico !== "todos";
        const para = CR.publico === "seguindo" ? [...(SO.seguindo || [])].slice(0, 400) : CR.publico === "escolher" ? CR.para : null;
        if (priv && (!para || !para.length)) throw { msg: CR.publico === "seguindo" ? "Você ainda não segue ninguém. Escolha “Todos” ou marque pessoas." : "Escolha quem vai ver." };
        const f = await gravar(priv ? "flashesPriv" : "flashes", { midia, mime, tipo: video ? "video" : "foto", dur, legenda: leg.trim(), thumb, som, somMime, semSomOriginal: video && !CR.somOriginal, para }, f => barra(0.7 + f * 0.3));
        FL.meus.push(f); toast("Flash publicado! Fica 24 horas.");
      }
      barra(null); CR.publicando = false; fecharCriador(); pintar();
    } catch (e) { console.warn(e); barra(null); CR.publicando = false; toast(e && e.msg || msgErro(e)); if (video && CR.fonte) CR.fonte.play().catch(() => { }); }
  };

  /* ================= Configurações: quem vê meus Flashes ================= */
  X.configPriv.push(p => `<div class="cs-linha"><span class="cs-lic">${I.flash}</span><span><b>Quem vê meus Flashes</b><small>Dá para mudar em cada Flash</small>
    <span class="seg cs-seg-mini"><button data-s="priv-flash" data-v="todos" aria-pressed="${(p.privFlash || "todos") === "todos"}">Todos</button><button data-s="priv-flash" data-v="seguindo" aria-pressed="${p.privFlash === "seguindo"}">Só quem eu sigo</button></span></span></div>`);
  X.acoes["priv-flash"] = async el => { try { await fb.updateDoc(D("users", eu()), { privFlash: el.dataset.v }); } catch (e) { toast(msgErro(e)); } };

  /* ================= Voltar (Android) ================= */
  const voltarAnt = window.SENOV_voltar;
  window.SENOV_voltar = function () {
    if (CR.el) { if (!CR.gravando && !CR.publicando) fecharCriador(); return true; }
    if (VW.el) { fecharVisorFl(); return true; }
    return voltarAnt ? voltarAnt() : false;
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden && VW.el) pausar(true); });

  const css = document.createElement("style");
  css.textContent = `
.cs-fl-faixa{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:4px 2px 10px;margin:0 -2px}
.cs-fl-faixa::-webkit-scrollbar{display:none}
.cs-fl-it{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:5px;font:inherit;font-size:.8rem;font-weight:600;color:var(--ink);cursor:pointer;flex:none;width:70px;padding:0}
.cs-fl-it>span:last-child{max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-fl-anel{--t:58px;display:grid;place-items:center;padding:3px;border-radius:50%;border:0;cursor:pointer;background:conic-gradient(from 200deg,#FFC83D,#FF5C8A,#7C5CFF,#2447C6,#FFC83D);width:calc(var(--t) + 8px);height:calc(var(--t) + 8px)}
.cs-fl-anel.visto{background:var(--line)}
.cs-fl-anel>.cs-av{box-shadow:0 0 0 2.5px var(--bg)}
.cs-perfil-av .cs-fl-anel{margin:0 auto}
.cs-fl-novo{position:relative;display:grid;place-items:center;width:66px;height:66px}
.cs-fl-novo i{position:absolute;right:0;bottom:0;width:24px;height:24px;border-radius:50%;background:var(--primary);color:var(--primary-ink);display:grid;place-items:center;box-shadow:0 0 0 2.5px var(--bg)}
.cs-fl-novo i svg{width:16px;height:16px}
.cs-dest h2{display:flex;align-items:center;gap:6px}.cs-dest h2 svg{width:20px;height:20px;color:#E0A11B}
.cs-dest-l{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;align-items:center}
.cs-dest-it{flex:none;width:76px;height:116px;border-radius:14px;border:0;padding:0;overflow:hidden;position:relative;background:var(--surface-2);cursor:pointer;display:grid;place-items:center;color:var(--muted)}
.cs-dest-it img{width:100%;height:100%;object-fit:cover}
.cs-dest-it>span svg,.cs-dest-it.novo svg{width:28px;height:28px}
.cs-dest-it>i{position:absolute;right:6px;bottom:6px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;display:grid;place-items:center}
.cs-dest-it>i svg{width:12px;height:12px}
.cs-dest-it.novo{border:2px dashed var(--line);background:none;display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:.78rem}
.cs-flv{position:fixed;inset:0;z-index:92;background:#000;color:#fff;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none}
.cs-flv-barras{display:flex;gap:4px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 4px}
.cs-flv-barras i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}
.cs-flv-barras b{display:block;height:100%;background:#fff}
.cs-flv-top{display:flex;align-items:center;gap:10px;padding:4px 8px 6px 12px;z-index:2}
.cs-flv-top>span:not(.cs-av){flex:1;display:flex;flex-direction:column;min-width:0}.cs-flv-top>.cs-av{flex:none}.cs-flv-top small{opacity:.8}
.cs-flv-palco{flex:1;min-height:0;display:grid;place-items:center;position:relative}
.cs-flv-palco img,.cs-flv-palco video{max-width:100%;max-height:100%;object-fit:contain;pointer-events:none}
.cs-flv-leg{position:absolute;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));text-align:center;font-size:1.05rem;font-weight:600;text-shadow:0 1px 4px #000;margin:0;pointer-events:none}
.cs-flv-pe{display:flex;align-items:center;gap:8px;padding:10px 10px calc(12px + env(safe-area-inset-bottom,0px))}
.cs-flv-resp{flex:1;background:rgba(255,255,255,.12)!important;color:#fff!important;border-color:rgba(255,255,255,.3)!important;border-radius:24px!important}
.cs-flv-resp::placeholder{color:rgba(255,255,255,.75)}
.cs-flv-bt{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:99px;display:flex;align-items:center;gap:6px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:46px}
.cs-flv-bt svg{width:20px;height:20px}
.cs-flv-bt.env{width:48px;justify-content:center;padding:0;background:var(--primary);color:var(--primary-ink)}
.cs-flv.pausado .cs-flv-barras,.cs-flv.pausado .cs-flv-top{opacity:.4}
.cs-flc{position:fixed;inset:0;z-index:92;background:#000;color:#fff;display:flex;flex-direction:column;overflow-y:auto}
.cs-flc-top{display:flex;align-items:center;gap:8px;padding:calc(6px + env(safe-area-inset-top,0px)) 8px 6px}
.cs-flc-top b{flex:1;text-align:center}
.cs-flc-palco{flex:1;min-height:42vh;display:grid;place-items:center;position:relative;padding:0 8px}
.cs-flc-palco canvas{max-width:100%;max-height:58vh;border-radius:16px;background:#111}
.cs-flc-sem{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:20px}
.cs-flc-rec{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#E5484D;padding:4px 12px;border-radius:99px;font-weight:800;font-variant-numeric:tabular-nums}
.cs-flc-ef{display:flex;flex-direction:column;gap:6px;padding:8px 14px 0}
.cs-flc-ef label{display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600}
.cs-flc-ef input{flex:1;accent-color:#FFC83D}
.cs-flc-tons{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.cs-flc-tons button{flex:none;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;border-radius:99px;padding:7px 14px;font:inherit;font-weight:700;font-size:.85rem;cursor:pointer}
.cs-flc-tons button[aria-pressed="true"]{background:#fff;color:#000}
.cs-flc-baixo{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px))}
.cs-flc-gal{justify-self:start;border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:14px;width:62px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;font:inherit}
.cs-flc-gal svg{width:24px;height:24px}.cs-flc-gal small{font-size:.7rem}
.cs-flc-disp{width:84px;height:84px;border:0;background:none;position:relative;cursor:pointer;padding:0}
.cs-flc-disp svg{position:absolute;inset:0;transform:rotate(-90deg)}
.cs-flc-disp .aro{fill:none;stroke:#fff;stroke-width:6}
.cs-flc-disp .prog{fill:none;stroke:#E5484D;stroke-width:6;stroke-dasharray:0 999}
.cs-flc-disp i{position:absolute;inset:12px;border-radius:50%;background:#fff;transition:all .2s}
.cs-flc-disp.video i{background:#E5484D}
.cs-flc-disp.gravando i{inset:26px;border-radius:8px}
.cs-flc-modo{justify-self:end}
.cs-flc-modo button{color:#fff}
.cs-flc-ed{display:flex;flex-direction:column;gap:10px;padding:12px 14px calc(16px + env(safe-area-inset-bottom,0px))}
.cs-flc-linha{display:flex;align-items:center;gap:10px;border:0;background:rgba(255,255,255,.1);color:#fff;border-radius:14px;padding:12px;font:inherit;text-align:left;cursor:pointer;width:100%}
.cs-flc-linha>span{flex:1;min-width:0}.cs-flc-linha svg{width:22px;height:22px;flex:none}
.cs-flc-linha i{display:grid;place-items:center}
label.cs-flc-linha{flex-wrap:wrap}label.cs-flc-linha input{width:100%;accent-color:#FFC83D}
#flc-mus-ini{accent-color:#FFC83D}
.cs-flc-ed .in{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)}
.cs-flc-pessoas{display:flex;flex-direction:column;gap:6px;max-height:40vh;overflow:auto;margin-bottom:10px}
.cs-flc-pessoas .cs-aceite{align-items:center}
`;
  document.head.appendChild(css);
})();
