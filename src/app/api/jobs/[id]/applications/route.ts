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
  if (!body.candidateId) {
    return NextResponse.json({ error: "Thiếu candidateId." }, { status: 400 });
  }

  try {
    const application = await prisma.application.create({
      data: {
        jobId: id,
        candidateId: body.candidateId,
        stage: body.stage || "SOURCED",
      },
      include: { candidate: true },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Ứng viên đã có trong pipeline của tin tuyển dụng này." },
      { status: 409 }
    );
  }
}
