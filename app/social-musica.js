/* ChatMil — Música nas publicações de foto (como no Facebook).
   Biblioteca gratuita e sempre atualizada: Openverse (api.openverse.org), músicas com licença Creative Commons
   (Jamendo, Wikimedia e outras). Só licenças que permitem usar a música junto com a foto (sem "ND").
   A publicação guarda o link da música, o trecho escolhido e os créditos; nada é copiado para o servidor. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, ic, esc, toast } = A;
  const $ = s => document.querySelector(s);
  const API = "https://api.openverse.org/v1/audio/";
  const LICENCAS = "by,by-sa,cc0,by-nc,by-nc-sa,pdm";
  let TRECHO = 30;
  const CATS = [["ChatMil", null], ["Em alta", "happy upbeat"], ["Alegre", "happy"], ["Calma", "calm relaxing"], ["Romântica", "romantic love"], ["Inspiradora", "inspiring"],
    ["Acústico", "acoustic guitar"], ["Piano", "piano"], ["Pop", "pop"], ["Infantil", "kids children"], ["Lo-fi", "lofi"], ["Festa", "dance party"], ["Brasil", "brazil samba bossa"]];
  const I = {
    nota: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    play: ic('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
    pausa: ic('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    voltar: ic('<path d="M15 18l-6-6 6-6"/>'),
    busca: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')
  };
  const temChatMil = () => !!X.musicasChatMil && !MU.soLivre;
  const MU = { sel: null, cat: 1, cb: null, soLivre: true, titulo: "", trecho: 30, busca: "", lista: null, carregando: false, erro: "", escolhida: null, inicio: 0, tocandoId: null, audio: null, timer: null };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const mmss = s => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const licTxt = l => "CC " + String(l || "").toUpperCase().replace(/^CC0$/, "0").replace(/^PDM$/, "domínio público");

  /* ---------- tocar (uma música por vez) ---------- */
  function parar() {
    clearTimeout(MU.timer); MU.timer = null;
    if (MU.audio) { try { MU.audio.pause(); } catch (e) { } }
    MU.tocandoId = null; marcarTocando();
  }
  function tocar(id, url, inicio, segs) {
    if (MU.tocandoId === id) return parar();
    parar();
    if (!MU.audio) { MU.audio = new Audio(); MU.audio.preload = "auto"; MU.audio.addEventListener("ended", parar); MU.audio.addEventListener("error", () => { if (MU.tocandoId) { toast("Não deu para tocar esta música agora."); parar(); } }); }
    const a = MU.audio; MU.tocandoId = id; marcarTocando();
    const comecar = () => { try { a.currentTime = inicio || 0; } catch (e) { } a.play().catch(() => { if (MU.tocandoId === id) parar(); }); };
    if (a.src !== url) { a.src = url; a.addEventListener("loadedmetadata", comecar, { once: true }); a.load(); } else comecar();
    MU.timer = setTimeout(() => { if (MU.tocandoId === id) parar(); }, (segs || TRECHO) * 1000);
  }
  function marcarTocando() {
    document.querySelectorAll("[data-mus-id]").forEach(b => {
      const on = b.dataset.musId === MU.tocandoId; b.classList.toggle("on", on); const bt = b.querySelector(".cs-mus-bt"); if (bt) bt.innerHTML = on ? I.pausa : I.play;
    });
  }
  X.aoTrocarUsuario.push(() => { parar(); MU.sel = null; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) parar(); });

  /* ---------- no compositor: aparece depois de escolher a foto ---------- */
  X.compositorAbrir.push(() => { MU.sel = null; parar(); });
  X.fotosExtra.push(() => {
    if (!(SO.postFotos || []).length) return "";
    if (!MU.sel) return `<button type="button" class="cs-pc-mus add" data-s="mus-abrir">${I.nota}<span>Adicionar música</span></button>`;
    return `<div class="cs-pc-mus" data-mus-id="pc">${I.nota}<span class="cs-pc-mus-t"><b>${esc(MU.sel.titulo)}</b><small>${esc(MU.sel.artista)} · a partir de ${mmss(MU.sel.inicio)}</small></span>
      <button type="button" class="cs-mus-bt" data-s="mus-prev-sel" aria-label="Ouvir">${I.play}</button>
      <button type="button" class="cs-link" data-s="mus-abrir">Trocar</button><button type="button" class="cs-mus-x" data-s="mus-tirar" aria-label="Tirar música">${I.x}</button></div>`;
  });
  X.postDados.push(para => {
    if (!MU.sel || !$("#cs-f-post") || !(SO.postFotos || []).length) return {};
    const m = MU.sel; return { musica: { id: m.id, titulo: m.titulo, artista: m.artista, url: m.url, inicio: m.inicio, dur: m.dur, lic: m.lic, link: m.link, capa: m.capa || "" } };
  });

  /* ---------- na publicação ---------- */
  X.postCorpo.push(p => {
    const m = p.musica; if (!m || !/^https:\/\//.test(m.url || "")) return "";
    const id = "p" + p.id, on = MU.tocandoId === id;
    return `<div class="cs-mus-post ${on ? "on" : ""}" data-mus-id="${esc(id)}"><button class="cs-mus-bt" data-s="mus-tocar" data-id="${esc(p.id)}" data-col="${esc(p.col || "posts")}" aria-label="Tocar música">${on ? I.pausa : I.play}</button>
      <span class="cs-mus-t"><b>${I.nota}${esc(m.titulo)}</b><small>${esc(m.artista)} · <a href="${esc(m.link || "https://openverse.org")}" data-s="mus-link" data-v="${esc(m.link || "https://openverse.org")}">${esc(licTxt(m.lic))}</a></small></span><i class="cs-eq" aria-hidden="true"><b></b><b></b><b></b></i></div>`;
  });

  /* ---------- escolher a música (tela própria, por cima da janela de publicar) ---------- */
  async function buscar() {
    const ehCM = !MU.busca.trim() && CATS[MU.cat][1] === null;
    let cm = [];
    if (temChatMil() && (ehCM || MU.busca.trim())) {
      MU.carregando = true; MU.erro = ""; if (ehCM) { MU.lista = MU.lista && MU.lista.every(x => x.fonte === "chatmil") ? MU.lista : null; pintarLista(); }
      try { cm = await X.musicasChatMil(MU.busca); } catch (e) { console.warn(e); }
      if (ehCM) { MU.lista = cm; MU.carregando = false; return pintarLista(); }
    }
    const q = MU.busca.trim() || CATS[MU.cat][1], k = "cs.mus." + q.toLowerCase();
    const c = lerLS(k, null);
    if (c && Date.now() - c.em < 12 * 3600e3) { MU.lista = [...cm, ...c.r]; MU.erro = ""; MU.carregando = false; return pintarLista(); }
    MU.carregando = true; MU.erro = ""; pintarLista();
    try {
      const r = await fetch(`${API}?q=${encodeURIComponent(q)}&category=music&license=${LICENCAS}&page_size=30&mature=false`);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const lista = (j.results || []).filter(x => x.url && /^https:\/\//.test(x.url) && x.duration > 30000 && x.duration < 900000 && !/nd/.test(x.license || ""))
        .map(x => ({ id: String(x.id), titulo: String(x.title || "Sem título").slice(0, 100), artista: String(x.creator || "Artista").slice(0, 80), url: x.url,
          dur: Math.round(x.duration / 1000), lic: [x.license, x.license_version].filter(Boolean).join(" "), link: x.foreign_landing_url || "", capa: x.thumbnail || "" }));
      MU.lista = [...cm, ...lista]; gravarLS(k, { em: Date.now(), r: lista });
    } catch (e) { console.warn(e); MU.erro = "Não deu para carregar as músicas agora. Confira a internet e tente de novo."; MU.lista = [...cm, ...(c ? c.r : [])]; }
    MU.carregando = false; pintarLista();
  }
  function abrir(op) {
    fechar();
    op = op || {}; MU.cb = op.cb || null; MU.soLivre = !op.cb; MU.titulo = op.titulo || "Música para a foto"; TRECHO = op.trecho || 30;
    if (!temChatMil() && CATS[MU.cat][1] === null) MU.cat = 1;
    if (op.cb && temChatMil() && !MU.busca) MU.cat = 0;
    const el = document.createElement("div"); el.id = "cs-mus"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Escolher música");
    el.innerHTML = `<header class="cs-mus-h"><button class="cs-ico-bt" data-s="mus-fechar" aria-label="Fechar">${I.voltar}</button><b>${esc(MU.titulo)}</b></header>
      <form class="cs-mus-busca" id="mus-f"><span>${I.busca}</span><input class="in" id="mus-q" type="search" placeholder="Buscar música ou artista" enterkeyhint="search" value="${esc(MU.busca)}"></form>
      <div class="cs-mus-cats">${CATS.map(([n, q], i) => q === null && !temChatMil() ? "" : `<button type="button" data-s="mus-cat" data-v="${i}" aria-pressed="${!MU.busca && MU.cat === i}">${esc(n)}</button>`).join("")}</div>
      <div class="cs-mus-lista" id="mus-lista"></div>
      <div class="cs-mus-trecho" id="mus-trecho" hidden></div>
      <p class="cs-mus-cred">ChatMil: faixas de artistas independentes · Livres: Creative Commons (Openverse)</p>`;
    document.body.appendChild(el); document.body.classList.add("cs-mus-aberta");
    try { history.pushState({ mus: 1 }, ""); } catch (e) { }
    buscar();
  }
  function fechar(deHistorico) {
    const el = $("#cs-mus"); if (!el) return;
    if (MU.tocandoId && MU.tocandoId.startsWith("l")) parar();
    el.remove(); document.body.classList.remove("cs-mus-aberta"); MU.escolhida = null;
    if (MU.cb) { const cb = MU.cb; MU.cb = null; cb(null); }
    if (!deHistorico) { try { if (history.state && history.state.mus) history.back(); } catch (e) { } }
  }
  window.addEventListener("popstate", () => { if ($("#cs-mus")) fechar(true); });
  function pintarLista() {
    const el = $("#mus-lista"); if (!el) return;
    if (MU.carregando && !(MU.lista || []).length) { el.innerHTML = `<div class="cs-mus-vazio"><div class="spin"></div></div>`; return; }
    const l = MU.lista || [];
    el.innerHTML = (MU.erro ? `<p class="small cs-mus-erro">${esc(MU.erro)} <button type="button" class="cs-link" data-s="mus-cat" data-v="${MU.cat}">Tentar de novo</button></p>` : "")
      + (l.length ? l.map((m, i) => `<div class="cs-mus-item ${MU.escolhida && MU.escolhida.id === m.id ? "sel" : ""}" data-mus-id="l${esc(m.id)}">
        <button type="button" class="cs-mus-bt cs-mus-capa" data-s="mus-prev" data-v="${i}" aria-label="Ouvir ${esc(m.titulo)}">${capa(m)}<i>${MU.tocandoId === "l" + m.id ? I.pausa : I.play}</i></button>
        <button type="button" class="cs-mus-esc" data-s="mus-escolher" data-v="${i}"><b>${esc(m.titulo)}</b><small>${m.fonte === "chatmil" ? `<span class="cs-mus-cm">ChatMil</span>` : ""}${esc(m.artista)} · ${mmss(m.dur)}</small></button></div>`).join("")
        : (MU.erro ? "" : `<div class="cs-mus-vazio"><b>Nenhuma música encontrada</b><span class="small muted">Tente outra palavra.</span></div>`));
  }
  const capa = m => m.fonte === "chatmil" && X.capaMusica ? X.capaMusica(m, "cs-mus-img")
    : m.capa && /^https:\/\//.test(m.capa) ? `<img class="cs-mus-img" src="${esc(m.capa)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
  /* faixa do ChatMil: o áudio vem em partes; resolve o endereço antes de tocar */
  async function urlDe(m) { if (m.fonte !== "chatmil") return m.url; try { return await X.urlMusica(m); } catch (e) { toast("Não deu para tocar agora."); return null; } }
  function pintarTrecho() {
    const el = $("#mus-trecho"), m = MU.escolhida; if (!el) return;
    if (!m) { el.hidden = true; return; }
    const max = Math.max(0, m.dur - TRECHO);
    el.hidden = false;
    el.innerHTML = `<div class="cs-mus-tr-h"><span>${I.nota}</span><span class="cs-mus-tr-t"><b>${esc(m.titulo)}</b><small>${esc(m.artista)}</small></span></div>
      <label class="small" for="mus-ini">Trecho: <b id="mus-ini-t">${mmss(MU.inicio)} – ${mmss(Math.min(m.dur, MU.inicio + TRECHO))}</b></label>
      <input type="range" id="mus-ini" min="0" max="${max}" step="1" value="${MU.inicio}" ${max ? "" : "disabled"}>
      <div class="row"><button type="button" class="btn" data-s="mus-ouvir-trecho" style="flex:1" data-mus-id="t${esc(m.id)}">${I.play} Ouvir trecho</button><button type="button" class="btn primary" data-s="mus-usar" style="flex:1">Usar música</button></div>`;
  }
  document.addEventListener("input", e => {
    if (e.target.id === "mus-ini" && MU.escolhida) { MU.inicio = +e.target.value; const t = $("#mus-ini-t"); if (t) t.textContent = `${mmss(MU.inicio)} – ${mmss(Math.min(MU.escolhida.dur, MU.inicio + TRECHO))}`; }
  });
  document.addEventListener("change", e => {
    if (e.target.id === "mus-ini" && MU.escolhida) { const m = MU.escolhida; urlDe(m).then(u => u && tocar("t" + m.id + "_" + MU.inicio, u, MU.inicio, 12)); }
  });
  document.addEventListener("submit", e => {
    if (e.target.id !== "mus-f") return; e.preventDefault();
    MU.busca = ($("#mus-q") || {}).value || ""; document.querySelectorAll("[data-s=mus-cat]").forEach(b => b.setAttribute("aria-pressed", "false")); buscar();
  });
  const pintarCompositor = () => { try { const pc = $("#cs-pc-fotos"); if (pc) { const f = X.fotosExtra; /* repinta só o pedaço da música */ const velho = pc.querySelector(".cs-pc-mus"); const html = f.map(g => g() || "").join(""); const tmp = document.createElement("div"); tmp.innerHTML = html; const novo = tmp.querySelector(".cs-pc-mus"); if (velho && novo) velho.replaceWith(novo); else if (velho) velho.remove(); else if (novo) pc.appendChild(novo); } } catch (e) { } };

  /* escolher música para XFlesh / Flash: devolve {id, fonte, titulo, artista, capa, dur, url?, inicio} ou null */
  X.escolherMusica = op => new Promise(res => abrir({ ...(op || {}), cb: res }));
  Object.assign(X.acoes, {
    "mus-abrir": () => abrir(),
    "mus-fechar": () => fechar(),
    "mus-tirar": () => { MU.sel = null; parar(); pintarCompositor(); },
    "mus-prev-sel": () => { if (MU.sel) tocar("pc", MU.sel.url, MU.sel.inicio, 15); },
    "mus-cat": el => { MU.cat = +el.dataset.v; MU.busca = ""; const q = $("#mus-q"); if (q) q.value = ""; document.querySelectorAll(".cs-mus-cats [data-s=mus-cat]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === MU.cat)));MU.escolhida = null; pintarTrecho(); buscar(); },
    "mus-prev": async el => { const m = (MU.lista || [])[+el.dataset.v]; if (!m) return; const u = await urlDe(m); if (u) tocar("l" + m.id, u, m.fonte === "chatmil" ? 0 : Math.min(30, Math.max(0, m.dur - TRECHO)), 15); },
    "mus-escolher": el => { const m = (MU.lista || [])[+el.dataset.v]; if (!m) return; MU.escolhida = m; MU.inicio = m.fonte === "chatmil" ? 0 : Math.min(30, Math.max(0, m.dur - TRECHO)); pintarLista(); pintarTrecho(); },
    "mus-ouvir-trecho": async () => { const m = MU.escolhida; if (!m) return; const u = await urlDe(m); if (u) tocar("t" + m.id, u, MU.inicio, 15); },
    "mus-usar": () => {
      const m = MU.escolhida; if (!m) return;
      if (MU.cb) { const cb = MU.cb; MU.cb = null; parar(); const r = { ...m, inicio: MU.inicio }; fechar(); cb(r); return; }
      MU.sel = { ...m, inicio: MU.inicio }; parar(); fechar(); pintarCompositor(); toast("Música adicionada à foto.");
    },
    "mus-tocar": el => { const p = SO.posts.find(x => x.id === el.dataset.id) || ((SO.origCache || {})[el.dataset.id]); const m = p && p.musica; if (m) tocar("p" + p.id, m.url, m.inicio || 0, TRECHO); },
    "mus-link": (el, ev) => { if (ev) ev.preventDefault(); if (A.abrirLink) A.abrirLink(el.dataset.v); }
  });

  const css = document.createElement("style");
  css.textContent = `.cs-pc-mus{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface-2);border:0;font:inherit;color:var(--ink);text-align:left}
.cs-pc-mus>svg{width:20px;height:20px;color:var(--primary);flex:none}.cs-pc-mus.add{cursor:pointer;font-weight:700;color:var(--primary);background:color-mix(in srgb,var(--primary) 10%,transparent)}
.cs-pc-mus-t{flex:1;min-width:0;display:flex;flex-direction:column}.cs-pc-mus-t b,.cs-pc-mus-t small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-pc-mus-t small{color:var(--muted)}
.cs-mus-x{width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:var(--muted);display:grid;place-items:center}.cs-mus-x svg{width:18px;height:18px}
.cs-mus-bt{width:40px;height:40px;border-radius:50%;border:0;background:var(--primary);color:var(--primary-ink,#fff);display:grid;place-items:center;flex:none;cursor:pointer}
.cs-mus-bt svg{width:18px;height:18px}
.cs-mus-post{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:var(--surface-2);margin-top:2px}
.cs-mus-t{flex:1;min-width:0;display:flex;flex-direction:column}.cs-mus-t b{display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.92rem}
.cs-mus-t b svg{width:15px;height:15px;flex:none;color:var(--primary)}.cs-mus-t small{color:var(--muted);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-mus-t a{color:inherit}
.cs-eq{display:none;align-items:flex-end;gap:2px;height:16px}.cs-mus-post.on .cs-eq{display:flex}
.cs-eq b{width:3px;background:var(--primary);border-radius:2px;animation:csEq .9s ease-in-out infinite}.cs-eq b:nth-child(2){animation-delay:.2s}.cs-eq b:nth-child(3){animation-delay:.4s}
@keyframes csEq{0%,100%{height:4px}50%{height:16px}}
#cs-mus{position:fixed;inset:0;z-index:150;background:var(--bg,var(--surface));display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
.cs-mus-h{display:flex;align-items:center;gap:8px;padding:8px 10px}.cs-mus-h b{font-size:1.1rem}
.cs-mus-busca{display:flex;align-items:center;gap:8px;margin:0 14px;position:relative}.cs-mus-busca>span{position:absolute;left:12px;color:var(--muted)}.cs-mus-busca>span svg{width:18px;height:18px}.cs-mus-busca .in{padding-left:38px}
.cs-mus-cats{display:flex;gap:8px;overflow-x:auto;padding:10px 14px;scrollbar-width:none}.cs-mus-cats::-webkit-scrollbar{display:none}
.cs-mus-cats button{flex:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 14px;font:inherit;font-size:.88rem;cursor:pointer}
.cs-mus-cats button[aria-pressed=true]{background:var(--primary);border-color:var(--primary);color:var(--primary-ink,#fff)}
.cs-mus-lista{flex:1;overflow-y:auto;padding:0 14px 10px;display:flex;flex-direction:column;gap:6px}
.cs-mus-item{display:flex;align-items:center;gap:10px;padding:6px;border-radius:14px}.cs-mus-item.sel{background:color-mix(in srgb,var(--primary) 12%,transparent)}
.cs-mus-item .cs-mus-bt{background:var(--surface-2);color:var(--ink)}.cs-mus-item.on .cs-mus-bt{background:var(--primary);color:var(--primary-ink,#fff)}
.cs-mus-capa{position:relative;width:52px!important;height:52px!important;border-radius:12px!important;overflow:hidden;padding:0}
.cs-mus-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:0}
.cs-mus-capa>i{position:relative;z-index:1;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center}.cs-mus-capa>i svg{width:14px;height:14px}
.cs-mus-cm{display:inline-block;font-size:.66rem;font-weight:800;color:#fff;background:linear-gradient(90deg,#EC4899,#8B5CF6);border-radius:6px;padding:1px 6px;margin-right:6px;vertical-align:1px}
.cs-mus-esc{flex:1;min-width:0;border:0;background:none;text-align:left;font:inherit;color:var(--ink);display:flex;flex-direction:column;cursor:pointer;padding:4px 0}
.cs-mus-esc b,.cs-mus-esc small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-mus-esc small{color:var(--muted)}
.cs-mus-vazio{display:flex;flex-direction:column;align-items:center;gap:6px;padding:40px 0}
.cs-mus-erro{background:var(--surface-2);padding:10px;border-radius:12px}
.cs-mus-trecho{border-top:1px solid var(--line);padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--surface)}
.cs-mus-tr-h{display:flex;align-items:center;gap:10px}.cs-mus-tr-h svg{width:22px;height:22px;color:var(--primary)}.cs-mus-tr-t{display:flex;flex-direction:column;min-width:0}.cs-mus-tr-t small{color:var(--muted)}
.cs-mus-trecho input[type=range]{width:100%}.cs-mus-trecho .btn svg{width:16px;height:16px;vertical-align:-3px;margin-right:4px}
.cs-mus-cred{font-size:.72rem;color:var(--muted);text-align:center;margin:0;padding:6px 14px calc(env(safe-area-inset-bottom,0px) + 8px)}`;
  document.head.appendChild(css);
})();
