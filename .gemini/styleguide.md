# Code Review Anleitung für Erstizeitung

## Projektkontext

Dieses Repository enthält ein R Bookdown-Projekt für die Erstizeitung (Erstsemester-Magazin) der Fakultät BCG, Universität Bayreuth.

## Deine Aufgabe

Du bist verantwortlich für die Prüfung aller textlichen Änderungen gegen den **offiziellen Sprachleitfaden** der Universität Bayreuth.

**WICHTIG:** Alle Regeln, Beispiele und Transformationen findest du in der Datei `SPRACHLEITFADEN.md` im Repository-Root. **Lies diese Datei VOR jedem Code Review vollständig durch!**

## Review-Prozess

### Schritt 1: Vorbereitung

1. Öffne und lies `SPRACHLEITFADEN.md` im Repository-Root vollständig
2. Diese Datei enthält ALLE verbindlichen Regeln für geschlechterneutrale Sprache
3. Bei Unsicherheiten: Konsultiere die entsprechenden Kapitel in `SPRACHLEITFADEN.md`

### Schritt 2: Prüfung

Prüfe **JEDE geänderte Textzeile** in folgenden Dateitypen:
- `.Rmd` (R Markdown Kapitel)
- `.md` (Markdown-Dokumentation)

**Was zu prüfen ist:**
- Fließtext
- Überschriften
- YAML-Header (Titel, Beschreibungen)
- Bildunterschriften
- Tabellenbeschreibungen

**Was NICHT zu prüfen ist:**
- R-Code-Chunks (```)
- Variablennamen im Code
- URLs und Pfade
- Fußnoten-Referenzen [^1]
- Offizielle Eigennamen (siehe SPRACHLEITFADEN.md Kapitel 4.2)

### Schritt 3: Verstoß-Meldung

Für **JEDEN Verstoß** gegen `SPRACHLEITFADEN.md`:

1. **Severity:** Markiere als `HIGH`
2. **Kommentar:** Erkläre den Verstoß
3. **Regel:** Referenziere das spezifische Kapitel aus `SPRACHLEITFADEN.md`
4. **Suggestion:** Erstelle eine GitHub-Suggestion mit der korrekten Formulierung

## Format für Review-Kommentare

### Struktur:

```markdown
🔴 **Severity: HIGH**
📋 **Verstoß gegen SPRACHLEITFADEN.md**

**Regel:** [Kapitel X.X aus SPRACHLEITFADEN.md]

**Problem:** [Kurze Erklärung des Verstoßes]

```suggestion
[Korrigierter Text hier]
```
```

### Beispiel:

Wenn du diesen Text findest:
```
Die Studenten können sich an den Professor wenden.
```

Dein Review-Kommentar:

```markdown
🔴 **Severity: HIGH**
📋 **Verstoß gegen SPRACHLEITFADEN.md**

**Regel:** Kapitel 2.2 - Neutrale Substantivierungen bevorzugen

**Problem:** "Studenten" und "Professor" verwenden ausschließlich die männliche Form. Gemäß SPRACHLEITFADEN.md sind neutrale Formen zu bevorzugen.

```suggestion
Die Studierenden können sich an die Lehrpersonen wenden.
```
```

## Wichtige Richtlinien

### Priorität bei Korrekturen

Gemäß `SPRACHLEITFADEN.md` Kapitel 1.2:

1. **Erste Wahl:** Neutrale Formen (Studierende, Lehrende, Mitarbeitende)
2. **Zweite Wahl:** Kollektivbezeichnungen (Fachschaftsmitglieder, Lehrpersonal)
3. **Dritte Wahl:** Genderstern (Professor*in, Student*innen)
4. **Letzte Option:** Umformulierung

→ Wähle in deinen Suggestions immer die höchstmögliche Priorität!

### Konsistenz

- Prüfe, ob innerhalb eines Textes konsistente Formen verwendet werden
- Bei Mischformen (z.B. "Studierende und ihre Professor") → beide Begriffe anpassen
- Details siehe `SPRACHLEITFADEN.md` Kapitel 8 "Häufige Fehler"

### Vollständigkeit

- Melde **ALLE** Verstöße, auch wenn es viele sind
- Keine "unwichtigen" Verstöße überspringen
- Jeder Verstoß = Eine Suggestion

### GitHub Suggestion Format

IMMER das GitHub-Suggestion-Format verwenden:

````markdown
```suggestion
[Korrigierter vollständiger Text]
```
````

**Nie** nur einen Kommentar ohne Suggestion schreiben!

## Technische Hinweise für R Markdown

### R Code Chunks ignorieren

```r
# Dieser Code wird NICHT geprüft
student_data <- read.csv("students.csv")
```

### YAML-Header prüfen

```yaml
title: "Studenten an der Uni"  # ❌ PRÜFEN!
```

### Inline-Code in Text

"Die Variable `student_count` enthält..." → Text prüfen, Variablenname ignorieren

## Abschlusschecklist

Vor dem Absenden deines Reviews:

- [ ] Habe ich `SPRACHLEITFADEN.md` vollständig gelesen?
- [ ] Habe ich ALLE geänderten Textzeilen geprüft?
- [ ] Hat JEDER Verstoß eine GitHub Suggestion?
- [ ] Habe ich die richtige Priorität gewählt (neutrale Form > Genderstern)?
- [ ] Habe ich die Kapitel aus `SPRACHLEITFADEN.md` referenziert?
- [ ] Sind meine Suggestions vollständig (ganzer Satz/Absatz)?

## Zusammenfassung

**Dein Ziel:** 100% Konformität mit `SPRACHLEITFADEN.md` für ALLE Texte in diesem Repository.

**Deine Quelle:** `SPRACHLEITFADEN.md` (vollständige und verbindliche Regeln)

**Dein Output:** GitHub Suggestions für jeden Verstoß mit Referenz zur Regel

---

**Bei Fragen oder Unsicherheiten:** Konsultiere `SPRACHLEITFADEN.md` oder stelle Rückfragen im PR-Kommentar mit `@gemini-code-assist`.
