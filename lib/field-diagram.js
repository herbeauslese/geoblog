// Technische Draufsicht (Grundriss) eines kompletten NFL-Spielfelds,
// inklusive beider Endzonen. Alle Positionen werden aus echten Yard-/Fuß-
// Maßen abgeleitet (nicht aus geschätzten Pixelwerten) und dann über
// PX_PER_YARD in Pixel umgerechnet — siehe Projektbrief: reale Football-
// Maße sind die Referenz, nicht Freihand-Schätzungen.
//
// Grautöne/Schwarz für das Feld selbst (wissenschaftliche Abbildung, keine
// Spielerfarben/Deko); genau eine Akzentfarbe (Gold) für die Maß-Linien.

const { dimensionLineH, dimensionLineV, svgDocument } = require("./diagram");

// ---- Reale Maße (Yards) ----
const ENDZONE_YD = 10;
const PLAYING_FIELD_YD = 100;
const FIELD_LENGTH_YD = PLAYING_FIELD_YD + 2 * ENDZONE_YD; // 120
const FIELD_WIDTH_YD = 53 + 1 / 3; // 53.33
const HASH_GAP_YD = 18.5 / 3; // 18 Fuß 6 Zoll = 6,1667 Yards Abstand der Hash Marks
const YARD_LINE_STEP_YD = 5;
const YARD_NUMBER_STEP_YD = 10;

const PX_PER_YARD = 7.5;

const COLOR_LINE = "#4a4a46";
const COLOR_LINE_LIGHT = "#8a8a84";
const COLOR_TEXT = "#2b2a26";
const COLOR_ENDZONE_FILL = "#e7e5df";
const COLOR_FIELD_FILL = "#fbfaf6";
const COLOR_ACCENT = "#c9962b"; // eine einzige Akzentfarbe für die Maß-Linien (Gold)

const MARGIN_LEFT = 74; // Platz für die vertikale Breiten-Maßlinie
const MARGIN_TOP = 26; // Platz für die oberen Yard-Zahlen
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 132; // Platz für untere Yard-Zahlen + 3 gestapelte Maß-Linien

const fieldW = FIELD_LENGTH_YD * PX_PER_YARD;
const fieldH = FIELD_WIDTH_YD * PX_PER_YARD;
const SVG_W = MARGIN_LEFT + fieldW + MARGIN_RIGHT;
const SVG_H = MARGIN_TOP + fieldH + MARGIN_BOTTOM;

function px(xYd) {
  return MARGIN_LEFT + xYd * PX_PER_YARD;
}
function py(yYd) {
  return MARGIN_TOP + yYd * PX_PER_YARD;
}

function buildFieldDiagramSvg() {
  const parts = [];

  // ---- Grundfläche: Endzonen + Spielfeld ----
  parts.push(
    `<rect x="${px(0)}" y="${py(0)}" width="${fieldW}" height="${fieldH}" fill="${COLOR_FIELD_FILL}" stroke="${COLOR_LINE}" stroke-width="1.5"/>`
  );
  parts.push(
    `<rect x="${px(0)}" y="${py(0)}" width="${ENDZONE_YD * PX_PER_YARD}" height="${fieldH}" fill="${COLOR_ENDZONE_FILL}"/>`
  );
  parts.push(
    `<rect x="${px(ENDZONE_YD + PLAYING_FIELD_YD)}" y="${py(0)}" width="${ENDZONE_YD * PX_PER_YARD}" height="${fieldH}" fill="${COLOR_ENDZONE_FILL}"/>`
  );

  // Goal Lines (Grenze Endzone/Spielfeld) etwas kräftiger
  for (const xYd of [ENDZONE_YD, ENDZONE_YD + PLAYING_FIELD_YD]) {
    parts.push(`<line x1="${px(xYd)}" y1="${py(0)}" x2="${px(xYd)}" y2="${py(FIELD_WIDTH_YD)}" stroke="${COLOR_LINE}" stroke-width="2"/>`);
  }

  // ---- Yard-Linien alle 5 Yards über die volle Breite ----
  for (let xYd = ENDZONE_YD; xYd <= ENDZONE_YD + PLAYING_FIELD_YD; xYd += YARD_LINE_STEP_YD) {
    if (xYd === ENDZONE_YD || xYd === ENDZONE_YD + PLAYING_FIELD_YD) continue; // Goal Lines schon gezeichnet
    parts.push(`<line x1="${px(xYd)}" y1="${py(0)}" x2="${px(xYd)}" y2="${py(FIELD_WIDTH_YD)}" stroke="${COLOR_LINE_LIGHT}" stroke-width="1"/>`);
  }

  // ---- Hash Marks: kurze Ticks alle 1 Yard, 18'6" auseinander ----
  const hashOffsetYd = HASH_GAP_YD / 2;
  const hashY1 = FIELD_WIDTH_YD / 2 - hashOffsetYd;
  const hashY2 = FIELD_WIDTH_YD / 2 + hashOffsetYd;
  const hashLenYd = 0.35;
  for (let xYd = ENDZONE_YD; xYd <= ENDZONE_YD + PLAYING_FIELD_YD; xYd += 1) {
    for (const hy of [hashY1, hashY2]) {
      parts.push(
        `<line x1="${px(xYd)}" y1="${py(hy - hashLenYd / 2)}" x2="${px(xYd)}" y2="${py(hy + hashLenYd / 2)}" stroke="${COLOR_LINE}" stroke-width="1"/>`
      );
    }
  }

  // ---- Yard-Zahlen alle 10 Yards, oben und unten (Distanz zur naeheren Goal Line) ----
  for (let xYd = ENDZONE_YD + YARD_NUMBER_STEP_YD; xYd < ENDZONE_YD + PLAYING_FIELD_YD; xYd += YARD_NUMBER_STEP_YD) {
    const distToLeft = xYd - ENDZONE_YD;
    const distToRight = ENDZONE_YD + PLAYING_FIELD_YD - xYd;
    const label = Math.min(distToLeft, distToRight);
    const cx = px(xYd);
    parts.push(`<text x="${cx}" y="${py(0) - 8}" text-anchor="middle" font-size="11" fill="${COLOR_TEXT}">${label}</text>`);
    parts.push(`<text x="${cx}" y="${py(FIELD_WIDTH_YD) + 18}" text-anchor="middle" font-size="11" fill="${COLOR_TEXT}">${label}</text>`);
  }

  // ---- Goalposts (schematisch, Breite = Hash-Mark-Abstand) ----
  for (const xYd of [0, FIELD_LENGTH_YD]) {
    const cx = px(xYd);
    const y1 = py(hashY1);
    const y2 = py(hashY2);
    parts.push(`<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" stroke="${COLOR_LINE}" stroke-width="2.5"/>`);
    parts.push(`<circle cx="${cx}" cy="${y1}" r="2.5" fill="${COLOR_LINE}"/>`);
    parts.push(`<circle cx="${cx}" cy="${y2}" r="2.5" fill="${COLOR_LINE}"/>`);
  }

  // ---- Maß-Linien (eine Akzentfarbe, gestapelt unterhalb des Felds) ----
  const row1Y = py(FIELD_WIDTH_YD) + 44; // eine Endzone
  const row2Y = row1Y + 32; // Spielfeld
  const row3Y = row2Y + 32; // Gesamtlänge

  parts.push(
    dimensionLineH({ x1: px(0), x2: px(ENDZONE_YD), y: row1Y, label: "10 Yards", color: COLOR_ACCENT })
  );
  parts.push(
    dimensionLineH({
      x1: px(ENDZONE_YD),
      x2: px(ENDZONE_YD + PLAYING_FIELD_YD),
      y: row2Y,
      label: "100 Yards",
      color: COLOR_ACCENT,
    })
  );
  parts.push(
    dimensionLineH({ x1: px(0), x2: px(FIELD_LENGTH_YD), y: row3Y, label: "120 Yards", color: COLOR_ACCENT })
  );

  parts.push(
    dimensionLineV({
      y1: py(0),
      y2: py(FIELD_WIDTH_YD),
      x: px(0) - 34,
      label: "53⅓ Yards",
      color: COLOR_ACCENT,
    })
  );

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

module.exports = { buildFieldDiagramSvg };
