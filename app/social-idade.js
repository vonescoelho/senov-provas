/* ChatMil — Verificação de idade (ECA Digital): só maiores de 18 anos entram na rede.
   Selfie com prova de vida feita NO CELULAR (biblioteca Human, código aberto, modelos de IA baixados
   uma vez da CDN). A imagem nunca sai do aparelho e não é guardada: o servidor recebe só "ok".
   Quando a estimativa não confirma, a pessoa pede verificação por chamada de vídeo com a administração.
   Depois dá para trocar o motor por um serviço (Didit, unico…) sem mudar as telas: basta gravar idade/{uid}
   pelo servidor com metodo "servico". Depende de social.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, ic, esc, P, av, eu, pintar, abrirTela, toast, msgErro } = A;
  const $ = s => document.querySelector(s);
  const VERSAO_HUMAN = "3.3.6", VERSAO_TF = "4.22.0";
  const CDNS = ["https://cdn.jsdelivr.net/npm/@vladmandic/human@" + VERSAO_HUMAN + "/", "https://unpkg.com/@vladmandic/human@" + VERSAO_HUMAN + "/"];
  const WASM = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@" + VERSAO_TF + "/dist/";
  const LIMITE_PADRAO = 23;          /* idade estimada mínima para liberar sozinho (folga acima de 18) */
  const MAX_TENTATIVAS = 3;          /* por dia, depois só pela chamada de vídeo */
  const I = {
    rosto: ic('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    escudo: ic('<path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    video: ic('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
  };
  const ID = { uid: null, doc: undefined, ped: undefined, admin: undefined, lim: LIMITE_PADRAO, un: [], pend: [], unPend: null };
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
    ID.un.push(fb.onSnapshot(D("idade", u.uid), s => { ID.doc = s.exists() ? s.data() : null; pintar(); }, () => { ID.doc = null; pintar(); }));
    ID.un.push(fb.onSnapshot(D("pedidosIdade", u.uid), s => { ID.ped = s.exists() ? s.data() : null; pintar(); }, () => { ID.ped = null; pintar(); }));
    fb.getDoc(D("admins", u.uid)).then(s => { ID.admin = s.exists(); if (ID.admin) ouvirPendentes(); pintar(); }).catch(() => { ID.admin = false; pintar(); });
    fb.getDoc(D("config", "idade")).then(s => { const l = s.exists() && Number(s.data().limite); if (l >= 18 && l <= 40) ID.lim = l; }).catch(() => { });
  });
  const liberado = () => !!(ID.admin || (ID.doc && ID.doc.ok === true));
  window.CS_IDADE = { liberado, estado: () => ({ doc: ID.doc, ped: ID.ped, admin: ID.admin, lim: ID.lim }) };

  /* ---------- portão: aparece no lugar do app até a idade ser confirmada ---------- */
  X.portao = () => {
    if (!SO.user || !SO.eu) return "";
    if (ID.admin === undefined || ID.doc === undefined || ID.ped === undefined) return `<div class="cs-splash"><div class="spin"></div></div>`;
    if (liberado()) return "";
    const sair = `<button class="cs-link" data-s="sair">Sair da conta</button>`;
    if (ID.doc && ID.doc.ok === false && ID.doc.metodo === "admin")
      return `<section class="cs-auth cs-idade"><div class="cs-idade-ic perigo">${I.escudo}</div><h1>Acesso não liberado</h1>
        <p class="cs-centro">O ChatMil é só para maiores de 18 anos. A verificação da sua conta não foi aprovada.</p>${sair}</section>`;
    if (ID.ped && ID.ped.estado === "pendente")
      return `<section class="cs-auth cs-idade"><div class="cs-idade-ic">${I.relogio}</div><h1>Verificação pedida</h1>
        <p class="cs-centro">A administração vai fazer uma <b>chamada de vídeo rápida</b> com você aqui no ChatMil. Deixe o app aberto ou com as notificações ligadas.</p>
        <div class="cs-auth-bt">${tentativas() < MAX_TENTATIVAS ? `<button class="btn primary cs-grande" data-s="idade-comecar">${I.rosto} Tentar a selfie de novo</button>` : ""}
        <button class="btn cs-grande" data-s="idade-cancelar-ped">Cancelar pedido</button></div>${sair}</section>`;
    const acabou = tentativas() >= MAX_TENTATIVAS;
    return `<section class="cs-auth cs-idade"><div class="cs-idade-ic">${I.escudo}</div><h1>Confirme sua idade</h1>
      <p class="cs-centro">O ChatMil é só para professores maiores de 18 anos. Leva uns 15 segundos: olhe para a câmera, vire o rosto e abra a boca.</p>
      <ul class="cs-idade-lista"><li>A imagem é analisada <b>no seu celular</b> e não é enviada nem guardada.</li><li>Fique num lugar claro, sem óculos escuros nem boné.</li></ul>
      <div class="cs-auth-bt">${acabou ? `<p class="small muted cs-centro">Você já tentou ${MAX_TENTATIVAS} vezes hoje.</p>` : `<button class="btn primary cs-grande" data-s="idade-comecar">${I.rosto} Começar</button>`}
      <button class="btn cs-grande" data-s="idade-pedir" data-v="camera">${I.video} Verificar por chamada de vídeo</button></div>${sair}</section>`;
  };

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

  /* ---------- tela da câmera (fora do #main, para o repintar não apagar o vídeo) ---------- */
  const CAM = { stream: null, rodando: false, raf: 0 };
  function fecharCam() {
    CAM.rodando = false;
    if (CAM.stream) { CAM.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } }); CAM.stream = null; }
    const el = $("#cs-idade-cam"); if (el) el.remove();
    document.body.classList.remove("cs-idade-aberta");
  }
  function montarCam() {
    fecharCam();
    const el = document.createElement("div"); el.id = "cs-idade-cam";
    el.innerHTML = `<video playsinline muted autoplay></video><div class="cs-idc-mask"><svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet"><ellipse class="cs-idc-anel" cx="50" cy="62" rx="34" ry="45"/></svg></div>
      <button class="cs-idc-x" data-s="idade-fechar" aria-label="Fechar">${I.x}</button>
      <div class="cs-idc-passos"><i></i><i></i><i></i><i></i></div>
      <div class="cs-idc-txt" role="status" aria-live="polite"><b>Preparando…</b><span></span></div>`;
    document.body.appendChild(el); document.body.classList.add("cs-idade-aberta");
    return el;
  }
  const dizer = (t, s) => { const el = $("#cs-idade-cam .cs-idc-txt"); if (el) { el.querySelector("b").textContent = t; el.querySelector("span").textContent = s || ""; } };
  const passo = (n, cor) => { document.querySelectorAll("#cs-idade-cam .cs-idc-passos i").forEach((i, k) => i.classList.toggle("ok", k < n)); const a = $("#cs-idade-cam .cs-idc-anel"); if (a) a.setAttribute("class", "cs-idc-anel " + (cor || "")); };

  async function verificar() {
    if (CAM.rodando) return;
    const el = montarCam(); CAM.rodando = true;
    const video = el.querySelector("video");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { tipo: "camera" };
      try { CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }); }
      catch (e) { throw { tipo: "camera" }; }
      if (!CAM.rodando) return;
      video.srcObject = CAM.stream; try { await video.play(); } catch (e) { }
      const h = await motor(t => dizer(t, "Pode levar alguns segundos."));
      if (!CAM.rodando) return;
      somarTentativa();
      const r = await desafio(h, video);
      if (!CAM.rodando) return;
      await decidir(r);
    } catch (e) {
      if (!CAM.rodando && !(e && e.tipo)) return;
      console.warn("idade", e);
      falhou(e && e.tipo ? e : { tipo: "motor" });
    }
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
      centro: ["Coloque o rosto no círculo", "Olhe direto para a câmera."],
      virar: ["Vire o rosto devagar para os lados", "Um lado e depois o outro."],
      boca: ["Agora abra bem a boca", "Como quem diz “Ahh”."],
      final: ["Olhe para a câmera de novo", "Quase pronto…"]
    };
    dizer(...textos.centro); passo(0);
    while (CAM.rodando) {
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
        if (centrados >= 4 && emb0) proxima();
      } else if (etapa === "virar") {
        yawMin = Math.min(yawMin, yaw); yawMax = Math.max(yawMax, yaw);
        if (yawMin < -0.3 && yawMax > 0.3) proxima();
      } else if (etapa === "boca") {
        bocaMax = Math.max(bocaMax, boca(f.mesh));
        if (bocaMax > 30) proxima();
      } else if (etapa === "final") {
        if (centro && f.embedding) embFim = f.embedding;
        if (centrados >= 4 && embFim && idades.length >= 8) { passo(4, "ok"); break; }
      }
    }
    const mesma = emb0 && embFim ? h.match.similarity(emb0, embFim) : 0;
    return { idade: mediana(idades), real: mediana(reais), vivo: mediana(vivos), mesma, n: idades.length };
  }

  async function decidir(r) {
    if (!(r.mesma >= 0.42)) throw { tipo: "trocou" };
    if (r.real < 0.3 && r.vivo < 0.3) throw { tipo: "foto" };
    if (!(r.idade >= ID.lim)) throw { tipo: "idade", faixa: r.idade < 18 ? "menos de 18" : "18 a " + (ID.lim - 1) };
    dizer("Pronto! Idade confirmada", ""); passo(4, "ok");
    await fb.setDoc(D("idade", ID.uid), { ok: true, metodo: "selfie", em: TS(), v: 1 });
    if (ID.ped) fb.deleteDoc(D("pedidosIdade", ID.uid)).catch(() => { });
    setTimeout(() => { fecharCam(); toast("Idade confirmada. Bem-vindo(a) ao ChatMil!"); pintar(); }, 900);
  }

  function falhou(e) {
    const el = $("#cs-idade-cam"); if (!el) return;
    CAM.rodando = false;
    if (CAM.stream) { CAM.stream.getTracks().forEach(t => { try { t.stop(); } catch (x) { } }); CAM.stream = null; }
    const M = {
      camera: ["Não consegui abrir a câmera", "Permita o uso da câmera para o ChatMil nas configurações do celular, ou peça a verificação por chamada de vídeo."],
      motor: ["Não consegui preparar a verificação", "Confira a internet e tente de novo. Se continuar, peça a verificação por chamada de vídeo."],
      tempo: ["O tempo acabou", "Procure um lugar claro, segure o celular na altura do rosto e siga as instruções."],
      trocou: ["O rosto mudou durante a verificação", "Faça tudo do começo ao fim, sem trocar de pessoa."],
      foto: ["Não parece uma pessoa ao vivo", "Use a câmera da frente, sem foto ou tela na frente."],
      idade: ["Não deu para confirmar que você é maior de 18", "Isso pode acontecer com pouca luz ou se você parecer mais jovem. Tente de novo num lugar claro ou peça a verificação por chamada de vídeo."]
    }[e.tipo] || ["Algo deu errado", ""];
    const pode = tentativas() < MAX_TENTATIVAS && e.tipo !== "camera";
    el.classList.add("fim");
    el.querySelector(".cs-idc-txt").innerHTML = `<b>${esc(M[0])}</b><span>${esc(M[1])}</span>
      <div class="cs-idc-bts">${pode ? `<button class="btn primary cs-grande" data-s="idade-comecar">Tentar de novo</button>` : ""}
      <button class="btn cs-grande" data-s="idade-pedir" data-v="${esc(e.tipo === "idade" ? e.faixa : e.tipo)}">Verificar por chamada de vídeo</button></div>`;
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
      <div class="small">${esc(p.motivo === "camera" ? "Sem câmera / preferiu chamada" : p.motivo ? "Selfie: " + p.motivo : "")}</div></div></div>
      <div class="cs-idade-bts"><button class="btn sm" data-s="idade-conversar" data-id="${esc(p.uid)}">${I.video} Conversar</button>
      <button class="btn sm primary" data-s="idade-aprovar" data-id="${esc(p.uid)}">Aprovar</button><button class="btn sm perigo" data-s="idade-recusar" data-id="${esc(p.uid)}">Recusar</button></div></div>`; };
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${A.K.back}</button><b>Verificações de idade</b></header>
      <div class="stack" style="padding:12px 16px 90px">
      <p class="small muted">Abra a conversa, faça uma chamada de vídeo e peça para a pessoa mostrar um documento com foto e data de nascimento. Não grave nem guarde o documento.</p>
      ${ID.pend.length ? ID.pend.map(linha).join("") : `<p class="muted cs-centro">Nenhum pedido agora.</p>`}
      <form class="card flat stack" id="idade-f-lim"><label class="small"><b>Idade estimada mínima para liberar pela selfie</b></label>
      <div style="display:flex;gap:8px"><input class="in" id="idade-lim" type="number" min="18" max="40" value="${ID.lim}" style="flex:1"><button class="btn primary">Salvar</button></div>
      <span class="small muted">Mais alto = mais seguro, porém mais adultos jovens vão precisar da chamada. Padrão: ${LIMITE_PADRAO}.</span></form></div>`;
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
    const v = Math.round(Number(($("#idade-lim") || {}).value));
    if (!(v >= 18 && v <= 40)) return toast("Use um número entre 18 e 40.");
    try { await fb.setDoc(D("config", "idade"), { limite: v }, { merge: true }); ID.lim = v; toast("Salvo."); } catch (er) { toast(msgErro(er)); }
  });
  Object.assign(X.acoes, {
    "idade-comecar": () => verificar(),
    "idade-fechar": () => { fecharCam(); pintar(); },
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
#cs-idade-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
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
  document.head.appendChild(css);
})();
