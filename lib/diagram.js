// Wiederverwendbare SVG-Bausteine für technische Diagramme (Feld-/Play-
// Grafiken). Bewusst generisch gehalten und unabhängig vom Feld-Diagramm
// selbst, damit künftige Diagramme (Formationen, Coverage-Zonen, Route-
// Concepts, …) dieselben Bausteine nutzen können, statt jedes Mal neu zu
// erfinden. Alle Funktionen arbeiten in fertigen Pixel-Koordinaten — die
// Umrechnung von Yards/Fuß in Pixel passiert im jeweiligen Diagramm
// (siehe field-diagram.js), damit dieses Modul unabhängig vom Maßstab
// bleibt.

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[c]);
}

// Eine horizontale Maß-Linie im Stil technischer Zeichnungen: Doppelpfeil
// zwischen (x1,y) und (x2,y), senkrechte Endkappen an beiden Enden, Zahl
// zentriert über der Linie (mit weißem Knockout-Hintergrund, damit die
// Linie den Text nicht durchkreuzt).
function dimensionLineH({ x1, x2, y, label, color, capHalf = 5, fontSize = 12 }) {
  const midX = (x1 + x2) / 2;
  const labelW = String(label).length * fontSize * 0.62 + 8;
  return `
    <g class="dimension-line" stroke="${color}" fill="${color}">
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke-width="1"/>
      <line x1="${x1}" y1="${y - capHalf}" x2="${x1}" y2="${y + capHalf}" stroke-width="1"/>
      <line x1="${x2}" y1="${y - capHalf}" x2="${x2}" y2="${y + capHalf}" stroke-width="1"/>
      ${arrowHeadH(x1, y, "left", color)}
      ${arrowHeadH(x2, y, "right", color)}
      <rect x="${midX - labelW / 2}" y="${y - fontSize - 6}" width="${labelW}" height="${fontSize + 4}" fill="var(--diagram-bg, #fff)"/>
      <text x="${midX}" y="${y - 8}" text-anchor="middle" font-size="${fontSize}" font-family="var(--diagram-font, sans-serif)" stroke="none">${escapeXml(label)}</text>
    </g>`;
}

// Vertikale Variante derselben Maß-Linie (Breite/Höhe statt Länge).
// verticalLabel: true dreht die Beschriftung um 90° (liest sich entlang der
// Linie) — braucht dadurch nur noch fontSize-Breite statt der vollen
// Textbreite und erlaubt so mehrere Maßlinien eng nebeneinander, ohne dass
// sich die Labels überlappen. Rotation erfolgt um denselben Ankerpunkt, an
// dem der Text ohnehin schon zentriert ist, deshalb keine separate
// Koordinatenberechnung nötig.
function dimensionLineV({ y1, y2, x, label, color, capHalf = 5, fontSize = 12, verticalLabel = false }) {
  const midY = (y1 + y2) / 2;
  const labelW = String(label).length * fontSize * 0.62 + 8;
  const labelMarkup = `
      <rect x="${x - labelW / 2}" y="${midY - fontSize / 2 - 2}" width="${labelW}" height="${fontSize + 4}" fill="var(--diagram-bg, #fff)"/>
      <text x="${x}" y="${midY + fontSize / 2 - 2}" text-anchor="middle" font-size="${fontSize}" font-family="var(--diagram-font, sans-serif)" stroke="none">${escapeXml(label)}</text>`;
  const label_ = verticalLabel
    ? `<g transform="rotate(-90 ${x} ${midY})">${labelMarkup}</g>`
    : labelMarkup;
  return `
    <g class="dimension-line" stroke="${color}" fill="${color}">
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke-width="1"/>
      <line x1="${x - capHalf}" y1="${y1}" x2="${x + capHalf}" y2="${y1}" stroke-width="1"/>
      <line x1="${x - capHalf}" y1="${y2}" x2="${x + capHalf}" y2="${y2}" stroke-width="1"/>
      ${arrowHeadV(x, y1, "up", color)}
      ${arrowHeadV(x, y2, "down", color)}
      ${label_}
    </g>`;
}

function arrowHeadH(x, y, dir, color) {
  const s = 4;
  const dx = dir === "left" ? s : -s;
  return `<polygon points="${x},${y} ${x + dx},${y - s / 1.6} ${x + dx},${y + s / 1.6}" fill="${color}" stroke="none"/>`;
}

function arrowHeadV(x, y, dir, color) {
  const s = 4;
  const dy = dir === "up" ? s : -s;
  return `<polygon points="${x},${y} ${x - s / 1.6},${y + dy} ${x + s / 1.6},${y + dy}" fill="${color}" stroke="none"/>`;
}

// Blockige 3x5-Pixel-Zeichen (Retro-Look, keine Vektor-/System-Schrift) für
// Beschriftungen direkt auf dem Diagramm selbst (z.B. Yard-Zahlen,
// Endzonen-Label). Jedes "Pixel" ist ein eigenes <rect> mit
// shape-rendering="crispEdges", damit es beim Skalieren hart bleibt statt
// weichgezeichnet zu werden. Ziffern 0-5 und die für "ENDZONE" nötigen
// Buchstaben hinterlegt; bei Bedarf einfach nach demselben 3x5-Muster
// ergänzen.
const PIXEL_GLYPHS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  E: ["111", "100", "111", "100", "111"],
  N: ["101", "111", "111", "111", "101"],
  D: ["110", "101", "101", "101", "110"],
  Z: ["111", "001", "010", "100", "111"],
  O: ["111", "101", "101", "101", "111"],
};

// Liefert die Gesamtbreite (in SVG-Einheiten), die pixelNumber() für diesen
// Text bei gegebener Pixel-Einheit belegen würde — z.B. um passgenaue
// Kontrast-Chips dahinter zu platzieren.
function pixelTextWidth(text, unit) {
  const chars = String(text).toUpperCase().split("");
  return chars.length * 3 * unit + (chars.length - 1) * unit;
}

// Zeichnet Text/Zahlen aus den obigen 3x5-Rastern. (x,y) ist per Default die
// obere linke Ecke, `unit` die Kantenlänge eines einzelnen Pixels.
// align: "left" (Standard) oder "center" (x ist dann die Mitte).
function pixelNumber(x, y, text, { unit = 3, color = "#000", align = "left" } = {}) {
  const chars = String(text).toUpperCase().split("");
  const digitW = 3 * unit;
  const gap = unit;
  const totalW = chars.length * digitW + (chars.length - 1) * gap;
  let cursorX = align === "center" ? x - totalW / 2 : x;
  const rects = [];
  for (const ch of chars) {
    const pattern = PIXEL_GLYPHS[ch];
    if (pattern) {
      pattern.forEach((row, ry) => {
        row.split("").forEach((bit, rx) => {
          if (bit === "1") {
            rects.push(
              `<rect x="${cursorX + rx * unit}" y="${y + ry * unit}" width="${unit}" height="${unit}" fill="${color}"/>`
            );
          }
        });
      });
    }
    cursorX += digitW + gap;
  }
  return `<g shape-rendering="crispEdges">${rects.join("")}</g>`;
}

// Halbtransparenter dunkler "Chip" hinter einer Beschriftung, damit helle
// Pixel-Zeichen auf unruhigem/texturiertem Untergrund garantiert lesbar
// bleiben (statt nur auf Kontrast zur durchschnittlichen Hintergrundfarbe
// zu hoffen). (x,y) = obere linke Ecke des Textblocks, wie bei pixelNumber.
function pixelTextChip(x, y, width, height, { padding = 3, opacity = 0.5 } = {}) {
  return `<rect x="${x - padding}" y="${y - padding}" width="${width + padding * 2}" height="${height + padding * 2}" fill="#0b1c10" fill-opacity="${opacity}"/>`;
}

// Kleine L-förmige Eckklammern um ein Rechteck (0,0)-(width,height) — ein
// dezentes, wiederverwendbares Retro-Rahmen-Detail für ganze Diagramme.
function cornerBrackets(width, height, { size = 16, inset = 4, color = "#000", strokeWidth = 2 } = {}) {
  const corners = [
    [inset, inset, 1, 1], // oben links
    [width - inset, inset, -1, 1], // oben rechts
    [inset, height - inset, 1, -1], // unten links
    [width - inset, height - inset, -1, -1], // unten rechts
  ];
  const marks = corners.map(
    ([cx, cy, dx, dy]) =>
      `<polyline points="${cx},${cy + dy * size} ${cx},${cy} ${cx + dx * size},${cy}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
  );
  return `<g shape-rendering="crispEdges">${marks.join("")}</g>`;
}

// Deterministisches, aber unregelmäßig wirkendes Muster für die
// Turf-Dither-Auswahl (kein Math.random, damit der Build reproduzierbar
// bleibt).
function pseudoIndex(ix, iy, mod) {
  return (((ix * 5 + iy * 11 + Math.floor(ix / 3) * 7) % mod) + mod) % mod;
}

// Handgemachter Retro-Game-Rasen: feines Pixel-Dither aus mehreren
// Grüntönen (statt zweier flacher Streifenfarben) in Mähstreifen-Bändern.
// Arbeitet rein in Pixel-Koordinaten, damit jedes Diagramm seine eigene
// Yard->Pixel-Skalierung verwenden kann (siehe field-diagram.js und
// formation-diagram.js — beide nutzen exakt diese Funktion für denselben
// Rasen-Look, statt ihn zu duplizieren).
//
// x,y,width,height: zu füllender Bereich in Pixeln.
// cellPx: Kantenlänge einer Dither-Zelle in Pixeln.
// bandPx: Höhe eines Mähstreifen-Bandes in Pixeln (Band wechselt hell/dunkel).
// bandPhase: Pixel-Offset, damit die Bandgrenzen mit einer bestimmten
//   Bezugslinie (z.B. Goal Line oder Line of Scrimmage) übereinstimmen.
function turfPattern({
  x,
  y,
  width,
  height,
  cellPx,
  bandPx,
  bandPhase = 0,
  lightPalette,
  darkPalette,
}) {
  const rows = Math.ceil(height / cellPx);
  const cols = Math.ceil(width / cellPx);
  const rects = [];
  for (let iy = 0; iy < rows; iy++) {
    const cy = y + iy * cellPx;
    const cellH = Math.min(cellPx, y + height - cy);
    const band = Math.floor((cy - y + bandPhase) / bandPx);
    const palette = ((band % 2) + 2) % 2 === 0 ? lightPalette : darkPalette;
    for (let ix = 0; ix < cols; ix++) {
      const cx = x + ix * cellPx;
      const cellW = Math.min(cellPx, x + width - cx);
      const color = palette[pseudoIndex(ix, iy, palette.length)];
      rects.push(`<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" fill="${color}"/>`);
    }
  }
  return `<g shape-rendering="crispEdges">${rects.join("")}</g>`;
}

// Ein interaktiver Positions-Punkt (siehe assets/js/positions.js für die
// Interaktions-Schicht): graues Kreis-Element, per Klasse/CSS umfärgbar,
// mit den Detail-Infos als data-Attribute — Tastatur-fokussierbar und mit
// ausreichend großer, unsichtbarer Trefferfläche fürs Tippen auf Touch.
function positionDot(cx, cy, { id, code, name, desc, r = 9, color = "#9a958a" }) {
  return `
    <g class="position-dot" tabindex="0" role="button" data-id="${escapeXml(id)}" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" data-desc="${escapeXml(desc)}" aria-label="${escapeXml(code)} – ${escapeXml(name)}">
      <circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="transparent"/>
      <circle class="position-dot-visual" cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#1c1b18" stroke-width="1.5"/>
    </g>`;
}

function svgDocument(width, height, innerContent, { fontFamily = "sans-serif" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${fontFamily}">
${innerContent}
</svg>`;
}

module.exports = {
  dimensionLineH,
  dimensionLineV,
  pixelNumber,
  pixelTextWidth,
  pixelTextChip,
  cornerBrackets,
  turfPattern,
  positionDot,
  svgDocument,
  escapeXml,
};
