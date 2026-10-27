/* ChatMil — XFlesh: vídeos curtos em tela cheia, um por vez, puxando para cima (como o TikTok).
   - "Para você": mais recentes misturados com os mais curtidos/comentados/compartilhados;
     "Seguindo": só de quem você segue;
   - curtir (toque duplo ou coração), comentar, compartilhar; disco da música → página da faixa;
   - música do ChatMil com letra mostra o karaokê por cima do vídeo;
   - cartão "Artista em destaque" entre os vídeos (faixas com nível Destaque ou mais).
   O feed fica num painel fixo FORA do #main: o app redesenha o #main o tempo todo e isso
   não pode reiniciar o vídeo. Depende de social.js, social-midia.js, social-flash.js e social-artista.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext || !window.SOCIAL.ext.flash) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._, F = X.flash;
  const { SO, fb, D, C, TS, K, ic, esc, P, av, eu, pintar, abrirTela, topo, toast, msgErro, ofensivo } = A;
  const $ = s => document.querySelector(s);
  const I = {
    coracao: ic('<path d="M12 20s-7.5-4.6-9.3-9.2A5 5 0 0 1 12 6a5 5 0 0 1 9.3 4.8C19.5 15.4 12 20 12 20z"/>'),
    coment: ic('<path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5z"/>'),
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    nota: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    som: ic('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    semSom: ic('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>'),
    camera: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><path d="M12 10v6M9 13h6"/>'),
    play: ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>'),
    mais: ic('<path d="M12 5v14M5 12h14"/>'),
    pontos: ic('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    estrela: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>')
  };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + " mi" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + " mil" : String(n || 0);
  const XF = { pv: null, seg: null, modo: "pv", carregando: false, fim: { pv: false, seg: false }, em: 0, el: null, obs: null, ativo: null, video: null, aud: null, urls: new Map(),
    curti: new Map(), letras: new Map(), raf: 0, mudo: false, fixo: null, ultimoToque: 0, visivel: false };
  X.aoTrocarUsuario.push(() => { pararAtual(); XF.pv = null; XF.seg = null; XF.curti = new Map(); XF.fixo = null; if (XF.el) XF.el.querySelector("#xf-feed").innerHTML = ""; });

  /* ---------- dados ---------- */
  const doc2x = d => ({ id: d.id, col: "xflesh", ...d.data() });
  const pontuar = x => {
    const h = (Date.now() - (x.criado || 0)) / 3600e3;
    return ((x.nCurt || 0) * 2 + (x.nComent || 0) * 2 + (x.nComp || 0) * 3 + (SO.seguindo.has(x.dono) ? 6 : 0) + 4) / Math.pow(h + 2, 0.8) + Math.random() * 0.15;
  };
  async function carregar(maisAntigos) {
    if (XF.carregando || !eu()) return;
    const modo = XF.modo, atual = XF[modo] || [];
    if (maisAntigos && XF.fim[modo]) return;
    XF.carregando = true;
    try {
      const antes = maisAntigos && atual.length ? Math.min(...atual.map(x => x.criado || Date.now())) : null;
      let novos = [];
      if (modo === "seg") {
        const seg = [...SO.seguindo].filter(u => !SO.bloqueados.has(u)).slice(0, 150), lotes = [];
        for (let i = 0; i < seg.length; i += 30) lotes.push(seg.slice(i, i + 30));
        const rs = await Promise.all(lotes.map(l => fb.getDocs(fb.query(C("xflesh"), fb.where("dono", "in", l), fb.limit(40))).catch(() => ({ docs: [] }))));
        rs.forEach(s => s.docs.forEach(d => novos.push(doc2x(d))));
        novos.sort((a, b) => (b.criado || 0) - (a.criado || 0));
        if (antes) novos = novos.filter(x => (x.criado || 0) < antes);
        XF.fim.seg = true;
      } else {
        const q = antes ? fb.query(C("xflesh"), fb.where("criado", "<", antes), fb.orderBy("criado", "desc"), fb.limit(30))
          : fb.query(C("xflesh"), fb.orderBy("criado", "desc"), fb.limit(40));
        const s = await fb.getDocs(q);
        novos = s.docs.map(doc2x);
        if (novos.length < 20) XF.fim.pv = true;
        if (!antes) {
          /* os primeiros: mistura novidade e engajamento; os meus recém-publicados ficam em cima */
          const meus = novos.filter(x => x.dono === eu() && Date.now() - (x.criado || 0) < 600e3);
          const resto = novos.filter(x => !meus.includes(x)).sort((a, b) => pontuar(b) - pontuar(a));
          novos = [...meus, ...resto];
        }
      }
      novos = novos.filter(x => !SO.bloqueados.has(x.dono));
      const ids = new Set(atual.map(x => x.id));
      XF[modo] = antes ? [...atual, ...novos.filter(x => !ids.has(x.id))] : novos;
      XF.em = Date.now();
    } catch (e) { console.warn("xflesh", e); if (!XF[modo]) XF[modo] = []; }
    XF.carregando = false; desenhar(!maisAntigos);
  }
  const lista = () => XF.fixo ? XF.fixo.lista : (XF[XF.modo] || []);

  /* ---------- painel fixo ---------- */
  function montar() {
    if (XF.el) return XF.el;
    const el = document.createElement("div"); el.id = "xf-app"; el.className = "xf";
    el.innerHTML = `<div class="xf-top"><button class="xf-x" data-s="xf-sair-fixo" aria-label="Fechar" hidden>${I.x}</button>
        <div class="xf-modos"><button data-s="xf-modo" data-v="pv">Para você</button><button data-s="xf-modo" data-v="seg">Seguindo</button></div>
        <button class="xf-tbt" data-s="xf-mudo" aria-label="Som" id="xf-mudo">${I.som}</button></div>
      <div class="xf-feed" id="xf-feed"></div>
      <button class="xf-criar" data-s="xf-criar" aria-label="Criar XFlesh">${I.mais}</button>`;
    document.body.appendChild(el); XF.el = el;
    XF.obs = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= 0.6) ativar(e.target.dataset.id); });
    }, { root: el.querySelector("#xf-feed"), threshold: [0.6] });
    /* toque duplo curte; toque simples pausa */
    el.addEventListener("click", e => {
      if (e.target.closest("button,a,input,.xf-rail,.xf-info")) return;
      const it = e.target.closest(".xf-it"); if (!it || it.classList.contains("xf-art")) return;
      const agora = Date.now();
      if (agora - XF.ultimoToque < 300) { clearTimeout(XF.tt); XF.ultimoToque = 0; coracaoGrande(it, e); if (!XF.curti.get(it.dataset.id)) curtir(it.dataset.id); return; }
      XF.ultimoToque = agora;
      XF.tt = setTimeout(() => alternarPausa(), 300);
    });
    el.querySelector("#xf-feed").addEventListener("scroll", () => {
      const f = el.querySelector("#xf-feed"); if (!XF.fixo && f.scrollTop + f.clientHeight * 3 > f.scrollHeight) carregar(true);
    }, { passive: true });
    return el;
  }
  function posicionar() {
    const nav = $(".nav"), el = XF.el; if (!el || !nav) return;
    const r = nav.getBoundingClientRect(), lado = r.height > window.innerHeight * 0.6;
    el.style.left = lado ? r.width + "px" : "0px"; el.style.bottom = lado || XF.fixo ? "0px" : r.height + "px";
  }
  window.addEventListener("resize", () => posicionar());

  function itemHtml(x) {
    const p = P(x.dono), meu = x.dono === eu(), on = !!XF.curti.get(x.id), m = x.mus;
    return `<section class="xf-it" data-id="${esc(x.id)}">
      <div class="xf-fundo" ${x.thumb ? `style="background-image:url('${esc(x.thumb)}')"` : ""}></div>
      <div class="xf-midia" id="xfm-${esc(x.id)}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : ""}</div>
      <div class="xf-pausa">${I.play}</div>
      ${m && m.fonte === "chatmil" ? `<div class="xf-kar" id="xfk-${esc(x.id)}" hidden><span class="a"></span><span class="b"></span></div>` : ""}
      <div class="xf-rail">
        <button class="xf-av" data-s="ver-perfil" data-id="${esc(x.dono)}" aria-label="${esc(p.nome)}">${av(p, 48, x.dono)}${!meu && !SO.seguindo.has(x.dono) ? `<i data-s="xf-seguir" data-id="${esc(x.dono)}" role="button" aria-label="Seguir">${I.mais}</i>` : ""}</button>
        <button class="xf-b ${on ? "on" : ""}" data-s="xf-curtir" data-id="${esc(x.id)}" aria-pressed="${on}" aria-label="Curtir">${I.coracao}<span>${fmt(x.nCurt || 0)}</span></button>
        <button class="xf-b" data-s="xf-coment" data-id="${esc(x.id)}" aria-label="Comentários">${I.coment}<span>${fmt(x.nComent || 0)}</span></button>
        <button class="xf-b" data-s="xf-compart" data-id="${esc(x.id)}" aria-label="Compartilhar">${I.enviar}<span>${fmt(x.nComp || 0)}</span></button>
        ${meu ? `<button class="xf-b" data-s="xf-menu" data-id="${esc(x.id)}" aria-label="Opções">${I.pontos}</button>` : ""}
        ${m ? `<button class="xf-disco" data-s="xf-musica" data-id="${esc(x.id)}" aria-label="Música">${X.capaMusica ? X.capaMusica(m.fonte === "chatmil" ? { id: m.id, titulo: m.titulo, capa: capaDe(m) } : m, "xf-disco-c") : I.nota}</button>` : ""}
      </div>
      <div class="xf-info">
        <button class="xf-nome" data-s="ver-perfil" data-id="${esc(x.dono)}">@${esc(p.usuario || p.nome || "")}</button>
        ${x.legenda ? `<p class="xf-leg">${esc(x.legenda)}</p>` : ""}
        ${m ? `<button class="xf-mus" data-s="xf-musica" data-id="${esc(x.id)}">${I.nota}<span><span>${esc(m.titulo)} · ${esc(m.artista)}</span><span aria-hidden="true">${esc(m.titulo)} · ${esc(m.artista)}</span></span></button>` : x.musica ? `<span class="xf-mus">${I.nota}<span><span>Som original</span></span></span>` : ""}
      </div></section>`;
  }
  const capaDe = m => { const t = X.musicasChatMilCache && X.musicasChatMilCache(m.id); return t && t.capa || ""; };
  /* cartão de artista em destaque (nível 3+), a cada 7 vídeos */
  let destaques = [];
  function cartaoArtista(m, i) {
    return `<section class="xf-it xf-art" data-id="art-${esc(m.id)}-${i}">
      <div class="xf-art-in"><small>${I.estrela} Artista em destaque</small>
        <button class="xf-art-capa" data-s="faixa-abrir" data-id="${esc(m.id)}">${X.capaMusica ? X.capaMusica(m, "xf-art-img") : ""}</button>
        <h2>${esc(m.titulo)}</h2><p>${esc(m.artista)}</p>
        <button class="btn xf-art-bt" data-s="fx-usar-id" data-id="${esc(m.id)}">${I.camera} Criar com esta música</button>
        <button class="cs-link xf-art-ver" data-s="faixa-abrir" data-id="${esc(m.id)}">Ouvir</button></div></section>`;
  }
  function desenhar(doTopo) {
    const el = montar(), feed = el.querySelector("#xf-feed"), l = lista();
    el.querySelectorAll("[data-s=xf-modo]").forEach(b => b.setAttribute("aria-pressed", String(!XF.fixo && b.dataset.v === XF.modo)));
    el.querySelector(".xf-modos").hidden = !!XF.fixo; el.querySelector(".xf-x").hidden = !XF.fixo;
    el.querySelector("#xf-mudo").innerHTML = XF.mudo ? I.semSom : I.som;
    el.classList.toggle("fixo", !!XF.fixo);
    if (l == null) { feed.innerHTML = `<div class="xf-vazio"><div class="spin"></div></div>`; return; }
    if (!l.length) {
      pararAtual();
      feed.innerHTML = `<div class="xf-vazio">${I.camera}<b>${XF.modo === "seg" ? "Ninguém que você segue publicou ainda" : "Seja o primeiro"}</b><button class="btn primary" data-s="xf-criar">Criar XFlesh</button></div>`; return;
    }
    /* mantém os itens já desenhados (o vídeo não reinicia); só acrescenta os novos */
    const ja = new Map([...feed.querySelectorAll(".xf-it")].map(n => [n.dataset.id, n]));
    const html = [], ordem = [];
    l.forEach((x, i) => {
      ordem.push(x.id);
      if (!XF.fixo && i > 0 && i % 7 === 0 && destaques.length) { const m = destaques[(i / 7 - 1) % destaques.length]; ordem.splice(ordem.length - 1, 0, "art-" + m.id + "-" + i); }
    });
    if (doTopo || ordem.length < ja.size || [...ja.keys()].some((k, i) => ordem[i] !== k && !k.startsWith("art-"))) {
      XF.obs.disconnect(); pararAtual();
      feed.innerHTML = l.map((x, i) => (!XF.fixo && i > 0 && i % 7 === 0 && destaques.length ? cartaoArtista(destaques[(i / 7 - 1) % destaques.length], i) : "") + itemHtml(x)).join("");
      feed.scrollTop = 0;
      if (XF.fixo && XF.fixo.id) { const n = feed.querySelector(`[data-id="${CSS.escape(XF.fixo.id)}"]`); if (n) feed.scrollTop = n.offsetTop; }
    } else {
      const tem = new Set(ja.keys());
      const frag = l.filter(x => !tem.has(x.id)).map(itemHtml).join("");
      if (frag) feed.insertAdjacentHTML("beforeend", frag);
    }
    feed.querySelectorAll(".xf-it").forEach(n => XF.obs.observe(n));
  }

  /* ---------- tocar o item visível ---------- */
  function pararAtual() {
    cancelAnimationFrame(XF.raf);
    if (XF.video) { try { XF.video.pause(); } catch (e) { } }
    if (XF.aud) { try { XF.aud.pause(); } catch (e) { } XF.aud = null; }
    if (XF.ativo && XF.el) { const n = XF.el.querySelector(`[data-id="${CSS.escape(XF.ativo)}"]`); if (n) n.classList.remove("pausado"); }
    XF.video = null; XF.ativo = null;
  }
  function itemPorId(id) { return lista().find(x => x.id === id) || (XF.fixo && XF.fixo.lista.find(x => x.id === id)); }
  async function ativar(id) {
    if (!XF.visivel || XF.ativo === id) return;
    pararAtual();
    if (id.startsWith("art-")) return;
    const x = itemPorId(id); if (!x) return;
    XF.ativo = id;
    const n = XF.el.querySelector(`[data-id="${CSS.escape(id)}"]`), box = n && n.querySelector(".xf-midia");
    verCurtida(x);
    try {
      const blob = await F.baixar("xflesh", x.id, "partes", x.mime || (x.tipo === "video" ? "video/webm" : "image/jpeg"));
      if (XF.ativo !== id || !box) return;
      let u = XF.urls.get(id); if (!u) { u = URL.createObjectURL(blob); XF.urls.set(id, u); limparUrls(); }
      if (x.tipo === "video") {
        let v = box.querySelector("video");
        if (!v) { box.innerHTML = `<video playsinline loop preload="auto" src="${u}"></video>`; v = box.querySelector("video"); }
        XF.video = v; v.muted = XF.mudo || !!x.semSomOriginal; v.volume = x.mus || x.musica ? 0.35 : 1;
        v.currentTime = 0;
        await v.play().catch(e => { if (e && e.name === "NotAllowedError") { XF.mudo = true; v.muted = true; v.play().catch(() => { }); desenharMudo(); } });
      } else if (!box.querySelector("img.full")) box.innerHTML = `<img class="full" src="${u}" alt="">`;
      await tocarMusica(x);
      preCarregar(id);
    } catch (e) { console.warn(e); if (box && XF.ativo === id) box.innerHTML = `<div class="xf-erro">Indisponível</div>`; }
  }
  function limparUrls() { if (XF.urls.size <= 8) return; const [k, u] = XF.urls.entries().next().value; if (k !== XF.ativo) { URL.revokeObjectURL(u); XF.urls.delete(k); const v = XF.el && XF.el.querySelector(`#xfm-${CSS.escape(k)} video`); if (v) v.remove(); } }
  function preCarregar(id) {
    const l = lista(), i = l.findIndex(x => x.id === id), p = l[i + 1];
    if (p) F.baixar("xflesh", p.id, "partes", p.mime || "").catch(() => { });
  }
  async function tocarMusica(x) {
    const id = x.id; let u = null, ini = 0, dur = x.dur || 15;
    try {
      if (x.musica) u = URL.createObjectURL(await F.baixar("xflesh", x.id, "som", x.musicaMime || "audio/webm"));
      else if (x.mus) { u = x.mus.fonte === "chatmil" ? await X.urlMusica({ id: x.mus.id }) : x.mus.url; ini = x.mus.inicio || 0; }
    } catch (e) { return; }
    if (!u || XF.ativo !== id) return;
    const a = new Audio(u); XF.aud = a; a.muted = XF.mudo;
    a.addEventListener("loadedmetadata", () => { try { a.currentTime = ini; } catch (e) { } if (XF.ativo === id) a.play().catch(() => { }); }, { once: true });
    a.addEventListener("timeupdate", () => { if (a.currentTime > ini + Math.max(5, dur) + 0.3) { a.currentTime = ini; if (XF.video) XF.video.currentTime = 0; } });
    /* karaokê */
    if (x.mus && x.mus.fonte === "chatmil" && X.letraDe) {
      let l = XF.letras.get(x.mus.id); if (!l) { l = await X.letraDe(x.mus.id); XF.letras.set(x.mus.id, l); }
      const box = $(`#xfk-${CSS.escape(id)}`); if (!l.length || !box) return; box.hidden = false;
      const passo = () => {
        if (XF.ativo !== id || XF.aud !== a) return;
        const k = X.karaoke(l, a.currentTime);
        if (k) { box.querySelector(".a").textContent = k.a; box.querySelector(".a").style.setProperty("--f", (k.f * 100).toFixed(1) + "%"); box.querySelector(".b").textContent = k.b; }
        XF.raf = requestAnimationFrame(passo);
      };
      passo();
    }
  }
  function alternarPausa() {
    const n = XF.ativo && XF.el.querySelector(`[data-id="${CSS.escape(XF.ativo)}"]`); if (!n) return;
    const pausar = !n.classList.contains("pausado"); n.classList.toggle("pausado", pausar);
    if (XF.video) pausar ? XF.video.pause() : XF.video.play().catch(() => { });
    if (XF.aud) pausar ? XF.aud.pause() : XF.aud.play().catch(() => { });
  }
  function desenharMudo() { const b = $("#xf-mudo"); if (b) b.innerHTML = XF.mudo ? I.semSom : I.som; }
  function coracaoGrande(it, e) {
    const h = document.createElement("i"); h.className = "xf-boom"; h.innerHTML = I.coracao;
    const r = it.getBoundingClientRect(); h.style.left = (e.clientX - r.left) + "px"; h.style.top = (e.clientY - r.top) + "px";
    it.appendChild(h); setTimeout(() => h.remove(), 800);
    try { navigator.vibrate && navigator.vibrate(18); } catch (er) { }
  }

  /* ---------- mostrar/esconder com a aba ---------- */
  X.tabViews.xflesh = () => `<div class="xf-lugar"></div>`;
  X.depois.push(t => {
    const ver = !!(SO.user && SO.eu && !t && SO.tab === "xflesh" && !document.body.classList.contains("cs-sem-nav") && !document.querySelector(".cs-flc,.cs-flv,#cs-idade-cam"));
    document.body.classList.toggle("cs-xf", ver);
    if (ver) {
      const el = montar(); el.hidden = false; posicionar();
      if (!XF.visivel) {
        XF.visivel = true;
        const vazio = !(XF[XF.modo] || []).length;
        if (!XF.fixo && (XF[XF.modo] == null || Date.now() - XF.em > (vazio ? 20e3 : 600e3))) carregar(false); else desenhar(false);
        if (X.musicasChatMil) X.musicasChatMil("").then(l => { destaques = l.filter(m => m.nivel >= 3).slice(0, 6); }).catch(() => { });
        setTimeout(() => { const f = XF.el.querySelector("#xf-feed"), n = [...f.querySelectorAll(".xf-it")].find(n => Math.abs(n.offsetTop - f.scrollTop) < 40); if (n) ativar(n.dataset.id); }, 60);
      }
    } else if (XF.visivel || (XF.el && !XF.el.hidden)) {
      XF.visivel = false; pararAtual(); if (XF.el) XF.el.hidden = true;
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pararAtual(); else if (XF.visivel) { const f = XF.el.querySelector("#xf-feed"), n = [...f.querySelectorAll(".xf-it")].find(n => Math.abs(n.offsetTop - f.scrollTop) < 40); if (n) ativar(n.dataset.id); } });
  A.fecharXFlesh = () => pararAtual();
  /* tocar de novo na aba XFlesh: volta ao topo e atualiza */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('[data-st="xflesh"]');
    if (!b || SO.tab !== "xflesh" || !XF.visivel || topo()) return;
    XF.fixo = null; pararAtual(); carregar(false);
  }, true);

  /* ---------- curtir, comentar, compartilhar ---------- */
  function verCurtida(x) {
    if (XF.curti.has(x.id)) return;
    XF.curti.set(x.id, false);
    fb.getDoc(D("xflesh", x.id, "curtidas", eu())).then(s => { if (s.exists()) { XF.curti.set(x.id, true); atualizarItem(x); } }).catch(() => { });
  }
  function atualizarItem(x) {
    const n = XF.el && XF.el.querySelector(`[data-id="${CSS.escape(x.id)}"]`); if (!n) return;
    const on = !!XF.curti.get(x.id), b = n.querySelector("[data-s=xf-curtir]");
    if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); b.querySelector("span").textContent = fmt(x.nCurt || 0); }
    const c = n.querySelector("[data-s=xf-coment] span"); if (c) c.textContent = fmt(x.nComent || 0);
    const s = n.querySelector("[data-s=xf-compart] span"); if (s) s.textContent = fmt(x.nComp || 0);
  }
  async function curtir(id) {
    const x = itemPorId(id); if (!x) return;
    const on = !XF.curti.get(id); XF.curti.set(id, on); x.nCurt = Math.max(0, (x.nCurt || 0) + (on ? 1 : -1)); atualizarItem(x);
    if (on) { const b = XF.el.querySelector(`[data-id="${CSS.escape(id)}"] [data-s=xf-curtir]`); if (b) { b.classList.remove("pulo"); void b.offsetWidth; b.classList.add("pulo"); } }
    try {
      const b = fb.writeBatch(A.db);
      if (on) b.set(D("xflesh", id, "curtidas", eu()), { em: TS() }); else b.delete(D("xflesh", id, "curtidas", eu()));
      b.update(D("xflesh", id), { nCurt: fb.increment(on ? 1 : -1) });
      await b.commit();
    } catch (e) { console.warn(e); XF.curti.set(id, !on); x.nCurt = Math.max(0, (x.nCurt || 0) + (on ? -1 : 1)); atualizarItem(x); }
  }
  async function sheetComent(id) {
    const x = itemPorId(id); if (!x) return;
    window.abrirSheet(`<div class="sheet-h"><h2>Comentários</h2></div><div class="xf-cl" id="xf-cl"><div class="spin"></div></div>
      <form class="xf-cf" id="xf-f-com" data-id="${esc(id)}"><input class="in" id="xf-com" maxlength="500" placeholder="Comentar…" autocomplete="off"><button class="btn primary" aria-label="Enviar">${I.enviar}</button></form>`);
    try {
      const s = await fb.getDocs(fb.query(C("xflesh", id, "coments"), fb.orderBy("em", "desc"), fb.limit(80)));
      const l = s.docs.map(d => ({ id: d.id, ...A.dadosDe(d) })).filter(c => !SO.bloqueados.has(c.autor));
      const el = $("#xf-cl"); if (!el) return;
      el.innerHTML = l.length ? l.map(c => { const p = P(c.autor); return `<div class="xf-c">${av(p, 34, c.autor)}<div><b>@${esc(p.usuario || p.nome || "")}</b><p>${esc(c.texto)}</p></div>${c.autor === eu() || x.dono === eu() ? `<button class="cs-ico-bt" data-s="xf-com-apagar" data-id="${esc(id)}" data-v="${esc(c.id)}" aria-label="Apagar">${I.x}</button>` : ""}</div>`; }).join("") : `<p class="muted cs-centro">Seja o primeiro a comentar.</p>`;
    } catch (e) { const el = $("#xf-cl"); if (el) el.innerHTML = `<p class="muted cs-centro">${esc(msgErro(e))}</p>`; }
  }
  document.addEventListener("submit", async e => {
    if (e.target.id !== "xf-f-com") return; e.preventDefault();
    const id = e.target.dataset.id, inp = $("#xf-com"), t0 = (inp.value || "").trim(); if (!t0) return;
    if (ofensivo(t0)) return toast("Comentário não enviado: tem palavras ofensivas.");
    const sg = window.SOC_EXTRAS.seguranca ? window.SOC_EXTRAS.seguranca(t0) : { texto: t0 }; if (sg.bloqueio) return toast(sg.bloqueio);
    const x = itemPorId(id);
    try {
      const b = fb.writeBatch(A.db);
      b.set(fb.doc(C("xflesh", id, "coments")), { autor: eu(), texto: sg.texto.slice(0, 500), em: TS() });
      b.update(D("xflesh", id), { nComent: fb.increment(1) });
      await b.commit(); inp.value = "";
      if (x) { x.nComent = (x.nComent || 0) + 1; atualizarItem(x); }
      sheetComent(id);
    } catch (er) { toast(msgErro(er)); }
  });
  async function contarCompart(id) {
    const x = itemPorId(id), k = "cs.xfc." + eu(), m = lerLS(k, {}); if (m[id]) return;
    try {
      const b = fb.writeBatch(A.db);
      b.set(D("xflesh", id, "compart", eu()), { em: TS() });
      b.update(D("xflesh", id), { nComp: fb.increment(1) });
      await b.commit(); if (x) { x.nComp = (x.nComp || 0) + 1; atualizarItem(x); }
    } catch (e) { }
    m[id] = 1; const ks = Object.keys(m); if (ks.length > 500) delete m[ks[0]]; gravarLS(k, m);
    if (x && x.mus && x.mus.fonte === "chatmil" && X.contarCompartMusica) X.contarCompartMusica(x.mus.id);
  }
  const textoXF = x => `🎬 XFlesh de @${(P(x.dono).usuario || P(x.dono).nome || "")}${x.legenda ? ": " + x.legenda.slice(0, 80) : ""} — no ChatMil`;

  Object.assign(X.acoes, {
    "xf-modo": el => { if (XF.modo === el.dataset.v) return; XF.modo = el.dataset.v; pararAtual(); if (XF[XF.modo] == null) { desenhar(true); carregar(false); } else desenhar(true); setTimeout(() => { const n = XF.el.querySelector(".xf-it"); if (n) ativar(n.dataset.id); }, 60); },
    "xf-mudo": () => {
      XF.mudo = !XF.mudo;
      if (XF.video) { const x = itemPorId(XF.ativo); XF.video.muted = XF.mudo || !!(x && x.semSomOriginal); if (!XF.mudo) XF.video.play().catch(() => { }); }
      if (XF.aud) { XF.aud.muted = XF.mudo; if (!XF.mudo) XF.aud.play().catch(() => { }); }
      desenharMudo();
    },
    "xf-criar": () => { if (X.criarXFlesh) X.criarXFlesh(); },
    "xf-curtir": el => curtir(el.dataset.id),
    "xf-coment": el => sheetComent(el.dataset.id),
    "xf-com-apagar": async el => {
      const id = el.dataset.id, x = itemPorId(id);
      try { const b = fb.writeBatch(A.db); b.delete(D("xflesh", id, "coments", el.dataset.v)); b.update(D("xflesh", id), { nComent: fb.increment(-1) }); await b.commit(); if (x) { x.nComent = Math.max(0, (x.nComent || 0) - 1); atualizarItem(x); } sheetComent(id); }
      catch (e) { toast(msgErro(e)); }
    },
    "xf-compart": el => {
      const x = itemPorId(el.dataset.id); if (!x) return;
      window.abrirSheet(`<div class="sheet-h"><h2>Compartilhar</h2></div><div class="cs-menu">
        <button data-s="xf-c-conversa" data-id="${esc(x.id)}">${K.chat}<span><b>Enviar em uma conversa</b></span></button>
        <button data-s="xf-c-fora" data-id="${esc(x.id)}">${K.share}<span><b>Outros apps</b></span></button></div>`);
    },
    "xf-c-conversa": el => { const x = itemPorId(el.dataset.id); window.fecharSheet(); if (!x) return; contarCompart(x.id); if (X.escolherConversa) X.escolherConversa(textoXF(x)); },
    "xf-c-fora": async el => {
      const x = itemPorId(el.dataset.id); window.fecharSheet(); if (!x) return;
      const t = textoXF(x) + " · https://vonescoelho.github.io/senov-provas/";
      try { if (navigator.share) { await navigator.share({ title: "XFlesh", text: t }); contarCompart(x.id); return; } } catch (e) { return; }
      A.copiar(t); contarCompart(x.id); toast("Copiado.");
    },
    "xf-seguir": async (el, ev) => { if (ev) { ev.stopPropagation(); } const uid = el.dataset.id; if (SO.seguindo.has(uid)) return; await A.seguir(uid); SO.seguindo.add(uid); el.remove(); toast("Seguindo " + (P(uid).nome || "")); },
    "xf-musica": el => {
      const x = itemPorId(el.dataset.id), m = x && x.mus; if (!m) return;
      if (m.fonte === "chatmil") { pararAtual(); return abrirTela({ v: "faixa", id: m.id }); }
      window.abrirSheet(`<div class="sheet-h"><h2>${esc(m.titulo)}</h2></div><p class="muted">${esc(m.artista)}${m.lic ? " · " + esc(m.lic) : ""}</p>
        <button class="btn primary cs-grande" data-s="xf-usar-livre" data-id="${esc(x.id)}">${I.camera} Usar esta música</button>
        ${m.link ? `<button class="btn ghost" data-s="xf-mus-link" data-v="${esc(m.link)}">Créditos</button>` : ""}`);
    },
    "xf-usar-livre": el => { const x = itemPorId(el.dataset.id); window.fecharSheet(); if (x && x.mus && X.criarXFlesh) X.criarXFlesh({ ...x.mus }); },
    "xf-mus-link": el => { window.fecharSheet(); if (A.abrirLink) A.abrirLink(el.dataset.v); },
    "fx-usar-id": el => { if (X.criarXFlesh && X.musicasChatMil) X.musicasChatMil("").then(l => { const m = l.find(z => z.id === el.dataset.id); X.criarXFlesh(m || null); }); },
    "xf-menu": el => {
      const x = itemPorId(el.dataset.id); if (!x || x.dono !== eu()) return;
      window.abrirSheet(`<div class="sheet-h"><h2>Seu XFlesh</h2></div><div class="cs-menu">
        <button class="perigo" data-s="xf-apagar" data-id="${esc(x.id)}">${K.lixo}<span><b>Apagar</b></span></button></div>`);
    },
    "xf-apagar": async el => {
      const id = el.dataset.id; window.fecharSheet(); pararAtual();
      try {
        for (const sub of ["coments", "curtidas", "compart"]) { try { const s = await fb.getDocs(C("xflesh", id, sub)); await Promise.all(s.docs.filter(d => sub !== "coments" || true).map(d => fb.deleteDoc(d.ref).catch(() => { }))); } catch (e) { } }
        await F.apagarTudo("xflesh", id);
        ["pv", "seg"].forEach(k => { if (XF[k]) XF[k] = XF[k].filter(x => x.id !== id); });
        if (XF.fixo) XF.fixo.lista = XF.fixo.lista.filter(x => x.id !== id);
        desenhar(true); toast("Apagado.");
      } catch (e) { toast(msgErro(e)); }
    },
    /* da página da faixa: abre os vídeos dessa música em tela cheia */
    "xf-abrir-lista": el => {
      const l = X.faixaVideos ? X.faixaVideos(el.dataset.v) : []; if (!l.length) return;
      XF.fixo = { lista: l.slice(), id: el.dataset.id };
      const n = SO.pilha.length; SO.tab = "xflesh"; A.lembrarTab && A.lembrarTab();
      XF.visivel = false; if (n) { try { history.go(-n); } catch (e) { SO.pilha = []; pintar(); } } else pintar();
      desenhar(true);
    },
    "xf-sair-fixo": () => { XF.fixo = null; pararAtual(); desenhar(true); XF.visivel = false; pintar(); }
  });
  /* publicado agora: entra no topo do "Para você" e a aba abre nele */
  X.xfleshPublicado = f => {
    XF.pv = [f, ...(XF.pv || []).filter(x => x.id !== f.id)]; XF.modo = "pv"; XF.fixo = null;
    SO.tab = "xflesh"; A.lembrarTab && A.lembrarTab(); XF.visivel = false; pintar(); desenhar(true);
  };

  const css = document.createElement("style");
  css.textContent = `
.xf{position:fixed;top:0;left:0;right:0;bottom:64px;z-index:25;background:#000;color:#fff}
.xf[hidden]{display:none}
body.cs-xf{background:#000}body.cs-xf .nav{background:#000;border-top-color:#1f1f1f}body.cs-xf .nav button{color:rgba(255,255,255,.72)}
body.cs-xf .nav button[aria-current="page"]{color:#fff}body.cs-xf .nav button[aria-current="page"] .ico{background:rgba(255,255,255,.14)}
body.cs-xf main{visibility:hidden}
.xf-top{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;align-items:center;justify-content:center;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:linear-gradient(rgba(0,0,0,.45),transparent);pointer-events:none}
.xf-top>*{pointer-events:auto}
.xf-modos{display:flex;gap:18px}.xf-modos[hidden]{display:none}
.xf-modos button{border:0;background:none;color:rgba(255,255,255,.7);font:inherit;font-weight:800;font-size:1.02rem;padding:4px 0;cursor:pointer;border-bottom:2px solid transparent}
.xf-modos button[aria-pressed="true"]{color:#fff;border-bottom-color:#fff}
.xf-tbt,.xf-x{position:absolute;right:10px;top:calc(6px + env(safe-area-inset-top,0px));width:40px;height:40px;border:0;border-radius:50%;background:rgba(0,0,0,.3);color:#fff;display:grid;place-items:center;cursor:pointer}
.xf-x{left:10px;right:auto}.xf-x[hidden]{display:none}
.xf-tbt svg,.xf-x svg{width:22px;height:22px}
.xf-feed{position:absolute;inset:0;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}
.xf-feed::-webkit-scrollbar{display:none}
.xf-it{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;background:#000}
.xf-fundo{position:absolute;inset:-20px;background-size:cover;background-position:center;filter:blur(24px) brightness(.45);transform:scale(1.1)}
.xf-midia{position:absolute;inset:0;display:grid;place-items:center}
.xf-midia img,.xf-midia video{width:100%;height:100%;object-fit:contain}
.xf-midia video{position:relative;z-index:1}
.xf-pausa{position:absolute;inset:0;display:none;place-items:center;z-index:2;pointer-events:none}.xf-pausa svg{width:72px;height:72px;opacity:.7}
.xf-it.pausado .xf-pausa{display:grid}
.xf-erro{color:rgba(255,255,255,.7);font-weight:700}
.xf-rail{position:absolute;right:8px;bottom:22px;z-index:3;display:flex;flex-direction:column;align-items:center;gap:16px}
.xf-av{position:relative;border:0;background:none;padding:0;cursor:pointer;margin-bottom:6px}
.xf-av .cs-av{box-shadow:0 0 0 2px #fff}
.xf-av i{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;background:#FF2D55;color:#fff;display:grid;place-items:center}.xf-av i svg{width:13px;height:13px}
.xf-b{border:0;background:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;font:inherit;font-weight:800;font-size:.78rem;cursor:pointer;padding:0;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.xf-b svg{width:34px;height:34px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
.xf-b.on{color:#FF2D55}.xf-b.on svg{fill:currentColor}
.xf-b.pulo svg{animation:xfpulo .35s ease}@keyframes xfpulo{50%{transform:scale(1.3)}}
.xf-disco{width:48px;height:48px;border-radius:50%;border:0;padding:8px;background:repeating-radial-gradient(circle,#111 0 2px,#222 2px 4px);display:grid;place-items:center;animation:fxgira2 5s linear infinite;cursor:pointer}
.xf-disco svg{width:20px;height:20px;color:#fff}
.xf-disco-c{width:100%;height:100%;border-radius:50%;object-fit:cover}
@keyframes fxgira2{to{transform:rotate(360deg)}}
.xf-it.pausado .xf-disco{animation-play-state:paused}
.xf-info{position:absolute;left:12px;right:84px;bottom:18px;z-index:3;display:flex;flex-direction:column;gap:6px;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.xf-nome{border:0;background:none;color:#fff;font:inherit;font-weight:800;font-size:1rem;padding:0;text-align:left;cursor:pointer;align-self:flex-start}
.xf-leg{margin:0;font-size:.92rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.xf-mus{display:flex;align-items:center;gap:6px;border:0;background:none;color:#fff;font:inherit;font-size:.86rem;padding:0;cursor:pointer;max-width:100%;overflow:hidden}
.xf-mus svg{width:16px;height:16px;flex:none}
.xf-mus>span{overflow:hidden;white-space:nowrap;flex:1;min-width:0;display:flex}.xf-mus>span>span{flex:none;padding-right:40px;animation:xfmarq 9s linear infinite}
@keyframes xfmarq{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.xf-kar{position:absolute;left:16px;right:84px;top:28%;z-index:3;display:flex;flex-direction:column;gap:6px;text-align:center;pointer-events:none}
.xf-kar[hidden]{display:none}
.xf-kar .a{font-size:1.45rem;font-weight:900;line-height:1.2;background:linear-gradient(90deg,#FDE047 var(--f,0%),#fff var(--f,0%));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 3px rgba(0,0,0,.8))}
.xf-kar .b{font-weight:700;opacity:.7;text-shadow:0 1px 3px #000}
.xf-boom{position:absolute;z-index:4;width:110px;height:110px;margin:-55px 0 0 -55px;color:#FF2D55;pointer-events:none;animation:xfboom .8s ease-out forwards}
.xf-boom svg{width:100%;height:100%;fill:currentColor;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}
@keyframes xfboom{0%{transform:scale(.3) rotate(-12deg);opacity:0}25%{transform:scale(1.15) rotate(-6deg);opacity:1}60%{transform:scale(1) rotate(0)}100%{transform:scale(1.4) translateY(-60px);opacity:0}}
.xf-criar{position:absolute;right:14px;bottom:auto;top:calc(54px + env(safe-area-inset-top,0px));z-index:3;width:44px;height:44px;border-radius:14px;border:0;background:linear-gradient(135deg,#25F4EE,#FE2C55);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.xf-criar svg{width:24px;height:24px;stroke-width:3}
.xf.fixo .xf-criar{display:none}
.xf-vazio{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;text-align:center;padding:20px}
.xf-vazio svg{width:56px;height:56px;opacity:.8}
.xf-art{display:grid;place-items:center;background:radial-gradient(120% 80% at 20% 10%,#7C3AED,transparent 60%),radial-gradient(120% 80% at 90% 90%,#EC4899,transparent 55%),#0b0b12}
.xf-art-in{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:20px;max-width:360px}
.xf-art-in small{display:flex;align-items:center;gap:6px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:.72rem;opacity:.9}.xf-art-in small svg{width:14px;height:14px;fill:#FDE047;color:#FDE047}
.xf-art-capa{border:0;padding:0;background:none;cursor:pointer}
.xf-art-img{width:min(64vw,240px);height:min(64vw,240px);border-radius:22px;object-fit:cover;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.xf-art-in h2{margin:4px 0 0;font-size:1.5rem}.xf-art-in p{margin:0;opacity:.85}
.xf-art-bt{background:#fff!important;color:#111!important;border:0!important;width:100%}.xf-art-bt svg{width:20px;height:20px;vertical-align:-4px;margin-right:6px}
.xf-art-ver{color:#fff!important}
.xf-cl{display:flex;flex-direction:column;gap:12px;max-height:50vh;overflow:auto}
.xf-c{display:flex;gap:10px;align-items:flex-start}.xf-c>div{flex:1;min-width:0}.xf-c b{font-size:.84rem}.xf-c p{margin:2px 0 0;word-wrap:break-word}
.xf-cf{display:flex;gap:8px}.xf-cf .in{flex:1}.xf-cf .btn svg{width:18px;height:18px}
@media (min-width:900px){.xf{bottom:0}}
`;
  document.head.appendChild(css);
})();
