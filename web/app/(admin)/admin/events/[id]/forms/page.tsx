// web/app/(admin)/admin/events/[id]/forms/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type FormItem = {
  id: number;
  eventId: number | null;
  name: string;
  description: string | null;
  status: FormStatus;
  isDefault: boolean;
  isTemplate: boolean;
  displayTitle: string | null;
  displaySubtitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

type FormListResponse = {
  forms: FormItem[];
  error?: string;
};

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
  error?: string;
};

export default function EventFormsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const eventId = Number.parseInt(params.id, 10);

  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');

  // Template-bezogene States
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [templateFormName, setTemplateFormName] = useState('');
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  // --------------------------------------------------
  // Daten laden
  // --------------------------------------------------

  const loadForms = async () => {
    if (Number.isNaN(eventId)) {
      setError('Ungültige Event-ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/forms`);
      const data = (await res.json().catch(() => null)) as
        | FormListResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ??
            `Fehler beim Laden der Formulare (Status ${res.status})`,
        );
      }

      if (!data || !('forms' in data) || !Array.isArray(data.forms)) {
        throw new Error('Unerwartete Antwort vom Server');
      }

      setForms(data.forms);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Laden der Formulare',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // --------------------------------------------------
  // Neues Formular (klassisch) anlegen
  // --------------------------------------------------

  const handleCreateForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = newFormName.trim();
    if (!name) {
      setError('Bitte einen Namen für das neue Formular angeben.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: newFormDescription.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { form?: FormItem; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data?.error ?? `Fehler beim Anlegen des Formulars (Status ${res.status})`,
        );
      }

      if (!data?.form) {
        // Falls dein bisheriger Endpoint nur {forms:[...]} zurückgibt:
        await loadForms();
      } else {
        setForms((prev) => [...prev, data.form as FormItem]);
      }

      setNewFormName('');
      setNewFormDescription('');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Anlegen des Formulars',
      );
    } finally {
      setCreating(false);
    }
  };

  // --------------------------------------------------
  // Formular löschen
  // --------------------------------------------------

  const handleDeleteForm = async (formId: number) => {
    // simple confirm, optional
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      'Formular wirklich löschen? Alle zugehörigen Leads bleiben erhalten, verlieren aber ggf. den Formularbezug.',
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'DELETE',
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data?.error ?? `Fehler beim Löschen (Status ${res.status})`,
        );
      }

      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Löschen des Formulars',
      );
    }
  };

  // --------------------------------------------------
  // Templates laden (für Dialog)
  // --------------------------------------------------

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setTemplateError(null);
    try {
      const res = await fetch('/api/admin/form-templates');
      const data = (await res.json().catch(() => null)) as
        | TemplatesResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ??
            `Fehler beim Laden der Vorlagen (Status ${res.status})`,
        );
      }

      if (!data || !('templates' in data) || !Array.isArray(data.templates)) {
        throw new Error('Unerwartete Antwort beim Laden der Vorlagen');
      }

      setTemplates(data.templates);
      if (data.templates.length > 0) {
        setSelectedTemplateId(data.templates[0].id);
      } else {
        setSelectedTemplateId(null);
      }
    } catch (err) {
      console.error(err);
      setTemplateError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Laden der Vorlagen',
      );
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openTemplateDialog = () => {
    setShowTemplateDialog(true);
    setTemplateFormName('');
    void loadTemplates();
  };

  const closeTemplateDialog = () => {
    setShowTemplateDialog(false);
    setTemplateError(null);
    setCreatingFromTemplate(false);
  };

  // --------------------------------------------------
  // Formular aus Vorlage erzeugen
  // --------------------------------------------------

  const handleCreateFromTemplate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      setTemplateError('Bitte eine Vorlage auswählen.');
      return;
    }

    setCreatingFromTemplate(true);
    setTemplateError(null);

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/forms/from-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            name: templateFormName.trim() || undefined,
          }),
        },
      );

      const data = (await res.json().catch(() => null)) as
        | { form?: FormItem; fields?: unknown; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data?.error ??
            `Fehler beim Erzeugen aus Vorlage (Status ${res.status})`,
        );
      }

      if (data?.form) {
        setForms((prev) => [...prev, data.form as FormItem]);
      } else {
        await loadForms();
      }

      closeTemplateDialog();
    } catch (err) {
      console.error(err);
      setTemplateError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Erzeugen aus Vorlage',
      );
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  const goBack = () => {
    router.push('/admin/events');
  };

  if (Number.isNaN(eventId)) {
    return (
      <div className="p-6">
        <p className="text-red-600">Ungültige Event-ID in der URL.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="px-3 py-1 rounded border border-gray-300 text-sm"
        >
          ← Zurück zur Event-Übersicht
        </button>

        <div className="text-right text-xs text-gray-500">
          <div>Event-ID: {eventId}</div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">Formulare für Event #{eventId}</h1>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Formular: Neues Formular anlegen */}
      <section className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Neues Formular anlegen</h2>
        <p className="text-xs text-gray-500">
          Du kannst ein leeres Formular erstellen oder weiter unten ein Formular direkt aus einer Vorlage erzeugen.
        </p>

        <form
          onSubmit={handleCreateForm}
          className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Name des Formulars*
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
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
              value={newFormDescription}
              onChange={(e) => setNewFormDescription(e.target.value)}
              placeholder="Kurzbeschreibung für interne Zwecke"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
            >
              {creating ? 'Erstelle…' : 'Formular anlegen'}
            </button>
          </div>
        </form>
      </section>

      {/* Button: Formular aus Vorlage erstellen */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Formular aus Vorlage erstellen
          </h2>
          <p className="text-xs text-gray-500">
            Nutze eine vorhandene Formular-Vorlage als Basis, inklusive Feldern
            und Branding-Einstellungen.
          </p>
        </div>
        <button
          type="button"
          onClick={openTemplateDialog}
          className="px-4 py-2 rounded border border-blue-600 text-blue-600 text-sm hover:bg-blue-50"
        >
          Formular aus Vorlage wählen…
        </button>
      </section>

      {/* Liste der vorhandenen Formulare */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Formular-Liste</h2>

        {loading ? (
          <p className="text-sm text-gray-600">Lade Formulare…</p>
        ) : forms.length === 0 ? (
          <p className="text-sm text-gray-600">
            Für dieses Event sind noch keine Formulare angelegt.
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
                    Name / Titel
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Typ
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Farben
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id} className="border-t border-gray-200">
                    <td className="px-3 py-2 text-xs text-gray-500">
                      #{form.id}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{form.name}</div>
                      {form.displayTitle && (
                        <div className="text-xs text-gray-500">
                          Titel: {form.displayTitle}
                        </div>
                      )}
                      {form.description && (
                        <div className="text-xs text-gray-500">
                          {form.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {form.isTemplate ? 'Vorlage' : 'Event-Formular'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              form.primaryColor && form.primaryColor.trim() !== ''
                                ? form.primaryColor
                                : '#111827',
                          }}
                          title={
                            form.primaryColor
                              ? `Primär: ${form.primaryColor}`
                              : 'Primärfarbe Standard'
                          }
                        />
                        <span
                          className="inline-block h-4 w-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              form.accentColor && form.accentColor.trim() !== ''
                                ? form.accentColor
                                : '#6B7280',
                          }}
                          title={
                            form.accentColor
                              ? `Akzent: ${form.accentColor}`
                              : 'Akzentfarbe Standard'
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/admin/forms/${form.id}/settings`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Einstellungen
                        </Link>
                        <Link
                          href={`/admin/forms/${form.id}/fields`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Felder
                        </Link>
                        <Link
                          href={`/admin/forms/${form.id}/preview`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Preview
                        </Link>
                        <Link
                          href={`/admin/forms/${form.id}/leads`}
                          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
                        >
                          Leads
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteForm(form.id)}
                          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dialog für „Formular aus Vorlage“ */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                Formular aus Vorlage erstellen
              </h2>
              <button
                type="button"
                onClick={closeTemplateDialog}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {templateError && (
              <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {templateError}
              </div>
            )}

            {loadingTemplates ? (
              <p className="text-sm text-gray-600">Lade Vorlagen…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-600">
                Es sind noch keine Formular-Vorlagen vorhanden. Lege zuerst
                welche unter{' '}
                <Link
                  href="/admin/form-templates"
                  className="text-blue-600 underline"
                >
                  Formular-Vorlagen
                </Link>{' '}
                an.
              </p>
            ) : (
              <form
                onSubmit={handleCreateFromTemplate}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Vorlage auswählen
                  </label>
                  <select
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    value={selectedTemplateId ?? ''}
                    onChange={(e) =>
                      setSelectedTemplateId(
                        e.target.value
                          ? Number.parseInt(e.target.value, 10)
                          : null,
                      )
                    }
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        #{tpl.id} – {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Name des neuen Formulars (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    value={templateFormName}
                    onChange={(e) => setTemplateFormName(e.target.value)}
                    placeholder="Standard: &lt;Vorlagenname&gt; – &lt;Eventname&gt;"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeTemplateDialog}
                    className="px-4 py-2 rounded border border-gray-300 text-sm"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFromTemplate}
                    className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                  >
                    {creatingFromTemplate
                      ? 'Erzeuge…'
                      : 'Formular aus Vorlage erstellen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
