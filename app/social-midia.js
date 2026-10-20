/* ChatMil — mídia nas conversas.
   - envio de qualquer arquivo (fotos, vídeos, PDF, Word, ZIP, aplicativos…), com miniatura leve na mensagem;
   - visualizadores próprios: foto, vídeo (compartilhar, abrir com, projetar na TV) e PDF (impressão personalizada);
   - mensagens de áudio (um toque para gravar, outro para enviar) com transcrição feita no próprio aparelho;
   - visualização única (foto, texto e áudio) com bloqueio de captura de tela no aplicativo Android;
   - apresentação em tela cheia (PDF, Word, fotos e vídeos) para TV e projetor.
   Tudo é carregado sob demanda para poupar bateria, memória e internet. Depende de social.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, ic, esc, eu, pintar, enviarMsg, ofensivo, toast, msgErro } = A;
  const $ = s => document.querySelector(s);
  const I = {
    clipe: ic('<path d="m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
    img: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    camera: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
    arq: ic('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    lixo: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
    fechar: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    ant: ic('<path d="M15 18l-6-6 6-6"/>'),
    prox: ic('<path d="m9 6 6 6-6 6"/>'),
    baixar: ic('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    partilhar: ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    abrir: ic('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    imprimir: ic('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    tv: ic('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    cheia: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    mais: ic('<path d="M12 5v14M5 12h14"/>'),
    menos: ic('<path d="M5 12h14"/>'),
    tela: ic('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="m10 8 4 2-4 2z"/><path d="M8 20h8"/>'),
    voltar10: ic('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">10</text>'),
    avancar10: ic('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">10</text>'),
    texto: ic('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    um: ic('<circle cx="12" cy="12" r="9" stroke-dasharray="3 2.2"/><path d="M10.5 9.5 12.5 8v8"/>'),
    cadeado: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    olho: ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    check: ic('<path d="m5 12 5 5 9-10"/>')
  };
  X.I = I;
  const tamanho = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB";
  const mmss = s => { s = Number(s); if (!isFinite(s)) s = 0; s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const base = () => new URL(".", location.href).href;
  const nomeSeguro = n => String(n || "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80) || "arquivo";
  function carregarScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  const lerLS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

  /* ================= Ligação com o Android (APK) ================= */
  const Cap = window.Capacitor, NATIVO = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function plug(n) { try { if (window.capacitorExports && capacitorExports.registerPlugin) return capacitorExports.registerPlugin(n); if (Cap && Cap.registerPlugin) return Cap.registerPlugin(n); } catch (e) { } return null; }
  const FSP = NATIVO ? plug("Filesystem") : null, SHP = NATIVO ? plug("Share") : null, NTP = NATIVO ? plug("Nativo") : null, MDP = NATIVO ? plug("Midia") : null;
  const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] || ""); fr.onerror = rej; fr.readAsDataURL(blob); });
  /* grava o arquivo na pasta temporária do app em pedaços de 3 MB (pouca memória) e devolve o endereço */
  async function paraCache(blob, nome) {
    const path = "chatmil/" + Date.now().toString(36) + "-" + nomeSeguro(nome), P3 = 3 * 1024 * 1024;
    await FSP.writeFile({ path, data: await b64(blob.slice(0, P3)), directory: "CACHE", recursive: true });
    for (let i = P3; i < blob.size; i += P3) await FSP.appendFile({ path, data: await b64(blob.slice(i, i + P3)), directory: "CACHE" });
    return (await FSP.getUri({ path, directory: "CACHE" })).uri;
  }
  function limparTemporarios(aviso) {
    if (!FSP) { if (aviso) toast("Nada para limpar."); return; }
    FSP.rmdir({ path: "chatmil", directory: "CACHE", recursive: true }).then(() => aviso && toast("Arquivos temporários apagados."), () => aviso && toast("Nada para limpar."));
  }
  setTimeout(() => limparTemporarios(false), 5000);
  function baixarWeb(blob, nome) {
    const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }
  function imprimirWeb(blob) {
    const u = URL.createObjectURL(blob), f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0"; f.src = u; document.body.appendChild(f);
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, "_blank"); } setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 120000); };
  }
  const cancelou = e => /cancel/i.test(String((e && e.message) || e));
  const NAT = {
    nativo: NATIVO,
    async compartilhar(blob, nome, tipo) {
      if (FSP && SHP) { const uri = await paraCache(blob, nome); await SHP.share({ title: nome, files: [uri], dialogTitle: "Compartilhar" }).catch(e => { if (!cancelou(e)) throw e; }); return; }
      const f = new File([blob], nome, { type: tipo || blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nome }).catch(() => { }); return; }
      baixarWeb(blob, nome); toast("Arquivo baixado. Envie pela pasta Downloads.");
    },
    async abrirCom(blob, nome, tipo) {
      if (FSP && NTP) { try { await NTP.abrir({ uri: await paraCache(blob, nome), tipo: tipo || tipoPorNome(nome), titulo: "Abrir com" }); return; } catch (e) { console.warn(e); } }
      if (FSP) return NAT.compartilhar(blob, nome, tipo);
      const u = URL.createObjectURL(new Blob([blob], { type: tipo || blob.type })); window.open(u, "_blank"); setTimeout(() => URL.revokeObjectURL(u), 300000);
    },
    async salvar(blob, nome, tipo) {
      if (FSP && NTP) { try { await NTP.salvar({ uri: await paraCache(blob, nome), nome, tipo: tipo || tipoPorNome(nome) }); toast("Salvo em Downloads › ChatMil"); return; } catch (e) { console.warn(e); } }
      if (FSP) return NAT.compartilhar(blob, nome, tipo);
      baixarWeb(blob, nome);
    },
    async imprimir(blob, nome) {
      if (FSP && NTP) { try { await NTP.imprimir({ uri: await paraCache(blob, nome), nome }); return; } catch (e) { console.warn(e); toast("Escolha um aplicativo de impressão."); return NAT.compartilhar(blob, nome, "application/pdf"); } }
      imprimirWeb(blob);
    },
    async transmitir() { if (NTP) { try { await NTP.transmitir(); return true; } catch (e) { } } return false; },
    seguro(on) { if (window.CS_SEGURO) return window.CS_SEGURO("unica", !!on); if (NTP) NTP.seguro({ ligar: !!on }).catch(() => { }); }
  };

  /* ================= Arquivos: guardar e buscar em partes ================= */
  const LIMITE = 20 * 1048576, PARTE = 700 * 1024;
  const EXT_TIPO = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet",
    odp: "application/vnd.oasis.opendocument.presentation", txt: "text/plain", csv: "text/csv", rtf: "application/rtf", zip: "application/zip", rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed", apk: "application/vnd.android.package-archive", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", "3gp": "video/3gpp",
    mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", aac: "audio/aac", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", heic: "image/heic", svg: "image/svg+xml", epub: "application/epub+zip", html: "text/html" };
  const extDe = n => (String(n || "").split(".").pop() || "").toLowerCase();
  function tipoPorNome(n) { return EXT_TIPO[extDe(n)] || "application/octet-stream"; }
  function genero(a) {
    const t = a.tipo || "", e = extDe(a.nome);
    if (t.startsWith("image/") && e !== "svg") return "img"; if (t.startsWith("video/")) return "video"; if (t.startsWith("audio/")) return "audio";
    if (t === "application/pdf" || e === "pdf") return "pdf";
    if (/wordprocessingml/.test(t) || e === "docx") return "docx";
    if (["zip", "rar", "7z"].includes(e)) return "zip"; if (e === "apk") return "apk";
    if (["xls", "xlsx", "ods", "csv"].includes(e)) return "planilha"; if (["ppt", "pptx", "odp"].includes(e)) return "slides";
    return "outro";
  }
  const COR = { img: "#15803D", video: "#7C3AED", audio: "#0E7490", pdf: "#DC2626", docx: "#2447C6", zip: "#B45309", apk: "#16A34A", planilha: "#15803D", slides: "#EA580C", outro: "#64748B" };
  const ROTULO = { img: "Foto", video: "Vídeo", audio: "Áudio", pdf: "PDF", docx: "Word", zip: "Compactado", apk: "Aplicativo", planilha: "Planilha", slides: "Apresentação", outro: "Arquivo" };

  const CACHE = new Map(), URLS = new Map(), BAIXANDO = new Map();
  let cacheBytes = 0;
  function guardar(id, blob) {
    if (CACHE.has(id)) return; CACHE.set(id, blob); cacheBytes += blob.size;
    /* no máximo ~60 MB na memória: os mais antigos saem primeiro */
    while (cacheBytes > 60e6 && CACHE.size > 1) { const [k, b] = CACHE.entries().next().value; CACHE.delete(k); cacheBytes -= b.size; if (URLS.has(k)) { URL.revokeObjectURL(URLS.get(k)); URLS.delete(k); } }
  }
  const urlDe = (id, blob) => { if (!URLS.has(id)) URLS.set(id, URL.createObjectURL(blob)); return URLS.get(id); };
  async function subir(chatId, blob, meta, onProg, colecao) {
    /* conversa com criptografia: o arquivo (e o texto da visualização única) sobe trancado; a chave vai dentro da mensagem */
    let fk = null;
    if (chatId && !colecao && window.CS_E2E && CS_E2E.pronto()) {
      const ex = { ...(meta.extra || {}) };
      if (ex.texto != null) { blob = new Blob([String(ex.texto)], { type: "text/plain" }); delete ex.texto; }
      if (blob) { const r = await CS_E2E.cifrarArquivo(blob); blob = r.blob; fk = r.fk; }
      meta = { nome: "", tipo: "application/octet-stream", extra: { ...ex, e2e: 1 } };
    }
    const col = colecao || "arquivos", ref = fb.doc(C(col)), n = blob ? Math.max(1, Math.ceil(blob.size / PARTE)) : 0;
    await fb.setDoc(ref, { dono: eu(), ...(chatId ? { chatId } : {}), nome: (meta.nome || "").slice(0, 120), tipo: meta.tipo || "", tamanho: blob ? blob.size : 0, partes: n, criadoEm: TS(), ...(meta.extra || {}) });
    if (blob) {
      const buf = new Uint8Array(await blob.arrayBuffer()); let feitos = 0, prox = 0;
      const um = async () => { while (prox < n) { const i = prox++; await fb.setDoc(D(col, ref.id, "partes", String(i).padStart(4, "0")), { d: fb.Bytes.fromUint8Array(buf.subarray(i * PARTE, (i + 1) * PARTE)) }); feitos++; if (onProg) onProg(feitos / n); } };
      await Promise.all([um(), um(), um()]);
    }
    if (fk) CS_E2E.guardarChaveArq(ref.id, fk);
    return ref.id;
  }
  function obter(id, tipo, colecao) {
    const chave = (colecao || "arquivos") + ":" + id;
    if (CACHE.has(chave)) return Promise.resolve(CACHE.get(chave));
    if (BAIXANDO.has(chave)) return BAIXANDO.get(chave);
    const p = fb.getDocs(C(colecao || "arquivos", id, "partes")).then(s => {
      if (!s.docs.length) throw { code: "not-found" };
      let b = new Blob(s.docs.slice().sort((x, y) => x.id.localeCompare(y.id)).map(d => d.data().d.toUint8Array()), { type: tipo || "application/octet-stream" });
      if (!colecao && window.CS_E2E && CS_E2E.temChaveArq(id)) return CS_E2E.decifrarArquivo(id, b, tipo).then(d => { guardar(chave, d); return d; });
      guardar(chave, b); return b;
    });
    BAIXANDO.set(chave, p); p.then(() => BAIXANDO.delete(chave), () => BAIXANDO.delete(chave));
    return p;
  }
  async function apagarArquivo(id, colecao) {
    const col = colecao || "arquivos";
    try { const s = await fb.getDocs(C(col, id, "partes")); await Promise.all(s.docs.map(d => fb.deleteDoc(d.ref))); } catch (e) { }
    try { await fb.deleteDoc(D(col, id)); } catch (e) { }
  }

  /* ---------- imagens: reduzir e fazer miniaturas ---------- */
  function carregarImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function comprimirImg(file, lado, q) {
    const url = URL.createObjectURL(file);
    try {
      const img = await carregarImg(url), M = lado || 1600, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, cv.width, cv.height);
      const b = await new Promise(r => cv.toBlob(r, "image/jpeg", q || 0.82)); cv.width = cv.height = 0; return b;
    } finally { URL.revokeObjectURL(url); }
  }
  function canvasMini(fonte, w, h, lado, q) {
    const k = Math.min(1, lado / Math.max(w, h)), cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    cv.getContext("2d").drawImage(fonte, 0, 0, cv.width, cv.height);
    const u = cv.toDataURL("image/jpeg", q || 0.6); cv.width = cv.height = 0; return u;
  }
  async function miniImg(blob) {
    const url = URL.createObjectURL(blob);
    try { const i = await carregarImg(url); return { thumb: canvasMini(i, i.naturalWidth, i.naturalHeight, 360, 0.55), w: i.naturalWidth, h: i.naturalHeight }; } finally { URL.revokeObjectURL(url); }
  }
  /* vídeos gravados no navegador (webm) chegam com duração "Infinity": força o cálculo da duração real */
  async function duracaoReal(v) {
    if (isFinite(v.duration) && v.duration > 0) return v.duration;
    await new Promise(r => { const ok = () => { if (isFinite(v.duration)) { v.removeEventListener("durationchange", ok); r(); } }; v.addEventListener("durationchange", ok); try { v.currentTime = 1e101; } catch (e) { } setTimeout(r, 3000); });
    try { v.currentTime = 0; } catch (e) { }
    return isFinite(v.duration) ? v.duration : 0;
  }
  const durDe = v => isFinite(v.duration) ? v.duration : 0;
  async function miniVideo(blob) {
    const url = URL.createObjectURL(blob), v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    try {
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 8000); });
      const total = await duracaoReal(v);
      v.currentTime = Math.min(1, (total || 2) / 3); await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); });
      return { thumb: canvasMini(v, v.videoWidth, v.videoHeight, 360, 0.55), w: v.videoWidth, h: v.videoHeight, dur: Math.round(total) };
    } finally { v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); }
  }
  async function duracaoAudio(blob) {
    const u = URL.createObjectURL(blob), a = new Audio(); a.preload = "metadata"; a.src = u;
    try { await new Promise((r, j) => { a.onloadedmetadata = r; a.onerror = j; setTimeout(j, 5000); }); return isFinite(a.duration) ? Math.round(a.duration) : 0; } finally { URL.revokeObjectURL(u); }
  }
  async function miniPdf(blob) {
    const pdfjs = await carregarPdfjs(), doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    try {
      const pg = await doc.getPage(1), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 420 / v1.width });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      let u = cv.toDataURL("image/jpeg", 0.62); if (u.length > 90000) u = cv.toDataURL("image/jpeg", 0.45);
      const r = { thumb: u, paginas: doc.numPages, tw: Math.round(vp.width), th: Math.round(vp.height) }; cv.width = cv.height = 0;
      return r;
    } finally { destruir(doc); }
  }

  /* ---------- Word, PowerPoint, Excel, LibreOffice: capa da primeira página ----------
     1º tenta a miniatura que o próprio programa salva dentro do arquivo;
     se não houver, desenha uma prévia com o texto da 1ª página/slide/planilha. */
  async function lerZip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("zip");
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const ent = new Map(), td = new TextDecoder();
    for (let k = 0; k < n && p + 46 <= u8.length; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      ent.set(td.decode(u8.subarray(p + 46, p + 46 + nl)), { met, csz, off }); p += 46 + nl + xl + cl;
    }
    const ler = async (nome, texto) => {
      const x = ent.get(nome); if (!x) return null;
      const ini = x.off + 30 + dv.getUint16(x.off + 26, true) + dv.getUint16(x.off + 28, true), dado = u8.slice(ini, ini + x.csz);
      let out = dado;
      if (x.met === 8) { if (!window.DecompressionStream) return null; out = new Uint8Array(await new Response(new Blob([dado]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()); }
      else if (x.met !== 0) return null;
      return texto ? td.decode(out) : out;
    };
    return { nomes: [...ent.keys()], ler };
  }
  const textoXml = (xml, tag) => { const r = []; const re = new RegExp("<" + tag + "[^>]*>([^<]*)</" + tag + ">", "g"); let m; while ((m = re.exec(xml)) && r.join("").length < 1500) r.push(m[1]); return r; };
  const desXml = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  function quebrar(cx, txt, larg) { const out = []; String(txt).split(/\n/).forEach(par => { let l = ""; par.split(/\s+/).forEach(w => { const t = l ? l + " " + w : w; if (cx.measureText(t).width > larg && l) { out.push(l); l = w; } else l = t; }); out.push(l); }); return out; }
  function desenharFolha(paragrafos, titulo) {
    const W = 420, H = 594, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, W, H); let y = 46; const M = 40;
    paragrafos.slice(0, 40).forEach((p, i) => {
      if (y > H - 30) return; const t = desXml(p).trim(); if (!t) { y += 8; return; }
      const big = i === 0 && t.length < 90; cx.fillStyle = big ? "#111827" : "#374151"; cx.font = big ? "bold 19px sans-serif" : "13px sans-serif";
      quebrar(cx, t, W - 2 * M).forEach(l => { if (y > H - 30) return; cx.fillText(l, M, y); y += big ? 26 : 19; }); y += big ? 10 : 6;
    });
    const u = cv.toDataURL("image/jpeg", 0.7); cv.width = cv.height = 0; return { thumb: u, tw: W, th: H };
  }
  function desenharSlide(linhas) {
    const W = 480, H = 270, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
    const gr = cx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#1E3A8A"); gr.addColorStop(1, "#7C3AED"); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    const l = linhas.map(desXml).map(x => x.trim()).filter(Boolean); cx.fillStyle = "#fff"; cx.textAlign = "center"; cx.font = "bold 26px sans-serif";
    let y = H / 2 - 20; quebrar(cx, l[0] || "Apresentação", W - 60).slice(0, 3).forEach(t => { cx.fillText(t, W / 2, y); y += 32; });
    cx.font = "16px sans-serif"; cx.fillStyle = "rgba(255,255,255,.85)"; quebrar(cx, l.slice(1).join(" · "), W - 80).slice(0, 2).forEach(t => { cx.fillText(t, W / 2, y + 6); y += 22; });
    const u = cv.toDataURL("image/jpeg", 0.75); cv.width = cv.height = 0; return { thumb: u, tw: W, th: H };
  }
  function desenharPlanilha(celulas) {
    const W = 420, H = 300, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, W, H); const cw = 105, ch = 25; cx.font = "12px sans-serif";
    for (let r = 0; r < 12; r++) for (let c = 0; c < 4; c++) {
      cx.strokeStyle = "#D1D5DB"; cx.strokeRect(c * cw, r * ch, cw, ch);
      if (r === 0) { cx.fillStyle = "#DCFCE7"; cx.fillRect(c * cw + 1, 1, cw - 2, ch - 2); }
      const v = (celulas[r] || [])[c]; if (v != null) { cx.fillStyle = r === 0 ? "#14532D" : "#1F2937"; cx.font = r === 0 ? "bold 12px sans-serif" : "12px sans-serif"; cx.fillText(String(desXml(String(v))).slice(0, 14), c * cw + 6, r * ch + 17); }
    }
    const u = cv.toDataURL("image/jpeg", 0.75); cv.width = cv.height = 0; return { thumb: u, tw: W, th: H };
  }
  async function imgParaThumb(u8, mime) {
    const b = new Blob([u8], { type: mime }), url = URL.createObjectURL(b);
    try { const i = await carregarImg(url); return { thumb: canvasMini(i, i.naturalWidth, i.naturalHeight, 420, 0.65), tw: i.naturalWidth, th: i.naturalHeight }; } finally { URL.revokeObjectURL(url); }
  }
  async function miniOffice(blob, g) {
    const z = await lerZip(await blob.arrayBuffer());
    /* Word raramente atualiza a miniatura embutida (pode ser a do modelo): para .docx, desenha a 1ª página */
    const emb = z.nomes.includes("word/document.xml") ? null : (z.nomes.find(n => /^docProps\/thumbnail\.(jpe?g|png)$/i.test(n)) || z.nomes.find(n => /^Thumbnails\/thumbnail\.png$/i.test(n)));
    let r = null;
    const nSlides = z.nomes.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
    if (emb) { try { r = await imgParaThumb(await z.ler(emb), /png$/i.test(emb) ? "image/png" : "image/jpeg"); } catch (e) { r = null; } }
    if (!r) {
      if (z.nomes.includes("word/document.xml")) {
        const x = await z.ler("word/document.xml", true) || "";
        const pars = x.split(/<\/w:p>/).map(p => textoXml(p, "w:t").join("")).slice(0, 60); r = desenharFolha(pars);
      } else if (nSlides) {
        const x = await z.ler("ppt/slides/slide1.xml", true) || ""; r = desenharSlide(x.split(/<\/a:p>/).map(p => textoXml(p, "a:t").join("")));
      } else if (z.nomes.includes("xl/worksheets/sheet1.xml")) {
        const ss = z.nomes.includes("xl/sharedStrings.xml") ? (await z.ler("xl/sharedStrings.xml", true) || "").split(/<\/si>/).map(p => textoXml(p, "t").join("")) : [];
        const x = await z.ler("xl/worksheets/sheet1.xml", true) || "", linhas = [];
        (x.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).slice(0, 12).forEach(row => {
          const l = []; (row.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).slice(0, 4).forEach(c => { const v = (c.match(/<v>([^<]*)<\/v>/) || c.match(/<t[^>]*>([^<]*)<\/t>/) || [])[1]; l.push(/t="s"/.test(c) && v != null ? ss[+v] : v); }); linhas.push(l);
        }); r = desenharPlanilha(linhas);
      } else if (z.nomes.includes("content.xml")) {
        const x = await z.ler("content.xml", true) || "";
        const pars = (x.match(/<text:(?:p|h)[^>]*>[\s\S]*?<\/text:(?:p|h)>/g) || []).slice(0, 60).map(p => p.replace(/<[^>]+>/g, ""));
        r = g === "slides" ? desenharSlide(pars) : desenharFolha(pars);
      }
    }
    if (r && nSlides) r.paginas = nSlides;
    return r || {};
  }

  /* ---------- barra de envio ---------- */
  function barraEnvio(nome) {
    const el = document.createElement("div"); el.className = "cs-up"; el.setAttribute("role", "status");
    el.innerHTML = `<span>Enviando ${esc(nome)}…</span><i style="width:0%"></i>`; document.body.appendChild(el);
    return f => { if (f == null) el.remove(); else el.querySelector("i").style.width = Math.round(f * 100) + "%"; };
  }
  async function enviarArquivo(chatId, file, mais) {
    let blob = file, nome = (file.name || "arquivo").slice(-120), tipo = file.type || tipoPorNome(nome);
    if (ofensivo(nome)) return toast("O nome do arquivo tem palavras não permitidas.");
    if (/^image\/(jpeg|png|webp|heic|heif|bmp)/.test(tipo)) { try { blob = await comprimirImg(file, 1600); tipo = "image/jpeg"; nome = nome.replace(/\.\w+$/, "") + ".jpg"; } catch (e) { } }
    if (blob.size > LIMITE) {
      if (tipo.startsWith("video/")) return oferecerCompressao(chatId, file);
      return toast("Arquivo grande demais (máximo 20 MB). Compacte ou envie o link do Drive.");
    }
    const g = genero({ tipo, nome }); let extra = {};
    try { if (g === "img") extra = await miniImg(blob); else if (g === "video") extra = await miniVideo(blob); else if (g === "pdf") extra = await miniPdf(blob); else if (["docx", "slides", "planilha"].includes(g) || /\.(odt|ods|odp)$/i.test(nome)) extra = await miniOffice(blob, g); else if (g === "audio") extra = { dur: await duracaoAudio(blob) }; } catch (e) { console.warn("miniatura", e); }
    const barra = barraEnvio(nome);
    try {
      const id = await subir(chatId, blob, { nome, tipo }, barra);
      guardar("arquivos:" + id, blob);
      const r = await enviarMsg(chatId, { arquivo: { id, nome, tipo, tamanho: blob.size, ...extra, ...(mais || {}) }, prev: (mais && mais.prova ? "Prova" : ROTULO[g]) + (g === "img" ? "" : ": " + nome) });
      barra(null); return r !== false;
    } catch (e) { console.warn(e); toast(msgErro(e)); }
    barra(null); return false;
  }

  /* ---------- enviar um arquivo para contatos (quem mais conversa comigo aparece primeiro) ---------- */
  const ENV = { file: null, mais: null, feitos: new Set() };
  X.enviarParaContatos = (file, mais, titulo) => {
    if (!A.SO.user) return toast("Entre no ChatMil para enviar.");
    ENV.file = file; ENV.mais = mais || null; ENV.feitos = new Set();
    const pessoas = A.contatosOrdenados().slice(0, 300);
    const grupos = A.SO.chats.filter(c => c.tipo === "grupo").sort((a, b) => A.ms(b.atualizadoEm) - A.ms(a.atualizadoEm)).slice(0, 50);
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(titulo || "Enviar para…")}</h2></div>
      <input class="in" id="env-filtro" placeholder="Buscar pelo nome" aria-label="Buscar contato">
      <div class="cs-menu cs-env-l">${pessoas.map(u => { const p = A.P(u); return `<button data-s="env-para" data-v="u:${esc(u)}" data-n="${esc(A.semAc(p.nome || ""))}">${A.av(p, 40, u)}<span><b>${esc(p.nome)}</b><small>${esc(p.escola || "Contato")}</small></span><i class="cs-env-ok"></i></button>`; }).join("")}
        ${grupos.map(c => `<button data-s="env-para" data-v="g:${esc(c.id)}" data-n="${esc(A.semAc(c.nome || ""))}">${A.avGrupo ? A.avGrupo(c, 40) : ""}<span><b>${esc(c.nome)}</b><small>Grupo · ${(c.membros || []).length} pessoas</small></span><i class="cs-env-ok"></i></button>`).join("")}
        ${!pessoas.length && !grupos.length ? `<p class="small muted">Converse com colegas ou siga alguém para enviar por aqui.</p>` : ""}</div>`);
    const f = document.getElementById("env-filtro");
    if (f) f.addEventListener("input", () => { const q = A.semAc(f.value); document.querySelectorAll(".cs-env-l [data-s=env-para]").forEach(b => { b.hidden = !!q && !b.dataset.n.includes(q); }); });
  };
  X.acoes["env-para"] = async el => {
    const v = el.dataset.v; if (!ENV.file || ENV.feitos.has(v) || el.classList.contains("indo")) return;
    el.classList.add("indo"); const ok = el.querySelector(".cs-env-ok"); if (ok) ok.textContent = "Enviando…";
    const chatId = v.startsWith("g:") ? v.slice(2) : await A.garantirDireto(v.slice(2));
    const r = chatId ? await enviarArquivo(chatId, ENV.file, ENV.mais) : false;
    el.classList.remove("indo");
    if (r) { ENV.feitos.add(v); el.classList.add("feito"); if (ok) ok.innerHTML = `${I.check || "✓"} Enviado`; }
    else if (ok) ok.textContent = "Tente de novo";
  };
  function oferecerCompressao(chatId, file) {
    window.abrirSheet(`<div class="sheet-h"><h2>Vídeo grande (${tamanho(file.size)})</h2></div>
      <p class="cs-just">O limite é 20 MB. Posso deixar o vídeo mais leve para enviar. Demora mais ou menos o tempo do próprio vídeo; deixe o app aberto.</p>
      <button class="btn primary cs-grande" data-s="md-comprimir">${I.video || I.tela} Deixar leve e enviar</button><button class="btn ghost" data-s="fechar">Cancelar</button>`);
    X._comp = { chatId, file };
  }
  X.acoes["md-comprimir"] = async () => {
    const { chatId, file } = X._comp || {}; window.fecharSheet(); if (!file) return;
    const barra = barraEnvio("vídeo (deixando leve)");
    try {
      const b = await recodificar(file, { maxLado: 854, bps: 900000, onProg: f => barra(f * 0.9) });
      barra(null);
      if (b.size > LIMITE) return toast("Mesmo leve, o vídeo passou de 20 MB. Envie um trecho menor ou o link do Drive.");
      await enviarArquivo(chatId, new File([b], (file.name || "video").replace(/\.\w+$/, "") + ".webm", { type: b.type }));
    } catch (e) { console.warn(e); barra(null); toast("Não foi possível preparar este vídeo."); }
  };

  /* ---------- recodificar vídeo (deixar leve, aplicar efeitos, juntar música) ---------- */
  async function recodificar(fonte, o) {
    o = o || {};
    const url = URL.createObjectURL(fonte), v = document.createElement("video");
    v.playsInline = true; v.preload = "auto"; v.src = url;
    const ac = new (window.AudioContext || window.webkitAudioContext)(), dest = ac.createMediaStreamDestination();
    let mus = null, murl = null;
    try {
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("vídeo")); });
      const k = Math.min(1, (o.maxLado || 854) / Math.max(v.videoWidth, v.videoHeight));
      const W = Math.max(2, Math.round(v.videoWidth * k / 2) * 2), H = Math.max(2, Math.round(v.videoHeight * k / 2) * 2);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
      if (o.somOriginal !== false) { const g = ac.createGain(); g.gain.value = o.volOriginal == null ? 1 : o.volOriginal; ac.createMediaElementSource(v).connect(g).connect(dest); }
      else v.muted = true;
      if (o.musica) {
        murl = URL.createObjectURL(o.musica.blob); mus = new Audio(murl); mus.preload = "auto";
        await new Promise(r => { mus.onloadedmetadata = r; mus.onerror = r; });
        mus.currentTime = o.musica.inicio || 0; const g = ac.createGain(); g.gain.value = o.musica.vol == null ? 0.9 : o.musica.vol;
        ac.createMediaElementSource(mus).connect(g).connect(dest);
      }
      await ac.resume().catch(() => { });
      const faixas = [...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()];
      const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
      const rec = new MediaRecorder(new MediaStream(faixas), { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: o.bps || 900000, audioBitsPerSecond: 64000 });
      const pedacos = []; rec.ondataavailable = e => { if (e.data && e.data.size) pedacos.push(e.data); };
      const ini = o.inicio || 0, fim = Math.min(v.duration || 0, ini + (o.dur || 1e9));
      v.currentTime = ini; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); });
      return await new Promise((res, rej) => {
        let acabou = false;
        const terminar = () => { if (acabou) return; acabou = true; v.pause(); if (mus) mus.pause(); try { rec.stop(); } catch (e) { } };
        rec.onstop = () => res(new Blob(pedacos, { type: (mime || "video/webm").split(";")[0] }));
        rec.onerror = e => rej(e);
        const quadro = () => {
          if (acabou) return;
          if (o.efeito) o.efeito(cx, W, H, v); else cx.drawImage(v, 0, 0, W, H);
          if (o.onProg) o.onProg(Math.min(1, (v.currentTime - ini) / Math.max(0.1, fim - ini)));
          if (v.ended || v.currentTime >= fim) return terminar();
          requestAnimationFrame(quadro);
        };
        v.onended = terminar;
        rec.start(1000);
        v.play().then(() => { if (mus) mus.play().catch(() => { }); quadro(); }, rej);
      });
    } finally {
      try { ac.close(); } catch (e) { }
      v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); if (murl) URL.revokeObjectURL(murl);
    }
  }

  /* ================= Menu do clipe ================= */
  X.composerBotoes = c => `<button type="button" class="cs-ico-bt" data-s="md-clipe" data-id="${esc(c.id)}" aria-label="Enviar foto, vídeo, documento ou arquivo">${I.clipe}</button>`;
  X.composerFim = c => `<button type="button" class="btn primary cs-env cs-mic" data-s="au-mic" data-id="${esc(c.id)}" aria-label="Gravar áudio: segure para gravar, solte para enviar">${I.mic}</button>`;
  function escolher(accept, multiplo, capture) {
    return new Promise(res => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = accept || "*/*"; inp.multiple = !!multiplo;
      if (capture) inp.setAttribute("capture", capture);
      inp.style.display = "none"; document.body.appendChild(inp);
      inp.onchange = () => { res([...inp.files]); inp.remove(); };
      inp.click();
      setTimeout(() => { if (!inp.files || !inp.files.length) { } }, 0);
    });
  }
  X.acoes["md-clipe"] = el => {
    const id = el.dataset.id;
    window.abrirSheet(`<div class="sheet-h"><h2>Enviar</h2></div>
      <div class="cs-clip-g">
        <button data-s="md-galeria" data-id="${esc(id)}"><span style="--c:#15803D">${I.img}</span>Galeria</button>
        <button data-s="md-camera" data-id="${esc(id)}"><span style="--c:#E11D48">${I.camera}</span>Câmera</button>
        <button data-s="md-documento" data-id="${esc(id)}"><span style="--c:#2447C6">${I.arq}</span>Documento ou arquivo</button>
      </div>
      <h3 class="cs-clip-h">${I.um} Visualização única <small>abre uma vez e some; sem print no app</small></h3>
      <div class="cs-clip-g">
        <button data-s="un-foto" data-id="${esc(id)}"><span style="--c:#7C3AED">${I.img}</span>Foto</button>
        <button data-s="un-texto" data-id="${esc(id)}"><span style="--c:#7C3AED">${I.texto}</span>Mensagem</button>
        <button data-s="un-audio" data-id="${esc(id)}"><span style="--c:#7C3AED">${I.mic}</span>Áudio</button>
      </div>
      <p class="small muted">Qualquer tipo de arquivo: PDF, Word, Excel, PowerPoint, ZIP, aplicativos (APK), músicas… até 20 MB.</p>`);
  };
  const enviarVarios = async (id, fs) => { for (const f of fs) await enviarArquivo(id, f); };
  /* ---------- câmera e galeria do próprio Android (CameraX + compressão Media3, H.265 quando dá) ----------
     devolve a lista de arquivos; [] = a pessoa cancelou; null = não há no aparelho (usa o do navegador) */
  function qualidadeRede() {
    const c = navigator.connection || {}, t = c.effectiveType || "";
    if (c.saveData || t === "slow-2g" || t === "2g") return "baixa";
    if (c.type === "wifi" || c.type === "ethernet") return "alta";
    return t === "3g" ? "baixa" : "media";
  }
  const usarHevc = () => lerLS("cs.hevc", true) !== false;
  async function midiaNativa(acao, op) {
    if (!MDP) return null;
    const barra = barraEnvio(acao === "escolher" ? "vídeos (deixando leves)" : "vídeo (deixando leve)"), el = document.querySelector(".cs-up");
    if (el) el.hidden = true;
    let sub = null;
    try { sub = await MDP.addListener("progresso", e => { if (el) el.hidden = false; barra(Math.min(0.98, ((e.i || 0) + (e.f || 0)) / (e.n || 1))); }); } catch (e) { }
    try {
      const r = await MDP[acao]({ ...(op || {}), qualidade: qualidadeRede(), hevc: usarHevc() });
      const l = r && r.arquivos ? r.arquivos : r && r.caminho ? [r] : [], fs = [];
      for (const x of l) {
        if (x.erro) { toast(x.erro); continue; }
        try { const b = await (await fetch(Cap.convertFileSrc(x.caminho))).blob(); fs.push(new File([b], x.nome || "arquivo", { type: x.tipo || b.type })); }
        catch (e) { console.warn(e); toast("Não foi possível ler " + (x.nome || "o arquivo") + "."); }
      }
      return fs;
    } catch (e) {
      if (cancelou(e)) return [];
      if (/not implemented|UNIMPLEMENTED|não implementado/i.test(String((e && (e.code || e.message)) || e))) return null;
      console.warn(e); toast("A câmera do aparelho não abriu. Usando a do navegador."); return null;
    } finally { barra(null); if (sub && sub.remove) sub.remove(); }
  }
  X.midia_nativa = midiaNativa;
  /* vídeo que este aparelho não consegue tocar (ex.: H.265 em computador antigo): avisa e oferece abrir em outro app */
  document.addEventListener("error", e => {
    const v = e.target; if (!v || v.tagName !== "VIDEO" || v.dataset.avisou || !v.getAttribute("src")) return;
    v.dataset.avisou = "1";
    const d = document.createElement("div"); d.className = "cs-vid-erro";
    d.innerHTML = `<b>Não deu para tocar este vídeo aqui.</b><span>Ele pode estar em H.265 (formato leve). Use “Baixar” ou “Abrir com” para ver em outro app.</span>`;
    v.insertAdjacentElement("afterend", d);
  }, true);
  X.configExtra.push(() => MDP ? `<h2 class="cs-sec">Vídeos</h2><div class="cs-menu card flat"><label class="cs-linha" for="cfg-hevc" style="display:flex;align-items:center;gap:12px"><span class="cs-lic">${I.video || I.tela}</span><span style="flex:1"><b>Vídeos mais leves (H.265)</b></span><input type="checkbox" class="cs-sw" id="cfg-hevc" ${usarHevc() ? "checked" : ""}></label></div>` : "");
  document.addEventListener("change", e => { if (e.target.id === "cfg-hevc") { gravarLS("cs.hevc", e.target.checked); toast(e.target.checked ? "Vídeos em H.265 (mais leves)." : "Vídeos em H.264 (tocam em qualquer aparelho)."); } });
  X.acoes["md-galeria"] = async el => { window.fecharSheet(); const n = await midiaNativa("escolher", { multiplo: true }); enviarVarios(el.dataset.id, n || await escolher("image/*,video/*", true)); };
  X.acoes["md-camera"] = async el => { window.fecharSheet(); const n = await midiaNativa("camera", { modo: "foto" }); enviarVarios(el.dataset.id, n || await escolher("image/*,video/*", false, "environment")); };
  X.acoes["md-documento"] = async el => { window.fecharSheet(); enviarVarios(el.dataset.id, await escolher("*/*", true)); };

  /* ================= Mensagens na conversa ================= */
  const ACH = {};   /* arquivos das mensagens visíveis, por id */
  const VISTOS = new Set();
  X.aoTrocarUsuario.push(u => { VISTOS.clear(); if (u) lerLS("cs.unica." + u.uid, []).forEach(x => VISTOS.add(x)); pararAudio(); });
  function marcarVisto(id) { VISTOS.add(id); gravarLS("cs.unica." + eu(), [...VISTOS].slice(-300)); }
  X.msg = (m, o) => {
    if (m.chamada) return X.msgChamada ? X.msgChamada(m, o) : "";
    const cls = `cs-m ${o.meu ? "eu" : ""} ${o.seq ? "seq" : ""}`;
    const abre = `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0">`;
    if (m.audio) return abre + htmlAudio(m.audio, o) + `</div>`;
    if (m.unica) return abre + htmlUnica(m, o) + `</div>`;
    const a = m.arquivo; if (!a) return "";
    ACH[a.id] = a;
    const g = genero(a);
    if ((g === "img" || g === "video") && a.thumb) {
      const prop = a.w && a.h ? Math.max(0.56, Math.min(1.6, a.w / a.h)) : 1;
      return `${abre}<div class="cs-b cs-midia">${o.nome}<button class="cs-mid" data-s="md-ver" data-v="${esc(a.id)}" style="aspect-ratio:${prop}" aria-label="${g === "img" ? "Ver foto" : "Assistir vídeo"}">
        <img src="${URLS.has("arquivos:" + a.id) && g === "img" ? URLS.get("arquivos:" + a.id) : a.thumb}" alt="">${g === "video" ? `<span class="cs-mid-play">${I.play}</span>${a.dur > 0 && isFinite(a.dur) ? `<span class="cs-mid-dur">${mmss(a.dur)}</span>` : ""}` : ""}</button>
        <span class="cs-h">${o.hr}</span></div></div>`;
    }
    if (g === "audio") return abre + htmlAudio({ id: a.id, tipo: a.tipo, dur: a.dur, nome: a.nome }, o) + `</div>`;
    const ext = (extDe(a.nome) || "arq").slice(0, 4).toUpperCase();
    const capa = a.thumb && /^data:image\/(jpeg|png|webp);base64,/.test(a.thumb);
    const forma = g === "slides" || (a.tw && a.th && a.tw > a.th) ? "larga" : "folha";
    return `${abre}<div class="cs-b cs-cmsg">${o.nome}
      <button class="cs-arq ${capa ? "cs-arq-capa" : ""}" data-s="md-ver" data-v="${esc(a.id)}">
        ${capa ? `<span class="cs-capa ${forma}"><img src="${a.thumb}" alt="" loading="lazy">${a.prova ? `<i class="cs-capa-tag">Prova</i>` : ""}</span>` : ""}
        <span class="cs-arq-row"><span class="cs-arq-ic" style="--c:${COR[g]}">${I.arq}<b>${esc(ext)}</b></span>
        <span class="cs-arq-t"><b>${esc(a.nome)}</b><small>${a.prova ? "Prova · " : ""}${ROTULO[g]}${a.paginas ? ` · ${a.paginas} ${g === "slides" ? "slide" : "pág."}${g === "slides" && a.paginas > 1 ? "s" : ""}` : ""} · ${tamanho(a.tamanho || 0)}</small></span></span></button>
      ${a.prova ? `<button class="btn sm primary cs-arq-prova" data-s="md-prova" data-v="${esc(a.id)}">${I.baixar} Salvar em Minhas provas</button>` : ""}
      <span class="cs-h">${o.hr}</span></div></div>`;
  };
  X.acoes["md-prova"] = async el => {
    const a = ACH[el.dataset.v]; if (!a || !a.prova) return;
    if (!window.SENOV_importarProva) return toast("Abra a aba Provas uma vez e tente de novo.");
    el.disabled = true; const ok = await window.SENOV_importarProva(a.prova); el.disabled = false;
    if (ok) el.innerHTML = `${I.check} Salva em Minhas provas`;
  };
  X.acoes["md-ver"] = el => { const a = ACH[el.dataset.v]; if (a) abrirArquivo(a); };

  async function comBlob(a, fn) {
    let aviso = null;
    if (!CACHE.has((a.col || "arquivos") + ":" + a.id) && (a.tamanho || 0) > 1.5e6) { aviso = document.createElement("div"); aviso.className = "cs-up"; aviso.innerHTML = `<span>Baixando ${esc(a.nome)} (${tamanho(a.tamanho)})…</span>`; document.body.appendChild(aviso); }
    try { return await fn(await obter(a.id, a.tipo, a.col)); }
    catch (e) { console.warn(e); toast(e && e.code === "not-found" ? "Este arquivo foi apagado por quem enviou." : "Não foi possível baixar o arquivo. Verifique a internet."); }
    finally { if (aviso) aviso.remove(); }
  }
  function abrirArquivo(a) {
    ACH[a.id] = a;
    const g = genero(a);
    if (g === "img") return comBlob(a, b => verFoto(a, b));
    if (g === "video") return comBlob(a, b => verVideo(a, b));
    if (g === "pdf") return comBlob(a, b => verPdf(a, b));
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(a.nome)}</h2></div><p class="small muted">${ROTULO[g]} · ${tamanho(a.tamanho || 0)}</p><div class="cs-menu">
      ${g === "docx" ? `<button data-s="md-ler" data-v="${esc(a.id)}">${I.tela}<span><b>Ler aqui ou apresentar</b><small>Tela cheia, letra grande, TV e projetor</small></span></button>` : ""}
      <button data-s="md-abrircom" data-v="${esc(a.id)}">${I.abrir}<span><b>Abrir com outro aplicativo</b><small>${g === "apk" ? "Salve e instale pelo app Arquivos do celular" : g === "zip" ? "Gerenciador de arquivos, WinZip, RAR…" : "Word, Excel, leitor de arquivos…"}</small></span></button>
      <button data-s="md-partilhar" data-v="${esc(a.id)}">${I.partilhar}<span><b>Compartilhar</b><small>WhatsApp, e-mail, Drive…</small></span></button>
      <button data-s="md-salvar" data-v="${esc(a.id)}">${I.baixar}<span><b>Salvar no aparelho</b><small>Pasta Downloads › ChatMil</small></span></button></div>
      ${g === "apk" ? `<p class="small muted">Só instale aplicativos de quem você confia.</p>` : ""}`);
  }
  const acaoArq = fn => el => { const a = ACH[el.dataset.v] || VIS.a; if (!a) return; window.fecharSheet(); comBlob(a, b => fn(b, a.nome, a.tipo)); };
  X.acoes["md-abrircom"] = acaoArq((b, n, t) => NAT.abrirCom(b, n, t));
  X.acoes["md-partilhar"] = acaoArq((b, n, t) => NAT.compartilhar(b, n, t));
  X.acoes["md-salvar"] = acaoArq((b, n, t) => NAT.salvar(b, n, t));
  X.acoes["md-ler"] = el => { const a = ACH[el.dataset.v]; window.fecharSheet(); if (a) comBlob(a, b => apresentar(a, b)); };

  /* ================= Visualizador (camada de tela inteira) ================= */
  const VIS = { el: null, a: null, blob: null, fechar: null };
  function abrirVisor(a, blob, classe, html) {
    fecharVisor();
    const el = document.createElement("div"); el.className = "cs-vis " + (classe || ""); el.setAttribute("role", "dialog"); el.setAttribute("aria-label", a.nome || "Visualizador");
    el.innerHTML = html; document.body.appendChild(el); document.body.classList.add("cs-vis-on");
    VIS.el = el; VIS.a = a; VIS.blob = blob; return el;
  }
  function fecharVisor() {
    if (!VIS.el) return; if (VIS.fechar) { try { VIS.fechar(); } catch (e) { } }
    VIS.el.remove(); VIS.el = null; VIS.fechar = null; VIS.a = null; VIS.blob = null; document.body.classList.remove("cs-vis-on");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { }
  }
  X.acoes["vis-fechar"] = fecharVisor;
  const barraTopo = (a, extra) => `<div class="cs-vis-top"><button class="cs-vbt" data-s="vis-fechar" aria-label="Fechar">${I.fechar}</button><b>${esc(a.nome || "")}</b>${extra || ""}</div>`;
  const barraAcoes = (botoes) => `<div class="cs-vis-acoes">${botoes.map(([s, icone, t]) => `<button data-s="${s}">${icone}<span>${t}</span></button>`).join("")}</div>`;
  const ACOES_PADRAO = [["vis-partilhar", I.partilhar, "Compartilhar"], ["vis-abrircom", I.abrir, "Abrir com"], ["vis-salvar", I.baixar, "Salvar"]];
  X.acoes["vis-partilhar"] = () => VIS.blob && NAT.compartilhar(VIS.blob, VIS.a.nome, VIS.a.tipo).catch(e => toast("Não foi possível compartilhar."));
  X.acoes["vis-abrircom"] = () => VIS.blob && NAT.abrirCom(VIS.blob, VIS.a.nome, VIS.a.tipo).catch(e => toast("Não foi possível abrir."));
  X.acoes["vis-salvar"] = () => VIS.blob && NAT.salvar(VIS.blob, VIS.a.nome, VIS.a.tipo).catch(e => toast("Não foi possível salvar."));
  X.acoes["vis-apresentar"] = () => { if (VIS.blob) { const a = VIS.a, b = VIS.blob; apresentar(a, b); } };

  /* ---------- foto ---------- */
  function verFoto(a, blob) {
    const u = urlDe("arquivos:" + a.id, blob);
    const el = abrirVisor(a, blob, "cs-vfoto", `${barraTopo(a, `<button class="cs-vbt" data-s="vis-apresentar" aria-label="Apresentar em tela cheia">${I.tv}</button>`)}
      <div class="cs-vis-palco" id="vf-palco"><img id="vf-img" src="${u}" alt="${esc(a.nome)}" draggable="false"></div>${barraAcoes(ACOES_PADRAO)}`);
    /* zoom: dois toques ou pinça; arrastar quando ampliada */
    const img = el.querySelector("#vf-img"); let z = 1, tx = 0, ty = 0, ult = 0, pts = new Map(), d0 = 0, z0 = 1, p0 = null;
    const aplicar = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; };
    img.addEventListener("pointerdown", e => { img.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a1, b1] = [...pts.values()]; d0 = Math.hypot(a1[0] - b1[0], a1[1] - b1[1]); z0 = z; } p0 = [e.clientX - tx, e.clientY - ty];
      const ag = Date.now(); if (ag - ult < 300 && pts.size === 1) { z = z > 1 ? 1 : 2.5; if (z === 1) tx = ty = 0; aplicar(); } ult = ag; });
    img.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a1, b1] = [...pts.values()]; z = Math.max(1, Math.min(5, z0 * Math.hypot(a1[0] - b1[0], a1[1] - b1[1]) / (d0 || 1))); aplicar(); }
      else if (z > 1 && p0) { tx = e.clientX - p0[0]; ty = e.clientY - p0[1]; aplicar(); } });
    const solta = e => { pts.delete(e.pointerId); if (z <= 1) { tx = ty = 0; aplicar(); } };
    img.addEventListener("pointerup", solta); img.addEventListener("pointercancel", solta);
  }

  /* ---------- vídeo: player próprio ---------- */
  const VELS = [1, 1.25, 1.5, 2, 0.75];
  function verVideo(a, blob) {
    const u = urlDe("arquivos:" + a.id, blob);
    const el = abrirVisor(a, blob, "cs-vvideo", `${barraTopo(a)}
      <div class="cs-vis-palco" id="vv-palco"><video id="vv" src="${u}" playsinline preload="metadata" x-webkit-airplay="allow"></video>
        <div class="cs-vv-meio"><button class="cs-vbt g" data-s="vv-pular" data-v="-10" aria-label="Voltar 10 segundos">${I.voltar10}</button>
          <button class="cs-vbt gg" data-s="vv-play" id="vv-play" aria-label="Reproduzir">${I.play}</button>
          <button class="cs-vbt g" data-s="vv-pular" data-v="10" aria-label="Avançar 10 segundos">${I.avancar10}</button></div></div>
      <div class="cs-vv-ctl"><span id="vv-t">0:00</span><input type="range" id="vv-seek" min="0" max="1000" value="0" aria-label="Posição do vídeo"><span id="vv-d">${a.dur > 0 && isFinite(a.dur) ? mmss(a.dur) : ""}</span>
        <button class="cs-vbt" data-s="vv-vel" id="vv-vel" aria-label="Velocidade">1x</button><button class="cs-vbt" data-s="vv-cheia" aria-label="Tela cheia">${I.cheia}</button></div>
      ${barraAcoes([["vv-tv", I.tv, "Projetar na TV"], ...ACOES_PADRAO])}`);
    const v = el.querySelector("#vv"), seek = el.querySelector("#vv-seek");
    let arrastando = false, esconder = null;
    const mostrar = () => { el.classList.remove("cs-vv-oculto"); clearTimeout(esconder); esconder = setTimeout(() => { if (!v.paused) el.classList.add("cs-vv-oculto"); }, 3000); };
    v.addEventListener("play", () => { el.querySelector("#vv-play").innerHTML = I.pausa; mostrar(); });
    v.addEventListener("pause", () => { el.querySelector("#vv-play").innerHTML = I.play; el.classList.remove("cs-vv-oculto"); });
    let total = a.dur > 0 && isFinite(a.dur) ? a.dur : 0, corrigindo = false;
    v.addEventListener("loadedmetadata", async () => {
      if (!isFinite(v.duration)) { corrigindo = true; const tocando = !v.paused; v.pause(); total = (await duracaoReal(v)) || total; corrigindo = false; if (tocando) v.play().catch(() => { }); }
      else total = v.duration;
      el.querySelector("#vv-d").textContent = total ? mmss(total) : "";
    });
    v.addEventListener("durationchange", () => { if (isFinite(v.duration) && v.duration > 0) { total = v.duration; el.querySelector("#vv-d").textContent = mmss(total); } });
    v.addEventListener("timeupdate", () => { if (corrigindo) return; el.querySelector("#vv-t").textContent = mmss(v.currentTime); if (!arrastando && total) seek.value = Math.round(v.currentTime / total * 1000); });
    seek.addEventListener("input", () => { arrastando = true; if (total) v.currentTime = seek.value / 1000 * total; });
    seek.addEventListener("change", () => { arrastando = false; });
    let ultToque = 0;
    el.querySelector("#vv-palco").addEventListener("click", e => {
      if (e.target.closest("button")) return;
      const ag = Date.now(), r = e.currentTarget.getBoundingClientRect();
      if (ag - ultToque < 300) { v.currentTime = Math.max(0, v.currentTime + (e.clientX - r.left < r.width / 2 ? -10 : 10)); } else mostrar();
      ultToque = ag;
    });
    VIS.fechar = () => { v.pause(); v.removeAttribute("src"); v.load(); clearTimeout(esconder); };
    v.play().catch(() => { });
  }
  const vv = () => VIS.el && VIS.el.querySelector("#vv");
  X.acoes["vv-play"] = () => { const v = vv(); if (v) v.paused ? v.play() : v.pause(); };
  X.acoes["vv-pular"] = el => { const v = vv(); if (v) v.currentTime = Math.max(0, Math.min(durDe(v) || 1e9, v.currentTime + +el.dataset.v)); };
  X.acoes["vv-vel"] = el => { const v = vv(); if (!v) return; const i = (VELS.indexOf(v.playbackRate) + 1) % VELS.length; v.playbackRate = VELS[i]; el.textContent = String(VELS[i]).replace(".", ",") + "x"; };
  X.acoes["vv-cheia"] = async () => {
    const el = VIS.el; if (!el) return;
    try { if (document.fullscreenElement) await document.exitFullscreen(); else { await el.requestFullscreen(); try { await screen.orientation.lock("landscape"); } catch (e) { } } } catch (e) { toast("Tela cheia indisponível neste aparelho."); }
  };
  X.acoes["vv-tv"] = async () => {
    const v = vv();
    if (v && v.remote && v.remote.prompt) { try { await v.remote.prompt(); return; } catch (e) { } }
    ajudaTV(true);
  };
  function ajudaTV(video) {
    window.abrirSheet(`<div class="sheet-h"><h2>Projetar na TV ou no projetor</h2></div>
      <ul class="cs-ul">
        <li><b>TV sem fio:</b> toque em <b>Espelhar a tela</b> abaixo (ou puxe a barra de notificações e toque em <b>Smart View</b> / <b>Transmitir</b>) e escolha a TV. Depois use a <b>tela cheia</b>.</li>
        <li><b>Projetor ou TV com cabo:</b> ligue um cabo HDMI (ou adaptador USB-C para HDMI) e use a <b>tela cheia</b>.</li>
        ${video ? `<li><b>Enviar o arquivo para a TV:</b> use <b>Compartilhar</b> e escolha o app da sua TV (Smart View, Google Home, LG ThinQ…).</li>` : ""}
      </ul>
      ${NATIVO ? `<button class="btn primary cs-grande" data-s="md-espelhar">${I.tv} Espelhar a tela</button>` : ""}
      <button class="btn ${NATIVO ? "ghost" : "primary"}" data-s="fechar">Entendi</button>`);
  }
  X.acoes["md-espelhar"] = async () => { window.fecharSheet(); if (!(await NAT.transmitir())) toast("Abra a barra de notificações e toque em Smart View ou Transmitir."); };
  X.ajudaTV = ajudaTV;

  /* ---------- PDF: leitor com páginas sob demanda e impressão personalizada ---------- */
  let pdfjsP = null, pdflibP = null, mammothP = null;
  function destruir(doc) { try { if (doc.loadingTask && doc.loadingTask.destroy) doc.loadingTask.destroy(); else if (doc.destroy) doc.destroy(); } catch (e) { } }
  function carregarPdfjs() { return pdfjsP || (pdfjsP = import(base() + "vendor/pdfjs/pdf.min.js").then(m => { m.GlobalWorkerOptions.workerSrc = base() + "vendor/pdfjs/pdf.worker.min.js"; return m; }, e => { pdfjsP = null; throw e; })); }
  function carregarPdflib() { return pdflibP || (pdflibP = window.PDFLib ? Promise.resolve(window.PDFLib) : carregarScript(base() + "vendor/pdf-lib.min.js").then(() => window.PDFLib, e => { pdflibP = null; throw e; })); }
  function carregarMammoth() { return mammothP || (mammothP = window.mammoth ? Promise.resolve(window.mammoth) : carregarScript(base() + "vendor/mammoth.browser.min.js").then(() => window.mammoth)); }
  const PV = { doc: null, zoom: 1, obs: null, total: 0, bytes: null };
  async function verPdf(a, blob) {
    const el = abrirVisor(a, blob, "cs-vpdf", `${barraTopo(a, `<span class="cs-vpg" id="pv-pg"></span><button class="cs-vbt" data-s="pv-zoom" data-v="-1" aria-label="Diminuir">${I.menos}</button><button class="cs-vbt" data-s="pv-zoom" data-v="1" aria-label="Ampliar">${I.mais}</button>`)}
      <div class="cs-vis-palco cs-pv-rolo" id="pv-rolo"><div class="spin"></div></div>
      ${barraAcoes([["pv-imprimir", I.imprimir, "Imprimir"], ["vis-apresentar", I.tv, "Apresentar"], ...ACOES_PADRAO])}`);
    try {
      const pdfjs = await carregarPdfjs(); if (VIS.el !== el) return;
      PV.bytes = new Uint8Array(await blob.arrayBuffer());
      PV.doc = await pdfjs.getDocument({ data: PV.bytes.slice() }).promise; PV.total = PV.doc.numPages; PV.zoom = 1;
      const rolo = el.querySelector("#pv-rolo"), v1 = (await PV.doc.getPage(1)).getViewport({ scale: 1 });
      rolo.innerHTML = Array.from({ length: PV.total }, (_, i) => `<div class="cs-pv-pag" data-p="${i + 1}" style="aspect-ratio:${v1.width}/${v1.height}"><span>${i + 1}</span></div>`).join("");
      montarObservador(rolo);
      el.querySelector("#pv-pg").textContent = `1 / ${PV.total}`;
      rolo.addEventListener("scroll", () => {
        const linha = rolo.scrollTop + rolo.clientHeight * 0.35; let n = 1;
        rolo.querySelectorAll(".cs-pv-pag").forEach(b => { if (b.offsetTop <= linha) n = +b.dataset.p; });
        const pg = el.querySelector("#pv-pg"); if (pg) pg.textContent = `${n} / ${PV.total}`;
      }, { passive: true });
      VIS.fechar = () => { if (PV.obs) PV.obs.disconnect(); PV.obs = null; if (PV.doc) destruir(PV.doc); PV.doc = null; PV.bytes = null; };
    } catch (e) { console.warn(e); el.querySelector("#pv-rolo").innerHTML = `<div class="cs-ap-erro"><b>Não foi possível abrir este PDF.</b><span>Use “Abrir com” para ver em outro aplicativo.</span></div>`; }
  }
  function montarObservador(rolo) {
    if (PV.obs) PV.obs.disconnect();
    const desenhando = new Set();
    PV.obs = new IntersectionObserver(ents => ents.forEach(async en => {
      const box = en.target, n = +box.dataset.p;
      if (en.isIntersecting) {
        if (box.querySelector("canvas") || desenhando.has(n) || !PV.doc) return;
        desenhando.add(n);
        try {
          const page = await PV.doc.getPage(n), w = box.clientWidth, v1 = page.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 2), vp = page.getViewport({ scale: w / v1.width * dpr });
          const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
          await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
          if (box.isConnected) { box.querySelector("canvas") && box.querySelector("canvas").remove(); box.appendChild(cv); }
        } catch (e) { } finally { desenhando.delete(n); }
      } else {
        /* página longe da tela: libera a memória */
        const cv = box.querySelector("canvas"); if (cv) { cv.width = cv.height = 0; cv.remove(); }
      }
    }), { root: rolo, rootMargin: "120% 0px", threshold: 0 });
    rolo.querySelectorAll(".cs-pv-pag").forEach(b => PV.obs.observe(b));
  }
  X.acoes["pv-zoom"] = el => {
    const rolo = VIS.el && VIS.el.querySelector("#pv-rolo"); if (!rolo) return;
    PV.zoom = Math.max(0.6, Math.min(3, PV.zoom * (+el.dataset.v > 0 ? 1.25 : 0.8)));
    rolo.style.setProperty("--pvz", PV.zoom);
    rolo.querySelectorAll("canvas").forEach(c => { c.width = c.height = 0; c.remove(); });
    montarObservador(rolo);
  };

  /* ---- impressão personalizada ---- */
  const IMP = lerLS("cs.imp", { pags: "todas", faixa: "", lados: "um", inverter: true, porFolha: 1, qual: "normal" });
  X.acoes["pv-imprimir"] = () => sheetImprimir();
  function sheetImprimir() {
    const seg = (k, ops) => `<div class="seg cs-seg-imp">${ops.map(([v, t]) => `<button data-s="imp-op" data-k="${k}" data-v="${v}" aria-pressed="${String(IMP[k]) === String(v)}">${t}</button>`).join("")}</div>`;
    window.abrirSheet(`<div class="sheet-h"><h2>Imprimir</h2></div>
      <div class="stack" id="imp-f">
        <div class="f"><span>Páginas <small class="muted">(o documento tem ${PV.total})</small></span>${seg("pags", [["todas", "Todas"], ["impares", "Ímpares"], ["pares", "Pares"], ["faixa", "Escolher"]])}
          <input class="in" id="imp-faixa" placeholder="Ex.: 1-3, 5, 8" value="${esc(IMP.faixa)}" ${IMP.pags === "faixa" ? "" : "hidden"} inputmode="numeric" aria-label="Páginas escolhidas"></div>
        <div class="f"><span>Frente e verso <small class="muted">(manual, em qualquer impressora)</small></span>${seg("lados", [["um", "Só frente"], ["frentes", "1º frentes"], ["versos", "2º versos"]])}
          <label class="cs-aceite" ${IMP.lados === "versos" ? "" : "hidden"} id="imp-inv-l"><input type="checkbox" id="imp-inv" ${IMP.inverter ? "checked" : ""}><span>Ordem invertida (a maioria das impressoras precisa)</span></label></div>
        <div class="f"><span>Páginas por folha</span>${seg("porFolha", [[1, "1 por folha"], [2, "2 por folha (economiza papel)"]])}</div>
        <div class="f"><span>Qualidade</span>${seg("qual", [["normal", "Normal"], ["economia", "Econômica"], ["pb", "Preto e branco"], ["alta", "Alta"]])}
          <small class="muted" id="imp-qual-d">${descQual(IMP.qual)}</small></div>
        <p class="small muted" id="imp-resumo">${resumoImp()}</p>
        <button class="btn primary cs-grande" data-s="imp-ir">${I.imprimir} Imprimir</button>
        <button class="btn" data-s="imp-pdf">${I.baixar} Gerar PDF assim (salvar ou enviar)</button>
        ${IMP.lados === "frentes" ? `<p class="small muted">Depois que as frentes saírem, recoloque as folhas na impressora e escolha <b>2º versos</b>.</p>` : ""}
      </div>`);
  }
  function descQual(q) { return { normal: "Como o original.", economia: "Tons de cinza mais claros: gasta menos tinta.", pb: "Preto e branco nítido, bom para textos e provas.", alta: "Imagens mais nítidas (arquivo maior)." }[q] || ""; }
  function paginasEscolhidas() {
    const n = PV.total, todas = Array.from({ length: n }, (_, i) => i + 1);
    if (IMP.pags === "impares") return todas.filter(p => p % 2 === 1);
    if (IMP.pags === "pares") return todas.filter(p => p % 2 === 0);
    if (IMP.pags === "faixa") {
      const out = [];
      String(IMP.faixa || "").split(/[,;\s]+/).filter(Boolean).forEach(t => {
        const m = t.match(/^(\d+)\s*-\s*(\d+)$/), u = t.match(/^\d+$/);
        if (m) { let a = +m[1], b = +m[2]; const passo = a <= b ? 1 : -1; for (let p = a; passo > 0 ? p <= b : p >= b; p += passo) if (p >= 1 && p <= n) out.push(p); }
        else if (u && +t >= 1 && +t <= n) out.push(+t);
      });
      return out;
    }
    return todas;
  }
  /* monta a lista de folhas (cada folha = 1 ou 2 páginas; null = folha em branco) */
  function folhasImp() {
    const sel = paginasEscolhidas(); let folhas = [];
    if (+IMP.porFolha === 2) for (let i = 0; i < sel.length; i += 2) folhas.push([sel[i], sel[i + 1] || null]); else folhas = sel.map(p => [p]);
    if (IMP.lados === "frentes") folhas = folhas.filter((_, i) => i % 2 === 0);
    else if (IMP.lados === "versos") { const t = folhas.length; folhas = folhas.filter((_, i) => i % 2 === 1); if (t % 2) folhas.push(null); if (IMP.inverter) folhas.reverse(); }
    return folhas;
  }
  function resumoImp() { const f = folhasImp(), s = paginasEscolhidas().length; return s ? `${s} página${s > 1 ? "s" : ""} em ${f.length} folha${f.length > 1 ? "s" : ""}${IMP.lados === "um" ? "" : " (um lado)"}.` : "Nenhuma página escolhida."; }
  function atualizarImp() { gravarLS("cs.imp", IMP); const r = $("#imp-resumo"); if (r) r.textContent = resumoImp(); }
  X.acoes["imp-op"] = el => {
    const k = el.dataset.k; IMP[k] = k === "porFolha" ? +el.dataset.v : el.dataset.v;
    el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
    const fx = $("#imp-faixa"); if (fx) fx.hidden = IMP.pags !== "faixa"; if (k === "pags" && IMP.pags === "faixa" && fx) fx.focus();
    const inv = $("#imp-inv-l"); if (inv) inv.hidden = IMP.lados !== "versos";
    const qd = $("#imp-qual-d"); if (qd) qd.textContent = descQual(IMP.qual);
    atualizarImp();
  };
  document.addEventListener("input", e => { if (e.target.id === "imp-faixa") { IMP.faixa = e.target.value; atualizarImp(); } });
  document.addEventListener("change", e => { if (e.target.id === "imp-inv") { IMP.inverter = e.target.checked; atualizarImp(); } });
  async function montarPdfImp(onProg) {
    const L = await carregarPdflib(), folhas = folhasImp();
    if (!folhas.length) throw { msg: "Escolha ao menos uma página." };
    const orig = await L.PDFDocument.load(PV.bytes, { ignoreEncryption: true }), out = await L.PDFDocument.create();
    const rasterizar = IMP.qual !== "normal";
    const dpi = { economia: 110, pb: 150, alta: 220 }[IMP.qual] || 150;
    const filtro = { economia: "grayscale(1) contrast(.85) brightness(1.2)", pb: "grayscale(1) contrast(1.35) brightness(1.05)", alta: "none" }[IMP.qual] || "none";
    const cacheImg = new Map();
    async function imagem(p) {
      if (cacheImg.has(p)) return cacheImg.get(p);
      const page = await PV.doc.getPage(p), vp = page.getViewport({ scale: dpi / 72 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: cx, viewport: vp }).promise;
      let fonte = cv;
      if (filtro !== "none") { const c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = cv.height; const k = c2.getContext("2d"); k.filter = filtro; k.drawImage(cv, 0, 0); fonte = c2; }
      const bl = await new Promise(r => fonte.toBlob(r, "image/jpeg", IMP.qual === "alta" ? 0.9 : 0.72));
      cv.width = cv.height = 0; if (fonte !== cv) fonte.width = fonte.height = 0;
      const im = await out.embedJpg(new Uint8Array(await bl.arrayBuffer())); const r = { im, w: vp.width * 72 / dpi, h: vp.height * 72 / dpi };
      cacheImg.set(p, r); return r;
    }
    const tamPag = p => { const pg = orig.getPage(p - 1), s = pg.getSize(), rot = (pg.getRotation().angle || 0) % 180 !== 0; return rot ? { width: s.height, height: s.width } : s; };
    let k = 0;
    for (const f of folhas) {
      k++; if (onProg) onProg(k / folhas.length);
      if (f === null) { const s = tamPag(1); out.addPage([s.width, s.height]); continue; }
      if (f.length === 1 && !rasterizar) { const [cp] = await out.copyPages(orig, [f[0] - 1]); out.addPage(cp); continue; }
      if (f.length === 1) { const s = tamPag(f[0]), r = await imagem(f[0]), pg = out.addPage([s.width, s.height]); pg.drawImage(r.im, { x: 0, y: 0, width: s.width, height: s.height }); continue; }
      /* 2 páginas por folha: folha deitada, uma página de cada lado */
      const s = tamPag(f[0]), W = Math.max(s.width, s.height), H = Math.min(s.width, s.height), pg = out.addPage([W, H]), meia = W / 2, m = 14;
      for (let i = 0; i < 2; i++) {
        const p = f[i]; if (!p) continue;
        let w, h, desenhar;
        if (rasterizar) { const r = await imagem(p); w = r.w; h = r.h; desenhar = o => pg.drawImage(r.im, o); }
        else { const [emb] = await out.embedPdf(orig, [p - 1]); w = emb.width; h = emb.height; desenhar = o => pg.drawPage(emb, o); }
        const esc2 = Math.min((meia - 2 * m) / w, (H - 2 * m) / h), dw = w * esc2, dh = h * esc2;
        desenhar({ x: i * meia + (meia - dw) / 2, y: (H - dh) / 2, width: dw, height: dh });
      }
    }
    const bytes = await out.save();
    return new Blob([bytes], { type: "application/pdf" });
  }
  async function gerarImp(acao) {
    const nome = (VIS.a && VIS.a.nome || "documento.pdf").replace(/\.pdf$/i, "") + (IMP.lados === "frentes" ? "_1-frentes" : IMP.lados === "versos" ? "_2-versos" : "_impressao") + ".pdf";
    const barra = barraEnvio("a impressão"); barra(0.02); const sp = document.querySelector(".cs-up span"); if (sp) sp.textContent = "Preparando a impressão…";
    try {
      const b = await montarPdfImp(f => barra(f)); barra(null); window.fecharSheet();
      if (acao === "pdf") await NAT.salvar(b, nome, "application/pdf"); else await NAT.imprimir(b, nome);
    } catch (e) { barra(null); console.warn(e); toast(e && e.msg || "Não foi possível preparar a impressão."); }
  }
  X.acoes["imp-ir"] = () => gerarImp("imprimir");
  X.acoes["imp-pdf"] = () => gerarImp("pdf");

  /* ================= Apresentação (tela cheia, projetor e TV) ================= */
  const AP = { el: null, url: null, pdf: null, pag: 1, total: 1, tipo: "", fonte: 1.25 };
  function fecharApres() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { }
    if (AP.el) AP.el.remove(); AP.el = null; if (AP.url) URL.revokeObjectURL(AP.url); AP.url = null; if (AP.pdf) destruir(AP.pdf); AP.pdf = null;
    document.body.classList.remove("cs-apres-on");
  }
  async function apresentar(a, blob) {
    fecharApres();
    const g = genero(a); AP.tipo = g; AP.pag = 1; AP.total = 1;
    const el = document.createElement("div"); el.className = "cs-apres"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Apresentação");
    el.innerHTML = `<div class="cs-ap-top"><button class="cs-ap-bt" data-s="ap-fechar" aria-label="Fechar">${I.fechar}</button><b>${esc(a.nome)}</b>
      <span class="cs-ap-pg" id="cs-ap-pg"></span>
      ${g === "docx" ? `<button class="cs-ap-bt" data-s="ap-fonte" data-v="-1" aria-label="Diminuir letra">A−</button><button class="cs-ap-bt" data-s="ap-fonte" data-v="1" aria-label="Aumentar letra">A+</button>` : ""}
      <button class="cs-ap-bt" data-s="ap-tv" aria-label="Mostrar na TV ou projetor">${I.tv}</button><button class="cs-ap-bt" data-s="ap-cheia" aria-label="Tela cheia">${I.cheia}</button></div>
      <div class="cs-ap-palco" id="cs-ap-palco"><div class="spin"></div></div>
      ${g === "pdf" ? `<button class="cs-ap-nav esq" data-s="ap-ant" aria-label="Página anterior">${I.ant}</button><button class="cs-ap-nav dir" data-s="ap-prox" aria-label="Próxima página">${I.prox}</button>` : ""}`;
    document.body.appendChild(el); AP.el = el; document.body.classList.add("cs-apres-on");
    let x0 = null;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", e => { if (x0 == null || AP.tipo !== "pdf") return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) irPag(AP.pag + (dx < 0 ? 1 : -1)); x0 = null; });
    const palco = $("#cs-ap-palco");
    try {
      AP.url = URL.createObjectURL(blob);
      if (g === "img") palco.innerHTML = `<img src="${AP.url}" alt="${esc(a.nome)}">`;
      else if (g === "video") palco.innerHTML = `<video id="cs-ap-video" src="${AP.url}" controls autoplay playsinline></video>`;
      else if (g === "pdf") {
        const pdfjs = await carregarPdfjs();
        AP.pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        AP.total = AP.pdf.numPages; palco.innerHTML = `<canvas id="cs-ap-canvas"></canvas>`; await irPag(1);
      } else if (g === "docx") {
        const mammoth = await carregarMammoth();
        const r = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        palco.innerHTML = `<div class="cs-ap-doc" id="cs-ap-doc" style="font-size:${AP.fonte}rem">${r.value}</div>`;
      } else throw new Error("tipo");
    } catch (e) { console.warn(e); palco.innerHTML = `<div class="cs-ap-erro"><b>Não foi possível mostrar este arquivo.</b><span>Use “Abrir com” para ver em outro aplicativo.</span></div>`; }
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
  X.apresentar = apresentar;
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
    ajudaTV(AP.tipo === "video");
  };
  document.addEventListener("keydown", e => {
    if (AP.el) {
      if (e.key === "Escape" && !document.fullscreenElement) fecharApres();
      if (AP.tipo === "pdf" && (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ")) { e.preventDefault(); irPag(AP.pag + 1); }
      if (AP.tipo === "pdf" && (e.key === "ArrowLeft" || e.key === "PageUp")) { e.preventDefault(); irPag(AP.pag - 1); }
    } else if (VIS.el && e.key === "Escape") fecharVisor();
  });
  window.addEventListener("resize", () => { if (AP.tipo === "pdf" && AP.el) irPag(AP.pag); });

  /* ================= Áudio: gravar com um toque, enviar com outro ================= */
  const GR = { el: null, rec: null, stream: null, ac: null, an: null, picos: [], ini: 0, pausado: 0, tPausa: 0, timer: null, chatId: null, unica: false, partes: [] };
  async function iniciarGravacao(chatId, unica) {
    if (GR.el) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast("Este aparelho não permite gravar áudio aqui.");
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
    catch (e) { return toast("Permita o uso do microfone para gravar áudio."); }
    pararAudio();
    const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find(t => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
    Object.assign(GR, { rec, stream, chatId, unica: !!unica, partes: [], picos: [], ini: Date.now(), pausado: 0, tPausa: 0, mime: (mime || "audio/webm").split(";")[0] });
    rec.ondataavailable = e => { if (e.data && e.data.size) GR.partes.push(e.data); };
    try { GR.ac = new (window.AudioContext || window.webkitAudioContext)(); GR.ac.resume().catch(() => { }); GR.an = GR.ac.createAnalyser(); GR.an.fftSize = 512; GR.ac.createMediaStreamSource(stream).connect(GR.an); } catch (e) { GR.an = null; }
    rec.start(500);
    const el = document.createElement("div"); el.className = "cs-grav"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Gravando áudio");
    el.innerHTML = `<button class="cs-grav-bt" data-s="au-cancelar" aria-label="Apagar gravação">${I.lixo}</button>
      <div class="cs-grav-m"><i class="cs-grav-dot"></i><b id="gr-t">0:00</b><span class="cs-grav-onda" id="gr-onda"></span></div>
      <button class="cs-grav-bt" data-s="au-pausar" id="gr-p" aria-label="Pausar">${I.pausa}</button>
      <button class="cs-grav-bt env" data-s="au-enviar" aria-label="Enviar áudio">${I.enviar}</button>
      ${GR.unica ? `<span class="cs-grav-un">${I.um} Visualização única</span>` : ""}
      <span class="cs-grav-dica" aria-hidden="true"><span class="cs-grav-seta">${I.lixo}</span><b>Arraste para cima para apagar</b><small>Solte para enviar</small></span>`;
    if (SEG.ativo) el.classList.add("segura");
    document.body.appendChild(el); GR.el = el;
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) { }
    const buf = new Uint8Array(256);
    GR.timer = setInterval(() => {
      const paus = GR.rec && GR.rec.state === "paused";
      const t = (Date.now() - GR.ini - GR.pausado - (paus ? Date.now() - GR.tPausa : 0)) / 1000;
      const tt = el.querySelector("#gr-t"); if (tt) tt.textContent = mmss(t);
      if (!paus && GR.an) { GR.an.getByteTimeDomainData(buf); let m = 0; for (const x of buf) m = Math.max(m, Math.abs(x - 128)); GR.picos.push(Math.min(1, m / 70)); }
      const on = el.querySelector("#gr-onda"); if (on) on.innerHTML = GR.picos.slice(-28).map(p => `<i style="height:${Math.round(12 + p * 88)}%"></i>`).join("");
      if (t >= 15 * 60) X.acoes["au-enviar"]();
    }, 100);
  }
  function encerrarGravacao() {
    clearInterval(GR.timer); GR.timer = null;
    if (GR.stream) GR.stream.getTracks().forEach(t => t.stop());
    if (GR.ac) { try { GR.ac.close(); } catch (e) { } }
    if (GR.el) GR.el.remove();
    Object.assign(GR, { el: null, stream: null, ac: null, an: null });
  }
  function onda(picos, n) {
    n = n || 36; if (!picos.length) return "".padEnd(n, "2");
    let s = ""; for (let i = 0; i < n; i++) { const a = Math.floor(i * picos.length / n), b = Math.max(a + 1, Math.floor((i + 1) * picos.length / n)); let m = 0; for (let j = a; j < b; j++) m = Math.max(m, picos[j] || 0); s += Math.min(9, Math.round(m * 9)); }
    return s;
  }
  X.acoes["au-gravar"] = el => iniciarGravacao(el.dataset.id, false);
  /* microfone estilo WhatsApp: segurar grava; soltar envia; arrastar para cima apaga.
     Um toque rápido mantém o modo antigo (grava sem segurar, com botões de pausar/apagar/enviar). */
  const SEG = { ativo: false, y0: 0, t0: 0, cancelar: false, id: null };
  const LIMITE_CANCELAR = 70;
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest && e.target.closest(".cs-mic[data-s=au-mic]"); if (!b || GR.el || (e.button && e.button !== 0)) return;
    e.preventDefault();
    Object.assign(SEG, { ativo: true, y0: e.clientY, t0: Date.now(), cancelar: false, id: b.dataset.id });
    iniciarGravacao(b.dataset.id, false).then(() => { if (!SEG.ativo && GR.el) GR.el.classList.remove("segura"); });
  });
  document.addEventListener("pointermove", e => {
    if (!SEG.ativo || !GR.el) return;
    const dy = Math.max(0, SEG.y0 - e.clientY);
    SEG.cancelar = dy > LIMITE_CANCELAR;
    GR.el.classList.toggle("cancelar", SEG.cancelar);
    const seta = GR.el.querySelector(".cs-grav-seta"); if (seta) seta.style.transform = `translateY(${-Math.min(dy, LIMITE_CANCELAR + 20)}px)`;
  });
  const soltar = e => {
    if (!SEG.ativo) return; SEG.ativo = false;
    const curto = Date.now() - SEG.t0 < 350;
    if (!GR.el) return;                                   /* permissão ainda pendente: fica no modo de toque */
    if (curto && !SEG.cancelar) { GR.el.classList.remove("segura", "cancelar"); return; }   /* toque rápido: modo travado */
    if (SEG.cancelar || (e && e.type === "pointercancel")) { X.acoes["au-cancelar"](); try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch (x) { } toast("Áudio apagado."); return; }
    X.acoes["au-enviar"]();
  };
  document.addEventListener("pointerup", soltar);
  document.addEventListener("pointercancel", soltar);
  document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest(".cs-mic")) e.preventDefault(); });
  /* teclado (Enter/Espaço no botão): grava no modo de toque */
  X.acoes["au-mic"] = (el, ev) => { if (ev && ev.detail === 0) iniciarGravacao(el.dataset.id, false); };
  X.acoes["un-audio"] = el => { window.fecharSheet(); iniciarGravacao(el.dataset.id, true); };
  X.acoes["au-cancelar"] = () => { if (GR.rec) { GR.rec.onstop = null; try { GR.rec.stop(); } catch (e) { } } GR.rec = null; encerrarGravacao(); };
  X.acoes["au-pausar"] = el => {
    if (!GR.rec) return;
    if (GR.rec.state === "recording") { GR.rec.pause(); GR.tPausa = Date.now(); el.innerHTML = I.mic; el.setAttribute("aria-label", "Continuar gravando"); GR.el.classList.add("pausado"); }
    else if (GR.rec.state === "paused") { GR.rec.resume(); GR.pausado += Date.now() - GR.tPausa; el.innerHTML = I.pausa; el.setAttribute("aria-label", "Pausar"); GR.el.classList.remove("pausado"); }
  };
  X.acoes["au-enviar"] = () => {
    const rec = GR.rec; if (!rec) return;
    const paus = rec.state === "paused", dur = (Date.now() - GR.ini - GR.pausado - (paus ? Date.now() - GR.tPausa : 0)) / 1000;
    const { chatId, unica, mime } = GR, picos = GR.picos.slice();
    rec.onstop = async () => {
      const blob = new Blob(GR.partes, { type: mime }); GR.rec = null; encerrarGravacao();
      if (dur < 0.8 || !blob.size) return toast("Áudio muito curto.");
      const barra = barraEnvio("áudio");
      try {
        if (unica) {
          const id = await subir(chatId, blob, { nome: "audio", tipo: mime, extra: { unica: true } }, barra);
          await enviarMsg(chatId, { unica: { id, tipo: "audio", dur: Math.round(dur) }, prev: "Áudio de visualização única" });
        } else {
          const id = await subir(chatId, blob, { nome: "audio", tipo: mime }, barra);
          guardar("arquivos:" + id, blob);
          await enviarMsg(chatId, { audio: { id, tipo: mime, dur: Math.round(dur), onda: onda(picos) }, prev: "Áudio (" + mmss(dur) + ")" });
        }
      } catch (e) { console.warn(e); toast(msgErro(e)); }
      barra(null);
    };
    try { rec.stop(); } catch (e) { rec.onstop(); }
  };

  /* ---- tocar áudios (um só tocador para o app todo: economiza memória) ---- */
  const PL = { el: new Audio(), id: null, vel: lerLS("cs.vel", 1), carregando: null };
  PL.el.preload = "none";
  function pararAudio() { try { PL.el.pause(); } catch (e) { } }
  PL.el.addEventListener("timeupdate", () => atualizarAudioUI());
  PL.el.addEventListener("play", () => atualizarAudioUI(true));
  PL.el.addEventListener("pause", () => atualizarAudioUI(true));
  PL.el.addEventListener("ended", () => { PL.el.currentTime = 0; atualizarAudioUI(true); });
  function atualizarAudioUI(icone) {
    if (!PL.id) return;
    document.querySelectorAll(`.cs-aud[data-aud="${CSS.escape(PL.id)}"]`).forEach(box => {
      const d = PL.el.duration && isFinite(PL.el.duration) ? PL.el.duration : +box.dataset.dur || 0, p = d ? PL.el.currentTime / d : 0;
      const bars = box.querySelectorAll(".cs-aud-onda i"), k = Math.round(p * bars.length);
      bars.forEach((b, i) => b.classList.toggle("on", i < k));
      const t = box.querySelector(".cs-aud-t"); if (t) t.textContent = mmss(PL.el.paused && !PL.el.currentTime ? d : PL.el.currentTime);
      if (icone) { const bt = box.querySelector(".cs-aud-play"); if (bt) { bt.innerHTML = PL.el.paused ? I.play : I.pausa; bt.setAttribute("aria-label", PL.el.paused ? "Ouvir" : "Pausar"); } }
    });
  }
  function htmlAudio(au, o) {
    const ativo = PL.id === au.id, tocando = ativo && !PL.el.paused;
    const ondaTxt = au.onda || "3455667665544556676554456677654433".slice(0, 34);
    const prog = ativo && durDe(PL.el) ? PL.el.currentTime / durDe(PL.el) : 0;
    const tr = TRANSC[au.id];
    return `<div class="cs-b cs-aud" data-aud="${esc(au.id)}" data-dur="${au.dur || 0}">${o.nome}
      <div class="cs-aud-l"><button class="cs-aud-play" data-s="au-play" data-v="${esc(au.id)}" data-t="${esc(au.tipo || "")}" aria-label="${tocando ? "Pausar" : "Ouvir"}">${tocando ? I.pausa : I.play}</button>
        <span class="cs-aud-onda" data-s="au-seek" data-v="${esc(au.id)}">${[...ondaTxt].map((c, i, arr) => `<i class="${i < prog * arr.length ? "on" : ""}" style="height:${18 + (+c) * 9}%"></i>`).join("")}</span>
        <button class="cs-aud-vel" data-s="au-vel">${String(PL.vel).replace(".", ",")}x</button></div>
      <div class="cs-aud-r"><small class="cs-aud-t">${mmss(ativo && PL.el.currentTime ? PL.el.currentTime : au.dur)}</small>${au.nome && au.nome !== "audio" ? `<small class="cs-aud-n">${esc(au.nome)}</small>` : ""}
        ${tr && tr.texto ? "" : `<button class="cs-link cs-aud-tr" data-s="au-transc" data-v="${esc(au.id)}" data-t="${esc(au.tipo || "")}" ${tr && tr.trabalhando ? "disabled" : ""}>${tr && tr.trabalhando ? esc(tr.trabalhando) : `${I.texto} Transcrever`}</button>`}</div>
      ${tr && tr.texto ? `<p class="cs-aud-tx">${esc(tr.texto)}</p>` : ""}
      <span class="cs-h">${o.hr}</span></div>`;
  }
  X.acoes["au-play"] = async el => {
    const id = el.dataset.v, tipo = el.dataset.t;
    if (PL.id === id && PL.el.src) { PL.el.paused ? PL.el.play().catch(() => { }) : PL.el.pause(); return; }
    pararAudio(); PL.id = id; el.innerHTML = `<span class="spin sm"></span>`;
    try {
      const b = await obter(id, tipo); if (PL.id !== id) return;
      PL.el.src = urlDe("arquivos:" + id, b); PL.el.playbackRate = PL.vel; await PL.el.play();
    } catch (e) { console.warn(e); toast("Não foi possível tocar este áudio."); el.innerHTML = I.play; PL.id = null; }
  };
  X.acoes["au-vel"] = () => { const v = [1, 1.5, 2]; PL.vel = v[(v.indexOf(PL.vel) + 1) % v.length]; PL.el.playbackRate = PL.vel; gravarLS("cs.vel", PL.vel); document.querySelectorAll(".cs-aud-vel").forEach(b => b.textContent = String(PL.vel).replace(".", ",") + "x"); };
  X.acoes["au-seek"] = (el, ev) => {
    if (PL.id !== el.dataset.v || !durDe(PL.el)) return;
    const r = el.getBoundingClientRect(); PL.el.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * durDe(PL.el);
  };

  /* ---- transcrição (reconhecimento de voz no próprio aparelho, sem enviar o áudio a ninguém) ---- */
  const TRANSC = {};
  Object.entries(lerLS("cs.transc", {})).forEach(([k, v]) => TRANSC[k] = { texto: v });
  let asrP = null;
  function carregarAsr(onProg) {
    return asrP || (asrP = import(base() + "vendor/transformers/transformers.min.js").then(T => {
      T.env.allowLocalModels = false; T.env.useBrowserCache = true;
      return T.pipeline("automatic-speech-recognition", "onnx-community/whisper-base", { dtype: "q8", device: "wasm", progress_callback: onProg });
    }).catch(e => { asrP = null; throw e; }));
  }
  async function pcm16k(blob) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const ab = await ctx.decodeAudioData(await blob.arrayBuffer());
      const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(ab.duration * 16000)), 16000);
      const src = off.createBufferSource(); src.buffer = ab; src.connect(off.destination); src.start();
      return (await off.startRendering()).getChannelData(0);
    } finally { try { ctx.close(); } catch (e) { } }
  }
  function marcarTr(id, estado) { TRANSC[id] = estado; A.pintarMsgs(); }
  X.acoes["au-transc"] = el => {
    const id = el.dataset.v, tipo = el.dataset.t;
    if (!lerLS("cs.asr.ok", false)) {
      X._tr = { id, tipo };
      return window.abrirSheet(`<div class="sheet-h"><h2>Transcrever áudios</h2></div>
        <p class="cs-just">O áudio vira texto <b>no seu próprio aparelho</b>: nada é enviado para outras empresas.</p>
        <p class="cs-just">Na primeira vez o ChatMil baixa o reconhecimento de voz (cerca de <b>80 MB</b>, uma vez só). Prefira o Wi-Fi.</p>
        <button class="btn primary cs-grande" data-s="au-transc-ok">${I.texto} Baixar e transcrever</button><button class="btn ghost" data-s="fechar">Agora não</button>`);
    }
    transcrever(id, tipo);
  };
  X.acoes["au-transc-ok"] = () => { gravarLS("cs.asr.ok", true); window.fecharSheet(); if (X._tr) transcrever(X._tr.id, X._tr.tipo); };
  async function transcrever(id, tipo) {
    marcarTr(id, { trabalhando: "Preparando…" });
    try {
      const prog = {};
      const asr = await carregarAsr(p => {
        if (p && p.status === "progress" && p.total) { prog[p.file] = [p.loaded, p.total]; const v = Object.values(prog), l = v.reduce((s, x) => s + x[0], 0), t = v.reduce((s, x) => s + x[1], 0); TRANSC[id] = { trabalhando: `Baixando o reconhecimento de voz… ${Math.round(l / t * 100)}%` }; const b = document.querySelector(`.cs-aud[data-aud="${CSS.escape(id)}"] .cs-aud-tr`); if (b) b.textContent = TRANSC[id].trabalhando; }
      });
      marcarTr(id, { trabalhando: "Transcrevendo…" });
      const pcm = await pcm16k(await obter(id, tipo));
      const r = await asr(pcm, { language: "portuguese", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
      const texto = String((r && r.text) || "").trim() || "(sem fala reconhecida)";
      marcarTr(id, { texto });
      const salvo = lerLS("cs.transc", {}); salvo[id] = texto; const ks = Object.keys(salvo); while (ks.length > 200) delete salvo[ks.shift()]; gravarLS("cs.transc", salvo);
    } catch (e) { console.warn(e); delete TRANSC[id]; A.pintarMsgs(); toast("Não foi possível transcrever agora. Verifique a internet e tente de novo."); }
  }

  /* ================= Visualização única ================= */
  function htmlUnica(m, o) {
    const u = m.unica, rot = { foto: "Foto", texto: "Mensagem", audio: "Áudio" }[u.tipo] || "Mensagem";
    const visto = VISTOS.has(u.id), est = o.meu ? (ESTADO_UN[u.id] || "Enviada") : visto ? "Aberta" : "Toque para abrir";
    if (o.meu && (!ESTADO_UN[u.id] || (ESTADO_UN[u.id] === "Enviada" && Date.now() - (CHECADO[u.id] || 0) > 15000))) checarUnica(u.id, o.chat);
    return `<div class="cs-b cs-unica-b">${o.nome}<button class="cs-un-bt ${visto || o.meu ? "usada" : ""}" data-s="un-abrir" data-v="${esc(m.id)}" ${visto || o.meu ? "disabled" : ""}>
      <span class="cs-un-ic">${I.um}</span><span><b>${rot}${u.dur > 0 && isFinite(u.dur) ? " · " + mmss(u.dur) : ""}</b><small>${est}</small></span></button><span class="cs-h">${o.hr}</span></div>`;
  }
  const ESTADO_UN = {}, CHECADO = {};
  async function checarUnica(id, chat) {
    ESTADO_UN[id] = ESTADO_UN[id] || "Enviada"; CHECADO[id] = Date.now();
    try {
      const s = await fb.getDoc(D("arquivos", id));
      const antes = ESTADO_UN[id];
      if (!s.exists()) ESTADO_UN[id] = "Aberta";
      else { const n = await fb.getCountFromServer(C("arquivos", id, "vistos")); const k = n.data().count; if (k) ESTADO_UN[id] = chat && chat.tipo === "grupo" ? `Aberta por ${k}` : "Aberta"; }
      if (ESTADO_UN[id] !== antes) A.pintarMsgs();
    } catch (e) { }
  }
  X.acoes["un-foto"] = async el => {
    window.fecharSheet(); const id = el.dataset.id;
    const [f] = await escolher("image/*", false); if (!f) return;
    const barra = barraEnvio("foto de visualização única");
    try {
      const b = await comprimirImg(f, 1600);
      const aid = await subir(id, b, { nome: "foto.jpg", tipo: "image/jpeg", extra: { unica: true } }, barra);
      await enviarMsg(id, { unica: { id: aid, tipo: "foto" }, prev: "Foto de visualização única" });
    } catch (e) { console.warn(e); toast(msgErro(e)); }
    barra(null);
  };
  /* Mensagem de visualização única: tela própria com o texto no alto e o botão Enviar no topo,
     para o teclado do celular nunca cobrir o que está sendo escrito */
  function fecharUnTexto() { const o = document.getElementById("cs-un-ed"); if (o) o.remove(); document.body.classList.remove("cs-un-ed-on"); }
  X.acoes["un-texto"] = el => {
    window.fecharSheet(); fecharUnTexto();
    const ov = document.createElement("div"); ov.id = "cs-un-ed"; ov.className = "cs-un-ed"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Mensagem de visualização única");
    ov.innerHTML = `<div class="cs-un-ed-h"><button class="cs-ico-bt" data-s="un-texto-fechar" aria-label="Cancelar">${I.fechar}</button>
        <b>${I.um} Visualização única</b>
        <button class="btn primary sm" data-s="un-texto-env" data-id="${esc(el.dataset.id)}">${I.enviar}<span>Enviar</span></button></div>
      <textarea class="cs-un-ed-tx" id="un-tx" maxlength="2000" placeholder="Escreva a mensagem" aria-label="Mensagem" enterkeyhint="enter"></textarea>
      <small class="cs-un-ed-c"><span id="un-tx-n">0</span>/2000 · abre uma vez e some</small>`;
    document.body.appendChild(ov); document.body.classList.add("cs-un-ed-on");
    try { history.pushState({ cs: SO.pilha.length, csUnEd: 1 }, ""); } catch (e) { }
    const t = ov.querySelector("#un-tx");
    t.addEventListener("input", () => { const n = ov.querySelector("#un-tx-n"); if (n) n.textContent = t.value.length; });
    setTimeout(() => { try { t.focus(); } catch (e) { } }, 60);
  };
  const sairUnTexto = () => { if (history.state && history.state.csUnEd) history.back(); else fecharUnTexto(); };
  X.acoes["un-texto-fechar"] = () => sairUnTexto();
  window.addEventListener("popstate", fecharUnTexto);
  X.acoes["un-texto-env"] = async el => {
    const t = ($("#un-tx") || {}).value || ""; if (!t.trim()) return toast("Escreva a mensagem.");
    if (ofensivo(t)) return toast("Mensagem não enviada: tem palavras ofensivas ou preconceituosas.");
    sairUnTexto(); window.fecharSheet();
    try {
      const aid = await subir(el.dataset.id, null, { nome: "", tipo: "text/plain", extra: { unica: true, texto: t.trim().slice(0, 2000) } });
      await enviarMsg(el.dataset.id, { unica: { id: aid, tipo: "texto" }, prev: "Mensagem de visualização única" });
    } catch (e) { console.warn(e); toast(msgErro(e)); }
  };
  const UN = { el: null, fonte: null, ac: null, chat: null, id: null };
  X.acoes["un-abrir"] = async el => {
    const t = A.topo(), chat = t && SO.chats.find(c => c.id === t.id); if (!chat) return;
    const m = (SO.msgs[chat.id] || []).find(x => x.id === el.dataset.v); if (!m || !m.unica || m.autor === eu()) return;
    const u = m.unica; if (VISTOS.has(u.id)) return toast("Você já abriu.");
    fecharUnica(); NAT.seguro(true);
    const ov = document.createElement("div"); ov.className = "cs-unica"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Visualização única");
    ov.innerHTML = `<div class="cs-vis-top"><button class="cs-vbt" data-s="un-fechar" aria-label="Fechar">${I.fechar}</button><b>${I.um} Visualização única</b></div><div class="cs-un-palco"><div class="spin"></div></div>
      <p class="cs-un-aviso">${I.cadeado} ${NATIVO ? "Captura de tela bloqueada." : "Ao fechar, some para sempre."}</p>`;
    ov.addEventListener("contextmenu", e => e.preventDefault());
    document.body.appendChild(ov); Object.assign(UN, { el: ov, chat, id: u.id });
    const palco = ov.querySelector(".cs-un-palco");
    try {
      const s = await fb.getDoc(D("arquivos", u.id)); if (!s.exists()) throw { code: "not-found" };
      const dados = s.data();
      if (u.tipo === "texto") { const tx = dados.texto != null ? dados.texto : await (await obter(u.id, "text/plain")).text(); CACHE.delete("arquivos:" + u.id); palco.innerHTML = `<div class="cs-un-tx">${esc(tx || "")}</div>`; }
      else if (u.tipo === "foto") {
        const b = await obter(u.id, "image/jpeg"), url = URL.createObjectURL(b);
        const img = await carregarImg(url); URL.revokeObjectURL(url); CACHE.delete("arquivos:" + u.id);
        /* desenhada num quadro (canvas): não dá para “salvar imagem” com toque longo */
        const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.getContext("2d").drawImage(img, 0, 0);
        palco.innerHTML = ""; palco.appendChild(cv);
      } else if (u.tipo === "audio") {
        const b = await obter(u.id, dados.tipo || "audio/webm"); CACHE.delete("arquivos:" + u.id);
        const ac = new (window.AudioContext || window.webkitAudioContext)(); UN.ac = ac;
        const buf = await ac.decodeAudioData(await b.arrayBuffer());
        palco.innerHTML = `<div class="cs-un-aud"><span class="cs-un-ic g">${I.mic}</span><b id="un-at">0:00 / ${mmss(buf.duration)}</b><button class="btn primary" data-s="un-tocar">${I.play} Ouvir</button></div>`;
        UN.buf = buf;
      }
      marcarVisto(u.id);
      fb.setDoc(D("arquivos", u.id, "vistos", eu()), { em: TS() }).catch(() => { });
      A.pintarMsgs();
    } catch (e) { console.warn(e); palco.innerHTML = `<div class="cs-ap-erro"><b>Esta mensagem já foi aberta.</b><span>Mensagens de visualização única somem depois de abertas.</span></div>`; marcarVisto(u.id); A.pintarMsgs(); }
  };
  X.acoes["un-tocar"] = el => {
    if (!UN.ac || !UN.buf) return; if (UN.fonte) { try { UN.fonte.stop(); } catch (e) { } }
    const src = UN.ac.createBufferSource(); src.buffer = UN.buf; src.connect(UN.ac.destination); src.start(); UN.fonte = src;
    const ini = UN.ac.currentTime, d = UN.buf.duration; el.disabled = true;
    const tick = () => { if (UN.fonte !== src) return; const t = UN.ac.currentTime - ini, at = $("#un-at"); if (at) at.textContent = `${mmss(Math.min(t, d))} / ${mmss(d)}`; if (t < d) requestAnimationFrame(tick); else el.disabled = false; };
    tick();
  };
  function fecharUnica() {
    if (!UN.el) return;
    UN.el.remove(); NAT.seguro(false);
    if (UN.fonte) { try { UN.fonte.stop(); } catch (e) { } } if (UN.ac) { try { UN.ac.close(); } catch (e) { } }
    const { id, chat } = UN; Object.assign(UN, { el: null, fonte: null, ac: null, buf: null, chat: null, id: null });
    if (id && chat) apagarSeTodosViram(id, chat);
  }
  async function apagarSeTodosViram(id, chat) {
    try {
      if (chat.tipo === "grupo") { const n = await fb.getCountFromServer(C("arquivos", id, "vistos")); if (n.data().count < (chat.membros || []).length - 1) return; }
      await apagarArquivo(id);
    } catch (e) { }
  }
  X.acoes["un-fechar"] = fecharUnica;
  /* sair do app ou trocar de tela fecha a visualização única */
  document.addEventListener("visibilitychange", () => { if (document.hidden) { fecharUnica(); pararAudio(); } });
  window.addEventListener("blur", () => { if (UN.el) fecharUnica(); });

  /* ================= Voltar (botão do Android) ================= */
  const voltarAnt = window.SENOV_voltar;
  window.SENOV_voltar = function () {
    if (UN.el) { fecharUnica(); return true; }
    if (GR.el) { X.acoes["au-cancelar"](); return true; }
    if (AP.el) { fecharApres(); return true; }
    if (VIS.el) { fecharVisor(); return true; }
    return voltarAnt ? voltarAnt() : false;
  };

  /* ================= Configurações: dados e armazenamento ================= */
  X.configExtra = X.configExtra || [];
  X.configExtra.push(() => `<h2 class="cs-sec">Armazenamento</h2><div class="cs-menu card flat">
    <button data-s="md-limpar"><span class="cs-lic">${I.lixo}</span><span><b>Limpar arquivos temporários</b><small>Libera espaço no aparelho. As conversas não são apagadas.</small></span></button>
    ${lerLS("cs.asr.ok", false) ? `<button data-s="md-limpar-asr"><span class="cs-lic">${I.texto}</span><span><b>Apagar o reconhecimento de voz</b><small>Libera cerca de 80 MB. Baixa de novo se você transcrever outro áudio.</small></span></button>` : ""}</div>`);
  X.acoes["md-limpar"] = () => { CACHE.clear(); URLS.forEach(u => URL.revokeObjectURL(u)); URLS.clear(); cacheBytes = 0; limparTemporarios(true); };
  X.acoes["md-limpar-asr"] = async () => {
    try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => /transformers/i.test(k)).map(k => caches.delete(k))); } } catch (e) { }
    asrP = null; gravarLS("cs.asr.ok", false); toast("Reconhecimento de voz apagado."); pintar();
  };

  /* para outros módulos (Flash, chamadas) */
  /* prepara um arquivo para o mural: miniatura, páginas, duração */
  async function prepararArquivo(file) {
    let blob = file, nome = (file.name || "arquivo").slice(-120), tipo = file.type || tipoPorNome(nome);
    if (blob.size > LIMITE) throw { msg: "Arquivo grande demais (máximo 20 MB)." };
    const g = genero({ tipo, nome }); let extra = {};
    try { if (g === "video") extra = await miniVideo(blob); else if (g === "pdf") extra = await miniPdf(blob); else if (["docx", "slides", "planilha"].includes(g) || /\.(odt|ods|odp)$/i.test(nome)) extra = await miniOffice(blob, g); else if (g === "audio") extra = { dur: await duracaoAudio(blob) }; } catch (e) { console.warn("miniatura", e); }
    if (extra.thumb && extra.thumb.length > 95000) delete extra.thumb;
    return { blob, nome, tipo, g, extra };
  }
  X.midia = { prepararArquivo, abrirArquivo, genero, ROTULO, COR, enviarArquivo, NAT, subir, obter, apagarArquivo, comprimirImg, carregarImg, miniVideo, recodificar, escolher, barraEnvio, urlDe, guardar, mmss, tamanho, ajudaTV, I };

  /* ================= Estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
.cs-compor.vazio .cs-env:not(.cs-mic){display:none}
.cs-compor:not(.vazio) .cs-mic{display:none}
.cs-cmsg{min-width:230px;gap:8px}
.cs-arq{display:flex;align-items:center;gap:10px;background:color-mix(in srgb,currentColor 7%,transparent);border:0;border-radius:12px;padding:8px;color:inherit;text-align:left;cursor:pointer;font:inherit;width:100%}
.cs-arq-th{width:54px;height:70px;object-fit:cover;object-position:top;border-radius:6px;background:#fff;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.cs-arq-ic{width:48px;height:56px;border-radius:10px;background:var(--c);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;gap:1px}
.cs-arq-ic svg{width:20px;height:20px}.cs-arq-ic b{font-size:.62rem;letter-spacing:.04em}
.cs-arq-t{display:flex;flex-direction:column;min-width:0}.cs-arq-t b{overflow-wrap:anywhere;line-height:1.25}.cs-arq-t small{opacity:.8;font-size:.8rem}
.cs-arq-row{display:flex;align-items:center;gap:10px;min-width:0;width:100%}
.cs-arq-capa{flex-direction:column;align-items:stretch;padding:6px;gap:8px;max-width:300px}
.cs-arq-capa .cs-arq-ic{width:34px;height:40px;border-radius:8px}.cs-arq-capa .cs-arq-ic svg{width:15px;height:15px}.cs-arq-capa .cs-arq-ic b{font-size:.52rem}
.cs-capa{position:relative;display:block;border-radius:9px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18)}
.cs-capa.folha{aspect-ratio:1.25}.cs-capa.larga{aspect-ratio:16/9}
.cs-capa img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.cs-capa-tag{position:absolute;left:8px;top:8px;background:#2447C6;color:#fff;font-style:normal;font-weight:800;font-size:.7rem;padding:3px 8px;border-radius:999px}
.cs-arq-prova{margin-top:6px;width:100%}
.cs-env-l>button{min-height:56px}.cs-env-l>button.feito{opacity:.75}
.cs-env-ok{font-style:normal;font-size:.8rem;color:var(--primary);font-weight:700;flex:none;display:flex;align-items:center;gap:4px}.cs-env-ok svg{width:16px;height:16px}

.cs-midia{padding:4px!important;min-width:0}
.cs-midia .cs-autor{padding:4px 8px 2px}
.cs-mid{display:block;position:relative;border:0;padding:0;border-radius:14px;overflow:hidden;width:min(68vw,280px);max-height:360px;cursor:pointer;background:#0002}
.cs-mid img{width:100%;height:100%;object-fit:cover;display:block}
.cs-mid-play{position:absolute;inset:0;margin:auto;width:56px;height:56px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;display:grid;place-items:center}
.cs-mid-play svg{width:26px;height:26px}
.cs-mid-dur{position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.55);color:#fff;font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:99px}
.cs-midia .cs-h{position:absolute;right:12px;bottom:10px;background:rgba(0,0,0,.45);color:#fff!important;padding:1px 7px;border-radius:99px;opacity:1}
.cs-midia{position:relative}
.cs-up{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:120;background:var(--ink);color:var(--bg);border-radius:14px;padding:10px 14px 14px;font-weight:700;font-size:.9rem;overflow:hidden}
.cs-up i{position:absolute;left:0;bottom:0;height:4px;background:var(--primary);transition:width .2s}
.cs-clip-g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cs-clip-g button{border:0;background:var(--surface-2);border-radius:16px;padding:14px 6px;display:flex;flex-direction:column;align-items:center;gap:8px;font:inherit;font-weight:700;color:var(--ink);cursor:pointer;font-size:.9rem;text-align:center}
.cs-clip-g button span{width:48px;height:48px;border-radius:50%;background:var(--c);color:#fff;display:grid;place-items:center}
.cs-clip-g button svg{width:24px;height:24px}
.cs-clip-h{display:flex;align-items:center;gap:8px;font-size:1rem;margin:14px 0 8px;flex-wrap:wrap}
.cs-clip-h svg{width:22px;height:22px;color:#7C3AED}.cs-clip-h small{font-weight:500;color:var(--muted);font-size:.82rem}
body.cs-vis-on{overflow:hidden}
body.cs-vis-on .scrim,body.cs-apres-on .scrim{z-index:110}
body.cs-vis-on .toast,body.cs-apres-on .toast{z-index:130}
.cs-vis{position:fixed;inset:0;z-index:90;background:#05070d;color:#fff;display:flex;flex-direction:column}
.cs-vis-top{display:flex;align-items:center;gap:6px;padding:calc(6px + env(safe-area-inset-top,0px)) 8px 6px;background:linear-gradient(#000a,#0000);position:relative;z-index:2}
.cs-vis-top b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1rem;display:flex;align-items:center;gap:6px}
.cs-vis-top b svg{width:20px;height:20px;flex:none}
.cs-vbt{min-width:46px;height:46px;border-radius:12px;border:0;background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;cursor:pointer;font:inherit;font-weight:800;padding:0 8px}
.cs-vbt svg{width:24px;height:24px}
.cs-vbt.g{width:58px;height:58px;border-radius:50%;background:rgba(0,0,0,.45)}.cs-vbt.g svg{width:30px;height:30px}
.cs-vbt.gg{width:76px;height:76px;border-radius:50%;background:rgba(0,0,0,.5)}.cs-vbt.gg svg{width:36px;height:36px}
.cs-vpg{font-variant-numeric:tabular-nums;font-weight:700;opacity:.85;padding:0 4px}
.cs-vis-palco{flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;position:relative;touch-action:none}
.cs-vis-palco img{max-width:100%;max-height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;transition:transform .05s}
.cs-vis-acoes{display:flex;justify-content:space-around;gap:4px;padding:8px 6px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.04)}
.cs-vis-acoes button{flex:1;border:0;background:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;font:inherit;font-size:.78rem;font-weight:600;padding:6px 2px;border-radius:12px;cursor:pointer;min-height:56px}
.cs-vis-acoes button:active{background:rgba(255,255,255,.1)}
.cs-vis-acoes svg{width:24px;height:24px}
.cs-vvideo video{width:100%;height:100%;object-fit:contain;background:#000}
.cs-vv-meio{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:28px;transition:opacity .25s;pointer-events:none}
.cs-vv-meio button{pointer-events:auto}
.cs-vv-ctl{display:flex;align-items:center;gap:8px;padding:6px 10px;font-variant-numeric:tabular-nums;font-weight:700;font-size:.85rem;transition:opacity .25s}
.cs-vv-ctl input{flex:1;accent-color:var(--primary);height:28px}
.cs-vv-oculto .cs-vv-meio,.cs-vv-oculto .cs-vv-ctl,.cs-vv-oculto .cs-vis-top,.cs-vv-oculto .cs-vis-acoes{opacity:0;pointer-events:none}
.cs-pv-rolo{display:block;overflow:auto;touch-action:pan-x pan-y;padding:10px 0 24px;--pvz:1}
.cs-pv-pag{width:min(calc(96% * var(--pvz)),calc(900px * var(--pvz)));margin:0 auto 12px;background:#fff;position:relative;box-shadow:0 6px 18px rgba(0,0,0,.5)}
.cs-pv-pag span{position:absolute;inset:0;display:grid;place-items:center;color:#9aa3b5;font-weight:800;font-size:1.4rem}
.cs-pv-pag canvas{position:absolute;inset:0;width:100%;height:100%}
.cs-seg-imp{flex-wrap:wrap;width:100%}
.cs-seg-imp button{flex:1 1 auto}
.cs-apres{position:fixed;inset:0;z-index:95;background:#0b0f1a;color:#fff;display:flex;flex-direction:column}
body.cs-apres-on{overflow:hidden}
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
.cs-ap-erro{display:flex;flex-direction:column;gap:6px;text-align:center;padding:20px}
.cs-ap-nav{position:absolute;top:50%;transform:translateY(-50%);width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer}
.cs-ap-nav svg{width:28px;height:28px}
.cs-ap-nav.esq{left:10px}.cs-ap-nav.dir{right:10px}
.cs-aud{min-width:250px;max-width:330px;gap:4px}
.cs-aud-l{display:flex;align-items:center;gap:8px}
.cs-aud-play{width:46px;height:46px;border-radius:50%;border:0;background:var(--primary);color:var(--primary-ink);display:grid;place-items:center;flex:none;cursor:pointer}
.cs-m.eu .cs-aud-play{background:var(--primary-ink);color:var(--primary)}
.cs-aud-play svg{width:22px;height:22px}
.cs-aud-onda{flex:1;height:34px;display:flex;align-items:center;gap:2px;cursor:pointer}
.cs-aud-onda i{flex:1;min-width:2px;border-radius:2px;background:currentColor;opacity:.32}
.cs-aud-onda i.on{opacity:1}
.cs-aud-vel{border:0;border-radius:99px;background:color-mix(in srgb,currentColor 14%,transparent);color:inherit;font:inherit;font-weight:800;font-size:.8rem;padding:5px 9px;cursor:pointer;flex:none}
.cs-aud-r{display:flex;align-items:center;gap:10px;padding-left:54px;flex-wrap:wrap}
.cs-aud-t{font-variant-numeric:tabular-nums;opacity:.85}
.cs-aud-n{opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px}
.cs-aud-tr{display:inline-flex;align-items:center;gap:4px;font-size:.84rem;color:inherit!important;opacity:.95;text-decoration:underline}
.cs-aud-tr svg{width:15px;height:15px}
.cs-aud-tx{margin:4px 0 0;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,currentColor 8%,transparent);font-size:.95rem;line-height:1.4;white-space:pre-wrap}
.spin.sm{width:20px;height:20px;border-width:3px}
.cs-grav{position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--surface);border-top:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 24px rgba(0,0,0,.12);flex-wrap:wrap}
.cs-grav-bt{width:54px;height:54px;border-radius:50%;border:0;background:var(--surface-2);color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none}
.cs-grav-bt svg{width:24px;height:24px}
.cs-grav-bt.env{background:var(--primary);color:var(--primary-ink);width:62px;height:62px}
.cs-grav-m{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.cs-grav-m b{font-variant-numeric:tabular-nums;font-size:1.1rem;min-width:46px}
.cs-grav-dot{width:12px;height:12px;border-radius:50%;background:#E5484D;animation:csPulso 1s infinite;flex:none}
.cs-grav.pausado .cs-grav-dot{animation:none;opacity:.4}
.cs-grav-onda{flex:1;height:36px;display:flex;align-items:center;gap:2px;overflow:hidden;color:var(--primary)}
.cs-grav-onda i{flex:1;min-width:3px;max-width:6px;background:currentColor;border-radius:2px}
.cs-mic{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.cs-grav-dica{display:none;flex-direction:column;align-items:center;gap:2px;position:absolute;right:10px;bottom:calc(100% + 8px);background:var(--surface);color:var(--ink);border-radius:18px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:.8rem;text-align:center;max-width:150px}
.cs-grav-dica small{color:var(--muted)}
.cs-grav-seta{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);transition:background .15s,color .15s}
.cs-grav-seta svg{width:22px;height:22px}
.cs-grav.segura .cs-grav-bt{display:none}.cs-grav.segura .cs-grav-dica{display:flex}
.cs-grav.segura .cs-grav-m::after{content:"Solte para enviar";color:var(--muted);font-size:.85rem;white-space:nowrap}
.cs-grav.cancelar .cs-grav-seta{background:#E5484D;color:#fff}.cs-grav.cancelar .cs-grav-m{opacity:.45}
.cs-grav.cancelar .cs-grav-dica b{color:#E5484D}
.cs-grav-un{width:100%;display:flex;align-items:center;gap:6px;justify-content:center;color:#7C3AED;font-weight:700;font-size:.85rem}
.cs-grav-un svg{width:18px;height:18px}
@keyframes csPulso{50%{opacity:.25}}
.cs-unica-b{min-width:210px}
.cs-vid-erro{display:flex;flex-direction:column;gap:4px;margin:8px auto;max-width:420px;padding:12px 14px;border-radius:14px;background:rgba(0,0,0,.72);color:#fff;font-size:.88rem;text-align:center}
.cs-un-ed{position:fixed;left:0;right:0;top:0;height:calc(100% - var(--kb,0px));height:calc(100dvh - var(--kb,0px));z-index:90;background:var(--surface);display:flex;flex-direction:column;padding:calc(6px + env(safe-area-inset-top,0px)) 12px 10px;gap:8px;animation:fade .15s}
.cs-un-ed-h{display:flex;align-items:center;gap:8px;min-height:50px}
.cs-un-ed-h b{flex:1;display:flex;align-items:center;gap:6px;font-size:1rem}
.cs-un-ed-h b svg{width:20px;height:20px;color:var(--primary)}
.cs-un-ed-h .btn{gap:6px}
.cs-un-ed-tx{flex:0 1 auto;min-height:120px;height:38vh;max-height:46dvh;resize:none;border:1px solid var(--line);border-radius:16px;padding:14px;font:inherit;font-size:1.1rem;line-height:1.45;background:var(--surface-2);color:var(--ink)}
.cs-un-ed-tx:focus{outline:2px solid var(--primary);outline-offset:0}
.cs-un-ed-c{color:var(--muted);padding:0 4px}
.cs-un-bt{display:flex;align-items:center;gap:10px;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:4px 2px;cursor:pointer}
.cs-un-bt span:last-child{display:flex;flex-direction:column}.cs-un-bt small{opacity:.8}
.cs-un-bt.usada{cursor:default;opacity:.85}
.cs-un-ic{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#7C3AED;color:#fff;flex:none}
.cs-m.eu .cs-un-ic{background:#fff;color:#7C3AED}
.cs-un-ic svg{width:24px;height:24px}.cs-un-ic.g{width:72px;height:72px}.cs-un-ic.g svg{width:36px;height:36px}
.cs-unica{position:fixed;inset:0;z-index:100;background:#05070d;color:#fff;display:flex;flex-direction:column;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.cs-un-palco{flex:1;min-height:0;display:grid;place-items:center;padding:12px;overflow:auto}
.cs-un-palco canvas{max-width:100%;max-height:100%;object-fit:contain;pointer-events:none}
.cs-un-tx{font-size:1.3rem;line-height:1.5;max-width:640px;white-space:pre-wrap;background:#1a1f2e;padding:20px 22px;border-radius:18px}
.cs-un-aud{display:flex;flex-direction:column;align-items:center;gap:16px}
.cs-un-aviso{display:flex;align-items:center;justify-content:center;gap:6px;opacity:.75;font-size:.85rem;margin:0;padding:10px 10px calc(14px + env(safe-area-inset-bottom,0px))}
.cs-un-aviso svg{width:16px;height:16px}
`;
  document.head.appendChild(css);
})();
