import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json();
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Vui lòng nhập tiêu đề và mô tả công việc." }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title: body.title,
      department: body.department || undefined,
      industry: body.industry || undefined,
      location: body.location || undefined,
      employmentType: body.employmentType || undefined,
      description: body.description,
      requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : [],
      status: body.status || "OPEN",
      createdById: user.id,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
