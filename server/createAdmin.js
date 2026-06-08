const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = "Careen04";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log("---------------------------------------");
  console.log("Generating Admin Account...");
  
  try {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@highland.com' },
      update: {},
      create: {
        fullName: "System Admin",
        email: "admin@highland.com",
        password: hashedPassword,
        role: "admin",
        status: "active"
      },
    });

    console.log("✅ Admin Created Successfully!");
    console.log("Email: admin@highland.com");
    console.log("Password: Careen04");
    console.log("Hashed Password in DB:", admin.password);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
  console.log("---------------------------------------");
}

main();