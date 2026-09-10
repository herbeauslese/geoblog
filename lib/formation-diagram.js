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

// Bewusst allgemein gehaltene, pro Gruppe identische Beschreibungstexte
// (statt Detailtexten je Einzelposition) — das hier ist der Einstieg,
// Detailunterschiede (LT vs. RT, Free vs. Strong Safety, Nickel-Corner
// etc.) kommen erst in den späteren, eigenen Positions-/Konzept-
// Unterseiten. Erste Erwähnung von Line/Slot/Pass-Rush/Coverage je
// Beschreibung ist auf die entsprechenden Glossar-Stubs verlinkt (jeder
// Text steht isoliert im Infofeld, nie mehrere gleichzeitig — deshalb
// verlinkt jede Beschreibung für sich, nicht nur die insgesamt erste
// Erwähnung über alle neun Gruppen hinweg).
const DESC_BY_GROUP = {
  QB: 'Leitet die Offense, ruft den Spielzug an der <a href="/wiki/line-of-scrimmage/">Line</a>, wirft Pässe oder gibt den Ball ab.',
  RB: "Läuft mit dem Ball, hilft auch beim Blocken und fängt gelegentlich Pässe.",
  OL: 'Blockt für den Quarterback und öffnet Lücken im Laufspiel. Fünf Spieler bilden gemeinsam die <a href="/wiki/line-of-scrimmage/">Line</a>.',
  TE: 'Mischung aus Blocker und Passempfänger, steht direkt neben der <a href="/wiki/line-of-scrimmage/">Line</a>.',
  WR: 'Fängt Pässe, meist außen an der <a href="/wiki/line-of-scrimmage/">Line</a> oder im <a href="/wiki/slot/">Slot</a> positioniert.',
  DL: 'Steht direkt gegenüber der gegnerischen <a href="/wiki/line-of-scrimmage/">Line</a>, <a href="/wiki/pass-rush/">rusht</a> den Quarterback oder stoppt den Lauf.',
  LB: 'Steht hinter der <a href="/wiki/line-of-scrimmage/">Line</a>, stoppt Läufe und deckt manchmal Passempfänger.',
  CB: 'Deckt Wide Receiver, meist in <a href="/wiki/man-zone-coverage/">Man- oder Zone-Coverage</a>.',
  S: "Tiefster Verteidiger, unterstützt sowohl gegen Läufe als auch gegen Pässe.",
};

const OFFENSE_POSITIONS = [
  { id: "lt", code: "LT", label: "OL", name: "Left Tackle", x: -4, y: 0 },
  { id: "lg", code: "LG", label: "OL", name: "Left Guard", x: -1.5, y: 0 },
  { id: "c", code: "C", label: "OL", name: "Center", x: 0, y: 0 },
  { id: "rg", code: "RG", label: "OL", name: "Right Guard", x: 1.5, y: 0 },
  { id: "rt", code: "RT", label: "OL", name: "Right Tackle", x: 4, y: 0 },
  { id: "te", code: "TE", label: "TE", name: "Tight End", x: 6.5, y: 0 },
  { id: "x", code: "X", label: "WR", name: "Split End", x: -18, y: 0 },
  { id: "z", code: "Z", label: "WR", name: "Flanker", x: 18, y: -1 },
  { id: "h", code: "H", label: "WR", name: "Slot", x: 9.5, y: -1 },
  { id: "qb", code: "QB", label: "QB", name: "Quarterback", x: 0, y: -5.5 },
  { id: "rb", code: "RB", label: "RB", name: "Running Back", x: -2, y: -6.5 },
].map((p) => ({ ...p, desc: DESC_BY_GROUP[p.label] }));

const DEFENSE_POSITIONS = [
  { id: "de-links", code: "DE links", label: "DL", name: "Defensive End", x: -5, y: 1 },
  { id: "dt-1t", code: "DT (1-Technique)", label: "DL", name: "Defensive Tackle", x: -1, y: 1 },
  { id: "dt-3t", code: "DT (3-Technique)", label: "DL", name: "Defensive Tackle", x: 2.5, y: 1 },
  { id: "de-rechts", code: "DE rechts", label: "DL", name: "Defensive End", x: 5.5, y: 1 },
  { id: "wlb", code: "WLB", label: "LB", name: "Will (Weakside) Linebacker", x: -7, y: 4.5 },
  { id: "mlb", code: "MLB", label: "LB", name: "Mike (Middle) Linebacker", x: 0, y: 5 },
  { id: "slb", code: "SLB", label: "LB", name: "Sam (Strongside) Linebacker", x: 7, y: 4.5 },
  { id: "cb-links", code: "CB links", label: "CB", name: "Cornerback", x: -18, y: 6 },
  { id: "cb-rechts", code: "CB rechts", label: "CB", name: "Cornerback", x: 17, y: 6 },
  { id: "fs", code: "FS", label: "S", name: "Free Safety", x: -3, y: 12 },
  { id: "ss", code: "SS", label: "S", name: "Strong Safety", x: 6, y: 8 },
].map((p) => ({ ...p, desc: DESC_BY_GROUP[p.label] }));

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
