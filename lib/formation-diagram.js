// Formations-Diagramm (Offense + Defense zusammen) für die interaktive
// Positionen-Übersicht (content/wiki/positionen.md). Nutzt bewusst dieselbe
// Rasen-Rendering-Technik wie das Feld-Diagramm (turfPattern aus
// lib/diagram.js) — nur der Feld-Ausschnitt ist hier eng um die Line of
// Scrimmage statt des vollen 120-Yard-Felds, da es um die Formation geht,
// nicht um die Feldmaße.
//
// Koordinatensystem (Yards): x = seitlich vom Ball (negativ = links),
// y = Tiefe relativ zur LOS (negativ = Backfield/Offense-Seite, positiv
// = Richtung Defense) — direkt aus der Spezifikation übernommen.
//
// Diese Seite ist bewusst eine Kategorisierungs-Übersicht (nicht ein
// Konzept-Diagramm mit einem einzelnen Fokuspunkt wie Spielfeld/Route-
// Concepts) — deshalb hier als Ausnahme neun feste Positionsgruppen-Farben
// statt der sonst üblichen einen Akzentfarbe. Jede Gruppe entspricht genau
// der vereinfachten On-Diagramm-Beschriftung (siehe `label` je Position);
// das Infofeld zeigt beim Hover/Klick weiterhin die volle Spezifität
// (`code`/`name`/`desc`), nur die Grafik selbst gruppiert.

const { turfPattern, positionDot, svgDocument } = require("./diagram");

const PX_PER_YARD = 11;
const CELL_YD = 1;

// Dieselbe Palette wie das Feld-Diagramm (lib/field-diagram.js).
const TURF_LIGHT = ["#3f7a4c", "#458350", "#3a7548"];
const TURF_DARK = ["#356a41", "#3b7146", "#31643c"];
const COLOR_MARK = "#f5f1e6";
const COLOR_LOS = "#c9962b"; // Line of Scrimmage, in der Akzentfarbe hervorgehoben
const YARD_LINE_STEP_YD = 5;

// Neun Positionsgruppen-Farben, auf die nächstliegenden Töne aus der
// bestehenden Palette gemappt, wo vorhanden (Rot/Grün/Blau kommen direkt
// aus anderen Diagrammen). Gold (--accent2) ist bewusst ausgenommen, da es
// exklusiv dem Auswahl-Zustand vorbehalten bleibt.
const GROUP_COLORS = {
  QB: "#c9433d", // Rot (wie ENDZONE-Label im Feld-Diagramm)
  RB: "#2f6f3f", // Grün (= --accent)
  OL: "#a9805a", // Braun/Sandton
  TE: "#7c5ea6", // Lila
  WR: "#3d7fc9", // Blau (wie ENDZONE-Label im Feld-Diagramm)
  DL: "#d1791f", // Orange
  LB: "#3f9a94", // Türkis
  CB: "#b8478f", // Pink/Magenta
  S: "#3a4a88", // Indigo/Dunkelblau
};

const OFFENSE_POSITIONS = [
  { id: "lt", code: "LT", label: "OL", name: "Left Tackle", desc: "Äußerer Blocker, schützt oft die Wurfarm-abgewandte Seite des QB.", x: -4, y: 0 },
  { id: "lg", code: "LG", label: "OL", name: "Left Guard", desc: "Innerer Blocker, öffnet Lücken im Laufspiel.", x: -1.5, y: 0 },
  { id: "c", code: "C", label: "OL", name: "Center", desc: "Snapt den Ball zum QB, ruft oft die Blockzuweisungen der Line.", x: 0, y: 0 },
  { id: "rg", code: "RG", label: "OL", name: "Right Guard", desc: "Innerer Blocker, öffnet Lücken im Laufspiel.", x: 1.5, y: 0 },
  { id: "rt", code: "RT", label: "OL", name: "Right Tackle", desc: "Äußerer Blocker.", x: 4, y: 0 },
  { id: "te", code: "TE", label: "TE", name: "Tight End", desc: "Hybrid aus Blocker und Passempfänger, steht direkt neben der Line.", x: 6.5, y: 0 },
  { id: "x", code: "X", label: "WR", name: "Split End", desc: "Receiver ohne Motion an der Line, oft gegen den besten gegnerischen Corner.", x: -18, y: 0 },
  { id: "z", code: "Z", label: "WR", name: "Flanker", desc: "Startet leicht hinter der Line, oft die schnellste Route-Option.", x: 18, y: -1 },
  { id: "h", code: "H", label: "WR", name: "Slot", desc: "Zwischen Tackle und Außenreceiver, kürzere/schnellere Routen gegen LB oder Nickel-Corner.", x: 9.5, y: -1 },
  { id: "qb", code: "QB", label: "QB", name: "Quarterback", desc: "Leitet die Offense, ruft den Play an der Line, wirft Pässe oder gibt ab.", x: 0, y: -5.5 },
  { id: "rb", code: "RB", label: "RB", name: "Running Back", desc: "Läuft mit dem Ball, blockt im Passschutz, fängt auch Pässe aus dem Backfield.", x: -2, y: -6.5 },
];

const DEFENSE_POSITIONS = [
  { id: "de-links", code: "DE links", label: "DL", name: "Defensive End", desc: "Äußerer Lineman, Hauptaufgabe Pass Rush, setzt die Run-Contain-Grenze.", x: -5, y: 1 },
  { id: "dt-1t", code: "DT (1-Technique)", label: "DL", name: "Defensive Tackle", desc: "Innerer Lineman, füllt Run-Gaps, drückt den Pocket von innen.", x: -1, y: 1 },
  { id: "dt-3t", code: "DT (3-Technique)", label: "DL", name: "Defensive Tackle", desc: "Innerer Lineman, füllt Run-Gaps, drückt den Pocket von innen.", x: 2.5, y: 1 },
  { id: "de-rechts", code: "DE rechts", label: "DL", name: "Defensive End", desc: "Äußerer Lineman, Hauptaufgabe Pass Rush, setzt die Run-Contain-Grenze.", x: 5.5, y: 1 },
  { id: "wlb", code: "WLB", label: "LB", name: "Will (Weakside) Linebacker", desc: "Auf der Seite mit weniger Blockern, meist athletischer Typ.", x: -7, y: 4.5 },
  { id: "mlb", code: "MLB", label: "LB", name: "Mike (Middle) Linebacker", desc: "„Quarterback der Defense“, ruft die Calls, zentrale Run-Fit-Verantwortung.", x: 0, y: 5 },
  { id: "slb", code: "SLB", label: "LB", name: "Sam (Strongside) Linebacker", desc: "Auf der TE-Seite, oft auch in Coverage gegen den Tight End.", x: 7, y: 4.5 },
  { id: "cb-links", code: "CB links", label: "CB", name: "Cornerback", desc: "Deckt Wide Receiver, meist Man- oder Zone-Coverage.", x: -18, y: 6 },
  { id: "cb-rechts", code: "CB rechts", label: "CB", name: "Cornerback", desc: "Deckt Wide Receiver, meist Man- oder Zone-Coverage.", x: 17, y: 6 },
  { id: "fs", code: "FS", label: "S", name: "Free Safety", desc: "Tiefster Verteidiger, meist ohne feste Zone, deckt die Mitte/hinten ab.", x: -3, y: 12 },
  { id: "ss", code: "SS", label: "S", name: "Strong Safety", desc: "Näher an der Line, Run-Support plus Coverage gegen TE/Slot.", x: 6, y: 8 },
];

const ALL_POSITIONS = [...OFFENSE_POSITIONS, ...DEFENSE_POSITIONS].map((p) => ({
  ...p,
  color: GROUP_COLORS[p.label],
}));

// Gemeinsamer Feld-Ausschnitt für beide Teams: Backfield (RB bei -6,5) bis
// Free Safety (12) plus großzügigem Rand an beiden Enden, damit alle 22
// Punkte samt Labels komfortabel Platz haben und nichts am Bildrand klebt.
const CROP = { xMin: -22, xMax: 22, yMin: -10.5, yMax: 16.5 };

function buildCombinedFormationSvg() {
  const { xMin, xMax, yMin, yMax } = CROP;
  const margin = 14;
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

  for (const pos of ALL_POSITIONS) {
    parts.push(positionDot(sx(pos.x), sy(pos.y), pos));
  }

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

module.exports = {
  buildCombinedFormationSvg,
  GROUP_COLORS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
};
