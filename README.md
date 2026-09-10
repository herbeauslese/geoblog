# NFL-Wiki

Statische Wissensdatenbank rund um American Football (primär NFL), gebaut
mit Jekyll für GitHub Pages.

## Lokal entwickeln

```
bundle install
bundle exec jekyll serve
```

## Neue Artikel anlegen

- Kategorien werden in [`_data/fachgebiete.yml`](_data/fachgebiete.yml) gepflegt (Baumstruktur über `parent`).
- Artikel/Kategorieseiten liegen als einzelne Markdown-Dateien in [`_wiki/`](_wiki/) (Front-Matter-Felder siehe bestehende Beispiele, z. B. [`_wiki/cover-3.md`](_wiki/cover-3.md)).
- Sidebar, Breadcrumbs und Kategorielisten generieren sich automatisch aus der Front-Matter — keine manuelle Navigationspflege nötig.
