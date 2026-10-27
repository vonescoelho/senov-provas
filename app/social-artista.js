/* ChatMil — Central do Artista: músicos independentes sobem faixas autorais para o próprio Álbum.
   Em troca, a música entra na biblioteca do XFlesh e dos Flashes. Quanto mais a faixa é USADA em
   vídeos (5 pontos), COMPARTILHADA (3) e CURTIDA (1), mais alcance ela ganha:
     Novo → Subindo (50) → Em alta (250) → Destaque (1.000) → Top ChatMil (5.000)
   - a biblioteca "ChatMil" é ordenada por esses pontos (faixas novas ganham vitrine nos 7 primeiros dias);
   - "Em alta" ou mais: aparece no topo da busca de músicas;
   - "Destaque" ou mais: entra como cartão de artista no meio do XFlesh;
   - cada vídeo com a música mostra o disco girando → toque abre a faixa com "Usar esta música".
   O áudio fica no Firestore em partes de 700 KB (como os Flashes). Depende de social.js e social-midia.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext || !window.SOCIAL.ext.midia) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._, M = X.midia;
  const { SO, fb, D, C, TS, K, ic, esc, P, av, eu, pintar, abrirTela, voltar, topo, toast, msgErro, ofensivo } = A;
  const $ = s => document.querySelector(s);
  const I = {
    disco: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3a9 9 0 0 1 9 9"/>'),
    nota: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    play: ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>'),
    pausa: ic('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>'),
    coracao: ic('<path d="M12 20s-7.5-4.6-9.3-9.2A5 5 0 0 1 12 6a5 5 0 0 1 9.3 4.8C19.5 15.4 12 20 12 20z"/>'),
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    mais: ic('<path d="M12 5v14M5 12h14"/>'),
    subir: ic('<path d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14"/>'),
    xf: ic('<rect x="5" y="2.5" width="14" height="19" rx="4"/><path d="M10.2 8.8v6.4l5.2-3.2z" fill="currentColor"/>'),
    lixo: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    letra: ic('<path d="M4 6h16M4 12h10M4 18h7"/><path d="M18 14v6M15 17h6"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>')
  };
  const PARTE = 700 * 1024, MAXARQ = 14e6;
  const GENEROS = ["Pop", "Funk", "Sertanejo", "Forró", "Piseiro", "Pagode", "Samba", "MPB", "Rap", "Trap", "Rock", "Gospel", "Reggae", "Eletrônica", "Brega", "Lo-fi", "Instrumental", "Infantil", "Outro"];
  const NIVEIS = [[0, "Novo"], [50, "Subindo"], [250, "Em alta"], [1000, "Destaque"], [5000, "Top ChatMil"]];
  const CORES = ["#94A3B8", "#22C55E", "#F59E0B", "#EC4899", "#8B5CF6"];
  const pontos = m => (m.nUsos || 0) * 5 + (m.nComp || 0) * 3 + (m.nCurt || 0);
  const nivel = m => { const p = pontos(m); let i = 0; NIVEIS.forEach((n, k) => { if (p >= n[0]) i = k; }); return i; };
  const score = m => pontos(m) + Math.max(0, 42 - (Date.now() - (m.criado || 0)) / 864e5 * 6);
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const mmss = M.mmss;
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + " mi" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + " mil" : String(n || 0);
  const MS = { top: null, topEm: 0, carregando: false, porId: new Map(), urls: new Map(), minhas: null, album: new Map(), audio: null, tocando: null, raf: 0, enviando: false, nova: null };
  X.aoTrocarUsuario.push(() => { parar(); MS.top = null; MS.minhas = null; MS.album = new Map(); });

  const doc2m = d => { const m = { id: d.id, ...d.data() }; MS.porId.set(m.id, m); return m; };
  /* ---------- biblioteca ---------- */
  async function carregarTop(forcar) {
    if (MS.carregando || (!forcar && MS.top && Date.now() - MS.topEm < 120000)) return MS.top;
    MS.carregando = true;
    try {
      const [a, b] = await Promise.all([
        fb.getDocs(fb.query(C("musicas"), fb.orderBy("nUsos", "desc"), fb.limit(60))).catch(() => ({ docs: [] })),
        fb.getDocs(fb.query(C("musicas"), fb.orderBy("criado", "desc"), fb.limit(40))).catch(() => ({ docs: [] }))]);
      const m = new Map();[...a.docs, ...b.docs].forEach(d => m.set(d.id, doc2m(d)));
      MS.top = [...m.values()].filter(x => !SO.bloqueados.has(x.dono)).sort((x, y) => score(y) - score(x)); MS.topEm = Date.now();
    } finally { MS.carregando = false; }
    return MS.top;
  }
  const paraLista = m => ({ id: m.id, fonte: "chatmil", titulo: m.titulo, artista: m.artista, capa: m.capa || "", dur: m.dur || 0, lic: "ChatMil", link: "", nivel: nivel(m), dono: m.dono });
  /* usada pela tela de escolher música (social-musica.js) */
  X.musicasChatMil = async q => {
    const l = await carregarTop(false) || [];
    const t = A.semAc(q || "").trim();
    return (t ? l.filter(m => A.semAc(m.titulo + " " + m.artista + " " + (m.genero || "")).includes(t)) : l).map(paraLista);
  };
  async function obter(id) {
    if (MS.porId.has(id)) return MS.porId.get(id);
    const s = await fb.getDoc(D("musicas", id)); if (!s.exists()) throw { code: "not-found" };
    return doc2m(s);
  }
  X.musicasChatMilCache = id => MS.porId.get(id);
  X.urlMusica = async m => {
    const id = m.id; if (MS.urls.has(id)) return MS.urls.get(id);
    const p = (async () => {
      const info = await obter(id);
      const s = await fb.getDocs(C("musicas", id, "partes"));
      if (!s.docs.length) throw { code: "not-found" };
      const b = new Blob(s.docs.slice().sort((a, c) => a.id.localeCompare(c.id)).map(d => d.data().d.toUint8Array()), { type: info.mime || "audio/mpeg" });
      return URL.createObjectURL(b);
    })();
    MS.urls.set(id, p); p.catch(() => MS.urls.delete(id));
    return p;
  };
  /* letra no formato [mm:ss] linha → karaokê */
  function lerLetra(t) {
    const l = [];
    String(t || "").split(/\r?\n/).forEach(li => {
      const ts = [...li.matchAll(/\[(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?\]/g)]; const txt = li.replace(/\[[^\]]*\]/g, "").trim();
      ts.forEach(m => l.push({ t: +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0), txt }));
    });
    return l.sort((a, b) => a.t - b.t);
  }
  X.letraDe = async id => { try { const m = await obter(id); return m.letra ? lerLetra(m.letra) : []; } catch (e) { return []; } };
  /* linha atual do karaokê: {a: linha, b: próxima, f: 0..1 do preenchimento} */
  X.karaoke = (l, t) => {
    if (!l || !l.length) return null;
    let i = -1; for (let k = 0; k < l.length; k++) { if (l[k].t <= t) i = k; else break; }
    if (i < 0) return { a: "", b: l[0].txt, f: 0 };
    const fim = l[i + 1] ? l[i + 1].t : l[i].t + 4;
    return { a: l[i].txt, b: l[i + 1] ? l[i + 1].txt : "", f: Math.max(0, Math.min(1, (t - l[i].t) / Math.max(0.5, fim - l[i].t))) };
  };
  /* um XFlesh usou a faixa: +1 uso (as regras exigem o XFlesh apontando para ela) */
  X.usoMusica = async (xid, mid) => {
    try {
      const b = fb.writeBatch(A.db);
      b.set(D("musicas", mid, "usos", xid), { em: TS() });
      b.update(D("musicas", mid), { nUsos: fb.increment(1), ultUso: xid });
      await b.commit();
      const m = MS.porId.get(mid); if (m) m.nUsos = (m.nUsos || 0) + 1;
    } catch (e) { console.warn("uso da música", e); }
  };

  /* ---------- tocar uma faixa inteira (página da faixa) ---------- */
  function parar() {
    cancelAnimationFrame(MS.raf);
    if (MS.audio) { try { MS.audio.pause(); } catch (e) { } }
    MS.tocando = null; marcarPlay();
  }
  async function tocar(id) {
    if (MS.tocando === id) return parar();
    parar(); MS.tocando = id; marcarPlay(true);
    try {
      const u = await X.urlMusica({ id }); if (MS.tocando !== id) return;
      if (!MS.audio) { MS.audio = new Audio(); MS.audio.addEventListener("ended", parar); }
      MS.audio.src = u; await MS.audio.play();
      const l = await X.letraDe(id);
      const passo = () => {
        if (MS.tocando !== id || !MS.audio) return;
        const a = MS.audio, pr = $("#fx-prog"); if (pr && a.duration) pr.style.width = (a.currentTime / a.duration * 100) + "%";
        const k = X.karaoke(l, a.currentTime), el = $("#fx-kar");
        if (el && k) { el.querySelector(".a").textContent = k.a; el.querySelector(".a").style.setProperty("--f", (k.f * 100).toFixed(1) + "%"); el.querySelector(".b").textContent = k.b; }
        MS.raf = requestAnimationFrame(passo);
      };
      passo(); marcarPlay();
    } catch (e) { console.warn(e); toast("Não deu para tocar agora."); parar(); }
  }
  function marcarPlay(carregando) {
    document.querySelectorAll("[data-fx-play]").forEach(b => { const on = b.dataset.fxPlay === MS.tocando; b.classList.toggle("on", on); b.innerHTML = on ? (carregando ? `<span class="spin sm"></span>` : I.pausa) : I.play; });
    document.querySelectorAll(".fx-disco").forEach(d => d.classList.toggle("gira", !!MS.tocando && d.dataset.id === MS.tocando));
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) parar(); });

  /* ---------- visual ---------- */
  const capaHtml = (m, cls) => m && m.capa ? `<img class="${cls || "fx-capa"}" src="${esc(m.capa)}" alt="" loading="lazy">` : `<span class="${cls || "fx-capa"} fx-capa-v" style="--c:${A.corDe(m ? m.id || m.titulo : "x")}">${I.nota}</span>`;
  X.capaMusica = capaHtml;
  const nivelHtml = m => { const n = nivel(m); return `<span class="fx-niv" style="--c:${CORES[n]}"><i>${NIVEIS.map((_, k) => `<b class="${k <= n ? "on" : ""}"></b>`).join("")}</i>${esc(NIVEIS[n][1])}</span>`; };

  /* ---------- Central do Artista ---------- */
  function carregarMinhas() {
    if (MS.minhas !== null) return MS.minhas;
    MS.minhas = undefined;
    fb.getDocs(fb.query(C("musicas"), fb.where("dono", "==", eu()))).then(s => { MS.minhas = s.docs.map(doc2m).sort((a, b) => (b.criado || 0) - (a.criado || 0)); pintar(); })
      .catch(e => { console.warn(e); MS.minhas = []; pintar(); });
    return undefined;
  }
  X.views.artista = () => {
    const a = (SO.eu && SO.eu.artista) || null;
    const cab = `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>Central do Artista</b></header>`;
    if (!a) return cab + `<div class="cs-pag stack fx-pag">
      <section class="fx-hero"><div class="fx-hero-ic">${I.mic}</div><h2>Seu Álbum no ChatMil</h2><p>Quanto mais usam, curtem e compartilham, mais longe sua música vai.</p></section>
      <form class="stack" id="fx-f-artista" novalidate>
        <label class="f" for="fx-nome">Nome artístico<input class="in" id="fx-nome" maxlength="80" value="${esc((SO.eu && SO.eu.nome) || "")}"></label>
        <div class="f"><span>Gênero</span><div class="chips">${GENEROS.map(g => `<button type="button" class="chip" data-s="fx-gen" data-v="${esc(g)}" aria-pressed="false">${esc(g)}</button>`).join("")}</div></div>
        <button class="btn primary cs-grande">Criar meu Álbum</button></form></div>`;
    const l = carregarMinhas();
    const tot = (l || []).reduce((o, m) => ({ u: o.u + (m.nUsos || 0), c: o.c + (m.nCurt || 0), s: o.s + (m.nComp || 0), p: o.p + pontos(m) }), { u: 0, c: 0, s: 0, p: 0 });
    const melhor = (l || []).reduce((x, m) => !x || pontos(m) > pontos(x) ? m : x, null);
    const prox = melhor ? NIVEIS[nivel(melhor) + 1] : NIVEIS[1];
    return cab + `<div class="cs-pag stack fx-pag">
      <section class="fx-hero on"><div class="fx-hero-ic">${I.mic}</div><h2>${esc(a.nome)}</h2>${a.genero ? `<small>${esc(a.genero)}</small>` : ""}
        ${melhor ? nivelHtml(melhor) : ""}
        <div class="fx-nums"><div><b>${fmt(tot.u)}</b><span>usos</span></div><div><b>${fmt(tot.c)}</b><span>curtidas</span></div><div><b>${fmt(tot.s)}</b><span>compart.</span></div></div>
        ${prox && melhor ? `<div class="fx-meta"><i style="width:${Math.min(100, pontos(melhor) / prox[0] * 100).toFixed(0)}%"></i></div><small class="fx-meta-t">${fmt(pontos(melhor))} / ${fmt(prox[0])} · ${esc(prox[1])}</small>` : ""}
        <button class="btn primary cs-grande" data-s="fx-nova">${I.subir} Enviar faixa</button></section>
      <h2 class="cs-sec">Meu Álbum</h2>
      ${l === undefined ? `<div class="cs-carr"><div class="spin"></div></div>` : l.length ? `<div class="fx-lista">${l.map(m => linhaFaixa(m, true)).join("")}</div>` : ""}
      <button class="cs-link fx-ed-art" data-s="fx-editar-art">Editar nome artístico</button></div>`;
  };
  function linhaFaixa(m, minha) {
    return `<div class="fx-li"><button class="fx-li-b" data-s="faixa-abrir" data-id="${esc(m.id)}">${capaHtml(m, "fx-li-c")}<span class="fx-li-t"><b>${esc(m.titulo)}</b>
      <small>${minha ? `${fmt(m.nUsos || 0)} usos · ${fmt(m.nCurt || 0)} ${I.coracao.replace("<svg", '<svg class="fx-mini"')} · ${fmt(m.nComp || 0)} compart.` : esc(m.artista)}</small></span></button>
      <button class="fx-play" data-s="fx-play" data-id="${esc(m.id)}" data-fx-play="${esc(m.id)}" aria-label="Ouvir">${MS.tocando === m.id ? I.pausa : I.play}</button>
      ${minha ? `<button class="cs-ico-bt" data-s="fx-menu" data-id="${esc(m.id)}" aria-label="Opções">${K.mais}</button>` : ""}</div>`;
  }
  X.perfilCanto.unshift(() => `<button class="cs-canto-b ${SO.eu && SO.eu.artista ? "on" : ""}" data-s="fx-central">${I.mic}<span>Artista</span></button>`);

  /* enviar faixa */
  function sheetNova() {
    const n = MS.nova = { arq: null, dur: 0, capa: "", genero: (SO.eu && SO.eu.artista && SO.eu.artista.genero) || "" };
    window.abrirSheet(`<div class="sheet-h"><h2>Nova faixa</h2></div>
      <form class="stack" id="fx-f-nova" novalidate>
        <div class="fx-nova-top"><button type="button" class="fx-nova-capa" data-s="fx-capa" id="fx-capa-bt" aria-label="Capa">${I.disco}<small>Capa</small></button>
          <button type="button" class="btn fx-nova-arq" data-s="fx-arq" id="fx-arq-bt">${I.nota}<span>Escolher a música</span></button></div>
        <label class="f" for="fx-tit">Título<input class="in" id="fx-tit" maxlength="100"></label>
        <div class="f"><span>Gênero</span><div class="chips">${GENEROS.map(g => `<button type="button" class="chip" data-s="fx-gen2" data-v="${esc(g)}" aria-pressed="${n.genero === g}">${esc(g)}</button>`).join("")}</div></div>
        <label class="f" for="fx-letra"><span>Letra <small class="muted">(opcional)</small></span><textarea class="in" id="fx-letra" rows="4" maxlength="8000" placeholder="[00:12] Primeira linha&#10;[00:16] Segunda linha"></textarea></label>
        <label class="cs-aceite" for="fx-autor"><input type="checkbox" id="fx-autor"><span>Sou autor(a) desta música e tenho os direitos para publicá-la.</span></label>
        <button class="btn primary cs-grande">${I.subir} Publicar no Álbum</button></form>`);
  }
  async function escolherArq() {
    const [f] = await M.escolher("audio/*", false); if (!f || !MS.nova) return;
    if (f.size > MAXARQ) return toast("Arquivo grande demais (máximo 14 MB).");
    const u = URL.createObjectURL(f), a = new Audio(u);
    await new Promise(r => { a.onloadedmetadata = r; a.onerror = r; setTimeout(r, 6000); }); URL.revokeObjectURL(u);
    if (!isFinite(a.duration) || a.duration < 15) return toast("Use uma música com pelo menos 15 segundos.");
    Object.assign(MS.nova, { arq: f, dur: Math.round(a.duration) });
    const bt = $("#fx-arq-bt"); if (bt) { bt.classList.add("ok"); bt.innerHTML = `${I.nota}<span>${esc((f.name || "Música").slice(0, 40))} · ${mmss(a.duration)}</span>`; }
    const t = $("#fx-tit"); if (t && !t.value) t.value = (f.name || "").replace(/\.\w+$/, "").replace(/[_-]+/g, " ").slice(0, 100);
  }
  async function escolherCapa() {
    const [f] = await M.escolher("image/*", false); if (!f || !MS.nova) return;
    try {
      const img = await M.carregarImg(URL.createObjectURL(f)), w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, l = Math.min(w, h);
      const cv = document.createElement("canvas"); cv.width = cv.height = 400;
      cv.getContext("2d").drawImage(img, (w - l) / 2, (h - l) / 2, l, l, 0, 0, 400, 400);
      let q = 0.82, d = cv.toDataURL("image/jpeg", q); while (d.length > 140000 && q > 0.3) { q -= 0.12; d = cv.toDataURL("image/jpeg", q); }
      MS.nova.capa = d; const bt = $("#fx-capa-bt"); if (bt) bt.innerHTML = `<img src="${d}" alt="">`;
    } catch (e) { toast("Não deu para usar esta imagem."); }
  }
  async function publicarFaixa() {
    const n = MS.nova; if (!n || MS.enviando) return;
    const tit = (($("#fx-tit") || {}).value || "").trim(), letra = (($("#fx-letra") || {}).value || "").trim();
    if (!n.arq) return toast("Escolha a música.");
    if (tit.length < 1) return toast("Digite o título.");
    if (ofensivo(tit) || (letra && ofensivo(letra))) return toast("Há palavras não permitidas.");
    if (!($("#fx-autor") || {}).checked) return toast("Confirme que a música é sua.");
    const a = (SO.eu && SO.eu.artista) || {};
    MS.enviando = true; window.fecharSheet();
    const barra = M.barraEnvio("faixa");
    try {
      const buf = new Uint8Array(await n.arq.arrayBuffer()), partes = Math.max(1, Math.ceil(buf.length / PARTE));
      const ref = fb.doc(C("musicas"));
      const doc = { dono: eu(), titulo: tit.slice(0, 100), artista: String(a.nome || (SO.eu && SO.eu.nome) || "Artista").slice(0, 80), genero: n.genero || "", capa: n.capa || null, letra: letra.slice(0, 8000) || null,
        dur: n.dur, mime: n.arq.type || "audio/mpeg", tamanho: buf.length, partes, autoral: true, nUsos: 0, nCurt: 0, nComp: 0, criado: Date.now(), criadoEm: TS() };
      await fb.setDoc(ref, doc);
      let prox = 0, feitos = 0;
      const um = async () => { while (prox < partes) { const i = prox++; await fb.setDoc(D("musicas", ref.id, "partes", String(i).padStart(4, "0")), { d: fb.Bytes.fromUint8Array(buf.subarray(i * PARTE, (i + 1) * PARTE)) }); barra(++feitos / partes); } };
      await Promise.all([um(), um(), um()]);
      const m = { id: ref.id, ...doc }; MS.porId.set(m.id, m); MS.minhas = [m, ...(MS.minhas || [])]; MS.album.delete(eu()); MS.top = null;
      toast("Faixa publicada no seu Álbum!");
    } catch (e) { console.warn(e); toast(msgErro(e)); }
    barra(null); MS.enviando = false; MS.nova = null; pintar();
  }
  async function apagarFaixa(id) {
    try {
      const s = await fb.getDocs(C("musicas", id, "partes")); await Promise.all(s.docs.map(d => fb.deleteDoc(d.ref)));
      await fb.deleteDoc(D("musicas", id));
      MS.minhas = (MS.minhas || []).filter(m => m.id !== id); MS.porId.delete(id); MS.album.delete(eu()); MS.top = null;
      toast("Faixa apagada."); pintar();
    } catch (e) { toast(msgErro(e)); }
  }

  /* ---------- Álbum no perfil ---------- */
  function album(uid) {
    if (MS.album.has(uid)) return MS.album.get(uid);
    MS.album.set(uid, null);
    fb.getDocs(fb.query(C("musicas"), fb.where("dono", "==", uid))).then(s => { MS.album.set(uid, s.docs.map(doc2m).sort((a, b) => pontos(b) - pontos(a))); pintar(); })
      .catch(() => MS.album.set(uid, []));
    return null;
  }
  const perfilAnt = X.perfilExtra;
  X.perfilExtra = (uid, meu) => {
    const p = meu ? (SO.eu || {}) : P(uid);
    let h = "";
    if (p.artista) {
      const l = album(uid);
      if (l && l.length) h = `<section class="fx-album"><h2 class="cs-sec">${I.disco} Álbum · ${esc(p.artista.nome || "")}</h2>
        <div class="fx-album-l">${l.map(m => `<button class="fx-al-it" data-s="faixa-abrir" data-id="${esc(m.id)}">${capaHtml(m, "fx-al-c")}<b>${esc(m.titulo)}</b><small>${fmt(m.nUsos || 0)} usos</small></button>`).join("")}</div></section>`;
    }
    return h + (perfilAnt ? perfilAnt(uid, meu) : "");
  };

  /* ---------- página da faixa ---------- */
  const FX = { xf: new Map(), curti: new Map() };
  function xfDaFaixa(id) {
    if (FX.xf.has(id)) return FX.xf.get(id);
    FX.xf.set(id, null);
    fb.getDocs(fb.query(C("xflesh"), fb.where("mus.id", "==", id), fb.limit(30))).then(s => { FX.xf.set(id, s.docs.map(d => ({ id: d.id, col: "xflesh", ...d.data() })).sort((a, b) => (b.nCurt || 0) - (a.nCurt || 0))); pintar(); })
      .catch(() => FX.xf.set(id, []));
    return null;
  }
  function curtiu(id) {
    if (FX.curti.has(id)) return FX.curti.get(id);
    FX.curti.set(id, false);
    fb.getDoc(D("musicas", id, "curtidas", eu())).then(s => { FX.curti.set(id, s.exists()); if (s.exists()) pintar(); }).catch(() => { });
    return false;
  }
  X.views.faixa = t => {
    const m = MS.porId.get(t.id);
    if (!m) { obter(t.id).then(pintar).catch(() => { toast("Faixa indisponível."); voltar(); }); return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button></header><div class="cs-carr"><div class="spin"></div></div>`; }
    const xs = xfDaFaixa(m.id), on = curtiu(m.id), l = m.letra ? lerLetra(m.letra) : [];
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button><b>${esc(m.titulo)}</b></header>
      <div class="cs-pag stack fx-pag">
      <section class="fx-faixa" style="--c:${A.corDe(m.id)}">
        <div class="fx-disco ${MS.tocando === m.id ? "gira" : ""}" data-id="${esc(m.id)}">${capaHtml(m, "fx-disco-c")}</div>
        <h1>${esc(m.titulo)}</h1>
        <button class="cs-link fx-art" data-s="ver-perfil" data-id="${esc(m.dono)}">${esc(m.artista)}</button>
        ${nivelHtml(m)}
        <div class="fx-tocar"><button class="fx-play grande" data-s="fx-play" data-id="${esc(m.id)}" data-fx-play="${esc(m.id)}" aria-label="Ouvir">${MS.tocando === m.id ? I.pausa : I.play}</button><div class="fx-barra"><i id="fx-prog"></i></div><small>${mmss(m.dur || 0)}</small></div>
        ${l.length ? `<div class="fx-kar" id="fx-kar"><span class="a" style="--f:0%">${esc(l[0].txt)}</span><span class="b">${esc((l[1] || {}).txt || "")}</span></div>` : m.letra ? `<p class="fx-letra-fixa">${esc(m.letra).replace(/\n/g, "<br>")}</p>` : ""}
        <div class="fx-acoes">
          <button class="fx-ac ${on ? "on" : ""}" data-s="fx-curtir" data-id="${esc(m.id)}" aria-pressed="${on}">${I.coracao}<span>${fmt(m.nCurt || 0)}</span></button>
          <button class="fx-ac" data-s="fx-compart" data-id="${esc(m.id)}">${I.enviar}<span>${fmt(m.nComp || 0)}</span></button>
          <button class="fx-ac" disabled>${I.xf}<span>${fmt(m.nUsos || 0)}</span></button></div>
        <button class="btn primary cs-grande fx-usar" data-s="fx-usar" data-id="${esc(m.id)}">${I.xf} Usar esta música</button>
      </section>
      ${xs == null ? `<div class="cs-carr"><div class="spin"></div></div>` : xs.length ? `<div class="fx-xfs">${xs.map(x => `<button class="fx-xf" data-s="xf-abrir-lista" data-id="${esc(x.id)}" data-v="${esc(m.id)}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : ""}<small>${I.coracao.replace("<svg", '<svg class="fx-mini"')} ${fmt(x.nCurt || 0)}</small></button>`).join("")}</div>` : ""}
      </div>`;
  };
  X.faixaVideos = id => FX.xf.get(id) || [];
  X.depois.push(t => { if (MS.tocando && (!t || (t.v !== "faixa" && t.v !== "artista"))) parar(); });

  async function curtir(id) {
    const m = MS.porId.get(id); if (!m) return;
    const on = !FX.curti.get(id); FX.curti.set(id, on); m.nCurt = Math.max(0, (m.nCurt || 0) + (on ? 1 : -1)); pintar();
    try {
      const b = fb.writeBatch(A.db);
      if (on) b.set(D("musicas", id, "curtidas", eu()), { em: TS() }); else b.delete(D("musicas", id, "curtidas", eu()));
      b.update(D("musicas", id), { nCurt: fb.increment(on ? 1 : -1) });
      await b.commit();
    } catch (e) { console.warn(e); FX.curti.set(id, !on); m.nCurt = Math.max(0, (m.nCurt || 0) + (on ? -1 : 1)); pintar(); }
  }
  /* compartilhar: conta 1 por pessoa (as regras garantem) */
  async function contarCompart(id) {
    if (lerLS("cs.fxc." + eu(), {})[id]) return;
    try {
      const b = fb.writeBatch(A.db);
      b.set(D("musicas", id, "compart", eu()), { em: TS() });
      b.update(D("musicas", id), { nComp: fb.increment(1) });
      await b.commit();
      const m = MS.porId.get(id); if (m) m.nComp = (m.nComp || 0) + 1;
    } catch (e) { }
    const c = lerLS("cs.fxc." + eu(), {}); c[id] = 1; gravarLS("cs.fxc." + eu(), c);
  }
  X.contarCompartMusica = contarCompart;
  function sheetCompart(id) {
    const m = MS.porId.get(id); if (!m) return;
    window.abrirSheet(`<div class="sheet-h"><h2>Compartilhar</h2></div><div class="cs-menu">
      <button data-s="fx-c-mural" data-id="${esc(id)}">${K.mural}<span><b>Publicar no Mural</b></span></button>
      <button data-s="fx-c-conversa" data-id="${esc(id)}">${K.chat}<span><b>Enviar em uma conversa</b></span></button>
      <button data-s="fx-c-fora" data-id="${esc(id)}">${K.share}<span><b>Outros apps</b></span></button></div>`);
  }
  const textoFaixa = m => `🎵 "${m.titulo}" — ${m.artista}, no ChatMil`;
  /* cartão da faixa nas publicações do Mural */
  X.postCorpo.push(p => {
    const f = p.faixa; if (!f || !f.id) return "";
    return `<button class="fx-post" data-s="faixa-abrir" data-id="${esc(f.id)}">${capaHtml(f, "fx-post-c")}<span><b>${esc(f.titulo || "")}</b><small>${esc(f.artista || "")}</small></span><i>${I.play}</i></button>`;
  });

  Object.assign(X.acoes, {
    "fx-central": () => abrirTela({ v: "artista" }),
    "fx-gen": el => { el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el))); },
    "fx-gen2": el => { el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el))); if (MS.nova) MS.nova.genero = el.dataset.v; },
    "fx-editar-art": () => { if (!SO.eu || !SO.eu.artista) return; window.abrirSheet(`<div class="sheet-h"><h2>Nome artístico</h2></div><form class="stack" id="fx-f-art2"><input class="in" id="fx-nome2" maxlength="80" value="${esc(SO.eu.artista.nome || "")}"><button class="btn primary">Salvar</button></form>`); },
    "fx-nova": () => sheetNova(),
    "fx-arq": () => escolherArq(),
    "fx-capa": () => escolherCapa(),
    "fx-play": el => tocar(el.dataset.id),
    "fx-menu": el => {
      const m = MS.porId.get(el.dataset.id); if (!m) return;
      window.abrirSheet(`<div class="sheet-h"><h2>${esc(m.titulo)}</h2></div><div class="cs-menu">
        <button data-s="fx-letra" data-id="${esc(m.id)}">${I.letra}<span><b>${m.letra ? "Editar letra" : "Adicionar letra"}</b></span></button>
        <button class="perigo" data-s="fx-apagar" data-id="${esc(m.id)}">${I.lixo}<span><b>Apagar faixa</b></span></button></div>`);
    },
    "fx-letra": el => {
      const m = MS.porId.get(el.dataset.id); if (!m) return;
      window.abrirSheet(`<div class="sheet-h"><h2>Letra</h2></div><form class="stack" id="fx-f-letra" data-id="${esc(m.id)}"><textarea class="in" id="fx-letra2" rows="10" maxlength="8000" placeholder="[00:12] Primeira linha&#10;[00:16] Segunda linha">${esc(m.letra || "")}</textarea><button class="btn primary">Salvar</button></form>`);
    },
    "fx-apagar": el => window.abrirSheet(`<div class="sheet-h"><h2>Apagar esta faixa?</h2></div><button class="btn perigo cs-grande" data-s="fx-apagar-ok" data-id="${esc(el.dataset.id)}">${I.lixo} Apagar</button><button class="btn ghost" data-s="fechar">Cancelar</button>`),
    "fx-apagar-ok": el => { window.fecharSheet(); apagarFaixa(el.dataset.id); },
    "faixa-abrir": el => { window.fecharSheet(); if (A.fecharXFlesh) A.fecharXFlesh(); abrirTela({ v: "faixa", id: el.dataset.id }); },
    "fx-curtir": el => curtir(el.dataset.id),
    "fx-compart": el => sheetCompart(el.dataset.id),
    "fx-c-mural": async el => {
      const m = MS.porId.get(el.dataset.id); window.fecharSheet(); if (!m) return;
      try {
        await fb.setDoc(fb.doc(C("posts")), { autor: eu(), texto: textoFaixa(m), fig: null, em: TS(), curtidas: [], nComent: 0, faixa: { id: m.id, titulo: m.titulo, artista: m.artista, capa: (m.capa && m.capa.length < 600) ? m.capa : null } });
        contarCompart(m.id); toast("Publicado no Mural!");
      } catch (e) { toast(msgErro(e)); }
    },
    "fx-c-conversa": el => { const m = MS.porId.get(el.dataset.id); if (!m) return; window.fecharSheet(); contarCompart(m.id); if (X.escolherConversa) X.escolherConversa(textoFaixa(m)); },
    "fx-c-fora": async el => {
      const m = MS.porId.get(el.dataset.id); if (!m) return; window.fecharSheet();
      const t = textoFaixa(m) + " · https://vonescoelho.github.io/senov-provas/";
      try { if (navigator.share) { await navigator.share({ title: m.titulo, text: t }); contarCompart(m.id); return; } } catch (e) { return; }
      A.copiar(t); contarCompart(m.id); toast("Copiado.");
    },
    "fx-usar": el => { const m = MS.porId.get(el.dataset.id); if (!m) return; parar(); if (X.criarXFlesh) X.criarXFlesh(paraLista(m)); }
  });
  document.addEventListener("submit", async e => {
    if (e.target.id === "fx-f-artista") {
      e.preventDefault();
      const nome = (($("#fx-nome") || {}).value || "").trim(), g = document.querySelector("[data-s=fx-gen][aria-pressed=true]");
      if (nome.length < 2) return toast("Digite o nome artístico.");
      if (ofensivo(nome)) return toast("Há palavras não permitidas.");
      const artista = { nome: nome.slice(0, 80), genero: g ? g.dataset.v : "", em: Date.now() };
      try { await fb.updateDoc(D("users", eu()), { artista }); if (SO.eu) SO.eu.artista = artista; pintar(); } catch (er) { toast(msgErro(er)); }
    }
    if (e.target.id === "fx-f-art2") {
      e.preventDefault(); const t = (($("#fx-nome2") || {}).value || "").trim().slice(0, 80);
      if (t.length < 2 || ofensivo(t)) return toast("Nome inválido.");
      try { const ar = { ...SO.eu.artista, nome: t }; await fb.updateDoc(D("users", eu()), { artista: ar }); SO.eu.artista = ar; window.fecharSheet(); pintar(); } catch (er) { toast(msgErro(er)); }
    }
    if (e.target.id === "fx-f-nova") { e.preventDefault(); publicarFaixa(); }
    if (e.target.id === "fx-f-letra") {
      e.preventDefault(); const id = e.target.dataset.id, t = (($("#fx-letra2") || {}).value || "").trim().slice(0, 8000);
      if (t && ofensivo(t)) return toast("Há palavras não permitidas.");
      try { await fb.updateDoc(D("musicas", id), { letra: t || null, editadoEm: TS() }); const m = MS.porId.get(id); if (m) m.letra = t || null; window.fecharSheet(); toast("Letra salva."); pintar(); } catch (er) { toast(msgErro(er)); }
    }
  });

  const css = document.createElement("style");
  css.textContent = `
.fx-pag{gap:14px}
.fx-hero{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:22px 16px;border-radius:24px;color:#fff;background:radial-gradient(120% 90% at 10% 0%,#7C3AED,transparent 60%),radial-gradient(120% 90% at 100% 100%,#EC4899,transparent 55%),#111827}
.fx-hero h2{margin:0;font-size:1.45rem}.fx-hero p{margin:0;opacity:.9;max-width:320px}.fx-hero small{opacity:.8}
.fx-hero-ic{width:62px;height:62px;border-radius:20px;background:rgba(255,255,255,.14);display:grid;place-items:center}.fx-hero-ic svg{width:34px;height:34px}
.fx-hero .btn.primary{background:#fff!important;color:#111827!important;border-color:#fff!important;box-shadow:0 8px 20px rgba(0,0,0,.25)!important;width:100%;max-width:340px;margin-top:6px}.fx-hero .btn svg{width:20px;height:20px;vertical-align:-4px;margin-right:6px}
.fx-nums{display:flex;gap:22px;margin-top:4px}.fx-nums div{display:flex;flex-direction:column}.fx-nums b{font-size:1.25rem}.fx-nums span{font-size:.75rem;opacity:.8}
.fx-meta{width:100%;max-width:300px;height:6px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}.fx-meta i{display:block;height:100%;background:linear-gradient(90deg,#FDE68A,#F472B6)}
.fx-meta-t{font-size:.75rem}
.fx-niv{display:inline-flex;align-items:center;gap:6px;font-size:.75rem;font-weight:800;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);padding:4px 10px;border-radius:99px}
.fx-hero .fx-niv{background:rgba(255,255,255,.14);color:#fff}
.fx-niv i{display:flex;gap:2px}.fx-niv b{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.3}.fx-niv b.on{opacity:1}
.fx-lista{display:flex;flex-direction:column;gap:4px}
.fx-li{display:flex;align-items:center;gap:8px;padding:6px;border-radius:16px;background:var(--surface)}
.fx-li-b{flex:1;min-width:0;display:flex;align-items:center;gap:12px;border:0;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;padding:0}
.fx-li-c,.fx-capa{width:52px;height:52px;border-radius:12px;object-fit:cover;flex:none}
.fx-capa-v{display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--c),#111827)}.fx-capa-v svg{width:45%;height:45%}
.fx-li-t{display:flex;flex-direction:column;min-width:0}.fx-li-t b,.fx-li-t small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fx-li-t small{color:var(--muted);font-size:.78rem}
.fx-mini{width:12px!important;height:12px!important;vertical-align:-1px}
.fx-play{width:42px;height:42px;border-radius:50%;border:0;background:var(--surface-2);color:var(--ink);display:grid;place-items:center;flex:none;cursor:pointer}.fx-play svg{width:18px;height:18px}
.fx-play.on{background:var(--primary);color:var(--primary-ink,#fff)}
.fx-play.grande{width:58px;height:58px;background:#fff;color:#111}.fx-play.grande svg{width:24px;height:24px}
.fx-ed-art{align-self:center}
.fx-nova-top{display:flex;gap:12px;align-items:stretch}
.fx-nova-capa{width:96px;height:96px;flex:none;border-radius:18px;border:2px dashed var(--line);background:var(--surface-2);color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;overflow:hidden;padding:0;font:inherit}
.fx-nova-capa svg{width:30px;height:30px}.fx-nova-capa img{width:100%;height:100%;object-fit:cover}
.fx-nova-arq{flex:1;display:flex;align-items:center;gap:8px;justify-content:center;text-align:left;white-space:normal}.fx-nova-arq svg{width:22px;height:22px;flex:none}
.fx-nova-arq.ok{border-color:var(--primary);color:var(--primary)}
.fx-album h2{display:flex;align-items:center;gap:6px}.fx-album h2 svg{width:20px;height:20px;color:var(--primary)}
.fx-album-l{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
.fx-al-it{flex:none;width:112px;border:0;background:none;padding:0;text-align:left;font:inherit;color:var(--ink);cursor:pointer;display:flex;flex-direction:column;gap:4px}
.fx-al-c{width:112px;height:112px;border-radius:16px;object-fit:cover;box-shadow:0 6px 16px rgba(0,0,0,.15)}
.fx-al-it b{font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fx-al-it small{color:var(--muted);font-size:.74rem}
.fx-faixa{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:24px 16px;border-radius:26px;color:#fff;background:radial-gradient(140% 100% at 50% 0%,color-mix(in srgb,var(--c) 75%,#000),#0b0b12 70%)}
.fx-faixa h1{margin:6px 0 0;font-size:1.5rem}.fx-art{color:#fff!important;opacity:.85;font-weight:700}
.fx-disco{width:min(62vw,240px);aspect-ratio:1;border-radius:50%;padding:10px;background:repeating-radial-gradient(circle,#111 0 2px,#1d1d1d 2px 4px);box-shadow:0 18px 40px rgba(0,0,0,.45);display:grid;place-items:center}
.fx-disco-c{width:100%;height:100%;border-radius:50%;object-fit:cover}
.fx-disco.gira{animation:fxgira 6s linear infinite}@keyframes fxgira{to{transform:rotate(360deg)}}
.fx-tocar{display:flex;align-items:center;gap:12px;width:100%;max-width:360px}.fx-tocar small{opacity:.8;font-variant-numeric:tabular-nums}
.fx-barra{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}.fx-barra i{display:block;height:100%;width:0;background:#fff}
.fx-kar{display:flex;flex-direction:column;gap:4px;min-height:64px;justify-content:center}
.fx-kar .a{font-size:1.25rem;font-weight:800;background:linear-gradient(90deg,#FDE047 var(--f),rgba(255,255,255,.9) var(--f));-webkit-background-clip:text;background-clip:text;color:transparent}
.fx-kar .b{opacity:.55;font-weight:600}
.fx-letra-fixa{opacity:.85;max-height:180px;overflow:auto;margin:0;font-size:.92rem;line-height:1.5}
.fx-acoes{display:flex;gap:10px}
.fx-ac{display:flex;align-items:center;gap:6px;border:0;border-radius:99px;padding:9px 14px;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-weight:800;cursor:pointer}
.fx-ac svg{width:20px;height:20px}.fx-ac.on{color:#FF3B6B}.fx-ac.on svg{fill:currentColor}.fx-ac[disabled]{cursor:default;opacity:.9}
.fx-usar{width:100%;max-width:360px;background:linear-gradient(90deg,#EC4899,#8B5CF6)!important;border:0!important;color:#fff!important}.fx-usar svg{width:20px;height:20px;vertical-align:-4px;margin-right:6px}
.fx-xfs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.fx-xf{position:relative;aspect-ratio:9/16;border:0;padding:0;border-radius:10px;overflow:hidden;background:#111;cursor:pointer}
.fx-xf img{width:100%;height:100%;object-fit:cover}.fx-xf small{position:absolute;left:6px;bottom:6px;color:#fff;font-weight:800;font-size:.74rem;text-shadow:0 1px 3px #000}
.fx-post{display:flex;align-items:center;gap:12px;width:100%;border:0;border-radius:16px;padding:8px;background:linear-gradient(90deg,color-mix(in srgb,#8B5CF6 16%,var(--surface-2)),var(--surface-2));font:inherit;color:var(--ink);text-align:left;cursor:pointer}
.fx-post-c{width:56px;height:56px;border-radius:12px;object-fit:cover;flex:none}
.fx-post>span{flex:1;min-width:0;display:flex;flex-direction:column}.fx-post b,.fx-post small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fx-post small{color:var(--muted)}
.fx-post>i{width:40px;height:40px;border-radius:50%;background:var(--primary);color:var(--primary-ink,#fff);display:grid;place-items:center}.fx-post>i svg{width:18px;height:18px}
`;
  document.head.appendChild(css);
})();
