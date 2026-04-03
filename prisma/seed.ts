import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash("changeme", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      role: "admin",
    },
  });
  console.log("Admin user created: admin / changeme");

  // Create API key for lobster artist
  const apiKeyValue = `lob_${crypto.randomBytes(24).toString("hex")}`;
  const existingKey = await prisma.apiKey.findFirst({
    where: { name: "lobster-artist-dev" },
  });

  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        key: apiKeyValue,
        name: "lobster-artist-dev",
        permissions: JSON.stringify(["create", "read"]),
      },
    });
    console.log(`API Key created: ${apiKeyValue}`);
  } else {
    console.log(`API Key already exists: ${existingKey.key}`);
  }

  // Create sample mockup templates
  const templates = [
    {
      name: "短袖 T-shirt 正面（白）",
      slug: "short_sleeve_front_white",
      category: "short_sleeve",
      imagePath: "templates/short_sleeve_front_white/base.png",
      printArea: JSON.stringify({ x: 380, y: 300, width: 440, height: 500, rotation: 0 }),
      sortOrder: 1,
    },
    {
      name: "短袖 T-shirt 正面（黑）",
      slug: "short_sleeve_front_black",
      category: "short_sleeve",
      imagePath: "templates/short_sleeve_front_black/base.png",
      printArea: JSON.stringify({ x: 380, y: 300, width: 440, height: 500, rotation: 0 }),
      sortOrder: 2,
    },
    {
      name: "長袖上衣 正面",
      slug: "long_sleeve_front",
      category: "long_sleeve",
      imagePath: "templates/long_sleeve_front/base.png",
      printArea: JSON.stringify({ x: 380, y: 320, width: 440, height: 480, rotation: 0 }),
      sortOrder: 3,
    },
    {
      name: "帽T 正面",
      slug: "hoodie_front",
      category: "hoodie",
      imagePath: "templates/hoodie_front/base.png",
      printArea: JSON.stringify({ x: 360, y: 350, width: 480, height: 460, rotation: 0 }),
      sortOrder: 4,
    },
  ];

  for (const t of templates) {
    await prisma.mockupTemplate.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
  }
  console.log(`${templates.length} mockup templates created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
