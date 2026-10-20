/* ChatMil — criptografia de ponta a ponta das conversas (individuais e grupos).
   - Cada aparelho tem um par de chaves ECDH P-256; a chave secreta fica só no aparelho (IndexedDB, não exportável).
   - Cada mensagem é cifrada com uma chave nova (AES-256-GCM); essa chave vai "embrulhada" para cada participante
     com uma chave de par (ECDH + HKDF-SHA-256 → AES-256-GCM). O servidor só guarda texto embaralhado.
   - Arquivos, fotos, áudios e visualização única são cifrados antes de subir (AES-256-GCM, chave própria por arquivo).
   - Recuperação: a chave secreta é guardada no servidor trancada por um PIN (PBKDF2-SHA-256, 600 mil rodadas).
   Depende de social.js (window.SOCIAL). */
(function () {
  "use strict";
  if (!window.crypto || !crypto.subtle) return;
  const S = crypto.subtle, te = new TextEncoder(), td = new TextDecoder();
  const ITER = 600000, SAL_PAR = te.encode("chatmil-e2e-v1");

  /* ---------- base64 ---------- */
  function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64url = u8 => b64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const ub64url = s => ub64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const juntar = (a, b) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };
  const aleatorio = n => crypto.getRandomValues(new Uint8Array(n));
  async function impressao(raw) { const h = new Uint8Array(await S.digest("SHA-256", raw)); return [...h.slice(0, 10)].map(x => x.toString(16).padStart(2, "0")).join(""); }

  /* ---------- IndexedDB (chave secreta não exportável) ---------- */
  let dbP = null;
  function idb() {
    if (dbP) return dbP;
    dbP = new Promise((ok, no) => { const r = indexedDB.open("chatmil-e2e", 1); r.onupgradeneeded = () => r.result.createObjectStore("chaves"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    return dbP;
  }
  async function idbOp(modo, fn) { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction("chaves", modo), st = t.objectStore("chaves"), r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); }
  const idbGet = k => idbOp("readonly", st => st.get(k));
  const idbSet = (k, v) => idbOp("readwrite", st => st.put(v, k));

  /* ---------- primitivas ---------- */
  const ALG = { name: "ECDH", namedCurve: "P-256" };
  async function cifrar(chave, dados) { const iv = aleatorio(12); return juntar(iv, new Uint8Array(await S.encrypt({ name: "AES-GCM", iv }, chave, dados))); }
  async function decifrar(chave, dados) { return new Uint8Array(await S.decrypt({ name: "AES-GCM", iv: dados.subarray(0, 12) }, chave, dados.subarray(12))); }
  const aes = (raw, usos) => S.importKey("raw", raw, { name: "AES-GCM" }, false, usos || ["encrypt", "decrypt"]);
  function rawDeJwk(jwk) { return juntar(new Uint8Array([4]), juntar(ub64url(jwk.x), ub64url(jwk.y))); }
  async function chavePin(pin, sal, it) {
    const k = await S.importKey("raw", te.encode(pin), "PBKDF2", false, ["deriveKey"]);
    return S.deriveKey({ name: "PBKDF2", salt: sal, iterations: it, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  /* ---------- estado ---------- */
  const E = { uid: null, priv: null, raw: null, fp: null, estado: "off", jwk: null, pares: new Map(), pubs: new Map(), arqs: new Map(), dec: new Map(), prev: new Map(), fila: new Set() };
  let A = null, fb = null, D = null;
  const pronto = () => !!(E.priv && E.raw);
  function pintar() { try { A && A.pintar(); } catch (e) { } }
  function reabrir() { try { if (A && A.reabrirMsgs && E.priv) A.reabrirMsgs(); else pintar(); } catch (e) { pintar(); } }

  async function chavePar(rawOutro) {
    const k = b64(rawOutro);
    if (E.pares.has(k)) return E.pares.get(k);
    const p = (async () => {
      const pub = await S.importKey("raw", rawOutro, ALG, false, []);
      const bits = await S.deriveBits({ name: "ECDH", public: pub }, E.priv, 256);
      const hk = await S.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
      return S.deriveKey({ name: "HKDF", hash: "SHA-256", salt: SAL_PAR, info: te.encode("par") }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    })();
    E.pares.set(k, p); p.catch(() => E.pares.delete(k));
    return p;
  }

  /* chave pública de cada pessoa (users/{uid}.e2e), guardada por 10 min */
  async function pubDe(uid, fresca) {
    const c = E.pubs.get(uid);
    if (c && !fresca && Date.now() - c.em < 120000) return c.v;
    let v = null;
    try { const s = await fb.getDoc(D("users", uid)); const e = s.exists() && s.data().e2e; if (e && e.pk) v = { raw: ub64(e.pk), fp: e.fp }; } catch (e) { }
    E.pubs.set(uid, { v, em: Date.now() });
    return v;
  }

  /* ---------- início: carrega, restaura ou cria as chaves ---------- */
  async function iniciar() {
    const u = A.SO.user; if (!u) return;
    if (E.uid === u.uid && E.estado !== "off") return;
    Object.assign(E, { uid: u.uid, priv: null, raw: null, fp: null, jwk: null, estado: "carregando" });
    E.pares.clear(); E.dec.clear(); E.prev.clear();
    try {
      const local = await idbGet(u.uid);
      const pub = (A.SO.eu && A.SO.eu.e2e) || null;
      const bk = await fb.getDoc(D("users", u.uid, "privado", "e2e")).then(s => s.exists() ? s.data() : null).catch(() => null);
      if (local && local.priv && (!pub || pub.fp === local.fp)) {
        Object.assign(E, { priv: local.priv, raw: local.raw, fp: local.fp, jwk: local.jwkPendente || null });
        if (!pub) await publicar();
        E.estado = bk && bk.fp === E.fp ? "pronto" : "semPin";
      } else if (bk && pub && bk.fp === pub.fp) {
        E.estado = "precisaPin";
      } else {
        await novasChaves();
      }
    } catch (e) { console.warn("e2e", e); E.estado = "erro"; }
    reabrir();
  }
  async function novasChaves() {
    const kp = await S.generateKey(ALG, true, ["deriveBits"]);
    const jwk = await S.exportKey("jwk", kp.privateKey);
    const raw = new Uint8Array(await S.exportKey("raw", kp.publicKey));
    const priv = await S.importKey("jwk", jwk, ALG, false, ["deriveBits"]);
    const fp = await impressao(raw);
    Object.assign(E, { priv, raw, fp, jwk, estado: "semPin" });
    E.pares.clear();
    /* até criar o PIN, a cópia exportável fica só neste aparelho para poder ser guardada depois */
    await idbSet(E.uid, { priv, raw, fp, jwkPendente: jwk });
    await publicar();
  }
  async function publicar() {
    await fb.updateDoc(D("users", E.uid), { e2e: { pk: b64(E.raw), fp: E.fp, v: 1 } });
    if (A.SO.eu) A.SO.eu.e2e = { pk: b64(E.raw), fp: E.fp, v: 1 };
  }
  async function criarPin(pin) {
    if (!E.jwk) throw { msg: "Para trocar o PIN, use “Trocar PIN”." };
    const sal = aleatorio(16), k = await chavePin(pin, sal, ITER);
    const c = await cifrar(k, te.encode(JSON.stringify(E.jwk)));
    await fb.setDoc(D("users", E.uid, "privado", "e2e"), { v: 1, sal: b64(sal), it: ITER, c: b64(c), fp: E.fp, em: A.TS() });
    E.jwk = null; await idbSet(E.uid, { priv: E.priv, raw: E.raw, fp: E.fp });
    E.estado = "pronto"; pintar();
  }
  async function abrirBackup(pin) {
    const s = await fb.getDoc(D("users", E.uid, "privado", "e2e")); if (!s.exists()) throw { msg: "Não há cópia guardada." };
    const bk = s.data();
    let jwk;
    try { jwk = JSON.parse(td.decode(await decifrar(await chavePin(pin, ub64(bk.sal), bk.it || ITER), ub64(bk.c)))); }
    catch (e) { throw { msg: "PIN incorreto." }; }
    return jwk;
  }
  async function restaurar(pin) {
    const jwk = await abrirBackup(pin);
    const priv = await S.importKey("jwk", jwk, ALG, false, ["deriveBits"]), raw = rawDeJwk(jwk), fp = await impressao(raw);
    Object.assign(E, { priv, raw, fp, jwk: null, estado: "pronto" }); E.pares.clear(); E.dec.clear(); E.prev.clear();
    await idbSet(E.uid, { priv, raw, fp });
    const pub = A.SO.eu && A.SO.eu.e2e; if (!pub || pub.fp !== fp) await publicar();
    reabrir();
  }
  async function trocarPin(antigo, novo) {
    E.jwk = await abrirBackup(antigo);
    await criarPin(novo);
  }
  async function esqueciPin() { E.dec.clear(); E.prev.clear(); await novasChaves(); reabrir(); }

  /* ---------- mensagens ---------- */
  /* registra as chaves dos arquivos que estão dentro de uma mensagem (já aberta) */
  function registrarArqs(p) { ["arquivo", "audio", "unica"].forEach(k => { const a = p && p[k]; if (a && a.id && a.fk) E.arqs.set(a.id, a.fk); }); }
  /* coloca a chave do arquivo recém-enviado dentro da mensagem */
  function anexarChaves(p) { ["arquivo", "audio", "unica"].forEach(k => { const a = p && p[k]; if (a && a.id && E.arqs.has(a.id)) a.fk = E.arqs.get(a.id); }); }
  /* tranca a mensagem para todos os participantes; null = alguém ainda não tem chave (vai sem criptografia) */
  async function selar(chat, payload, previa) {
    if (!pronto()) return null;
    const membros = [...new Set(chat.membros || [])];
    const pubs = await Promise.all(membros.map(u => u === E.uid ? { raw: E.raw, fp: E.fp } : pubDe(u)));
    const faltam = membros.filter((u, i) => !pubs[i]);
    if (faltam.length) { E.faltam = { chat: chat.id, uids: faltam }; return null; }
    const ck = aleatorio(32), kk = await aes(ck);
    const k = {};
    await Promise.all(membros.map(async (u, i) => { k[u] = b64(await cifrar(await chavePar(pubs[i].raw), ck)); }));
    const spk = b64(E.raw);
    const c = b64(await cifrar(kk, te.encode(JSON.stringify(payload))));
    const pv = b64(await cifrar(kk, te.encode(JSON.stringify(previa || {}))));
    return { msg: { e2e: 1, spk, k, c }, ultima: { e2e: 1, spk, k, c: pv } };
  }
  async function abrirObj(o) {
    if (!pronto()) throw { code: "sem-chave" };
    const w = o.k && o.k[E.uid]; if (!w) throw { code: "nao-e-para-mim" };
    const ck = await decifrar(await chavePar(ub64(o.spk)), ub64(w));
    return JSON.parse(td.decode(await decifrar(await aes(ck), ub64(o.c))));
  }
  /* devolve a lista com as mensagens já abertas; abre as novas em segundo plano e avisa quando terminar */
  function abrirLista(lista, aoTerminar) {
    const pend = [];
    const r = lista.map(m => {
      if (!m.e2e) return m;
      const d = E.dec.get(m.id);
      if (d) return d.ok ? { ...m, ...d.p, e2e: 1, c: undefined, k: undefined } : { ...m, cifrada: d.erro };
      pend.push(m);
      return { ...m, cifrada: pronto() ? "abrindo" : E.estado === "precisaPin" ? "pin" : "abrindo" };
    });
    if (pend.length && pronto()) {
      Promise.all(pend.map(async m => {
        try { const p = await abrirObj(m); registrarArqs(p); E.dec.set(m.id, { ok: true, p }); }
        catch (e) { E.dec.set(m.id, { ok: false, erro: "falhou" }); }
      })).then(() => aoTerminar && aoTerminar());
    }
    return r;
  }
  function previa(c) {
    const u = c.ultima; if (!u || !u.e2e) return null;
    const ch = c.id + ":" + u.c.slice(0, 24);
    const d = E.prev.get(ch); if (d) return d;
    if (pronto() && !E.fila.has(ch)) {
      E.fila.add(ch);
      abrirObj(u).then(p => { E.prev.set(ch, p); pintar(); }, () => E.prev.set(ch, { texto: "🔒 Mensagem protegida" })).finally(() => E.fila.delete(ch));
    }
    return { texto: "🔒 Mensagem protegida" };
  }

  /* ---------- arquivos ---------- */
  async function cifrarArquivo(blob) {
    const fk = aleatorio(32);
    const dados = await cifrar(await aes(fk), new Uint8Array(await blob.arrayBuffer()));
    return { blob: new Blob([dados]), fk: b64(fk) };
  }
  async function decifrarArquivo(id, blob, tipo) {
    const fk = E.arqs.get(id); if (!fk) return blob;
    const dados = await decifrar(await aes(ub64(fk)), new Uint8Array(await blob.arrayBuffer()));
    return new Blob([dados], { type: tipo || "application/octet-stream" });
  }

  /* código de segurança para conferir com a outra pessoa (igual dos dois lados) */
  async function codigoSeguranca(uid) {
    const o = await pubDe(uid, true); if (!o || !pronto()) return null;
    const a = [b64(E.raw), b64(o.raw)].sort().join("|");
    const h = new Uint8Array(await S.digest("SHA-256", te.encode(a)));
    let s = ""; for (let i = 0; i < 30; i += 2) s += String(((h[i] << 8) | h[i + 1]) % 100000).padStart(5, "0");
    return s.match(/.{5}/g).join(" ");
  }

  window.CS_E2E = {
    pronto, estado: () => E.estado, impressao: () => E.fp, faltam: () => E.faltam || null,
    selar, abrirLista, previa, anexarChaves, registrarArqs, cifrarArquivo, decifrarArquivo, temChaveArq: id => E.arqs.has(id), guardarChaveArq: (id, fk) => E.arqs.set(id, fk),
    criarPin, restaurar, trocarPin, esqueciPin, codigoSeguranca, pubDe
  };

  /* ---------- telas: PIN e informações ---------- */
  function ligar() {
    if (!window.SOCIAL || !window.SOCIAL.ext) return setTimeout(ligar, 50);
    const X = window.SOCIAL.ext; A = window.SOCIAL._; fb = A.fb; D = A.D;
    const { esc, toast, K, ic } = A, $ = s => document.querySelector(s);
    const cad = ic('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>');
    X.aoTrocarUsuario.push(u => { if (dbP) { dbP.then(d => d.close(), () => { }); dbP = null; } Object.assign(E, { uid: null, priv: null, raw: null, fp: null, jwk: null, estado: "off" }); E.pares.clear(); E.dec.clear(); E.prev.clear(); E.pubs.clear(); E.arqs.clear(); });
    X.depois.push(() => { if (A.SO.user && A.SO.eu && E.estado === "off") iniciar(); });
    X.avisos.push(() => {
      if (E.estado === "precisaPin") return `<div class="aviso cs-e2e-av">${cad}<span>Digite seu PIN para abrir as mensagens protegidas.</span><button class="btn sm primary" data-s="e2e-pin">PIN</button></div>`;
      if (E.estado === "semPin") return `<div class="aviso cs-e2e-av">${cad}<span>Crie um PIN para não perder as conversas ao trocar de celular.</span><button class="btn sm primary" data-s="e2e-pin">Criar</button></div>`;
      return "";
    });
    const campoPin = (id, ph) => `<input class="in cs-pin" id="${id}" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="${ph}" aria-label="${ph}">`;
    function sheetPin() {
      if (E.estado === "precisaPin") {
        window.abrirSheet(`<div class="sheet-h"><h2>${cad} Seu PIN</h2></div><form class="stack" id="e2e-f-abrir">${campoPin("e2e-p1", "PIN")}
          <button class="btn primary cs-grande">Abrir conversas</button></form>
          <button class="cs-link" data-s="e2e-esqueci">Esqueci o PIN</button>`);
      } else if (E.estado === "semPin") {
        window.abrirSheet(`<div class="sheet-h"><h2>${cad} Criar PIN</h2></div><p class="small muted">Com ele você recupera as conversas em outro celular. Ninguém mais consegue abrir.</p>
          <form class="stack" id="e2e-f-criar">${campoPin("e2e-p1", "PIN (6 a 12 números)")}${campoPin("e2e-p2", "Repita o PIN")}
          <button class="btn primary cs-grande">Criar PIN</button></form>`);
      } else sheetInfo();
    }
    function sheetInfo() {
      window.abrirSheet(`<div class="sheet-h"><h2>${cad} Criptografia</h2></div>
        <p class="small">Suas conversas, fotos, áudios e arquivos são trancados no seu celular antes de sair. Só quem participa da conversa consegue abrir — nem o ChatMil lê.</p>
        <div class="cs-menu card flat"><button data-s="e2e-trocar">${K.chave || cad}<span><b>Trocar PIN</b></span></button></div>
        <p class="small muted">Sua chave: ${esc((E.fp || "").replace(/(.{4})/g, "$1 ").trim())}</p>`);
    }
    function sheetTrocar() {
      window.abrirSheet(`<div class="sheet-h"><h2>Trocar PIN</h2></div><form class="stack" id="e2e-f-trocar">${campoPin("e2e-p0", "PIN atual")}${campoPin("e2e-p1", "Novo PIN")}${campoPin("e2e-p2", "Repita o novo PIN")}
        <button class="btn primary cs-grande">Trocar</button></form>`);
    }
    const valido = p => /^\d{6,12}$/.test(p) && !/^(\d)\1+$/.test(p) && !"0123456789012".includes(p) && !"9876543210987".includes(p);
    document.addEventListener("submit", async e => {
      const f = e.target; if (!/^e2e-f-/.test(f.id || "")) return; e.preventDefault();
      const bt = f.querySelector("button"), v = id => ($("#" + id) || {}).value || "";
      bt.disabled = true; const t0 = bt.textContent; bt.textContent = "Aguarde…";
      try {
        if (f.id === "e2e-f-abrir") { await restaurar(v("e2e-p1")); window.fecharSheet(); toast("Conversas protegidas abertas."); }
        if (f.id === "e2e-f-criar") {
          if (!valido(v("e2e-p1"))) throw { msg: "Use de 6 a 12 números, sem sequência (123456) nem repetição (111111)." };
          if (v("e2e-p1") !== v("e2e-p2")) throw { msg: "Os PINs não são iguais." };
          await criarPin(v("e2e-p1")); window.fecharSheet(); toast("PIN criado. Guarde-o com cuidado.");
        }
        if (f.id === "e2e-f-trocar") {
          if (!valido(v("e2e-p1"))) throw { msg: "Use de 6 a 12 números, sem sequência nem repetição." };
          if (v("e2e-p1") !== v("e2e-p2")) throw { msg: "Os PINs novos não são iguais." };
          await trocarPin(v("e2e-p0"), v("e2e-p1")); window.fecharSheet(); toast("PIN trocado.");
        }
        A.pintar();
      } catch (er) { toast(er && er.msg ? er.msg : A.msgErro(er)); bt.disabled = false; bt.textContent = t0; }
    });
    Object.assign(X.acoes, {
      "e2e-pin": () => sheetPin(),
      "e2e-info": () => sheetInfo(),
      "e2e-trocar": () => sheetTrocar(),
      "e2e-esqueci": () => window.abrirSheet(`<div class="sheet-h"><h2>Esqueceu o PIN?</h2></div>
        <p class="small">Vamos criar chaves novas. As mensagens protegidas antigas <b>não poderão mais ser abertas</b> neste celular.</p>
        <button class="btn perigo cs-grande" data-s="e2e-esqueci-ok">Criar chaves novas</button><button class="btn ghost" data-s="fechar">Cancelar</button>`),
      "e2e-esqueci-ok": async () => { window.fecharSheet(); try { await esqueciPin(); sheetPin(); } catch (e) { toast(A.msgErro(e)); } },
      "e2e-codigo": async el => {
        const uid = el.dataset.id, cod = await codigoSeguranca(uid).catch(() => null), p = A.P(uid);
        window.abrirSheet(`<div class="sheet-h"><h2>${cad} Código de segurança</h2></div>
          ${cod ? `<p class="small">Compare com o celular de ${esc(p.nome)}. Se os números forem iguais, a conversa está protegida de ponta a ponta.</p><p class="cs-e2e-cod">${esc(cod)}</p>`
            : `<p class="small">${esc(p.nome)} ainda não ativou a criptografia (precisa atualizar o app).</p>`}`);
      }
    });
    X.configPriv.push(() => `<button class="cs-linha" data-s="e2e-pin" style="display:flex;align-items:center;gap:12px;width:100%"><span class="cs-lic">${cad}</span><span style="flex:1;text-align:left"><b>Criptografia e PIN</b></span><span class="pill ${E.estado === "pronto" ? "d1" : ""}">${E.estado === "pronto" ? "Ativa" : E.estado === "semPin" ? "Criar PIN" : E.estado === "precisaPin" ? "Digite o PIN" : "…"}</span></button>`);
    const css = document.createElement("style");
    css.textContent = `.cs-e2e-av{display:flex;align-items:center;gap:10px}.cs-e2e-av svg{width:20px;height:20px;flex:none;color:var(--primary)}.cs-e2e-av span{flex:1}
.cs-pin{font-size:1.4rem;letter-spacing:.35em;text-align:center}
.cs-e2e-cod{font-family:ui-monospace,monospace;font-size:1.25rem;letter-spacing:.06em;text-align:center;line-height:1.8;background:var(--surface-2);border-radius:14px;padding:12px;word-spacing:.4em}
.cs-b.cs-trancada .cs-tx{font-style:italic;opacity:.75}
.cs-e2e-chat{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px auto 2px;max-width:320px;font-size:.74rem;color:var(--muted);text-align:center;background:var(--surface-2);border-radius:10px;padding:6px 10px}
.cs-e2e-chat svg{width:13px;height:13px;flex:none}
.cs-e2e-chat{border:0;cursor:pointer;font:inherit;font-size:.74rem}
.sheet-h h2 svg{width:22px;height:22px;vertical-align:-3px;margin-right:4px;color:var(--primary)}`;
    document.head.appendChild(css);
  }
  ligar();
})();
