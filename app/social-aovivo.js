/* FlashPapo — Ao vivo no MyFlash.
   Quem transmite manda o vídeo direto para cada pessoa que assiste (WebRTC, como nas chamadas),
   e os comentários, emojis e o "ao vivo agora" passam pelo Firestore:
     lives/{id}                 { dono, titulo, ativo, em, nVendo }
     lives/{id}/viewers/{uid}   { em }            (quem está assistindo)
     lives/{id}/sinais/{auto}   { de, para, t, d } (offer / answer / ice)
     lives/{id}/coments/{auto}  { autor, texto, emo, em }
   Depende de social.js e social-chamada.js (X.ice). */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, ic, esc, eu, P, av, toast, msgErro, ofensivo } = A;
  const $ = s => document.querySelector(s);
  const I = {
    x: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
    virar: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><path d="M9 13a3 3 0 0 1 5-2.2M15 13a3 3 0 0 1-5 2.2"/>'),
    olho: ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    enviar: ic('<path d="M4 12 20 4l-6 16-3-7z"/>'),
    share: ic('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    micX: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/>')
  };
  const EMOS = ["❤️", "😂", "😮", "👏", "🔥", "🥳"];
  const LV = { el: null, id: null, dono: false, local: null, frente: true, pcs: new Map(), un: [], seq: 0, vistos: new Set(), mic: true, ativos: [], unAtivos: null, t0: 0 };

  /* ---------- quem está ao vivo agora (faixa no topo do MyFlash) ---------- */
  function ouvirAtivos() {
    if (LV.unAtivos || !eu()) return;
    LV.unAtivos = fb.onSnapshot(fb.query(C("lives"), fb.where("ativo", "==", true)), s => {
      const agora = Date.now();
      LV.ativos = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => !l.em || agora - A.ms(l.em) < 6 * 3600e3)
        .filter(l => !SO.bloqueados || !SO.bloqueados.has(l.dono)).sort((a, b) => A.ms(b.em) - A.ms(a.em)).slice(0, 12);
      pintarFaixa();
    }, () => { });
  }
  X.aoTrocarUsuario.push(u => { if (LV.unAtivos) { LV.unAtivos(); LV.unAtivos = null; } LV.ativos = []; if (u) setTimeout(ouvirAtivos, 1500); });
  function pintarFaixa() {
    const f = $("#xf-lives"); if (!f) return;
    const l = LV.ativos.filter(x => x.dono !== eu() || x.id !== LV.id);
    f.hidden = !l.length;
    f.innerHTML = l.map(x => { const p = P(x.dono); return `<button class="xf-live-it" data-s="lv-assistir" data-id="${esc(x.id)}" aria-label="Assistir ${esc(p.nome || "")} ao vivo">${av(p, 46, x.dono)}<b>AO VIVO</b></button>`; }).join("");
  }
  setInterval(() => { if ($("#xf-lives") && !$("#xf-lives").children.length && LV.ativos.length) pintarFaixa(); }, 2000);

  /* ---------- tela da transmissão (quem transmite e quem assiste) ---------- */
  function tela(dono, info) {
    fecharTela(true);
    const el = document.createElement("div"); el.className = "lv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Ao vivo");
    const p = P(info.dono);
    el.innerHTML = `<video class="lv-video" id="lv-video" playsinline autoplay ${dono ? "muted" : ""}></video>
      <div class="lv-top">${av(p, 34, info.dono)}<span class="lv-quem"><b>${esc(p.usuario || p.nome || "")}</b><small>${esc(info.titulo || "")}</small></span>
        <span class="lv-tag">AO VIVO</span><span class="lv-vendo">${I.olho}<b id="lv-n">0</b></span>
        <button class="lv-bt" data-s="lv-sair" aria-label="${dono ? "Encerrar" : "Sair"}">${I.x}</button></div>
      <div class="lv-espera" id="lv-espera">${dono ? "" : `<div class="spin"></div>`}</div>
      <div class="lv-voa" id="lv-voa"></div>
      <div class="lv-coms" id="lv-coms"></div>
      <div class="lv-pe">
        <div class="lv-emos">${EMOS.map(e => `<button data-s="lv-emo" data-v="${e}" aria-label="Reagir ${e}">${e}</button>`).join("")}</div>
        <form class="lv-form" id="lv-form"><input class="in" id="lv-txt" maxlength="300" placeholder="Comentar…" autocomplete="off" aria-label="Comentário"><button class="lv-bt env" aria-label="Enviar">${I.enviar}</button></form>
        <div class="lv-acoes">${dono ? `<button class="lv-bt" data-s="lv-virar" aria-label="Trocar câmera">${I.virar}</button><button class="lv-bt" data-s="lv-mic" id="lv-mic" aria-label="Microfone">${I.mic}</button>` : ""}
          <button class="lv-bt" data-s="lv-part" aria-label="Compartilhar">${I.share}</button></div>
      </div>`;
    document.body.appendChild(el); document.body.classList.add("cs-lv-on"); LV.el = el;
    try { history.pushState({ lv: 1 }, ""); } catch (e) { }
    return el;
  }
  function fecharTela(semHistorico) {
    if (LV.el) { LV.el.remove(); LV.el = null; }
    document.body.classList.remove("cs-lv-on");
    if (!semHistorico) { try { if (history.state && history.state.lv) history.back(); } catch (e) { } }
  }
  window.addEventListener("popstate", () => { if (LV.el && LV.id) sair(true); });

  /* comentários e emojis */
  function ouvirComentarios(id) {
    LV.vistos = new Set(); const t0 = Date.now() - 2000;
    LV.un.push(fb.onSnapshot(fb.query(C("lives", id, "coments"), fb.orderBy("em", "asc"), fb.limitToLast(60)), s => {
      const box = $("#lv-coms"); if (!box) return;
      s.docChanges ? null : null;
      const l = s.docs.map(d => ({ id: d.id, ...A.dadosDe(d) }));
      for (const c of l) {
        if (LV.vistos.has(c.id)) continue; LV.vistos.add(c.id);
        if (c.emo) { if (A.ms(c.em) > t0 || !c.em) voar(c.emo); continue; }
        const p = P(c.autor), d = document.createElement("div"); d.className = "lv-com";
        d.innerHTML = `${av(p, 26, c.autor)}<span><b>${esc(p.usuario || p.nome || "")}</b> ${esc(c.texto || "")}</span>`;
        box.appendChild(d); while (box.children.length > 40) box.firstChild.remove();
        box.scrollTop = box.scrollHeight;
      }
    }, () => { }));
  }
  function voar(e) {
    const v = $("#lv-voa"); if (!v) return;
    const i = document.createElement("i"); i.textContent = e; i.style.left = (10 + Math.random() * 50) + "%"; i.style.setProperty("--d", (Math.random() * 40 - 20) + "px");
    v.appendChild(i); setTimeout(() => i.remove(), 2600);
  }

  /* ---------- sinais (WebRTC) ---------- */
  function sinal(id, para, t, dados) {
    return fb.addDoc(C("lives", id, "sinais"), { de: eu(), para, t, d: JSON.stringify(dados), n: Date.now() * 1000 + (++LV.seq % 1000) }).catch(e => console.warn("lv sinal", e));
  }
  async function novoPc(id, outro) {
    const pc = new RTCPeerConnection({ iceServers: X.ice ? await X.ice() : [{ urls: "stun:stun.l.google.com:19302" }], bundlePolicy: "max-bundle" });
    pc.onicecandidate = e => { if (e.candidate) sinal(id, outro, "ice", e.candidate.toJSON()); };
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState) && LV.dono) { try { pc.close(); } catch (e) { } LV.pcs.delete(outro); } };
    LV.pcs.set(outro, { pc, fila: [] });
    return pc;
  }
  function ouvirSinais(id) {
    const processados = new Set();
    LV.un.push(fb.onSnapshot(fb.query(C("lives", id, "sinais"), fb.where("para", "==", eu())), s => {
      s.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })).sort((a, b) => (a.n || 0) - (b.n || 0)).forEach(async m => {
        if (processados.has(m.id)) return; processados.add(m.id);
        fb.deleteDoc(m.ref).catch(() => { });
        let dados; try { dados = JSON.parse(m.d); } catch (e) { return; }
        try {
          if (m.t === "offer" && !LV.dono) {
            const pc = await novoPc(id, m.de);
            pc.ontrack = e => { const v = $("#lv-video"); if (v && e.streams[0] && v.srcObject !== e.streams[0]) { v.srcObject = e.streams[0]; v.play().catch(() => { v.muted = true; v.play().catch(() => { }); }); const es = $("#lv-espera"); if (es) es.innerHTML = ""; } };
            await pc.setRemoteDescription(dados);
            const r = await pc.createAnswer(); await pc.setLocalDescription(r); sinal(id, m.de, "answer", pc.localDescription.toJSON());
            const ent = LV.pcs.get(m.de); for (const c of ent.fila) await pc.addIceCandidate(c).catch(() => { }); ent.fila = [];
          } else if (m.t === "answer" && LV.dono) {
            const ent = LV.pcs.get(m.de); if (!ent) return; await ent.pc.setRemoteDescription(dados);
            for (const c of ent.fila) await ent.pc.addIceCandidate(c).catch(() => { }); ent.fila = [];
          } else if (m.t === "ice") {
            const ent = LV.pcs.get(m.de); if (!ent) return;
            if (ent.pc.remoteDescription) await ent.pc.addIceCandidate(dados).catch(() => { }); else ent.fila.push(dados);
          }
        } catch (e) { console.warn("lv", e); }
      });
    }, () => { }));
  }
  /* quem transmite: para cada pessoa que entra, um envio de vídeo */
  function ouvirPlateia(id) {
    LV.un.push(fb.onSnapshot(C("lives", id, "viewers"), async s => {
      const n = s.size; const nv = $("#lv-n"); if (nv) nv.textContent = n;
      fb.updateDoc(D("lives", id), { nVendo: n }).catch(() => { });
      const atuais = new Set(s.docs.map(d => d.id));
      for (const [uid, ent] of LV.pcs) if (!atuais.has(uid)) { try { ent.pc.close(); } catch (e) { } LV.pcs.delete(uid); }
      for (const d of s.docs) {
        const uid = d.id; if (LV.pcs.has(uid) || uid === eu()) continue;
        if (LV.pcs.size >= 25) continue;
        const pc = await novoPc(id, uid);
        LV.local.getTracks().forEach(t => pc.addTrack(t, LV.local));
        pc.getSenders().forEach(sd => { if (sd.track && sd.track.kind === "video") { try { const pr = sd.getParameters(); pr.encodings = pr.encodings && pr.encodings.length ? pr.encodings : [{}]; pr.encodings[0].maxBitrate = 700000; sd.setParameters(pr).catch(() => { }); } catch (e) { } } });
        const of = await pc.createOffer(); await pc.setLocalDescription(of); sinal(id, uid, "offer", pc.localDescription.toJSON());
      }
    }, () => { }));
  }

  /* ---------- começar / assistir / sair ---------- */
  async function camera(frente) {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: frente ? "user" : "environment", width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 24 } }, audio: { echoCancellation: true, noiseSuppression: true } });
  }
  async function iniciar(titulo) {
    if (LV.id) return;
    let local; try { local = await camera(true); } catch (e) { return toast("Libere a câmera e o microfone para transmitir."); }
    try {
      const ref = await fb.addDoc(C("lives"), { dono: eu(), titulo: String(titulo || "").slice(0, 100), ativo: true, em: TS(), nVendo: 0 });
      Object.assign(LV, { id: ref.id, dono: true, local, frente: true, mic: true, t0: Date.now() });
      tela(true, { dono: eu(), titulo });
      const v = $("#lv-video"); v.srcObject = local; v.classList.add("espelho"); v.play().catch(() => { });
      ouvirSinais(ref.id); ouvirPlateia(ref.id); ouvirComentarios(ref.id);
      try { const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Nativo; if (N && N.telaLigada) N.telaLigada({ ligar: true }).catch(() => { }); } catch (e) { }
    } catch (e) { local.getTracks().forEach(t => t.stop()); toast(msgErro(e)); }
  }
  async function assistir(id) {
    if (LV.id) await sair(true);
    const s = await fb.getDoc(D("lives", id)).catch(() => null);
    if (!s || !s.exists() || !s.data().ativo) return toast("A transmissão terminou.");
    const info = s.data();
    Object.assign(LV, { id, dono: false, local: null });
    tela(false, info);
    ouvirSinais(id); ouvirComentarios(id);
    LV.un.push(fb.onSnapshot(D("lives", id), d => {
      const x = d.exists() ? d.data() : null; const nv = $("#lv-n"); if (nv && x) nv.textContent = x.nVendo || 0;
      if (!x || !x.ativo) { toast("A transmissão terminou."); sair(); }
    }, () => { }));
    await fb.setDoc(D("lives", id, "viewers", eu()), { em: TS() }).catch(e => { console.warn(e); toast(msgErro(e)); });
  }
  async function sair(deHistorico) {
    const id = LV.id, dono = LV.dono; if (!id) return fecharTela(deHistorico);
    LV.un.forEach(u => { try { u(); } catch (e) { } }); LV.un = [];
    for (const [, ent] of LV.pcs) { try { ent.pc.close(); } catch (e) { } } LV.pcs.clear();
    if (LV.local) LV.local.getTracks().forEach(t => t.stop());
    Object.assign(LV, { id: null, local: null });
    fecharTela(deHistorico);
    if (dono) {
      fb.updateDoc(D("lives", id), { ativo: false, fim: TS() }).catch(() => { });
      fb.getDocs(C("lives", id, "viewers")).then(s => s.docs.forEach(d => fb.deleteDoc(d.ref).catch(() => { }))).catch(() => { });
      try { const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Nativo; if (N && N.telaLigada) N.telaLigada({ ligar: false }).catch(() => { }); } catch (e) { }
    } else fb.deleteDoc(D("lives", id, "viewers", eu())).catch(() => { });
  }
  X.aoTrocarUsuario.push(u => { if (!u && LV.id) sair(true); });

  Object.assign(X.acoes, {
    "lv-iniciar": () => {
      if (LV.id) return;
      window.abrirSheet(`<div class="sheet-h"><h2><span class="lv-ponto"></span> Ao vivo</h2></div>
        <form class="stack" id="lv-ini-f"><input class="in" id="lv-titulo" maxlength="100" placeholder="Título"><button class="btn primary cs-grande">Começar</button></form>`);
      setTimeout(() => { const t = $("#lv-titulo"); if (t) t.focus(); }, 80);
    },
    "lv-assistir": el => assistir(el.dataset.id),
    "lv-sair": () => sair(),
    "lv-emo": el => { if (!LV.id) return; voar(el.dataset.v); LV.vistos.add("__eu" + Date.now()); fb.addDoc(C("lives", LV.id, "coments"), { autor: eu(), emo: el.dataset.v, em: TS() }).catch(() => { }); },
    "lv-part": () => {
      if (!LV.id) return; const p = LV.dono ? (SO.eu || {}) : {};
      const quem = LV.dono ? "@" + (p.usuario || "") : "";
      A.sheetPartilha(`🔴 ${LV.dono ? "Estou" : "Tem gente"} ao vivo no MyFlash ${quem}! Abra o FlashPapo e assista: https://vonescoelho.github.io/senov-provas/`);
    },
    "lv-mic": () => { if (!LV.local) return; LV.mic = !LV.mic; LV.local.getAudioTracks().forEach(t => t.enabled = LV.mic); const b = $("#lv-mic"); if (b) { b.innerHTML = LV.mic ? I.mic : I.micX; b.classList.toggle("off", !LV.mic); } },
    "lv-virar": async () => {
      if (!LV.local || !LV.dono) return;
      try {
        LV.frente = !LV.frente;
        const novo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: LV.frente ? "user" : "environment", width: { ideal: 720 }, height: { ideal: 1280 } } });
        const tv = novo.getVideoTracks()[0], velho = LV.local.getVideoTracks()[0];
        for (const [, ent] of LV.pcs) { const sd = ent.pc.getSenders().find(x => x.track && x.track.kind === "video"); if (sd) sd.replaceTrack(tv).catch(() => { }); }
        if (velho) { LV.local.removeTrack(velho); velho.stop(); } LV.local.addTrack(tv);
        const v = $("#lv-video"); if (v) { v.srcObject = LV.local; v.classList.toggle("espelho", LV.frente); }
      } catch (e) { toast("Não deu para trocar a câmera."); }
    }
  });
  document.addEventListener("submit", e => {
    if (e.target.id === "lv-ini-f") { e.preventDefault(); const t = ($("#lv-titulo") || {}).value || ""; if (t && ofensivo(t)) return toast("Tem palavras não permitidas."); window.fecharSheet(); iniciar(t.trim()); }
    if (e.target.id === "lv-form") {
      e.preventDefault(); const inp = $("#lv-txt"), t = (inp.value || "").trim(); if (!t || !LV.id) return;
      if (ofensivo(t)) return toast("Comentário não enviado: tem palavras ofensivas.");
      inp.value = ""; fb.addDoc(C("lives", LV.id, "coments"), { autor: eu(), texto: t.slice(0, 300), em: TS() }).catch(er => toast(msgErro(er)));
    }
  });
  X.aoVivo = { iniciar, assistir, sair, LV };

  const css = document.createElement("style");
  css.textContent = `.xf-live-bt{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:999px;padding:6px 10px;margin-left:6px;background:linear-gradient(135deg,#FF3D57,#FF2D95);color:#fff;font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 12px rgba(255,45,85,.35)}
.xf-live-bt i{width:7px;height:7px;border-radius:50%;background:#fff;animation:lvPisca 1.2s infinite}
@keyframes lvPisca{50%{opacity:.25}}
.xf-lives{position:absolute;top:calc(56px + env(safe-area-inset-top,0px));left:0;right:0;z-index:6;display:flex;gap:12px;overflow-x:auto;padding:6px 14px;scrollbar-width:none}
.xf-lives[hidden]{display:none}
.xf-live-it{flex:none;position:relative;border:0;background:none;padding:3px;border-radius:50%;cursor:pointer;background:linear-gradient(135deg,#FF3D57,#FF2D95)}
.xf-live-it .cs-av{border:2px solid #000}
.xf-live-it b{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font-size:.55rem;font-weight:800;color:#fff;background:#FF2D55;border-radius:5px;padding:1px 5px;letter-spacing:.05em;white-space:nowrap}
.lv{position:fixed;inset:0;z-index:180;background:#000;color:#fff;display:flex;flex-direction:column}
.lv-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}.lv-video.espelho{transform:scaleX(-1)}
.lv-top{position:relative;z-index:2;display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:linear-gradient(rgba(0,0,0,.55),transparent)}
.lv-quem{display:flex;flex-direction:column;min-width:0;flex:1}.lv-quem b{font-size:.92rem}.lv-quem small{opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lv-tag{background:#FF2D55;border-radius:6px;padding:3px 7px;font-size:.68rem;font-weight:800;letter-spacing:.06em}
.lv-vendo{display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.45);border-radius:6px;padding:3px 7px;font-size:.78rem}.lv-vendo svg{width:14px;height:14px}
.lv-bt{width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none}.lv-bt svg{width:20px;height:20px}.lv-bt.off{color:#FCA5A5}
.lv-espera{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.lv-voa{position:absolute;right:0;bottom:120px;width:120px;height:60vh;pointer-events:none;z-index:2}
.lv-voa i{position:absolute;bottom:0;font-style:normal;font-size:1.9rem;animation:lvVoa 2.5s ease-out forwards}
@keyframes lvVoa{0%{opacity:0;transform:translateY(0) scale(.6)}10%{opacity:1}100%{opacity:0;transform:translate(var(--d),-55vh) scale(1.2)}}
.lv-coms{position:absolute;left:0;right:90px;bottom:150px;max-height:34vh;overflow-y:auto;z-index:2;display:flex;flex-direction:column;gap:6px;padding:0 12px;scrollbar-width:none;-webkit-mask-image:linear-gradient(transparent,#000 22%)}
.lv-com{display:flex;align-items:flex-start;gap:7px;font-size:.88rem;text-shadow:0 1px 3px rgba(0,0,0,.6)}.lv-com b{font-weight:700}
.lv-pe{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:8px 12px calc(12px + var(--sab,0px));display:flex;flex-direction:column;gap:8px;background:linear-gradient(transparent,rgba(0,0,0,.6))}
.lv-emos{display:flex;gap:6px}.lv-emos button{border:0;background:rgba(0,0,0,.35);border-radius:50%;width:38px;height:38px;font-size:1.25rem;cursor:pointer}
.lv-form{display:flex;gap:8px;align-items:center}.lv-form .in{flex:1;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff;border-radius:999px}.lv-form .env{background:#FF2D55}
.lv-acoes{position:absolute;right:12px;bottom:calc(64px + var(--sab,0px));display:flex;flex-direction:column;gap:10px}
.lv-ponto{display:inline-block;width:10px;height:10px;border-radius:50%;background:#FF2D55;vertical-align:1px;margin-right:4px;animation:lvPisca 1.2s infinite}
body.cs-lv-on{overflow:hidden}`;
  document.head.appendChild(css);
})();
