import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export const AUTH_COOKIE_NAME = "minha_carteira_session";
const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type AllowedUser = {
  email: string;
  password: string;
  name: string;
};

type SessionUser = {
  email: string;
  name: string;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET não configurado");
  }

  return new TextEncoder().encode(secret);
}

function parseAllowedUsers(): AllowedUser[] {
  const raw = process.env.AUTH_ALLOWED_USERS;

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is AllowedUser => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const candidate = item as Record<string, unknown>;

        return (
          typeof candidate.email === "string" &&
          typeof candidate.password === "string" &&
          typeof candidate.name === "string"
        );
      })
      .map((item) => ({
        email: item.email.trim().toLowerCase(),
        password: item.password,
        name: item.name,
      }));
  } catch {
    return [];
  }
}

export function isAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET) && parseAllowedUsers().length > 0;
}

export function authenticateUser(email: string, password: string): SessionUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const users = parseAllowedUsers();
  const user = users.find((item) => item.email === normalizedEmail && item.password === password);

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    name: user.name,
  };
}

export async function createSessionToken(user: SessionUser) {
  const secret = getSecretKey();

  return new SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${AUTH_SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

function extractSessionUser(payload: JWTPayload): SessionUser | null {
  const email = payload.email;
  const name = payload.name;

  if (typeof email !== "string" || typeof name !== "string") {
    return null;
  }

  return {
    email,
    name,
  };
}

export async function verifySessionToken(token: string) {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return extractSessionUser(payload);
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  };
}
