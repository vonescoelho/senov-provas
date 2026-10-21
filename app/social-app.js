/* ChatMil — Atualização do aplicativo pelas Configurações.
   No Android: confere a última versão publicada (GitHub, apk-vN), mostra um aviso pequeno e
   baixa/instala pelo próprio app (o Android pede só a confirmação "Atualizar").
   Na versão web (PWA) o app já se atualiza sozinho; aqui só aparece a versão e o botão de recarregar. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, ic, esc, toast, pintar } = A;
  const $ = s => document.querySelector(s);
  const REL = "https://api.github.com/repos/vonescoelho/senov-provas/releases?per_page=8";
  const PREFIXO = "https://github.com/vonescoelho/senov-provas/releases/download/";
  const Cap = window.Capacitor;
  const NATIVO = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  let NTP = null;
  try { if (NATIVO) NTP = (window.capacitorExports && capacitorExports.registerPlugin) ? capacitorExports.registerPlugin("Nativo") : Cap.registerPlugin("Nativo"); } catch (e) { }
  const I = {
    seta: ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    app: ic('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>')
  };
  const AT = { instalada: 0, nome: "", nova: null, conferido: 0, conferindo: false, baixando: false, prog: 0, erro: "" };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

  async function conferir(forcar) {
    if (AT.conferindo) return;
    const cache = lerLS("cs.app.rel", null);
    if (!forcar && cache && Date.now() - cache.em < 3 * 3600e3) { AT.nova = cache.nova; AT.conferido = cache.em; return; }
    AT.conferindo = true; AT.erro = "";
    try {
      const r = await fetch(REL, { headers: { Accept: "application/vnd.github+json" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const lista = await r.json(); let melhor = null;
      for (const rel of lista) {
        if (rel.draft || rel.prerelease) continue;
        const m = /^apk-v(\d+)$/.exec(rel.tag_name || ""); if (!m) continue;
        const ap = (rel.assets || []).find(a => /\.apk$/.test(a.name || ""));
        if (!ap || !String(ap.browser_download_url).startsWith(PREFIXO)) continue;
        const v = +m[1];
        if (!melhor || v > melhor.versao) melhor = { versao: v, url: ap.browser_download_url, tamanho: ap.size || 0, em: rel.published_at || "" };
      }
      AT.nova = melhor; AT.conferido = Date.now(); gravarLS("cs.app.rel", { em: AT.conferido, nova: melhor });
    } catch (e) { console.warn("atualização", e); AT.erro = "Não deu para conferir agora. Veja a internet e tente de novo."; }
    const antes = AT.conferindo; AT.conferindo = false; if (antes && SO.user) pintar();
  }
  const temNova = () => !!(NATIVO && AT.nova && AT.instalada && AT.nova.versao > AT.instalada);
  const mb = n => (n / 1048576).toFixed(1).replace(".", ",") + " MB";

  /* ---------- início: versão instalada e aviso discreto ---------- */
  async function iniciar() {
    if (NTP) {
      try {
        const v = await NTP.versao(); AT.instalada = v.codigo || 0; AT.nome = v.nome || "";
        if (v.pedido) setTimeout(() => sheetAtualizar(), 800);
        NTP.addListener("atualizar", () => sheetAtualizar());
        NTP.addListener("atualizacaoProgresso", p => { AT.prog = p.total > 0 ? p.lido / p.total : 0; const b = $("#at-prog i"); if (b) b.style.width = Math.round(AT.prog * 100) + "%"; const t = $("#at-prog-t"); if (t) t.textContent = p.total > 0 ? `${mb(p.lido)} de ${mb(p.total)}` : mb(p.lido); });
      } catch (e) { console.warn(e); }
    }
    await conferir(false); pintar();
    setInterval(() => conferir(false), 3 * 3600e3);
  }
  /* só confere depois de entrar (e só no app Android, que é onde há o que instalar) */
  let iniciado = false;
  X.aoTrocarUsuario.push(u => { if (u && !iniciado && NATIVO) { iniciado = true; setTimeout(iniciar, 2500); } });

  X.avisos.push(() => {
    if (!temNova() || lerLS("cs.app.dispensou", 0) >= AT.nova.versao) return "";
    return `<div class="aviso cs-at-av">${I.seta}<span>Nova versão do ChatMil disponível.</span><button class="btn sm primary" data-s="at-abrir">Atualizar</button><button class="cs-at-x" data-s="at-dispensar" aria-label="Agora não">${I.x}</button></div>`;
  });

  /* ---------- Configurações › Aplicativo ---------- */
  X.configExtra.push(() => {
    if (!NATIVO) return `<div class="card flat stack cs-at-card"><div class="cs-at-l">${I.app}<span><b>Aplicativo</b><small>Versão web: atualiza sozinha.</small></span></div>
      <button class="btn" data-s="at-recarregar">Recarregar o app</button></div>`;
    const st = AT.conferindo ? "Conferindo…" : temNova() ? `Versão ${esc("1.0." + AT.nova.versao)} disponível${AT.nova.tamanho ? " · " + mb(AT.nova.tamanho) : ""}` : AT.erro ? AT.erro : AT.conferido ? "Você está com a versão mais nova." : "";
    return `<div class="card flat stack cs-at-card"><div class="cs-at-l">${I.app}<span><b>Atualizar o aplicativo</b><small>Instalada: ${esc(AT.nome || "1.0." + AT.instalada)}</small></span>${temNova() ? `<span class="pill d1">Nova</span>` : ""}</div>
      ${st ? `<p class="small ${temNova() ? "" : "muted"}">${esc(st)}</p>` : ""}
      ${temNova() ? `<button class="btn primary cs-grande" data-s="at-abrir">${I.seta} Atualizar agora</button>` : `<button class="btn" data-s="at-conferir" ${AT.conferindo ? "disabled" : ""}>Procurar atualização</button>`}</div>`;
  });

  /* ---------- baixar e instalar ---------- */
  function sheetAtualizar() {
    if (!NTP) return;
    if (!temNova()) { conferir(true).then(() => { if (temNova()) sheetAtualizar(); else toast("Você já está com a versão mais nova."); }); return; }
    window.abrirSheet(`<div class="sheet-h"><h2>Atualizar o ChatMil</h2></div>
      <p class="small">Versão nova: <b>1.0.${AT.nova.versao}</b>${AT.nova.tamanho ? ` (${mb(AT.nova.tamanho)})` : ""}. Suas conversas e provas continuam no app.</p>
      <div id="at-corpo">${AT.baixando ? corpoBaixando() : `<button class="btn primary cs-grande" data-s="at-baixar">${I.seta} Baixar e instalar</button><button class="btn ghost" data-s="fechar">Depois</button>`}</div>`);
  }
  const corpoBaixando = () => `<div class="cs-at-prog" id="at-prog"><i style="width:${Math.round(AT.prog * 100)}%"></i></div><p class="small muted" id="at-prog-t">Baixando…</p>`;
  async function baixar() {
    if (!NTP || !temNova() || AT.baixando) return;
    try {
      const pode = await NTP.podeInstalar();
      if (!pode.ok) {
        window.abrirSheet(`<div class="sheet-h"><h2>Permitir atualizações</h2></div>
          <p class="small">Só desta vez: o Android pede para você permitir que o <b>ChatMil instale atualizações</b>.</p>
          <ol class="small cs-at-passos"><li>Toque em <b>Abrir permissão</b>.</li><li>Ligue <b>Permitir desta fonte</b>.</li><li>Volte para o ChatMil e toque em <b>Atualizar</b> de novo.</li></ol>
          <button class="btn primary cs-grande" data-s="at-permitir">Abrir permissão</button>`);
        return;
      }
    } catch (e) { }
    AT.baixando = true; AT.prog = 0;
    const c = $("#at-corpo"); if (c) c.innerHTML = corpoBaixando();
    try {
      await NTP.baixarAtualizacao({ url: AT.nova.url });
      const c2 = $("#at-corpo"); if (c2) c2.innerHTML = `<p class="small"><b>Pronto!</b> Toque em <b>Atualizar</b> (ou Instalar) na tela do Android.</p><button class="btn ghost" data-s="fechar">Fechar</button>`;
    } catch (e) {
      console.warn(e);
      const c3 = $("#at-corpo"); if (c3) c3.innerHTML = `<p class="small">Não deu para baixar agora (${esc(String((e && e.message) || "erro"))}).</p>
        <button class="btn primary" data-s="at-baixar">Tentar de novo</button><button class="btn ghost" data-s="at-navegador">Baixar pelo navegador</button>`;
    }
    AT.baixando = false;
  }
  /* voltou da tela de permissão: segue sozinho */
  let esperandoPermissao = false;
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !esperandoPermissao || !NTP) return;
    esperandoPermissao = false;
    try { const p = await NTP.podeInstalar(); if (p.ok) { sheetAtualizar(); setTimeout(baixar, 300); } } catch (e) { }
  });

  Object.assign(X.acoes, {
    "at-abrir": () => sheetAtualizar(),
    "at-conferir": () => conferir(true),
    "at-baixar": () => baixar(),
    "at-permitir": async () => { esperandoPermissao = true; try { await NTP.permitirInstalar(); } catch (e) { esperandoPermissao = false; toast("Abra Configurações do Android › Apps › ChatMil › Instalar apps desconhecidos."); } },
    "at-navegador": () => { if (AT.nova && A.abrirLink) A.abrirLink(AT.nova.url); },
    "at-dispensar": () => { if (AT.nova) gravarLS("cs.app.dispensou", AT.nova.versao); pintar(); },
    "at-recarregar": () => { try { navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.update())); } catch (e) { } setTimeout(() => location.reload(), 300); }
  });
  window.CS_ATUALIZACAO = { estado: () => ({ ...AT, temNova: temNova() }), conferir };

  const css = document.createElement("style");
  css.textContent = `.cs-at-av{display:flex;align-items:center;gap:8px;padding:8px 10px}.cs-at-av>svg{width:20px;height:20px;color:var(--primary);flex:none}.cs-at-av span{flex:1;font-size:.9rem}
.cs-at-x{width:32px;height:32px;border:0;background:transparent;color:var(--muted);display:grid;place-items:center;border-radius:50%}.cs-at-x svg{width:16px;height:16px}
.cs-at-l{display:flex;align-items:center;gap:12px}.cs-at-l>svg{width:24px;height:24px;color:var(--primary);flex:none}.cs-at-l>span{flex:1;display:flex;flex-direction:column}.cs-at-l small{color:var(--muted)}
.cs-at-card .btn svg{width:18px;height:18px;vertical-align:-4px;margin-right:6px}
.cs-at-prog{height:10px;border-radius:6px;background:var(--surface-2);overflow:hidden}.cs-at-prog i{display:block;height:100%;background:var(--primary);transition:width .2s}
.cs-at-passos{margin:0;padding-left:20px;line-height:1.6}`;
  document.head.appendChild(css);
})();
