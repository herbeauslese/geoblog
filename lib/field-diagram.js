// Technische Draufsicht (Grundriss) eines kompletten NFL-Spielfelds,
// inklusive beider Endzonen. Alle Positionen werden aus echten Yard-/Fuß-
// Maßen abgeleitet (nicht aus geschätzten Pixelwerten) und dann über
// PX_PER_YARD in Pixel umgerechnet — siehe Projektbrief: reale Football-
// Maße sind die Referenz, nicht Freihand-Schätzungen.
//
// Ausrichtung: vertikal — die Spiellänge läuft von oben (eigene Endzone)
// nach unten (gegnerische Endzone), analog zu späteren Play-Diagrammen
// ("downfield" = nach oben/unten statt links/rechts). Die Feldbreite liegt
// entsprechend auf der horizontalen Achse.
//
// Optik: derselbe grüne Rasenstreifen-Look wie der Seiten-Hintergrund
// (siehe assets/css/style.css, body-Hintergrund) statt eines neutralen
// "wissenschaftlichen" Grau — Yard-Linien/-Zahlen/Hash-Marks in kräftigem
// Creme mit harten Pixelkanten (shape-rendering: crispEdges), keine
// Antialiasing-Look. Die Maß-Linien-Annotationen (Doppelpfeile) bleiben
// wie im Diagramm-Framework definiert, nur in der jetzt gedrehten
// Ausrichtung platziert.
//
// WICHTIG: Das hier ist echtes, inline ins Seiten-Markup eingebettetes SVG
// (siehe build.js: renderFigure fügt den Rückgabewert von
// buildFieldDiagramSvg() direkt in die Artikel-HTML ein, kein <img> auf
// eine Bilddatei) — nur so lassen sich später Spieler-Positionen und
// Play-Diagramme mit datengetriebenen Koordinaten auf demselben
// Feld-Unterbau überlagern.

const { dimensionLineH, dimensionLineV, pixelNumber, svgDocument } = require("./diagram");

// ---- Reale Maße (Yards) ----
const ENDZONE_YD = 10;
const PLAYING_FIELD_YD = 100;
const FIELD_LENGTH_YD = PLAYING_FIELD_YD + 2 * ENDZONE_YD; // 120
const FIELD_WIDTH_YD = 53 + 1 / 3; // 53.33
const HASH_GAP_YD = 18.5 / 3; // 18 Fuß 6 Zoll = 6,1667 Yards Abstand der Hash Marks
const YARD_LINE_STEP_YD = 5;
const YARD_NUMBER_STEP_YD = 10;

const PX_PER_YARD = 7.5;

// Dieselben zwei Grüntöne wie das Mähstreifen-Muster im Seitenhintergrund
// (assets/css/style.css, body { background-image: repeating-linear-gradient(...) }).
const COLOR_FIELD_A = "#3f7a4c";
const COLOR_FIELD_B = "#356a41";
const COLOR_ENDZONE = "#1f4c2b"; // --accent-dark, deutlicher Kontrast statt Grau
const COLOR_MARK = "#f5f1e6"; // kräftiges Creme für Linien/Zahlen/Hash-Marks
const COLOR_MARK_SOFT = "#f5f1e6";
const COLOR_ACCENT = "#c9962b"; // eine einzige Akzentfarbe für die Maß-Linien (Gold), unverändert

const MARGIN_TOP = 20;
const MARGIN_LEFT = 30; // Platz für seitliche Yard-Zahlen
// Drei gestapelte vertikale Maßlinien (10/100/120 Yards) rechts neben dem
// Feld. Der Abstand zwischen den Spalten muss breiter sein als die
// horizontal geschriebenen Zahlen-Labels ("100 Yards" ≈ 75px), sonst
// überlappen sich benachbarte Beschriftungen (siehe dimensionLineV im
// Diagramm-Framework: Label sitzt zentriert und horizontal auf der Linie).
const DIM_COL_GAP = 85;
const MARGIN_RIGHT = 50 + 2 * DIM_COL_GAP + 45;
const MARGIN_BOTTOM = 56; // Platz für die Breiten-Maßlinie unterhalb des Felds

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

function buildFieldDiagramSvg() {
  const parts = [];
  parts.push(`<g shape-rendering="crispEdges">`);

  // ---- Grundfläche: Mähstreifen-Muster alle 5 Yards (wie der Seiten-Hintergrund) ----
  for (let alongYd = 0; alongYd < FIELD_LENGTH_YD; alongYd += YARD_LINE_STEP_YD) {
    const bandIndex = alongYd / YARD_LINE_STEP_YD;
    parts.push(
      `<rect x="${screenX(0)}" y="${screenY(alongYd)}" width="${fieldW}" height="${YARD_LINE_STEP_YD * PX_PER_YARD}" fill="${bandIndex % 2 === 0 ? COLOR_FIELD_A : COLOR_FIELD_B}"/>`
    );
  }

  // Endzonen (farbig abgesetzt statt grau) über die Streifen legen
  parts.push(`<rect x="${screenX(0)}" y="${screenY(0)}" width="${fieldW}" height="${ENDZONE_YD * PX_PER_YARD}" fill="${COLOR_ENDZONE}"/>`);
  parts.push(
    `<rect x="${screenX(0)}" y="${screenY(ENDZONE_YD + PLAYING_FIELD_YD)}" width="${fieldW}" height="${ENDZONE_YD * PX_PER_YARD}" fill="${COLOR_ENDZONE}"/>`
  );

  // Feld-Außenrahmen
  parts.push(
    `<rect x="${screenX(0)}" y="${screenY(0)}" width="${fieldW}" height="${fieldH}" fill="none" stroke="${COLOR_MARK}" stroke-width="2"/>`
  );

  // Goal Lines (Grenze Endzone/Spielfeld) kräftiger
  for (const alongYd of [ENDZONE_YD, ENDZONE_YD + PLAYING_FIELD_YD]) {
    parts.push(`<line x1="${screenX(0)}" y1="${screenY(alongYd)}" x2="${screenX(FIELD_WIDTH_YD)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="2.5"/>`);
  }

  // ---- Yard-Linien alle 5 Yards über die volle Breite ----
  for (let alongYd = ENDZONE_YD; alongYd <= ENDZONE_YD + PLAYING_FIELD_YD; alongYd += YARD_LINE_STEP_YD) {
    if (alongYd === ENDZONE_YD || alongYd === ENDZONE_YD + PLAYING_FIELD_YD) continue; // Goal Lines schon gezeichnet
    parts.push(
      `<line x1="${screenX(0)}" y1="${screenY(alongYd)}" x2="${screenX(FIELD_WIDTH_YD)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="1.5"/>`
    );
  }

  // ---- Hash Marks: kurze Ticks alle 1 Yard, 18'6" auseinander ----
  const hashOffsetYd = HASH_GAP_YD / 2;
  const hashX1 = FIELD_WIDTH_YD / 2 - hashOffsetYd;
  const hashX2 = FIELD_WIDTH_YD / 2 + hashOffsetYd;
  const hashLenYd = 0.35;
  for (let alongYd = ENDZONE_YD; alongYd <= ENDZONE_YD + PLAYING_FIELD_YD; alongYd += 1) {
    for (const hx of [hashX1, hashX2]) {
      parts.push(
        `<line x1="${screenX(hx - hashLenYd / 2)}" y1="${screenY(alongYd)}" x2="${screenX(hx + hashLenYd / 2)}" y2="${screenY(alongYd)}" stroke="${COLOR_MARK}" stroke-width="1.5"/>`
      );
    }
  }

  // ---- Yard-Zahlen alle 10 Yards, links und rechts, als blockige Pixel-Ziffern ----
  const NUM_UNIT = 2.6;
  for (let alongYd = ENDZONE_YD + YARD_NUMBER_STEP_YD; alongYd < ENDZONE_YD + PLAYING_FIELD_YD; alongYd += YARD_NUMBER_STEP_YD) {
    const distToTop = alongYd - ENDZONE_YD;
    const distToBottom = ENDZONE_YD + PLAYING_FIELD_YD - alongYd;
    const label = Math.min(distToTop, distToBottom);
    const cy = screenY(alongYd) - (NUM_UNIT * 5) / 2;
    parts.push(pixelNumber(screenX(0) + 6, cy, label, { unit: NUM_UNIT, color: COLOR_MARK }));
    const rightDigits = String(label).length;
    parts.push(pixelNumber(screenX(FIELD_WIDTH_YD) - 6 - rightDigits * (3 * NUM_UNIT + NUM_UNIT), cy, label, { unit: NUM_UNIT, color: COLOR_MARK }));
  }

  // ---- Goalposts (schematisch, Breite = Hash-Mark-Abstand), an beiden Endzonen-Außenkanten ----
  for (const alongYd of [0, FIELD_LENGTH_YD]) {
    const cy = screenY(alongYd);
    const x1 = screenX(hashX1);
    const x2 = screenX(hashX2);
    parts.push(`<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${COLOR_MARK}" stroke-width="2.5"/>`);
    parts.push(`<circle cx="${x1}" cy="${cy}" r="2.5" fill="${COLOR_MARK}"/>`);
    parts.push(`<circle cx="${x2}" cy="${cy}" r="2.5" fill="${COLOR_MARK}"/>`);
  }

  parts.push(`</g>`);

  // ---- Maß-Linien (eine Akzentfarbe, unverändert aus dem Diagramm-Framework) ----
  // Breite: jetzt eine horizontale Maßlinie unterhalb des Felds.
  parts.push(
    dimensionLineH({
      x1: screenX(0),
      x2: screenX(FIELD_WIDTH_YD),
      y: screenY(FIELD_LENGTH_YD) + 34,
      label: "53⅓ Yards",
      color: COLOR_ACCENT,
    })
  );

  // Länge: jetzt drei gestapelte vertikale Maßlinien rechts neben dem Feld.
  const col1X = screenX(FIELD_WIDTH_YD) + 50;
  const col2X = col1X + DIM_COL_GAP;
  const col3X = col2X + DIM_COL_GAP;

  parts.push(
    dimensionLineV({ y1: screenY(0), y2: screenY(ENDZONE_YD), x: col1X, label: "10 Yards", color: COLOR_ACCENT })
  );
  parts.push(
    dimensionLineV({
      y1: screenY(ENDZONE_YD),
      y2: screenY(ENDZONE_YD + PLAYING_FIELD_YD),
      x: col2X,
      label: "100 Yards",
      color: COLOR_ACCENT,
    })
  );
  parts.push(
    dimensionLineV({ y1: screenY(0), y2: screenY(FIELD_LENGTH_YD), x: col3X, label: "120 Yards", color: COLOR_ACCENT })
  );

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

module.exports = { buildFieldDiagramSvg };
