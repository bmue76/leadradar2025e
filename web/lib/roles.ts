// web/lib/roles.ts

// Definierte Rollen für LeadRadar
export const USER_ROLES = ["admin", "editor", "event_user"] as const;

// TypeScript-Typ für gültige Rollen
export type UserRole = (typeof USER_ROLES)[number];

// Helper: Prüfen, ob ein String eine gültige Rolle ist
export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

// Label für die Anzeige im UI
export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "editor":
      return "Editor";
    case "event_user":
      return "Event-User";
    default:
      return role;
  }
}
