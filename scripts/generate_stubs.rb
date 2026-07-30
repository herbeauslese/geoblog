#!/usr/bin/env ruby
# Erzeugt Artikel-Stub-Dateien aus einer Themenliste (YAML).
#
# Aufruf:
#   ruby scripts/generate_stubs.rb scripts/themen.beispiel.yml
#
# Eingabeformat pro Eintrag (siehe scripts/themen.beispiel.yml):
#   slug:              Dateiname ohne .md, eindeutig innerhalb der Kategorie
#   titel:              Artikeltitel (muss sich von allen Geschwister- und
#                        Kindtiteln unterscheiden, das nutzt Just the Docs
#                        zur Navigations-Zuordnung über `parent:`)
#   kategorie:          id aus _data/fachgebiete.yml (die unmittelbare,
#                        speziellste Kategorie des Artikels)
#   kurzbeschreibung:    kurzer Teaser
#   schwierigkeit:       grundlagen | fortgeschritten | experte
#   tags:                Liste von Schlagworten
#
# Erzeugte Artikel sind standardmäßig `published: false` (siehe _config.yml
# defaults) und erscheinen erst nach manuellem Umschalten auf `true` in
# Navigation, Suche und Build. `parent:` wird automatisch aus dem Titel der
# Kategorie in _data/fachgebiete.yml gesetzt (Just the Docs ordnet Seiten
# über den exakten Titel der Elternseite ein).

require "yaml"
require "fileutils"

input = ARGV[0]
abort "Nutzung: ruby scripts/generate_stubs.rb <themen.yml>" unless input

themen = YAML.load_file(input)
fachgebiete = YAML.load_file("_data/fachgebiete.yml")
fachgebiete_by_id = fachgebiete.each_with_object({}) { |c, h| h[c["id"]] = c }

SCHWIERIGKEIT_LABEL = {
  "grundlagen" => ["Grundlagen", "label-blue"],
  "fortgeschritten" => ["Fortgeschritten", "label-purple"],
  "experte" => ["Experte", "label-red"],
}.freeze

themen.each do |t|
  slug = t.fetch("slug")
  kategorie_id = t.fetch("kategorie")
  kategorie = fachgebiete_by_id[kategorie_id]

  unless kategorie
    warn "Übersprungen (#{slug}): unbekannte Kategorie '#{kategorie_id}'"
    next
  end

  dir = File.join("_wiki", kategorie_id)
  FileUtils.mkdir_p(dir)
  path = File.join(dir, "#{slug}.md")

  if File.exist?(path)
    warn "Übersprungen (bereits vorhanden): #{path}"
    next
  end

  schwierigkeit = t.fetch("schwierigkeit", "grundlagen")
  label_text, label_class = SCHWIERIGKEIT_LABEL.fetch(schwierigkeit, SCHWIERIGKEIT_LABEL["grundlagen"])

  front_matter = {
    "title" => t.fetch("titel"),
    "parent" => kategorie.fetch("titel"),
    "kategorie" => kategorie_id,
    "ist_kategorie" => false,
    "uebergeordnet" => kategorie_id,
    "tags" => t.fetch("tags", []),
    "schwierigkeit" => schwierigkeit,
    "status" => "stub",
    "kurzbeschreibung" => t.fetch("kurzbeschreibung", ""),
    "verwandte_themen" => t.fetch("verwandte_themen", []),
    "quellen" => t.fetch("quellen", []),
    "literatur" => t.fetch("literatur", []),
    "published" => false,
  }

  yaml_body = front_matter.to_yaml.sub(/\A---\n/, "")
  body = <<~MD
    <span class="label #{label_class}">#{label_text}</span> <span class="label label-grey-dk-000">Stub</span>

    #{t.fetch("kurzbeschreibung", "")}

    _Dieser Artikel ist ein Platzhalter. Inhalte folgen._
  MD

  File.write(path, "---\n#{yaml_body}---\n#{body}")
  puts "Erzeugt: #{path}"
end
