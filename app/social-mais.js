/* ChatMil — músicas e vídeos por conteúdo (para a aula ou a avaliação) e Vitrine educativa. Depende de social.js. */
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
  const abrirUrl = u => { if (A.abrirLink) return A.abrirLink(u); try { window.open(u, "_blank", "noopener"); } catch (e) { location.href = u; } };
  const tamanho = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB";

  /* ================= Músicas e vídeos por conteúdo =================
     Busca oficial do YouTube (chave restrita ao ChatMil). Resultados ficam guardados
     no aparelho e no Firestore (ytcache) para não gastar a cota com buscas repetidas. */
  const YT_KEY = "AIzaSyAPAKt1Lq_xI6cZsQ5M2c33CbLD_gbf8dA";
  const R = (() => { try { return JSON.parse(localStorage.getItem("cs.rec") || "{}"); } catch (e) { return {}; } })();
  function lembrarRec() { try { localStorage.setItem("cs.rec", JSON.stringify(R)); } catch (e) { } }
  const yt = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  const gg = (site, q) => "https://www.google.com/search?q=" + encodeURIComponent("site:" + site + " " + q);
  const YT = { res: {}, pend: {}, erro: {}, aba: { v: null, m: null } };
  const PARADAS = new Set("para com sem dos das de do da em no na os as um uma uns umas que por pelo pela e o a ao aos sobre entre como mais anos ano serie".split(" "));
  const palavras = t => semAc(t).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 4 && !PARADAS.has(w));
  const desHtml = t => { const x = document.createElement("textarea"); x.innerHTML = String(t || ""); return x.value; };
  const isoSeg = d => { const m = String(d || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
  const mmss = s => { s = Number(s); if (!isFinite(s)) s = 0; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  function categorias() {
    const ass = (R.assunto || "").trim(), disc = R.disciplina || "", ser = R.serie || "", fim = R.fim || "aula";
    const iniciais = /^[1-5]º ano/.test(ser), cie = /Ciências|Biologia|Física|Química/.test(disc), arte = /Arte|Língua|Inglesa/.test(disc);
    const v = [], m = [];
    if (fim === "aula") { v.push(["aula", "Videoaula", `${ass} ${disc} ${ser} aula`, 1]); v.push(["anim", "Animação", `${ass} animação educativa${iniciais ? " infantil" : ""}`, 0]); if (cie) v.push(["exp", "Experimento", `${ass} experimento sala de aula`, 1]); }
    if (fim === "revisao") { v.push(["res", "Resumo", `${ass} ${disc} resumo revisão ${ser}`, 1]); v.push(["mapa", "Mapa mental", `${ass} mapa mental`, 1]); }
    if (fim === "avaliacao") { v.push(["exe", "Exercícios resolvidos", `${ass} exercícios resolvidos ${ser}`, 1]); v.push(["com", "Questões comentadas", `${ass} questões comentadas ${disc}`, 1]); }
    v.push(["libras", "Em Libras", `${ass} em Libras`, 0]); v.push(["ad", "Audiodescrição", `${ass} audiodescrição`, 0]);
    m.push(["mus", "Música educativa", `música educativa ${ass}${iniciais ? " infantil" : ""}`, 0]); m.push(["par", "Paródia", `paródia ${ass} ${disc}`, 0]);
    if (arte) m.push(["can", "Canções sobre o tema", `canção ${ass}`, 0]);
    if (fim !== "aula") m.push(["mem", "Para memorizar", `música para memorizar ${ass}`, 0]);
    return { v, m };
  }
  function pontuar(it, kw, tipo) {
    const t = semAc(it.t + " " + (it.d || "")); let p = 0;
    kw.forEach(w => { if (t.includes(w)) p += 3; });
    if (it.s) { if (tipo === "musica" ? it.s <= 420 : it.s >= 120 && it.s <= 1800) p += 1.5; if (it.s < 60) p -= 3; }
    if (it.v) p += Math.min(2.5, Math.log10(it.v + 1) / 2);
    return p;
  }
  async function buscarYT(cat, tipo) {
    const q = cat[2].replace(/\s+/g, " ").trim(), k = semAc(q + (cat[3] ? " #edu" : "")).replace(/[^a-z0-9]+/g, "-").slice(0, 140);
    if (YT.res[k]) return YT.res[k]; if (YT.pend[k]) return YT.pend[k];
    const pr = (async () => {
      try { const c = JSON.parse(localStorage.getItem("cs.yt." + k) || "null"); if (c && Date.now() - c.ms < 7 * 864e5 && Array.isArray(c.itens)) return c.itens; } catch (e) { }
      try { const d = await fb.getDoc(D("ytcache", k)); if (d.exists()) { const x = d.data(); if (Date.now() - (x.ms || 0) < 21 * 864e5 && Array.isArray(x.itens) && x.itens.length) { try { localStorage.setItem("cs.yt." + k, JSON.stringify({ ms: Date.now(), itens: x.itens })); } catch (e) { } return x.itens; } } } catch (e) { }
      const p = new URLSearchParams({ part: "snippet", type: "video", maxResults: "15", regionCode: "BR", relevanceLanguage: "pt", safeSearch: "strict", videoEmbeddable: "true", q, key: YT_KEY });
      if (cat[3]) p.set("videoCategoryId", "27");
      const r = await fetch("https://www.googleapis.com/youtube/v3/search?" + p);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j.error && j.error.message) || "youtube " + r.status);
      let itens = (j.items || []).filter(i => i.id && i.id.videoId).map(i => ({ id: i.id.videoId, t: desHtml(i.snippet.title).slice(0, 140), c: desHtml(i.snippet.channelTitle).slice(0, 60), d: desHtml(i.snippet.description).slice(0, 160) }));
      if (itens.length) {
        try {
          const r2 = await fetch("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams({ part: "contentDetails,statistics", id: itens.map(x => x.id).join(","), key: YT_KEY }));
          const j2 = await r2.json(); const m = {}; (j2.items || []).forEach(v => m[v.id] = v);
          itens.forEach(x => { const v = m[x.id]; if (v) { x.s = isoSeg(v.contentDetails && v.contentDetails.duration); x.v = +((v.statistics && v.statistics.viewCount) || 0); } });
        } catch (e) { }
      }
      const kw = palavras(R.assunto || q);
      itens.forEach(x => x.p = pontuar(x, kw, tipo));
      const bons = itens.filter(x => !kw.length || kw.some(w => semAc(x.t + " " + x.d).includes(w)));
      itens = (bons.length >= 3 ? bons : itens).sort((a, b) => b.p - a.p).slice(0, 8).map(({ id, t, c, s, v }) => ({ id, t, c, s: s || 0, v: v || 0 }));
      try { localStorage.setItem("cs.yt." + k, JSON.stringify({ ms: Date.now(), itens })); } catch (e) { }
      if (itens.length) fb.setDoc(D("ytcache", k), { q: q.slice(0, 200), itens, ms: Date.now() }).catch(() => { });
      return itens;
    })();
    YT.pend[k] = pr;
    try { const it = await pr; YT.res[k] = it; delete YT.erro[k]; return it; }
    catch (e) { console.warn(e); YT.erro[k] = true; return null; }
    finally { delete YT.pend[k]; }
  }
  const chaveCat = cat => semAc(cat[2].replace(/\s+/g, " ").trim() + (cat[3] ? " #edu" : "")).replace(/[^a-z0-9]+/g, "-").slice(0, 140);
  function htmlLinha(lista, tipo, abaAtual) {
    const cat = lista.find(c => c[0] === abaAtual) || lista[0]; if (!cat) return "";
    const k = chaveCat(cat), itens = YT.res[k];
    if (!itens && !YT.pend[k] && !YT.erro[k]) buscarYT(cat, tipo).then(() => pintar());
    const chips = `<div class="chips cs-yt-chips">${lista.map(c => `<button class="chip" data-s="yt-aba" data-t="${tipo}" data-v="${c[0]}" aria-pressed="${c[0] === cat[0]}">${esc(c[1])}</button>`).join("")}</div>`;
    let corpo;
    if (YT.erro[k]) corpo = `<div class="card flat cs-yt-falha"><span>Sem resultados agora.</span><button class="btn sm" data-s="rc-abrir" data-v="${esc(yt(cat[2]))}">${KI.link} Buscar no YouTube</button></div>`;
    else if (!itens) corpo = `<div class="cs-yt-lista">${[0, 1, 2].map(() => `<div class="cs-ytc carregando"><span class="cs-ytc-img"></span><b></b><small></small></div>`).join("")}</div>`;
    else if (!itens.length) corpo = `<div class="card flat cs-yt-falha"><span>Nada encontrado.</span><button class="btn sm" data-s="rc-abrir" data-v="${esc(yt(cat[2]))}">${KI.link} Ver no YouTube</button></div>`;
    else corpo = `<div class="cs-yt-lista">${itens.map(x => `<button class="cs-ytc" data-s="yt-ver" data-v="${esc(x.id)}" data-n="${esc(x.t)}">
        <span class="cs-ytc-img"><img src="https://i.ytimg.com/vi/${esc(x.id)}/mqdefault.jpg" alt="" loading="lazy">${x.s ? `<i>${mmss(x.s)}</i>` : ""}</span>
        <b>${esc(x.t)}</b><small>${esc(x.c)}${x.v ? ` · ${x.v >= 1e6 ? (x.v / 1e6).toFixed(1).replace(".", ",") + " mi" : x.v >= 1e3 ? Math.round(x.v / 1e3) + " mil" : x.v} visualizações` : ""}</small></button>`).join("")}
        <button class="cs-ytc mais" data-s="rc-abrir" data-v="${esc(yt(cat[2]))}"><span class="cs-ytc-img">${KI.busca}</span><b>Ver mais no YouTube</b></button></div>`;
    return chips + corpo;
  }
  function vRecursos() {
    const discs = typeof DISCIPLINAS !== "undefined" ? DISCIPLINAS : [];
    const series = typeof SERIES !== "undefined" ? [...SERIES.EF, ...SERIES.EM] : [];
    const conts = R.disciplina && typeof conteudosDe === "function" ? conteudosDe(R.disciplina, "", R.serie || "") : [];
    const outro = !R.disciplina || R.outro || (R.assunto && !conts.includes(R.assunto));
    const tem = (R.assunto || "").trim() && R.buscou;
    const { v, m } = tem ? categorias() : { v: [], m: [] };
    const sites = tem ? [["Khan Academy", "https://pt.khanacademy.org/search?page_search_query=" + encodeURIComponent(R.assunto), "Aulas e exercícios gratuitos"],
      ["Nova Escola", gg("novaescola.org.br", R.assunto + " " + (R.serie || "")), "Planos de aula"], ["Brasil Escola", gg("brasilescola.uol.com.br", R.assunto), "Textos de apoio"],
      ["Portal MEC (recursos abertos)", gg("plataformaintegrada.mec.gov.br", R.assunto), "Recursos educacionais abertos"]] : [];
    return `<section class="card stack">
      <div class="grid2">
        <label class="f" for="rc-disc">Disciplina<select class="in" id="rc-disc"><option value="">Escolha…</option>${discs.map(d => `<option ${R.disciplina === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
        <label class="f" for="rc-serie">Série/ano<select class="in" id="rc-serie"><option value="">Todas</option>${series.map(d => `<option ${R.serie === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
      </div>
      ${R.disciplina && conts.length ? `<label class="f" for="rc-cont">Conteúdo<select class="in" id="rc-cont"><option value="">Escolha o conteúdo…</option>${conts.map(c => `<option ${!outro && R.assunto === c ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__outro" ${outro && R.disciplina ? "selected" : ""}>Outro (digitar)</option></select></label>` : ""}
      ${outro ? `<label class="f" for="rc-ass">${R.disciplina && conts.length ? "Digite o conteúdo" : "Conteúdo ou assunto"}<input class="in" id="rc-ass" value="${esc(R.assunto || "")}" placeholder="Ex.: frações, fotossíntese, Independência do Brasil"></label>` : ""}
      <div class="seg">${[["aula", "Para a aula"], ["revisao", "Revisão"], ["avaliacao", "Avaliação"]].map(([k, n]) => `<button data-s="rc-fim" data-v="${k}" aria-pressed="${(R.fim || "aula") === k}">${n}</button>`).join("")}</div>
      <button class="btn primary" data-s="rc-buscar">${KI.busca} Sugerir músicas e vídeos</button>
    </section>
    ${tem ? `<h2 class="cs-sec">${KI.play} Vídeos</h2>${htmlLinha(v, "video", YT.aba.v)}
      <h2 class="cs-sec">${KI.musica} Músicas</h2>${htmlLinha(m, "musica", YT.aba.m)}
      <h2 class="cs-sec">${KI.link} Sites educativos</h2><div class="stack" style="gap:8px">${sites.map(([n, u, sub]) => `<div class="card flat cs-rec">
        <span class="cs-rec-ic">${KI.link}</span><span class="cs-rec-t"><b>${esc(n)}</b><small>${esc(sub)}</small></span>
        <button class="cs-ico-bt" data-s="rc-abrir" data-v="${esc(u)}" aria-label="Abrir ${esc(n)}">${KI.link}</button>
        <button class="cs-ico-bt" data-s="rc-enviar" data-v="${esc(u)}" data-n="${esc(n)}" aria-label="Enviar para uma conversa">${KI.enviar}</button></div>`).join("")}</div>` : ""}`;
  }
  X.provasSub.push({ k: "recursos", n: "Músicas e vídeos", view: vRecursos });
  function lerRec() {
    const d = $("#rc-disc"), s = $("#rc-serie"), c = $("#rc-cont"), a = $("#rc-ass");
    if (d) R.disciplina = d.value; if (s) R.serie = s.value;
    if (c && c.value && c.value !== "__outro") { R.assunto = c.value; R.outro = false; }
    else if (a) R.assunto = a.value.trim();
    lembrarRec();
  }
  document.addEventListener("change", e => {
    const id = e.target.id; if (!["rc-disc", "rc-serie", "rc-cont"].includes(id)) return;
    if (id === "rc-cont") { if (e.target.value === "__outro") { R.outro = true; R.assunto = ""; } else { R.outro = false; R.assunto = e.target.value; } R.buscou = false; lembrarRec(); pintar(); return; }
    const a = $("#rc-ass"); if (a) R.assunto = a.value.trim();
    if (id === "rc-disc") { R.disciplina = e.target.value; R.outro = false; R.assunto = ""; } else R.serie = e.target.value;
    R.buscou = false; lembrarRec(); pintar();
  });
  X.acoes["rc-fim"] = el => { lerRec(); R.fim = el.dataset.v; YT.aba = { v: null, m: null }; lembrarRec(); pintar(); };
  X.acoes["rc-buscar"] = () => { lerRec(); if (!R.assunto) return toast("Escolha ou digite o conteúdo."); if (ofensivo(R.assunto)) return toast("Assunto não permitido."); R.buscou = true; YT.aba = { v: null, m: null }; lembrarRec(); pintar(); };
  X.acoes["yt-aba"] = el => { YT.aba[el.dataset.t === "musica" ? "m" : "v"] = el.dataset.v; pintar(); };
  X.acoes["rc-abrir"] = el => abrirUrl(el.dataset.v);
  X.acoes["rc-enviar"] = el => escolherConversa(`${el.dataset.n} — ${R.assunto}: ${el.dataset.v}`);
  /* player do YouTube dentro do app */
  X.acoes["yt-ver"] = el => {
    const id = el.dataset.v; if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return;
    const nome = el.dataset.n || "", url = "https://www.youtube.com/watch?v=" + id;
    const o = document.createElement("div"); o.className = "cs-ytp"; o.setAttribute("role", "dialog");
    o.innerHTML = `<div class="cs-ytp-top"><button class="cs-ico-bt" data-s="yt-fechar" aria-label="Fechar">${KI.fechar}</button><b>${esc(nome)}</b></div>
      <div class="cs-ytp-v"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="${esc(nome || "Vídeo")}"></iframe></div>
      <div class="cs-ytp-a"><button class="btn" data-s="rc-enviar" data-v="${esc(url)}" data-n="${esc(nome || "Vídeo")}">${KI.enviar} Enviar</button><button class="btn" data-s="rc-abrir" data-v="${esc(url)}">${KI.link} Abrir no YouTube</button></div>`;
    document.body.appendChild(o); document.body.classList.add("cs-vis-on"); X._ytp = o;
  };
  X.acoes["yt-fechar"] = () => { if (X._ytp) { X._ytp.remove(); X._ytp = null; document.body.classList.remove("cs-vis-on"); } };
  { const v0 = window.SENOV_voltar; window.SENOV_voltar = function () { if (X._ytp) { X.acoes["yt-fechar"](); return true; } return v0 ? v0.apply(this, arguments) : false; }; }
  function escolherConversa(texto) {
    if (X._ytp) X.acoes["yt-fechar"]();
    const lista = SO.chats.filter(c => c.tipo === "grupo" || c.ultima).slice(0, 30);
    if (!lista.length) { copiar(texto); return; }
    window.abrirSheet(`<div class="sheet-h"><h2>Enviar para…</h2></div><div class="cs-menu">${lista.map(c => { const t = A.tituloChat(c); return `<button data-s="rc-para" data-id="${esc(c.id)}">${t.av(40)}<span><b>${esc(t.nome)}</b></span></button>`; }).join("")}
      <button data-s="rc-copiar">${KI.copiar}<span><b>Só copiar o link</b></span></button></div>`);
    X._texto = texto;
  }
  X.acoes["rc-para"] = async el => { window.fecharSheet(); const ok = await enviarMsg(el.dataset.id, { texto: X._texto }); if (ok !== false) toast("Enviado!"); };
  X.acoes["rc-copiar"] = () => { window.fecharSheet(); copiar(X._texto); };

  /* ================= Vitrine: loja do professor =================
     Todos veem os produtos; "Comprar" leva direto ao site da loja (Hotmart, Shopee…).
     Só quem está em admins/{uid} (criado pelo console do Firebase) vê o Gerenciador. */
  const V = { itens: null, admin: false, q: "", cat: "tudo", un: null };
  const CATS = [["tudo", "Tudo"], ["promocoes", "Promoções"], ["meus", "Meus materiais"], ["cursos", "Cursos"], ["livros", "Livros"], ["materiais", "Materiais"], ["tecnologia", "Tecnologia"], ["eventos", "Eventos"]];
  const LOJAS = { hotmart: ["Hotmart", "#F04E23"], shopee: ["Shopee", "#EE4D2D"], kiwify: ["Kiwify", "#16A34A"], eduzz: ["Eduzz", "#2563EB"], amazon: ["Amazon", "#111827"], mercadolivre: ["Mercado Livre", "#CA8A04"], magalu: ["Magalu", "#0086FF"], outro: ["Loja", "#475569"] };
  function lojaDoLink(u) {
    const h = (String(u).match(/^https:\/\/([^/?#]+)/i) || [])[1] || ""; const x = h.toLowerCase();
    if (/hotmart|hotm\.art|pay\.hotmart/.test(x)) return "hotmart"; if (/shopee|shp\.ee/.test(x)) return "shopee"; if (/kiwify/.test(x)) return "kiwify";
    if (/eduzz|sun\.eduzz/.test(x)) return "eduzz"; if (/amazon|amzn/.test(x)) return "amazon"; if (/mercadoli|mercadolivre|meli\.la/.test(x)) return "mercadolivre"; if (/magazineluiza|magalu/.test(x)) return "magalu";
    return "outro";
  }
  const PROIBIDOS = ["aposta", "apostas", "bet", "cassino", "loteria", "jogo de azar", "bebida", "cerveja", "vinho", "vodka", "whisky", "cigarro", "vape", "tabaco", "arma", "armas", "municao", "sensual", "erotico", "adulto", "+18", "emprestimo", "consignado", "criptomoeda", "piramide", "candidato", "partido"];
  const naoEducativo = t => { const n = " " + semAc(t).replace(/[^a-z0-9+ ]/g, " ") + " "; return PROIBIDOS.some(p => n.includes(" " + p + " ")); };
  const chaveInt = () => "cs.vit." + eu();
  const interesses = () => { try { return JSON.parse(localStorage.getItem(chaveInt()) || "{}"); } catch (e) { return {}; } };
  function marcarInteresse(it) { const m = interesses(); (it.tags || []).concat(it.categoria || []).forEach(t => m[t] = (m[t] || 0) + 1); try { localStorage.setItem(chaveInt(), JSON.stringify(m)); } catch (e) { } }
  function ouvirVitrine() {
    if (V.un) return;
    V.un = fb.onSnapshot(fb.query(C("vitrine"), fb.orderBy("criadoEm", "desc"), fb.limit(200)), s => { V.itens = s.docs.map(d => ({ id: d.id, ...d.data() })); if (SO.tab === "vitrine" || (topo() && /^vit/.test(topo().v))) pintar(); },
      e => { console.warn(e); V.itens = []; pintar(); });
    fb.getDoc(D("admins", eu())).then(s => { V.admin = s.exists(); if (SO.tab === "vitrine") pintar(); }).catch(() => { });
  }
  X.aoTrocarUsuario.push(u => {
    if (V.un) { try { V.un(); } catch (e) { } } V.un = null; V.itens = null; V.admin = false; window.CS_IA_GEMINI = "";
    if (!u) return;
    fb.getDoc(D("admins", u.uid)).then(s => { V.admin = s.exists(); }).catch(() => { });
    /* IA gratuita configurada pela administração (vale para todos) */
    fb.getDoc(D("config", "ia")).then(s => { const k = s.exists() && s.data().gemini; if (k) { window.CS_IA_GEMINI = String(k); if (window.SENOV_iaPronta) window.SENOV_iaPronta(); } }).catch(() => { });
  });
  X.configExtra.push(() => `<h2 class="cs-sec">Vitrine</h2><div class="cs-menu card flat"><label class="cs-linha" for="vit-pers" style="display:flex;align-items:center;gap:12px"><span class="cs-lic">${KI.loja}</span><span style="flex:1"><b>Sugestões para mim</b></span><input type="checkbox" class="cs-sw" id="vit-pers" ${(SO.eu || {}).vitPers !== false ? "checked" : ""}></label></div>`);
  X.configExtra.push(() => V.admin ? `<h2 class="cs-sec">IA gratuita para todos (administração)</h2><form class="card flat stack" id="ia-adm-f" style="padding:12px">
      <p class="small muted">Cole a chave do Gemini criada em <b>aistudio.google.com</b> › Chaves de API. Ela liga a IA grátis (revisão de questões e provas inéditas) para todos no ChatMil. ${window.CS_IA_GEMINI ? "<b>Já está ligada.</b>" : ""}</p>
      <input class="in" id="ia-adm" type="password" autocomplete="off" placeholder="${window.CS_IA_GEMINI ? "Chave salva · cole outra para trocar" : "AIza..."}">
      <div class="row"><button class="btn primary" style="flex:1">Salvar para todos</button>${window.CS_IA_GEMINI ? `<button type="button" class="btn" data-s="ia-adm-tirar">Desligar</button>` : ""}</div></form>` : "");
  document.addEventListener("submit", async e => {
    if (e.target.id !== "ia-adm-f") return; e.preventDefault();
    const k = $("#ia-adm").value.trim(); if (!/^AIza[0-9A-Za-z_\-]{30,}$/.test(k)) return toast("Confira a chave (começa com AIza).");
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=5&key=" + encodeURIComponent(k));
      if (!r.ok) return toast("O Google recusou esta chave. Confira e tente de novo.");
      await fb.setDoc(D("config", "ia"), { gemini: k, em: TS() }); window.CS_IA_GEMINI = k; if (window.SENOV_iaPronta) window.SENOV_iaPronta();
      toast("IA gratuita ligada para todos."); pintar();
    } catch (er) { toast(msgErro(er)); }
  });
  X.acoes["ia-adm-tirar"] = async () => { try { await fb.deleteDoc(D("config", "ia")); window.CS_IA_GEMINI = ""; toast("IA gratuita desligada."); pintar(); } catch (e) { toast(msgErro(e)); } };
  function pontuar(it, pers) {
    let p = it.destaque ? 100 : 0; if (!pers) return p;
    const m = interesses(), eu_ = SO.eu || {}, tags = (it.tags || []).map(semAc);
    (eu_.disciplinas || []).forEach(d => { if (tags.includes(semAc(d))) p += 3; });
    (it.tags || []).forEach(t => p += Math.min(3, m[t] || 0) * 0.7);
    p += Math.min(2, m[it.categoria] || 0) * 0.5;
    if (it.promo || it.precoDe) p += 1.5;
    return p;
  }
  const hoje = () => new Date().toISOString().slice(0, 10);
  const visivel = it => it.ativo !== false && (!it.validade || it.validade >= hoje());
  function vVitrine() {
    ouvirVitrine();
    const eu_ = SO.eu || {}, pers = eu_.vitPers !== false, bloq = new Set(eu_.vitBloq || []);
    const q = semAc(V.q);
    let lista = (V.itens || []).filter(it => visivel(it)
      && !(it.tags || []).some(t => bloq.has(t)) && !bloq.has(it.categoria)
      && (V.cat === "tudo" || (V.cat === "promocoes" ? (it.promo || it.precoDe) : it.categoria === V.cat))
      && (!q || semAc([it.titulo, it.descricao, (it.tags || []).join(" "), (LOJAS[it.loja] || [""])[0]].join(" ")).includes(q)));
    lista = lista.map(it => ({ it, p: pontuar(it, pers) })).sort((a, b) => (b.p - a.p) || ((b.it.criadoEm && b.it.criadoEm.seconds || 0) - (a.it.criadoEm && a.it.criadoEm.seconds || 0))).map(x => x.it);
    return `<div class="cs-cab"><h1>Vitrine</h1>${V.admin ? `<button class="btn sm primary" data-s="vit-gerenciar">${KI.tag} Gerenciar</button>` : ""}</div>
      <label class="cs-busca">${KI.busca}<input id="vit-q" placeholder="Pesquisar cursos, livros, materiais…" value="${esc(V.q)}" aria-label="Pesquisar na vitrine"></label>
      <div class="chips cs-vit-cats">${CATS.map(([k, n]) => `<button class="chip" data-s="vit-cat" data-v="${k}" aria-pressed="${V.cat === k}">${n}</button>`).join("")}</div>
      ${V.itens == null ? `<div class="cs-carr"><div class="spin"></div></div>` : lista.length ? `<div class="cs-vit-grade">${lista.map(cardVit).join("")}</div>`
        : `<div class="empty"><b>${(V.itens || []).some(visivel) ? "Nada encontrado" : "Em breve"}</b>
          ${V.admin ? `<button class="btn primary" data-s="vit-novo">${KI.mais2} Cadastrar o primeiro produto</button>` : ""}</div>`}
      ${bloq.size ? `<button class="btn ghost" data-s="vit-bloqueados">${KI.ban} Assuntos que você escondeu (${bloq.size})</button>` : ""}`;
  }
  const num = p => { const m = String(p || "").replace(/\./g, "").replace(",", ".").match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
  function fotosVit(it, cls) {
    const l = (it.fotos || []).slice(0, 6);
    if (!l.length) return it.imagem ? `<span class="cs-vf-um ${cls || ""}"><img src="${esc(it.imagem)}" alt=""></span>` : `<span class="cs-vf-um vazio ${cls || ""}">${KI.loja}</span>`;
    return `<span class="cs-vf ${cls || ""}">${l.map((m, k) => `<button class="cs-pf" data-s="vit-foto" data-id="${esc(it.id)}" data-v="${k}" data-img="${esc(m.id)}" data-col="vitrineImgs" ${A.tinyOk(m.t) ? `style="background-image:url(${m.t})"` : ""} aria-label="Foto ${k + 1}"></button>`).join("")}</span>
      ${l.length > 1 ? `<span class="cs-vf-n">${l.length} fotos</span>` : ""}`;
  }
  function precoHtml(it) {
    const a = num(it.preco), d = num(it.precoDe), off = a && d > a ? Math.round((1 - a / d) * 100) : 0;
    return `${it.preco ? `<b class="cs-vit-preco">${esc(it.preco)}</b>` : ""}${it.precoDe ? `<s class="muted small">${esc(it.precoDe)}</s>` : ""}${off ? `<span class="pill cs-promo">-${off}%</span>` : it.promo ? `<span class="pill cs-promo">Promoção</span>` : ""}`;
  }
  function cardVit(it) {
    const lj = LOJAS[it.loja || lojaDoLink(it.link)] || LOJAS.outro;
    return `<article class="card cs-vit">
      <div class="cs-vit-midia">${fotosVit(it)}<span class="cs-loja" style="--c:${lj[1]}">${esc(lj[0])}</span></div>
      <div class="cs-vit-c">
        <h3>${esc(it.titulo)}</h3>
        <div class="cs-vit-pr">${precoHtml(it)}</div>
        ${it.descricao ? `<p class="cs-just cs-vit-desc" data-s="vit-desc">${esc(it.descricao)}</p>` : ""}
        <div class="row cs-vit-bts"><button class="btn primary" data-s="vit-abrir" data-id="${esc(it.id)}">${KI.loja} Comprar${lj[0] !== "Loja" ? " na " + esc(lj[0]) : ""}</button>
          <button class="cs-ico-bt" data-s="vit-partilhar" data-id="${esc(it.id)}" aria-label="Enviar para um colega">${KI.enviar}</button>
          <button class="cs-ico-bt" data-s="vit-menu" data-id="${esc(it.id)}" aria-label="Opções">${KI.mais}</button></div>
        ${it.validade ? `<small class="muted">Válido até ${esc(it.validade.split("-").reverse().join("/"))}</small>` : ""}
      </div></article>`;
  }
  X.tabs.push({ pos: 2, k: "vitrine", n: "Vitrine", i: KI.loja });
  X.tabViews.vitrine = vVitrine;
  X.acoes["vit-cat"] = el => { V.cat = el.dataset.v; pintar(); };
  X.acoes["vit-desc"] = el => el.classList.toggle("aberta");
  X.acoes["vit-foto"] = el => { const it = (V.itens || []).find(x => x.id === el.dataset.id); if (it && A.verFotos) A.verFotos(it.fotos, +el.dataset.v, "vitrineImgs"); };
  X.acoes["vit-abrir"] = el => {
    const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return; marcarInteresse(it);
    if (!/^https:\/\//.test(it.link || "")) return toast("Link indisponível.");
    abrirUrl(it.link);
    fb.updateDoc(D("vitrine", it.id), { cliques: fb.increment(1) }).catch(() => { });
  };
  X.acoes["vit-partilhar"] = el => { const it = (V.itens || []).find(x => x.id === el.dataset.id); if (it) escolherConversa(`${it.titulo}${it.preco ? " — " + it.preco : ""}\n${it.link}`); };
  X.acoes["vit-menu"] = el => {
    const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return;
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(it.titulo)}</h2></div><div class="cs-menu">
      ${V.admin ? `<button data-s="vit-editar" data-id="${esc(it.id)}">${KI.tag}<span><b>Editar produto</b></span></button>` : ""}
      <button data-s="copiar" data-v="${esc(it.link)}">${KI.copiar}<span><b>Copiar link</b></span></button>
      ${(it.tags || []).concat(it.categoria ? [it.categoria] : []).map(t => `<button data-s="vit-esconder" data-v="${esc(t)}">${KI.ban}<span><b>Não mostrar “${esc((CATS.find(c => c[0] === t) || [, t])[1])}”</b><small>Esconde todos os produtos deste assunto</small></span></button>`).join("")}
      ${V.admin ? "" : `<button data-s="denunciar" data-tipo="vitrine" data-uid="" data-id="${esc(it.id)}">${KI.ban}<span><b>Denunciar</b><small>Conteúdo que não combina com a escola</small></span></button>`}</div>`);
  };
  async function salvarPrefs(patch) { try { await fb.updateDoc(D("users", eu()), patch); } catch (e) { toast(msgErro(e)); } }
  X.acoes["vit-esconder"] = async el => { window.fecharSheet(); await salvarPrefs({ vitBloq: fb.arrayUnion(el.dataset.v) }); toast("Assunto escondido. Você pode desfazer no fim da Vitrine."); };
  X.acoes["vit-bloqueados"] = () => {
    const b = (SO.eu && SO.eu.vitBloq) || [];
    window.abrirSheet(`<div class="sheet-h"><h2>Assuntos escondidos</h2></div><div class="cs-menu">${b.map(t => `<button data-s="vit-mostrar" data-v="${esc(t)}">${KI.tag}<span><b>${esc((CATS.find(c => c[0] === t) || [, t])[1])}</b><small>Toque para voltar a mostrar</small></span></button>`).join("")}</div>`);
  };
  X.acoes["vit-mostrar"] = async el => { window.fecharSheet(); await salvarPrefs({ vitBloq: fb.arrayRemove(el.dataset.v) }); };
  document.addEventListener("input", e => { if (e.target.id === "vit-q") { V.q = e.target.value; clearTimeout(V.t); V.t = setTimeout(pintar, 250); } });
  document.addEventListener("change", e => { if (e.target.id === "vit-pers") salvarPrefs({ vitPers: e.target.checked }); });

  /* ---- Gerenciador (só administradores) ---- */
  X.acoes["vit-gerenciar"] = () => abrirTela({ v: "vit-ger" });
  X.views["vit-ger"] = () => {
    ouvirVitrine();
    if (!V.admin) return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${KI.ant}</button><b>Gerenciar vitrine</b></header><div class="empty"><b>Área do administrador</b></div>`;
    const l = (V.itens || []).slice().sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
    const ativos = l.filter(visivel).length, cliq = l.reduce((t, x) => t + (x.cliques || 0), 0);
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${KI.ant}</button><b>Gerenciar vitrine</b></header>
      <div class="cs-pag stack">
        <div class="cs-vg-num"><div><b>${l.length}</b><span>produtos</span></div><div><b>${ativos}</b><span>à mostra</span></div><div><b>${cliq}</b><span>cliques em Comprar</span></div></div>
        <button class="btn primary cs-grande" data-s="vit-novo">${KI.mais2} Novo produto</button>
        ${l.length ? `<div class="stack" style="gap:8px">${l.map(it => { const lj = LOJAS[it.loja || lojaDoLink(it.link)] || LOJAS.outro, f = (it.fotos || [])[0];
          return `<div class="card flat cs-vg-it ${visivel(it) ? "" : "off"}">
            <span class="cs-vg-th">${f ? `<button class="cs-pf" data-img="${esc(f.id)}" data-col="vitrineImgs" ${A.tinyOk(f.t) ? `style="background-image:url(${f.t})"` : ""} tabindex="-1" aria-hidden="true"></button>` : it.imagem ? `<img src="${esc(it.imagem)}" alt="">` : KI.loja}</span>
            <span class="cs-vg-t"><b>${it.destaque ? "★ " : ""}${esc(it.titulo)}</b><small><i class="cs-loja-pt" style="--c:${lj[1]}"></i>${esc(lj[0])}${it.preco ? " · " + esc(it.preco) : ""} · ${it.cliques || 0} clique${(it.cliques || 0) === 1 ? "" : "s"}${it.ativo === false ? " · pausado" : !visivel(it) ? " · vencido" : ""}</small></span>
            <button class="cs-ico-bt sm" data-s="vit-gmenu" data-id="${esc(it.id)}" aria-label="Opções do produto">${KI.mais}</button></div>`; }).join("")}</div>`
        : `<p class="muted small">Nenhum produto ainda. Cadastre links da Hotmart, Shopee e outras lojas: quem tocar em Comprar vai direto para a página de compra.</p>`}
      </div>`;
  };
  X.acoes["vit-gmenu"] = el => {
    const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return;
    window.abrirSheet(`<div class="sheet-h"><h2>${esc(it.titulo)}</h2></div><div class="cs-menu">
      <button data-s="vit-editar" data-id="${esc(it.id)}">${KI.tag}<span><b>Editar</b><small>Fotos, preço, descrição e link</small></span></button>
      <button data-s="vit-pausar" data-id="${esc(it.id)}">${KI.ban}<span><b>${it.ativo === false ? "Voltar a mostrar" : "Pausar (esconder)"}</b><small>${it.ativo === false ? "O produto volta para a vitrine" : "Some da vitrine sem apagar"}</small></span></button>
      <button data-s="vit-destacar" data-id="${esc(it.id)}">${KI.tag}<span><b>${it.destaque ? "Tirar do topo" : "Destacar no topo"}</b></span></button>
      <button data-s="vit-duplicar" data-id="${esc(it.id)}">${KI.copiar}<span><b>Duplicar</b><small>Cria uma cópia para editar</small></span></button>
      <button data-s="rc-abrir" data-v="${esc(it.link)}">${KI.link}<span><b>Testar o link</b></span></button>
      <button class="perigo" data-s="vit-remover" data-id="${esc(it.id)}">${KI.lixo}<span><b>Apagar produto</b></span></button></div>`);
  };
  X.acoes["vit-pausar"] = async el => { window.fecharSheet(); const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return; try { await fb.updateDoc(D("vitrine", it.id), { ativo: it.ativo === false, atualizadoEm: TS() }); toast(it.ativo === false ? "Produto à mostra." : "Produto pausado."); } catch (e) { toast(msgErro(e)); } };
  X.acoes["vit-destacar"] = async el => { window.fecharSheet(); const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return; try { await fb.updateDoc(D("vitrine", it.id), { destaque: !it.destaque, atualizadoEm: TS() }); } catch (e) { toast(msgErro(e)); } };
  X.acoes["vit-remover"] = async el => {
    window.fecharSheet(); const it = (V.itens || []).find(x => x.id === el.dataset.id); if (!it) return;
    if (!el.dataset.ok) { window.abrirSheet(`<div class="sheet-h"><h2>Apagar “${esc(it.titulo)}”?</h2></div><p class="cs-just">O produto e as fotos serão apagados.</p><div class="row"><button class="btn" data-s="fechar" style="flex:1">Cancelar</button><button class="btn cs-perigo-f" data-s="vit-remover" data-id="${esc(it.id)}" data-ok="1" style="flex:1">Apagar</button></div>`); return; }
    try { await fb.deleteDoc(D("vitrine", it.id)); (it.fotos || []).forEach(f => { fb.deleteDoc(D("vitrineImgs", f.id + "m")).catch(() => { }); if (f.f) fb.deleteDoc(D("vitrineImgs", f.id + "f")).catch(() => { }); }); toast("Produto apagado."); } catch (e) { toast(msgErro(e)); }
  };

  /* ---- editor de produto ---- */
  const NV = { id: null, fotos: [], novas: [], base: null };
  function abrirEditor(it, copia) {
    NV.id = copia ? null : (it ? it.id : null); NV.base = it || null;
    NV.fotos = it && !copia ? (it.fotos || []).slice() : []; NV.novas = [];
    abrirTela({ v: "vit-ed" });
  }
  X.acoes["vit-novo"] = () => abrirEditor(null);
  X.acoes["vit-editar"] = el => { window.fecharSheet(); abrirEditor((V.itens || []).find(x => x.id === el.dataset.id)); };
  X.acoes["vit-duplicar"] = el => { window.fecharSheet(); const it = (V.itens || []).find(x => x.id === el.dataset.id); if (it) abrirEditor({ ...it, titulo: it.titulo + " (cópia)" }, true); };
  X.views["vit-ed"] = () => {
    const it = NV.base || {}, lj = it.loja || (it.link ? lojaDoLink(it.link) : "hotmart");
    return `<header class="cs-chat-h"><button class="cs-ico-bt" data-s="voltar" aria-label="Voltar">${KI.ant}</button><b>${NV.id ? "Editar produto" : "Novo produto"}</b></header>
    <form class="cs-pag stack" id="vit-f" novalidate>
      <label class="f" for="vn-link">Link de compra<input class="in" id="vn-link" type="url" inputmode="url" value="${esc(it.link || "")}" placeholder="https://pay.hotmart.com/… ou https://shopee.com.br/…"></label>
      <p class="small muted" style="margin-top:-6px">Use o link que leva direto para finalizar a compra (Hotmart: link de checkout <b>pay.hotmart.com</b>; Shopee: link do produto).</p>
      <label class="f" for="vn-loja">Loja<select class="in" id="vn-loja">${Object.entries(LOJAS).map(([k, [n]]) => `<option value="${k}" ${lj === k ? "selected" : ""}>${n === "Loja" ? "Outra loja" : n}</option>`).join("")}</select></label>
      <label class="f" for="vn-tit">Nome do produto<input class="in" id="vn-tit" maxlength="120" value="${esc(it.titulo || "")}" placeholder="Ex.: Kit de atividades de alfabetização"></label>
      <div class="f"><span>Fotos (até 6; a 1ª é a capa)</span><div class="cs-pc-fotos" id="vn-fotos">${htmlFotosEd()}</div>
        <button type="button" class="btn sm" data-s="vn-addfoto">${KI.img} Adicionar fotos</button></div>
      <div class="grid2"><label class="f" for="vn-preco">Preço<input class="in" id="vn-preco" maxlength="40" value="${esc(it.preco || "")}" placeholder="R$ 49,90"></label>
        <label class="f" for="vn-de">Preço antigo (opcional)<input class="in" id="vn-de" maxlength="40" value="${esc(it.precoDe || "")}" placeholder="R$ 79,90"></label></div>
      <label class="f" for="vn-desc">Descrição<textarea class="in" id="vn-desc" maxlength="1500" rows="5" placeholder="O que vem no material, para qual série, formato (PDF, livro físico…)">${esc(it.descricao || "")}</textarea></label>
      <div class="grid2"><label class="f" for="vn-cat">Categoria<select class="in" id="vn-cat">${CATS.slice(2).map(([k, n]) => `<option value="${k}" ${(it.categoria || "meus") === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="f" for="vn-val">Válido até (opcional)<input class="in" id="vn-val" type="date" value="${esc(it.validade || "")}"></label></div>
      <label class="f" for="vn-tags">Assuntos (separe por vírgula)<input class="in" id="vn-tags" value="${esc((it.tags || []).join(", "))}" placeholder="Ex.: Língua Portuguesa, alfabetização, AEE"></label>
      <label class="cs-aceite" for="vn-dest"><input type="checkbox" id="vn-dest" ${it.destaque ? "checked" : ""}><span>Destacar no topo da vitrine</span></label>
      <label class="cs-aceite" for="vn-ativo"><input type="checkbox" id="vn-ativo" ${it.ativo === false ? "" : "checked"}><span>Mostrar na vitrine</span></label>
      <p class="small muted">Só entram produtos ligados à educação.</p>
      <div class="cs-pc-prog" id="vn-prog" hidden><i></i></div>
      <button class="btn primary cs-grande" id="vn-ok">${NV.id ? "Salvar alterações" : "Publicar na vitrine"}</button></form>`;
  };
  function htmlFotosEd() {
    const a = NV.fotos.map((f, k) => `<span class="cs-pc-f"><button type="button" class="cs-pf" data-img="${esc(f.id)}" data-col="vitrineImgs" ${A.tinyOk(f.t) ? `style="background-image:url(${f.t})"` : ""} tabindex="-1"></button>${k === 0 ? `<i class="cs-capa-tag">Capa</i>` : `<button type="button" class="cs-pc-capa" data-s="vn-capa" data-v="v${k}">Capa</button>`}<button type="button" data-s="vn-tirar" data-v="v${k}" aria-label="Tirar foto">×</button></span>`);
    const b = NV.novas.map((f, k) => `<span class="cs-pc-f"><img src="${f.url}" alt="">${!NV.fotos.length && k === 0 ? `<i class="cs-capa-tag">Capa</i>` : `<button type="button" class="cs-pc-capa" data-s="vn-capa" data-v="n${k}">Capa</button>`}<button type="button" data-s="vn-tirar" data-v="n${k}" aria-label="Tirar foto">×</button></span>`);
    return a.concat(b).join("");
  }
  const pintarFotosEd = () => { const el = $("#vn-fotos"); if (el) el.innerHTML = htmlFotosEd(); };
  X.acoes["vn-addfoto"] = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
    inp.onchange = () => {
      const vagas = 6 - NV.fotos.length - NV.novas.length, fs = [...(inp.files || [])].slice(0, Math.max(0, vagas));
      if ((inp.files || []).length > vagas) toast("Até 6 fotos por produto.");
      fs.forEach(f => { const prep = A.prepararFotoPost(f); prep.catch(() => { }); NV.novas.push({ url: URL.createObjectURL(f), prep }); }); pintarFotosEd();
    };
    inp.click();
  };
  X.acoes["vn-tirar"] = el => { const v = el.dataset.v, k = +v.slice(1); if (v[0] === "v") NV.fotos.splice(k, 1); else { const f = NV.novas.splice(k, 1)[0]; if (f) URL.revokeObjectURL(f.url); } pintarFotosEd(); };
  X.acoes["vn-capa"] = el => {
    const v = el.dataset.v, k = +v.slice(1);
    if (v[0] === "v") { const f = NV.fotos.splice(k, 1)[0]; NV.fotos.unshift(f); }
    else { const f = NV.novas.splice(k, 1)[0]; NV.novas.unshift(f); NV.capaNova = true; }
    pintarFotosEd();
  };
  document.addEventListener("input", e => { if (e.target.id === "vn-link") { const l = $("#vn-loja"); if (l && /^https:\/\/\S+\.\S+/.test(e.target.value.trim())) l.value = lojaDoLink(e.target.value.trim()); } });
  document.addEventListener("submit", async e => {
    if (e.target.id !== "vit-f") return; e.preventDefault();
    const ok = $("#vn-ok"); if (ok.disabled) return;
    const tit = $("#vn-tit").value.trim(), desc = $("#vn-desc").value.trim(), link = $("#vn-link").value.trim();
    const tags = $("#vn-tags").value.split(",").map(t => t.trim()).filter(Boolean).slice(0, 8);
    const tudo = [tit, desc, tags.join(" ")].join(" ");
    if (!/^https:\/\/[^\s]+\.[^\s]+/.test(link)) return toast("Cole o link de compra (começa com https://).");
    if (tit.length < 4) return toast("Dê um nome ao produto.");
    if (ofensivo(tudo) || naoEducativo(tudo)) return toast("Produto recusado: o assunto não combina com o meio educativo.");
    ok.disabled = true; const prog = $("#vn-prog");
    const ref = NV.id ? D("vitrine", NV.id) : fb.doc(C("vitrine")), novas = [], criadas = [];
    try {
      if (NV.novas.length && prog) prog.hidden = false;
      for (let k = 0; k < NV.novas.length; k++) {
        ok.textContent = `Enviando foto ${k + 1} de ${NV.novas.length}…`;
        const r = await NV.novas[k].prep, iid = ref.id + "_" + Date.now().toString(36) + k;
        await fb.setDoc(D("vitrineImgs", iid + "m"), { dono: eu(), d: fb.Bytes.fromUint8Array(new Uint8Array(await r.m.arrayBuffer())), em: TS() }); criadas.push(iid + "m");
        if (r.f) { await fb.setDoc(D("vitrineImgs", iid + "f"), { dono: eu(), d: fb.Bytes.fromUint8Array(new Uint8Array(await r.f.arrayBuffer())), em: TS() }); criadas.push(iid + "f"); }
        novas.push({ id: iid, w: r.w, h: r.h, t: r.t, f: !!r.f });
        if (prog) prog.firstElementChild.style.width = Math.round((k + 1) / NV.novas.length * 100) + "%";
      }
      const fotos = (NV.capaNova ? novas.concat(NV.fotos) : NV.fotos.concat(novas)).slice(0, 6);
      const dados = { titulo: tit, descricao: desc, link, loja: $("#vn-loja").value, categoria: $("#vn-cat").value, tags, preco: $("#vn-preco").value.trim(), precoDe: $("#vn-de").value.trim(),
        promo: !!$("#vn-de").value.trim(), validade: $("#vn-val").value || "", fotos, destaque: $("#vn-dest").checked, ativo: $("#vn-ativo").checked, atualizadoEm: TS() };
      if (NV.id) await fb.updateDoc(ref, dados);
      else await fb.setDoc(ref, { ...dados, imagem: null, autor: eu(), criadoEm: TS(), cliques: 0 });
      /* fotos tiradas na edição: apaga do servidor */
      if (NV.id && NV.base) (NV.base.fotos || []).filter(f => !fotos.some(x => x.id === f.id)).forEach(f => { fb.deleteDoc(D("vitrineImgs", f.id + "m")).catch(() => { }); if (f.f) fb.deleteDoc(D("vitrineImgs", f.id + "f")).catch(() => { }); });
      NV.novas.forEach(f => URL.revokeObjectURL(f.url)); NV.novas = []; NV.capaNova = false;
      toast(NV.id ? "Produto atualizado." : "Produto publicado na vitrine."); voltar();
    } catch (er) {
      criadas.forEach(id => fb.deleteDoc(D("vitrineImgs", id)).catch(() => { }));
      ok.disabled = false; ok.textContent = NV.id ? "Salvar alterações" : "Publicar na vitrine"; if (prog) prog.hidden = true;
      toast(er && er.msg ? er.msg : msgErro(er));
    }
  });

  /* ================= Estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
body.cs-5abas .nav-in{grid-template-columns:repeat(5,1fr);max-width:680px}
body.cs-5abas .nav button{font-size:.7rem;padding-inline:2px}
body.cs-5abas .nav .ico{padding:3px 12px}
.cs-rec{display:flex;align-items:center;gap:12px;padding:10px 12px}
.cs-rec-ic{width:42px;height:42px;border-radius:12px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;flex:none}
.cs-rec-ic svg{width:22px;height:22px}
.cs-rec-t{flex:1;min-width:0;display:flex;flex-direction:column}
.cs-rec-t small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-vit-grade{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:620px){.cs-vit-grade{grid-template-columns:1fr 1fr}}
.cs-vit{display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden}
.cs-vit-midia{position:relative}
.cs-vf{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;aspect-ratio:4/3;background:var(--surface-2)}
.cs-vf .cs-pf{flex:none;width:100%;height:100%;scroll-snap-align:start}
.cs-vf-um{display:grid;place-items:center;aspect-ratio:4/3;background:var(--surface-2);color:var(--primary)}.cs-vf-um img{width:100%;height:100%;object-fit:cover}.cs-vf-um svg{width:40px;height:40px}
.cs-vf-n{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.6);color:#fff;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px}
.cs-loja{position:absolute;left:10px;top:10px;background:var(--c);color:#fff;font-weight:800;font-size:.74rem;padding:3px 10px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.cs-vit-c{display:flex;flex-direction:column;gap:8px;padding:12px 14px 14px}
.cs-vit-c h3{margin:0;font-size:1.05rem;line-height:1.3}
.cs-vit-pr{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.cs-vit-preco{font-size:1.25rem;color:var(--ink)}
.cs-vit-desc{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:0;cursor:pointer}
.cs-vit-desc.aberta{-webkit-line-clamp:unset;display:block}
.cs-vit-bts{gap:6px;flex-wrap:nowrap}.cs-vit-bts .btn{flex:1}
.cs-vg-num{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.cs-vg-num>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 4px;display:flex;flex-direction:column}
.cs-vg-num b{font-size:1.3rem}.cs-vg-num span{font-size:.76rem;color:var(--muted)}
.cs-vg-it{display:flex;align-items:center;gap:10px;padding:8px 10px}
.cs-vg-it.off{opacity:.55}
.cs-vg-th{width:58px;height:58px;border-radius:10px;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--surface-2);color:var(--primary)}
.cs-vg-th .cs-pf{width:100%;height:100%}.cs-vg-th img{width:100%;height:100%;object-fit:cover}.cs-vg-th svg{width:24px;height:24px}
.cs-vg-t{flex:1;min-width:0;display:flex;flex-direction:column}.cs-vg-t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-vg-t small{color:var(--muted);font-size:.78rem}
.cs-loja-pt{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:5px}
.cs-pc-f .cs-pf{width:100%;height:100%}
.cs-pc-capa{position:absolute!important;left:4px;bottom:4px;top:auto!important;right:auto!important;width:auto!important;height:22px!important;border-radius:999px!important;font-size:.66rem;font-weight:700;padding:0 8px!important}
.cs-pc-f .cs-capa-tag{position:absolute;left:4px;bottom:4px;background:#2447C6;color:#fff;font-style:normal;font-weight:800;font-size:.66rem;padding:2px 8px;border-radius:999px}
.cs-promo{background:#FEE2E2;color:#B91C1C}
.cs-vit-cats{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.cs-vit-cats .chip{flex:none}
.cs-sec svg{width:18px;height:18px;vertical-align:-3px;color:var(--primary)}
.cs-yt-chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}.cs-yt-chips .chip{flex:none}
.cs-yt-lista{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;scrollbar-width:none;margin:0 -2px}
.cs-ytc{flex:none;width:210px;scroll-snap-align:start;display:flex;flex-direction:column;gap:4px;text-align:left;background:none;border:0;padding:2px;cursor:pointer;color:var(--ink);font:inherit}
.cs-ytc-img{position:relative;display:grid;place-items:center;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:var(--surface-2);color:var(--primary)}
.cs-ytc-img img{width:100%;height:100%;object-fit:cover;display:block}
.cs-ytc-img i{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.78);color:#fff;font-style:normal;font-size:.72rem;font-weight:700;padding:1px 6px;border-radius:6px}
.cs-ytc-img svg{width:28px;height:28px}
.cs-ytc b{font-size:.86rem;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cs-ytc small{color:var(--muted);font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-ytc.mais{width:130px}.cs-ytc.mais b{text-align:center}
.cs-ytc.carregando .cs-ytc-img,.cs-ytc.carregando b,.cs-ytc.carregando small{background:linear-gradient(90deg,var(--surface-2),var(--line),var(--surface-2));background-size:200% 100%;animation:csbrilho 1.2s infinite linear;border-radius:8px}
.cs-ytc.carregando b{height:14px;width:90%}.cs-ytc.carregando small{height:10px;width:60%}
@keyframes csbrilho{from{background-position:200% 0}to{background-position:-200% 0}}
.cs-yt-falha{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 12px;flex-wrap:wrap}
.cs-ytp{position:fixed;inset:0;z-index:300;background:#000;display:flex;flex-direction:column}
.cs-ytp-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;color:#fff}
.cs-ytp-top b{flex:1;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-ytp .cs-ico-bt{color:#fff;background:rgba(255,255,255,.12)}
.cs-ytp-v{flex:1;display:grid;place-items:center}
.cs-ytp-v iframe{width:100%;aspect-ratio:16/9;max-height:100%;border:0}
.cs-ytp-a{display:flex;gap:8px;padding:10px 12px calc(14px + env(safe-area-inset-bottom,0px))}.cs-ytp-a .btn{flex:1}
`;
  document.head.appendChild(css);

  /* ================= Acabamento visual: botões compactos e modernos (só no app) ================= */
  const acab = document.createElement("style");
  acab.textContent = `
body.cs-on .btn{min-height:42px;padding:0 16px;border-radius:12px;font-size:.94rem;font-weight:650;gap:6px;letter-spacing:.005em;
  transition:background-color .15s,border-color .15s,box-shadow .15s,transform .08s;box-shadow:0 1px 2px rgba(16,24,40,.06)}
body.cs-on .btn:active{transform:scale(.97)}
body.cs-on .btn:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
body.cs-on .btn.primary{background:linear-gradient(180deg,color-mix(in srgb,var(--primary) 88%,#fff),var(--primary));
  box-shadow:0 1px 2px rgba(16,24,40,.14),0 4px 12px -4px color-mix(in srgb,var(--primary) 55%,transparent),inset 0 1px 0 rgba(255,255,255,.18)}
body.cs-on .btn.ghost{box-shadow:none}
body.cs-on .btn.sm{min-height:34px;padding:0 12px;font-size:.84rem;border-radius:10px}
body.cs-on .btn svg{width:18px;height:18px}
body.cs-on .btn.sm svg{width:16px;height:16px}
body.cs-on .cs-grande{min-height:48px;font-size:.98rem;border-radius:14px}
body.cs-on .cs-ico-bt{width:42px;height:42px}
body.cs-on .cs-ico-bt svg{width:22px;height:22px}
body.cs-on .cs-ico-bt.sm{width:34px;height:34px}
body.cs-on .cs-compor .cs-ico-bt{width:42px;height:42px}
body.cs-on .cs-env{width:46px;height:46px;min-height:46px}
body.cs-on .cs-compor .in{min-height:46px;padding:11px 15px}
body.cs-on .chip{padding:6px 12px;font-size:.83rem}
body.cs-on .seg{padding:3px;gap:3px;border-radius:11px}
body.cs-on .seg button{min-height:34px;font-size:.88rem;border-radius:8px}
body.cs-on .cs-menu>button,body.cs-on .cs-menu>.cs-linha,body.cs-on .cs-menu>label{min-height:52px;padding:9px 10px;gap:12px;font-size:.97rem}
body.cs-on .cs-menu>button>svg:first-child,body.cs-on .cs-menu>label>svg:first-child{width:21px;height:21px}
body.cs-on .cs-atalhos{grid-template-columns:repeat(3,1fr);gap:6px}
body.cs-on .cs-atalhos button{flex-direction:row;justify-content:center;min-height:42px;padding:6px 8px;gap:6px;border-radius:12px;font-size:.8rem;line-height:1.15}
body.cs-on .cs-atalhos button svg{width:18px;height:18px;flex:none}
body.cs-on .cs-fab{width:54px;height:54px;border-radius:17px}
body.cs-on .cs-fab svg{width:24px;height:24px}
body.cs-on .cs-perfil-bt .btn{max-width:200px}
body.cs-on .cs-clip-g{gap:6px}
body.cs-on .cs-clip-g button{padding:10px 4px;gap:6px;font-size:.84rem;border-radius:14px}
body.cs-on .cs-clip-g button span{width:40px;height:40px}
body.cs-on .cs-clip-g button svg{width:20px;height:20px}
body.cs-on .cs-vis-acoes button{min-height:48px;font-size:.74rem}
body.cs-on .cs-vis-acoes svg{width:22px;height:22px}
body.cs-on .cs-vbt{min-width:42px;height:42px;border-radius:11px}
body.cs-on .cs-vbt svg{width:22px;height:22px}
body.cs-on .cs-grav-bt{width:48px;height:48px}
body.cs-on .cs-grav-bt.env{width:54px;height:54px}
body.cs-on .cs-aud-play{width:40px;height:40px}
body.cs-on .cs-aud-play svg{width:19px;height:19px}
body.cs-on .cs-aud-r{padding-left:48px}
body.cs-on .nav button{font-size:.7rem}
@media (prefers-reduced-motion:reduce){body.cs-on .btn{transition:none}body.cs-on .btn:active{transform:none}}
`;
  document.head.appendChild(acab);
})();
