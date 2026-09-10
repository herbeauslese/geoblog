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
function dimensionLineV({ y1, y2, x, label, color, capHalf = 5, fontSize = 12 }) {
  const midY = (y1 + y2) / 2;
  const labelW = String(label).length * fontSize * 0.62 + 8;
  return `
    <g class="dimension-line" stroke="${color}" fill="${color}">
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke-width="1"/>
      <line x1="${x - capHalf}" y1="${y1}" x2="${x + capHalf}" y2="${y1}" stroke-width="1"/>
      <line x1="${x - capHalf}" y1="${y2}" x2="${x + capHalf}" y2="${y2}" stroke-width="1"/>
      ${arrowHeadV(x, y1, "up", color)}
      ${arrowHeadV(x, y2, "down", color)}
      <rect x="${x - labelW / 2}" y="${midY - fontSize / 2 - 2}" width="${labelW}" height="${fontSize + 4}" fill="var(--diagram-bg, #fff)"/>
      <text x="${x}" y="${midY + fontSize / 2 - 2}" text-anchor="middle" font-size="${fontSize}" font-family="var(--diagram-font, sans-serif)" stroke="none">${escapeXml(label)}</text>
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

// Blockige 3x5-Pixel-Ziffern (Retro-Look, keine Vektor-/System-Schrift) für
// Beschriftungen direkt auf dem Diagramm selbst (z.B. Yard-Zahlen). Jedes
// "Pixel" ist ein eigenes <rect> mit shape-rendering="crispEdges", damit es
// beim Skalieren hart bleibt statt weichgezeichnet zu werden. Nur Ziffern
// 0-5 hinterlegt (reicht für Yard-Zahlen 10-50); bei Bedarf einfach
// ergänzen.
const PIXEL_DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
};

// Zeichnet eine Zahl aus den obigen 3x5-Rastern. (x,y) ist die obere linke
// Ecke, `unit` die Kantenlänge eines einzelnen Pixels in SVG-Einheiten.
// align: "left" (Standard) oder "center" (x ist dann die Mitte).
function pixelNumber(x, y, text, { unit = 3, color = "#000", align = "left" } = {}) {
  const digits = String(text).split("");
  const digitW = 3 * unit;
  const gap = unit;
  const totalW = digits.length * digitW + (digits.length - 1) * gap;
  let cursorX = align === "center" ? x - totalW / 2 : x;
  const rects = [];
  for (const ch of digits) {
    const pattern = PIXEL_DIGITS[ch];
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

function svgDocument(width, height, innerContent, { fontFamily = "sans-serif" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${fontFamily}">
${innerContent}
</svg>`;
}

module.exports = { dimensionLineH, dimensionLineV, pixelNumber, svgDocument, escapeXml };
