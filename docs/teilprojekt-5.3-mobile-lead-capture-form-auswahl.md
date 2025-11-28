# Teilprojekt 5.3 – Mobile Lead Capture: Form-Auswahl & Lead-Start

**Projekt:** LeadRadar2025e  
**Datum:** 28.11.2025  
**Scope:** Mobile App (Expo, iOS priorisiert)

---

## Ziel

In diesem Teilprojekt wurde der Lead-Tab der Mobile-App so erweitert, dass:

1. Ein Formular für die Lead-Erfassung über eine Liste ausgewählt werden kann.
2. Ein eigener `LeadCaptureScreen` existiert, der das gewählte Formular lädt und eine einfache Preview der Felder anzeigt.
3. Der Datenfluss (Navigation + API-Aufrufe) für zukünftige Lead-Speicherung vorbereitet ist.

---

## Architektur & Flow

### Navigation

- Global: `AuthStack` + `AppTabs` (unverändert).
- Im Tab
