// =====================================================================
// PORTRAITS : visages générés (SVG) — unique et stable pour chaque joueur
// =====================================================================
(function () {
  "use strict";
  const SKIN = [["#f6d7bd", "#e3b996"], ["#efc5a0", "#d9a37c"], ["#dca77b", "#c08659"], ["#c58a5e", "#a66c42"], ["#9c6a45", "#7d5030"], ["#6e4630", "#53301f"], ["#4a2e20", "#36200f"]];
  const DARK = /s[ée]n[ée]gal|ivoire|cameroun|mali|nigeria|ghana|congo|guin[ée]e|angola|gabon|togo|b[ée]nin|burkina|libéria|liberia|sierra|zambie|zimbabwe|kenya|tanzanie|ouganda|rwanda|haïti|jama[iï]que|cap-vert|mozambique|soudan|éthiopie|tchad|niger|centrafrique|comores/i;
  const MEDIUM = /maroc|alg[ée]rie|tunisie|[ée]gypte|turquie|iran|arabie|colombie|br[ée]sil|m[ée]xique|p[ée]rou|chili|uruguay|argentine|paraguay|[ée]quateur|venezuela|japon|cor[ée]e|chine|inde|pakistan|indon[ée]sie|philippines|isra[ëe]l|liban/i;
  const HAIR = ["#15100c", "#241811", "#3a2616", "#5a3a20", "#8a5a2b", "#b98a46", "#d8b46a", "#7a2f1a", "#6d6d70"];
  const EYES = ["#3b2a1d", "#4d3523", "#2f4a6b", "#3e6a4a", "#5b6470"];
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f)))); return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""); }

  window.dsFace = function (p, cls) {
    const r = rng(hash(String(p.id) + (p.lastName || "") + (p.firstName || "")));
    const nat = p.nationality || "";
    const dn = /^(diallo|traor[ée]|n.?diaye|camara|keita|kon[ée]|sow|cissé|cisse|diop|sylla|tour[ée]|bamba|coulibaly|fofana|mendy|gomis|doucour[ée]|sissoko|konat[ée]|diakit[ée]|ba|ndiaye|kant[ée]|dembele|dembélé)$/i.test(p.lastName || "");
    let si = dn ? 4 + Math.floor(r() * 3) : DARK.test(nat) ? 4 + Math.floor(r() * 3) : MEDIUM.test(nat) ? 1 + Math.floor(r() * 3) : Math.floor(r() * 3);
    if (r() < 0.06) si = Math.min(6, si + 1);
    const [s1, s2] = SKIN[si];
    const dark = si >= 5;
    let hair = HAIR[Math.floor(r() * HAIR.length)];
    if (dark || si >= 4) hair = HAIR[Math.floor(r() * 2)];
    else if (si <= 1 && r() < 0.5) hair = HAIR[1 + Math.floor(r() * 7)];
    const age = p.age || 25;
    if (age >= 34 && r() < 0.6) hair = "#8a8a8e";
    const eye = EYES[Math.floor(r() * EYES.length)];
    let style = Math.floor(r() * 6);
    if (dark && style === 3 && r() < 0.5) style = 2;
    if (age >= 33 && r() < 0.3) style = 4;
    const beard = age >= 22 && r() < 0.28;
    const smile = 106 + r() * 5, wide = 10 + r() * 3;
    const browY = 64 + Math.floor(r() * 3), eyeGap = 15 + Math.floor(r() * 3);
    const id = "f" + p.id + Math.floor(r() * 1e5);
    const hairShape = [
      `M45 72 C42 38 64 26 80 26 C98 26 118 38 115 72 C109 56 98 50 80 50 C62 50 51 56 45 72Z`,
      `M47 66 C47 40 66 33 80 33 C96 33 113 40 113 66 C106 54 96 52 80 52 C64 52 54 54 47 66Z`,
      `M40 74 C26 42 50 18 80 20 C110 18 134 42 120 74 C114 52 98 47 80 47 C62 47 46 52 40 74Z`,
      `M44 74 C38 36 70 14 98 24 C120 31 119 54 115 72 C109 54 96 43 80 45 C64 45 51 54 44 74Z`,
      ``,
      `M44 86 C36 40 62 25 80 25 C100 25 124 40 116 86 L110 64 C100 51 60 51 50 64Z`
    ][style];
    const curls = style === 2 ? [[48, 36], [62, 26], [80, 22], [98, 26], [112, 36], [40, 56], [120, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${hair}"/>`).join("") : "";
    const kitVar = "var(--kit,#2d6a4f)";
    return `<svg class="ds-face ${cls || ""}" viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Portrait de ${(p.firstName || "")} ${(p.lastName || "")}">
      <defs>
        <radialGradient id="${id}h" cx="42%" cy="35%" r="75%"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></radialGradient>
        <linearGradient id="${id}j" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${kitVar}"/><stop offset="1" stop-color="${kitVar}" stop-opacity=".75"/></linearGradient>
      </defs>
      <path d="M6 190 C10 142 38 124 80 124 C122 124 150 142 154 190Z" fill="url(#${id}j)"/>
      <path d="M6 190 C10 142 38 124 80 124 C122 124 150 142 154 190Z" fill="#000" opacity=".12"/>
      <path d="M60 125 L80 152 L100 125 Z" fill="${s2}"/>
      <path d="M56 123 L80 156 L104 123" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="5" stroke-linejoin="round"/>
      <rect x="65" y="98" width="30" height="36" rx="12" fill="${s2}"/>
      <ellipse cx="46" cy="84" rx="5.5" ry="9.5" fill="${s2}"/><ellipse cx="114" cy="84" rx="5.5" ry="9.5" fill="${s2}"/>
      <ellipse cx="80" cy="80" rx="34" ry="42" fill="url(#${id}h)"/>
      ${curls}${style === 4 ? "" : `<path d="${hairShape}" fill="${hair}"/>`}
      ${style === 1 ? `<path d="${hairShape}" fill="#000" opacity=".25"/>` : ""}
      <path d="M${80 - eyeGap - 8} ${browY} Q${80 - eyeGap} ${browY - 4} ${80 - eyeGap + 8} ${browY}" stroke="${shade(hair, 0.8)}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M${80 + eyeGap - 8} ${browY} Q${80 + eyeGap} ${browY - 4} ${80 + eyeGap + 8} ${browY}" stroke="${shade(hair, 0.8)}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="${80 - eyeGap}" cy="77" rx="6.5" ry="3.8" fill="#fff"/><ellipse cx="${80 + eyeGap}" cy="77" rx="6.5" ry="3.8" fill="#fff"/>
      <circle cx="${80 - eyeGap}" cy="77" r="3" fill="${eye}"/><circle cx="${80 + eyeGap}" cy="77" r="3" fill="${eye}"/>
      <circle cx="${80 - eyeGap}" cy="77" r="1.2" fill="#000"/><circle cx="${80 + eyeGap}" cy="77" r="1.2" fill="#000"/>
      <path d="M${80 - eyeGap - 7} 75.5 Q${80 - eyeGap} 71.5 ${80 - eyeGap + 7} 75.5M${80 + eyeGap - 7} 75.5 Q${80 + eyeGap} 71.5 ${80 + eyeGap + 7} 75.5" stroke="${s2}" stroke-width="1.4" fill="none"/>
      <path d="M80 80 C77 92 73 96 77 99 C79.5 100.5 82 100.5 84 99 C87 96 83 92 80 80" fill="none" stroke="${shade(s2, 0.78)}" stroke-width="1.8" stroke-linecap="round"/>
      ${beard ? `<path d="M47 86 C48 120 66 132 80 132 C94 132 112 120 113 86 C106 104 96 110 80 110 C64 110 54 104 47 86Z" fill="${hair}" opacity=".88"/>` : ""}
      <path d="M${80 - wide} ${smile} Q80 ${smile + 7} ${80 + wide} ${smile}" stroke="${beard ? "#e9c9c0" : "#8a3f38"}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="68" cy="52" rx="14" ry="9" fill="#fff" opacity=".07"/>
    </svg>`;
  };

  // petits visages devant chaque nom de joueur dans les tableaux
  function decorate() {
    try {
      if (typeof getPlayer !== "function" || typeof state === "undefined" || !state || !state.ds) return;
      document.querySelectorAll("td button[data-playercard]:not([data-faced]), td [data-playercard]:not([data-faced])").forEach((b) => {
        b.setAttribute("data-faced", "1");
        const p = getPlayer(parseInt(b.getAttribute("data-playercard"), 10));
        if (!p) return;
        const sp = document.createElement("span");
        sp.className = "ds-face-row";
        sp.innerHTML = window.dsFace(p, "ds-face-sm");
        b.parentNode.insertBefore(sp, b);
      });
    } catch (e) {}
  }
  let t = null;
  const schedule = () => { clearTimeout(t); t = setTimeout(decorate, 60); };
  const start = () => { const app = document.getElementById("app") || document.body; new MutationObserver(schedule).observe(app, { childList: true, subtree: true }); schedule(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
