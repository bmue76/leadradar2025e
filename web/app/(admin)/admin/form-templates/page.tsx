// web/app/(admin)/admin/form-templates/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type TemplateItem = {
  id: number;
  name: string;
  description: string | null;
  status: FormStatus;
  isTemplate: boolean;
  displayTitle: string | null;
  displaySubtitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

type TemplatesResponse = {
  templates: TemplateItem[];
};

export default function FormTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formular für neue Vorlage
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/form-templates');
      const data = (await res.json().catch(() => null)) as
        | TemplatesResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ??
            `Fehler beim Laden (Status ${res.status})`,
        );
      }

      if (!data || !('templates' in data)) {
        throw new Error('Unerwartete Antwort vom Server');
      }

      setTemplates((data as TemplatesResponse).templates);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Laden der Vorlagen',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const handleCreateTemplate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = newName.trim();
    if (!name) {
      setError('Bitte einen Namen für die Vorlage angeben.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/form-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: newDescription.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { template?: TemplateItem; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data?.error ?? `Fehler beim Anlegen (Status ${res.status})`,
        );
      }

      if (!data?.template) {
        throw new Error('Unerwartete Antwort beim Anlegen');
      }

      setNewName('');
      setNewDescription('');
      setSuccess('Vorlage wurde angelegt.');
      // Direkt in die Liste einfügen (oben)
      setTemplates((prev) => [data.template as TemplateItem, ...prev]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Anlegen der Vorlage',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Formular-Vorlagen</h1>
        <Link
          href="/admin/events"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Zur Event-Übersicht
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        Hier verwaltest du systemweite Formular-Vorlagen (Templates), die
        du später Events zuordnen kannst. Vorlagen haben kein Event und
        können wie normale Formulare bearbeitet werden
        (Einstellungen/Branding, Felder, Preview).
      </p>

      {success && (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Neue Vorlage anlegen */}
      <section className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">
          Neue Formular-Vorlage anlegen
        </h2>

        <form
          onSubmit={handleCreateTemplate}
          className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Name der Vorlage*
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. Standard-Leaderfassung"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Beschreibung (optional)
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Kurzbeschreibung für interne Zwecke"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
            >
              {creating ? 'Erstelle…' : 'Vorlage anlegen'}
            </button>
          </div>
        </form>
      </section>

      {/* Liste der Vorlagen */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vorlagen-Liste</h2>

        {loading ? (
          <p className="text-sm text-gray-600">Lade Vorlagen…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-600">
            Es sind noch keine Formular-Vorlagen vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Name / Anzeige-Titel
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Farben
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="border-t border-gray-200">
                    <td className="px-3 py-2 text-xs text-gray-500">
                      #{tpl.id}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{tpl.name}</div>
                      {tpl.displayTitle && (
                        <div className="text-xs text-gray-500">
                          Titel: {tpl.displayTitle}
                        </div>
                      )}
                      {tpl.description && (
                        <div className="text-xs text-gray-500">
                          {tpl.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              tpl.primaryColor && tpl.primaryColor.trim() !== ''
                                ? tpl.primaryColor
                                : '#111827',
                          }}
                          title={
                            tpl.primaryColor
                              ? `Primär: ${tpl.primaryColor}`
                              : 'Primärfarbe Standard'
                          }
                        />
                        <span
                          className="inline-block h-4 w-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              tpl.accentColor && tpl.accentColor.trim() !== ''
                                ? tpl.accentColor
                                : '#6B7280',
                          }}
                          title={
                            tpl.accentColor
                              ? `Akzent: ${tpl.accentColor}`
                              : 'Akzentfarbe Standard'
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {tpl.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/admin/forms/${tpl.id}/settings`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Einstellungen
                        </Link>
                        <Link
                          href={`/admin/forms/${tpl.id}/fields`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Felder
                        </Link>
                        <Link
                          href={`/admin/forms/${tpl.id}/preview`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Preview
                        </Link>
                      </div>
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
