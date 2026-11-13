import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      applications: { include: { job: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên." }, { status: 404 });
  }

  return NextResponse.json({ candidate });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      location: body.location,
      industry: body.industry,
      yearsOfExperience:
        body.yearsOfExperience === undefined ? undefined : Number(body.yearsOfExperience),
      skills: Array.isArray(body.skills) ? body.skills : undefined,
      summary: body.summary,
    },
  });

  return NextResponse.json({ candidate });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  await prisma.candidate.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
