// Akkordeon-Verhalten für die Baum-Sidebar: öffnet man einen Zweig, werden
// alle Geschwister-Zweige auf derselben Ebene automatisch geschlossen.
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tree-container");
  if (!container) return;

  container.addEventListener("toggle", (event) => {
    const opened = event.target;
    if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;

    const li = opened.closest("li.nav-item");
    const parentList = li ? li.parentElement : null;
    if (!parentList || parentList.tagName !== "UL") return;

    Array.from(parentList.children).forEach((sibling) => {
      if (sibling === li) return;
      const siblingDetails = sibling.querySelector(":scope > details.nav-details");
      if (siblingDetails && siblingDetails.open) {
        siblingDetails.open = false;
      }
    });
  }, true);
});
