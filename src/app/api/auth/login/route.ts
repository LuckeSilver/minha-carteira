import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateUser,
  AUTH_COOKIE_NAME,
  createSessionToken,
  getAuthCookieOptions,
  isAuthConfigured,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Senha obrigatoria"),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { message: "Autenticacao nao configurada no servidor" },
      { status: 500 },
    );
  }

  try {
    const payload = loginSchema.parse(await request.json());
    const user = authenticateUser(payload.email, payload.password);

    if (!user) {
      return NextResponse.json({ message: "Credenciais invalidas" }, { status: 401 });
    }

    const token = await createSessionToken(user);

    const response = NextResponse.json({ user });
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch {
    return NextResponse.json({ message: "Nao foi possivel realizar login" }, { status: 400 });
  }
}
