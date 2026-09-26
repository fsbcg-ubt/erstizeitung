## Projekt

R Bookdown-Projekt → Erstizeitung (Erstsemester-Magazin) der Fakultät BCG, Universität Bayreuth.
Output: GitBook (HTML) + PDF aus R Markdown.

## Build-Befehle

```bash
# GitBook mit Docker
make render-gitbook

# GitBook mit PWA-Funktionalität
make render-pwa

# R direkt
Rscript -e "bookdown::render_book('index.Rmd', 'bookdown::gitbook')"
Rscript -e "bookdown::render_book('index.Rmd', 'bookdown::pdf_book')"
```

Output: `_book/` Verzeichnis

## Dateistruktur

```
index.Rmd              # Entry point: Metadaten + Einleitung
_bookdown.yml          # Bookdown config: Output-Dateiname + Chapter-Verzeichnis
_output.yml            # Output-Formate: GitBook, PDF, HTML-Konfigurationen
chapters/
  XX-YY-titel.Rmd      # R Markdown-Kapitel, sequentiell nummeriert
                       # XX=Kapitel, YY=Unterkapitel (z.B. 01-00-die-fachschaft.Rmd)
images/
  fachschaft/          # Mitglieder-Fotos (500×500 px, abgerundete Ecken)
data/                  # Daten für Kapitel (Termine, Kontakte, etc.)
```

**Bookdown-Kompilierung:** Mehrere R Markdown-Kapitel → eine Publikation (GitBook + PDF)

## Geschlechterneutrale Sprache (VERPFLICHTEND)

Vollständig: [SPRACHLEITFADEN.md](SPRACHLEITFADEN.md)

### Regeln

1. Genderstern: Professor\*in, Student\*innen, Mitarbeiter\*innen
2. Neutrale Formen: Studierende > Student\*innen
3. Kollektivbegriffe: Fachschaftsmitglieder > Fachschaftler\*innen

### Transformationen

| Alt           | Neu                                |
|---------------|------------------------------------|
| Studenten     | Studierende                        |
| Professor     | Professor\*in / Lehrperson         |
| Mitarbeiter   | Mitarbeitende / Mitarbeiter\*innen |
| Vorsitzender  | Vorsitz                            |
| jeder Student | alle Studierenden                  |

## Commits

Format: `präfix: Beschreibung` (max 72 Zeichen, Präsens)

| Präfix    | Verwendung              |
|-----------|-------------------------|
| `inhalt:` | Inhaltliche Änderungen  |
| `daten:`  | Datenaktualisierungen   |
| `bilder:` | Bildänderungen          |
| `format:` | Formatierungsänderungen |

## Branches

```
kapitel/beschreibung-der-aenderung
allgemein/beschreibung
```

Immer von `main` abzweigen.

## Bilder

### Fachschaftsmitglieder

- Format: Quadratisch 1000×1000 px
- Ecken: Radius 60 abgerundet
- Finale Größe: 500×500 px
- Dateiformat: PNG + Interlacing
- Ablage: `images/fachschaftler/`, Dateiname kleingeschrieben

### Fotos (Gruppen-, Kapitel-, Veranstaltungsbilder)

- Dateiformat: JPEG, Qualität 85, progressiv
- Maximale Kantenlänge: 1600 px
- Kein WebP — `_output.yml` erzeugt auch `pdf_book`, LaTeX bettet WebP nicht ein

```bash
magick <quelle> -colorspace RGB -filter Lanczos -resize '1600x1600>' \
  -colorspace sRGB -quality 85 -sampling-factor 4:2:0 -interlace Plane -strip <ziel>.jpg
```

`-colorspace RGB` skaliert in linearem Licht. Ohne den Umweg mittelt ImageMagick gammakodierte Werte und das Ergebnis wird dunkler.

### Grafiken (Plakate, Logos, Titelbilder)

- Dateiformat: PNG
- Titelbilder von Organisationskapiteln: `images/organisationen/`

## Workflow-Regeln

1. Branch erstellen vor Änderungen
2. Commits atomar (eine logische Änderung)
3. Pull Requests erforderlich (kein direkter Push auf `main`)
4. Geschlechterneutrale Sprache nicht optional
5. Nach Änderungen Build testen: `make render-gitbook`
6. YAML-Header in `index.Rmd` nicht ändern
7. `_bookdown.yml`, `_output.yml` nicht ändern ohne Kontext

## Nicht erstellen/ändern

- ❌ Neue Dokumentationsdateien ohne Anforderung
- ❌ Bilder ohne korrekte Formatierung
- ❌ Abweichungen von SPRACHLEITFADEN.md
- ❌ PWA-Dateien ändern ohne spezifischen PWA-Kontext (siehe pwa/AGENTS.md)

## Referenzen

- Workflow für Menschen → [CONTRIBUTING.md](CONTRIBUTING.md)
- Sprachregeln → [SPRACHLEITFADEN.md](SPRACHLEITFADEN.md)
- Claude-spezifisch → [CLAUDE.md](CLAUDE.md)
