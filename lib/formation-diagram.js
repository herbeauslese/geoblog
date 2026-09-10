// Formations-Diagramme (Offense/Defense) für die interaktive
// Positionen-Übersicht (content/wiki/positionen.md). Nutzt bewusst
// dieselbe Rasen-Rendering-Technik wie das Feld-Diagramm (turfPattern aus
// lib/diagram.js) — nur der Feld-Ausschnitt ist hier eng um die Line of
// Scrimmage statt des vollen 120-Yard-Felds, da es um die Formation geht,
// nicht um die Feldmaße.
//
// Koordinatensystem (Yards): x = seitlich vom Ball (negativ = links),
// y = Tiefe relativ zur LOS (negativ = Backfield/Offense-Seite, positiv
// = Richtung Defense) — direkt aus der Spezifikation übernommen.
//
// Die Positions-Punkte selbst sind serverseitig/build-time als graues,
// aber vollständig mit den Detail-Infos (Code/Name/Beschreibung) versehenes
// SVG gerendert (positionDot in lib/diagram.js); die Interaktion (Hover/
// Tap/Fokus → Akzentfarbe + Infofeld) übernimmt ausschließlich
// assets/js/positions.js on top, siehe dort. So bleibt die Basis-Grafik
// exakt nach demselben Muster wie alle anderen Diagramme aus Yard-
// Koordinaten gebaut, und die Interaktions-Schicht ist unabhängig
// austauschbar/entfernbar.

const { turfPattern, cornerBrackets, positionDot, svgDocument } = require("./diagram");

const PX_PER_YARD = 11;
const CELL_YD = 1;

// Dieselbe Palette wie das Feld-Diagramm (lib/field-diagram.js).
const TURF_LIGHT = ["#3f7a4c", "#458350", "#3a7548"];
const TURF_DARK = ["#356a41", "#3b7146", "#31643c"];
const COLOR_MARK = "#f5f1e6";
const COLOR_LOS = "#c9962b"; // Line of Scrimmage, in der Akzentfarbe hervorgehoben
const COLOR_ACCENT = "#c9962b";
const YARD_LINE_STEP_YD = 5;

const OFFENSE_POSITIONS = [
  { id: "lt", code: "LT", name: "Left Tackle", desc: "Äußerer Blocker, schützt oft die Wurfarm-abgewandte Seite des QB.", x: -4, y: 0 },
  { id: "lg", code: "LG", name: "Left Guard", desc: "Innerer Blocker, öffnet Lücken im Laufspiel.", x: -1.5, y: 0 },
  { id: "c", code: "C", name: "Center", desc: "Snapt den Ball zum QB, ruft oft die Blockzuweisungen der Line.", x: 0, y: 0 },
  { id: "rg", code: "RG", name: "Right Guard", desc: "Innerer Blocker, öffnet Lücken im Laufspiel.", x: 1.5, y: 0 },
  { id: "rt", code: "RT", name: "Right Tackle", desc: "Äußerer Blocker.", x: 4, y: 0 },
  { id: "te", code: "TE", name: "Tight End", desc: "Hybrid aus Blocker und Passempfänger, steht direkt neben der Line.", x: 6.5, y: 0 },
  { id: "x", code: "X", name: "Split End", desc: "Receiver ohne Motion an der Line, oft gegen den besten gegnerischen Corner.", x: -18, y: 0 },
  { id: "z", code: "Z", name: "Flanker", desc: "Startet leicht hinter der Line, oft die schnellste Route-Option.", x: 18, y: -1 },
  { id: "h", code: "H", name: "Slot", desc: "Zwischen Tackle und Außenreceiver, kürzere/schnellere Routen gegen LB oder Nickel-Corner.", x: 9.5, y: -1 },
  { id: "qb", code: "QB", name: "Quarterback", desc: "Leitet die Offense, ruft den Play an der Line, wirft Pässe oder gibt ab.", x: 0, y: -5.5 },
  { id: "rb", code: "RB", name: "Running Back", desc: "Läuft mit dem Ball, blockt im Passschutz, fängt auch Pässe aus dem Backfield.", x: -2, y: -6.5 },
];

const DEFENSE_POSITIONS = [
  { id: "de-links", code: "DE links", name: "Defensive End", desc: "Äußerer Lineman, Hauptaufgabe Pass Rush, setzt die Run-Contain-Grenze.", x: -5, y: 1 },
  { id: "dt-1t", code: "DT (1-Technique)", name: "Defensive Tackle", desc: "Innerer Lineman, füllt Run-Gaps, drückt den Pocket von innen.", x: -1, y: 1 },
  { id: "dt-3t", code: "DT (3-Technique)", name: "Defensive Tackle", desc: "Innerer Lineman, füllt Run-Gaps, drückt den Pocket von innen.", x: 2.5, y: 1 },
  { id: "de-rechts", code: "DE rechts", name: "Defensive End", desc: "Äußerer Lineman, Hauptaufgabe Pass Rush, setzt die Run-Contain-Grenze.", x: 5.5, y: 1 },
  { id: "wlb", code: "WLB", name: "Will (Weakside) Linebacker", desc: "Auf der Seite mit weniger Blockern, meist athletischer Typ.", x: -7, y: 4.5 },
  { id: "mlb", code: "MLB", name: "Mike (Middle) Linebacker", desc: "„Quarterback der Defense“, ruft die Calls, zentrale Run-Fit-Verantwortung.", x: 0, y: 5 },
  { id: "slb", code: "SLB", name: "Sam (Strongside) Linebacker", desc: "Auf der TE-Seite, oft auch in Coverage gegen den Tight End.", x: 7, y: 4.5 },
  { id: "cb-links", code: "CB links", name: "Cornerback", desc: "Deckt Wide Receiver, meist Man- oder Zone-Coverage.", x: -18, y: 6 },
  { id: "cb-rechts", code: "CB rechts", name: "Cornerback", desc: "Deckt Wide Receiver, meist Man- oder Zone-Coverage.", x: 17, y: 6 },
  { id: "fs", code: "FS", name: "Free Safety", desc: "Tiefster Verteidiger, meist ohne feste Zone, deckt die Mitte/hinten ab.", x: -3, y: 12 },
  { id: "ss", code: "SS", name: "Strong Safety", desc: "Näher an der Line, Run-Support plus Coverage gegen TE/Slot.", x: 6, y: 8 },
];

function buildFormationSvg(positions, { xMin, xMax, yMin, yMax }) {
  const margin = 22;
  const widthPx = (xMax - xMin) * PX_PER_YARD;
  const heightPx = (yMax - yMin) * PX_PER_YARD;
  const SVG_W = widthPx + margin * 2;
  const SVG_H = heightPx + margin * 2;

  const sx = (xYd) => margin + (xYd - xMin) * PX_PER_YARD;
  const sy = (yYd) => margin + (yYd - yMin) * PX_PER_YARD;

  const parts = [];

  parts.push(
    turfPattern({
      x: margin,
      y: margin,
      width: widthPx,
      height: heightPx,
      cellPx: CELL_YD * PX_PER_YARD,
      bandPx: YARD_LINE_STEP_YD * PX_PER_YARD,
      bandPhase: yMin * PX_PER_YARD, // Bandgrenzen richten sich nach der LOS (y=0) aus
      lightPalette: TURF_LIGHT,
      darkPalette: TURF_DARK,
    })
  );

  // Yard-Linien alle 5 Yards (Referenz, keine Beschriftung nötig — es geht
  // um die Formation, nicht die Feldmaße).
  for (let yYd = Math.ceil(yMin / YARD_LINE_STEP_YD) * YARD_LINE_STEP_YD; yYd <= yMax; yYd += YARD_LINE_STEP_YD) {
    if (yYd === 0) continue; // LOS wird separat hervorgehoben
    parts.push(`<line x1="${sx(xMin)}" y1="${sy(yYd)}" x2="${sx(xMax)}" y2="${sy(yYd)}" stroke="${COLOR_MARK}" stroke-width="1.5" shape-rendering="crispEdges"/>`);
  }

  // Line of Scrimmage: hervorgehoben in der Akzentfarbe, gestrichelt.
  parts.push(
    `<line x1="${sx(xMin)}" y1="${sy(0)}" x2="${sx(xMax)}" y2="${sy(0)}" stroke="${COLOR_LOS}" stroke-width="2.5" stroke-dasharray="6 5" shape-rendering="crispEdges"/>`
  );

  parts.push(cornerBrackets(SVG_W, SVG_H, { size: 16, inset: 5, color: COLOR_ACCENT, strokeWidth: 2.5 }));

  for (const pos of positions) {
    parts.push(positionDot(sx(pos.x), sy(pos.y), pos));
  }

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

function buildOffenseFormationSvg() {
  return buildFormationSvg(OFFENSE_POSITIONS, { xMin: -20, xMax: 20, yMin: -8, yMax: 2 });
}

function buildDefenseFormationSvg() {
  return buildFormationSvg(DEFENSE_POSITIONS, { xMin: -20, xMax: 20, yMin: -1.5, yMax: 14 });
}

module.exports = {
  buildOffenseFormationSvg,
  buildDefenseFormationSvg,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
};
