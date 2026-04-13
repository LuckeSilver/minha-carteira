import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { categoryService } from "@/services/category.service";
import { categorySchema } from "@/lib/validators";

export async function GET() {
  const categories = await categoryService.list();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const payload = categorySchema.parse(await request.json());
    const category = await categoryService.create(payload.name);

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }

    return NextResponse.json({ message: "Nao foi possivel criar categoria" }, { status: 500 });
  }
}
