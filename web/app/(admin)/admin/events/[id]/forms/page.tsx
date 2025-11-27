'use client';

import React, { use, useEffect, useState } from 'react';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type EventItem = {
  id: number;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
};

type FormItem = {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  status: FormStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type PageProps = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

const STATUS_OPTIONS: { value: FormStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Entwurf' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'ARCHIVED', label: 'Archiviert' },
];

export default function EventFormsPage({ params }: PageProps) {
  // 🔁 params-Promise mit React.use() auflösen
  const resolvedParams = use(params);
  const eventId = Number.parseInt(resolvedParams.id, 10);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create/Edit-Form-States
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FormStatus>('DRAFT');
  const [isDefault, setIsDefault] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔄 Event + Forms laden
  useEffect(() => {
    if (!Number.isFinite(eventId) || eventId <= 0) {
      setLoadError('Ungültige Event-ID');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Event laden
        const eventRes = await fetch(`/api/admin/events/${eventId}`);
        if (!eventRes.ok) {
          throw new Error(`Event konnte nicht geladen werden (Status ${eventRes.status})`);
        }
        const eventData = await eventRes.json();
        if (!cancelled) {
          setEvent(eventData);
        }

        // Formulare laden
        const formsRes = await fetch(`/api/admin/events/${eventId}/forms`);
        if (!formsRes.ok) {
          throw new Error(`Formulare konnten nicht geladen werden (Status ${formsRes.status})`);
        }
        const formsData = await formsRes.json();
        if (!cancelled) {
          const list: FormItem[] = Array.isArray(formsData)
            ? formsData
            : Array.isArray(formsData.forms)
            ? formsData.forms
            : [];
          setForms(list);
        }
      } catch (err: any) {
        console.error('Error loading event/forms', err);
        if (!cancelled) {
          setLoadError(err?.message ?? 'Unbekannter Fehler beim Laden');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Formular-State auf "neu" zurücksetzen
  function resetForm() {
    setEditingFormId(null);
    setName('');
    setDescription('');
    setStatus('DRAFT');
    setIsDefault(false);
    setSubmitError(null);
  }

  // Bearbeiten eines bestehenden Formulars starten
  function handleEditClick(form: FormItem) {
    setEditingFormId(form.id);
    setName(form.name);
    setDescription(form.description ?? '');
    setStatus(form.status);
    setIsDefault(form.isDefault);
    setSubmitError(null);
  }

  // Neues Formular anlegen / vorhandenes updaten
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      setSubmitError('Ungültige Event-ID');
      return;
    }

    if (!name.trim()) {
      setSubmitError('Name ist ein Pflichtfeld.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingFormId == null) {
        // CREATE
        const res = await fetch(`/api/admin/events/${eventId}/forms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            status,
            isDefault,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error ?? `Formular konnte nicht angelegt werden (Status ${res.status})`;
          setSubmitError(msg);
          return;
        }

        setForms((prev) => [...prev, data as FormItem]);
        resetForm();
      } else {
        // UPDATE
        const res = await fetch(`/api/admin/forms/${editingFormId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            status,
            isDefault,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error ?? `Formular konnte nicht aktualisiert werden (Status ${res.status})`;
          setSubmitError(msg);
          return;
        }

        setForms((prev) =>
          prev.map((f) => (f.id === editingFormId ? { ...f, ...(data as Partial<FormItem>) } : f)),
        );
        resetForm();
      }
    } catch (err: any) {
      console.error('Error submitting form', err);
      setSubmitError(err?.message ?? 'Unbekannter Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(formId: number) {
    const ok = window.confirm(
      'Dieses Formular wirklich löschen? Bereits erfasste Leads, die auf dieses Formular verweisen, könnten davon betroffen sein.',
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error ?? `Formular konnte nicht gelöscht werden (Status ${res.status})`;
        alert(msg);
        return;
      }

      setForms((prev) => prev.filter((f) => f.id !== formId));
      if (editingFormId === formId) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Error deleting form', err);
      alert(err?.message ?? 'Unbekannter Fehler beim Löschen');
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Formulare
          </h1>
          <p style={{ color: '#555' }}>
            Event-ID:{' '}
            {Number.isFinite(eventId) && eventId > 0 ? (
              <strong>{eventId}</strong>
            ) : (
              <span style={{ color: '#d32f2f' }}>Ungültig</span>
            )}
            {event && (
              <>
                {' · '}
                <strong>{event.name}</strong>
              </>
            )}
          </p>
        </div>

        <nav style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
          <a href="/admin/events" style={{ marginRight: '1rem', color: '#1976d2' }}>
            Zurück zu Events
          </a>
          <a href="/admin" style={{ color: '#1976d2' }}>
            Admin-Übersicht
          </a>
        </nav>
      </header>

      {isLoading && <p>Lade Daten …</p>}

      {loadError && (
        <div
          style={{
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            padding: '0.75rem 1rem',
            borderRadius: 6,
            marginBottom: '1.5rem',
          }}
        >
          {loadError}
        </div>
      )}

      {/* Create / Edit Card */}
      <section
        style={{
          borderRadius: 12,
          border: '1px solid #ddd',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {editingFormId ? 'Formular bearbeiten' : 'Neues Formular anlegen'}
        </h2>

        {(!Number.isFinite(eventId) || eventId <= 0) && (
          <div
            style={{
              background: '#ffebee',
              border: '1px solid #ffcdd2',
              color: '#c62828',
              padding: '0.6rem 0.9rem',
              borderRadius: 6,
              marginBottom: '0.75rem',
            }}
          >
            Ungültige Event-ID
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FormStatus)}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '0.9rem',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: '1 / 3' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / 3', marginTop: '0.25rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Als Standardformular für diesen Event markieren
            </label>
          </div>

          <div style={{ gridColumn: '1 / 3', marginTop: '0.5rem' }}>
            {submitError && (
              <p style={{ color: '#c62828', marginBottom: '0.4rem' }}>{submitError}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !Number.isFinite(eventId) || eventId <= 0}
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '0.5rem 1.3rem',
                cursor: isSubmitting ? 'default' : 'pointer',
                fontSize: '0.9rem',
                marginRight: '0.5rem',
              }}
            >
              {isSubmitting
                ? editingFormId
                  ? 'Speichere …'
                  : 'Lege an …'
                : editingFormId
                ? 'Änderungen speichern'
                : 'Formular anlegen'}
            </button>

            {editingFormId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: 'transparent',
                  color: '#555',
                  border: '1px solid #bbb',
                  borderRadius: 4,
                  padding: '0.45rem 1.1rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Formular-Liste */}
      <section>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Formulare für diesen Event
        </h2>

        {forms.length === 0 ? (
          <p style={{ color: '#555' }}>Es sind noch keine Formulare für diesen Event angelegt.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  #
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  Name
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  Standard
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  Beschreibung
                </th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: '0.4rem' }}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {forms
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((form, index) => (
                  <tr key={form.id}>
                    <td
                      style={{
                        borderBottom: '1px solid #eee',
                        padding: '0.4rem',
                        color: '#666',
                      }}
                    >
                      {index + 1}
                    </td>
                    <td style={{ borderBottom: '1px solid #eee', padding: '0.4rem' }}>
                      <strong>{form.name}</strong>
                    </td>
                    <td style={{ borderBottom: '1px solid #eee', padding: '0.4rem' }}>
                      {form.status}
                    </td>
                    <td style={{ borderBottom: '1px solid #eee', padding: '0.4rem' }}>
                      {form.isDefault ? 'Ja' : 'Nein'}
                    </td>
                    <td
                      style={{
                        borderBottom: '1px solid #eee',
                        padding: '0.4rem',
                        maxWidth: 260,
                      }}
                    >
                      {form.description}
                    </td>
                    <td
                      style={{
                        borderBottom: '1px solid #eee',
                        padding: '0.4rem',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <a
                        href={`/admin/events/${eventId}/forms/${form.id}/fields`}
                        style={{
                          marginRight: '0.5rem',
                          fontSize: '0.8rem',
                          color: '#1976d2',
                        }}
                      >
                        Felder bearbeiten
                      </a>
                      <button
                        type="button"
                        onClick={() => handleEditClick(form)}
                        style={{
                          marginRight: '0.4rem',
                          background: '#fff',
                          color: '#333',
                          border: '1px solid #bbb',
                          borderRadius: 4,
                          padding: '0.25rem 0.6rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(form.id)}
                        style={{
                          background: '#e53935',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '0.25rem 0.6rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
