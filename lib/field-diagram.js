// Technische Draufsicht (Grundriss) eines kompletten NFL-Spielfelds,
// inklusive beider Endzonen. Alle Positionen werden aus echten Yard-/Fuß-
// Maßen abgeleitet (nicht aus geschätzten Pixelwerten) und dann über
// PX_PER_YARD in Pixel umgerechnet — siehe Projektbrief: reale Football-
// Maße sind die Referenz, nicht Freihand-Schätzungen.
//
// Ausrichtung: vertikal — die Spiellänge läuft von oben (eigene Endzone)
// nach unten (gegnerische Endzone), analog zu späteren Play-Diagrammen.
//
// Optik: handgemachter Retro-Game-Rasen (Pixel-Dither aus mehreren
// Grüntönen) statt flacher Streifen. Endzonen mit eigenem diagonalem
// Streifenmuster + großer "ENDZONE"-Beschriftung (blau/rot) und gelben
// Pixel-Art-Goalposts. Yard-Linien/-Zahlen/Hash-Marks in kräftigem Creme
// mit harten Pixelkanten; alle hellen Beschriftungen bekommen einen
// halbtransparenten dunklen Kontrast-Chip dahinter, damit sie auf dem
// texturierten Rasen auf einen Blick lesbar bleiben (pixelTextChip).
//
// WICHTIG: Echtes, inline ins Seiten-Markup eingebettetes SVG (siehe
// build.js: renderFigure fügt den Rückgabewert von buildFieldDiagramSvg()
// direkt in die Artikel-HTML ein, kein <img> auf eine Bilddatei) — nur so
// lassen sich später Spieler-Positionen/Play-Diagramme mit datengetriebenen
// Koordinaten auf demselben Feld-Unterbau überlagern.

const {
  dimensionLineH,
  dimensionLineV,
  pixelNumber,
  pixelTextWidth,
  pixelTextChip,
  cornerBrackets,
  svgDocument,
} = require("./diagram");

// ---- Reale Maße (Yards) ----
const ENDZONE_YD = 10;
const PLAYING_FIELD_YD = 100;
const FIELD_LENGTH_YD = PLAYING_FIELD_YD + 2 * ENDZONE_YD; // 120
const FIELD_WIDTH_YD = 53 + 1 / 3; // 53.33
const HASH_GAP_YD = 18.5 / 3; // 18 Fuß 6 Zoll = 6,1667 Yards Abstand der Hash Marks
const YARD_LINE_STEP_YD = 5;
const YARD_NUMBER_STEP_YD = 10;

const PX_PER_YARD = 7.5;
const CELL_YD = 1; // Rasterzellen-Größe für das Turf-Dither (1 Yard/Zelle)

// Mehrere leicht unterschiedliche Grüntöne statt zweier flacher Flächen —
// je 3 Varianten pro Mähstreifen-Ton (hell/dunkel), macht 6 Töne insgesamt.
const TURF_LIGHT = ["#3f7a4c", "#458350", "#3a7548"];
const TURF_DARK = ["#356a41", "#3b7146", "#31643c"];
// Endzonen: eigenes, deutlich dunkleres diagonales Streifenmuster.
const ENDZONE_DARK = ["#173a20", "#1c4226"];

const COLOR_MARK = "#f5f1e6"; // kräftiges Creme für Linien/Zahlen/Hash-Marks
const COLOR_ACCENT = "#c9962b"; // eine einzige Akzentfarbe für die Maß-Linien (Gold), unverändert
const COLOR_GOALPOST = "#ffd400"; // gelbe Pixel-Art-Goalposts
const COLOR_ENDZONE_BLUE = "#3d7fc9";
const COLOR_ENDZONE_RED = "#c9433d";

const MARGIN_TOP = 44; // Platz für die oberen Goalpost-Uprights
const MARGIN_LEFT = 40; // Platz für seitliche Yard-Zahlen
// Drei kompakte, eng gestapelte vertikale Maßlinien (10/100/120 Yards)
// direkt an der rechten Feldkante. Die Beschriftung läuft dank
// verticalLabel gedreht MIT der Linie statt quer darüber, deshalb reicht
// ein schmaler Spaltenabstand (statt der vollen horizontalen Textbreite).
const DIM_FONT_SIZE = 15;
const DIM_COL_GAP = 30;
const MARGIN_RIGHT = 18 + 2 * DIM_COL_GAP + 26;
const MARGIN_BOTTOM = 44 + 46; // untere Goalpost-Uprights + Breiten-Maßlinie darunter

const fieldW = FIELD_WIDTH_YD * PX_PER_YARD;
const fieldH = FIELD_LENGTH_YD * PX_PER_YARD;
const SVG_W = MARGIN_LEFT + fieldW + MARGIN_RIGHT;
const SVG_H = MARGIN_TOP + fieldH + MARGIN_BOTTOM;

// acrossYd = Position quer zur Spielrichtung (0..53⅓, die frühere x-Achse)
// alongYd  = Position in Spielrichtung (0..120, die frühere y-Achse)
function screenX(acrossYd) {
  return MARGIN_LEFT + acrossYd * PX_PER_YARD;
}
function screenY(alongYd) {
  return MARGIN_TOP + alongYd * PX_PER_YARD;
}

// Deterministisches, aber unregelmäßig wirkendes Muster für die
// Dither-Auswahl (kein Math.random, damit der Build reproduzierbar bleibt).
function pseudoIndex(ix, iy, mod) {
  return ((ix * 5 + iy * 11 + Math.floor(ix / 3) * 7) % mod + mod) % mod;
}

// Zeichnet eine Zahl als blockige Pixel-Ziffern MIT dunklem Kontrast-Chip
// dahinter, damit sie auf dem texturierten Rasen auf einen Blick lesbar
// bleibt (Punkt 1 des Feedbacks) — ein kleiner Wrapper um pixelNumber, der
// im Feld-Diagramm mehrfach gebraucht wird.
function legibleLabel(x, y, text, unit, color, align = "left") {
  const w = pixelTextWidth(text, unit);
  const h = 5 * unit;
  const boxX = align === "center" ? x - w / 2 : x;
  return pixelTextChip(boxX, y, w, h) + pixelNumber(x, y, text, { unit, color, align });
}

function buildFieldDiagramSvg() {
  const parts = [];
  parts.push(`<g shape-rendering="crispEdges">`);

  // ---- Turf-Dither: Spielfeld (feine Pixel-Textur statt zwei flacher Töne) ----
  const cols = Math.ceil(FIELD_WIDTH_YD / CELL_YD);
  for (let iy = 0; iy * CELL_YD < PLAYING_FIELD_YD; iy++) {
    const alongYd = ENDZONE_YD + iy * CELL_YD;
    const band = Math.floor((alongYd - ENDZONE_YD) / YARD_LINE_STEP_YD) % 2;
    const palette = band === 0 ? TURF_LIGHT : TURF_DARK;
    const cellH = Math.min(CELL_YD, ENDZONE_YD + PLAYING_FIELD_YD - alongYd);
    for (let ix = 0; ix < cols; ix++) {
      const acrossYd = ix * CELL_YD;
      const cellW = Math.min(CELL_YD, FIELD_WIDTH_YD - acrossYd);
      const color = palette[pseudoIndex(ix, iy, palette.length)];
      parts.push(
        `<rect x="${screenX(acrossYd)}" y="${screenY(alongYd)}" width="${cellW * PX_PER_YARD}" height="${cellH * PX_PER_YARD}" fill="${color}"/>`
      );
    }
  }

  // ---- Turf-Dither: Endzonen (eigenes diagonales Streifenmuster, dunkler) ----
  for (const ezStartYd of [0, ENDZONE_YD + PLAYING_FIELD_YD]) {
    for (let iy = 0; iy * CELL_YD < ENDZONE_YD; iy++) {
      const alongYd = ezStartYd + iy * CELL_YD;
      const cellH = Math.min(CELL_YD, ezStartYd + ENDZONE_YD - alongYd);
      for (let ix = 0; ix < cols; ix++) {
        const acrossYd = ix * CELL_YD;
        const cellW = Math.min(CELL_YD, FIELD_WIDTH_YD - acrossYd);
        const stripe = Math.floor((ix + iy) / 2) % 2;
        parts.push(
          `<rect x="${screenX(acrossYd)}" y="${screenY(alongYd)}" width="${cellW * PX_PER_YARD}" height="${cellH * PX_PER_YARD}" fill="${ENDZONE_DARK[stripe]}"/>`
        );
      }
    }
  }

  // ---- ENDZONE-Beschriftung: groß, zentriert, blau bzw. rot ----
  const ENDZONE_UNIT = 7;
  const endzoneLabelH = 5 * ENDZONE_UNIT;
  const endzoneCenterX = screenX(FIELD_WIDTH_YD / 2);
  parts.push(
    legibleLabel(endzoneCenterX, screenY(ENDZONE_YD / 2) - endzoneLabelH / 2, "ENDZONE", ENDZONE_UNIT, COLOR_ENDZONE_BLUE, "center")
  );
  parts.push(
    legibleLabel(
      endzoneCenterX,
      screenY(ENDZONE_YD + PLAYING_FIELD_YD + ENDZONE_YD / 2) - endzoneLabelH / 2,
      "ENDZONE",
      ENDZONE_UNIT,
      COLOR_ENDZONE_RED,
      "center"
    )
  );

  // Feld-Außenrahmen
  parts.push(
    `<rect x="${screenX(0)}" y="${screenY(0)}" width="${fieldW}" height="${fieldH}" fill="none" stroke="${COLOR_MARK}" stroke-width="2.5"/>`
  );

  // Goal Lines (Grenze Endzone/Spielfeld) kräftiger
  for (const alongYd of [ENDZONE_YD, ENDZONE_YD + PLAYING_FIELD_YD]) {
    parts.push(`<line x1="${screenX(0)}" y1="${screenY(alongYd)}" x2="${screenX(FIELD_WIDTH_YD)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="3"/>`);
  }

  // ---- Yard-Linien alle 5 Yards über die volle Breite ----
  for (let alongYd = ENDZONE_YD; alongYd <= ENDZONE_YD + PLAYING_FIELD_YD; alongYd += YARD_LINE_STEP_YD) {
    if (alongYd === ENDZONE_YD || alongYd === ENDZONE_YD + PLAYING_FIELD_YD) continue; // Goal Lines schon gezeichnet
    parts.push(
      `<line x1="${screenX(0)}" y1="${screenY(alongYd)}" x2="${screenX(FIELD_WIDTH_YD)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="2"/>`
    );
  }

  // ---- Hash Marks: kurze Ticks alle 1 Yard, 18'6" auseinander ----
  const hashOffsetYd = HASH_GAP_YD / 2;
  const hashX1 = FIELD_WIDTH_YD / 2 - hashOffsetYd;
  const hashX2 = FIELD_WIDTH_YD / 2 + hashOffsetYd;
  const hashLenYd = 0.5;
  for (let alongYd = ENDZONE_YD; alongYd <= ENDZONE_YD + PLAYING_FIELD_YD; alongYd += 1) {
    for (const hx of [hashX1, hashX2]) {
      parts.push(
        `<line x1="${screenX(hx - hashLenYd / 2)}" y1="${screenY(alongYd)}" x2="${screenX(hx + hashLenYd / 2)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="2"/>`
      );
    }
  }

  // ---- Yard-Zahlen alle 10 Yards, links und rechts, als blockige Pixel-Ziffern + Kontrast-Chip ----
  const NUM_UNIT = 4.5;
  for (let alongYd = ENDZONE_YD + YARD_NUMBER_STEP_YD; alongYd < ENDZONE_YD + PLAYING_FIELD_YD; alongYd += YARD_NUMBER_STEP_YD) {
    const distToTop = alongYd - ENDZONE_YD;
    const distToBottom = ENDZONE_YD + PLAYING_FIELD_YD - alongYd;
    const label = String(Math.min(distToTop, distToBottom));
    const cy = screenY(alongYd) - (NUM_UNIT * 5) / 2;
    const numW = pixelTextWidth(label, NUM_UNIT);
    parts.push(legibleLabel(screenX(0) + 8, cy, label, NUM_UNIT, COLOR_MARK));
    parts.push(legibleLabel(screenX(FIELD_WIDTH_YD) - 8 - numW, cy, label, NUM_UNIT, COLOR_MARK));
  }

  // ---- Goalposts: gelbe Pixel-Art-"H"-Struktur an der hinteren Torlinie ----
  const UPRIGHT_LEN = 30;
  const POST_THICK = 3;
  function goalpost(alongYd, direction) {
    const backY = screenY(alongYd);
    const tipY = backY + direction * UPRIGHT_LEN;
    const crossY = backY + direction * (UPRIGHT_LEN / 2);
    const x1 = screenX(hashX1);
    const x2 = screenX(hashX2);
    const yTop = Math.min(backY, tipY);
    const yLen = Math.abs(tipY - backY);
    return [
      `<rect x="${x1 - POST_THICK / 2}" y="${yTop}" width="${POST_THICK}" height="${yLen}" fill="${COLOR_GOALPOST}"/>`,
      `<rect x="${x2 - POST_THICK / 2}" y="${yTop}" width="${POST_THICK}" height="${yLen}" fill="${COLOR_GOALPOST}"/>`,
      `<rect x="${x1}" y="${crossY - POST_THICK / 2}" width="${x2 - x1}" height="${POST_THICK}" fill="${COLOR_GOALPOST}"/>`,
    ].join("");
  }
  parts.push(`<g shape-rendering="crispEdges">${goalpost(0, -1)}${goalpost(FIELD_LENGTH_YD, 1)}</g>`);

  parts.push(`</g>`);

  // ---- Maß-Linien (eine Akzentfarbe, Logik unverändert aus dem Diagramm-Framework) ----
  // Breite: horizontale Maßlinie unterhalb des Felds (unter den Goalpost-Uprights).
  parts.push(
    dimensionLineH({
      x1: screenX(0),
      x2: screenX(FIELD_WIDTH_YD),
      y: screenY(FIELD_LENGTH_YD) + UPRIGHT_LEN + 34,
      label: "53⅓ Yards",
      color: COLOR_ACCENT,
      fontSize: DIM_FONT_SIZE,
      capHalf: 7,
    })
  );

  // Länge: drei kompakte, eng an der Feldkante gestapelte vertikale
  // Maßlinien mit gedrehter Beschriftung (siehe DIM_COL_GAP oben) statt
  // weit auseinandergezogener paralleler Linien.
  const col1X = screenX(FIELD_WIDTH_YD) + 18;
  const col2X = col1X + DIM_COL_GAP;
  const col3X = col2X + DIM_COL_GAP;

  parts.push(
    dimensionLineV({ y1: screenY(0), y2: screenY(ENDZONE_YD), x: col1X, label: "10 Yards", color: COLOR_ACCENT, fontSize: DIM_FONT_SIZE, capHalf: 6, verticalLabel: true })
  );
  parts.push(
    dimensionLineV({
      y1: screenY(ENDZONE_YD),
      y2: screenY(ENDZONE_YD + PLAYING_FIELD_YD),
      x: col2X,
      label: "100 Yards",
      color: COLOR_ACCENT,
      fontSize: DIM_FONT_SIZE,
      capHalf: 6,
      verticalLabel: true,
    })
  );
  parts.push(
    dimensionLineV({ y1: screenY(0), y2: screenY(FIELD_LENGTH_YD), x: col3X, label: "120 Yards", color: COLOR_ACCENT, fontSize: DIM_FONT_SIZE, capHalf: 6, verticalLabel: true })
  );

  // ---- Rahmen-Polish: dezente Eckklammern in der Akzentfarbe ----
  parts.push(cornerBrackets(SVG_W, SVG_H, { size: 18, inset: 6, color: COLOR_ACCENT, strokeWidth: 2.5 }));

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

module.exports = { buildFieldDiagramSvg };
