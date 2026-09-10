# NFL-Wiki

Statische Wissensdatenbank rund um American Football (primär NFL). Selbstgebauter
Static-Site-Generator (Node.js, kein Framework) statt Jekyll — siehe
[`build.js`](build.js) für die Begründung. Deployment automatisch per GitHub
Actions auf GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Lokal entwickeln

```
npm install
npm run build   # baut nach _site/
npm run serve   # baut und startet einen lokalen Server auf Port 8080
```

## Neue Artikel anlegen

- Kategorien werden in [`content/fachgebiete.yml`](content/fachgebiete.yml) gepflegt (Baumstruktur über `parent`, beliebig tief).
- Artikel/Kategorieseiten liegen als einzelne Markdown-Dateien in [`content/wiki/`](content/wiki/) (Front-Matter-Felder siehe bestehende Beispiele, z. B. [`content/wiki/cover-3.md`](content/wiki/cover-3.md)).
- Sidebar, Breadcrumbs und Kategorielisten generieren sich automatisch aus der Front-Matter — keine manuelle Navigationspflege nötig.
- Ein Artikel erscheint erst live, wenn `published: true` gesetzt ist.
