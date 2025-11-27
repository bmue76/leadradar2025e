"use client";

import React, { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type EventItem = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventFormState = {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
};

const EMPTY_FORM: EventFormState = {
  name: "",
  startDate: "",
  endDate: "",
  location: "",
  description: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  const isEditing = form.id != null;

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/events", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Fehler beim Laden der Events");
      }
      const data = (await res.json()) as { events?: EventItem[] };
      setEvents(data.events ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unbekannter Fehler beim Laden"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditClick(event: EventItem) {
    setForm({
      id: event.id,
      name: event.name,
      startDate: event.startDate?.slice(0, 10) ?? "",
      endDate: event.endDate?.slice(0, 10) ?? "",
      location: event.location ?? "",
      description: event.description ?? "",
    });
  }

  function handleReset() {
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
      };

      if (!payload.name || !payload.startDate) {
        throw new Error("Name und Startdatum sind Pflichtfelder.");
      }

      let res: Response;

      if (isEditing && form.id != null) {
        res = await fetch(`/api/admin/events/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Fehler beim Speichern des Events (${res.status}): ${text}`
        );
      }

      await loadEvents();
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          Zur Admin-Übersicht
        </Link>
      </header>

      <section className="border rounded-lg p-4 space-y-4 bg-white">
        <h2 className="text-lg font-semibold">
          {isEditing ? "Event bearbeiten" : "Neuen Event anlegen"}
        </h2>

        {error && (
          <p className="text-sm text-red-600 border border-red-200 rounded px-2 py-1 bg-red-50">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Startdatum *
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enddatum
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ort / Location
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Beschreibung
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {saving
                ? "Speichern..."
                : isEditing
                ? "Änderungen speichern"
                : "Event anlegen"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1 text-sm rounded border"
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">Event-Liste</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Lade Events…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-600">Noch keine Events erfasst.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Zeitraum</th>
                  <th className="text-left py-2 px-2">Ort</th>
                  <th className="text-left py-2 px-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0">
                    <td className="py-2 px-2">{ev.id}</td>
                    <td className="py-2 px-2">{ev.name}</td>
                    <td className="py-2 px-2">
                      {ev.startDate?.slice(0, 10)}{" "}
                      {ev.endDate && `– ${ev.endDate.slice(0, 10)}`}
                    </td>
                    <td className="py-2 px-2">
                      {ev.location ?? <span className="text-gray-400">–</span>}
                    </td>
                    <td className="py-2 px-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(ev)}
                        className="text-blue-600 hover:underline"
                      >
                        Bearbeiten
                      </button>
                      <Link
                        href={`/admin/events/${ev.id}/forms`}
                        className="text-green-600 hover:underline"
                      >
                        Formulare
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
