import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { transactionService } from "@/services/transaction.service";
import { monthFilterSchema, transactionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;
    const query = monthFilterSchema.parse({ month });

    const transactions = await transactionService.list(query.month);
    return NextResponse.json(transactions, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Filtro invalido" }, { status: 400 });
    }

    console.error("Falha ao listar transacoes", error);

    return NextResponse.json({ message: "Nao foi possivel listar transacoes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = transactionSchema.parse(await request.json());
    const transaction = await transactionService.create(payload);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }

    console.error("Falha ao criar transacao", error);

    return NextResponse.json({ message: "Nao foi possivel criar transacao" }, { status: 500 });
  }
}
