// Generisches Play-Diagramm-Grundgerüst (Feld-Ausschnitt um die Line of
// Scrimmage + Spieler-Marker + Bewegungspfade) — erste Anwendung ist
// Counter (siehe buildCounterDiagramSvg unten), aber buildPlayDiagramSvg
// selbst ist bewusst datengetrieben und unabhängig vom konkreten Play, für
// künftige Play-Diagramme (Power, Duo, Route-Concepts, …) wiederverwendbar.
//
// Nutzt dieselbe Rasen-Rendering-Technik wie Feld-/Formations-Diagramm
// (turfPattern) sowie die generischen Marker-/Pfad-Bausteine aus
// lib/diagram.js (playerMarker mit Shape-Attribut "circle"/"square",
// pathArrow mit Style-Attribut "solid"/"dashed").
//
// Koordinatensystem (Yards): x = seitlich vom Ball (negativ = links),
// y = Tiefe relativ zur LOS (negativ = Backfield/Offense-Seite, positiv
// = Richtung Defense) — konsistent mit dem Formations-Diagramm.

const { turfPattern, playerMarker, pathArrow, calloutLabel, svgDocument } = require("./diagram");

const PX_PER_YARD = 16;
const CELL_YD = 1;
const YARD_LINE_STEP_YD = 5;

// Dieselbe Palette wie Feld-/Formations-Diagramm.
const TURF_LIGHT = ["#3f7a4c", "#458350", "#3a7548"];
const TURF_DARK = ["#356a41", "#3b7146", "#31643c"];
const COLOR_MARK = "#f5f1e6";
const COLOR_LOS = "#c9962b";

function buildPlayDiagramSvg({ players, paths, callouts = [], crop }) {
  const { xMin, xMax, yMin, yMax } = crop;
  const margin = 16;
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
      bandPhase: yMin * PX_PER_YARD,
      lightPalette: TURF_LIGHT,
      darkPalette: TURF_DARK,
    })
  );

  for (let yYd = Math.ceil(yMin / YARD_LINE_STEP_YD) * YARD_LINE_STEP_YD; yYd <= yMax; yYd += YARD_LINE_STEP_YD) {
    if (yYd === 0) continue;
    parts.push(`<line x1="${sx(xMin)}" y1="${sy(yYd)}" x2="${sx(xMax)}" y2="${sy(yYd)}" stroke="${COLOR_MARK}" stroke-width="1.5" shape-rendering="crispEdges"/>`);
  }

  // Line of Scrimmage
  parts.push(
    `<line x1="${sx(xMin)}" y1="${sy(0)}" x2="${sx(xMax)}" y2="${sy(0)}" stroke="${COLOR_LOS}" stroke-width="2.5" stroke-dasharray="6 5" shape-rendering="crispEdges"/>`
  );

  // Bewegungspfade zuerst (liegen unter den Spieler-Markern, wirkt sauberer)
  for (const path of paths) {
    parts.push(
      pathArrow(
        path.points.map(([xYd, yYd]) => [sx(xYd), sy(yYd)]),
        { style: path.style, color: path.color, strokeWidth: path.strokeWidth }
      )
    );
  }

  for (const p of players) {
    parts.push(
      playerMarker(sx(p.x), sy(p.y), {
        shape: p.shape,
        size: p.size,
        fill: p.fill,
        stroke: p.stroke,
        strokeWidth: p.strokeWidth,
        label: p.label,
      })
    );
  }

  for (const c of callouts) {
    parts.push(calloutLabel(sx(c.x), sy(c.y), c.text, { color: c.color }));
  }

  return svgDocument(SVG_W, SVG_H, parts.join("\n"));
}

// ---------------------------------------------------------------------
// Counter (Gap-Scheme, siehe content/wiki/counter.md)
// ---------------------------------------------------------------------

const OL_FILL = "#888780";
const OL_STROKE = "#5f5e5a";
const DL_STROKE = "#5f5e5a";
const PULLER_STROKE = "#d85a30"; // dieselbe Farbe wie die Bewegungspfade — eine zusammenhängende Spielidee
const MOVE_COLOR = "#d85a30";
const MARKER_SIZE = 13;

function counterPlayers() {
  const offense = (x, y, label, isPuller = false) => ({
    x,
    y,
    shape: "circle",
    size: MARKER_SIZE,
    fill: OL_FILL,
    stroke: isPuller ? PULLER_STROKE : OL_STROKE,
    strokeWidth: isPuller ? 2.5 : 1,
    label,
  });
  const defense = (x, y, label) => ({
    x,
    y,
    shape: "square",
    size: MARKER_SIZE,
    fill: "none",
    stroke: DL_STROKE,
    strokeWidth: 1.5,
    label,
  });

  return [
    offense(-4, 0, "LT"),
    offense(-2, 0, "LG", true), // Puller 1: kickt den DE playside
    offense(0, 0, "C"),
    offense(2, 0, "RG"),
    offense(4, 0, "RT"),
    offense(6.5, 0, "TE"),
    offense(-4, -4, "FB", true), // Puller 2: lead block auf SLB
    offense(0, -1.5, "QB"),
    offense(-1.5, -6, "RB", true), // trägt die Misdirection

    defense(-6, 1.5, "DE"),
    defense(-1, 1.5, "DT"),
    defense(2.5, 1.5, "DT"),
    defense(6, 1.5, "DE"),
    defense(0, 5, "MLB"),
    defense(6.5, 4.5, "SLB"),
  ];
}

function counterPaths() {
  return [
    // Guard-Pull + Kick-out auf DE playside (Blockpfad = gestrichelt)
    { points: [[-2, 0], [0.8, -1.1], [5.3, 1.3]], style: "dashed", color: MOVE_COLOR, strokeWidth: 2.5 },
    // Fullback-Pull + Lead-Block auf SLB (Blockpfad = gestrichelt)
    { points: [[-4, -4], [0, -2], [5.9, 4.1]], style: "dashed", color: MOVE_COLOR, strokeWidth: 2.5 },
    // RB: Fake-Schritt weg von der Spielseite, bleibt hinter der Line,
    // schneidet erst im bereits geöffneten Loch nach oben durch
    // (Laufpfad = durchgezogen; kreuzt nicht mittig durch die O-Line).
    { points: [[-1.5, -6], [-3.2, -5], [-1.5, -3.2], [3.5, -1.5], [5.3, 2.5]], style: "solid", color: MOVE_COLOR, strokeWidth: 2.8 },
  ];
}

function counterCallouts() {
  return [
    { x: 5.6, y: 0.5, text: "Kick-out", color: MOVE_COLOR },
    { x: 6.6, y: 3.1, text: "Lead-Block", color: MOVE_COLOR },
    { x: -3.4, y: -5.4, text: "Fake", color: MOVE_COLOR },
  ];
}

function buildCounterDiagramSvg() {
  return buildPlayDiagramSvg({
    players: counterPlayers(),
    paths: counterPaths(),
    callouts: counterCallouts(),
    crop: { xMin: -9.5, xMax: 9.5, yMin: -8.5, yMax: 7.5 },
  });
}

module.exports = {
  buildPlayDiagramSvg,
  buildCounterDiagramSvg,
};
