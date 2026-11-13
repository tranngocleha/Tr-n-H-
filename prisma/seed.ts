import { PrismaClient, PipelineStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@company.vn";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Quản trị viên";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: "ADMIN",
    },
  });

  console.log(`Seed admin account ready: ${admin.email}`);

  const existingJobs = await prisma.job.count();
  if (existingJobs === 0) {
    const job = await prisma.job.create({
      data: {
        title: "Nhân viên Kinh doanh B2B",
        department: "Kinh doanh",
        industry: "Bán hàng",
        location: "TP. Hồ Chí Minh",
        employmentType: "Toàn thời gian",
        description:
          "Tìm kiếm và phát triển khách hàng doanh nghiệp, tư vấn giải pháp, chốt hợp đồng. Yêu cầu kinh nghiệm sales B2B, kỹ năng đàm phán tốt.",
        requiredSkills: ["Sales B2B", "Đàm phán", "CRM", "Chăm sóc khách hàng"],
        status: "OPEN",
        createdById: admin.id,
      },
    });

    const candidate = await prisma.candidate.create({
      data: {
        fullName: "Nguyễn Văn A",
        email: "nguyenvana.demo@example.com",
        phone: "0900000000",
        location: "TP. Hồ Chí Minh",
        industry: "Bán hàng",
        yearsOfExperience: 3,
        skills: ["Sales B2B", "Đàm phán", "CRM"],
        summary:
          "3 năm kinh nghiệm sales B2B ngành phần mềm doanh nghiệp, thành tích vượt KPI liên tục 6 quý.",
        sourceType: "MANUAL",
        createdById: admin.id,
      },
    });

    await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        stage: PipelineStage.SCREENING,
      },
    });

    console.log("Seed demo job + candidate created.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
