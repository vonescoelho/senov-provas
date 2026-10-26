/* ChatMil — figurinhas próprias (desenhos originais, sem legenda) e filtro de linguagem ofensiva. */
(function () {
  "use strict";

  /* ================= Figurinhas =================
     Desenhos em SVG, leves (não baixam nada). Os ids "@x" viram ids únicos em cada figurinha da tela. */
  const rosto = (c1, c2, c3) => `<defs><radialGradient id="@f" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${c1 || "#FFE58F"}"/><stop offset=".55" stop-color="${c2 || "#FFC83D"}"/><stop offset="1" stop-color="${c3 || "#F09A1A"}"/></radialGradient></defs>
    <circle cx="64" cy="66" r="50" fill="url(#@f)"/><ellipse cx="50" cy="34" rx="18" ry="9" fill="#fff" opacity=".28"/>`;
  const olhoAberto = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="7.5" fill="#3A2412"/><circle cx="${x + 1.8}" cy="${y - 2.6}" r="1.8" fill="#fff"/>`;
  const bochechas = `<ellipse cx="34" cy="76" rx="8" ry="5" fill="#FF7A6B" opacity=".35"/><ellipse cx="94" cy="76" rx="8" ry="5" fill="#FF7A6B" opacity=".35"/>`;
  const faisca = (x, y, s, c) => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}z" fill="${c || "#FFC83D"}"/>`;
  const linhas = (x, y, w, n, gap, cor) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * gap}" width="${i === n - 1 ? w * .6 : w}" height="3.4" rx="1.7" fill="${cor || "#C9D2E3"}"/>`).join("");
  const papel = `<linearGradient id="@p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E9EDF5"/></linearGradient>`;
  const fundo = (a, b) => `<linearGradient id="@b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

  const F = {
    /* ---- Vida de professor ---- */
    sextou: { nome: "Sextou", svg: `${rosto()}
      <path d="M30 50h68" stroke="#1E2230" stroke-width="4" stroke-linecap="round"/>
      <path d="M31 50h28v8a11 11 0 0 1-11 11h-6a11 11 0 0 1-11-11z" fill="#1E2230"/><path d="M69 50h28v8a11 11 0 0 1-11 11h-6a11 11 0 0 1-11-11z" fill="#1E2230"/>
      <path d="M37 55l6-3M75 55l6-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
      <path d="M42 82q22 22 44 0z" fill="#7A2E12"/><path d="M48 84q16 6 32 0" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <rect x="104" y="18" width="7" height="12" rx="2" fill="#4C7DFF" transform="rotate(28 107 24)"/><rect x="14" y="26" width="7" height="12" rx="2" fill="#FF5C8A" transform="rotate(-24 17 32)"/>
      <circle cx="110" cy="96" r="4" fill="#22B07D"/><circle cx="18" cy="100" r="3.5" fill="#9B6BFF"/>${faisca(100, 44, 6, "#FF8A3D")}` },
    cansado: { nome: "Cansado", svg: `${rosto("#FFE7A3", "#F6C24E", "#DE9325")}
      <path d="M36 58q9 7 18 0M74 58q9 7 18 0" stroke="#3A2412" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M38 67q7 4 14 0M76 67q7 4 14 0" stroke="#B9762A" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="64" cy="90" rx="10" ry="13" fill="#6B2A10"/><ellipse cx="64" cy="96" rx="7" ry="4.5" fill="#E0605A"/>
      <path d="M92 14h13l-13 13h13M108 32h8l-8 8h8" stroke="#6D7AA8" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
    cafe: { nome: "Café", svg: `<defs><linearGradient id="@c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2F6E8E"/><stop offset=".55" stop-color="#3F8FB5"/><stop offset="1" stop-color="#235A75"/></linearGradient></defs>
      <ellipse cx="60" cy="110" rx="44" ry="8" fill="#D5DBE6"/>
      <path d="M88 60h6a14 14 0 0 1 0 28h-8" stroke="#2A6584" stroke-width="8" fill="none"/>
      <path d="M26 50h66v38a20 20 0 0 1-20 20H46a20 20 0 0 1-20-20z" fill="url(#@c)"/>
      <ellipse cx="59" cy="50" rx="33" ry="7" fill="#2A6584"/><ellipse cx="59" cy="51" rx="28" ry="5" fill="#5A3420"/>
      <rect x="34" y="60" width="6" height="34" rx="3" fill="#fff" opacity=".22"/>
      <path d="M46 38c-6-8 6-12 0-22M60 36c-6-8 6-12 0-22M74 38c-6-8 6-12 0-22" stroke="#AEB7C9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>` },
    pilha: { nome: "Pilha de correção", svg: `<defs>${papel}</defs>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${24 + (i % 2 ? 4 : -2) + (i === 6 ? 3 : 0)}" y="${100 - i * 11}" width="70" height="11" rx="2" fill="url(#@p)" stroke="#BCC5D6" stroke-width="1.6" transform="rotate(${[-2, 2, -3, 1, 3, -2, 4][i]} 60 ${105 - i * 11})"/>`).join("")}
      <g transform="rotate(-38 92 34)"><rect x="70" y="30" width="48" height="9" rx="4.5" fill="#E5484D"/><path d="M70 30l-10 4.5 10 4.5z" fill="#F3D3B0"/><path d="M63 33l-3 1.5 3 1.5z" fill="#333"/><rect x="104" y="30" width="5" height="9" fill="#B9363A"/></g>` },
    burocracia: { nome: "Burocracia", svg: `<defs>${papel}</defs>
      <rect x="22" y="30" width="66" height="84" rx="6" fill="url(#@p)" stroke="#BCC5D6" stroke-width="1.6" transform="rotate(-6 55 72)"/>
      <rect x="28" y="24" width="66" height="84" rx="6" fill="url(#@p)" stroke="#BCC5D6" stroke-width="1.6"/>
      ${linhas(38, 38, 44, 4, 9)}
      <circle cx="68" cy="88" r="14" fill="none" stroke="#E5484D" stroke-width="3.5" opacity=".85"/><path d="M61 88l5 5 9-10" stroke="#E5484D" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
      <path d="M88 20v18a7 7 0 0 1-14 0V16a4 4 0 0 1 8 0v20" stroke="#8A94A8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g transform="rotate(14 100 70)"><rect x="92" y="44" width="16" height="22" rx="8" fill="#8B5A2B"/><rect x="88" y="64" width="24" height="8" rx="2" fill="#6B4320"/><rect x="85" y="72" width="30" height="9" rx="2" fill="#E5484D"/></g>` },
    respira: { nome: "Respira", svg: `${rosto("#FFF0B8", "#FFD45C", "#F2A72B")}
      <path d="M36 58q9 7 18 0M74 58q9 7 18 0" stroke="#3A2412" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M50 84q14 9 28 0" stroke="#3A2412" stroke-width="4" fill="none" stroke-linecap="round"/>${bochechas}
      <path d="M100 20c8 2 14 8 14 16M106 46h14a5 5 0 1 0-5-5M96 56h20" stroke="#6CC3D9" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <path d="M14 30c10-10 22-6 22 4-10 2-18 2-22-4z" fill="#3FB37F"/>` },
    motivado: { nome: "Motivado", svg: `<defs><linearGradient id="@r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C8D1E6"/></linearGradient>
      <linearGradient id="@q" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#FF6A3D"/></linearGradient></defs>
      <path d="M22 118l14-14M12 96l12-6M32 124l6-12" stroke="#B9C3D8" stroke-width="4" stroke-linecap="round"/>
      <g transform="rotate(45 64 64)"><path d="M52 82h24c0 16-6 26-12 34-6-8-12-18-12-34z" fill="url(#@q)"/>
      <path d="M64 10c17 13 23 34 18 64H46c-5-30 1-51 18-64z" fill="url(#@r)"/>
      <path d="M46 60l-14 20h16zM82 60l14 20H80z" fill="#E5484D"/><rect x="58" y="70" width="12" height="12" rx="3" fill="#E5484D"/>
      <circle cx="64" cy="44" r="10" fill="#2447C6" stroke="#fff" stroke-width="4"/><circle cx="61" cy="41" r="3" fill="#fff" opacity=".6"/></g>
      ${faisca(104, 20, 8)}${faisca(20, 40, 5, "#FF8A3D")}` },
    ferias: { nome: "Férias", svg: `<defs>${fundo("#7FD3F7", "#D8F3FF")}<clipPath id="@k"><rect x="8" y="8" width="112" height="112" rx="28"/></clipPath></defs>
      <g clip-path="url(#@k)"><rect x="8" y="8" width="112" height="112" fill="url(#@b)"/>
      <circle cx="92" cy="34" r="14" fill="#FFC83D"/><circle cx="92" cy="34" r="20" fill="#FFC83D" opacity=".25"/>
      <path d="M8 86q14-6 28 0t28 0 28 0 28 0v34H8z" fill="#2E9BD6"/><path d="M8 100q14-5 28 0t28 0 28 0 28 0v20H8z" fill="#F5D9A6"/>
      <path d="M48 104 60 52" stroke="#7A5230" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M26 56a36 26 0 0 1 70 10z" fill="#E5484D"/><path d="M46 52a18 26 0 0 1 32 11z" fill="#fff"/></g>` },
    /* ---- Reações ---- */
    joinha: { nome: "Joinha", svg: `<defs><linearGradient id="@h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD9B5"/><stop offset="1" stop-color="#E9A97A"/></linearGradient></defs>
      <rect x="18" y="54" width="24" height="58" rx="6" fill="#2447C6"/>
      <path d="M56 18c6-4 14 0 14 8v24h26a10 10 0 0 1 9 13l-9 34a12 12 0 0 1-12 9H40V58l12-22z" fill="url(#@h)"/>
      <path d="M78 62h20M76 76h18M74 90h16" stroke="#C98A5E" stroke-width="3" stroke-linecap="round" opacity=".7"/>${faisca(108, 22, 7)}${faisca(28, 30, 5, "#4C7DFF")}` },
    rindo: { nome: "Rindo", svg: `${rosto()}
      <path d="M34 54q9-9 18 0M76 54q9-9 18 0" stroke="#3A2412" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M36 74h56q-4 30-28 30t-28-30z" fill="#6B2A10"/><path d="M40 75h48q-1 7-4 10H44q-3-3-4-10z" fill="#fff"/><ellipse cx="64" cy="97" rx="12" ry="5" fill="#E0605A"/>
      <path d="M28 58c-8 6-10 16-4 20 5 3 10-3 8-12z" fill="#5CC8F2"/><path d="M100 58c8 6 10 16 4 20-5 3-10-3-8-12z" fill="#5CC8F2"/>` },
    amei: { nome: "Amei", svg: `${rosto()}
      <path d="M44 66c-10-6-14-12-12-17 2-5 9-5 12 0 3-5 10-5 12 0 2 5-2 11-12 17zM84 66c-10-6-14-12-12-17 2-5 9-5 12 0 3-5 10-5 12 0 2 5-2 11-12 17z" fill="#E8344E"/>
      <path d="M44 82q20 20 40 0z" fill="#6B2A10"/>${bochechas}` },
    uau: { nome: "Uau", svg: `${rosto()}
      <path d="M36 40q8-6 16-2M76 38q8-4 16 2" stroke="#3A2412" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="58" r="9" fill="#fff"/><circle cx="82" cy="58" r="9" fill="#fff"/>${olhoAberto(46, 58)}${olhoAberto(82, 58)}
      <ellipse cx="64" cy="89" rx="9" ry="12" fill="#6B2A10"/>` },
    pensando: { nome: "Pensando", svg: `${rosto()}
      <path d="M36 42l16 4M76 38q8-6 16 0" stroke="#3A2412" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      ${olhoAberto(45, 58)}${olhoAberto(82, 56)}<path d="M54 86q10-4 22 2" stroke="#3A2412" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="104" cy="22" r="9" fill="#fff" stroke="#C9D2E3" stroke-width="2"/><circle cx="114" cy="40" r="4.5" fill="#fff" stroke="#C9D2E3" stroke-width="2"/>
      <circle cx="99" cy="22" r="1.8" fill="#8A94A8"/><circle cx="104" cy="22" r="1.8" fill="#8A94A8"/><circle cx="109" cy="22" r="1.8" fill="#8A94A8"/>` },
    obrigado: { nome: "Obrigado", svg: `<defs><linearGradient id="@h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A93"/><stop offset="1" stop-color="#D91E48"/></linearGradient></defs>
      <path d="M64 112C14 80 12 40 38 30c12-4 22 2 26 12 4-10 14-16 26-12 26 10 24 50-26 82z" fill="url(#@h)"/>
      <path d="M34 48c2-8 10-12 18-8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
      ${faisca(108, 22, 8)}${faisca(20, 22, 5, "#FF8A3D")}${faisca(112, 80, 4, "#FFC83D")}` },
    /* ---- Elogios ---- */
    nota10: { nome: "Nota 10", svg: `<defs>${papel}</defs>
      <rect x="22" y="14" width="78" height="100" rx="6" fill="url(#@p)" stroke="#BCC5D6" stroke-width="1.6" transform="rotate(-5 61 64)"/>
      <g transform="rotate(-5 61 64)">${linhas(32, 28, 56, 3, 9)}
      <path d="M34 84c0-14 14-22 30-22 18 0 28 8 28 19 0 12-14 20-30 20-14 0-26-6-28-16" fill="none" stroke="#E5484D" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M48 76l6-5v22" stroke="#E5484D" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="71" cy="82" rx="8" ry="11" fill="none" stroke="#E5484D" stroke-width="5"/></g>
      ${faisca(108, 20, 7)}` },
    arrasou: { nome: "Arrasou", svg: `<defs><linearGradient id="@t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE08A"/><stop offset=".5" stop-color="#FFC22E"/><stop offset="1" stop-color="#D98A0B"/></linearGradient></defs>
      <path d="M38 26H22a14 14 0 0 0 18 26M90 26h16a14 14 0 0 1-18 26" stroke="#E0A11B" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M36 18h56v30a28 28 0 0 1-56 0z" fill="url(#@t)"/><rect x="58" y="74" width="12" height="14" fill="#D98A0B"/>
      <rect x="40" y="88" width="48" height="10" rx="3" fill="#E0A11B"/><rect x="34" y="98" width="60" height="14" rx="4" fill="#5B4636"/>
      <path d="M64 30l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fff" opacity=".85"/>
      <rect x="44" y="24" width="6" height="26" rx="3" fill="#fff" opacity=".4"/>${faisca(112, 14, 7)}${faisca(14, 70, 5, "#4C7DFF")}` },
    parabens: { nome: "Parabéns", svg: `<defs><linearGradient id="@t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9B6BFF"/><stop offset="1" stop-color="#5B3DD6"/></linearGradient></defs>
      <path d="M16 114 38 52l38 38z" fill="url(#@t)"/><path d="M26 86l14 14M32 70l24 24" stroke="#FFC83D" stroke-width="5" stroke-linecap="round"/>
      <path d="M56 46c4-14 14-16 16-28M74 62c12-4 18 2 30-6M66 52c10-12 22-10 30-20" stroke="#FF5C8A" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <rect x="86" y="16" width="7" height="12" rx="2" fill="#22B07D" transform="rotate(30 89 22)"/><rect x="104" y="70" width="7" height="12" rx="2" fill="#4C7DFF" transform="rotate(-20 107 76)"/>
      <circle cx="58" cy="24" r="4" fill="#FFC83D"/><circle cx="112" cy="44" r="4" fill="#FF8A3D"/><circle cx="90" cy="92" r="3.5" fill="#FFC83D"/>${faisca(40, 30, 6, "#4C7DFF")}` },
    /* ---- Sala de aula ---- */
    presente: { nome: "Presente", svg: `<defs><linearGradient id="@h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD9B5"/><stop offset="1" stop-color="#E9A97A"/></linearGradient></defs>
      <g fill="url(#@h)"><rect x="38" y="26" width="13" height="50" rx="6.5"/><rect x="53" y="16" width="13" height="58" rx="6.5"/><rect x="68" y="20" width="13" height="56" rx="6.5"/><rect x="83" y="32" width="12" height="46" rx="6"/>
      <rect x="38" y="54" width="57" height="56" rx="22"/><rect x="22" y="58" width="13" height="38" rx="6.5" transform="rotate(-34 28 77)"/></g>
      <path d="M50 92q14 8 30 0" stroke="#C98A5E" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M18 24l10 8M14 44h12M104 14l-6 10" stroke="#4C7DFF" stroke-width="4" stroke-linecap="round"/>` },
    dever: { nome: "Tarefa feita", svg: `<defs>${papel}</defs><rect x="26" y="14" width="76" height="104" rx="10" fill="#9A6A3A"/>
      <rect x="34" y="26" width="60" height="84" rx="4" fill="url(#@p)"/><rect x="50" y="8" width="28" height="14" rx="5" fill="#8A94A8"/>
      ${[40, 60, 80].map(y => `<rect x="42" y="${y}" width="12" height="12" rx="3" fill="#DDF5EA"/><path d="M44 ${y + 6}l3 3.5 6-7" stroke="#16A34A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${linhas(60, y + 4, 26, 1, 0)}`).join("")}` },
    boaprova: { nome: "Boa prova", svg: `<g transform="rotate(-40 64 64)"><rect x="20" y="54" width="70" height="20" fill="#FFC83D"/><rect x="20" y="54" width="70" height="6" fill="#FFE08A"/>
      <path d="M90 54l22 10-22 10z" fill="#F3D3B0"/><path d="M106 61l6 3-6 3z" fill="#333"/><rect x="12" y="54" width="10" height="20" fill="#B8C1D1"/><rect x="2" y="54" width="12" height="20" rx="4" fill="#FF8FA3"/></g>
      <g transform="translate(86 86)" fill="#22B07D">${[0, 90, 180, 270].map(a => `<path d="M0 0c-4-12 10-16 10-6 10 0 6 14-6 10z" transform="rotate(${a})"/>`).join("")}<path d="M2 4q6 10 2 20" stroke="#15803D" stroke-width="3" fill="none" stroke-linecap="round"/></g>` },
    revisao: { nome: "Revisão", svg: `<defs>${papel}</defs><rect x="18" y="20" width="80" height="96" rx="6" fill="url(#@p)" stroke="#BCC5D6" stroke-width="1.6"/>
      ${linhas(28, 34, 60, 6, 12)}<rect x="26" y="57" width="52" height="10" rx="2" fill="#FFE14D" opacity=".75"/><rect x="26" y="81" width="38" height="10" rx="2" fill="#FFE14D" opacity=".75"/>
      <g transform="rotate(38 92 54)"><rect x="80" y="10" width="22" height="56" rx="5" fill="#FFD400"/><rect x="80" y="10" width="22" height="16" rx="5" fill="#2A2F3A"/><path d="M82 66h18l-4 12h-10z" fill="#E9EDF5"/><path d="M86 78h10l-2 6h-6z" fill="#FFE14D"/></g>` },
    estudar: { nome: "Estudar", svg: `<defs><linearGradient id="@l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E3E8F2"/></linearGradient></defs>
      <path d="M10 46c20-8 38-6 54 4v62c-16-10-34-12-54-4z" fill="#2447C6"/><path d="M118 46c-20-8-38-6-54 4v62c16-10 34-12 54-4z" fill="#1B3797"/>
      <path d="M16 44c18-6 34-4 48 6v58c-14-10-30-12-48-6z" fill="url(#@l)"/><path d="M112 44c-18-6-34-4-48 6v58c14-10 30-12 48-6z" fill="url(#@l)"/>
      <path d="M24 58q16-4 32 4M24 70q16-4 32 4M72 62q16-8 32-4M72 74q16-8 32-4" stroke="#C9D2E3" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g fill="none" stroke="#2A2F3A" stroke-width="4"><circle cx="46" cy="30" r="12"/><circle cx="82" cy="30" r="12"/><path d="M58 30q6-5 12 0"/></g>` },
    eureca: { nome: "Ideia", svg: `<defs><radialGradient id="@l" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".6" stop-color="#FFD84D"/><stop offset="1" stop-color="#F2A81F"/></radialGradient></defs>
      <path d="M64 8v10M24 26l7 7M104 26l-7 7M10 62h10M108 62h10" stroke="#FFC83D" stroke-width="5" stroke-linecap="round"/>
      <path d="M64 22a34 34 0 0 0-20 61c4 3 6 7 6 11h28c0-4 2-8 6-11a34 34 0 0 0-20-61z" fill="url(#@l)"/>
      <path d="M56 92V74l8 6 8-6v18" stroke="#C47A12" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <rect x="50" y="94" width="28" height="9" rx="3" fill="#8A94A8"/><rect x="52" y="104" width="24" height="8" rx="3" fill="#6F798D"/><rect x="58" y="113" width="12" height="5" rx="2.5" fill="#5A6376"/>
      <path d="M48 40a20 20 0 0 1 12-8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>` },
    /* ---- Dia a dia ---- */
    bomdia: { nome: "Bom dia", svg: `<defs>${fundo("#FFB37A", "#FFE6C7")}<clipPath id="@k"><rect x="8" y="8" width="112" height="112" rx="28"/></clipPath></defs>
      <g clip-path="url(#@k)"><rect x="8" y="8" width="112" height="112" fill="url(#@b)"/>
      <g stroke="#FFF3D6" stroke-width="5" stroke-linecap="round"><path d="M64 30v12M34 44l8 8M94 44l-8 8M20 72h12M96 72h12"/></g>
      <circle cx="64" cy="80" r="26" fill="#FFD84D"/><path d="M8 84q28-12 56 0t56 0v36H8z" fill="#5BB98B"/><path d="M8 98q30-10 60 0t52 0v22H8z" fill="#3E9C70"/></g>` },
    reuniao: { nome: "Reunião", svg: `<rect x="14" y="20" width="100" height="70" rx="8" fill="#2A2F3A"/>
      ${[[20, 26, "#4C7DFF"], [66, 26, "#22B07D"], [20, 58, "#FF8A3D"], [66, 58, "#9B6BFF"]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="42" height="28" rx="4" fill="${c}" opacity=".9"/><circle cx="${x + 21}" cy="${y + 11}" r="6" fill="#fff" opacity=".9"/><path d="M${x + 10} ${y + 28}a11 9 0 0 1 22 0z" fill="#fff" opacity=".9"/>`).join("")}
      <path d="M4 96h120l-8 12H12z" fill="#B8C1D1"/><rect x="52" y="96" width="24" height="4" rx="2" fill="#8A94A8"/>` },
    /* ---- Disciplinas ---- */
    pi: { nome: "Matemática", svg: `<rect x="10" y="16" width="108" height="84" rx="8" fill="#9A6A3A"/><rect x="16" y="22" width="96" height="72" rx="4" fill="#2F5D4A"/>
      <g stroke="#F4F7F2" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
      <path d="M28 44h22M34 44v20M44 44v16q0 4 4 4"/><path d="M60 84l14-26 14 26z"/><circle cx="96" cy="44" r="10"/><path d="M96 44h10"/><path d="M28 80h20M38 74v12"/></g>
      <rect x="84" y="100" width="22" height="6" rx="3" fill="#fff"/><rect x="24" y="100" width="12" height="6" rx="3" fill="#FFE14D"/>` },
    ciencia: { nome: "Ciências", svg: `<defs><linearGradient id="@l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BE0A8"/><stop offset="1" stop-color="#159A69"/></linearGradient></defs>
      <path d="M50 14h28M54 14v34L24 100a10 10 0 0 0 9 15h62a10 10 0 0 0 9-15L74 48V14" fill="#EAF6FF" fill-opacity=".85" stroke="#9FB2CC" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M38 78h52l14 22a10 10 0 0 1-9 15H33a10 10 0 0 1-9-15z" fill="url(#@l)"/>
      <circle cx="54" cy="96" r="5" fill="#fff" opacity=".7"/><circle cx="72" cy="88" r="3.5" fill="#fff" opacity=".7"/><circle cx="66" cy="104" r="3" fill="#fff" opacity=".6"/>
      <circle cx="94" cy="36" r="6" fill="none" stroke="#5BE0A8" stroke-width="3"/><circle cx="104" cy="20" r="4" fill="none" stroke="#5BE0A8" stroke-width="3"/>` },
    /* ---- Inclusão ---- */
    inclusao: { nome: "Inclusão", svg: `<defs><linearGradient id="@l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E5484D"/><stop offset=".2" stop-color="#FF8A3D"/><stop offset=".4" stop-color="#FFC83D"/><stop offset=".6" stop-color="#22B07D"/><stop offset=".8" stop-color="#4C7DFF"/><stop offset="1" stop-color="#9B6BFF"/></linearGradient></defs>
      <path d="M64 64c-12-16-22-24-34-24a24 24 0 0 0 0 48c12 0 22-8 34-24s22-24 34-24a24 24 0 0 1 0 48c-12 0-22-8-34-24z" fill="none" stroke="url(#@l)" stroke-width="13" stroke-linecap="round"/>
      ${faisca(108, 24, 6)}${faisca(20, 104, 5, "#9B6BFF")}` },
    tempo: { nome: "Cada um no seu tempo", svg: `<defs><linearGradient id="@a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD98A"/><stop offset="1" stop-color="#E9A23B"/></linearGradient></defs>
      <rect x="28" y="10" width="72" height="12" rx="5" fill="#8B5A2B"/><rect x="28" y="106" width="72" height="12" rx="5" fill="#8B5A2B"/>
      <path d="M38 22h52c0 22-18 30-18 42s18 20 18 42H38c0-22 18-30 18-42S38 44 38 22z" fill="#EAF6FF" fill-opacity=".9" stroke="#B8C6DA" stroke-width="3"/>
      <path d="M48 36h32c-4 10-16 16-16 22-0-6-12-12-16-22z" fill="url(#@a)"/><path d="M64 64v26" stroke="#E9A23B" stroke-width="2.5" stroke-dasharray="3 4"/>
      <path d="M44 104c4-12 14-16 20-16s16 4 20 16z" fill="url(#@a)"/>` }
  };
  const ORDEM = ["sextou", "cansado", "cafe", "pilha", "burocracia", "respira", "motivado", "ferias", "joinha", "rindo", "amei", "uau", "pensando", "obrigado",
    "nota10", "arrasou", "parabens", "presente", "dever", "boaprova", "revisao", "estudar", "eureca", "bomdia", "reuniao", "pi", "ciencia", "inclusao", "tempo"];
  const PACOTES = [{ nome: "Figurinhas", ids: ORDEM }];
  let seqFig = 0;
  function figurinha(id, tam) {
    const f = F[id]; if (!f) return "";
    const u = "fg" + (++seqFig).toString(36);
    return `<svg class="fig" viewBox="0 0 128 128" width="${tam || 128}" height="${tam || 128}" role="img" aria-label="Figurinha: ${f.nome}"><g filter="drop-shadow(0 2px 3px rgba(20,30,60,.18))">${f.svg.replace(/@/g, u)}</g></svg>`;
  }

  /* ================= Filtro de linguagem ================= */
  /* Palavrões, xingamentos e termos preconceituosos (racismo, LGBTfobia, capacitismo, machismo).
     Compara palavra por palavra (sem acento, com números trocados por letras e letras repetidas juntadas),
     para não bloquear palavras comuns como "computador" ou "viaduto". */
  const EXATAS = ["puta", "puto", "putinha", "putaria", "puteiro", "fdp", "pqp", "vsf", "vtnc", "tnc", "cu", "porra", "bosta",
    "cacete", "babaca", "otario", "otaria", "imbecil", "cretino", "cretina", "idiota", "vadia", "rapariga", "quenga", "corno", "corna",
    "viado", "viadinho", "viadao", "viadagem", "crioulo", "crioula", "aleijado", "aleijada", "ticao", "fuder", "fudido", "fudida", "foder",
    "bichona", "pau no cu", "debil mental", "mulherzinha"];
  const RAIZES = ["caralh", "arromb", "fod", "merd", "bucet", "bocet", "xerec", "xoxot", "piroc", "punhet", "boquet", "cuzao", "cuzinh",
    "retardad", "mongoloid", "baitol", "boiol", "sapatao", "travec", "vagabund", "desgracad", "putari", "fudid"];
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
  const junta = s => s.replace(/(.)\1+/g, "$1");
  function norm(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[013457@$!]/g, c => LEET[c] || c);
  }
  const EX = new Set(EXATAS.filter(p => !p.includes(" ")).map(junta));
  const FRASES = EXATAS.filter(p => p.includes(" ")).map(junta);
  const RZ = RAIZES.map(junta);
  function palavras(t) {
    const tok = norm(t).split(/[^a-z]+/).filter(Boolean);
    /* junta letras soltas: "p u t a" ou "p.u.t.a" */
    const out = []; let buf = "";
    tok.forEach(w => { if (w.length === 1) buf += w; else { if (buf.length > 1) out.push(buf); buf = ""; out.push(w); } });
    if (buf.length > 1) out.push(buf); else if (buf) out.push(buf);
    return out.map(junta);
  }
  function ofensivo(t) {
    const ws = palavras(t); if (!ws.length) return false;
    if (ws.some(w => EX.has(w) || RZ.some(r => w.startsWith(r)))) return true;
    const frase = " " + ws.join(" ") + " ";
    return FRASES.some(f => frase.includes(" " + f + " "));
  }

  /* ---------- Segurança antes de enviar ----------
     - CPF / cartão / RG viram XXX (quem recebe nunca vê o número);
     - links de pornografia, apostas/cassino/"tigrinho", sites falsos e promoções que pedem pagamento são bloqueados. */
  function cpfValido(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    let s = 0; for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
    let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== +d[9]) return false;
    s = 0; for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
    r = (s * 10) % 11; if (r === 10) r = 0; return r === +d[10];
  }
  function luhn(d) { let s = 0, dbl = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (dbl) { n *= 2; if (n > 9) n -= 9; } s += n; dbl = !dbl; } return s % 10 === 0; }
  const xis = m => m.replace(/\d/g, "X");
  function mascararDocs(t) {
    let n = 0;
    t = t.replace(/(?<![\d])\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}(?![\d])/g, m => { if (cpfValido(m.replace(/\D/g, ""))) { n++; return xis(m); } return m; });
    t = t.replace(/(?<![\d])(?:\d[ -]?){13,19}(?![\d])/g, m => { const d = m.replace(/\D/g, ""); if (d.length >= 13 && luhn(d)) { n++; return xis(m); } return m; });
    t = t.replace(/\b(RG|R\.G\.|CIN|identidade|registro geral|CNH|passaporte)\b([\s:nNºo°#.-]{0,6})([0-9Xx][0-9Xx.\-\/ ]{4,16}[0-9Xx])/gi, (m, a, b, c) => { n++; return a + b + xis(c); });
    return { texto: t, n };
  }
  const OFICIAIS = ["gov.br", "caixa.gov.br", "bb.com.br", "bradesco.com.br", "itau.com.br", "santander.com.br", "nubank.com.br", "inter.co", "bancointer.com.br", "mercadopago.com.br", "mercadolivre.com.br",
    "picpay.com", "whatsapp.com", "wa.me", "instagram.com", "facebook.com", "fb.com", "google.com", "share.google", "youtube.com", "youtu.be", "apple.com", "serasa.com.br", "correios.com.br", "magazineluiza.com.br",
    "amazon.com.br", "shopee.com.br", "hotmart.com", "tiktok.com", "kwai.com", "c6bank.com.br", "netflix.com", "microsoft.com", "outlook.com", "live.com"];
  const MARCAS = /(caixa|bradesco|itau|santander|nubank|banco-?inter|mercado-?pago|picpay|serasa|correios|detran|receita|gov-?br|pix|whatsapp|instagram|facebook|netflix|apple|icloud|microsoft|outlook|magalu|shopee|amazon|c6bank|bancodobrasil|bbrasil)/;
  const PORNO = /(porn|xxx|xvideo|xnxx|xhamster|redtube|youporn|brazzers|onlyfans|chaturbate|stripchat|bongacam|camsoda|livejasmin|erome|hentai|rule34|nudes?|sexo|sexy|putaria|safad|camgirl|privacy\.com\.br|fansly)/;
  const APOSTA_RE = /(aposta|cassino|casino|tigrinho|fortune-?tiger|fortune-?ox|fortune-?rabbit|fortune-?mouse|pg-?soft|roleta|pixbet|betano|sportingbet|esportesdasorte|estrelabet|superbet|vaidebet|mcgames|jogodotigre|jogo-do-tigre|aviator|loteria-?online|1win)/;
  const APOSTA_LBL = new Set(["stake", "blaze", "bet", "bets", "slots", "slot", "bingo", "cassino", "casino"]);
  function aposta(h) {
    if (APOSTA_RE.test(h)) return true;
    return h.split(/[.-]/).some(l => APOSTA_LBL.has(l) || (/^bet|bet$|bet\d/.test(l) && !/^(alphabet|tibet|better|between|betty|betel|betume|beterraba)/.test(l)));
  }
  const TLD_RUIM = /\.(top|xyz|click|zip|mov|icu|buzz|rest|lol|monster|cfd|sbs|cyou|quest|bond|win|bet|casino|porn|sex|xxx|adult)$/;
  function dominioReg(h) { const p = h.split("."); return p.length > 2 && /^(com|gov|org|net|edu|co|art|blog|app)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2 ? p.slice(-3).join(".") : p.slice(-2).join("."); }
  function linkPerigoso(u) {
    let url; try { url = new URL(u); } catch (e) { return "Link inválido bloqueado."; }
    const h = url.hostname.toLowerCase().replace(/^www\./, ""), tudo = (h + url.pathname + url.search).toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes("xn--") || h.includes("@")) return "Link suspeito bloqueado.";
    if (PORNO.test(tudo)) return "Link de conteúdo adulto bloqueado.";
    if (aposta(h) || /tigrinho|fortune-?tiger|cassino|casino|aposta/.test(tudo)) return "Link de apostas bloqueado.";
    const reg = dominioReg(h);
    if (MARCAS.test(h.replace(/\./g, "-")) && !OFICIAIS.some(o => reg === o || h === o || h.endsWith("." + o))) return "Link falso bloqueado (imita um site oficial).";
    if (TLD_RUIM.test(h)) return "Link suspeito bloqueado.";
    return "";
  }
  const PROMO = /(promo[cç][aã]o|promo\b|desconto|cupom|sorteio|ganhe|ganhar|gr[aá]tis|oferta|compre|comprar|pague|pagamento|pagar|pix|r\$\s?\d|frete|lucro|renda extra|investimento|dinheiro f[aá]cil|clique aqui|link na bio|[uú]ltimas unidades)/i;
  /* devolve { texto (com CPF/RG mascarados), bloqueio (mensagem) } */
  function seguranca(t, op) {
    t = String(t || "");
    const m = mascararDocs(t), links = m.texto.match(/https?:\/\/[^\s<>"']+/gi) || [], soltos = m.texto.match(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|bet|xyz|top|club|online|site|app|io|me|br)(?:\/[^\s]*)?/gi) || [];
    for (const l of [...links, ...soltos.map(x => "https://" + x)]) { const r = linkPerigoso(l); if (r) return { texto: m.texto, bloqueio: r, docs: m.n }; }
    if (links.length && PROMO.test(m.texto) && !(op && op.loja)) return { texto: m.texto, bloqueio: "Promoções com link de compra ou pagamento não são permitidas.", docs: m.n };
    return { texto: m.texto, bloqueio: "", docs: m.n };
  }

  window.SOC_EXTRAS = { F, PACOTES, ORDEM, figurinha, ofensivo, seguranca, linkPerigoso };
})();
