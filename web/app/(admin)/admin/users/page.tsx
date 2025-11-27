// web/app/(admin)/admin/users/page.tsx
"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { USER_ROLES, getRoleLabel, type UserRole } from "@/lib/roles";

type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole | string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UsersListResponse = {
  users: AdminUser[] | undefined;
};

type CreateUserResponse = {
  user: AdminUser;
};

type UpdateUserResponse = {
  user: AdminUser;
};

function formatDate(value: string | null): string {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-CH");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [onlyActive, setOnlyActive] = useState<boolean>(false);

  // Create User
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("editor");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit User
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("editor");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>("");
  const [editPasswordConfirm, setEditPasswordConfirm] =
    useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Toggle Aktiv/Inaktiv
  const [isTogglingId, setIsTogglingId] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ----------------------------------------------------
  // Users laden
  // ----------------------------------------------------
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/admin/users");
        if (!res.ok) {
          throw new Error(
            `Fehler beim Laden der Benutzer (Status ${res.status})`
          );
        }

        const data: UsersListResponse = await res.json();
        const list = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
      } catch (err: any) {
        console.error("Fehler beim Laden der Benutzer:", err);
        setError(err.message ?? "Unbekannter Fehler");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];

    return list.filter((user) => {
      if (onlyActive && !user.isActive) return false;
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      return true;
    });
  }, [users, roleFilter, onlyActive]);

  // ----------------------------------------------------
  // Neuen Benutzer anlegen
  // ----------------------------------------------------
  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!createEmail.trim() || !createPassword.trim()) {
      setCreateError("E-Mail und Passwort sind erforderlich.");
      return;
    }

    if (createPassword.trim().length < 8) {
      setCreateError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }

    try {
      setIsCreating(true);

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          name: createName.trim() || null,
          role: createRole,
          isActive: createIsActive,
          password: createPassword,
        }),
      });

      if (!res.ok) {
        let msg = `Fehler beim Anlegen des Benutzers (Status ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data: CreateUserResponse = await res.json();

      setUsers((prev) => [data.user, ...prev]);

      setCreateEmail("");
      setCreateName("");
      setCreateRole("editor");
      setCreateIsActive(true);
      setCreatePassword("");

      setCreateSuccess(
        `Benutzer ${data.user.email} wurde erfolgreich angelegt.`
      );
    } catch (err: any) {
      console.error("Fehler beim Anlegen des Benutzers:", err);
      setCreateError(err.message ?? "Unbekannter Fehler beim Anlegen.");
    } finally {
      setIsCreating(false);
    }
  }

  // ----------------------------------------------------
  // Benutzer bearbeiten + Passwort-Reset
  // ----------------------------------------------------
  function startEditUser(user: AdminUser) {
    setEditingUserId(user.id);
    setEditEmail(user.email);
    setEditName(user.name ?? "");
    setEditRole(
      USER_ROLES.includes(user.role as UserRole)
        ? (user.role as UserRole)
        : "editor"
    );
    setEditIsActive(Boolean(user.isActive));
    setEditPassword("");
    setEditPasswordConfirm("");
    setUpdateError(null);
    setUpdateSuccess(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setUpdateError(null);
    setUpdateSuccess(null);
    setEditPassword("");
    setEditPasswordConfirm("");
  }

  async function handleUpdateUser(e: FormEvent) {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);

    if (editingUserId === null) {
      setUpdateError("Kein Benutzer ausgewählt.");
      return;
    }

    const newPw = editPassword.trim();
    const newPwConfirm = editPasswordConfirm.trim();

    if (newPw || newPwConfirm) {
      if (newPw !== newPwConfirm) {
        setUpdateError(
          "Die beiden Passwort-Eingaben stimmen nicht überein."
        );
        return;
      }
      if (newPw.length < 8) {
        setUpdateError(
          "Das neue Passwort muss mindestens 8 Zeichen haben."
        );
        return;
      }
    }

    try {
      setIsUpdating(true);

      const payload: {
        id: number;
        name: string;
        role: UserRole;
        isActive: boolean;
        password?: string;
      } = {
        id: editingUserId,
        name: editName,
        role: editRole,
        isActive: editIsActive,
      };

      if (newPw) {
        payload.password = newPw;
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Fehler beim Aktualisieren des Benutzers (Status ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data: UpdateUserResponse = await res.json();

      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? data.user : u))
      );

      setUpdateSuccess("Benutzer wurde erfolgreich aktualisiert.");
      setEditPassword("");
      setEditPasswordConfirm("");
    } catch (err: any) {
      console.error("Fehler beim Aktualisieren des Benutzers:", err);
      setUpdateError(err.message ?? "Unbekannter Fehler beim Aktualisieren.");
    } finally {
      setIsUpdating(false);
    }
  }

  // ----------------------------------------------------
  // Aktiv/Inaktiv-Toggle
  // ----------------------------------------------------
  async function handleToggleActive(user: AdminUser) {
    setToggleError(null);
    setIsTogglingId(user.id);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });

      if (!res.ok) {
        let msg = `Fehler beim Ändern des Status (Status ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data: UpdateUserResponse = await res.json();

      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? data.user : u))
      );
    } catch (err: any) {
      console.error("Fehler beim Ändern des Aktiv-Status:", err);
      setToggleError(
        err.message ?? "Unbekannter Fehler beim Ändern des Aktiv-Status."
      );
    } finally {
      setIsTogglingId(null);
    }
  }

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Benutzerverwaltung
          </h1>
          <p className="text-sm text-gray-600">
            Übersicht aller Benutzer mit Rolle, Aktiv-Status und letzten Logins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          {showCreateForm ? "Formular schliessen" : "Neuen Benutzer anlegen"}
        </button>
      </header>

      {/* Create */}
      {showCreateForm && (
        <section className="rounded border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Neuen Benutzer anlegen
          </h2>

          {createError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {createSuccess}
            </div>
          )}

          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={handleCreateUser}
          >
            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">E-Mail *</label>
              <input
                type="email"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Name</label>
              <input
                type="text"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Rolle</label>
              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={createRole}
                onChange={(e) =>
                  setCreateRole(e.target.value as UserRole)
                }
              >
                {USER_ROLES.map((role: UserRole) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Status</label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={createIsActive}
                  onChange={(e) =>
                    setCreateIsActive(e.target.checked)
                  }
                />
                Benutzer ist aktiv
              </label>
            </div>

            <div className="flex flex-col text-sm md:col-span-2">
              <label className="mb-1 font-medium">
                Initiales Passwort *
              </label>
              <input
                type="password"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={createPassword}
                onChange={(e) =>
                  setCreatePassword(e.target.value)
                }
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Mindestens 8 Zeichen. Du kannst das Passwort dem Benutzer
                separat mitteilen.
              </p>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError(null);
                  setCreateSuccess(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isCreating
                  ? "Wird angelegt …"
                  : "Benutzer anlegen"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Edit */}
      {editingUserId !== null && (
        <section className="rounded border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-900">
              Benutzer bearbeiten
            </h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-blue-900 underline"
            >
              Bearbeitung abbrechen
            </button>
          </div>

          {updateError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {updateError}
            </div>
          )}

          {updateSuccess && (
            <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {updateSuccess}
            </div>
          )}

          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={handleUpdateUser}
          >
            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">E-Mail</label>
              <input
                type="email"
                className="rounded border border-gray-300 px-2 py-1 text-sm bg-gray-100 cursor-not-allowed"
                value={editEmail}
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">
                Die E-Mail-Adresse kann aktuell nicht bearbeitet werden.
              </p>
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Name</label>
              <input
                type="text"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Rolle</label>
              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editRole}
                onChange={(e) =>
                  setEditRole(e.target.value as UserRole)
                }
              >
                {USER_ROLES.map((role: UserRole) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">Status</label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={editIsActive}
                  onChange={(e) =>
                    setEditIsActive(e.target.checked)
                  }
                />
                Benutzer ist aktiv
              </label>
            </div>

            {/* Passwort-Reset */}
            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">
                Neues Passwort (optional)
              </label>
              <input
                type="password"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editPassword}
                onChange={(e) =>
                  setEditPassword(e.target.value)
                }
              />
              <p className="mt-1 text-xs text-gray-600">
                Nur ausfüllen, wenn du das Passwort zurücksetzen möchtest.
              </p>
            </div>

            <div className="flex flex-col text-sm">
              <label className="mb-1 font-medium">
                Neues Passwort (Bestätigung)
              </label>
              <input
                type="password"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editPasswordConfirm}
                onChange={(e) =>
                  setEditPasswordConfirm(e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isUpdating
                  ? "Wird gespeichert …"
                  : "Änderungen speichern"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Toggle-Fehler */}
      {toggleError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toggleError}
        </div>
      )}

      {/* Filter */}
      <section className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col text-sm">
          <label htmlFor="roleFilter" className="mb-1 font-medium">
            Rolle filtern
          </label>
          <select
            id="roleFilter"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(
                e.target.value === "all"
                  ? "all"
                  : (e.target.value as UserRole)
              )
            }
          >
            <option value="all">Alle Rollen</option>
            {USER_ROLES.map((role: UserRole) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          Nur aktive Benutzer anzeigen
        </label>
      </section>

      {/* Statusanzeigen */}
      {isLoading && (
        <div className="text-sm text-gray-600">
          Benutzer werden geladen …
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Fehler beim Laden der Benutzer: {error}
        </div>
      )}

      {/* Tabelle */}
      {!isLoading && !error && (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-700">
                  E-Mail
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Name
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Rolle
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Aktiv
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Letzter Login
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Angelegt am
                </th>
                <th className="px-3 py-2 font-medium text-gray-700">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isToggling = isTogglingId === user.id;
                  const toggleLabel = user.isActive
                    ? "Deaktivieren"
                    : "Reaktivieren";

                  return (
                    <tr
                      key={user.id}
                      className="border-t last:border-b hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2">
                        {user.name ?? (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {USER_ROLES.includes(user.role as UserRole)
                          ? getRoleLabel(user.role as UserRole)
                          : user.role}
                      </td>
                      <td className="px-3 py-2">
                        {user.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-3 py-2">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          type="button"
                          onClick={() => startEditUser(user)}
                          className="text-xs font-medium text-blue-700 underline"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleActive(user)}
                          className="text-xs font-medium text-gray-700 underline disabled:opacity-60"
                        >
                          {isToggling ? "…" : toggleLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
