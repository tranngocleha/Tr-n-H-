import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const industry = searchParams.get("industry")?.trim();
  const skill = searchParams.get("skill")?.trim();
  const minExperience = searchParams.get("minExperience");

  const where: Prisma.CandidateWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { skills: { has: q } },
    ];
  }

  if (industry) {
    where.industry = { equals: industry, mode: "insensitive" };
  }

  if (skill) {
    where.skills = { has: skill };
  }

  if (minExperience) {
    where.yearsOfExperience = { gte: Number(minExperience) };
  }

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const industries = await prisma.candidate.findMany({
    where: { industry: { not: null } },
    select: { industry: true },
    distinct: ["industry"],
  });

  return NextResponse.json({
    candidates,
    industries: industries.map((i) => i.industry).filter(Boolean),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json();

  if (!body.fullName || typeof body.fullName !== "string") {
    return NextResponse.json({ error: "Vui lòng nhập họ tên ứng viên." }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      fullName: body.fullName,
      email: body.email || undefined,
      phone: body.phone || undefined,
      location: body.location || undefined,
      industry: body.industry || undefined,
      yearsOfExperience: body.yearsOfExperience ? Number(body.yearsOfExperience) : undefined,
      skills: Array.isArray(body.skills) ? body.skills : [],
      summary: body.summary || undefined,
      sourceType: "MANUAL",
      createdById: user.id,
    },
  });

  return NextResponse.json({ candidate }, { status: 201 });
}
