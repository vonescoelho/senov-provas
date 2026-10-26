/* ChatMil — Prévia de links (miniatura, título e descrição), como no WhatsApp.
   Quem ENVIA gera a prévia uma vez e ela vai junto da mensagem/publicação/anotação (na mensagem, dentro da criptografia).
   No Android: o próprio celular lê a página (NativoPlugin.previaLink, sem limite de CORS) e reduz a imagem.
   Na versão web: serviço público microlink.io + images.weserv.nl para a miniatura. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, esc, pintar } = A;
  const $ = s => document.querySelector(s);
  const Cap = window.Capacitor;
  const NATIVO = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  let NTP = null;
  try { if (NATIVO) NTP = (window.capacitorExports && capacitorExports.registerPlugin) ? capacitorExports.registerPlugin("Nativo") : Cap.registerPlugin("Nativo"); } catch (e) { }

  const URL_RE = /https?:\/\/[^\s<>"']+/i;
  function primeiro(t) {
    const m = String(t || "").match(URL_RE); if (!m) return "";
    let u = m[0].replace(/[),.;:!?…»"']+$/, "");
    if ((u.match(/\(/g) || []).length > (u.match(/\)/g) || []).length && /\)$/.test(m[0])) u += ")";
    return u;
  }
  const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
  const corta = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  /* ---------- buscar a prévia ---------- */
  const CACHE = new Map();
  function normalizar(u, r) {
    if (!r) return null;
    const final = /^https?:\/\//i.test(r.url || "") ? r.url : u;
    const o = { u: u.slice(0, 1000), t: corta(r.titulo || r.title, 160), d: corta(r.desc || r.description, 260), s: corta(r.site || r.publisher || dominio(final), 60) };
    if (r.img && /^data:image\/(jpeg|png|webp);base64,/.test(r.img) && r.img.length <= 110000) { o.i = r.img; o.w = r.w | 0; o.h = r.h | 0; }
    if (!o.t && !o.d && !o.i) return null;
    if (!o.t) o.t = o.s || dominio(u);
    return o;
  }
  async function miniaturaWeb(src) {
    if (!src || !/^https?:\/\//i.test(src)) return null;
    const via = "https://images.weserv.nl/?url=" + encodeURIComponent(src.replace(/^https?:\/\//i, "")) + "&w=640&h=640&fit=inside&output=jpg&q=72";
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
    try {
      const b = await (await fetch(via, { signal: ctl.signal })).blob();
      if (!b || !/^image\//.test(b.type) || b.size < 200) return null;
      const bmp = await createImageBitmap(b);
      const k = Math.min(1, 480 / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
      let q = 0.72, d = cv.toDataURL("image/jpeg", q);
      while (d.length > 100000 && q > 0.4) { q -= 0.1; d = cv.toDataURL("image/jpeg", q); }
      return { img: d, w: bmp.width, h: bmp.height };
    } catch (e) { return null; } finally { clearTimeout(to); }
  }
  async function buscarWeb(u) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await (await fetch("https://api.microlink.io/?url=" + encodeURIComponent(u), { signal: ctl.signal })).json();
      if (!r || r.status !== "success" || !r.data) return null;
      const d = r.data, img = (d.image && d.image.url) || (d.logo && d.logo.url) || "";
      const mini = await miniaturaWeb(img);
      return { url: d.url, titulo: d.title, desc: d.description, site: d.publisher, ...(mini || {}) };
    } catch (e) { return null; } finally { clearTimeout(to); }
  }
  function previa(u) {
    if (!u) return Promise.resolve(null);
    if (CACHE.has(u)) return CACHE.get(u);
    const p = (async () => {
      let r = null;
      if (NTP) { try { r = await NTP.previaLink({ url: u }); } catch (e) { r = null; } }
      if (!r) r = await buscarWeb(u);
      return normalizar(u, r);
    })().catch(() => null);
    CACHE.set(u, p);
    p.then(v => { if (!v) setTimeout(() => CACHE.delete(u), 60000); });
    if (CACHE.size > 60) CACHE.delete(CACHE.keys().next().value);
    return p;
  }
  const ehYT = u => !!(A.ytId && A.ytId(u));
  /* prévia para enviar junto do texto (espera no máximo "ms") */
  async function paraTexto(t, ms) {
    const u = primeiro(t); if (!u || ehYT(u)) return null;
    return Promise.race([previa(u), new Promise(r => setTimeout(() => r(null), ms || 3500))]);
  }

  /* ---------- cartão ---------- */
  function card(lk, cls) {
    if (!lk || !lk.u || !/^https?:\/\//i.test(lk.u)) return "";
    const grande = lk.i && lk.w >= 300 && lk.w >= lk.h * 1.2;
    const img = lk.i && /^data:image\//.test(lk.i) ? `<img src="${esc(lk.i)}" alt="" loading="lazy">` : "";
    return `<a class="cs-lkc ${grande ? "grande" : img ? "peq" : "sem"} ${cls || ""}" href="${esc(lk.u)}" data-s="link" data-v="${esc(lk.u)}" rel="noopener">
      ${img ? `<span class="cs-lkc-img">${img}</span>` : ""}<span class="cs-lkc-tx"><b>${esc(lk.t || "")}</b>${lk.d ? `<small>${esc(lk.d)}</small>` : ""}<i>${esc(lk.s || dominio(lk.u))}</i></span></a>`;
  }

  /* ---------- prévia enquanto escreve a mensagem ---------- */
  const ED = { u: "", dados: null, fechado: new Set(), timer: 0 };
  function pintarEd() {
    const f = $("#cs-f-msg"); if (!f) return;
    let box = f.querySelector(".cs-lkp");
    const ta = $("#cs-txt"), u = ta ? primeiro(ta.value) : "";
    const mostrar = u && u === ED.u && !ED.fechado.has(u) && !ehYT(u);
    if (!mostrar) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement("div"); box.className = "cs-lkp"; f.insertBefore(box, f.firstChild); }
    box.innerHTML = ED.dados === undefined
      ? `<span class="cs-lkp-car"><span class="spin sm"></span>Gerando prévia do link…</span><button type="button" class="cs-lkp-x" data-s="lkp-fechar" aria-label="Tirar prévia">✕</button>`
      : ED.dados ? `${card(ED.dados, "ed")}<button type="button" class="cs-lkp-x" data-s="lkp-fechar" aria-label="Tirar prévia">✕</button>` : "";
    if (!ED.dados && ED.dados !== undefined) box.remove();
  }
  function aoDigitar() {
    const ta = $("#cs-txt"); if (!ta) return;
    const u = primeiro(ta.value);
    if (u === ED.u) return pintarEd();
    ED.u = u; ED.dados = u ? undefined : null; pintarEd();
    clearTimeout(ED.timer);
    if (!u || ED.fechado.has(u) || ehYT(u)) return;
    ED.timer = setTimeout(() => previa(u).then(d => { if (ED.u !== u) return; ED.dados = d; pintarEd(); }), 450);
  }
  document.addEventListener("input", e => { if (e.target && e.target.id === "cs-txt") aoDigitar(); if (e.target && e.target.id === "cs-post-tx") { const u = primeiro(e.target.value); if (u && !ehYT(u)) previa(u); } });
  document.addEventListener("paste", e => { if (e.target && e.target.id === "cs-txt") setTimeout(aoDigitar, 0); });
  /* depois que a tela redesenha, recoloca a prévia */
  X.depois.push(() => { if ($("#cs-f-msg")) { const ta = $("#cs-txt"); if (ta && primeiro(ta.value) !== ED.u) aoDigitar(); else pintarEd(); } });
  X.acoes["lkp-fechar"] = () => { if (ED.u) ED.fechado.add(ED.u); pintarEd(); };
  /* o que vai junto da mensagem: a prévia que a pessoa viu (ou espera um pouco, se ainda está carregando) */
  async function paraMensagem(t) {
    const u = primeiro(t); if (!u || ehYT(u) || ED.fechado.has(u)) return null;
    const r = await Promise.race([previa(u), new Promise(r => setTimeout(() => r(null), 2500))]);
    ED.u = ""; ED.dados = null; const box = document.querySelector(".cs-lkp"); if (box) box.remove();
    return r;
  }

  window.CS_LINK = { primeiro, previa, paraTexto, paraMensagem, card };

  /* publicação do mural com link */
  X.postCorpo.push(p => p.link && !(p.imgs && p.imgs.length) ? card(p.link, "post") : "");

  const css = document.createElement("style");
  css.textContent = `.cs-lkc{display:flex;flex-direction:column;text-decoration:none;color:inherit;border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--text,#888) 8%,transparent);margin:2px 0 6px;max-width:100%}
.cs-lkc .cs-lkc-img{display:block;background:#fff}.cs-lkc.grande .cs-lkc-img img{display:block;width:100%;max-height:230px;object-fit:cover}
.cs-lkc.peq{flex-direction:row;align-items:stretch}.cs-lkc.peq .cs-lkc-img{flex:none;width:86px;min-height:86px;display:grid;place-items:center}.cs-lkc.peq .cs-lkc-img img{width:86px;height:100%;min-height:86px;object-fit:cover}
.cs-lkc-tx{display:flex;flex-direction:column;gap:2px;padding:8px 10px;min-width:0}
.cs-lkc-tx b{font-size:.95rem;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cs-lkc-tx small{font-size:.84rem;opacity:.8;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.cs-lkc-tx i{font-style:normal;font-size:.78rem;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-b .cs-lkc{min-width:min(260px,62vw)}.cs-m.eu .cs-lkc{background:rgba(0,0,0,.14)}
.cs-post .cs-lkc{margin:8px 0}.cs-post .cs-lkc.grande .cs-lkc-img img{max-height:320px}
.cs-lkp{position:absolute;left:10px;right:10px;bottom:100%;margin-bottom:6px;display:flex;align-items:flex-start;gap:6px;background:var(--surface,#1a2236);border:1px solid var(--line);border-radius:14px;padding:6px;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.cs-lkp .cs-lkc{flex:1;margin:0;min-width:0}.cs-lkp .cs-lkc.grande .cs-lkc-img img{max-height:120px}
.cs-lkp-car{flex:1;display:flex;align-items:center;gap:8px;padding:8px;font-size:.9rem;color:var(--muted)}
.cs-lkp-x{flex:none;width:30px;height:30px;border:0;border-radius:50%;background:var(--surface-2);color:var(--text,inherit);cursor:pointer;font-size:.9rem}
.cs-nt .cs-lkc{margin-top:8px}`;
  document.head.appendChild(css);
})();
