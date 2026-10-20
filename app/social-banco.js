/* ChatMil — Banco de questões compartilhado (nuvem).
   Quem autorizou o compartilhamento (termo) envia as questões do banco deste aparelho para a coleção
   "banco" do Firebase; todos recebem as questões dos colegas (inclusive as criadas pela IA).
   As provas salvas também vão para "bancoProvas" (só o dono e a administração leem).
   Questões "só minhas" (privadas) e de exemplo nunca saem do aparelho. Depende de social.js e do app de provas. */
(function () {
  "use strict";
  if (!window.SOCIAL || !window.SOCIAL.ext) return;
  const X = window.SOCIAL.ext, A = window.SOCIAL._;
  const { SO, fb, D, C, TS, eu } = A;
  const NB = { un: null, timer: null, uid: null, ocupado: false, recebidos: 0 };
  const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const app = () => (typeof S !== "undefined" && S && S.db) ? S : null;
  const termo = () => { const s = app(); return !!(s && s.perfil && s.perfil.termoAceitoEm); };
  const CAMPOS = ["nivel", "serie", "disciplina", "conteudo", "dificuldade", "aee", "enunciado", "alternativas", "correta", "fixarOrdem", "grafico", "temFoto", "imgApp",
    "legenda", "tituloImg", "revisao", "bncc", "origemIA", "bimestre", "criadoEm", "atualizadoEm"];
  const limpar = o => JSON.parse(JSON.stringify(o, (k, v) => v === undefined ? null : v));

  X.aoTrocarUsuario.push(u => {
    if (NB.un) { try { NB.un(); } catch (e) { } NB.un = null; }
    clearInterval(NB.timer); NB.timer = null; NB.uid = u ? u.uid : null;
    if (u) setTimeout(() => iniciar(u.uid), 1200);
  });

  function iniciar(uid) {
    if (NB.uid !== uid) return;
    if (!app()) return setTimeout(() => iniciar(uid), 800);
    /* receber: questões de todos (as minhas já estão aqui) */
    NB.un = fb.onSnapshot(fb.query(C("banco"), fb.orderBy("atualizadoEm", "desc"), fb.limit(5000)), snap => receber(snap.docs), e => console.warn("banco", e));
    /* enviar: confere a cada poucos segundos se há questão nova ou editada */
    NB.timer = setInterval(enviar, 6000); setTimeout(enviar, 1500);
  }

  async function receber(docs) {
    const s = app(); if (!s) return;
    const locais = new Map((s._banco || []).map(q => [q.id, q]));
    for (const d of docs) {
      const q = d.data(); if (!q || q.dono === eu()) continue;
      if (q.temFoto && !q.imgApp) continue;              /* foto ainda não vai para a nuvem */
      const id = "nv_" + d.id, ja = locais.get(id);
      if (ja && String(ja.atualizadoEm || "") >= String(q.atualizadoEm || "")) continue;
      const corpo = {}; CAMPOS.forEach(k => { if (q[k] !== undefined) corpo[k] = q[k]; });
      if (typeof corpo.grafico === "string") { try { corpo.grafico = JSON.parse(corpo.grafico); } catch (e) { corpo.grafico = null; } }
      if (!Array.isArray(corpo.alternativas) || typeof corpo.enunciado !== "string") continue;
      corpo.autorId = "nuvem:" + q.dono; corpo.autorNome = String(q.autorNome || ""); corpo.daNuvem = true; corpo.nuvemId = d.id; corpo.autorizado = true;
      try { await s.db.doc("questoes/" + id).set(limpar(corpo)); NB.recebidos++; } catch (e) { console.warn(e); }
    }
  }

  async function enviar() {
    const s = app(); if (!s || !eu() || !termo() || NB.ocupado) return;
    NB.ocupado = true;
    try {
      const k = "cs.nuvem." + eu(), env = lerLS(k, {}), kp = "cs.nuvemP." + eu(), envP = lerLS(kp, {});
      const nome = (SO.eu && SO.eu.nome) || "";
      for (const q of (s._banco || [])) {
        if (!q || q.exemplo || q.daNuvem || q.privada || String(q.id).startsWith("nv_")) continue;
        if (q.revisao && q.revisao.status === "bloqueada") continue;
        const marca = String(q.atualizadoEm || q.criadoEm || "");
        if (env[q.id] === marca) continue;
        const corpo = {}; CAMPOS.forEach(c => { if (q[c] !== undefined) corpo[c] = q[c]; });
        corpo.dono = eu(); corpo.autorNome = nome.slice(0, 80); corpo.atualizadoEm = marca || new Date().toISOString();
        /* o Firestore não aceita lista dentro de lista (dados do gráfico): vai como texto */
        corpo.grafico = q.grafico ? JSON.stringify(q.grafico) : null;
        try { await fb.setDoc(D("banco", eu() + "_" + q.id), { ...limpar(corpo), em: TS() }); env[q.id] = marca; gravarLS(k, env); }
        catch (e) { console.warn("enviar questão", e); break; }
      }
      for (const p of (s.provas || [])) {
        const marca = String(p.atualizadoEm || "");
        if (!p.id || envP[p.id] === marca) continue;
        const qs = (p.montagem || p.itens || []).slice(0, 60).map(m => ({ enunciado: String(m.enunciado || "").slice(0, 4000), alternativas: (m.alternativas || []).slice(0, 5).map(a => String(a).slice(0, 1000)), correta: m.correta | 0, conteudo: String(m.conteudo || "").slice(0, 120), dificuldade: m.dificuldade | 0, bncc: m.bncc || "" }));
        const corpo = { dono: eu(), autorNome: nome.slice(0, 80), titulo: String(p.titulo || p.disciplina || "Prova").slice(0, 120), disciplina: String(p.disciplina || "").slice(0, 60), serie: String(p.serie || ""), nivel: String(p.nivel || ""),
          bimestre: String(p.bimestre || ""), aee: !!p.aee, escola: String(p.escola || "").slice(0, 120), qtd: qs.length, questoes: qs, atualizadoEm: marca, em: TS() };
        try { await fb.setDoc(D("bancoProvas", eu() + "_" + p.id), corpo); envP[p.id] = marca; gravarLS(kp, envP); }
        catch (e) { console.warn("enviar prova", e); break; }
      }
    } finally { NB.ocupado = false; }
  }
  window.CS_BANCO_NUVEM = { enviar, estado: () => ({ recebidos: NB.recebidos }) };
})();
