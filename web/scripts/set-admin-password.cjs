// scripts/set-admin-password.cjs
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  const [,, email, plainPassword] = process.argv;

  if (!email || !plainPassword) {
    console.error("Usage: node scripts/set-admin-password.cjs <email> <password>");
    process.exit(1);
  }

  if (plainPassword.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
  }

  console.log(`Setting password for user: ${email}`);

  const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

  // Upsert: falls User existiert -> update, sonst -> create
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      name: "Admin",
      role: "admin",
      passwordHash,
      isActive: true,
    },
  });

  console.log("✅ Password set successfully for user:");
  console.log(`   id: ${user.id}`);
  console.log(`   email: ${user.email}`);
  console.log(`   role: ${user.role}`);
}

main()
  .catch((err) => {
    console.error("❌ Error while setting password:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
