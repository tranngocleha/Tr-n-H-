import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  if (!body.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Nội dung ghi chú không được để trống." }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      candidateId: id,
      authorId: user.id,
      body: body.body,
    },
    include: { author: true },
  });

  return NextResponse.json({ note }, { status: 201 });
}
