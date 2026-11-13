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
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: { include: { candidate: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy tin tuyển dụng." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const job = await prisma.job.update({
    where: { id },
    data: {
      title: body.title,
      department: body.department,
      industry: body.industry,
      location: body.location,
      employmentType: body.employmentType,
      description: body.description,
      requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : undefined,
      status: body.status,
    },
  });

  return NextResponse.json({ job });
}
