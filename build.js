// Statischer Seiten-Generator für das NFL-Wiki.
//
// Ersetzt Jekyll bewusst durch ein kleines, selbstgeschriebenes Node-Skript:
// Inhalte bleiben Markdown-Dateien mit Front-Matter (unverändertes Format),
// aber Kategoriebaum, Breadcrumbs, Sidebar etc. werden in echtem JavaScript
// berechnet statt in einer Template-Sprache (Liquid) mit eigenen Fallstricken
// (siehe Git-Historie: "where"-Filter mit nil-Wert lieferte ungefiltert das
// gesamte Array zurück und erzeugte eine scheinbar rekursive Sidebar).
//
// Ausgabe landet in _site/ (siehe .gitignore) und wird per GitHub Actions
// auf GitHub Pages veröffentlicht (.github/workflows/deploy.yml).

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, "content");
const WIKI_DIR = path.join(CONTENT_DIR, "wiki");
const ASSETS_DIR = path.join(ROOT, "assets");
const OUT_DIR = path.join(ROOT, "_site");

// GitHub Pages Projekt-Seiten (nicht <user>.github.io direkt, sondern ein
// normales Repo) laufen unter https://<user>.github.io/<repo>/ — absolute
// Pfade wie "/assets/..." würden also an der Domainwurzel vorbeizeigen.
// BASE_URL wird deshalb vor jeden internen Link/Asset-Pfad gesetzt. Bei
// einer eigenen Domain oder einem User-/Org-Root-Repo (<user>.github.io)
// hier auf "" setzen. Per Env-Variable überschreibbar (z.B. für lokale
// Vorschau ohne Präfix: BASE_URL= npm run build).
const BASE_URL = process.env.BASE_URL !== undefined ? process.env.BASE_URL : "/geoblog";

function url(p) {
  if (p === "/") return BASE_URL || "/";
  return `${BASE_URL}${p}`;
}

const SITE = {
  title: "NFL-Wiki",
  description:
    "Eine Wissensdatenbank rund um American Football (primär NFL) — von den Grundlagen bis zu Scheme-Tiefe: Formationen, Coverages, Route-Concepts und Situational Football.",
};

const md = new MarkdownIt({ html: false, linkify: true });

// ---------- Front-Matter-Defaults (ersetzt frühere Jekyll _config.yml defaults) ----------
const ARTICLE_DEFAULTS = {
  ist_kategorie: false,
  uebergeordnet: null,
  tags: [],
  verwandte_themen: [],
  quellen: [],
  literatur: [],
  infobox: [],
  status: "stub",
  schwierigkeit: "grundlagen",
  published: false,
};

function loadYaml(filename) {
  return yaml.load(fs.readFileSync(path.join(CONTENT_DIR, filename), "utf8"));
}

const fachgebiete = loadYaml("fachgebiete.yml");
const schwierigkeitLabels = loadYaml("schwierigkeit.yml");
const statusLabels = loadYaml("status.yml");

const fgById = new Map(fachgebiete.map((fg) => [fg.id, fg]));
const fgChildren = new Map(); // parentId(or null) -> [fg,...]
for (const fg of fachgebiete) {
  const key = fg.parent || null;
  if (!fgChildren.has(key)) fgChildren.set(key, []);
  fgChildren.get(key).push(fg);
}

// ---------- Wiki-Artikel laden ----------
const wikiFiles = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md"));

const docs = wikiFiles.map((filename) => {
  const slug = filename.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(WIKI_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const doc = { ...ARTICLE_DEFAULTS, ...data, slug, url: `/wiki/${slug}/` };
  // Artikeltexte verlinken andere Wiki-Seiten mit seitenwurzel-relativen
  // Pfaden (z.B. "/wiki/gaps/"). Damit die auch unter dem GitHub-Pages-
  // Projektpfad funktionieren, bekommen sie hier nachträglich denselben
  // BASE_URL-Präfix wie alle Template-generierten Links (siehe url()).
  doc.bodyHtml = md.render(content).replace(/href="\/(?!\/)/g, `href="${BASE_URL}/`);
  return doc;
});

const published = docs.filter((d) => d.published);
const docsByKategorieAsPage = new Map(); // kategorie id -> category-page doc
for (const d of published) {
  if (d.ist_kategorie) docsByKategorieAsPage.set(d.kategorie, d);
}
const articlesByParent = new Map(); // uebergeordnet id -> [doc,...] (nur echte Artikel, keine Kategorieseiten)
for (const d of published) {
  if (d.ist_kategorie) continue;
  if (!articlesByParent.has(d.uebergeordnet)) articlesByParent.set(d.uebergeordnet, []);
  articlesByParent.get(d.uebergeordnet).push(d);
}
for (const list of articlesByParent.values()) {
  list.sort((a, b) => a.title.localeCompare(b.title, "de"));
}

// ---------- Helfer: Kategoriebaum ----------

// Kette von Kategorie-IDs von der Wurzel bis inkl. `id` (für Breadcrumbs/Sidebar-Aufklappzustand).
function ancestorChain(id) {
  const chain = [];
  let cursor = id ? fgById.get(id) : undefined;
  let guard = 0;
  while (cursor && guard++ < 20) {
    chain.unshift(cursor);
    cursor = cursor.parent ? fgById.get(cursor.parent) : undefined;
  }
  return chain;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// ---------- Sidebar ----------

function renderNavNode(fg, activeUrl, ahnenIds, isTop) {
  const kinder = fgChildren.get(fg.id) || [];
  const artikel = articlesByParent.get(fg.id) || [];
  const seite = docsByKategorieAsPage.get(fg.id);
  const hatKinder = kinder.length > 0 || artikel.length > 0;
  const offen = ahnenIds.includes(fg.id);
  const isActive = seite && seite.url === activeUrl;

  const label = seite
    ? `<a href="${url(seite.url)}" class="nav-link${isActive ? " active" : ""}">${escapeHtml(fg.titel)}</a>`
    : `<span class="nav-link nav-link-plain">${escapeHtml(fg.titel)}</span>`;

  if (!hatKinder) {
    return `<li class="nav-item${isTop ? " nav-top" : ""}">${label}</li>`;
  }

  const childHtml = kinder.map((k) => renderNavNode(k, activeUrl, ahnenIds, false)).join("\n");
  const articleHtml = artikel
    .map(
      (a) =>
        `<li class="nav-item"><a href="${url(a.url)}" class="nav-link nav-link-article${
          a.url === activeUrl ? " active" : ""
        }">${escapeHtml(a.title)}</a></li>`
    )
    .join("\n");

  return `
    <li class="nav-item${isTop ? " nav-top" : ""}">
      <details class="nav-details"${offen ? " open" : ""}>
        <summary>${label}</summary>
        <ul>
          ${childHtml}
          ${articleHtml}
        </ul>
      </details>
    </li>`;
}

function renderSidebar(activeUrl, ahnenIds) {
  const topLevel = fgChildren.get(null) || [];
  const treeHtml = topLevel.map((fg) => renderNavNode(fg, activeUrl, ahnenIds, true)).join("\n");
  const emptyNotice =
    published.length === 0
      ? `<p class="empty">Noch keine veröffentlichten Artikel. Struktur ist vorbereitet, aber ausgeblendet (<code>published: false</code>).</p>`
      : "";

  return `
<nav class="sidebar" aria-label="Inhaltsverzeichnis">
  <div class="sidebar-search">
    <input type="search" id="search-input" placeholder="Suchen…" autocomplete="off">
  </div>
  <div id="tree-container">
    <ul class="nav-tree">
      ${treeHtml}
    </ul>
    ${emptyNotice}
  </div>
</nav>`;
}

// ---------- Layout-Bausteine ----------

function renderHeader() {
  return `
<header>
  <a href="${url("/")}" class="brand" title="Zur Übersicht" aria-label="Zur Übersicht">
    <img src="${url("/assets/images/star.svg")}" alt="" class="brand-star">
    <span class="brand-wordmark">${escapeHtml(SITE.title)}</span>
  </a>
  <p class="subtitle">${escapeHtml(SITE.description)}</p>
</header>`;
}

function renderFooter() {
  return `
<footer>
  <p>${escapeHtml(SITE.title)} &mdash; gehostet mit GitHub Pages.</p>
</footer>`;
}

function renderPage({ title, contentPaneHtml, activeUrl, ahnenIds }) {
  const pageTitle = title ? `${title} · ${SITE.title}` : SITE.title;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(pageTitle)}</title>
<link rel="icon" type="image/svg+xml" href="${url("/assets/images/star.svg")}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${url("/assets/css/style.css")}">
</head>
<body>

<div class="wrapper">

  ${renderHeader()}

  <div class="doc-layout">
    ${renderSidebar(activeUrl, ahnenIds)}
    <section class="content-pane">
      ${contentPaneHtml}
    </section>
  </div>

  ${renderFooter()}

</div>

<script src="${url("/assets/js/nav.js")}"></script>
<script src="${url("/assets/js/search.js")}"></script>
</body>
</html>
`;
}

// ---------- Artikel-/Kategorieseiten ----------

function renderBreadcrumb(doc) {
  const chain = ancestorChain(doc.kategorie);
  const parts = [`<a href="${url("/")}">Wiki</a>`];
  for (const fg of chain) {
    const seite = docsByKategorieAsPage.get(fg.id);
    if (seite && seite.url !== doc.url) {
      parts.push(`<a href="${url(seite.url)}">${escapeHtml(fg.titel)}</a>`);
    } else {
      parts.push(escapeHtml(fg.titel));
    }
  }
  if (!doc.ist_kategorie) parts.push(escapeHtml(doc.title));
  return `<p class="crumb">${parts.join(" &raquo; ")}</p>`;
}

function renderMeta(doc) {
  const statusLabel = statusLabels[doc.status];
  const schwierigkeitLabel = schwierigkeitLabels[doc.schwierigkeit];
  const tagsHtml = doc.tags.length
    ? `<span class="tags-inline">${doc.tags
        .map((t) => `<span class="tag tag-plain">${escapeHtml(t)}</span>`)
        .join("")}</span>`
    : "";
  return `
<div class="meta">
  ${statusLabel ? `<span class="tag status-${doc.status}">${escapeHtml(statusLabel)}</span>` : ""}
  ${
    schwierigkeitLabel
      ? `<span class="tag level-${doc.schwierigkeit}">${escapeHtml(schwierigkeitLabel)}</span>`
      : ""
  }
  ${tagsHtml}
</div>`;
}

function renderInfobox(doc) {
  if (!doc.infobox || doc.infobox.length === 0) return "";
  const rows = doc.infobox
    .map((e) => `<dt>${escapeHtml(e.label)}</dt><dd>${escapeHtml(e.value)}</dd>`)
    .join("\n");
  return `
<aside class="infobox">
  <div class="infobox-title">${escapeHtml(doc.infobox_titel || doc.title)}</div>
  <dl>${rows}</dl>
</aside>`;
}

function renderChildrenSections(doc) {
  let html = "";
  if (doc.ist_kategorie) {
    const unterkategorien = fgChildren.get(doc.kategorie) || [];
    if (unterkategorien.length > 0) {
      html += `
<div class="wiki-children">
  <h3>Unterkategorien</h3>
  <ul>
    ${unterkategorien
      .map((uk) => {
        const ukSeite = docsByKategorieAsPage.get(uk.id);
        return ukSeite
          ? `<li><a href="${url(ukSeite.url)}">${escapeHtml(uk.titel)}</a></li>`
          : `<li>${escapeHtml(uk.titel)} <em>(noch nicht aktiviert)</em></li>`;
      })
      .join("\n")}
  </ul>
</div>`;
    }
  }

  const kinder = articlesByParent.get(doc.kategorie) || [];
  if (kinder.length > 0) {
    html += `
<div class="wiki-children">
  <h3>Artikel in dieser Kategorie</h3>
  <ul>
    ${kinder.map((k) => `<li><a href="${url(k.url)}">${escapeHtml(k.title)}</a></li>`).join("\n")}
  </ul>
</div>`;
  }

  return html;
}

function renderRelated(doc) {
  const items =
    doc.verwandte_themen && doc.verwandte_themen.length
      ? `<ul>${doc.verwandte_themen.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
      : `<p class="empty">Noch keine verwandten Themen hinterlegt.</p>`;
  return `
<div class="wiki-related">
  <h3>Verwandte Themen</h3>
  ${items}
</div>`;
}

function renderPrevNext(doc) {
  const geschwister = (articlesByParent.get(doc.uebergeordnet) || []);
  if (geschwister.length <= 1) return "";
  const idx = geschwister.findIndex((g) => g.url === doc.url);
  const prev = idx > 0 ? geschwister[idx - 1] : null;
  const next = idx >= 0 && idx < geschwister.length - 1 ? geschwister[idx + 1] : null;
  if (!prev && !next) return "";
  return `
<nav class="wiki-prevnext">
  ${prev ? `<a class="prev" href="${url(prev.url)}">&laquo; ${escapeHtml(prev.title)}</a>` : ""}
  ${next ? `<a class="next" href="${url(next.url)}">${escapeHtml(next.title)} &raquo;</a>` : ""}
</nav>`;
}

function renderWikiDoc(doc) {
  const ahnenIds = ancestorChain(doc.kategorie).map((f) => f.id);

  const body = `
${renderBreadcrumb(doc)}
<h2>${escapeHtml(doc.title)}</h2>
${renderMeta(doc)}

<div class="wiki-body">
  <div class="post-content">
    ${doc.bodyHtml}
  </div>
  ${renderInfobox(doc)}
</div>

${renderChildrenSections(doc)}
${renderRelated(doc)}
${renderPrevNext(doc)}`;

  return renderPage({
    title: doc.title,
    contentPaneHtml: body,
    activeUrl: doc.url,
    ahnenIds,
  });
}

// ---------- Startseite ----------

function renderHome() {
  const topLevel = fgChildren.get(null) || [];
  const items = topLevel
    .map((fg) => {
      const seite = docsByKategorieAsPage.get(fg.id);
      const label = escapeHtml(fg.titel);
      return seite
        ? `<li><a href="${url(seite.url)}">${label}</a> — <span class="recent-date">${escapeHtml(fg.kurzbeschreibung || "")}</span></li>`
        : `<li>${label} <em>(noch nicht aktiviert)</em></li>`;
    })
    .join("\n");

  const body = `
<div class="welcome">
  <h2>Willkommen im ${escapeHtml(SITE.title)}</h2>
  <p>
    Diese Wissensdatenbank begleitet dich vom ersten Regelverständnis bis zur
    echten Scheme-Tiefe: Personnel-Gruppierungen, Formationen,
    Coverage-Konzepte, Route-Concepts, Blitz-Packages und Situational
    Football rund um American Football (primär NFL).
  </p>
  <p>
    Die Struktur wächst nach und nach. Wähle links ein Thema aus der Sidebar
    oder starte mit einer der Hauptkategorien:
  </p>
  <ul class="recent">
    ${items}
  </ul>
</div>`;

  return renderPage({ title: null, contentPaneHtml: body, activeUrl: "/", ahnenIds: [] });
}

// ---------- Dateisystem ----------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  writeFile("index.html", renderHome());

  for (const doc of published) {
    writeFile(`wiki/${doc.slug}/index.html`, renderWikiDoc(doc));
  }

  copyDir(ASSETS_DIR, path.join(OUT_DIR, "assets"));

  console.log(`Gebaut: ${published.length} veröffentlichte Wiki-Seiten + Startseite -> ${path.relative(ROOT, OUT_DIR)}/`);
}

build();
