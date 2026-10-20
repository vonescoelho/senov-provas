/* ChatMil — chamadas de vídeo e de voz dentro do app (WebRTC, direto entre os aparelhos, sem servidor de mídia).
   Até 6 pessoas por chamada. Para turmas maiores, oferece uma sala do Jitsi Meet.
   A sinalização usa o Firestore: chamadas/{id} e chamadas/{id}/sinais. Depende de social.js. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, ic, esc, eu, enviarMsg, toast, msgErro, P, av } = A;
  const $ = s => document.querySelector(s);
  const I = {
    video: ic('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>'),
    videoOff: ic('<path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5 0h3a2 2 0 0 1 2 2v3.3l6-3.3v10"/><path d="M2 2l20 20"/>'),
    fone: ic('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
    desligar: ic('<path d="M10.7 13.3a16 16 0 0 0 3.4 2.4l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8" transform="rotate(135 12 12)"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    micOff: ic('<path d="M15 9.3V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 5 2.2M5 11a7 7 0 0 0 11.4 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M2 2l20 20"/>'),
    virar: ic('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><path d="M9 13a3 3 0 0 1 5-2.2M15 13a3 3 0 0 1-5 2.2"/><path d="M14 9v2h-2M10 17v-2h2"/>'),
    alerta: ic('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/>'),
    ok: ic('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
    sino: ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
    grupo: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>')
  };
  const ICE = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, { urls: "stun:stun.cloudflare.com:3478" }];
  const MAX = 6;
  const mmss = s => { s = Number(s); if (!isFinite(s)) s = 0; s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const CH = { id: null, d: null, local: null, pcs: new Map(), el: null, un: [], tipo: "video", mic: true, cam: true, frente: true, t0: 0, timer: null, feitos: new Set(), fila: Promise.resolve(), seq: 0, chat: null, aviso: null };

  /* ---------- botões no topo da conversa ---------- */
  X.chatBotoes = c => `<button class="cs-ico-bt" data-s="ch-menu" data-id="${esc(c.id)}" aria-label="Chamada de vídeo ou de voz">${I.video}</button>`;
  X.acoes["ch-menu"] = el => {
    const c = SO.chats.find(x => x.id === el.dataset.id); if (!c) return;
    const muitos = (c.membros || []).length > MAX;
    window.abrirSheet(`<div class="sheet-h"><h2>Chamada</h2></div><div class="cs-menu">
      ${muitos ? "" : `<button data-s="ch-iniciar" data-id="${esc(c.id)}" data-v="video">${I.video}<span><b>Chamada de vídeo</b><small>Toca no celular de ${c.tipo === "grupo" ? "quem está no grupo" : "quem você chamou"}</small></span></button>
      <button data-s="ch-iniciar" data-id="${esc(c.id)}" data-v="voz">${I.fone}<span><b>Chamada de voz</b><small>Gasta menos internet e bateria</small></span></button>
      ${c.tipo === "grupo" ? "" : `<button data-s="ch-iniciar" data-id="${esc(c.id)}" data-v="voz" data-u="1">${I.alerta}<span><b>Chamada urgente (voz)</b><small>Se a pessoa permitir, atende sozinha no alto-falante</small></span></button>`}`}
      ${c.tipo === "grupo" ? `<button data-s="ch-jitsi" data-id="${esc(c.id)}">${I.grupo}<span><b>Reunião grande (Jitsi Meet)</b><small>Para mais de ${MAX} pessoas. Abre no navegador; quem cria a sala pode precisar entrar com uma conta Google.</small></span></button>` : ""}
    </div><p class="small muted">No app Android, o celular toca mesmo com o ChatMil fechado (quando a pessoa ativou isso em Configurações).</p>`);
  };
  X.acoes["ch-iniciar"] = el => { window.fecharSheet(); iniciar(el.dataset.id, el.dataset.v, el.dataset.u === "1"); };
  X.acoes["ch-jitsi"] = async el => {
    window.fecharSheet();
    const sala = "ChatMil-" + String(el.dataset.id).replace(/[^A-Za-z0-9]/g, "").slice(0, 10) + "-" + Math.random().toString(36).slice(2, 8);
    const ok = await enviarMsg(el.dataset.id, { chamada: sala, prev: "Reunião (Jitsi Meet)" });
    if (ok !== false) abrirJitsi(sala);
  };
  function abrirJitsi(sala) {
    const nome = (SO.eu && SO.eu.nome) || "";
    const u = `https://meet.jit.si/${encodeURIComponent(sala)}#userInfo.displayName=${encodeURIComponent(JSON.stringify(nome))}&config.disableDeepLinking=true`;
    try { window.open(u, "_blank", "noopener"); } catch (e) { location.href = u; }
  }

  /* ---------- mensagem de convite na conversa ---------- */
  X.msgChamada = (m, o) => {
    const cls = `cs-m ${o.meu ? "eu" : ""} ${o.seq ? "seq" : ""}`;
    const voz = m.tipoCh === "voz", rtc = !!m.rtc;
    const tit = rtc ? (voz ? "Chamada de voz" : "Chamada de vídeo") : "Reunião no Jitsi Meet";
    return `<div class="${cls}" data-s="msg" data-id="${esc(m.id)}" role="button" tabindex="0"><div class="cs-b cs-cmsg">${o.nome}
      <div class="cs-cmsg-l"><span class="cs-cmsg-ic" style="--c:${voz ? "#0E7490" : "#7C3AED"}">${voz ? I.fone : rtc ? I.video : I.grupo}</span><span><b>${tit}</b><small>${o.meu ? "Você iniciou" : "Convite para entrar"}</small></span></div>
      <button class="btn sm primary" data-s="${rtc ? "ch-entrar" : "ch-jitsi-entrar"}" data-v="${esc(m.chamada)}">Entrar</button><span class="cs-h">${o.hr}</span></div></div>`;
  };
  X.acoes["ch-jitsi-entrar"] = el => abrirJitsi(el.dataset.v);
  X.acoes["ch-entrar"] = async el => {
    const cid = el.dataset.v; if (CH.id === cid) return mostrarUI();
    if (CH.id) return toast("Você já está em outra chamada.");
    try {
      const s = await fb.getDoc(D("chamadas", cid)); const d = s.exists() ? s.data() : null;
      if (!d || d.estado === "fim" || !(d.dentro || []).length) return toast("Esta chamada já terminou.");
      atender(cid, d);
    } catch (e) { toast(msgErro(e)); }
  };

  /* ---------- câmera e microfone ---------- */
  async function pegarMidia(tipo, frente) {
    const n = 2;
    const video = tipo === "video" ? { facingMode: frente === false ? "environment" : "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 24 } } : false;
    try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video }); }
    catch (e) {
      if (tipo === "video") { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); toast("Câmera indisponível: a chamada segue só com voz."); return s; } catch (e2) { } }
      toast("Permita o uso do microfone" + (tipo === "video" ? " e da câmera" : "") + " para fazer chamadas."); return null;
    }
  }

  /* ---------- iniciar, atender, sair ---------- */
  async function iniciar(chatId, tipo, urgente) {
    if (CH.id) return toast("Você já está em uma chamada.");
    const c = SO.chats.find(x => x.id === chatId); if (!c) return;
    const local = await pegarMidia(tipo, true); if (!local) return;
    try {
      const ref = fb.doc(C("chamadas"));
      const membros = c.membros || [];
      await fb.setDoc(ref, { chatId, de: eu(), membros, tipo, estado: "chamando", dentro: [eu()], tocando: membros.filter(m => m !== eu()), criadoEm: TS(), atualizadoEm: TS(), ...(urgente ? { urgente: true } : {}) });
      enviarMsg(chatId, { chamada: ref.id, rtc: true, tipoCh: tipo, prev: urgente ? "Chamada urgente" : tipo === "voz" ? "Chamada de voz" : "Chamada de vídeo" });
      entrar(ref.id, local, tipo, c);
      /* ninguém atendeu em 45 s: encerra */
      setTimeout(() => { if (CH.id === ref.id && CH.d && (CH.d.dentro || []).length <= 1) { toast("Ninguém atendeu."); sair(); } }, 45000);
    } catch (e) { console.warn(e); local.getTracks().forEach(t => t.stop()); toast(msgErro(e)); }
  }
  async function atender(cid, d, auto) {
    fecharEntrada();
    if ((d.dentro || []).length >= MAX) return toast(`A chamada está cheia (máximo de ${MAX} pessoas).`);
    const local = await pegarMidia(d.tipo, true); if (!local) return;
    try {
      await fb.updateDoc(D("chamadas", cid), { dentro: fb.arrayUnion(eu()), tocando: fb.arrayRemove(eu()), estado: "ativa", atualizadoEm: TS() });
      entrar(cid, local, d.tipo, SO.chats.find(x => x.id === d.chatId));
      if (auto) { if (NV) NV.altoFalante({ ligar: true }).catch(() => { }); toast("Chamada urgente atendida automaticamente."); }
    } catch (e) { console.warn(e); local.getTracks().forEach(t => t.stop()); toast(msgErro(e)); }
  }
  function entrar(cid, local, tipo, chat) {
    Object.assign(CH, { id: cid, local, tipo, chat, mic: true, cam: tipo === "video" && local.getVideoTracks().length > 0, frente: true, t0: 0, feitos: new Set(), fila: Promise.resolve(), d: null });
    montarUI();
    CH.un.push(fb.onSnapshot(D("chamadas", cid), s => {
      if (CH.id !== cid) return;
      const d = s.exists() ? s.data() : null;
      if (!d || d.estado === "fim") { if (CH.d && (CH.d.dentro || []).length > 1) toast("Chamada encerrada."); return sair(true); }
      CH.d = d;
      const dentro = d.dentro || [];
      if (dentro.length > 1 && !CH.t0) CH.t0 = Date.now();
      for (const uid of [...CH.pcs.keys()]) if (!dentro.includes(uid)) fecharPeer(uid);
      /* para cada par, quem tem o código menor faz a oferta: evita duas ofertas cruzadas */
      dentro.forEach(uid => { if (uid !== eu() && !CH.pcs.has(uid) && eu() < uid) chamarPeer(uid); });
      atualizarUI();
    }, e => console.warn(e)));
    CH.un.push(fb.onSnapshot(fb.query(C("chamadas", cid, "sinais"), fb.where("para", "==", eu())), s => {
      if (CH.id !== cid) return;
      s.docs.map(x => ({ ref: x.ref, id: x.id, ...x.data() })).filter(x => !CH.feitos.has(x.id)).sort((a, b) => (a.n || 0) - (b.n || 0)).forEach(sg => {
        CH.feitos.add(sg.id);
        CH.fila = CH.fila.then(() => tratarSinal(sg)).catch(e => console.warn(e));
        fb.deleteDoc(sg.ref).catch(() => { });
      });
    }, e => console.warn(e)));
    CH.timer = setInterval(atualizarTempo, 1000);
  }
  async function sair(remoto) {
    if (!CH.id) return;
    const cid = CH.id, d = CH.d;
    CH.un.forEach(f => { try { f(); } catch (e) { } }); CH.un = [];
    [...CH.pcs.keys()].forEach(fecharPeer);
    if (CH.local) CH.local.getTracks().forEach(t => t.stop());
    clearInterval(CH.timer); CH.timer = null;
    if (CH.el) CH.el.remove(); CH.el = null; document.body.classList.remove("cs-ch-on");
    Object.assign(CH, { id: null, d: null, local: null, chat: null });
    if (NV) NV.fimChamada().catch(() => { });
    if (remoto) return;
    try {
      const resto = ((d && d.dentro) || []).filter(x => x !== eu());
      const direta = d && (d.membros || []).length <= 2;
      const fim = resto.length === 0 || (direta && resto.length <= 1);
      await fb.updateDoc(D("chamadas", cid), { dentro: fb.arrayRemove(eu()), atualizadoEm: TS(), ...(fim ? { estado: "fim", tocando: [] } : {}) });
    } catch (e) { console.warn(e); }
  }
  X.acoes["ch-sair"] = () => sair();

  /* ---------- conexão com cada pessoa ---------- */
  function sinal(para, t, dados) {
    if (!CH.id) return;
    fb.addDoc(C("chamadas", CH.id, "sinais"), { de: eu(), para, t, d: JSON.stringify(dados), n: Date.now() * 1000 + (++CH.seq % 1000) }).catch(e => console.warn(e));
  }
  function novoPeer(uid) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const p = { pc, fila: [], stream: null, uid, inicio: Date.now() };
    CH.pcs.set(uid, p);
    CH.local.getTracks().forEach(t => pc.addTrack(t, CH.local));
    pc.onicecandidate = e => { if (e.candidate) sinal(uid, "ice", e.candidate.toJSON()); };
    pc.ontrack = e => { p.stream = e.streams[0] || new MediaStream([e.track]); atualizarUI(); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") { try { pc.restartIce(); } catch (e) { } avisoConexao(); }
      atualizarUI();
    };
    setTimeout(() => { if (CH.pcs.get(uid) === p && pc.connectionState !== "connected") avisoConexao(); }, 25000);
    return p;
  }
  async function chamarPeer(uid) {
    const p = novoPeer(uid);
    const of = await p.pc.createOffer();
    await p.pc.setLocalDescription(of);
    sinal(uid, "offer", { type: of.type, sdp: of.sdp });
  }
  async function esvaziar(p) { while (p.fila.length) { try { await p.pc.addIceCandidate(p.fila.shift()); } catch (e) { } } }
  async function tratarSinal(s) {
    if (!CH.id || !CH.local) return;
    const d = JSON.parse(s.d || "null"); let p = CH.pcs.get(s.de);
    if (s.t === "offer") {
      if (p) fecharPeer(s.de);
      p = novoPeer(s.de);
      await p.pc.setRemoteDescription(d);
      const an = await p.pc.createAnswer(); await p.pc.setLocalDescription(an);
      sinal(s.de, "answer", { type: an.type, sdp: an.sdp }); await esvaziar(p);
    } else if (s.t === "answer") {
      if (p && p.pc.signalingState === "have-local-offer") { await p.pc.setRemoteDescription(d); await esvaziar(p); }
    } else if (s.t === "ice" && p) {
      if (p.pc.remoteDescription) await p.pc.addIceCandidate(d).catch(() => { }); else p.fila.push(d);
    }
  }
  function fecharPeer(uid) {
    const p = CH.pcs.get(uid); if (!p) return;
    try { p.pc.close(); } catch (e) { }
    CH.pcs.delete(uid);
    const t = CH.el && CH.el.querySelector(`.cs-ch-tile[data-uid="${CSS.escape(uid)}"]`); if (t) t.remove();
  }
  function avisoConexao() {
    if (!CH.el || CH.aviso) return;
    CH.aviso = true;
    const box = CH.el.querySelector("#ch-aviso"); if (!box) return;
    box.innerHTML = `<span>A conexão está difícil. A internet de uma das pessoas pode estar bloqueando a chamada direta.</span>${CH.chat ? `<button class="btn sm" data-s="ch-plano-b">Usar o Jitsi Meet</button>` : ""}`;
    box.hidden = false;
  }
  X.acoes["ch-plano-b"] = async () => { const chat = CH.chat; await sair(); if (chat) X.acoes["ch-jitsi"]({ dataset: { id: chat.id } }); };

  /* ---------- tela da chamada ---------- */
  function nomeChamada() {
    const c = CH.chat; if (!c) return "Chamada";
    return A.tituloChat(c).nome;
  }
  function montarUI() {
    const el = document.createElement("div"); el.className = "cs-ch"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Chamada");
    el.innerHTML = `<div class="cs-ch-top"><b>${esc(nomeChamada())}</b><small id="ch-st">Chamando…</small></div>
      <div class="cs-ch-grade" id="ch-grade"></div>
      <video class="cs-ch-eu" id="ch-eu" muted playsinline autoplay ${CH.tipo === "voz" ? "hidden" : ""}></video>
      <div class="cs-ch-aviso" id="ch-aviso" hidden></div>
      <div class="cs-ch-ctl">
        <button class="cs-ch-bt" data-s="ch-mic" id="ch-mic" aria-label="Desligar microfone">${I.mic}</button>
        ${CH.tipo === "video" ? `<button class="cs-ch-bt" data-s="ch-cam" id="ch-cam" aria-label="Desligar câmera">${I.video}</button><button class="cs-ch-bt" data-s="ch-virar" aria-label="Trocar câmera">${I.virar}</button>` : ""}
        <button class="cs-ch-bt fim" data-s="ch-sair" aria-label="Encerrar chamada">${I.desligar}</button></div>`;
    document.body.appendChild(el); CH.el = el; CH.aviso = null; document.body.classList.add("cs-ch-on");
    const v = el.querySelector("#ch-eu"); v.srcObject = CH.local;
    atualizarUI();
  }
  function mostrarUI() { if (CH.el) CH.el.scrollIntoView(); }
  function atualizarTempo() {
    const st = CH.el && CH.el.querySelector("#ch-st"); if (!st) return;
    const n = ((CH.d && CH.d.dentro) || []).length;
    st.textContent = n <= 1 ? (CH.t0 ? "Aguardando…" : "Chamando…") : mmss((Date.now() - CH.t0) / 1000) + (n > 2 ? ` · ${n} pessoas` : "");
  }
  function atualizarUI() {
    if (!CH.el) return;
    const grade = CH.el.querySelector("#ch-grade"), outros = ((CH.d && CH.d.dentro) || []).filter(u => u !== eu());
    const esperando = CH.d ? (CH.d.membros || []).filter(u => u !== eu() && !outros.includes(u)) : [];
    grade.dataset.n = Math.max(1, outros.length);
    outros.forEach(uid => {
      let t = grade.querySelector(`.cs-ch-tile[data-uid="${CSS.escape(uid)}"]`);
      const p = CH.pcs.get(uid), pr = P(uid);
      if (!t) {
        t = document.createElement("div"); t.className = "cs-ch-tile"; t.dataset.uid = uid;
        t.innerHTML = `<div class="cs-ch-av">${av(pr, 96, uid)}</div><video playsinline autoplay></video><span class="cs-ch-nome">${esc(pr.nome || "")}</span><span class="cs-ch-con">Conectando…</span>`;
        grade.appendChild(t);
      }
      const v = t.querySelector("video");
      if (p && p.stream && v.srcObject !== p.stream) { v.srcObject = p.stream; v.play().catch(() => { }); }
      const temVideo = !!(p && p.stream && p.stream.getVideoTracks().some(x => x.readyState === "live" && !x.muted));
      t.classList.toggle("so-voz", CH.tipo === "voz" || !temVideo);
      const est = p ? p.pc.connectionState : "new";
      t.querySelector(".cs-ch-con").textContent = est === "connected" ? "" : est === "failed" ? "Sem conexão" : "Conectando…";
      t.querySelector(".cs-ch-nome").textContent = pr.nome || "";
    });
    grade.querySelectorAll(".cs-ch-tile").forEach(t => { if (!outros.includes(t.dataset.uid)) t.remove(); });
    let esp = grade.querySelector(".cs-ch-esp");
    if (!outros.length) {
      if (!esp) { esp = document.createElement("div"); esp.className = "cs-ch-esp"; grade.appendChild(esp); }
      esp.innerHTML = `${CH.chat ? (CH.chat.tipo === "grupo" ? A.avGrupo(CH.chat, 110) : A.tituloChat(CH.chat).av(110)) : ""}<b>${esc(nomeChamada())}</b><span>${esperando.length ? "Chamando…" : "Aguardando…"}</span>`;
    } else if (esp) esp.remove();
    atualizarTempo();
  }
  X.acoes["ch-mic"] = el => {
    CH.mic = !CH.mic; CH.local.getAudioTracks().forEach(t => t.enabled = CH.mic);
    el.innerHTML = CH.mic ? I.mic : I.micOff; el.classList.toggle("off", !CH.mic); el.setAttribute("aria-label", CH.mic ? "Desligar microfone" : "Ligar microfone");
  };
  X.acoes["ch-cam"] = el => {
    CH.cam = !CH.cam; CH.local.getVideoTracks().forEach(t => t.enabled = CH.cam);
    el.innerHTML = CH.cam ? I.video : I.videoOff; el.classList.toggle("off", !CH.cam); el.setAttribute("aria-label", CH.cam ? "Desligar câmera" : "Ligar câmera");
    const eu_ = CH.el && CH.el.querySelector("#ch-eu"); if (eu_) eu_.style.visibility = CH.cam ? "" : "hidden";
  };
  X.acoes["ch-virar"] = async () => {
    if (!CH.local || CH.tipo !== "video") return;
    try {
      const novo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CH.frente ? "environment" : "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 24 } } });
      const nt = novo.getVideoTracks()[0], velha = CH.local.getVideoTracks()[0];
      CH.pcs.forEach(p => { const s = p.pc.getSenders().find(x => x.track && x.track.kind === "video"); if (s) s.replaceTrack(nt); });
      if (velha) { CH.local.removeTrack(velha); velha.stop(); }
      CH.local.addTrack(nt); nt.enabled = CH.cam; CH.frente = !CH.frente;
      const v = CH.el.querySelector("#ch-eu"); v.srcObject = null; v.srcObject = CH.local;
      v.classList.toggle("traseira", !CH.frente);
    } catch (e) { toast("Não foi possível trocar a câmera."); }
  };

  /* ---------- chamada chegando ---------- */
  const RECUSADAS = new Set(); let unEntrada = null;
  const EN = { el: null, id: null, ctx: null, osc: null, timer: null };
  X.aoTrocarUsuario.push(u => {
    if (unEntrada) { unEntrada(); unEntrada = null; } fecharEntrada(); if (CH.id) sair(true);
    if (!u) return;
    unEntrada = fb.onSnapshot(fb.query(C("chamadas"), fb.where("tocando", "array-contains", u.uid)), s => {
      const agora = Date.now();
      const lista = s.docs.map(x => ({ id: x.id, ...x.data({ serverTimestamps: "estimate" }) }))
        .filter(c => c.estado !== "fim" && agora - A.ms(c.criadoEm) < 60000 && !RECUSADAS.has(c.id) && CH.id !== c.id && (c.dentro || []).length);
      if (lista.length && !CH.id) { if (EN.id !== lista[0].id) mostrarEntrada(lista[0]); }
      else if (EN.el && !lista.some(c => c.id === EN.id)) fecharEntrada();
    }, e => console.warn(e));
  });
  function mostrarEntrada(c) {
    fecharEntrada();
    const chat = SO.chats.find(x => x.id === c.chatId), quem = P(c.de);
    const titulo = chat && chat.tipo === "grupo" ? chat.nome : quem.nome;
    const el = document.createElement("div"); el.className = "cs-ch cs-ch-entra"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-label", "Chamada recebida");
    const auto = !!c.urgente && podeAtenderSozinho(c.de);
    el.innerHTML = `<div class="cs-ch-esp">${c.urgente ? `<i class="cs-ch-urg">URGENTE</i>` : ""}${av(quem, 120, c.de)}<b>${esc(titulo || "")}</b><span>${c.tipo === "voz" ? "Chamada de voz" : "Chamada de vídeo"}${chat && chat.tipo === "grupo" ? " · " + esc(quem.nome || "") : ""}</span>${auto ? `<span>Atendendo automaticamente…</span>` : ""}</div>
      <div class="cs-ch-ctl"><button class="cs-ch-bt fim" data-s="ch-recusar" aria-label="Recusar">${I.desligar}</button>
      <button class="cs-ch-bt ok" data-s="ch-atender" aria-label="Atender">${c.tipo === "voz" ? I.fone : I.video}</button></div>`;
    document.body.appendChild(el); Object.assign(EN, { el, id: c.id, d: c });
    tocar();
    EN.timer = setTimeout(fecharEntrada, 45000);
    if (auto) setTimeout(() => { if (EN.id === c.id && !CH.id) atender(c.id, c, true); }, 1500);
  }
  function tocar() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(); EN.ctx = ctx;
      const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.frequency.value = 440; o2.frequency.value = 554; o1.connect(g); o2.connect(g); o1.start(); o2.start();
      const t = ctx.currentTime; for (let i = 0; i < 22; i++) { const b = t + i * 2; g.gain.setValueAtTime(0, b); g.gain.linearRampToValueAtTime(0.12, b + 0.05); g.gain.setValueAtTime(0.12, b + 0.8); g.gain.linearRampToValueAtTime(0, b + 0.9); }
    } catch (e) { }
    try { navigator.vibrate && navigator.vibrate([600, 400, 600, 400, 600, 400, 600, 400, 600]); } catch (e) { }
  }
  function fecharEntrada() {
    if (EN.el) EN.el.remove(); clearTimeout(EN.timer);
    if (EN.ctx) { try { EN.ctx.close(); } catch (e) { } }
    try { navigator.vibrate && navigator.vibrate(0); } catch (e) { }
    Object.assign(EN, { el: null, id: null, ctx: null, timer: null, d: null });
  }
  X.acoes["ch-atender"] = () => { const d = EN.d, id = EN.id; if (!d) return; atender(id, d); };
  X.acoes["ch-recusar"] = async () => {
    const d = EN.d, id = EN.id; if (!id) return; RECUSADAS.add(id); fecharEntrada();
    try { await fb.updateDoc(D("chamadas", id), { tocando: fb.arrayRemove(eu()), atualizadoEm: TS(), ...((d.membros || []).length <= 2 ? { estado: "fim" } : {}) }); } catch (e) { }
  };

  /* ---------- Android: tocar com o app fechado, atender sozinho (urgente) ---------- */
  const NV = (() => { try { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.Nativo && c.Plugins.Nativo.chamadasEstado ? c.Plugins.Nativo : null; } catch (e) { return null; } })();
  const NE = { estado: null };
  const chaveAuto = () => "cs.auto." + eu();
  function cfgAuto() { try { return JSON.parse(localStorage.getItem(chaveAuto()) || "null") || { modo: "ninguem", uids: [] }; } catch (e) { return { modo: "ninguem", uids: [] }; } }
  function listaAuto(c) { c = c || cfgAuto(); return c.modo === "seguindo" ? [...(SO.seguindo || [])] : c.modo === "escolhidos" ? (c.uids || []) : []; }
  function podeAtenderSozinho(uid) { const c = cfgAuto(); return c.modo !== "ninguem" && listaAuto(c).includes(uid); }
  function salvarAuto(c) {
    try { localStorage.setItem(chaveAuto(), JSON.stringify(c)); } catch (e) { }
    if (NV) NV.autoAtender({ modo: c.modo, uids: listaAuto(c).slice(0, 500) }).catch(() => { });
  }
  async function lerEstado() { if (!NV) return null; try { NE.estado = await NV.chamadasEstado(); } catch (e) { NE.estado = null; } return NE.estado; }
  window.CS_CHAMADAS_LOGIN = (email, senha) => { if (NV) NV.chamadasEntrar({ email, senha }).then(lerEstado).catch(e => console.warn("chamadas", e)); };
  window.CS_CHAMADAS_SAIR = () => { if (NV) NV.chamadasSair().catch(() => { }); NE.estado = null; };
  async function abrirPendente(p) {
    if (!p || !p.cid) return;
    for (let k = 0; k < 100 && !(SO.user && SO.eu); k++) await new Promise(r => setTimeout(r, 150));
    if (!SO.user) return;
    try {
      const s = await fb.getDoc(D("chamadas", p.cid)); const d = s.exists() ? s.data() : null;
      if (!d || d.estado === "fim" || !(d.dentro || []).length) { toast("A chamada já terminou."); if (NV) NV.fimChamada().catch(() => { }); return; }
      if (CH.id === p.cid) return;
      if (p.acao === "atender" || (p.acao === "auto" && d.urgente && podeAtenderSozinho(d.de))) atender(p.cid, d, p.acao === "auto");
      else if (!CH.id) mostrarEntrada({ id: p.cid, ...d });
    } catch (e) { console.warn(e); }
  }
  if (NV) {
    try { NV.addListener("chamada", d => abrirPendente(d)); } catch (e) { }
    X.aoTrocarUsuario.push(u => {
      if (!u) return;
      NV.pendente().then(abrirPendente).catch(() => { });
      lerEstado().then(st => { if (st && st.ativo && st.uid === u.uid) NV.chamadasLigar().catch(() => { }); salvarAuto(cfgAuto()); if (SO.tab === "conversas") A.pintar(); });
    });
    /* quem segue muda: atualiza a lista de "atender sozinho" */
    let ultSeg = "";
    X.depois.push(() => { const k = [...(SO.seguindo || [])].sort().join(","); if (k !== ultSeg && SO.user) { ultSeg = k; if (cfgAuto().modo === "seguindo") salvarAuto(cfgAuto()); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && SO.user) lerEstado().then(() => { if (A.topo() && A.topo().v === "config") A.pintar(); }); });
  }
  const ativoNativo = () => !!(NE.estado && NE.estado.ativo && SO.user && NE.estado.uid === SO.user.uid);
  X.avisos.push(() => {
    if (!NV || !SO.user || !NE.estado || ativoNativo()) return "";
    try { if (localStorage.getItem("cs.avisoCh." + eu()) === "nao") return ""; } catch (e) { }
    return `<div class="aviso cs-aviso-mail">${I.sino}<span>Ative para o celular <b>tocar com o ChatMil fechado</b> quando alguém ligar.</span><button class="btn sm primary" data-s="chn-ativar">Ativar</button><button class="btn sm ghost" data-s="chn-aviso-nao" aria-label="Agora não">Agora não</button></div>`;
  });
  X.acoes["chn-aviso-nao"] = () => { try { localStorage.setItem("cs.avisoCh." + eu(), "nao"); } catch (e) { } A.pintar(); };
  X.acoes["chn-ativar"] = () => {
    window.abrirSheet(`<div class="sheet-h"><h2>Tocar com o app fechado</h2></div>
      <p class="cs-just">Para o celular tocar mesmo com o ChatMil fechado, confirme sua senha <b>uma única vez</b>. Ela não fica guardada: o Android só mantém a conexão de chamadas ativa.</p>
      <form class="stack" id="chn-f"><input class="in" id="chn-senha" type="password" autocomplete="current-password" placeholder="Sua senha do ChatMil" aria-label="Senha">
      <button class="btn primary cs-grande">Ativar</button></form>`);
    setTimeout(() => { const i = $("#chn-senha"); if (i) i.focus(); }, 100);
  };
  document.addEventListener("submit", async e => {
    if (e.target.id !== "chn-f") return; e.preventDefault();
    const senha = $("#chn-senha").value; if (!senha) return toast("Digite a senha.");
    const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "Ativando…";
    try {
      await NV.chamadasEntrar({ email: SO.user.email, senha }); await lerEstado();
      window.fecharSheet(); toast("Pronto! Agora falta liberar as permissões.");
      A.abrirTela({ v: "config" }); setTimeout(() => { const el = document.getElementById("cs-ch-cfg"); if (el) el.scrollIntoView({ block: "start" }); }, 250);
    } catch (er) { b.disabled = false; b.textContent = "Ativar"; toast(/password|senha|credential|INVALID/i.test(String(er && er.message)) ? "Senha incorreta." : "Não foi possível ativar agora. Verifique a internet."); }
  });
  X.acoes["chn-perm"] = el => { if (NV) NV.permissao({ tipo: el.dataset.v }).catch(() => { }); };
  X.acoes["chn-desligar"] = async () => { if (NV) { await NV.chamadasSair().catch(() => { }); await lerEstado(); A.pintar(); toast("O celular só vai tocar com o app aberto."); } };
  X.acoes["chn-auto"] = el => {
    const c = cfgAuto(); c.modo = el.dataset.v;
    if (c.modo === "escolhidos") {
      const pessoas = A.contatosOrdenados ? A.contatosOrdenados() : [];
      window.abrirSheet(`<div class="sheet-h"><h2>Atender sozinho (urgente)</h2></div><p class="small muted">Marque quem pode fazer sua chamada urgente abrir o áudio sozinha.</p>
        <div class="cs-mp-ll">${pessoas.map(u => { const p = P(u); return `<label class="cs-aceite"><input type="checkbox" class="chn-pp" value="${esc(u)}" ${(c.uids || []).includes(u) ? "checked" : ""}>${av(p, 32, u)}<span>${esc(p.nome)}</span></label>`; }).join("") || `<p class="small muted">Converse com colegas para escolher aqui.</p>`}</div>
        <button class="btn primary" data-s="chn-auto-ok">Salvar</button>`);
      return;
    }
    salvarAuto(c); A.pintar();
  };
  X.acoes["chn-auto-ok"] = () => { const c = cfgAuto(); c.modo = "escolhidos"; c.uids = [...document.querySelectorAll(".chn-pp:checked")].map(x => x.value).slice(0, 300); salvarAuto(c); window.fecharSheet(); A.pintar(); toast(c.uids.length ? `${c.uids.length} pessoa${c.uids.length === 1 ? "" : "s"} podem.` : "Ninguém marcado."); };
  X.configExtra.push(() => {
    const c = cfgAuto(), st = NE.estado, ok = ativoNativo();
    const perm = (v, nome, sub, feito) => `<button data-s="chn-perm" data-v="${v}"><span class="cs-lic ${feito ? "cs-ok" : "cs-pend"}">${feito ? I.ok : I.alerta}</span><span><b>${nome}</b><small>${feito ? "Liberado" : sub}</small></span></button>`;
    return `<h2 class="cs-sec" id="cs-ch-cfg">Chamadas</h2><div class="cs-menu card flat">
      ${NV ? (ok ? `<div class="cs-linha"><span class="cs-lic">${I.ok}</span><span><b>Tocar com app fechado</b><small>Ativo neste celular</small></span></div>
          ${perm("notificacoes", "Notificações", "Toque para permitir: sem isso, não toca", st.notificacoes)}
          ${perm("telaCheia", "Tela cheia", "Toque para permitir aparecer na tela bloqueada", st.telaCheia)}
          ${perm("bateria", "Bateria livre", "Toque e escolha “Permitir”: o Android não desliga o ChatMil", st.bateria)}
          ${perm("sobrepor", "Sobre outros apps", "Necessário para atender sozinho com a tela ligada", st.sobrepor)}
          <button data-s="chn-desligar"><span class="cs-lic">${I.desligar}</span><span><b>Desativar</b><small>O celular só toca com o app aberto</small></span></button>`
        : `<button data-s="chn-ativar"><span class="cs-lic">${I.sino}</span><span><b>Tocar com app fechado</b><small>Toque para ativar (pede a senha uma vez)</small></span></button>`)
        : `<div class="cs-linha"><span class="cs-lic">${I.sino}</span><span><b>Tocar com o app fechado</b><small>Disponível no aplicativo Android</small></span></div>`}
      <div class="cs-linha"><span class="cs-lic">${I.alerta}</span><span><b>Urgente: atender sozinho</b><small>Abre o áudio no alto-falante, sem tocar no celular</small></span></div>
      <div class="seg cs-ch-seg">${[["ninguem", "Ninguém"], ["seguindo", "Quem eu sigo"], ["escolhidos", "Escolher"]].map(([k, n]) => `<button data-s="chn-auto" data-v="${k}" aria-pressed="${c.modo === k}">${n}${k === "escolhidos" && c.modo === k ? ` (${(c.uids || []).length})` : ""}</button>`).join("")}</div>
    </div>`;
  });

  /* ---------- voltar (Android) ---------- */
  const voltarAnt = window.SENOV_voltar;
  window.SENOV_voltar = function () {
    if (EN.el) { X.acoes["ch-recusar"](); return true; }
    if (CH.el) { toast("Para sair, toque no botão vermelho."); return true; }
    return voltarAnt ? voltarAnt() : false;
  };
  window.addEventListener("pagehide", () => { if (CH.id) sair(); });

  const css = document.createElement("style");
  css.textContent = `
body.cs-ch-on{overflow:hidden}
.cs-ch{position:fixed;inset:0;z-index:105;background:radial-gradient(circle at 50% 20%,#1d2a52,#070a14 70%);color:#fff;display:flex;flex-direction:column}
.cs-ch-top{text-align:center;padding:calc(14px + env(safe-area-inset-top,0px)) 16px 6px;display:flex;flex-direction:column;gap:2px}
.cs-ch-top b{font-size:1.15rem}.cs-ch-top small{opacity:.8;font-variant-numeric:tabular-nums}
.cs-ch-grade{flex:1;min-height:0;display:grid;gap:6px;padding:6px;grid-template-columns:1fr}
.cs-ch-grade[data-n="2"]{grid-template-rows:1fr 1fr}
.cs-ch-grade[data-n="3"],.cs-ch-grade[data-n="4"]{grid-template-columns:1fr 1fr}
.cs-ch-grade[data-n="5"],.cs-ch-grade[data-n="6"]{grid-template-columns:1fr 1fr;grid-auto-rows:1fr}
.cs-ch-tile{position:relative;border-radius:18px;overflow:hidden;background:#111a30;min-height:0}
.cs-ch-tile video{width:100%;height:100%;object-fit:cover;display:block}
.cs-ch-tile.so-voz video{position:absolute;width:1px;height:1px;opacity:0}
.cs-ch-av{position:absolute;inset:0;display:none;place-items:center}
.cs-ch-tile.so-voz .cs-ch-av{display:grid}
.cs-ch-nome{position:absolute;left:10px;bottom:10px;background:rgba(0,0,0,.45);padding:3px 10px;border-radius:99px;font-weight:700;font-size:.9rem}
.cs-ch-con{position:absolute;right:10px;top:10px;font-size:.8rem;opacity:.85}
.cs-ch-con:empty{display:none}
.cs-ch-esp{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px}
.cs-ch-esp b{font-size:1.4rem}.cs-ch-esp span{opacity:.8}
.cs-ch-grade .cs-ch-esp{grid-column:1/-1}
.cs-ch-eu{position:absolute;right:12px;top:calc(70px + env(safe-area-inset-top,0px));width:96px;height:132px;object-fit:cover;border-radius:14px;border:2px solid rgba(255,255,255,.6);background:#000;transform:scaleX(-1);z-index:2}
.cs-ch-eu.traseira{transform:none}
.cs-ch-aviso{margin:0 12px 6px;background:rgba(255,255,255,.12);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:.9rem}
.cs-ch-aviso .btn{align-self:flex-start}
.cs-ch-ctl{display:flex;justify-content:center;gap:18px;padding:14px 12px calc(22px + env(safe-area-inset-bottom,0px))}
.cs-ch-bt{width:62px;height:62px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;cursor:pointer}
.cs-ch-bt svg{width:28px;height:28px}
.cs-ch-bt.off{background:#fff;color:#111}
.cs-ch-bt.fim{background:#E5484D}
.cs-ch-bt.ok{background:#22A06B;animation:csToque 1.2s infinite}
.cs-ch-entra .cs-ch-ctl{gap:70px;padding-bottom:calc(50px + env(safe-area-inset-bottom,0px))}
.cs-ch-entra .cs-ch-bt{width:72px;height:72px}
@keyframes csToque{50%{transform:scale(1.08)}}
.cs-ch-urg{font-style:normal;background:#E5484D;color:#fff;font-weight:800;letter-spacing:.08em;padding:4px 14px;border-radius:999px;font-size:.8rem}
.cs-ch-seg{margin:4px 10px 10px}
.cs-lic.cs-ok{background:#DCFCE7;color:#15803D}.cs-lic.cs-pend{background:#FEF3C7;color:#B45309}
`;
  document.head.appendChild(css);
})();
