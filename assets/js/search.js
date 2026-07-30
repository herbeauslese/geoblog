document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  const container = document.getElementById("tree-container");
  if (!input || !container) return;

  const items = Array.from(container.querySelectorAll(".nav-item"));
  const detailsEls = Array.from(container.querySelectorAll("details.nav-details"));
  const initialOpen = new Map(detailsEls.map((d) => [d, d.open]));

  function linkOf(li) {
    return li.querySelector(":scope > .nav-link, :scope > details > summary > .nav-link");
  }

  function reset() {
    items.forEach((li) => { li.style.display = ""; });
    detailsEls.forEach((d) => { d.open = initialOpen.get(d); });
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      reset();
      return;
    }

    items.forEach((li) => {
      const link = linkOf(li);
      const text = link ? link.textContent.toLowerCase() : "";
      li.dataset.match = text.includes(q) ? "1" : "0";
    });

    items.forEach((li) => {
      const selfMatch = li.dataset.match === "1";
      const hasMatchingDescendant = !!li.querySelector('.nav-item[data-match="1"]');
      const visible = selfMatch || hasMatchingDescendant;
      li.style.display = visible ? "" : "none";

      const details = li.querySelector(":scope > details.nav-details");
      if (details && visible) {
        details.open = true;
      }
    });
  });
});
