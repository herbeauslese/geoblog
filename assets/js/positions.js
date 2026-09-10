// Interaktions-Schicht für die Positionen-Übersicht (content/wiki/positionen.md).
// Bewusst als eigenes, schlankes Skript ausgelagert statt in nav.js/search.js
// (die auf jeder Seite laufen) — nur Seiten mit `scripts: [...]` im
// Front-Matter laden das hier überhaupt. Die Basis-Grafik (Feld + Offense-/
// Defense-Positions-Punkte) kommt fertig aus dem Server-Build
// (lib/formation-diagram.js); dieses Skript ändert nur Klassen/Textinhalte,
// es zeichnet nichts neu.
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector(".positions-panel");
  if (!panel) return;

  const dots = panel.querySelectorAll(".position-dot");
  const infoDefault = panel.querySelector(".positions-info-default");
  const infoDetail = panel.querySelector(".positions-info-detail");
  const codeEl = panel.querySelector(".positions-info-code");
  const nameEl = panel.querySelector(".positions-info-name");
  const descEl = panel.querySelector(".positions-info-desc");

  // hoverId: temporäre Vorschau (Maus im Punkt) — verschwindet beim
  // Verlassen wieder. lockedId: bleibt bestehen (Klick/Tap/Tastatur-Fokus),
  // damit Touch-Geräte ohne echtes Hover trotzdem eine dauerhafte Auswahl
  // bekommen. Funktioniert unabhängig davon, ob die Position zur Offense
  // oder Defense gehört.
  let hoverId = null;
  let lockedId = null;

  function activeId() {
    return hoverId || lockedId;
  }

  function render() {
    const id = activeId();
    dots.forEach((d) => d.classList.toggle("is-active", d.dataset.id === id));

    if (!id) {
      infoDefault.hidden = false;
      infoDetail.hidden = true;
      return;
    }
    const dot = panel.querySelector(`.position-dot[data-id="${CSS.escape(id)}"]`);
    if (!dot) return;
    codeEl.textContent = dot.dataset.code;
    codeEl.style.background = dot.dataset.color;
    nameEl.textContent = dot.dataset.name;
    // innerHTML statt textContent: die Beschreibungen enthalten bewusst
    // echte Links auf Glossar-Einträge (siehe lib/formation-diagram.js).
    descEl.innerHTML = dot.dataset.desc;
    infoDefault.hidden = true;
    infoDetail.hidden = false;
  }

  dots.forEach((dot) => {
    const id = dot.dataset.id;

    dot.addEventListener("mouseenter", () => {
      hoverId = id;
      render();
    });
    dot.addEventListener("mouseleave", () => {
      if (hoverId === id) {
        hoverId = null;
        render();
      }
    });
    // click deckt sowohl Maus-Klick als auch Touch-Tap ab.
    dot.addEventListener("click", () => {
      lockedId = id;
      hoverId = null;
      render();
    });
    // Tastatur-Fokus (Tab-Taste) zeigt dieselbe Info wie Hover/Klick.
    dot.addEventListener("focus", () => {
      lockedId = id;
      render();
    });
    dot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        lockedId = id;
        render();
      }
    });
  });

  render();
});
