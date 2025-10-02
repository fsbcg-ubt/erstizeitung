# Erstizeitung der Fachschaft BCG

Willkommen beim Repository der **Erstizeitung** für Erstsemester-Studierende der Fakultät für Biologie, Chemie und Geowissenschaften der Universität Bayreuth!

## Über das Projekt

Die Erstizeitung ist ein Magazin, das von der [Fachschaft BCG](https://www.fs-bcg.uni-bayreuth.de/) erstellt wird und Erstsemester-Studierenden hilft, sich an der Universität Bayreuth zurechtzufinden. Das Magazin enthält wichtige Informationen über:

- Die Fachschaft und ihre Aufgaben
- Studiengänge und Modulpläne
- Campus-Leben und Freizeitangebote
- Wichtige Anlaufstellen und Kontakte
- Tipps für den Studienstart

## Features

- 📚 **GitBook-Format**: Moderne, durchsuchbare HTML-Version
- 📄 **PDF-Export**: Druckfähige PDF-Version
- 🚀 **Automatisches Deployment**: Bei jedem Release automatisch auf GitHub Pages veröffentlicht
- ♿ **Barrierearm**: Zugängliches Web-Format
- 🌐 **Geschlechterneutrale Sprache**: Konform mit den Empfehlungen der Universität Bayreuth

## Live-Version

Die aktuelle Version ist online verfügbar unter:
**[https://fsbcg-ubt.github.io/erstizeitung](https://fsbcg-ubt.github.io/erstizeitung)**

## Technologie

Das Projekt nutzt:

- **[R](https://www.r-project.org/)** - Statistische Programmiersprache (hier etwas zweckentfremdet)
- **[Bookdown](https://bookdown.org/)** - R-Paket zum Erstellen von Büchern aus R Markdown
- **[Docker](https://www.docker.com/)** - Containerisierung für reproduzierbare Builds
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD Pipeline
- **[GitHub Pages](https://pages.github.com/)** - Hosting der Web-Version

## Schnellstart

### Mit Docker (Empfohlen)

```bash
# GitBook-Version erstellen
make render-gitbook

# Ausgabe im Ordner _book/
open _book/index.html
```

### Mit R direkt

```r
# Einmalig: Bookdown installieren
install.packages("bookdown")

# GitBook (HTML) erstellen
bookdown::render_book('index.Rmd', 'bookdown::gitbook')

# PDF erstellen
bookdown::render_book('index.Rmd', 'bookdown::pdf_book')
```

## Projektstruktur

```
erstizeitung/
├── index.Rmd           # Hauptdatei mit Metadaten und Einleitung
├── chapters/           # Alle Kapitel als R Markdown-Dateien
├── images/             # Bilder und Grafiken
├── data/               # Daten (Termine, Kontakte, etc.)
├── _bookdown.yml       # Bookdown-Konfiguration
└── _output.yml         # Ausgabeformat-Konfiguration
```

## Dokumentation

Dieses Projekt verfügt über umfangreiche Dokumentation:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Ausführliche Anleitung zum Beitragen (für Menschen, speziell für nicht-technische Personen)
- **[SPRACHLEITFADEN.md](SPRACHLEITFADEN.md)** - Richtlinien für geschlechterneutrale Sprache
- **[AGENTS.md](AGENTS.md)** - Kontext für AI-Coding-Assistenten
- **[CLAUDE.md](CLAUDE.md)** - Spezifische Anweisungen für Claude Code

## Beitragen

Wir freuen uns über Beiträge! 🎉

Die **einfachste Möglichkeit** ist die Bearbeitung direkt im Browser mit dem GitHub VS Code Web-Editor (Taste `.` drücken). Eine detaillierte Schritt-für-Schritt-Anleitung findest du in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

### Wichtigste Punkte

1. Erstelle einen neuen Branch für deine Änderungen
2. Bearbeite die entsprechenden `.Rmd`-Dateien im `chapters/` Ordner
3. Verwende geschlechterneutrale Sprache (siehe [SPRACHLEITFADEN.md](SPRACHLEITFADEN.md))
4. Erstelle einen Pull Request mit deinen Änderungen

### Commit-Konventionen

Wir verwenden ein Präfix-System für Commit-Nachrichten:

- `inhalt:` - Inhaltliche Änderungen
- `daten:` - Datenaktualisierungen
- `bilder:` - Bildänderungen
- `format:` - Formatierungsänderungen

**Beispiel:** `inhalt: Bachelor Biochemie aktualisiert`

## Bildbearbeitung

Für die Erstizeitung werden quadratische Bilder mit abgerundeten Ecken verwendet. Für die Bearbeitung kann das Programm **GIMP** (kostenlos) genutzt werden.

### Anleitung für Fachschaftsmitglieder-Fotos

1. Bild in GIMP öffnen
2. Mit "Leinwandgröße" (unter "Bild") einen quadratischen Ausschnitt wählen
3. Mit "Bild skalieren" (unter "Bild") auf **1000 × 1000 Pixel** skalieren
4. Mit "Runde Ecken" (unter "Filter" → "Dekoration") die Ecken mit **Radius 60** abrunden
   ⚠️ Optionen "Schlagschatten" und "Hintergrund hinzufügen" deaktivieren
5. Mit "Bild skalieren" (unter "Bild") auf **500 × 500 Pixel** skalieren
6. Mit "Exportieren" (unter "Datei") als **PNG** speichern
   ✓ Option "Interlacing" aktivieren

## Lizenz

Dieses Projekt wird von der Fachschaft BCG der Universität Bayreuth betreut.

## Kontakt

Bei Fragen oder Problemen:

- **E-Mail:** [fs-bcg@uni-bayreuth.de](mailto:fs-bcg@uni-bayreuth.de)
- **Website:** [fs-bcg.uni-bayreuth.de](https://www.fs-bcg.uni-bayreuth.de/)
- **GitHub Issues:** [Issues erstellen](https://github.com/fsbcg-ubt/erstizeitung/issues)

---

Erstellt mit 💚 von der Fachschaft BCG für Erstsemester der Universität Bayreuth
