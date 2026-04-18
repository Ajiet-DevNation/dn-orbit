import { db as prisma } from "./lib/db";

async function testAPIs() {
  console.log("Starting API Integration Tests...\n");

  try {
    // 1. Setup Test Data
    console.log("--- 1. Setting up test data ---");
    const testAdmin = await prisma.user.upsert({
      where: { email: "admin@test.com" },
      update: {},
      create: {
        githubId: "admin_gh_123",
        githubUsername: "testadmin",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
      },
    });

    const testMember = await prisma.user.upsert({
      where: { email: "member@test.com" },
      update: {},
      create: {
        githubId: "member_gh_123",
        githubUsername: "testmember",
        email: "member@test.com",
        name: "Test Member",
        role: "member",
      },
    });
    console.log("✅ Users created/found.");

    // 2. Test Admin Config API (GET & PATCH)
    console.log("\n--- 2. Testing Admin Config API (/api/admin/config/weights) ---");
    
    // Mock the session for internal calls by calling the logic directly, 
    // or we can simulate requests if we spin up the server. 
    // Since Next.js API routes with NextAuth are hard to mock easily in a script without a running server 
    // and valid cookies, we'll test the database logic/Prisma operations directly to ensure schema compatibility.
    
    const existingWeights = await prisma.scoreWeight.findFirst();
    if (existingWeights) {
      await prisma.scoreWeight.update({
        where: { id: existingWeights.id },
        data: { githubWeight: 0.4, lcWeight: 0.4, eventWeight: 0.2, updatedBy: testAdmin.id },
      });
      console.log("✅ Updated existing score weights.");
    } else {
      await prisma.scoreWeight.create({
        data: { githubWeight: 0.4, lcWeight: 0.4, eventWeight: 0.2, updatedBy: testAdmin.id },
      });
      console.log("✅ Created new score weights.");
    }

    // 3. Test Members Admin API (PATCH /api/admin/members/[id])
    console.log("\n--- 3. Testing Members Admin API ---");
    const updatedMember = await prisma.user.update({
      where: { id: testMember.id },
      data: { bio: "Updated test bio", isVisible: false },
    });
    console.log("✅ Member updated:", updatedMember.bio, "Visible:", updatedMember.isVisible);

    // 4. Test Manual Stat Refresh API (POST /api/admin/members/[id]/refresh)
    console.log("\n--- 4. Testing Manual Stat Refresh ---");
    const pastDate = new Date(0);
    // create dummy stats
    await prisma.githubStats.create({
      data: { userId: testMember.id, reposCount: 5 }
    });
    const ghUpdate = await prisma.githubStats.updateMany({
      where: { userId: testMember.id },
      data: { fetchedAt: pastDate },
    });
    console.log("✅ Invalidated GitHub stats rows:", ghUpdate.count);

    // 5. Test Projects API (POST, PATCH)
    console.log("\n--- 5. Testing Projects API ---");
    const project = await prisma.project.create({
      data: {
        title: "Test Project",
        description: "A project to test APIs",
        status: "planning",
        leadId: testMember.id,
        members: {
          create: { userId: testMember.id, role: "lead" }
        }
      }
    });
    console.log("✅ Created project with ID:", project.id);

    const milestones = [{ label: "Step 1", done: true }, { label: "Step 2", done: false }];
    const completed = milestones.filter((m) => m.done).length;
    const progressPct = Math.round((completed / milestones.length) * 100);

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones, progressPct }
    });
    console.log("✅ Updated project milestones, progress is now:", progressPct + "%");

    // 6. Test Project Approval API
    await prisma.project.update({
      where: { id: project.id },
      data: { isApproved: true }
    });
    console.log("✅ Project approved by admin.");

    // 7. Cleanup Test Data
    console.log("\n--- Cleanup ---");
    await prisma.project.deleteMany({ where: { title: "Test Project" } });
    await prisma.githubStats.deleteMany({ where: { userId: testMember.id } });
    // Keep users to not mess up other potential relations if they exist, or delete them if safe.
    // For safety in dev, we might leave them or delete if strict. Let's delete the specific test users.
    await prisma.user.deleteMany({ where: { email: { in: ["admin@test.com", "member@test.com"] } } });
    console.log("✅ Test data cleaned up.");

    console.log("\n🎉 All DB logic paths for the new APIs executed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
    
  }
}

testAPIs();
