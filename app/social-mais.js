/* ChatMil — ferramentas de aula: arquivos (PDF, DOCX, imagens, vídeos), apresentação em tela cheia/TV,
   videochamada, músicas e vídeos por conteúdo e Vitrine educativa. Depende de social.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, db, D, C, TS, ic, esc, eu, pintar, abrirTela, voltar, topo, enviarMsg, ofensivo, toast, msgErro, semAc, copiar } = A;
  const $ = s => document.querySelector(s);
  const KI = {
    video: ic('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>'),
    clipe: ic('<path d="m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
    tv: ic('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    cheia: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    ant: ic('<path d="M15 18l-6-6 6-6"/>'),
    prox: ic('<path d="m9 6 6 6-6 6"/>'),
    fechar: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    baixar: ic('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    musica: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    play: ic('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
    loja: ic('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>'),
    tag: ic('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    arq: ic('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
    img: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    link: ic('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    busca: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    mais: ic('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    copiar: ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
    mais2: ic('<path d="M12 5v14M5 12h14"/>'),
    ban: ic('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    lixo: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>')
  };
  const abrirUrl = u => { try { window.open(u, "_blank", "noopener"); } catch (e) { location.href = u; } };
  const tamanho = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB";

  /* ================= Videochamada (Jitsi Meet, gratuito) ================= */
  function salaDe(chatId) { return "ChatMil-" + String(chatId).replace(/[^A-Za-z0-9]/g, "").slice(0, 10) + "-" + Math.random().toString(36).slice(2, 8); }
  function abrirSala(sala) {
    const nome = (SO.eu && SO.eu.nome) || "";
    abrirUrl(`https://meet.jit.si/${encodeURIComponent(sala)}#userInfo.displayName=${encodeURIComponent(JSON.stringify(nome))}`);
  }
  X.chatBotoes = c => `<button class="cs-ico-bt" data-s="vc-iniciar" data-id="${esc(c.id)}" aria-label="Videochamada">${KI.video}</button>`;
  X.acoes["vc-iniciar"] = el => window.abrirSheet(`<div class="sheet-h"><h2>Videochamada</h2></div>
    <p class="cs-just">Todos da conversa recebem um convite para entrar. A chamada abre no <b>Jitsi Meet</b>, gratuito e sem anúncios. Na primeira vez, quem abre a sala pode precisar entrar com uma conta Google.</p>
    <button class="btn primary cs-grande" data-s="vc-criar" data-id="${esc(el.dataset.id)}">${KI.video} Iniciar videochamada</button>`);
  X.acoes["vc-criar"] = async el => {
    const sala = salaDe(el.dataset.id); window.fecharSheet();
    const ok = await enviarMsg(el.dataset.id, { chamada: sala, prev: "Videochamada" });
    if (ok !== false) abrirSala(sala);
  };
  X.acoes["vc-entrar"] = el => abrirSala(el.dataset.v);

  /* ================= Arquivos nas conversas ================= */
  const LIMITE = 20 * 1048576, PARTE = 700 * 1024;
  const TIPOS = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.txt,image/*,video/*,audio/*";
  function tipoPorNome(n) {
    const e = (n.split(".").pop() || "").toLowerCase();
    return { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain", mp4: "video/mp4", mp3: "audio/mpeg" }[e] || "application/octet-stream";
  }
  function genero(a) {
    const t = a.tipo || "", n = (a.nome || "").toLowerCase();
    if (t.startsWith("image/")) return "img"; if (t.startsWith("video/")) return "video"; if (t.startsWith("audio/")) return "audio";
    if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
    if (/wordprocessingml/.test(t) || n.endsWith(".docx")) return "docx";
    return "outro";
  }
  const COR = { img: "#15803D", video: "#7C3AED", audio: "#0E7490", pdf: "#DC2626", docx: "#2447C6", outro: "#64748B" };
  const ROTULO = { img: "Imagem", video: "Vídeo", audio: "Áudio", pdf: "PDF", docx: "Word", outro: "Arquivo" };
  async function comprimirImg(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const M = 1800, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85));
    } finally { URL.revokeObjectURL(url); }
  }
  function progresso(f, nome) {
    let el = $("#cs-up");
    if (f == null) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "cs-up"; el.className = "cs-up"; document.body.appendChild(el); }
    el.innerHTML = `<span>Enviando ${esc(nome)}…</span><i style="width:${Math.round(f * 100)}%"></i>`;
  }
  async function enviarArquivo(chatId, file) {
    let blob = file, nome = (file.name || "arquivo").slice(0, 120), tipo = file.type || tipoPorNome(file.name || "");
    if (ofensivo(nome)) return toast("O nome do arquivo tem palavras não permitidas.");
    if (/^image\/(jpeg|png|webp|heic|heif)/.test(tipo)) { try { blob = await comprimirImg(file); tipo = "image/jpeg"; nome = nome.replace(/\.\w+$/, "") + ".jpg"; } catch (e) { } }
    if (blob.size > LIMITE) return toast(`Arquivo grande demais (máximo ${LIMITE / 1048576} MB). Para vídeos longos, envie o link do YouTube ou do Drive.`);
    const ref = fb.doc(C("arquivos")), n = Math.max(1, Math.ceil(blob.size / PARTE));
    progresso(0, nome);
    try {
      await fb.setDoc(ref, { dono: eu(), chatId, nome, tipo, tamanho: blob.size, partes: n, criadoEm: TS() });
      const buf = new Uint8Array(await blob.arrayBuffer());
      for (let i = 0; i < n; i++) {
        await fb.setDoc(D("arquivos", ref.id, "partes", String(i).padStart(4, "0")), { d: fb.Bytes.fromUint8Array(buf.subarray(i * PARTE, (i + 1) * PARTE)) });
        progresso((i + 1) / n, nome);
      }
      CACHE.set(ref.id, blob);
      await enviarMsg(chatId, { arquivo: { id: ref.id, nome, tipo, tamanho: blob.size }, prev: "Arquivo: " + nome });
    } catch (e) { console.warn(e); toast(msgErro(e)); }
    progresso(null);
  }
  const CACHE = new Map();
  async function obterArquivo(a) {
    if (CACHE.has(a.id)) return CACHE.get(a.id);
    const s = await fb.getDocs(C("arquivos", a.id, "partes"));
    const partes = s.docs.slice().sort((x, y) => x.id.localeCompare(y.id)).map(d => d.data().d.toUint8Array());
    const blob = new Blob(partes, { type: a.tipo || "application/octet-stream" });
    CACHE.set(a.id, blob); return blob;
  }
  X.composerBotoes = c => `<button type="button" class="cs-ico-bt" data-s="arq-escolher" data-id="${esc(c.id)}" aria-label="Enviar arquivo, foto ou vídeo">${KI.clipe}</button>`;
  X.acoes["arq-escolher"] = el => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = TIPOS; inp.multiple = true;
    inp.onchange = async () => { for (const f of inp.files) await enviarArquivo(el.dataset.id, f); };
    inp.click();
  };
  const ACHADOS = {};
  function acharArq(id) { return ACHADOS[id]; }
  X.msg = (m, o) => {
    const cls = `cs-m ${o.meu ? "eu" : ""} ${o.seq ? "seq" : ""}`;
    if (m.chamada) return `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b cs-cmsg">${o.nome}
      <div class="cs-cmsg-l"><span class="cs-cmsg-ic" style="--c:#7C3AED">${KI.video}</span><span><b>Videochamada</b><small>${o.meu ? "Você iniciou" : "Convite para entrar"}</small></span></div>
      <button class="btn sm primary" data-s="vc-entrar" data-v="${esc(m.chamada)}">Entrar na chamada</button><span class="cs-h">${o.hr}</span></div></div>`;
    const a = m.arquivo; ACHADOS[a.id] = a;
    const g = genero(a), apres = ["img", "video", "pdf", "docx", "audio"].includes(g);
    return `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b cs-cmsg">${o.nome}
      <div class="cs-cmsg-l"><span class="cs-cmsg-ic" style="--c:${COR[g]}">${g === "img" ? KI.img : g === "video" ? KI.play : g === "audio" ? KI.musica : KI.arq}</span>
        <span><b>${esc(a.nome)}</b><small>${ROTULO[g]} · ${tamanho(a.tamanho || 0)}</small></span></div>
      <div class="row cs-cmsg-bt">${apres ? `<button class="btn sm primary" data-s="arq-apresentar" data-v="${esc(a.id)}">${g === "audio" ? "Ouvir" : g === "video" ? "Assistir" : "Apresentar"}</button>` : ""}
        <button class="btn sm" data-s="arq-abrir" data-v="${esc(a.id)}">${KI.baixar} Salvar</button></div><span class="cs-h">${o.hr}</span></div></div>`;
  };
  X.acoes["arq-abrir"] = async el => {
    const a = acharArq(el.dataset.v); if (!a) return;
    try {
      toast("Preparando o arquivo…");
      const blob = await obterArquivo(a);
      if (typeof S !== "undefined" && S.dl) await S.dl.save({ filename: a.nome, data: blob });
      else { const u = URL.createObjectURL(blob), x = document.createElement("a"); x.href = u; x.download = a.nome; x.click(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    } catch (e) { console.warn(e); toast("Não foi possível abrir o arquivo."); }
  };
  X.acoes["arq-apresentar"] = el => { const a = acharArq(el.dataset.v); if (a) apresentar(a); };

  /* ================= Apresentação (tela cheia, projetor e TV) ================= */
  let pdfjsP = null, mammothP = null;
  const base = () => new URL(".", location.href).href;
  function carregarPdfjs() {
    return pdfjsP || (pdfjsP = import(base() + "vendor/pdfjs/pdf.min.js").then(m => { m.GlobalWorkerOptions.workerSrc = base() + "vendor/pdfjs/pdf.worker.min.js"; return m; }));
  }
  function carregarScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function carregarMammoth() { return mammothP || (mammothP = window.mammoth ? Promise.resolve(window.mammoth) : carregarScript(base() + "vendor/mammoth.browser.min.js").then(() => window.mammoth)); }
  const AP = { el: null, url: null, pdf: null, pag: 1, total: 1, tipo: "", fonte: 1.25 };
  function fecharApres() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { }
    if (AP.el) AP.el.remove(); AP.el = null; if (AP.url) URL.revokeObjectURL(AP.url); AP.url = null; AP.pdf = null;
    document.body.classList.remove("cs-apres-on");
  }
  async function apresentar(a) {
    fecharApres();
    const g = genero(a); AP.tipo = g; AP.pag = 1; AP.total = 1;
    const el = document.createElement("div"); el.className = "cs-apres"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Apresentação");
    el.innerHTML = `<div class="cs-ap-top"><button class="cs-ap-bt" data-s="ap-fechar" aria-label="Fechar">${KI.fechar}</button><b>${esc(a.nome)}</b>
      <span class="cs-ap-pg" id="cs-ap-pg"></span>
      ${g === "docx" ? `<button class="cs-ap-bt" data-s="ap-fonte" data-v="-1" aria-label="Diminuir letra">A−</button><button class="cs-ap-bt" data-s="ap-fonte" data-v="1" aria-label="Aumentar letra">A+</button>` : ""}
      <button class="cs-ap-bt" data-s="ap-tv" aria-label="Mostrar na TV ou projetor">${KI.tv}</button><button class="cs-ap-bt" data-s="ap-cheia" aria-label="Tela cheia">${KI.cheia}</button></div>
      <div class="cs-ap-palco" id="cs-ap-palco"><div class="spin"></div></div>
      ${g === "pdf" ? `<button class="cs-ap-nav esq" data-s="ap-ant" aria-label="Página anterior">${KI.ant}</button><button class="cs-ap-nav dir" data-s="ap-prox" aria-label="Próxima página">${KI.prox}</button>` : ""}`;
    document.body.appendChild(el); AP.el = el; document.body.classList.add("cs-apres-on");
    let x0 = null;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", e => { if (x0 == null || AP.tipo !== "pdf") return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) irPag(AP.pag + (dx < 0 ? 1 : -1)); x0 = null; });
    const palco = $("#cs-ap-palco");
    try {
      const blob = await obterArquivo(a); if (AP.el !== el) return;
      AP.url = URL.createObjectURL(blob);
      if (g === "img") palco.innerHTML = `<img src="${AP.url}" alt="${esc(a.nome)}">`;
      else if (g === "video") palco.innerHTML = `<video id="cs-ap-video" src="${AP.url}" controls autoplay playsinline></video>`;
      else if (g === "audio") palco.innerHTML = `<div class="cs-ap-audio">${KI.musica}<b>${esc(a.nome)}</b><audio src="${AP.url}" controls autoplay></audio></div>`;
      else if (g === "pdf") {
        const pdfjs = await carregarPdfjs();
        AP.pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        AP.total = AP.pdf.numPages; palco.innerHTML = `<canvas id="cs-ap-canvas"></canvas>`; await irPag(1);
      } else if (g === "docx") {
        const mammoth = await carregarMammoth();
        const r = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        palco.innerHTML = `<div class="cs-ap-doc" id="cs-ap-doc" style="font-size:${AP.fonte}rem">${r.value}</div>`;
      }
    } catch (e) { console.warn(e); palco.innerHTML = `<div class="cs-ap-erro"><b>Não foi possível mostrar este arquivo.</b><span>Use “Salvar” para abrir no aplicativo do aparelho.</span></div>`; }
  }
  async function irPag(n) {
    if (!AP.pdf) return;
    n = Math.max(1, Math.min(AP.total, n)); AP.pag = n;
    const pg = $("#cs-ap-pg"); if (pg) pg.textContent = `${n} / ${AP.total}`;
    const page = await AP.pdf.getPage(n), cv = $("#cs-ap-canvas"), palco = $("#cs-ap-palco"); if (!cv || !palco) return;
    const v1 = page.getViewport({ scale: 1 }), esc2 = Math.min(palco.clientWidth / v1.width, palco.clientHeight / v1.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2), vp = page.getViewport({ scale: esc2 * dpr });
    cv.width = vp.width; cv.height = vp.height; cv.style.width = vp.width / dpr + "px"; cv.style.height = vp.height / dpr + "px";
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
  }
  X.acoes["ap-fechar"] = fecharApres;
  X.acoes["ap-ant"] = () => irPag(AP.pag - 1);
  X.acoes["ap-prox"] = () => irPag(AP.pag + 1);
  X.acoes["ap-fonte"] = el => { AP.fonte = Math.max(0.9, Math.min(2.6, AP.fonte + 0.15 * +el.dataset.v)); const d = $("#cs-ap-doc"); if (d) d.style.fontSize = AP.fonte + "rem"; };
  X.acoes["ap-cheia"] = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else { await AP.el.requestFullscreen(); try { await screen.orientation.lock("landscape"); } catch (e) { } } } catch (e) { toast("Tela cheia indisponível neste aparelho."); }
    setTimeout(() => irPag(AP.pag), 300);
  };
  X.acoes["ap-tv"] = async () => {
    const v = $("#cs-ap-video");
    if (v && v.remote && v.remote.prompt) { try { await v.remote.prompt(); return; } catch (e) { } }
    window.abrirSheet(`<div class="sheet-h"><h2>Mostrar na TV ou no projetor</h2></div>
      <ul class="cs-ul">
        <li><b>TV sem fio (celular Android):</b> puxe a barra de notificações e toque em <b>Smart View</b> (Samsung) ou <b>Transmitir tela</b>. Escolha a TV. Depois toque em <b>Tela cheia</b> aqui.</li>
        <li><b>Projetor ou TV com cabo:</b> ligue um cabo HDMI (ou adaptador USB-C para HDMI) e toque em <b>Tela cheia</b>.</li>
        <li><b>Computador da escola:</b> abra o ChatMil pelo site, entre na sua conta e apresente em tela cheia.</li>
        <li><b>Vídeos:</b> se a TV tiver Chromecast, o botão de TV do próprio vídeo envia direto para ela.</li>
      </ul><button class="btn primary" data-s="fechar">Entendi</button>`);
  };
  document.addEventListener("keydown", e => {
    if (!AP.el) return;
    if (e.key === "Escape" && !document.fullscreenElement) fecharApres();
    if (AP.tipo === "pdf" && (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ")) { e.preventDefault(); irPag(AP.pag + 1); }
    if (AP.tipo === "pdf" && (e.key === "ArrowLeft" || e.key === "PageUp")) { e.preventDefault(); irPag(AP.pag - 1); }
  });
  window.addEventListener("resize", () => { if (AP.tipo === "pdf" && AP.el) irPag(AP.pag); });
  const voltarAnt = window.SENOV_voltar;
  window.SENOV_voltar = function () { if (AP.el) { fecharApres(); return true; } return voltarAnt ? voltarAnt() : false; };

  /* ================= Músicas e vídeos por conteúdo ================= */
  const R = (() => { try { return JSON.parse(localStorage.getItem("cs.rec") || "{}"); } catch (e) { return {}; } })();
  function lembrarRec() { try { localStorage.setItem("cs.rec", JSON.stringify(R)); } catch (e) { } }
  const yt = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  const gg = (site, q) => "https://www.google.com/search?q=" + encodeURIComponent("site:" + site + " " + q);
  function sugestoes() {
    const ass = (R.assunto || "").trim(); if (!ass) return [];
    const disc = R.disciplina || "", ser = R.serie || "", fim = R.fim || "aula";
    const iniciais = /^[1-5]º ano/.test(ser), cie = /Ciências|Biologia|Física|Química/.test(disc), arte = /Arte|Língua|Inglesa/.test(disc);
    const v = [], m = [], s = [];
    if (fim === "aula") { v.push(["Videoaula", `${ass} ${disc} ${ser} videoaula`]); v.push(["Animação", `${ass} animação educativa${iniciais ? " infantil" : ""}`]); if (cie) v.push(["Experimento", `${ass} experimento para sala de aula`]); }
    if (fim === "revisao") { v.push(["Resumo para revisão", `${ass} resumo revisão ${ser}`]); v.push(["Mapa mental", `${ass} mapa mental explicação`]); }
    if (fim === "avaliacao") { v.push(["Exercícios resolvidos", `${ass} exercícios resolvidos ${ser}`]); v.push(["Questões comentadas", `${ass} questões comentadas`]); }
    v.push(["Em Libras (inclusão)", `${ass} em Libras`]); v.push(["Com audiodescrição", `${ass} audiodescrição`]);
    m.push(["Música educativa", `música educativa ${ass}${iniciais ? " infantil" : ""}`]); m.push(["Paródia", `paródia ${ass} ${disc}`]);
    if (arte) m.push(["Canções sobre o tema", `canção ${ass}`]);
    if (fim === "revisao" || fim === "avaliacao") m.push(["Música para memorizar", `música para memorizar ${ass}`]);
    s.push(["Khan Academy", "https://pt.khanacademy.org/search?page_search_query=" + encodeURIComponent(ass), "Aulas e exercícios gratuitos"]);
    s.push(["Nova Escola", gg("novaescola.org.br", ass + " " + ser), "Planos de aula"]);
    s.push(["Brasil Escola", gg("brasilescola.uol.com.br", ass), "Textos de apoio"]);
    s.push(["Portal MEC (recursos abertos)", gg("plataformaintegrada.mec.gov.br", ass), "Recursos educacionais abertos"]);
    return [["Vídeos", KI.play, v.map(([t, q]) => [t, yt(q), "YouTube · " + q])], ["Músicas", KI.musica, m.map(([t, q]) => [t, yt(q), "YouTube · " + q])], ["Sites educativos", KI.link, s]];
  }
  function vRecursos() {
    const discs = typeof DISCIPLINAS !== "undefined" ? DISCIPLINAS : [];
    const series = typeof SERIES !== "undefined" ? [...SERIES.EF, ...SERIES.EM] : [];
    const conts = typeof S !== "undefined" ? [...new Set(S.questoes.filter(q => !R.disciplina || q.disciplina === R.disciplina).map(q => q.conteudo).filter(Boolean))].slice(0, 40) : [];
    const grupos = sugestoes();
    return `<section class="card stack">
      <div class="grid2">
        <label class="f" for="rc-disc">Disciplina<select class="in" id="rc-disc"><option value="">Qualquer</option>${discs.map(d => `<option ${R.disciplina === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
        <label class="f" for="rc-serie">Série/ano<select class="in" id="rc-serie"><option value="">Qualquer</option>${series.map(d => `<option ${R.serie === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
      </div>
      <label class="f" for="rc-ass">Conteúdo ou assunto<input class="in" id="rc-ass" list="rc-lista" value="${esc(R.assunto || "")}" placeholder="Ex.: frações, fotossíntese, Independência do Brasil"></label>
      <datalist id="rc-lista">${conts.map(c => `<option value="${esc(c)}">`).join("")}</datalist>
      <div class="seg">${[["aula", "Para a aula"], ["revisao", "Revisão"], ["avaliacao", "Avaliação"]].map(([k, n]) => `<button data-s="rc-fim" data-v="${k}" aria-pressed="${(R.fim || "aula") === k}">${n}</button>`).join("")}</div>
      <button class="btn primary" data-s="rc-buscar">${KI.busca} Sugerir músicas e vídeos</button>
      <p class="small muted">As buscas abrem no YouTube e em sites educativos. Assista antes de passar para a turma.</p>
    </section>
    ${grupos.map(([t, icone, itens]) => `<h2 class="cs-sec">${t}</h2><div class="stack" style="gap:8px">${itens.map(([n, u, sub]) => `<div class="card flat cs-rec">
      <span class="cs-rec-ic">${icone}</span><span class="cs-rec-t"><b>${esc(n)}</b><small>${esc(sub)}</small></span>
      <button class="cs-ico-bt" data-s="rc-abrir" data-v="${esc(u)}" aria-label="Abrir ${esc(n)}">${KI.link}</button>
      <button class="cs-ico-bt" data-s="rc-enviar" data-v="${esc(u)}" data-n="${esc(n)}" aria-label="Enviar para uma conversa">${KI.enviar}</button></div>`).join("")}</div>`).join("")}`;
  }
  X.provasSub.push({ k: "recursos", n: "Músicas e vídeos", view: vRecursos });
  function lerRec() {
    const d = $("#rc-disc"), s = $("#rc-serie"), a = $("#rc-ass");
    if (d) R.disciplina = d.value; if (s) R.serie = s.value; if (a) R.assunto = a.value.trim(); lembrarRec();
  }
  X.acoes["rc-fim"] = el => { lerRec(); R.fim = el.dataset.v; lembrarRec(); pintar(); };
  X.acoes["rc-buscar"] = () => { lerRec(); if (!R.assunto) return toast("Digite o conteúdo ou assunto."); if (ofensivo(R.assunto)) return toast("Assunto não permitido."); pintar(); };
  X.acoes["rc-abrir"] = el => abrirUrl(el.dataset.v);
  X.acoes["rc-enviar"] = el => escolherConversa(`${el.dataset.n} — ${R.assunto}: ${el.dataset.v}`);
  function escolherConversa(texto) {
    const lista = SO.chats.filter(c => c.tipo === "grupo" || c.ultima).slice(0, 30);
    if (!lista.length) { copiar(texto); return; }
    window.abrirSheet(`<div class="sheet-h"><h2>Enviar para…</h2></div><div class="cs-menu">${lista.map(c => { const t = A.tituloChat(c); return `<button data-s="rc-para" data-id="${esc(c.id)}">${t.av(40)}<span><b>${esc(t.nome)}</b></span></button>`; }).join("")}
      <button data-s="rc-copiar">${KI.copiar}<span><b>Só copiar o link</b></span></button></div>`);
    X._texto = texto;
  }
  X.acoes["rc-para"] = async el => { window.fecharSheet(); const ok = await enviarMsg(el.dataset.id, { texto: X._texto }); if (ok !== false) toast("Enviado!"); };
  X.acoes["rc-copiar"] = () => { window.fecharSheet(); copiar(X._texto); };

  /* ================= Vitrine educativa ================= */
  const V = { itens: null, admin: false, q: "", cat: "tudo", un: null };
  const CATS = [["tudo", "Tudo"], ["promocoes", "Promoções"], ["cursos", "Cursos"], ["livros", "Livros"], ["materiais", "Materiais"], ["tecnologia", "Tecnologia"], ["eventos", "Eventos"]];
  const PROIBIDOS = ["aposta", "apostas", "bet", "cassino", "loteria", "jogo de azar", "bebida", "cerveja", "vinho", "vodka", "whisky", "cigarro", "vape", "tabaco", "arma", "armas", "municao", "sensual", "erotico", "adulto", "+18", "emprestimo", "consignado", "criptomoeda", "piramide", "candidato", "partido"];
  const naoEducativo = t => { const n = " " + semAc(t).replace(/[^a-z0-9+ ]/g, " ") + " "; return PROIBIDOS.some(p => n.includes(" " + p + " ")); };
  const chaveInt = () => "cs.vit." + eu();
  const interesses = () => { try { return JSON.parse(localStorage.getItem(chaveInt()) || "{}"); } catch (e) { return {}; } };
  function marcarInteresse(it) { const m = interesses(); (it.tags || []).concat(it.categoria || []).forEach(t => m[t] = (m[t] || 0) + 1); try { localStorage.setItem(chaveInt(), JSON.stringify(m)); } catch (e) { } }
  function ouvirVitrine() {
    if (V.un) return;
    V.un = fb.onSnapshot(fb.query(C("vitrine"), fb.orderBy("criadoEm", "desc"), fb.limit(150)), s => { V.itens = s.docs.map(d => ({ id: d.id, ...d.data() })); if (SO.tab === "vitrine") pintar(); },
      e => { console.warn(e); V.itens = []; pintar(); });
    fb.getDoc(D("admins", eu())).then(s => { V.admin = s.exists(); if (SO.tab === "vitrine") pintar(); }).catch(() => { });
  }
  function pontuar(it, pers) {
    if (!pers) return 0;
    const m = interesses(), eu_ = SO.eu || {}, tags = (it.tags || []).map(semAc);
    let p = 0;
    (eu_.disciplinas || []).forEach(d => { if (tags.includes(semAc(d))) p += 3; });
    (it.tags || []).forEach(t => p += Math.min(3, m[t] || 0) * 0.7);
    p += Math.min(2, m[it.categoria] || 0) * 0.5;
    if (it.promo) p += 1.5;
    return p;
  }
  function vVitrine() {
    ouvirVitrine();
    const eu_ = SO.eu || {}, pers = eu_.vitPers !== false, bloq = new Set(eu_.vitBloq || []), hoje = new Date().toISOString().slice(0, 10);
    const q = semAc(V.q);
    let lista = (V.itens || []).filter(it => it.ativo !== false && (!it.validade || it.validade >= hoje)
      && !(it.tags || []).some(t => bloq.has(t)) && !bloq.has(it.categoria)
      && (V.cat === "tudo" || (V.cat === "promocoes" ? it.promo : it.categoria === V.cat))
      && (!q || semAc([it.titulo, it.descricao, (it.tags || []).join(" ")].join(" ")).includes(q)));
    lista = lista.map(it => ({ it, p: pontuar(it, pers) })).sort((a, b) => (b.p - a.p) || ((b.it.criadoEm && b.it.criadoEm.seconds || 0) - (a.it.criadoEm && a.it.criadoEm.seconds || 0))).map(x => x.it);
    return `<div class="cs-cab"><h1>Vitrine</h1>${V.admin ? `<button class="btn sm primary" data-s="vit-nova">${KI.mais2} Nova oferta</button>` : ""}</div>
      <p class="small muted">Ofertas e promoções educativas selecionadas para professores. Nada de anúncio nas conversas.</p>
      <label class="cs-busca">${KI.busca}<input id="vit-q" placeholder="Pesquisar cursos, livros, materiais…" value="${esc(V.q)}" aria-label="Pesquisar na vitrine"></label>
      <div class="chips cs-vit-cats">${CATS.map(([k, n]) => `<button class="chip" data-s="vit-cat" data-v="${k}" aria-pressed="${V.cat === k}">${n}</button>`).join("")}</div>
      <label class="cs-linha-sw card flat" for="vit-pers" style="display:flex;align-items:center;gap:12px;padding:12px"><span style="flex:1"><b>Mostrar primeiro o que combina comigo</b><br><small class="muted">Usa suas disciplinas e as ofertas que você abriu. Fica só neste aparelho e no seu perfil.</small></span><input type="checkbox" class="cs-sw" id="vit-pers" ${pers ? "checked" : ""}></label>
      ${V.itens == null ? `<div class="cs-carr"><div class="spin"></div></div>` : lista.length ? `<div class="stack">${lista.map(cardVit).join("")}</div>`
        : `<div class="empty"><b>${(V.itens || []).length ? "Nada encontrado com esses filtros" : "A vitrine está sendo montada"}</b><span>${(V.itens || []).length ? "Tente outra pesquisa ou categoria." : "Em breve, cursos, livros e materiais com condições especiais para professores."}</span></div>`}
      ${bloq.size ? `<button class="btn ghost" data-s="vit-bloqueados">${KI.ban} Assuntos que você escondeu (${bloq.size})</button>` : ""}`;
  }
  function cardVit(it) {
    const cat = (CATS.find(c => c[0] === it.categoria) || [, "Oferta"])[1];
    return `<article class="card cs-vit">
      ${it.imagem ? `<img class="cs-vit-img" src="${esc(it.imagem)}" alt="">` : ""}
      <div class="row" style="gap:6px"><span class="pill">${esc(cat)}</span>${it.promo ? `<span class="pill cs-promo">Promoção</span>` : ""}${it.preco ? `<span class="pill d1">${esc(it.preco)}</span>` : ""}
        <span style="flex:1"></span><button class="cs-ico-bt sm" data-s="vit-menu" data-id="${esc(it.id)}" aria-label="Opções">${KI.mais}</button></div>
      <h3>${esc(it.titulo)}</h3>
      ${it.descricao ? `<p class="cs-just cs-vit-desc">${esc(it.descricao)}</p>` : ""}
      ${(it.tags || []).length ? `<div class="chips">${it.tags.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>` : ""}
      ${it.validade ? `<small class="muted">Válido até ${esc(it.validade.split("-").reverse().join("/"))}</small>` : ""}
      <button class="btn primary" data-s="vit-abrir" data-id="${esc(it.id)}">${KI.link} Ver oferta</button></article>`;
  }
  X.tabs.push({ pos: 2, k: "vitrine", n: "Vitrine", i: KI.loja });
  X.tabViews.vitrine = vVitrine;
  X.acoes["vit-cat"] = el => { V.cat = el.dataset.v; pintar(); };
  X.acoes["vit-abrir"] = el => { const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return; marcarInteresse(it); abrirUrl(it.link); };
  X.acoes["vit-menu"] = el => {
    const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return;
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(it.titulo)}</h2></div><div class="cs-menu">
      ${(it.tags || []).concat(it.categoria ? [it.categoria] : []).map(t => `<button data-s="vit-esconder" data-v="${esc(t)}">${KI.ban}<span><b>Não mostrar “${esc((CATS.find(c => c[0] === t) || [, t])[1])}”</b><small>Esconde todas as ofertas deste assunto</small></span></button>`).join("")}
      <button data-s="denunciar" data-tipo="vitrine" data-uid="" data-id="${esc(it.id)}">${KI.ban}<span><b>Denunciar oferta</b><small>Conteúdo que não combina com a escola</small></span></button>
      ${V.admin ? `<button class="perigo" data-s="vit-remover" data-id="${esc(it.id)}">${KI.lixo}<span><b>Remover da vitrine</b></span></button>` : ""}</div>`);
  };
  async function salvarPrefs(patch) { try { await fb.updateDoc(D("users", eu()), patch); } catch (e) { toast(msgErro(e)); } }
  X.acoes["vit-esconder"] = async el => { window.fecharSheet(); await salvarPrefs({ vitBloq: fb.arrayUnion(el.dataset.v) }); toast("Assunto escondido. Você pode desfazer no fim da Vitrine."); };
  X.acoes["vit-bloqueados"] = () => {
    const b = (SO.eu && SO.eu.vitBloq) || [];
    window.abrirSheet(`<div class="sheet-h"><h2>Assuntos escondidos</h2></div><div class="cs-menu">${b.map(t => `<button data-s="vit-mostrar" data-v="${esc(t)}">${KI.tag}<span><b>${esc((CATS.find(c => c[0] === t) || [, t])[1])}</b><small>Toque para voltar a mostrar</small></span></button>`).join("")}</div>`);
  };
  X.acoes["vit-mostrar"] = async el => { window.fecharSheet(); await salvarPrefs({ vitBloq: fb.arrayRemove(el.dataset.v) }); };
  X.acoes["vit-remover"] = async el => { window.fecharSheet(); try { await fb.deleteDoc(D("vitrine", el.dataset.id)); toast("Oferta removida."); } catch (e) { toast(msgErro(e)); } };
  document.addEventListener("input", e => { if (e.target.id === "vit-q") { V.q = e.target.value; clearTimeout(V.t); V.t = setTimeout(pintar, 250); } });
  document.addEventListener("change", e => { if (e.target.id === "vit-pers") salvarPrefs({ vitPers: e.target.checked }); });

  /* ---- nova oferta (só administradores) ---- */
  const NV = { foto: null };
  X.acoes["vit-nova"] = () => { NV.foto = null; abrirTela({ v: "vit-nova" }); };
  X.views["vit-nova"] = () => `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${KI.ant}</button><b>Nova oferta</b></header>
    <form class="cs-pag stack" id="vit-f" novalidate>
      <label class="f" for="vn-tit">Título<input class="in" id="vn-tit" maxlength="120" placeholder="Ex.: Curso de alfabetização com 30% de desconto"></label>
      <label class="f" for="vn-desc">Descrição<textarea class="in" id="vn-desc" maxlength="600" rows="4"></textarea></label>
      <label class="f" for="vn-link">Link da oferta (https://…)<input class="in" id="vn-link" type="url" inputmode="url"></label>
      <div class="grid2"><label class="f" for="vn-cat">Categoria<select class="in" id="vn-cat">${CATS.slice(2).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
        <label class="f" for="vn-val">Válido até (opcional)<input class="in" id="vn-val" type="date"></label></div>
      <label class="f" for="vn-tags">Assuntos (separe por vírgula)<input class="in" id="vn-tags" placeholder="Ex.: Língua Portuguesa, alfabetização, AEE"></label>
      <div class="grid2"><label class="cs-aceite" for="vn-promo"><input type="checkbox" id="vn-promo"><span>É uma promoção</span></label>
        <label class="f" for="vn-preco">Preço ou desconto (opcional)<input class="in" id="vn-preco" maxlength="40" placeholder="Ex.: R$ 49,90 ou 30% off"></label></div>
      <label class="f" for="vn-img">Imagem (opcional)<input class="in" id="vn-img" type="file" accept="image/*"></label>
      <p class="small muted">Só entram ofertas ligadas à educação. Apostas, bebidas, cigarro, armas, conteúdo adulto, empréstimos e política partidária são recusados.</p>
      <button class="btn primary cs-grande">Publicar na vitrine</button></form>`;
  document.addEventListener("change", async e => {
    if (e.target.id === "vn-img" && e.target.files[0]) {
      try { const b = await comprimirImg(e.target.files[0]); NV.foto = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); if (NV.foto.length > 190000) { NV.foto = null; toast("Imagem grande demais. Use outra menor."); } }
      catch (er) { toast("Não foi possível usar esta imagem."); }
    }
  });
  document.addEventListener("submit", async e => {
    if (e.target.id !== "vit-f") return; e.preventDefault();
    const tit = $("#vn-tit").value.trim(), desc = $("#vn-desc").value.trim(), link = $("#vn-link").value.trim();
    const tags = $("#vn-tags").value.split(",").map(t => t.trim()).filter(Boolean).slice(0, 8);
    const tudo = [tit, desc, tags.join(" ")].join(" ");
    if (tit.length < 4) return toast("Dê um título à oferta.");
    if (!/^https:\/\/[^\s]+\.[^\s]+/.test(link)) return toast("O link precisa começar com https://");
    if (ofensivo(tudo) || naoEducativo(tudo)) return toast("Oferta recusada: o assunto não combina com o meio educativo.");
    try {
      await fb.addDoc(C("vitrine"), { titulo: tit, descricao: desc, link, categoria: $("#vn-cat").value, tags, promo: $("#vn-promo").checked,
        preco: $("#vn-preco").value.trim(), validade: $("#vn-val").value || "", imagem: NV.foto || null, ativo: true, autor: eu(), criadoEm: TS() });
      toast("Oferta publicada."); voltar();
    } catch (er) { toast(msgErro(er)); }
  });

  /* ================= Estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
body.cs-5abas .nav-in{grid-template-columns:repeat(5,1fr);max-width:680px}
body.cs-5abas .nav button{font-size:.7rem;padding-inline:2px}
body.cs-5abas .nav .ico{padding:3px 12px}
.cs-cmsg{min-width:230px;gap:8px}
.cs-cmsg-l{display:flex;align-items:center;gap:10px}
.cs-cmsg-l>span:last-child{display:flex;flex-direction:column;min-width:0}
.cs-cmsg-l b{overflow-wrap:anywhere;line-height:1.25}
.cs-cmsg-l small{opacity:.8;font-size:.8rem}
.cs-cmsg-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none;background:var(--c)}
.cs-m.eu .cs-cmsg-ic{background:#fff;color:var(--c)}
.cs-cmsg-ic svg{width:22px;height:22px}
.cs-cmsg .btn{align-self:flex-start}
.cs-m.eu .cs-cmsg .btn:not(.primary){background:color-mix(in srgb,var(--primary-ink) 15%,transparent);color:var(--primary-ink);border-color:transparent}
.cs-m.eu .cs-cmsg .btn.primary{background:var(--primary-ink);color:var(--primary)}
.cs-cmsg-bt{gap:6px}
.cs-cmsg-bt .btn svg{width:16px;height:16px}
.cs-up{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;background:var(--ink);color:var(--bg);border-radius:14px;padding:10px 14px 14px;font-weight:700;font-size:.9rem;overflow:hidden}
.cs-up i{position:absolute;left:0;bottom:0;height:4px;background:var(--primary);transition:width .2s}
body.cs-apres-on{overflow:hidden}
body.cs-apres-on .scrim{z-index:100}
body.cs-apres-on .toast{z-index:101}
.cs-apres{position:fixed;inset:0;z-index:95;background:#0b0f1a;color:#fff;display:flex;flex-direction:column}
.cs-ap-top{display:flex;align-items:center;gap:6px;padding:calc(6px + env(safe-area-inset-top,0px)) 8px 6px;background:rgba(0,0,0,.35)}
.cs-ap-top b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1rem}
.cs-ap-pg{font-variant-numeric:tabular-nums;opacity:.85;font-weight:700;padding:0 6px}
.cs-ap-bt{min-width:46px;height:46px;border-radius:12px;border:0;background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;cursor:pointer;font-weight:800;font-size:1rem}
.cs-ap-bt svg{width:24px;height:24px}
.cs-ap-palco{flex:1;min-height:0;display:grid;place-items:center;overflow:auto;padding:8px}
.cs-ap-palco img,.cs-ap-palco video{max-width:100%;max-height:100%;object-fit:contain}
.cs-ap-palco canvas{background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.cs-ap-doc{background:#fff;color:#111;max-width:900px;width:100%;align-self:start;padding:28px 32px;border-radius:8px;line-height:1.55;text-align:justify;hyphens:auto}
.cs-ap-doc img{max-width:100%}
@media (max-width:600px){.cs-ap-doc{text-align:left;padding:18px 16px}}
.cs-ap-audio{display:flex;flex-direction:column;align-items:center;gap:14px}
.cs-ap-audio svg{width:80px;height:80px;opacity:.8}
.cs-ap-erro{display:flex;flex-direction:column;gap:6px;text-align:center}
.cs-ap-nav{position:absolute;top:50%;transform:translateY(-50%);width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer}
.cs-ap-nav svg{width:28px;height:28px}
.cs-ap-nav.esq{left:10px}.cs-ap-nav.dir{right:10px}
.cs-rec{display:flex;align-items:center;gap:12px;padding:10px 12px}
.cs-rec-ic{width:42px;height:42px;border-radius:12px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;flex:none}
.cs-rec-ic svg{width:22px;height:22px}
.cs-rec-t{flex:1;min-width:0;display:flex;flex-direction:column}
.cs-rec-t small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-vit{display:flex;flex-direction:column;gap:10px}
.cs-vit-img{width:calc(100% + 32px);margin:-16px -16px 0;max-height:220px;object-fit:cover;border-radius:var(--r) var(--r) 0 0}
.cs-vit-desc{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.cs-promo{background:#FEE2E2;color:#B91C1C}
.cs-vit-cats{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.cs-vit-cats .chip{flex:none}
`;
  document.head.appendChild(css);
})();
