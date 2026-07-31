---
title: Startseite
nav_order: 1
description: "Ein wissenschaftliches Nachschlagewerk zur Geographie und angrenzenden Geowissenschaften."
---

# Willkommen im Geo-Wiki

Dieses Wiki begleitet die Vorbereitung auf ein Geographie-Studium und wächst
schrittweise zu einem vollständigen Nachschlagewerk zur Geographie und den
angrenzenden Geowissenschaften — von den Grundlagen bis zu aktuellen
Forschungsthemen.

Die komplette Struktur ist bereits angelegt; Artikel werden nach und nach
freigeschaltet. Nutze die Navigation links, um ein Thema auszuwählen.

## Hauptkategorien

{% assign top_kategorien = site.data.fachgebiete | where: "parent", nil %}
{% for fg in top_kategorien %}
- **{{ fg.titel }}** — {{ fg.kurzbeschreibung | strip_newlines | strip }}
{% endfor %}
