---
title: Startseite
layout: home
description: "Ein wissenschaftliches Nachschlagewerk zur Geographie und angrenzenden Geowissenschaften."
---

# Willkommen im Geo-Wiki

Dieses Wiki begleitet die Vorbereitung auf ein Geographie-Studium und wächst
schrittweise zu einem vollständigen Nachschlagewerk zur Geographie und den
angrenzenden Geowissenschaften — von den Grundlagen bis zu aktuellen
Forschungsthemen.

_Hinweis: Dies ist gerade ein Optik-Test mit `jekyll-98`. Das Theme hat noch
keine eigene Baum-Navigation. Wichtig: Das `home`-Layout dieses Themes
ignoriert den Markdown-Inhalt dieser Seite komplett (zeigt nur Titel,
Beschreibung und eine Post-Liste, die bei uns leer bleibt, da wir keine
`_posts` nutzen) — die folgende Kategorien-Liste ist hier nur als Referenz
stehen geblieben und wird auf der Startseite aktuell NICHT angezeigt._

## Hauptkategorien

{% assign top_kategorien = site.data.fachgebiete | where: "parent", nil %}
{% for fg in top_kategorien %}
{% assign fg_page = site.wiki | where: "kategorie", fg.id | where: "ist_kategorie", true | first %}
- {% if fg_page %}[**{{ fg.titel }}**]({{ fg_page.url | relative_url }}){% else %}**{{ fg.titel }}**{% endif %} — {{ fg.kurzbeschreibung | strip_newlines | strip }}
{% endfor %}
