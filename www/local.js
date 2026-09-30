/* SENOV Provas — modo aplicativo (PWA e APK).
   Substitui os recursos do claude.ai por equivalentes que funcionam no próprio aparelho:
   - banco de questões e provas: IndexedDB (fica neste aparelho; exporte/importe o JSON para levar a outro)
   - download do PDF: navegador (PWA) ou menu "Compartilhar/Salvar" do Android (APK)
   - revisão por IA: opcional, com chave da API da Anthropic guardada só neste aparelho */
(function () {
  "use strict";
  window.SENOV_LOCAL = true;

  /* ---------- Capacitor (quando roda como APK) ---------- */
  var Cap = window.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function plugin(nome) {
    try {
      if (window.capacitorExports && capacitorExports.registerPlugin) return capacitorExports.registerPlugin(nome);
      if (Cap && Cap.registerPlugin) return Cap.registerPlugin(nome);
    } catch (e) { console.warn(e); }
    return null;
  }

  /* ---------- Banco local (mesma interface usada pelo app) ---------- */
  var DBNAME = "senov-provas", STORE = "docs";
  var mem = new Map(), idb = null, ouvintes = new Set();
  function abrir() {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open(DBNAME, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function carregar() {
    return abrir().then(function (db) {
      idb = db;
      if (!idb) return;
      return new Promise(function (res) {
        var rq = idb.transaction(STORE, "readonly").objectStore(STORE).openCursor();
        rq.onsuccess = function () { var c = rq.result; if (c) { mem.set(c.key, c.value); c.continue(); } else res(); };
        rq.onerror = function () { res(); };
      });
    });
  }
  function persistir(p, v) {
    if (!idb) return Promise.resolve();
    return new Promise(function (res, rej) {
      var t = idb.transaction(STORE, "readwrite"), st = t.objectStore(STORE);
      if (v === undefined) st.delete(p); else st.put(v, p);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej({ code: "quota_exceeded", message: String(t.error) }); };
    });
  }
  var clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  var pai = function (p) { return p.split("/").slice(0, -1).join("/"); };
  var meta = { fromCache: false, hasPendingWrites: false };
  function snapDoc(p) { var v = mem.get(p); return { id: p.split("/").pop(), exists: v !== undefined, data: function () { return clone(v); }, metadata: meta }; }
  function snapCol(p) {
    var docs = Array.from(mem.keys()).filter(function (k) { return pai(k) === p; }).sort().map(snapDoc);
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: meta };
  }
  function avisar(p) {
    ouvintes.forEach(function (o) {
      try {
        if (o.tipo === "doc" && o.p === p) o.fn(snapDoc(p));
        else if (o.tipo === "col" && pai(p) === o.p) o.fn(snapCol(o.p));
      } catch (e) { console.error(e); }
    });
  }
  function novoId() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); }
  function gravar(p, v) {
    var c = v === undefined ? undefined : clone(v);
    if (c === undefined) mem.delete(p); else mem.set(p, c);
    return persistir(p, c).then(function () { avisar(p); });
  }
  function ouvir(tipo, p, fn, snap) {
    var o = { tipo: tipo, p: p, fn: fn }; ouvintes.add(o);
    setTimeout(function () { if (ouvintes.has(o)) fn(snap(p)); }, 0);
    return function () { ouvintes.delete(o); };
  }
  function docRef(p) {
    return {
      id: p.split("/").pop(), path: p,
      get: function () { return Promise.resolve(snapDoc(p)); },
      set: function (d) { return gravar(p, d); },
      update: function (d) {
        if (!mem.has(p)) return Promise.reject({ code: "invalid_argument", message: "Documento não existe" });
        return gravar(p, Object.assign(clone(mem.get(p)), d));
      },
      delete: function () { return gravar(p, undefined); },
      onSnapshot: function (fn) { return ouvir("doc", p, fn, snapDoc); },
      collection: function (n) { return colRef(p + "/" + n); },
      acquire: function () { return Promise.resolve({ acquired: true }); }
    };
  }
  function colRef(p) {
    var q = {
      path: p,
      doc: function (id) { return docRef(p + "/" + (id || novoId())); },
      add: function (d) { var r = docRef(p + "/" + novoId()); return r.set(d).then(function () { return r; }); },
      get: function () { return Promise.resolve(snapCol(p)); },
      onSnapshot: function (fn) { return ouvir("col", p, fn, snapCol); },
      where: function () { return q; }, orderBy: function () { return q; }, limit: function () { return q; }
    };
    return q;
  }
  var db = { doc: docRef, collection: colRef };

  /* ---------- Questões de exemplo (primeiro uso) ---------- */
  var SEED = [
    ["ex01","EF","6º ano","Matemática","Frações",1,true,"Uma pizza foi dividida em 4 partes iguais. Pedro comeu 1 parte. Que fração da pizza Pedro comeu?",["1/4","1/2","3/4","4/1"]],
    ["ex02","EF","6º ano","Matemática","Frações",2,false,"Qual das frações abaixo é equivalente a 2/3?",["4/6","3/2","2/6","6/4"]],
    ["ex03","EF","6º ano","Matemática","Frações",3,false,"Ana leu 2/5 de um livro na segunda-feira e 1/3 na terça-feira. Que fração do livro ela ainda precisa ler?",["4/15","11/15","3/8","1/5"]],
    ["ex04","EF","6º ano","Matemática","Números naturais",1,true,"Quanto é 25 + 17?",["42","32","52","41"]],
    ["ex05","EF","6º ano","Matemática","Números naturais",2,false,"Uma escola tem 12 turmas com 35 estudantes cada. Quantos estudantes há na escola?",["420","47","350","410"]],
    ["ex06","EF","6º ano","Matemática","Números naturais",1,true,"Qual número vem logo depois do 99?",["100","98","101","909"]],
    ["ex07","EF","6º ano","Matemática","Números naturais",3,false,"O menor número natural de três algarismos diferentes é:",["102","100","123","111"]],
    ["ex08","EF","6º ano","Língua Portuguesa","Substantivos",1,true,"Qual palavra é o nome de um animal?",["Gato","Correr","Bonito","Ontem"]],
    ["ex09","EF","6º ano","Língua Portuguesa","Interpretação de texto",2,false,"Leia: \"Choveu a noite toda. De manhã, as ruas do bairro estavam alagadas e as aulas foram suspensas.\"\nPor que as aulas foram suspensas?",["Porque as ruas estavam alagadas.","Porque era feriado.","Porque os professores faltaram.","Porque a escola estava em reforma."]],
    ["ex10","EF","6º ano","Língua Portuguesa","Interpretação de texto",3,false,"Na frase \"Aquele jogador é uma muralha no gol\", a palavra \"muralha\" foi usada para indicar que o jogador:",["defende muito bem.","é muito alto.","trabalha em construções.","não gosta de jogar."]],
    ["ex11","EM","1ª série","Matemática","Função afim",1,true,"Na função f(x) = 2x + 3, quanto vale f(1)?",["5","6","3","2","1"]],
    ["ex12","EM","1ª série","Matemática","Função afim",2,false,"Um táxi cobra R$ 5,00 de bandeirada mais R$ 2,50 por quilômetro rodado. Quanto custa uma corrida de 8 km?",["R$ 25,00","R$ 20,00","R$ 40,00","R$ 15,00","R$ 30,00"]],
    ["ex13","EM","1ª série","Matemática","Função afim",3,false,"A reta que passa pelos pontos (1, 4) e (3, 10) é o gráfico de qual função?",["f(x) = 3x + 1","f(x) = 2x + 2","f(x) = 3x - 1","f(x) = 4x","f(x) = x + 3"]],
    ["ex14","EM","1ª série","Biologia","Citologia",1,true,"Qual parte da célula guarda o material genético (DNA) nas células animais?",["Núcleo","Parede celular","Cloroplasto","Membrana","Vacúolo"]],
    ["ex15","EM","1ª série","Biologia","Citologia",2,false,"A organela responsável pela respiração celular e produção de energia (ATP) é:",["a mitocôndria.","o ribossomo.","o complexo golgiense.","o lisossomo.","o centríolo."]],
    ["ex16","EM","1ª série","Biologia","Citologia",3,false,"Sobre as células procariontes, é correto afirmar que:",["não possuem núcleo delimitado por membrana.","possuem mitocôndrias e cloroplastos.","são exclusivas de animais.","não possuem ribossomos.","têm o DNA sempre dentro do núcleo."]]
  ];
  function semear() {
    var jaTem = Array.from(mem.keys()).some(function (k) { return k.indexOf("questoes/") === 0; });
    var marcado = false; try { marcado = localStorage.getItem("senov.semeado") === "1"; } catch (e) {}
    if (jaTem || marcado) return;
    var ps = SEED.map(function (r) {
      return gravar("questoes/" + r[0], { autorId: "exemplo", exemplo: true, autorizado: true, nivel: r[1], serie: r[2], disciplina: r[3], conteudo: r[4], dificuldade: r[5], aee: r[6], enunciado: r[7], alternativas: r[8], correta: 0, fixarOrdem: false, criadoEm: "2026-09-25T12:00:00Z" });
    });
    try { localStorage.setItem("senov.semeado", "1"); } catch (e) {}
    return Promise.all(ps);
  }

  /* ---------- Quem está usando (neste aparelho é sempre o dono) ---------- */
  var user = {
    isOwner: function () { return Promise.resolve(true); },
    canEdit: function () { return Promise.resolve(true); },
    can: function () { return Promise.resolve(true); },
    id: function () { return Promise.resolve("local"); },
    me: function () { return Promise.resolve({ id: "local", name: "", avatarUrl: "", color: "#2447C6", email: null, isOwner: true, canEdit: true }); },
    name: function () { return Promise.resolve(""); },
    profiles: function (ids) { var o = {}; [].concat(ids).forEach(function (i) { o[i] = { id: i, name: "", avatarUrl: "", color: "#2447C6", email: null, isMe: i === "local", guest: false }; }); return Promise.resolve(o); },
    search: function () { return Promise.resolve([]); }
  };

  /* ---------- Baixar arquivos ---------- */
  var TIPOS = { pdf: "application/pdf", json: "application/json", csv: "text/csv" };
  function paraBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(",")[1]); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }
  var downloads = {
    save: function (req) {
      var ext = String(req.filename).split(".").pop().toLowerCase();
      var blob = req.data instanceof Blob ? req.data : new Blob([req.data], { type: TIPOS[ext] || "application/octet-stream" });
      if (nativo) {
        var FS = plugin("Filesystem"), SH = plugin("Share");
        return paraBase64(blob).then(function (b64) {
          return FS.writeFile({ path: req.filename, data: b64, directory: "CACHE" });
        }).then(function (w) {
          return SH.share({ title: req.filename, url: w.uri, dialogTitle: "Salvar ou enviar o arquivo" });
        }).then(function () { return { status: "saved" }; }, function (e) {
          var m = String((e && e.message) || e);
          throw /cancel/i.test(m) ? { code: "declined", message: m } : { code: "unavailable", message: m };
        });
      }
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = req.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
      return Promise.resolve({ status: "saved" });
    }
  };

  /* ---------- Revisão por IA (opcional, com chave da API) ---------- */
  function cfgIA() { try { return JSON.parse(localStorage.getItem("senov.ia") || "null") || {}; } catch (e) { return {}; } }
  function perguntar(input) {
    var c = cfgIA();
    if (!c.chave) return Promise.reject({ code: "not_granted", message: "Sem chave da API" });
    var msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": c.chave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: c.modelo || "claude-sonnet-5-5", max_tokens: 4000, messages: msgs })
    }).then(function (r) {
      if (r.ok) return r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var m = (j && j.error && j.error.message) || ("Erro " + r.status);
        throw { code: r.status === 429 ? "rate_limited" : (r.status === 401 || r.status === 403) ? "not_granted" : "unavailable", message: m };
      });
    }, function () { throw { code: "unavailable", message: "Sem conexão com a internet" }; })
      .then(function (j) { return (j.content || []).map(function (b) { return b.text || ""; }).join(""); });
  }
  var sample = function (input) { return perguntar(input).then(function (t) { return { text: t, truncated: false }; }); };
  sample.json = function (input) {
    return perguntar(input).then(function (t) {
      var a = t.indexOf("{"), b = t.lastIndexOf("}");
      if (a < 0 || b < a) throw { code: "invalid_json", message: "Resposta sem JSON", text: t };
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw { code: "invalid_json", message: "JSON inválido", text: t }; }
    });
  };
  sample.limits = function () { return Promise.resolve({ images: false }); };

  /* ---------- Ponto de entrada igual ao do claude.ai ---------- */
  var pronto = carregar().then(semear).catch(function (e) { console.error(e); });
  window.claude = {
    use: function (nome) {
      return pronto.then(function () {
        if (nome === "db") return db;
        if (nome === "user") return user;
        if (nome === "downloads") return downloads;
        if (nome === "sample") return cfgIA().chave ? sample : null;
        return null;
      });
    }
  };

  /* ---------- Botão "voltar" do Android ---------- */
  window.SENOV_voltar = function () {
    var layer = document.getElementById("layer");
    if (layer && layer.innerHTML) { layer.innerHTML = ""; return true; }
    try { if (typeof S !== "undefined" && S.tab !== "inicio") { S.tab = "inicio"; render(); window.scrollTo(0, 0); return true; } } catch (e) {}
    return false;
  };
  if (nativo) {
    var App = plugin("App");
    if (App) App.addListener("backButton", function () { if (!window.SENOV_voltar()) App.exitApp(); });
  }

  /* ---------- Funcionar sem internet (PWA) ---------- */
  if (!nativo && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function (e) { console.warn(e); }); });
  }
})();
