import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { categoryService } from "@/services/category.service";
import { categorySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = categorySchema.parse(await request.json());
    const category = await categoryService.update(id, payload);

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Dados invalidos" },
        { status: 400 },
      );
    }

    console.error("Falha ao atualizar categoria", error);

    return NextResponse.json(
      { message: "Nao foi possivel atualizar categoria" },
      { status: 500 },
    );
  }
}

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
