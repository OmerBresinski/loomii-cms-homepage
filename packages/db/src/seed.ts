import { prisma } from "./client";

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data in development
  if (process.env.NODE_ENV === "development") {
    await prisma.session.deleteMany();
    await prisma.edit.deleteMany();
    await prisma.pullRequest.deleteMany();
    await prisma.element.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.analysisJob.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create a demo user
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@example.com",
      name: "Demo User",
      githubId: "demo-github-id",
      githubAccessToken: "demo-token",
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create a demo project
  const demoProject = await prisma.project.create({
    data: {
      userId: demoUser.id,
      name: "Demo Website",
      githubRepo: "demo/website",
      githubBranch: "main",
      deploymentUrl: "https://demo-website.vercel.app",
      status: "ready",
    },
  });

  console.log(`✅ Created demo project: ${demoProject.name}`);

  // Create some demo elements
  const demoElements = await prisma.element.createMany({
    data: [
      {
        projectId: demoProject.id,
        name: "Hero Title",
        type: "heading",
        selector: "h1.hero-title",
        currentValue: "Welcome to our website",
        pageUrl: "/",
        confidence: 0.95,
      },
      {
        projectId: demoProject.id,
        name: "Hero Description",
        type: "paragraph",
        selector: "p.hero-description",
        currentValue: "We build amazing things for the web.",
        pageUrl: "/",
        confidence: 0.88,
      },
      {
        projectId: demoProject.id,
        name: "CTA Button",
        type: "button",
        selector: "button.cta-primary",
        currentValue: "Get Started",
        pageUrl: "/",
        confidence: 0.92,
      },
      {
        projectId: demoProject.id,
        name: "About Section Title",
        type: "heading",
        selector: "h2.about-title",
        currentValue: "About Us",
        pageUrl: "/about",
        confidence: 0.90,
      },
    ],
  });

  console.log(`✅ Created ${demoElements.count} demo elements`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

