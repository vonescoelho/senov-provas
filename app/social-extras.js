/* ChatMil — figurinhas próprias (desenhos originais) e filtro de linguagem ofensiva. */
(function () {
  "use strict";

  /* ================= Figurinhas ================= */
  const W = 'stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke"';
  const lbl = (t, y, cor, tam) =>
    `<text x="64" y="${y}" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="${tam || 19}" fill="${cor}" stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
  function estrela(cx, cy, R, r, n) {
    n = n || 5; const p = [];
    for (let i = 0; i < n * 2; i++) {
      const a = Math.PI / n * i - Math.PI / 2, rr = i % 2 ? r : R;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  const brilho = (x, y, s, cor) => `<polygon points="${estrela(x, y, s, s * 0.35, 4)}" fill="${cor || "#FFC53D"}"/>`;

  const F = {
    nota10: { nome: "Nota 10", svg:
      `<polygon points="${estrela(64, 54, 48, 23)}" fill="#FFC53D" ${W}/>
       <polygon points="${estrela(64, 54, 38, 18)}" fill="#FFD76A"/>
       <text x="64" y="66" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="30" fill="#B45309">10</text>
       ${brilho(108, 20, 7, "#FFC53D")}${brilho(18, 30, 5, "#FF8A3D")}
       ${lbl("Nota 10!", 120, "#D97706")}` },
    arrasou: { nome: "Arrasou!", svg:
      `<path d="M38 20h52v26a26 26 0 0 1-52 0z" fill="#FFC53D" ${W}/>
       <path d="M38 28H27a11 11 0 0 0 13 24M90 28h11a11 11 0 0 1-13 24" fill="none" stroke="#FFC53D" stroke-width="7" stroke-linecap="round"/>
       <rect x="57" y="70" width="14" height="12" fill="#F59E0B"/>
       <rect x="42" y="82" width="44" height="12" rx="4" fill="#B45309" ${W}/>
       <rect x="46" y="26" width="7" height="26" rx="3.5" fill="#fff" opacity=".55"/>
       <polygon points="${estrela(64, 42, 10, 4.5)}" fill="#fff"/>
       ${brilho(16, 18, 6, "#FF5C8A")}${brilho(112, 16, 7, "#2447C6")}${brilho(110, 70, 5, "#22A06B")}
       ${lbl("Arrasou!", 120, "#E11D48")}` },
    parabens: { nome: "Parabéns!", svg:
      `<path d="M44 66 60 94M84 62 64 94M64 58v36" stroke="#94A3B8" stroke-width="2.5" fill="none"/>
       <ellipse cx="40" cy="42" rx="19" ry="23" fill="#EF4444" ${W}/>
       <ellipse cx="88" cy="38" rx="19" ry="23" fill="#2447C6" ${W}/>
       <ellipse cx="64" cy="32" rx="20" ry="24" fill="#FFC53D" ${W}/>
       <ellipse cx="57" cy="24" rx="5" ry="8" fill="#fff" opacity=".6"/>
       <ellipse cx="33" cy="34" rx="4" ry="7" fill="#fff" opacity=".5"/>
       <ellipse cx="81" cy="30" rx="4" ry="7" fill="#fff" opacity=".5"/>
       <rect x="14" y="80" width="6" height="10" rx="2" fill="#22A06B" transform="rotate(25 17 85)"/>
       <rect x="104" y="78" width="6" height="10" rx="2" fill="#FF5C8A" transform="rotate(-30 107 83)"/>
       <circle cx="26" cy="96" r="3" fill="#7C5CFF"/><circle cx="100" cy="98" r="3" fill="#FF8A3D"/>
       ${lbl("Parabéns!", 120, "#7C3AED")}` },
    obrigado: { nome: "Obrigado(a)!", svg:
      `<path d="M64 98C18 68 20 30 44 26c10-2 18 4 20 12 2-8 10-14 20-12 24 4 26 42-20 72z" fill="#FF5C8A" ${W}/>
       <path d="M40 40c4-6 12-6 14-2" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
       <path d="M50 58q14 14 28 0" stroke="#9F1239" stroke-width="4" fill="none" stroke-linecap="round"/>
       <circle cx="52" cy="50" r="3.5" fill="#9F1239"/><circle cx="76" cy="50" r="3.5" fill="#9F1239"/>
       ${brilho(108, 26, 6, "#FFC53D")}${brilho(18, 70, 5, "#FFC53D")}
       ${lbl("Obrigado(a)!", 121, "#E11D48", 17)}` },
    presente: { nome: "Presente!", svg:
      `<rect x="84" y="14" width="14" height="52" rx="7" fill="#FFC53D" transform="rotate(14 91 40)" ${W}/>
       <circle cx="54" cy="68" r="30" fill="#FFC53D" ${W}/>
       <circle cx="45" cy="64" r="3.8" fill="#3B2A1A"/><circle cx="63" cy="64" r="3.8" fill="#3B2A1A"/>
       <path d="M42 76q12 12 24 0" stroke="#3B2A1A" stroke-width="4" fill="none" stroke-linecap="round"/>
       <circle cx="38" cy="74" r="4" fill="#FF8FA3" opacity=".7"/><circle cx="70" cy="74" r="4" fill="#FF8FA3" opacity=".7"/>
       <path d="M104 10q6 4 6 12M110 30q6 2 8 8" stroke="#2447C6" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       ${lbl("Presente!", 120, "#2447C6")}` },
    dever: { nome: "Dever feito!", svg:
      `<rect x="32" y="16" width="64" height="84" rx="9" fill="#A16207" ${W}/>
       <rect x="39" y="27" width="50" height="66" rx="4" fill="#fff"/>
       <rect x="52" y="10" width="24" height="13" rx="5" fill="#94A3B8"/>
       ${[40, 56, 72].map(y => `<rect x="45" y="${y}" width="10" height="10" rx="2.5" fill="#DDF3E8" stroke="#22A06B" stroke-width="2"/><path d="M47 ${y + 5}l2.5 3 5-6" stroke="#22A06B" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="60" y="${y + 3}" width="23" height="4" rx="2" fill="#CBD5E1"/>`).join("")}
       ${lbl("Dever feito!", 120, "#15803D")}` },
    boaprova: { nome: "Boa prova!", svg:
      `<rect x="34" y="12" width="60" height="80" rx="7" fill="#EAF1FF" ${W}/>
       ${[26, 34, 42].map(y => `<rect x="42" y="${y}" width="${y === 42 ? 26 : 44}" height="3.5" rx="1.7" fill="#B8C6EA"/>`).join("")}
       <text x="64" y="80" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="32" fill="#E11D48">A+</text>
       <rect x="30" y="12" width="3" height="80" fill="#D23F58" opacity=".7"/>
       ${brilho(104, 22, 7, "#FFC53D")}${brilho(22, 64, 5, "#FFC53D")}
       ${lbl("Boa prova!", 120, "#2447C6")}` },
    revisao: { nome: "Revisão!", svg:
      `<g transform="rotate(-32 64 56)">
         <rect x="12" y="46" width="94" height="20" rx="4" fill="#FFC53D" ${W}/>
         <rect x="12" y="46" width="12" height="20" rx="4" fill="#FF8FA3"/>
         <rect x="24" y="46" width="9" height="20" fill="#94A3B8"/>
         <rect x="33" y="54" width="73" height="4" fill="#F59E0B"/>
         <polygon points="106,46 124,56 106,66" fill="#F5D0A9" ${W}/>
         <polygon points="118,53 124,56 118,59" fill="#334155"/>
       </g>
       <path d="M22 96q10-8 20 0t20 0 20 0" stroke="#2447C6" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       ${lbl("Revisão!", 121, "#EA580C")}` },
    estudar: { nome: "Hora de estudar", svg:
      `<path d="M64 36C50 26 30 26 14 32v58c16-6 36-6 50 4 14-10 34-10 50-4V32c-16-6-36-6-50 4z" fill="#2447C6" ${W}/>
       <path d="M64 38C52 30 36 30 22 34v48c14-4 30-4 42 4z" fill="#F8FAFC"/>
       <path d="M64 38c12-8 28-8 42-4v48c-14-4-30-4-42 4z" fill="#EEF2FF"/>
       ${[44, 52, 60, 68].map(y => `<path d="M30 ${y}q14-3 26 2M72 ${y + 2}q12-5 26-2" stroke="#B8C6EA" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join("")}
       ${brilho(64, 16, 8, "#FFC53D")}${brilho(22, 18, 5, "#FF8A3D")}${brilho(106, 18, 5, "#FF5C8A")}
       ${lbl("Hora de estudar", 119, "#2447C6", 16)}` },
    bomdia: { nome: "Bom dia!", svg:
      `${Array.from({ length: 10 }, (_, i) => `<rect x="60" y="4" width="8" height="18" rx="4" fill="#FFB020" transform="rotate(${i * 36} 64 56)"/>`).join("")}
       <circle cx="64" cy="56" r="30" fill="#FFC53D" ${W}/>
       <path d="M50 52q5-6 10 0M68 52q5-6 10 0" stroke="#7C2D12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <path d="M52 64q12 12 24 0" stroke="#7C2D12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <circle cx="46" cy="64" r="4.5" fill="#FF8FA3" opacity=".7"/><circle cx="82" cy="64" r="4.5" fill="#FF8FA3" opacity=".7"/>
       ${lbl("Bom dia!", 120, "#EA580C")}` },
    cafe: { nome: "Café e correção", svg:
      `<path d="M50 10q-6 8 0 14t0 14M64 6q-6 8 0 14t0 14M78 10q-6 8 0 14t0 14" stroke="#94A3B8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <path d="M84 56h6a13 13 0 0 1 0 26h-6" stroke="#2447C6" stroke-width="8" fill="none"/>
       <rect x="30" y="44" width="56" height="52" rx="12" fill="#2447C6" ${W}/>
       <ellipse cx="58" cy="48" rx="24" ry="5" fill="#6B3E26"/>
       <path d="M58 82c-12-8-12-16-6-17 3 0 5 2 6 4 1-2 3-4 6-4 6 1 6 9-6 17z" fill="#fff"/>
       ${lbl("Café e correção", 119, "#6B3E26", 16)}` },
    reuniao: { nome: "Reunião!", svg:
      `<rect x="24" y="20" width="80" height="74" rx="11" fill="#F8FAFC" ${W}/>
       <path d="M24 31a11 11 0 0 1 11-11h58a11 11 0 0 1 11 11v11H24z" fill="#EF4444"/>
       <rect x="40" y="12" width="8" height="18" rx="4" fill="#64748B"/><rect x="80" y="12" width="8" height="18" rx="4" fill="#64748B"/>
       <text x="64" y="39" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="11" fill="#fff" letter-spacing="1.5">HOJE</text>
       ${[[44, "#2447C6"], [64, "#22A06B"], [84, "#FF8A3D"]].map(([x, c]) => `<circle cx="${x}" cy="60" r="7" fill="${c}"/><path d="M${x - 11} 84a11 11 0 0 1 22 0z" fill="${c}"/>`).join("")}
       ${lbl("Reunião!", 120, "#DC2626")}` },
    ferias: { nome: "Férias!", svg:
      `<circle cx="104" cy="22" r="11" fill="#FFC53D"/>
       <path d="M70 58l12 38" stroke="#8B5E3C" stroke-width="5" stroke-linecap="round"/>
       <path d="M24 64a44 44 0 0 1 86-18z" fill="#EF4444" ${W}/>
       <path d="M46 50 38 70M67 37l2 22M88 39l8 16" stroke="#fff" stroke-width="7" opacity=".85"/>
       <ellipse cx="64" cy="98" rx="46" ry="8" fill="#FCD34D"/>
       <path d="M12 104q8-5 16 0t16 0M86 104q8-5 16 0t16 0" stroke="#0EA5E9" stroke-width="3" fill="none" stroke-linecap="round"/>
       ${lbl("Férias!", 121, "#0284C7")}` },
    /* ----- vida de professor ----- */
    cansado: { nome: "Cansado(a)", svg:
      `<circle cx="58" cy="60" r="36" fill="#FFC53D" ${W}/>
       <path d="M40 56q7 5 14 0M62 56q7 5 14 0" stroke="#7C2D12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <path d="M36 50h18M60 50h18" stroke="#B45309" stroke-width="3" stroke-linecap="round" opacity=".6"/>
       <ellipse cx="58" cy="76" rx="8" ry="5" fill="#7C2D12"/>
       <path d="M76 66q4 8 0 12q-4-4 0-12z" fill="#60A5FA"/>
       <text x="96" y="30" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="18" fill="#7C5CFF" stroke="#fff" stroke-width="4" paint-order="stroke">z</text>
       <text x="106" y="18" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="13" fill="#7C5CFF" stroke="#fff" stroke-width="4" paint-order="stroke">z</text>
       <rect x="92" y="78" width="24" height="13" rx="3" fill="#fff" stroke="#475569" stroke-width="2.5"/><rect x="116" y="82" width="3" height="5" rx="1" fill="#475569"/><rect x="95" y="81" width="5" height="7" rx="1" fill="#EF4444"/>
       ${lbl("Cansado(a)", 121, "#B45309", 18)}` },
    motivado: { nome: "Motivado(a)!", svg:
      `<path d="M52 86l-8 22 16-10 4 16 4-16 16 10-8-22z" fill="#FF8A3D" ${W}/>
       <path d="M58 88l6 14 6-14z" fill="#FFC53D"/>
       <path d="M64 8c18 12 24 34 18 64l-6 12H52l-6-12C40 42 46 20 64 8z" fill="#F8FAFC" ${W}/>
       <path d="M64 8c8 5 13 12 16 20H48c3-8 8-15 16-20z" fill="#EF4444"/>
       <circle cx="64" cy="48" r="9" fill="#2447C6" stroke="#93C5FD" stroke-width="3"/>
       <path d="M46 62l-12 14 14 2zM82 62l12 14-14 2z" fill="#EF4444"/>
       ${brilho(22, 30, 7, "#FFC53D")}${brilho(106, 22, 6, "#FF5C8A")}
       ${lbl("Motivado(a)!", 121, "#EA580C", 17)}` },
    sextou: { nome: "Sextou!", svg:
      `<rect x="26" y="20" width="76" height="72" rx="12" fill="#F8FAFC" ${W}/>
       <path d="M26 32a12 12 0 0 1 12-12h52a12 12 0 0 1 12 12v12H26z" fill="#7C5CFF"/>
       <text x="64" y="38" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="12" fill="#fff" letter-spacing="2">SEXTA</text>
       <polygon points="44,86 58,52 78,72" fill="#FFC53D" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"/>
       <path d="M50 72l12 8M54 62l14 10" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
       <path d="M70 52l8-8M80 60l10-2M66 46l0-8" stroke="#7C5CFF" stroke-width="3" stroke-linecap="round"/>
       <circle cx="86" cy="48" r="3" fill="#22A06B"/><circle cx="76" cy="40" r="2.5" fill="#FF5C8A"/><circle cx="90" cy="68" r="2.5" fill="#2447C6"/>
       <rect x="12" y="16" width="6" height="11" rx="2" fill="#22A06B" transform="rotate(25 15 21)"/>
       <rect x="110" y="14" width="6" height="11" rx="2" fill="#FF5C8A" transform="rotate(-30 113 19)"/>
       <circle cx="14" cy="70" r="3.5" fill="#FFC53D"/><circle cx="116" cy="62" r="3.5" fill="#2447C6"/><circle cx="20" cy="94" r="3" fill="#EF4444"/>
       ${lbl("Sextou!", 121, "#7C3AED", 21)}` },
    pilha: { nome: "Pilha de provas", svg:
      `${[0, 1, 2, 3, 4].map(i => `<rect x="${30 + (i % 2) * 5}" y="${78 - i * 13}" width="62" height="16" rx="3" fill="${i % 2 ? "#EAF1FF" : "#fff"}" stroke="#94A3B8" stroke-width="2" transform="rotate(${i % 2 ? 3 : -3} 64 ${86 - i * 13})"/>`).join("")}
       <rect x="30" y="10" width="62" height="18" rx="3" fill="#fff" stroke="#94A3B8" stroke-width="2"/>
       <text x="40" y="24" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="12" fill="#E11D48">A+ B C…</text>
       <g transform="rotate(35 104 60)"><rect x="98" y="30" width="10" height="46" rx="3" fill="#E11D48" ${W}/><polygon points="98,76 108,76 103,88" fill="#F5D0A9"/><polygon points="101,82 105,82 103,88" fill="#9F1239"/></g>
       <path d="M22 34q-4 8 0 12q4-4 0-12z" fill="#60A5FA"/>
       ${lbl("Pilha de provas", 120, "#BE123C", 16)}` },
    burocracia: { nome: "Burocracia…", svg:
      `<rect x="22" y="52" width="60" height="44" rx="5" fill="#FDE68A" ${W}/>
       <path d="M22 60h24l6-8h30" stroke="#F59E0B" stroke-width="3" fill="none"/>
       <rect x="30" y="30" width="54" height="48" rx="4" fill="#fff" stroke="#94A3B8" stroke-width="2" transform="rotate(-6 57 54)"/>
       ${[40, 48, 56].map(y => `<rect x="36" y="${y}" width="36" height="3.5" rx="1.7" fill="#CBD5E1" transform="rotate(-6 57 54)"/>`).join("")}
       <g transform="rotate(12 96 46)"><rect x="84" y="24" width="24" height="16" rx="4" fill="#8B5E3C" ${W}/><rect x="90" y="40" width="12" height="10" fill="#6B3E26"/><rect x="80" y="50" width="32" height="10" rx="3" fill="#EF4444"/></g>
       <text x="84" y="84" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="13" fill="#EF4444" stroke="#EF4444" stroke-width=".5" transform="rotate(-10 84 80)" opacity=".85">CARIMBO</text>
       ${lbl("Burocracia…", 120, "#92400E", 18)}` },
    respira: { nome: "Respira…", svg:
      `<circle cx="64" cy="56" r="44" fill="#A7F3D0" opacity=".55"/>
       <circle cx="64" cy="58" r="32" fill="#FFC53D" ${W}/>
       <path d="M48 56q6 5 12 0M68 56q6 5 12 0" stroke="#7C2D12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <path d="M56 70q8 5 16 0" stroke="#7C2D12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       <circle cx="48" cy="66" r="4" fill="#FF8FA3" opacity=".7"/><circle cx="80" cy="66" r="4" fill="#FF8FA3" opacity=".7"/>
       <path d="M20 28q6-6 12 0M96 22q6-6 12 0" stroke="#15803D" stroke-width="3" fill="none" stroke-linecap="round"/>
       ${lbl("Respira…", 121, "#15803D")}` },
    pi: { nome: "Matemágica!", svg:
      `<circle cx="64" cy="54" r="40" fill="#7C5CFF" ${W}/>
       <text x="64" y="76" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="60" fill="#fff">π</text>
       ${brilho(104, 18, 8, "#FFC53D")}${brilho(20, 22, 6, "#FF5C8A")}${brilho(108, 84, 5, "#22A06B")}
       <text x="24" y="92" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="14" fill="#7C5CFF">+</text>
       ${lbl("Matemágica!", 120, "#6D28D9", 18)}` },
    ciencia: { nome: "Ciência!", svg:
      `${[0, 60, 120].map(r => `<ellipse cx="64" cy="54" rx="44" ry="16" fill="none" stroke="#fff" stroke-width="15" transform="rotate(${r} 64 54)"/>`).join("")}
       ${[0, 60, 120].map(r => `<ellipse cx="64" cy="54" rx="44" ry="16" fill="none" stroke="#14B8A6" stroke-width="6" transform="rotate(${r} 64 54)"/>`).join("")}
       <circle cx="64" cy="54" r="11" fill="#FF5C8A" stroke="#fff" stroke-width="4"/>
       <circle cx="108" cy="54" r="5" fill="#2447C6"/><circle cx="42" cy="16" r="5" fill="#2447C6"/><circle cx="42" cy="92" r="5" fill="#2447C6"/>
       ${lbl("Ciência!", 121, "#0F766E")}` },
    eureca: { nome: "Eureca!", svg:
      `<path d="M64 6v10M26 22l7 7M102 22l-7 7M14 52h10M104 52h10" stroke="#FFB020" stroke-width="5" stroke-linecap="round"/>
       <path d="M64 20a30 30 0 0 0-18 54c4 3 6 7 6 10h24c0-3 2-7 6-10a30 30 0 0 0-18-54z" fill="#FFE066" ${W}/>
       <path d="M58 74V60M70 74V60M58 60c0-8 12-8 12 0" stroke="#F59E0B" stroke-width="3" fill="none" stroke-linecap="round"/>
       <rect x="52" y="86" width="24" height="7" rx="3" fill="#94A3B8"/><rect x="55" y="94" width="18" height="6" rx="3" fill="#64748B"/>
       <ellipse cx="54" cy="36" rx="5" ry="9" fill="#fff" opacity=".6" transform="rotate(25 54 36)"/>
       ${lbl("Eureca!", 121, "#D97706")}` },
    inclusao: { nome: "Inclusão", svg:
      `<defs><clipPath id="fg-cor"><path d="M64 98C18 68 20 30 44 26c10-2 18 4 20 12 2-8 10-14 20-12 24 4 26 42-20 72z"/></clipPath></defs>
       <path d="M64 98C18 68 20 30 44 26c10-2 18 4 20 12 2-8 10-14 20-12 24 4 26 42-20 72z" fill="#fff" ${W}/>
       <g clip-path="url(#fg-cor)">${["#EF4444", "#FF8A3D", "#FFC53D", "#22A06B", "#2447C6", "#7C5CFF"].map((c, i) => `<rect x="0" y="${24 + i * 12.5}" width="128" height="13" fill="${c}"/>`).join("")}</g>
       <path d="M40 40c4-6 12-6 14-2" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
       ${brilho(108, 24, 6, "#FFC53D")}${brilho(20, 22, 5, "#FF5C8A")}
       ${lbl("Inclusão", 120, "#6D28D9")}` },
    tempo: { nome: "Cada um no seu tempo", svg:
      `<path d="M14 84c0-8 8-10 16-8h58c6-10 8-22 14-24 6-2 8 6 4 14-4 10-10 18-18 18H22c-5 0-8 3-8 0z" fill="#A3E635" ${W}/>
       <path d="M100 52l-3-16M106 54l5-15" stroke="#65A30D" stroke-width="3.5" stroke-linecap="round"/>
       <circle cx="97" cy="34" r="4.5" fill="#1F2937"/><circle cx="112" cy="37" r="4.5" fill="#1F2937"/>
       <path d="M98 66q4 4 8 0" stroke="#365314" stroke-width="3" fill="none" stroke-linecap="round"/>
       <circle cx="54" cy="56" r="26" fill="#FF8A3D" ${W}/>
       <path d="M54 56m-3 0a3 3 0 1 1 6 0a8 8 0 1 1-16 0a13 13 0 1 1 26 0a18 18 0 1 1-36 0" stroke="#C2410C" stroke-width="3.5" fill="none" stroke-linecap="round"/>
       ${lbl("Cada um no", 106, "#15803D", 14)}${lbl("seu tempo", 122, "#15803D", 14)}` }
  };
  const PACOTES = [
    { nome: "Vida de professor", ids: ["sextou", "cansado", "motivado", "pilha", "burocracia", "respira", "cafe", "ferias"] },
    { nome: "Elogios", ids: ["nota10", "arrasou", "parabens", "obrigado"] },
    { nome: "Sala de aula", ids: ["presente", "dever", "boaprova", "revisao", "estudar"] },
    { nome: "Dia a dia", ids: ["bomdia", "cafe", "reuniao", "ferias"] },
    { nome: "Disciplinas", ids: ["pi", "ciencia", "eureca"] },
    { nome: "Inclusão", ids: ["inclusao", "tempo"] }
  ];
  function figurinha(id, tam) {
    const f = F[id]; if (!f) return "";
    return `<svg class="fig" viewBox="0 0 128 128" width="${tam || 128}" height="${tam || 128}" role="img" aria-label="Figurinha: ${f.nome}"><g filter="drop-shadow(0 2px 2px rgba(0,0,0,.18))">${f.svg}</g></svg>`;
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

  window.SOC_EXTRAS = { F, PACOTES, figurinha, ofensivo };
})();
