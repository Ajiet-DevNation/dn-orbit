import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isApproved } = body;

    if (typeof isApproved !== "boolean") {
      return NextResponse.json({ error: "isApproved must be a boolean" }, { status: 400 });
    }

    const updated = await db.project.update({
      where: { id },
      data: { isApproved },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approve Project Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
