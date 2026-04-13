import { NextResponse } from "next/server";

import { categoryService } from "@/services/category.service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await categoryService.delete(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      {
        message:
          "Nao foi possivel excluir categoria. Verifique se nao existem transacoes vinculadas.",
      },
      { status: 400 },
    );
  }
}
