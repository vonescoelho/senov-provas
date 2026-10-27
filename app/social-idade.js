/* ChatMil — Confirmação de maioridade (ECA Digital) para liberar Conexões.
   1) Selfie com prova de vida (virar o rosto, abrir a boca) e estimativa de idade pelo rosto.
      Se o rosto aparenta 25 anos ou mais (margem de segurança), libera na hora.
   2) Só se a estimativa não bastar: foto do documento (RG, CIN ou CNH) — o app lê a data de
      nascimento (OCR) e confere o rosto do documento com a selfie.
   Tudo roda NO CELULAR (Human + Tesseract); selfie e documento não saem do aparelho. O servidor recebe só "ok". */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, ic, esc, P, av, eu, pintar, abrirTela, toast, msgErro } = A;
  const $ = s => document.querySelector(s);
  const VERSAO_HUMAN = "3.3.6", VERSAO_TF = "4.22.0";
  const CDNS = ["https://cdn.jsdelivr.net/npm/@vladmandic/human@" + VERSAO_HUMAN + "/", "https://unpkg.com/@vladmandic/human@" + VERSAO_HUMAN + "/"];
  const WASM = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@" + VERSAO_TF + "/dist/";
  const TESS = { js: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", worker: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    core: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", lang: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/por@1.0.0/4.0.0_best_int" };
  const SIM_PADRAO = 0.52, IDADE_ROSTO = 25;           /* semelhança mínima rosto do documento × selfie */
  const MAX_TENTATIVAS = 3;          /* por dia, depois só pela chamada de vídeo */
  const I = {
    rosto: ic('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    escudo: ic('<path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    video: ic('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    doc: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 13h4"/>'),
    galeria: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>')
  };
  const ID = { uid: null, doc: undefined, ped: undefined, admin: undefined, simDoc: SIM_PADRAO, un: [], pend: [], unPend: null };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const hoje = () => new Date().toISOString().slice(0, 10);
  const tentativas = () => { const t = lerLS("cs.idt." + ID.uid, {}); return t.d === hoje() ? t.n : 0; };
  const somarTentativa = () => gravarLS("cs.idt." + ID.uid, { d: hoje(), n: tentativas() + 1 });

  /* ---------- estado por usuário ---------- */
  X.aoTrocarUsuario.push(u => {
    ID.un.forEach(f => { try { f(); } catch (e) { } }); ID.un = [];
    if (ID.unPend) { try { ID.unPend(); } catch (e) { } ID.unPend = null; }
    fecharCam();
    Object.assign(ID, { uid: u ? u.uid : null, doc: undefined, ped: undefined, admin: undefined, pend: [] });
    if (!u) return;
    ID.un.push(fb.onSnapshot(D("idade", u.uid), s => { ID.doc = s.exists() ? s.data() : null; marcarAdulto(); pintar(); }, () => { ID.doc = null; pintar(); }));
    ID.un.push(fb.onSnapshot(D("pedidosIdade", u.uid), s => { ID.ped = s.exists() ? s.data() : null; pintar(); }, () => { ID.ped = null; pintar(); }));
    fb.getDoc(D("admins", u.uid)).then(s => { ID.admin = s.exists(); if (ID.admin) ouvirPendentes(); pintar(); }).catch(() => { ID.admin = false; pintar(); });
    fb.getDoc(D("config", "idade")).then(s => { const v = s.exists() && Number(s.data().simDoc); if (v >= 0.2 && v <= 0.7) ID.simDoc = v; }).catch(() => { });
  });
  /* selo público "adulto" (as regras só aceitam com idade/{uid}.ok): é o que filtra quem aparece em Conexões */
  function marcarAdulto() {
    if (!(ID.doc && ID.doc.ok === true) || !SO.eu || SO.eu.adulto === true) return;
    SO.eu.adulto = true; fb.updateDoc(D("users", ID.uid), { adulto: true, menor: false }).catch(e => { console.warn(e); if (SO.eu) SO.eu.adulto = false; });
  }
  X.depois.push(() => { if (SO.eu && !SO.eu.adulto && ID.doc && ID.doc.ok) marcarAdulto(); });
  const liberado = () => !!(ID.admin || (ID.doc && ID.doc.ok === true));
  window.CS_IDADE = { verificar: () => verificar(), liberado, estado: () => ({ doc: ID.doc, ped: ID.ped, admin: ID.admin, simDoc: ID.simDoc }), _datas: (t, ref) => datasDoTexto(t, ref), _nascimento: (t, ref) => nascimento(t, ref), _aquecido: () => aquecido };

  /* o app não tem mais portão: a confirmação só libera Conexões (perfil → +18) */
  X.portao = () => "";

  /* ---------- motor (Human) ---------- */
  let human = null, carregando = null;
  async function motor(info) {
    if (human) return human;
    if (carregando) return carregando;
    carregando = (async () => {
      let ultimoErro;
      for (const base of CDNS) {
        try {
          info("Preparando a verificação…");
          const mod = await import(base + "dist/human.esm.js");
          const H = mod.Human || mod.default;
          const cfg = {
            modelBasePath: base + "models/", backend: "webgl", wasmPath: WASM, warmup: "none", debug: false, async: true, cacheSensitivity: 0,
            filter: { enabled: false },
            face: { enabled: true, detector: { rotation: true, maxDetected: 2, minConfidence: 0.5, return: false }, mesh: { enabled: true }, iris: { enabled: false },
              description: { enabled: true }, emotion: { enabled: false }, antispoof: { enabled: true }, liveness: { enabled: true }, attention: { enabled: false } },
            body: { enabled: false }, hand: { enabled: false }, object: { enabled: false }, gesture: { enabled: false }, segmentation: { enabled: false }
          };
          let h = new H(cfg);
          info("Baixando a verificação (só na 1ª vez)…");
          try { await h.load(); if (!h.tf || !h.tf.getBackend()) throw new Error("sem backend"); }
          catch (e) { cfg.backend = "wasm"; h = new H(cfg); await h.load(); }
          human = h; return h;
        } catch (e) { ultimoErro = e; console.warn("idade: CDN falhou", base, e); }
      }
      throw ultimoErro || new Error("motor");
    })();
    try { return await carregando; } finally { carregando = null; }
  }

  /* ---------- medidas do rosto ---------- */
  const mediana = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function boca(mesh) { const h = Math.abs(mesh[10][1] - mesh[152][1]) || 1; return Math.min(100, 500 * Math.abs(mesh[13][1] - mesh[14][1]) / h); }


  /* ---------- leitura do documento (OCR, no aparelho) ---------- */
  let tessP = null;
  function carregarScript(src) { return new Promise((ok, erro) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok; s.onerror = () => erro(new Error("script")); document.head.appendChild(s); }); }
  async function leitor() {
    if (tessP) return tessP;
    tessP = (async () => {
      if (!window.Tesseract) await carregarScript(TESS.js);
      return await window.Tesseract.createWorker("por", 1, { workerPath: TESS.worker, corePath: TESS.core, langPath: TESS.lang });
    })();
    tessP.catch(() => { tessP = null; });
    return tessP;
  }
  /* datas no texto (dd/mm/aaaa, dd.mm.aa, dd-mm-aaaa), corrigindo O→0 e I/l→1 perto de números */
  function datasDoTexto(t, ref) {
    const agora = ref || new Date(), aa = agora.getFullYear() % 100;
    const limpo = String(t || "").replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, "0").replace(/(?<=\d)[Il|]|[Il|](?=\d)/g, "1");
    const out = [], re = /(\d{1,2})\s?[\/.\-]\s?(\d{1,2})\s?[\/.\-]\s?(\d{4}|\d{2})(?!\d)/g; let m;
    while ((m = re.exec(limpo))) {
      const d = +m[1], mes = +m[2]; let a = +m[3];
      if (m[3].length === 2) a += a > aa ? 1900 : 2000;
      if (d < 1 || d > 31 || mes < 1 || mes > 12 || a < 1900 || a > agora.getFullYear() + 15) continue;
      const dt = new Date(a, mes - 1, d); if (dt.getMonth() !== mes - 1) continue;
      out.push({ dt, pos: m.index });
    }
    return { datas: out, texto: limpo };
  }
  const anos = (nasc, ref) => { const h = ref || new Date(); let n = h.getFullYear() - nasc.getFullYear(); const m = h.getMonth() - nasc.getMonth(); if (m < 0 || (m === 0 && h.getDate() < nasc.getDate())) n--; return n; };
  /* a data de nascimento: a que vem depois de "NASC"; se não achar, a mais antiga que faz sentido */
  function nascimento(t, ref) {
    const agora = ref || new Date(), { datas, texto } = datasDoTexto(t, agora);
    const ok = datas.filter(x => x.dt < agora && anos(x.dt, agora) >= 5 && anos(x.dt, agora) <= 110);
    if (!ok.length) return null;
    const up = texto.toUpperCase(), i = up.search(/NASC/);
    if (i >= 0) { const perto = ok.filter(x => x.pos > i && x.pos - i < 90).sort((a, b) => a.pos - b.pos)[0]; if (perto) return perto.dt; }
    /* sem o rótulo: descarta datas de expedição, emissão, validade e habilitação */
    const outras = ok.filter(x => !/EXPED|EMISS|VALID|HABILIT|ENTRADA|REGISTRO/.test(up.slice(Math.max(0, x.pos - 45), x.pos)) && anos(x.dt, agora) >= 10);
    return outras.length ? outras.slice().sort((a, b) => a.dt - b.dt)[0].dt : null;
  }
  function girar(cv, graus) {
    const o = document.createElement("canvas"), r = graus % 180 !== 0;
    o.width = r ? cv.height : cv.width; o.height = r ? cv.width : cv.height;
    const x = o.getContext("2d"); x.translate(o.width / 2, o.height / 2); x.rotate(graus * Math.PI / 180); x.drawImage(cv, -cv.width / 2, -cv.height / 2);
    return o;
  }
  /* cinza com contraste ajudam o OCR em fotos com reflexo */
  function prepararOCR(cv) {
    const k = Math.min(1, 1800 / Math.max(cv.width, cv.height)), o = document.createElement("canvas");
    o.width = Math.round(cv.width * k); o.height = Math.round(cv.height * k);
    const x = o.getContext("2d"); x.filter = "grayscale(1) contrast(1.35)"; x.drawImage(cv, 0, 0, o.width, o.height);
    return o;
  }
  async function rostoDoDocumento(h, cv, info) {
    /* rosto do documento: o maior rosto da foto */
    info("Procurando a foto no documento…", "Leva alguns segundos.");
    let rostos = [];
    for (const g of [0, 90, 270]) {
      const img = g ? girar(cv, g) : cv;
      const r = await h.detect(img, { face: { detector: { maxDetected: 3, rotation: true }, description: { enabled: true }, antispoof: { enabled: false }, liveness: { enabled: false } } });
      rostos = (r.face || []).filter(f => f.embedding && (f.boxScore || f.score || 0) > 0.5);
      if (rostos.length) break;
    }
    h.config.face.detector.maxDetected = 2;
    if (!rostos.length) throw { tipo: "doc_rosto" };
    return rostos.sort((a, b) => (b.box[2] * b.box[3]) - (a.box[2] * a.box[3]))[0].embedding;
  }
  /* data de nascimento (roda em paralelo com a selfie, para ficar mais rápido) */
  async function idadeDoDocumento(cv) {
    let w; try { w = await leitor(); } catch (e) { throw { tipo: "motor" }; }
    let nasc = null;
    for (const g of [0, 90, 270]) {
      const { data } = await w.recognize(prepararOCR(g ? girar(cv, g) : cv));
      nasc = nascimento(data && data.text);
      if (nasc) break;
    }
    if (!nasc) throw { tipo: "doc_data" };
    const idade = anos(nasc);
    if (idade < 18) throw { tipo: "menor" };
    return idade;
  }
  /* baixa a verificação enquanto a pessoa lê a tela inicial: na hora fica rápido */
  let aquecido = false;
  function preaquecer() {
    if (aquecido) return; aquecido = true;
    setTimeout(() => { motor(() => { }).catch(() => { aquecido = false; }); leitor().catch(() => { }); }, 600);
  }

  /* ---------- tela da câmera (fora do #main, para o repintar não apagar o vídeo) ---------- */
  const CAM = { stream: null, rodando: false };
  function pararStream() { if (CAM.stream) { CAM.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } }); CAM.stream = null; } }
  function fecharCam() {
    CAM.rodando = false; pararStream();
    const el = $("#cs-idade-cam"); if (el) el.remove();
    document.body.classList.remove("cs-idade-aberta");
  }
  function montarCam() {
    fecharCam();
    const el = document.createElement("div"); el.id = "cs-idade-cam"; el.className = "doc";
    el.innerHTML = `<video playsinline muted autoplay></video>
      <div class="cs-idc-mask"><svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet"><rect class="cs-idc-anel cs-idc-cartao" x="4" y="34" width="92" height="60" rx="5"/><ellipse class="cs-idc-anel cs-idc-oval" cx="50" cy="62" rx="34" ry="45"/></svg></div>
      <button class="cs-idc-x" data-s="idade-fechar" aria-label="Fechar">${I.x}</button>
      <div class="cs-idc-passos"><i></i><i></i><i></i><i></i></div>
      <div class="cs-idc-txt" role="status" aria-live="polite"><b>Preparando…</b><span></span><div class="cs-idc-bts cs-idc-doc"></div></div>`;
    document.body.appendChild(el); document.body.classList.add("cs-idade-aberta");
    return el;
  }
  const dizer = (t, s) => { const el = $("#cs-idade-cam .cs-idc-txt"); if (el) { el.querySelector("b").textContent = t; el.querySelector("span").textContent = s || ""; } };
  const passo = (n, cor) => { document.querySelectorAll("#cs-idade-cam .cs-idc-passos i").forEach((i, k) => i.classList.toggle("ok", k < n)); document.querySelectorAll("#cs-idade-cam .cs-idc-anel").forEach(a => a.setAttribute("class", a.getAttribute("class").replace(/ (ok|alerta)\b/g, "") + (cor ? " " + cor : ""))); };
  async function abrirCamera(video, frente) {
    pararStream();
    const pedidos = frente ? [{ facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }]
      : [{ facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, true];
    for (const v of pedidos) { try { CAM.stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); break; } catch (e) { } }
    if (!CAM.stream) return false;
    video.srcObject = CAM.stream; try { await video.play(); } catch (e) { }
    return true;
  }
  /* passo 1: tirar a foto do documento (ou escolher da galeria) */
  function capturarDocumento(el, video, temCamera) {
    return new Promise(res => {
      const bts = el.querySelector(".cs-idc-doc");
      bts.innerHTML = `${temCamera ? `<button class="cs-idc-disparo" data-s="idade-foto" aria-label="Tirar foto do documento"><i></i></button>` : ""}
        <button class="btn" data-s="idade-galeria">${I.galeria} Escolher foto da galeria</button>`;
      dizer(temCamera ? "Documento com foto" : "Foto do documento", "RG, CIN ou CNH");
      CAM.capturar = canvas => { CAM.capturar = null; bts.innerHTML = ""; res(canvas); };
    });
  }
  function quadroDoVideo(video) {
    const cv = document.createElement("canvas"); cv.width = video.videoWidth || 1280; cv.height = video.videoHeight || 720;
    cv.getContext("2d").drawImage(video, 0, 0, cv.width, cv.height); return cv;
  }
  async function arquivoParaCanvas(f) {
    let img;
    try { img = await createImageBitmap(f, { imageOrientation: "from-image" }); }
    catch (e) { const u = URL.createObjectURL(f); img = await new Promise((ok, er) => { const i = new Image(); i.onload = () => ok(i); i.onerror = er; i.src = u; }); }
    const W = img.width || img.naturalWidth, H = img.height || img.naturalHeight, k = Math.min(1, 2200 / Math.max(W, H));
    const cv = document.createElement("canvas"); cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); return cv;
  }

  async function verificar() {
    if (CAM.rodando) return;
    if (tentativas() >= MAX_TENTATIVAS) return toast("Tente de novo amanhã.");
    const el = montarCam(); CAM.rodando = true; el.classList.remove("doc"); el.classList.add("selfie");
    const video = el.querySelector("video");
    try {
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !(await abrirCamera(video, true))) throw { tipo: "camera" };
      if (!CAM.rodando) return;
      const h = await motor(t => dizer(t, ""));
      if (!CAM.rodando) return;
      somarTentativa(); CAM.erroDoc = null;
      const r = await desafio(h, video);
      if (!CAM.rodando) return;
      if (!(r.mesma >= 0.42)) throw { tipo: "trocou" };
      if (r.real < 0.3 && r.vivo < 0.3) throw { tipo: "foto" };
      if (r.n >= 3 && r.idade >= IDADE_ROSTO) return liberar("selfie");
      /* rosto não bastou: documento */
      pararStream(); el.classList.remove("selfie"); el.classList.add("doc");
      const temCamera = await abrirCamera(video, false);
      if (!CAM.rodando) return;
      passo(2);
      const cv = await capturarDocumento(el, video, temCamera);
      if (!CAM.rodando || !cv) return;
      pararStream(); el.classList.add("lendo");
      const emb = await rostoDoDocumento(h, cv, dizer);
      if (!CAM.rodando) return;
      dizer("Conferindo…", "");
      await idadeDoDocumento(cv);
      if (!CAM.rodando) return;
      const sim = Math.max(r.emb0 ? h.match.similarity(emb, r.emb0) : 0, r.embFim ? h.match.similarity(emb, r.embFim) : 0);
      if (!(sim >= ID.simDoc)) throw { tipo: "naoconfere" };
      await liberar("documento");
    } catch (e) {
      if (!CAM.rodando && !(e && e.tipo)) return;
      console.warn("idade", e);
      falhou(e && e.tipo ? e : { tipo: "motor" });
    }
  }
  async function liberar(metodo) {
    dizer("Pronto ✓", ""); passo(4, "ok");
    await fb.setDoc(D("idade", ID.uid), { ok: true, metodo, em: TS(), v: 3 });
    ID.doc = { ok: true, metodo };
    if (ID.ped) fb.deleteDoc(D("pedidosIdade", ID.uid)).catch(() => { });
    setTimeout(() => { fecharCam(); SO.tab = "conexoes"; if (A.lembrarTab) A.lembrarTab(); pintar(); window.scrollTo(0, 0); }, 800);
  }

  /* sequência: centralizar → (virar o rosto / abrir a boca, em ordem sorteada) → olhar de novo */
  async function desafio(h, video) {
    const ordem = Math.random() < 0.5 ? ["virar", "boca"] : ["boca", "virar"];
    const etapas = ["centro", ...ordem, "final"];
    const idades = [], reais = [], vivos = [];
    let emb0 = null, embFim = null, k = 0, ini = performance.now(), quadros = 0, yawMin = 0, yawMax = 0, bocaMax = 0, centrados = 0, semRosto = 0;
    /* nas etapas de movimento não precisa da idade: desliga os modelos pesados para ficar mais rápido */
    const PESADO = { face: { description: { enabled: true }, antispoof: { enabled: true }, liveness: { enabled: true } } };
    const LEVE = { face: { description: { enabled: false }, antispoof: { enabled: false }, liveness: { enabled: false } } };
    const proxima = () => { k++; ini = performance.now(); quadros = 0; centrados = 0; };
    const textos = {
      centro: ["Rosto no círculo", ""],
      virar: ["Vire o rosto para os lados", ""],
      boca: ["Abra a boca", ""],
      final: ["Olhe para a câmera", ""]
    };
    dizer(...textos.centro); passo(0);
    while (CAM.rodando) {
      if (CAM.erroDoc) throw CAM.erroDoc;
      if (video.readyState < 2) { await new Promise(r => setTimeout(r, 80)); continue; }
      const etapa = etapas[k];
      const res = await h.detect(video, etapa === "virar" || etapa === "boca" ? LEVE : PESADO);
      if (!CAM.rodando) break;
      const rostos = (res.face || []).filter(f => (f.boxScore || f.score || 0) > 0.6);
      /* tempo esgota por relógio E por número de quadros (celulares lentos analisam menos quadros por segundo) */
      if (++quadros > 15 && performance.now() - ini > 25000) throw { tipo: "tempo" };
      if (rostos.length > 1) { dizer("Só uma pessoa na câmera", "Peça para a outra pessoa sair."); passo(k, "alerta"); continue; }
      const f = rostos[0];
      if (!f || !f.mesh || f.mesh.length < 400) { if (++semRosto > 4) { dizer("Não estou vendo seu rosto", "Aproxime o celular e procure um lugar claro."); passo(k, "alerta"); } continue; }
      semRosto = 0; dizer(...textos[etapa]); passo(k);
      const yaw = (f.rotation && f.rotation.angle && f.rotation.angle.yaw) || 0, centro = Math.abs(yaw) < 0.2;
      if (centro && typeof f.age === "number") { idades.push(f.age); centrados++; }
      if (typeof f.real === "number") reais.push(f.real);
      if (typeof f.live === "number") vivos.push(f.live);
      if (etapa === "centro") {
        if (centro && f.embedding && !emb0) emb0 = f.embedding;
        if (centrados >= 3 && emb0) proxima();
      } else if (etapa === "virar") {
        yawMin = Math.min(yawMin, yaw); yawMax = Math.max(yawMax, yaw);
        if (yawMin < -0.3 && yawMax > 0.3) proxima();
      } else if (etapa === "boca") {
        bocaMax = Math.max(bocaMax, boca(f.mesh));
        if (bocaMax > 30) proxima();
      } else if (etapa === "final") {
        if (centro && f.embedding) embFim = f.embedding;
        if (centrados >= 2 && embFim) { passo(4, "ok"); break; }
      }
    }
    const mesma = emb0 && embFim ? h.match.similarity(emb0, embFim) : 0;
    return { idade: mediana(idades), real: mediana(reais), vivo: mediana(vivos), mesma, n: idades.length, emb0, embFim };
  }

  function falhou(e) {
    const el = $("#cs-idade-cam"); if (!el) return;
    CAM.rodando = false; CAM.capturar = null; pararStream();
    const M = {
      camera: ["Câmera bloqueada", "Permita a câmera para o ChatMil."],
      motor: ["Sem conexão", "Confira a internet."],
      doc_rosto: ["Foto do documento não encontrada", "Documento inteiro, sem reflexo."],
      doc_data: ["Data de nascimento ilegível", "Lugar claro, sem reflexo."],
      menor: ["Disponível a partir dos 18 anos", ""],
      tempo: ["Tempo esgotado", "Lugar claro, celular na altura do rosto."],
      trocou: ["O rosto mudou", "Faça do começo ao fim."],
      foto: ["Use a câmera ao vivo", ""],
      naoconfere: ["O rosto não confere com o documento", ""]
    }[e.tipo] || ["Algo deu errado", ""];
    const pode = tentativas() < MAX_TENTATIVAS && e.tipo !== "camera" && e.tipo !== "menor";
    el.classList.add("fim");
    el.querySelector(".cs-idc-txt").innerHTML = `<b>${esc(M[0])}</b><span>${esc(M[1])}</span>
      <div class="cs-idc-bts">${pode ? `<button class="btn primary cs-grande" data-s="idade-comecar">Tentar de novo</button>` : ""}
      <button class="btn cs-grande" data-s="idade-fechar">Fechar</button></div>`;
    passo(0, "alerta");
  }

  async function pedir(motivo) {
    fecharCam();
    const p = SO.eu || {};
    try {
      await fb.setDoc(D("pedidosIdade", ID.uid), { nome: String(p.nome || "").slice(0, 80), usuario: String(p.usuario || "").slice(0, 40), motivo: String(motivo || "").slice(0, 40), estado: "pendente", em: TS() });
      toast("Pedido enviado. A administração vai te chamar por vídeo.");
    } catch (e) { toast(msgErro(e)); }
  }

  /* ---------- administração: lista de pedidos e ajuste ---------- */
  function ouvirPendentes() {
    if (ID.unPend) return;
    ID.unPend = fb.onSnapshot(fb.query(C("pedidosIdade"), fb.where("estado", "==", "pendente")), s => {
      ID.pend = s.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => A.ms(a.em) - A.ms(b.em)); pintar();
    }, e => console.warn(e));
  }
  X.configExtra.push(() => ID.admin ? `<div class="card flat stack cs-idade-adm-cfg"><button class="cs-linha" data-s="idade-adm" style="display:flex;align-items:center;gap:12px;width:100%"><span class="cs-lic">${I.escudo}</span><span style="flex:1;text-align:left"><b>Verificações de idade</b></span>${ID.pend.length ? `<span class="pill d1">${ID.pend.length}</span>` : ""}</button></div>` : "");
  X.views["idade-adm"] = () => {
    const linha = p => { const pp = P(p.uid); return `<div class="card stack cs-idade-ped">
      <div style="display:flex;gap:10px;align-items:center">${av(pp, 44, p.uid)}<div style="flex:1;min-width:0"><b>${esc(p.nome || pp.nome)}</b><div class="small muted">@${esc(p.usuario || pp.usuario || "")} · ${esc(A.tempoPost ? A.tempoPost(p.em) : "")}</div>
      <div class="small">${esc(p.motivo === "camera" ? "Sem câmera / preferiu chamada" : p.motivo ? "Motivo: " + p.motivo : "")}</div></div></div>
      <div class="cs-idade-bts"><button class="btn sm" data-s="idade-conversar" data-id="${esc(p.uid)}">${I.video} Conversar</button>
      <button class="btn sm primary" data-s="idade-aprovar" data-id="${esc(p.uid)}">Aprovar</button><button class="btn sm perigo" data-s="idade-recusar" data-id="${esc(p.uid)}">Recusar</button></div></div>`; };
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${A.K.back}</button><b>Verificações de idade</b></header>
      <div class="stack" style="padding:12px 16px 90px">
      ${ID.pend.length ? ID.pend.map(linha).join("") : `<p class="muted cs-centro">Nenhum pedido agora.</p>`}
      <form class="card flat stack" id="idade-f-lim"><label class="small" for="idade-sim"><b>Segurança Facial</b></label>
      <div style="display:flex;gap:8px"><input class="in" id="idade-sim" type="number" min="20" max="70" value="${Math.round(ID.simDoc * 100)}" style="flex:1"><button class="btn primary">Salvar</button></div></form></div>`;
  };
  async function decidirAdm(uid, ok) {
    const b = fb.writeBatch(A.db);
    b.set(D("idade", uid), { ok, metodo: "admin", por: eu(), em: TS(), v: 1 });
    b.set(D("pedidosIdade", uid), { estado: ok ? "aprovado" : "recusado", decididoEm: TS() }, { merge: true });
    await b.commit();
    toast(ok ? "Acesso liberado." : "Acesso recusado.");
  }
  document.addEventListener("submit", async e => {
    if (e.target.id !== "idade-f-lim") return; e.preventDefault();
    const v = Math.round(Number(($("#idade-sim") || {}).value));
    if (!(v >= 20 && v <= 70)) return toast("Use um número entre 20 e 70.");
    try { await fb.setDoc(D("config", "idade"), { simDoc: v / 100 }, { merge: true }); ID.simDoc = v / 100; toast("Salvo."); } catch (er) { toast(msgErro(er)); }
  });
  Object.assign(X.acoes, {
    "idade-comecar": () => verificar(),
    "idade-fechar": () => { fecharCam(); pintar(); },
    "idade-foto": () => { const v = $("#cs-idade-cam video"); if (v && CAM.capturar) CAM.capturar(quadroDoVideo(v)); },
    "idade-galeria": () => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
      inp.onchange = async () => { const f = (inp.files || [])[0]; if (!f || !CAM.capturar) return; try { CAM.capturar(await arquivoParaCanvas(f)); } catch (e) { toast("Não consegui abrir essa foto. Tente outra."); } };
      inp.click();
    },
    "idade-pedir": el => pedir(el.dataset.v),
    "idade-cancelar-ped": () => fb.deleteDoc(D("pedidosIdade", ID.uid)).catch(e => toast(msgErro(e))),
    "idade-adm": () => abrirTela({ v: "idade-adm" }),
    "idade-conversar": el => A.abrirDireto(el.dataset.id),
    "idade-aprovar": el => decidirAdm(el.dataset.id, true).catch(e => toast(msgErro(e))),
    "idade-recusar": el => window.abrirSheet(`<div class="sheet-h"><h2>Recusar acesso?</h2></div><p class="small">A pessoa não poderá usar o ChatMil com esta conta.</p>
      <button class="btn perigo cs-grande" data-s="idade-recusar-ok" data-id="${esc(el.dataset.id)}">Recusar</button><button class="btn ghost" data-s="fechar">Cancelar</button>`),
    "idade-recusar-ok": el => { window.fecharSheet(); decidirAdm(el.dataset.id, false).catch(e => toast(msgErro(e))); }
  });
  window.addEventListener("popstate", () => { if ($("#cs-idade-cam")) fecharCam(); });

  const css = document.createElement("style");
  css.textContent = `.cs-idade{gap:14px;text-align:center;align-items:center}.cs-idade h1{font-size:1.5rem;margin:0}.cs-idade .cs-auth-bt{width:100%}
.cs-idade-ic{width:76px;height:76px;border-radius:24px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);margin:0 auto}
.cs-idade-ic svg{width:42px;height:42px}.cs-idade-ic.perigo{background:color-mix(in srgb,#e5484d 14%,transparent);color:#e5484d}
.cs-idade-lista{margin:0;padding:0 0 0 20px;font-size:.92rem;line-height:1.5;color:var(--muted);text-align:left;max-width:420px}
.cs-idade .btn svg{width:20px;height:20px;vertical-align:-4px;margin-right:6px}
#cs-idade-cam{position:fixed;inset:0;z-index:100;background:#000;color:#fff;display:flex;flex-direction:column}
#cs-idade-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}#cs-idade-cam.doc video{transform:none}
#cs-idade-cam.fim video{filter:blur(14px) brightness(.5)}
.cs-idc-mask{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;padding:8vh 6vw 26vh}
.cs-idc-mask svg{width:100%;height:100%;overflow:visible}
.cs-idc-anel{fill:none;stroke:#fff;stroke-width:1.4;stroke-dasharray:4 3;transition:stroke .2s}
.cs-idc-anel.ok{stroke:#30c48d;stroke-dasharray:none;stroke-width:2}.cs-idc-anel.alerta{stroke:#ffb224}
.cs-idc-x{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);left:12px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;z-index:2}
.cs-idc-x svg{width:22px;height:22px}
.cs-idc-passos{position:absolute;top:calc(env(safe-area-inset-top,0px) + 28px);left:0;right:0;display:flex;justify-content:center;gap:8px;z-index:1}
.cs-idc-passos i{width:34px;height:5px;border-radius:3px;background:rgba(255,255,255,.35)}.cs-idc-passos i.ok{background:#30c48d}
.cs-idc-txt{position:absolute;left:0;right:0;bottom:0;padding:22px 20px calc(env(safe-area-inset-bottom,0px) + 26px);background:linear-gradient(transparent,rgba(0,0,0,.85) 30%);text-align:center;display:flex;flex-direction:column;gap:6px}
.cs-idc-txt b{font-size:1.3rem}.cs-idc-txt span{opacity:.85;font-size:.95rem}
.cs-idc-bts{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.cs-idc-bts .btn:not(.primary){background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.35)}
.cs-idade-bts{display:flex;gap:8px;flex-wrap:wrap}.cs-idade-bts .btn svg{width:16px;height:16px;vertical-align:-3px;margin-right:4px}`;
  css.textContent += `
.cs-idade-passos{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;width:100%;max-width:420px;text-align:left}
.cs-idade-passos li{display:flex;align-items:center;gap:12px;background:var(--surface);border-radius:16px;padding:12px 14px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.cs-idade-passos li svg{width:28px;height:28px;color:var(--primary);flex:none}.cs-idade-passos li span{display:flex;flex-direction:column}.cs-idade-passos small{color:var(--muted)}
#cs-idade-cam.doc .cs-idc-oval,#cs-idade-cam.selfie .cs-idc-cartao,#cs-idade-cam.fim .cs-idc-cartao{display:none}
#cs-idade-cam.lendo video{filter:brightness(.4)}
.cs-idc-doc{align-items:center}
.cs-idc-disparo{width:76px;height:76px;border-radius:50%;border:4px solid #fff;background:transparent;display:grid;place-items:center;padding:0;cursor:pointer}
.cs-idc-disparo i{width:60px;height:60px;border-radius:50%;background:#fff;display:block}.cs-idc-disparo:active i{transform:scale(.9)}
.cs-idc-doc .btn svg{width:18px;height:18px;vertical-align:-4px;margin-right:6px}`;
  document.head.appendChild(css);
})();
