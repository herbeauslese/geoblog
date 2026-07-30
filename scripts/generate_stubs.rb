#!/usr/bin/env ruby
# Erzeugt Artikel-Stub-Dateien aus einer Themenliste (YAML).
#
# Aufruf:
#   ruby scripts/generate_stubs.rb scripts/themen.beispiel.yml
#
# Eingabeformat pro Eintrag (siehe scripts/themen.beispiel.yml):
#   slug:              Dateiname ohne .md, eindeutig innerhalb der Kategorie
#   titel:              Artikeltitel
#   kategorie:          id aus _data/fachgebiete.yml (Ebene-1-Kategorie)
#   uebergeordnet:       kategorie-id ODER slug eines übergeordneten Artikels
#   kurzbeschreibung:    kurzer Teaser
#   schwierigkeit:       grundlagen | fortgeschritten | experte
#   tags:                Liste von Schlagworten
#
# Erzeugte Artikel sind standardmäßig `published: false` (siehe _config.yml
# defaults) und erscheinen erst nach manuellem Umschalten auf `true` in
# Navigation, Suche und Build.

require "yaml"
require "fileutils"

input = ARGV[0]
abort "Nutzung: ruby scripts/generate_stubs.rb <themen.yml>" unless input

themen = YAML.load_file(input)
gueltige_kategorien = YAML.load_file("_data/fachgebiete.yml").map { |k| k["id"] }

themen.each do |t|
  slug = t.fetch("slug")
  kategorie = t.fetch("kategorie")

  unless gueltige_kategorien.include?(kategorie)
    warn "Übersprungen (#{slug}): unbekannte Kategorie '#{kategorie}'"
    next
  end

  dir = File.join("_wiki", kategorie)
  FileUtils.mkdir_p(dir)
  path = File.join(dir, "#{slug}.md")

  if File.exist?(path)
    warn "Übersprungen (bereits vorhanden): #{path}"
    next
  end

  front_matter = {
    "title" => t.fetch("titel"),
    "kategorie" => kategorie,
    "ist_kategorie" => false,
    "uebergeordnet" => t.fetch("uebergeordnet", kategorie),
    "tags" => t.fetch("tags", []),
    "schwierigkeit" => t.fetch("schwierigkeit", "grundlagen"),
    "status" => "stub",
    "kurzbeschreibung" => t.fetch("kurzbeschreibung", ""),
    "verwandte_themen" => t.fetch("verwandte_themen", []),
    "quellen" => t.fetch("quellen", []),
    "literatur" => t.fetch("literatur", []),
    "published" => false,
  }

  content = "---\n#{front_matter.to_yaml.sub(/\A---\n/, "")}---\n#{t.fetch("kurzbeschreibung", "")}\n\n_Dieser Artikel ist ein Platzhalter. Inhalte folgen._\n"

  File.write(path, content)
  puts "Erzeugt: #{path}"
end
