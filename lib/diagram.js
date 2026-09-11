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

// Ein interaktiver Positions-Marker im Playbook-Stil: kleiner, klar
// umrandeter Kreis mit dem (gruppierten) Kürzel mittig als Beschriftung.
// Jede Positionsgruppe (siehe lib/formation-diagram.js) bekommt eine feste
// Füllfarbe zur Unterscheidung — dadurch bleibt jeder Marker unabhängig
// vom Hintergrund immer gut lesbar, unabhängig ob Offense oder Defense.
// Der Rand ist bei allen Markern einheitlich dunkel/neutral, die
// Positionsfarben übernehmen die Unterscheidung bereits.
//
// `label` ist die vereinfachte, gruppierte On-Diagramm-Beschriftung (z.B.
// "OL" für LT/LG/C/RG/RT); `code` in den data-Attributen bleibt die
// spezifische Variante fürs Infofeld (z.B. "LT"). `color` ist die feste
// Positionsgruppen-Farbe (auch als data-Attribut hinterlegt, damit das
// Infofeld sie z.B. für den Kürzel-Chip wiederverwenden kann).
//
// Auswahl-Zustand (siehe .is-active in style.css) überschreibt NICHT die
// Füllung (das würde die Farbcodierung zerstören) — stattdessen zeigt ein
// zusätzlicher goldener Außenring plus leichte Vergrößerung die Auswahl an.
function positionDot(cx, cy, { id, code, name, desc, label, color, r = 9 }) {
  const stroke = "#26241d";
  const textColor = "#f5f1e6";
  return `
    <g class="position-dot" tabindex="0" role="button" data-id="${escapeXml(id)}" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" data-desc="${escapeXml(desc)}" data-color="${escapeXml(color)}" aria-label="${escapeXml(code)} – ${escapeXml(name)}">
      <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="transparent"/>
      <circle class="position-dot-ring" cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#c9962b" stroke-width="2.5"/>
      <circle class="position-dot-visual" cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${stroke}" stroke-width="1.4"/>
      <text class="position-dot-label" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="6.5" font-weight="700" font-family="var(--diagram-font, sans-serif)" fill="${textColor}" pointer-events="none">${escapeXml(label)}</text>
    </g>`;
}

// Generischer Spieler-Marker für Play-/Formations-Diagramme: Shape ist ein
// Attribut ("circle" für Offense, "square" für Defense) statt fest codiert,
// damit künftige Play-Diagramme (Power, Duo, Route-Concepts, …) dieselbe
// Funktion nutzen können. Anders als positionDot (Positionen-Seite) ohne
// Interaktions-/data-Attribute — ein reiner statischer Marker.
// `size` ist der Kreisradius bzw. die halbe Quadratseite (beide Shapes
// bekommen dieselbe Bounding-Box bei gleichem `size`).
function playerMarker(cx, cy, { shape = "circle", size = 13, fill = "none", stroke = "#000", strokeWidth = 1, label = "", labelColor = "#f5f1e6", fontSize = 8 } = {}) {
  const shapeMarkup =
    shape === "square"
      ? `<rect x="${cx - size}" y="${cy - size}" width="${size * 2}" height="${size * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
  const labelMarkup = label
    ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="700" font-family="var(--diagram-font, sans-serif)" fill="${labelColor}" pointer-events="none">${escapeXml(label)}</text>`
    : "";
  return `<g class="player-marker">${shapeMarkup}${labelMarkup}</g>`;
}

// Generischer Bewegungspfad für Play-Diagramme: `style` ist ein Attribut
// ("solid" für Lauf-/Routen-Pfade, "dashed" für Block-/Pull-Linien) statt
// fest codiert. `points` ist ein Array aus [x,y]-Paaren (mind. 2); die
// Pfeilspitze zeigt in Richtung des letzten Segments und sitzt am
// Endpunkt.
function pathArrow(points, { style = "solid", color = "#000", strokeWidth = 2.5, arrowSize = 7 } = {}) {
  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");
  const dash = style === "dashed" ? ` stroke-dasharray="${strokeWidth * 2.2} ${strokeWidth * 1.6}"` : "";
  const [ex, ey] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const angle = Math.atan2(ey - py, ex - px);
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  const arrowHead = `<polygon points="${ex},${ey} ${ex + arrowSize * Math.cos(a1)},${ey + arrowSize * Math.sin(a1)} ${ex + arrowSize * Math.cos(a2)},${ey + arrowSize * Math.sin(a2)}" fill="${color}" stroke="none"/>`;
  return `
    <g class="path-arrow">
      <polyline points="${pointsAttr}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${dash} stroke-linecap="round" stroke-linejoin="round"/>
      ${arrowHead}
    </g>`;
}

// Kleines Text-Label mit heller Knockout-Fläche dahinter, für kurze
// Beschriftungen direkt im Diagramm (z.B. "Kick-out", "Lead-Block", "Fake"
// bei Play-Diagrammen) — normale (nicht blockige) Schrift, da es sich um
// technische Anmerkungen handelt, nicht um Feld-Beschriftungen.
function calloutLabel(x, y, text, { color = "#000", bg = "#f5f1e6", fontSize = 10, align = "middle" } = {}) {
  const labelW = String(text).length * fontSize * 0.58 + 8;
  const boxX = align === "middle" ? x - labelW / 2 : align === "end" ? x - labelW : x;
  return `
    <g class="callout-label">
      <rect x="${boxX}" y="${y - fontSize}" width="${labelW}" height="${fontSize + 5}" fill="${bg}" fill-opacity="0.85"/>
      <text x="${x}" y="${y}" text-anchor="${align}" font-size="${fontSize}" font-weight="700" font-family="var(--diagram-font, sans-serif)" fill="${color}">${escapeXml(text)}</text>
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
  playerMarker,
  pathArrow,
  calloutLabel,
  svgDocument,
  escapeXml,
};
