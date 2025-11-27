# LeadRadar2025e – Teilprojekt 4.2  
## CSV-/Excel-Export & Event-Reports (Admin & API)

**Status:** abgeschlossen  
**Datum:** 27. November 2025  
**Autor:** Beat / ChatGPT  
**Modul:** Admin, Events, Formulare, Reporting  
**Version:** v1.0

---

## 🎯 Ziele des Teilprojekts

1. Export aller Leads eines Events als CSV (inkl. Zeitraumfilter)  
2. Vereinheitlichung der CSV-Struktur für Form-basierte Exports  
3. Ergänzung des Dashboards um Global-Export (alle Leads aller Events)  
4. UI-Komponenten für Export-Prozesse (Schnellfilter + Date-Picker)

---

## 🧩 Technische Übersicht

### Neue / aktualisierte API-Routen

| Route | Beschreibung |
|------|--------------|
| `GET /api/admin/events/[id]/leads/export` | Export aller Leads eines Events (CSV) |
| `GET /api/admin/forms/[id]/leads/export` | Vereinheitlichter Formular-CSV-Export |
| `GET /api/admin/leads/export` | Globaler CSV-Export über alle Events |

---

### CSV-Struktur (einheitlich)

Alle Exports verwenden dieselbe Header-Struktur:

