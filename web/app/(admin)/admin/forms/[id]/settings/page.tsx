// web/app/(admin)/admin/forms/[id]/settings/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

type ApiResponse = {
  form: FormItem;
};

export default function FormSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const formId = Number.parseInt(params.id, 10);

  const [form, setForm] = useState<FormItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Eingaben für "als Vorlage speichern"
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (Number.isNaN(formId)) {
      setError('Ungültige Formular-ID');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/forms/${formId}`);
        const data = (await res.json().catch(() => null)) as
          | ApiResponse
          | { error?: string }
          | null;

        if (!res.ok) {
          throw new Error(
            (data as { error?: string })?.error ??
              `Fehler beim Laden des Formulars (Status ${res.status})`,
          );
        }

        if (!data || !('form' in data)) {
          throw new Error('Unerwartete Antwort vom Server');
        }

        setForm((data as ApiResponse).form);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Laden des Formulars',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [formId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          displayTitle: form.displayTitle,
          displaySubtitle: form.displaySubtitle,
          logoUrl: form.logoUrl,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | ApiResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ??
            `Fehler beim Speichern (Status ${res.status})`,
        );
      }

      if (!data || !('form' in data)) {
        throw new Error('Unerwartete Antwort beim Speichern');
      }

      setForm((data as ApiResponse).form);
      setSuccess('Formulareinstellungen gespeichert.');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Speichern',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form) return;

    setSavingTemplate(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/save-as-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: templateName.trim() || undefined,
            description: templateDescription.trim() || undefined,
          }),
        },
      );

      const data = (await res.json().catch(() => null)) as
        | { template?: unknown; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data?.error ??
            `Fehler beim Anlegen der Vorlage (Status ${res.status})`,
        );
      }

      setTemplateName('');
      setTemplateDescription('');
      setSuccess(
        'Vorlage wurde aus diesem Formular angelegt. Du findest sie unter „Formular-Vorlagen“.',
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Anlegen der Vorlage',
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const goBack = () => {
    if (form?.eventId) {
      router.push(`/admin/events/${form.eventId}/forms`);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Lade Formular-Einstellungen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="px-3 py-1 rounded border border-gray-300 text-sm"
        >
          Zurück
        </button>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6">
        <p>Formular nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="px-3 py-1 rounded border border-gray-300 text-sm"
        >
          ← Zurück
        </button>
        <div className="text-right text-xs text-gray-500">
          <div>Formular-ID: {form.id}</div>
          <div>Status: {form.status}</div>
          <div>
            Typ:{' '}
            {form.isTemplate ? 'Vorlage (Template)' : 'Event-Formular'}
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">
        Formulareinstellungen &amp; Branding
      </h1>

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

      {/* Haupt-Settings */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basis-Infos */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Basis-Informationen</h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Interner Name
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.name ?? ''}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev,
                )
              }
              placeholder="z.B. Messe XY – Standard-Formular"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Beschreibung (optional)
            </label>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, description: e.target.value } : prev,
                )
              }
              placeholder="Kurze Beschreibung für interne Zwecke"
            />
          </div>
        </section>

        {/* Branding / CI */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Branding / CI</h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Anzeige-Titel
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.displayTitle ?? ''}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, displayTitle: e.target.value } : prev,
                )
              }
              placeholder="z.B. Lead-Erfassung Messe XY"
            />
            <p className="text-xs text-gray-500">
              Wenn leer, wird der interne Name als Titel verwendet.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Untertitel
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.displaySubtitle ?? ''}
              onChange={(e) =>
                setForm((prev) =>
                  prev
                    ? { ...prev, displaySubtitle: e.target.value }
                    : prev,
                )
              }
              placeholder="z.B. Bitte alle Felder möglichst vollständig ausfüllen."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Logo-URL (optional)
            </label>
            <input
              type="url"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.logoUrl ?? ''}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, logoUrl: e.target.value } : prev,
                )
              }
              placeholder="https://…/logo.png"
            />
            <p className="text-xs text-gray-500">
              Transparente PNGs mit ausreichender Auflösung werden empfohlen.
            </p>
            {form.logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Vorschau:
                </span>
                <img
                  src={form.logoUrl}
                  alt="Logo-Vorschau"
                  className="max-h-12 max-w-[160px] object-contain border border-gray-200 rounded bg-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Primärfarbe (HEX)
              </label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={form.primaryColor ?? ''}
                onChange={(e) =>
                  setForm((prev) =>
                    prev
                      ? { ...prev, primaryColor: e.target.value }
                      : prev,
                  )
                }
                placeholder="#1E40AF"
              />
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Vorschau:</span>
                <span
                  className="inline-block h-5 w-10 rounded border border-gray-300"
                  style={{
                    backgroundColor:
                      form.primaryColor && form.primaryColor.trim() !== ''
                        ? form.primaryColor
                        : '#111827',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Akzentfarbe (HEX)
              </label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={form.accentColor ?? ''}
                onChange={(e) =>
                  setForm((prev) =>
                    prev
                      ? { ...prev, accentColor: e.target.value }
                      : prev,
                  )
                }
                placeholder="#F97316"
              />
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Vorschau:</span>
                <span
                  className="inline-block h-5 w-10 rounded border border-gray-300"
                  style={{
                    backgroundColor:
                      form.accentColor && form.accentColor.trim() !== ''
                        ? form.accentColor
                        : '#6B7280',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 rounded border border-gray-300 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
          >
            {saving ? 'Speichere…' : 'Einstellungen speichern'}
          </button>
        </div>
      </form>

      {/* Als Vorlage speichern */}
      {!form.isTemplate && (
        <section className="mt-6 rounded border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">Als Vorlage speichern</h2>
          <p className="text-xs text-gray-500">
            Aus diesem Event-Formular wird eine eigenständige Formular-Vorlage
            erstellt. Das ursprüngliche Formular bleibt unverändert bestehen.
          </p>

          <form
            onSubmit={handleSaveAsTemplate}
            className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]"
          >
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Name der Vorlage (optional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={`Template: ${form.name}`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Beschreibung (optional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Kurzbeschreibung für die Vorlage"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingTemplate}
                className="w-full sm:w-auto px-4 py-2 rounded border border-purple-600 text-purple-600 text-sm hover:bg-purple-50 disabled:opacity-60"
              >
                {savingTemplate
                  ? 'Erstelle Vorlage…'
                  : 'Als Vorlage speichern'}
              </button>
            </div>
          </form>

          <p className="text-[11px] text-gray-500">
            Alle aktuellen Felder und Branding-Einstellungen werden in die
            Vorlage kopiert. Du findest sie anschliessend unter{' '}
            <span className="font-semibold">„Formular-Vorlagen“</span>.
          </p>
        </section>
      )}
    </div>
  );
}
