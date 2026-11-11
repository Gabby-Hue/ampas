export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
};

export type SafeUser = Omit<UserRecord, "passwordHash">;

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export function sanitizeUser(user: UserRecord): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export function registerUser(
  users: UserRecord[],
  name: string,
  email: string,
  password: string
): SafeUser {
  const normalizedEmail = email.trim().toLowerCase();
  if (!name.trim()) throw new Error("Nama wajib diisi.");
  if (!normalizedEmail || !normalizedEmail.includes("@")) throw new Error("Email tidak valid.");
  if (!password || password.length < 6) throw new Error("Password minimal 6 karakter.");

  const exists = users.some((u) => u.email === normalizedEmail);
  if (exists) throw new Error("Email sudah terdaftar.");

  const newUser: UserRecord = {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: simpleHash(password),
    createdAt: Date.now(),
  };

  users.push(newUser);
  return sanitizeUser(newUser);
}

export function loginUser(
  users: UserRecord[],
  email: string,
  password: string
): SafeUser {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("Akun tidak ditemukan.");

  const targetHash = simpleHash(password);
  if (user.passwordHash !== targetHash) throw new Error("Password tidak sesuai.");

  return sanitizeUser(user);
}

export const AUTH_STORAGE_KEY = "oculicare_users";
export const SESSION_USER_KEY = "oculicare_active_user";

export function loadUsersFromStorage(): UserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveUsersToStorage(users: UserRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // quota exceeded or storage disabled
  }
}

export function getActiveUser(): SafeUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? (JSON.parse(raw) as SafeUser) : null;
  } catch {
    return null;
  }
}

export function setActiveUser(user: SafeUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_USER_KEY);
    }
  } catch {
    // ignore
  }
}
