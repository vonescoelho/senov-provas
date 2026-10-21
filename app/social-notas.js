/* ChatMil — Anotações: um lugar só seu (como mandar mensagem para si mesmo), fixo nas Conversas,
   logo abaixo do Assistente de provas. Guarda textos, links, fotos e arquivos, com prioridade
   (Alta, Média, Baixa) e categoria (Trabalho, Casa, Pessoal, Amigos). Só o dono lê (users/{uid}/notas). */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, K, ic, esc, eu, pintar, abrirTela, topo, toast, msgErro } = A;
  const $ = s => document.querySelector(s);
  const CATS = [["trabalho", "Trabalho", "#2563EB"], ["casa", "Casa", "#16A34A"], ["pessoal", "Pessoal", "#9333EA"], ["amigos", "Amigos", "#EA580C"]];
  const PRIS = [[1, "Alta", "#DC2626"], [2, "Média", "#D97706"], [3, "Baixa", "#64748B"]];
  const cat = k => CATS.find(c => c[0] === k) || CATS[2];
  const pri = n => PRIS.find(p => p[0] === n) || PRIS[1];
  const I = {
    nota: ic('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
    flag: ic('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    pin: ic('<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/>'),
    clip: ic('<path d="m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
    foto: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    check: ic('<path d="M20 6 9 17l-5-5"/>'),
    env: ic('<path d="M4 12 20 4l-6 16-3-7z"/>'),
    busca: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    lixo: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    copiar: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>')
  };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const NT = { lista: null, un: null, filtro: "todas", busca: "", buscando: false, cat: "trabalho", pri: 2, anexo: null, enviando: false, prog: 0 };
  const URL_RE = /\bhttps?:\/\/[^\s<>"']+/i;

  X.aoTrocarUsuario.push(u => {
    if (NT.un) { try { NT.un(); } catch (e) { } NT.un = null; }
    NT.lista = null; NT.anexo = null;
    if (!u) return;
    const pref = lerLS("cs.notas.pref." + u.uid, null); if (pref) { NT.cat = pref.cat || NT.cat; NT.pri = pref.pri || NT.pri; }
    NT.un = fb.onSnapshot(C("users", u.uid, "notas"), s => { NT.lista = s.docs.map(d => ({ id: d.id, ...A.dadosDe(d) })); pintar(); }, e => { console.warn(e); NT.lista = []; });
  });
  const ordenar = l => l.slice().sort((a, b) => (!!b.fixada - !!a.fixada) || (!!a.feito - !!b.feito) || ((a.prioridade || 2) - (b.prioridade || 2)) || (A.ms(b.em) - A.ms(a.em)));
  const quando = n => { const d = new Date(A.ms(n.em) || Date.now()), hoje = new Date(); return d.toDateString() === hoje.toDateString() ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""); };
  const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
  const tam = n => n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  /* ---------- item fixo nas Conversas ---------- */
  X.conversasFixos.push(f => {
    if (f && !"anotacoes".includes(A.semAc ? A.semAc(f) : f)) return "";
    const l = NT.lista || [], pend = l.filter(n => !n.feito), alta = pend.filter(n => n.prioridade === 1).length;
    const ult = ordenar(l)[0];
    const sub = !l.length ? "Guarde textos, fotos, links e arquivos" : alta ? `${alta} de prioridade alta · ${pend.length} pendente${pend.length === 1 ? "" : "s"}` : ult ? (ult.texto || ult.arq && ult.arq.nome || "Foto").slice(0, 60) : "";
    return `<button class="cs-item" data-s="notas-abrir" role="listitem"><span class="cs-av cs-nt-av" style="width:52px;height:52px">${I.nota}</span>
      <span class="cs-item-t"><b>Anotações <span class="pill">Só você</span></b><span>${esc(sub)}</span></span>${alta ? `<span class="cs-item-m"><i class="cs-nt-alta">${alta}</i></span>` : ""}</button>`;
  });

  /* ---------- tela ---------- */
  function visiveis() {
    const q = A.semAc ? A.semAc(NT.busca) : NT.busca.toLowerCase();
    return ordenar((NT.lista || []).filter(n => (NT.filtro === "todas" || (NT.filtro === "alta" ? n.prioridade === 1 && !n.feito : n.cat === NT.filtro))
      && (!q || (A.semAc ? A.semAc((n.texto || "") + " " + ((n.arq && n.arq.nome) || "")) : (n.texto || "").toLowerCase()).includes(q))));
  }
  function htmlNota(n) {
    const c = cat(n.cat), p = pri(n.prioridade), link = (n.texto || "").match(URL_RE);
    let corpo = "";
    if (n.texto) corpo += `<div class="cs-nt-tx">${A.textoComLinks ? A.textoComLinks(n.texto) : esc(n.texto)}</div>`;
    if (link) corpo += `<button class="cs-nt-link" data-s="notas-link" data-v="${esc(link[0])}">${I.link}<span><b>${esc(dominio(link[0]))}</b><small>${esc(link[0].slice(0, 80))}</small></span></button>`;
    if (n.thumb) corpo += `<button class="cs-nt-foto" data-s="notas-arq" data-id="${esc(n.id)}"><img src="${esc(n.thumb)}" alt="" loading="lazy"></button>`;
    else if (n.arq) corpo += `<button class="cs-nt-arq" data-s="notas-arq" data-id="${esc(n.id)}">${I.clip}<span><b>${esc(n.arq.nome)}</b><small>${tam(n.arq.tamanho || 0)}</small></span></button>`;
    return `<article class="cs-nt ${n.feito ? "feito" : ""}" style="--c:${c[2]}">
      <button class="cs-nt-ok ${n.feito ? "on" : ""}" data-s="notas-feito" data-id="${esc(n.id)}" aria-label="${n.feito ? "Marcar como pendente" : "Marcar como feito"}">${I.check}</button>
      <div class="cs-nt-c" data-s="notas-menu" data-id="${esc(n.id)}" role="button" tabindex="0">${corpo}
        <div class="cs-nt-m"><span class="cs-nt-cat">${esc(c[1])}</span><span class="cs-nt-pri" style="--p:${p[2]}">${I.flag}${esc(p[1])}</span>${n.fixada ? `<span class="cs-nt-fx">${I.pin}</span>` : ""}<small>${quando(n)}</small></div></div></article>`;
  }
  X.views["notas"] = () => {
    const l = visiveis(), total = (NT.lista || []).length, cont = k => (NT.lista || []).filter(n => k === "alta" ? n.prioridade === 1 && !n.feito : n.cat === k).length;
    const filtros = [["todas", "Todas", total], ["alta", "Prioridade alta", cont("alta")], ...CATS.map(c => [c[0], c[1], cont(c[0])])];
    const a = NT.anexo;
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${K.back}</button>
        <span class="cs-av cs-nt-av" style="width:38px;height:38px">${I.nota}</span><b style="flex:1">Anotações</b>
        <button class="cs-ico-bt" data-s="notas-buscar" aria-label="Buscar">${I.busca}</button></header>
      ${NT.buscando ? `<div class="cs-nt-busca"><input class="in" id="nt-q" placeholder="Buscar nas anotações" value="${esc(NT.busca)}" aria-label="Buscar nas anotações"></div>` : ""}
      <div class="cs-nt-filtros">${filtros.map(([k, n, q]) => `<button data-s="notas-filtro" data-v="${k}" aria-pressed="${NT.filtro === k}" ${k !== "todas" && k !== "alta" ? `style="--c:${cat(k)[2]}"` : ""}>${k !== "todas" && k !== "alta" ? "<i></i>" : ""}${esc(n)}${q ? ` <small>${q}</small>` : ""}</button>`).join("")}</div>
      <div class="cs-nt-lista" id="cs-nt-lista">${NT.lista === null ? `<div class="cs-carr"><div class="spin"></div></div>`
        : l.length ? l.map(htmlNota).join("") : `<div class="empty">${I.nota}<b>${total ? "Nada neste filtro" : "Suas anotações"}</b><span class="small muted">${total ? "Escolha outro filtro." : "Escreva abaixo, cole um link ou anexe uma foto ou arquivo. Só você vê."}</span></div>`}</div>
      <form class="cs-compor cs-nt-comp" id="nt-f">
        <div class="cs-nt-sel">
          ${CATS.map(c => `<button type="button" class="cs-nt-chip" data-s="notas-cat" data-v="${c[0]}" aria-pressed="${NT.cat === c[0]}" style="--c:${c[2]}"><i></i>${c[1]}</button>`).join("")}
          <span class="cs-nt-sep"></span>
          ${PRIS.map(p => `<button type="button" class="cs-nt-chip pri" data-s="notas-pri" data-v="${p[0]}" aria-pressed="${NT.pri === p[0]}" style="--c:${p[2]}">${I.flag}${p[1]}</button>`).join("")}
        </div>
        ${a ? `<div class="cs-nt-anx">${a.url ? `<img src="${a.url}" alt="">` : I.clip}<span>${esc(a.nome)}${NT.enviando ? ` · ${Math.round(NT.prog * 100)}%` : ""}</span><button type="button" data-s="notas-anx-tirar" aria-label="Tirar anexo">${K.x}</button></div>` : ""}
        <div class="cs-nt-linha">
          <button type="button" class="cs-ico-bt" data-s="notas-anexar" aria-label="Anexar foto ou arquivo">${I.clip}</button>
          <textarea id="nt-tx" class="in" rows="1" maxlength="5000" placeholder="Escreva uma anotação ou cole um link" aria-label="Nova anotação">${esc(NT.rascunho || "")}</textarea>
          <button class="btn primary cs-env" aria-label="Guardar" ${NT.enviando ? "disabled" : ""}>${I.env}</button>
        </div></form>`;
  };

  /* ---------- guardar ---------- */
  async function guardar() {
    const tx = ($("#nt-tx") || {}).value || "", a = NT.anexo, t = tx.trim();
    if (!t && !a) return toast("Escreva algo ou anexe um arquivo.");
    if (NT.enviando) return;
    NT.enviando = true; NT.prog = 0; pintar();
    try {
      const nota = { texto: t.slice(0, 5000), cat: NT.cat, prioridade: NT.pri, feito: false, fixada: false, em: TS() };
      if (a) {
        const M = X.midia; if (!M) throw { msg: "Anexos indisponíveis agora." };
        let blob = a.file, tipo = a.file.type || "application/octet-stream", nome = a.nome;
        if (a.foto) { blob = await M.comprimirImg(a.file, 1800, 0.84); tipo = "image/jpeg"; nome = nome.replace(/\.\w+$/, "") + ".jpg"; }
        if (blob.size > 20 * 1048576) throw { msg: "Máximo 20 MB por arquivo." };
        const id = await M.subir(null, blob, { nome, tipo }, f => { NT.prog = f; const s = $(".cs-nt-anx span"); if (s) s.textContent = `${nome} · ${Math.round(f * 100)}%`; }, "notaArqs");
        M.guardar("notaArqs:" + id, blob);
        nota.arq = { id, nome: nome.slice(0, 120), tipo, tamanho: blob.size };
        if (a.foto && a.thumb) nota.thumb = a.thumb;
      }
      await fb.setDoc(fb.doc(C("users", eu(), "notas")), nota);
      gravarLS("cs.notas.pref." + eu(), { cat: NT.cat, pri: NT.pri });
      if (a && a.url) URL.revokeObjectURL(a.url);
      NT.anexo = null; NT.rascunho = ""; const el = $("#nt-tx"); if (el) el.value = "";
    } catch (e) { toast(e && e.msg ? e.msg : msgErro(e)); }
    NT.enviando = false; pintar();
    setTimeout(() => { const l = $("#cs-nt-lista"); if (l) window.scrollTo(0, 0); }, 50);
  }
  document.addEventListener("submit", e => { if (e.target.id !== "nt-f") return; e.preventDefault(); guardar(); });
  document.addEventListener("keydown", e => { if (e.target.id === "nt-tx" && e.key === "Enter" && !e.shiftKey && !e.isComposing && !window.matchMedia("(pointer:coarse)").matches) { e.preventDefault(); guardar(); } });
  document.addEventListener("input", e => {
    if (e.target.id === "nt-tx") { NT.rascunho = e.target.value; e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight + 2, 140) + "px"; }
    if (e.target.id === "nt-q") { NT.busca = e.target.value; const l = $("#cs-nt-lista"); if (l) { const v = visiveis(); l.innerHTML = v.length ? v.map(htmlNota).join("") : `<div class="empty"><b>Nada encontrado</b></div>`; } }
  });
  const nota = id => (NT.lista || []).find(n => n.id === id);
  const atualizar = (id, d) => fb.updateDoc(D("users", eu(), "notas", id), { ...d, atualizadoEm: TS() }).catch(e => toast(msgErro(e)));

  function sheetNota(n) {
    const c = cat(n.cat), link = (n.texto || "").match(URL_RE);
    window.abrirSheet(`<div class="sheet-h"><h2>Anotação</h2></div>
      <form class="stack" id="nt-ed" data-id="${esc(n.id)}">
        <textarea class="in" id="nt-ed-tx" rows="4" maxlength="5000" placeholder="Texto">${esc(n.texto || "")}</textarea>
        <div><span class="small muted">Categoria</span><div class="cs-nt-sel">${CATS.map(k => `<button type="button" class="cs-nt-chip" data-s="notas-ed-cat" data-v="${k[0]}" aria-pressed="${n.cat === k[0]}" style="--c:${k[2]}"><i></i>${k[1]}</button>`).join("")}</div></div>
        <div><span class="small muted">Prioridade</span><div class="cs-nt-sel">${PRIS.map(p => `<button type="button" class="cs-nt-chip pri" data-s="notas-ed-pri" data-v="${p[0]}" aria-pressed="${(n.prioridade || 2) === p[0]}" style="--c:${p[2]}">${I.flag}${p[1]}</button>`).join("")}</div></div>
        <button class="btn primary">Salvar</button></form>
      <div class="cs-menu">
        ${n.arq ? `<button data-s="notas-arq" data-id="${esc(n.id)}">${n.thumb ? I.foto : I.clip}<span><b>Abrir ${n.thumb ? "foto" : "arquivo"}</b><small>${esc(n.arq.nome)}</small></span></button>` : ""}
        ${link ? `<button data-s="notas-link" data-v="${esc(link[0])}">${I.link}<span><b>Abrir link</b><small>${esc(dominio(link[0]))}</small></span></button>` : ""}
        ${n.texto ? `<button data-s="copiar" data-v="${esc(n.texto)}">${I.copiar}<span><b>Copiar texto</b></span></button>` : ""}
        <button data-s="notas-fixar" data-id="${esc(n.id)}">${I.pin}<span><b>${n.fixada ? "Desafixar" : "Fixar no topo"}</b></span></button>
        <button data-s="notas-feito" data-id="${esc(n.id)}">${I.check}<span><b>${n.feito ? "Marcar como pendente" : "Marcar como feito"}</b></span></button>
        <button class="perigo" data-s="notas-apagar" data-id="${esc(n.id)}">${I.lixo}<span><b>Apagar</b></span></button></div>`);
    NT.ed = { cat: n.cat || c[0], pri: n.prioridade || 2 };
  }
  document.addEventListener("submit", async e => {
    const f = e.target; if (f.id !== "nt-ed") return; e.preventDefault();
    await atualizar(f.dataset.id, { texto: (($("#nt-ed-tx") || {}).value || "").trim().slice(0, 5000), cat: NT.ed.cat, prioridade: NT.ed.pri });
    window.fecharSheet(); toast("Anotação salva.");
  });

  Object.assign(X.acoes, {
    "notas-abrir": () => abrirTela({ v: "notas" }),
    "notas-buscar": () => { NT.buscando = !NT.buscando; if (!NT.buscando) NT.busca = ""; pintar(); setTimeout(() => { const q = $("#nt-q"); if (q) q.focus(); }, 60); },
    "notas-filtro": el => { NT.filtro = el.dataset.v; pintar(); },
    "notas-cat": el => { NT.cat = el.dataset.v; document.querySelectorAll("#nt-f [data-s=notas-cat]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === NT.cat))); },
    "notas-pri": el => { NT.pri = +el.dataset.v; document.querySelectorAll("#nt-f [data-s=notas-pri]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === NT.pri))); },
    "notas-ed-cat": el => { NT.ed.cat = el.dataset.v; document.querySelectorAll("#nt-ed [data-s=notas-ed-cat]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === NT.ed.cat))); },
    "notas-ed-pri": el => { NT.ed.pri = +el.dataset.v; document.querySelectorAll("#nt-ed [data-s=notas-ed-pri]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === NT.ed.pri))); },
    "notas-anexar": () => {
      const inp = document.createElement("input"); inp.type = "file";
      inp.accept = "image/*,application/pdf,video/*,audio/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.zip";
      inp.onchange = async () => {
        const f = (inp.files || [])[0]; if (!f) return;
        const foto = /^image\//.test(f.type) && !/gif|svg/.test(f.type);
        if (!foto && f.size > 20 * 1048576) return toast("Máximo 20 MB por arquivo.");
        NT.anexo = { file: f, nome: f.name || (foto ? "foto.jpg" : "arquivo"), foto, url: foto ? URL.createObjectURL(f) : null, thumb: null };
        if (foto && X.midia && X.midia.miniImg) { try { NT.anexo.thumb = (await X.midia.miniImg(f)).thumb; } catch (e) { } }
        else if (foto) { try { const b = await X.midia.comprimirImg(f, 360, 0.6); NT.anexo.thumb = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) { } }
        pintar(); setTimeout(() => { const el = $("#nt-tx"); if (el) el.focus(); }, 30);
      };
      inp.click();
    },
    "notas-anx-tirar": () => { if (NT.anexo && NT.anexo.url) URL.revokeObjectURL(NT.anexo.url); NT.anexo = null; pintar(); },
    "notas-menu": el => { const n = nota(el.dataset.id); if (n) sheetNota(n); },
    "notas-feito": el => { const n = nota(el.dataset.id); if (n) { window.fecharSheet(); atualizar(n.id, { feito: !n.feito }); } },
    "notas-fixar": el => { const n = nota(el.dataset.id); if (n) { window.fecharSheet(); atualizar(n.id, { fixada: !n.fixada }); } },
    "notas-apagar": async el => {
      const n = nota(el.dataset.id); if (!n) return;
      if (el.dataset.ok !== "1") { window.abrirSheet(`<div class="sheet-h"><h2>Apagar anotação?</h2></div><p class="small">Não dá para desfazer.</p><div class="row"><button class="btn" data-s="fechar" style="flex:1">Cancelar</button><button class="btn cs-perigo-f" data-s="notas-apagar" data-id="${esc(n.id)}" data-ok="1" style="flex:1">Apagar</button></div>`); return; }
      window.fecharSheet();
      try { await fb.deleteDoc(D("users", eu(), "notas", n.id)); if (n.arq && X.midia) X.midia.apagarArquivo(n.arq.id, "notaArqs"); toast("Anotação apagada."); } catch (e) { toast(msgErro(e)); }
    },
    "notas-arq": el => { const n = nota(el.dataset.id); if (n && n.arq && X.midia) { window.fecharSheet(); X.midia.abrirArquivo({ ...n.arq, col: "notaArqs" }); } },
    "notas-link": el => { window.fecharSheet(); if (A.abrirLink) A.abrirLink(el.dataset.v); }
  });

  const css = document.createElement("style");
  css.textContent = `.cs-nt-av{display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#fff;flex:none}.cs-nt-av svg{width:52%;height:52%}
.cs-nt-alta{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:#DC2626;color:#fff;font-style:normal;font-size:.75rem;font-weight:800}
.cs-nt-busca{padding:6px 14px 0}
.cs-nt-filtros{display:flex;gap:8px;overflow-x:auto;padding:10px 14px 4px;scrollbar-width:none}.cs-nt-filtros::-webkit-scrollbar{display:none}
.cs-nt-filtros button{flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 13px;font:inherit;font-size:.86rem;cursor:pointer}
.cs-nt-filtros button i{width:9px;height:9px;border-radius:50%;background:var(--c)}.cs-nt-filtros small{opacity:.7}
.cs-nt-filtros button[aria-pressed=true]{background:var(--ink);color:var(--bg,#fff);border-color:var(--ink)}
.cs-nt-lista{display:flex;flex-direction:column;gap:10px;padding:10px 14px 16px}
.cs-nt{display:flex;gap:10px;align-items:flex-start;background:var(--surface);border-radius:16px;padding:12px 12px 10px 10px;box-shadow:0 1px 2px rgba(0,0,0,.08);border-left:4px solid var(--c)}
.cs-nt.feito{opacity:.6}.cs-nt.feito .cs-nt-tx{text-decoration:line-through}
.cs-nt-ok{width:26px;height:26px;border-radius:50%;border:2px solid var(--line);background:transparent;color:transparent;display:grid;place-items:center;flex:none;margin-top:1px;cursor:pointer}
.cs-nt-ok svg{width:15px;height:15px}.cs-nt-ok.on{background:var(--c);border-color:var(--c);color:#fff}
.cs-nt-c{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;cursor:pointer}
.cs-nt-tx{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.42}
.cs-nt-link,.cs-nt-arq{display:flex;align-items:center;gap:10px;border:0;border-radius:12px;background:var(--surface-2);color:var(--ink);padding:9px 10px;font:inherit;text-align:left;cursor:pointer;min-width:0}
.cs-nt-link svg,.cs-nt-arq svg{width:20px;height:20px;color:var(--c);flex:none}.cs-nt-link span,.cs-nt-arq span{display:flex;flex-direction:column;min-width:0}
.cs-nt-link b,.cs-nt-link small,.cs-nt-arq b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-nt-link small,.cs-nt-arq small{color:var(--muted)}
.cs-nt-foto{border:0;padding:0;background:none;border-radius:12px;overflow:hidden;max-width:240px;cursor:pointer}.cs-nt-foto img{display:block;width:100%;height:auto}
.cs-nt-m{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.76rem}
.cs-nt-cat{color:var(--c);font-weight:700}.cs-nt-pri{display:inline-flex;align-items:center;gap:3px;color:var(--p);font-weight:700}.cs-nt-pri svg,.cs-nt-fx svg{width:13px;height:13px}
.cs-nt-fx{color:var(--muted);display:inline-flex}.cs-nt-m small{margin-left:auto;color:var(--muted)}
.cs-nt-comp{flex-direction:column;align-items:stretch;gap:6px}
.cs-nt-sel{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.cs-nt-sel::-webkit-scrollbar{display:none}
.cs-nt-chip{flex:none;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.8rem;cursor:pointer}
.cs-nt-chip i{width:8px;height:8px;border-radius:50%;background:var(--c)}.cs-nt-chip svg{width:13px;height:13px;color:var(--c)}
.cs-nt-chip[aria-pressed=true]{background:var(--c);border-color:var(--c);color:#fff}.cs-nt-chip[aria-pressed=true] i{background:#fff}.cs-nt-chip[aria-pressed=true] svg{color:#fff}
.cs-nt-sep{width:1px;background:var(--line);flex:none;margin:2px 2px}
.cs-nt-linha{display:flex;align-items:flex-end;gap:6px}.cs-nt-linha textarea{flex:1;resize:none;max-height:140px}
.cs-nt-anx{display:flex;align-items:center;gap:8px;background:var(--surface-2);border-radius:12px;padding:6px 8px;font-size:.85rem}
.cs-nt-anx img{width:40px;height:40px;object-fit:cover;border-radius:8px}.cs-nt-anx>svg{width:20px;height:20px}.cs-nt-anx span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-nt-anx button{border:0;background:none;color:var(--muted);width:30px;height:30px;display:grid;place-items:center}.cs-nt-anx button svg{width:16px;height:16px}
body.cs-com-compor .cs-nt-lista{padding-bottom:calc(130px + env(safe-area-inset-bottom,0px))}`;
  document.head.appendChild(css);
})();
