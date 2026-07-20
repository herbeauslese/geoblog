document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  if (!input) return;

  const sections = document.querySelectorAll(".nav-section");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    sections.forEach(section => {
      let sectionHasMatch = false;

      section.querySelectorAll(".nav-link").forEach(link => {
        const match = !q || link.textContent.toLowerCase().includes(q);
        link.style.display = match ? "" : "none";
        if (match) sectionHasMatch = true;
      });

      section.querySelectorAll(".nav-group-label").forEach(group => {
        let el = group.nextElementSibling;
        let anyVisible = false;
        while (el && el.classList.contains("nav-link")) {
          if (el.style.display !== "none") anyVisible = true;
          el = el.nextElementSibling;
        }
        group.style.display = anyVisible ? "" : "none";
      });

      section.style.display = sectionHasMatch ? "" : "none";
    });
  });
});
