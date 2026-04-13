import { NextResponse } from "next/server";

import { transactionService } from "@/services/transaction.service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await transactionService.delete(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Nao foi possivel excluir transacao" }, { status: 400 });
  }
}
