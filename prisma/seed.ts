import "dotenv/config";
import { prisma } from "../src/lib/db";

const systemVoices = [
  { name: "Adam" },
  { name: "Emily" },
  { name: "Rachel" },
  { name: "Dom" },
  { name: "Bella" },
  { name: "Antoni" },
  { name: "Sarah" },
  { name: "Michael" },
  { name: "Nicole" },
  { name: "George" },
  { name: "Freya" },
  { name: "Marcus" },
  { name: "Sophie" },
  { name: "Daniel" },
  { name: "Clara" },
  { name: "James" },
  { name: "Arthur" },
  { name: "Lily" },
  { name: "Liam" },
  { name: "Grace" },
];

async function main() {
  console.log("🚀 Starting database seeding...");
  
  for (const voice of systemVoices) {
    const id = `system-${voice.name.toLowerCase()}`;
    await prisma.voice.upsert({
      where: { id },
      update: {
        name: voice.name,
        isSystem: true,
        r2Key: null,
      },
      create: {
        id,
        name: voice.name,
        isSystem: true,
        r2Key: null,
      },
    });
  }

  console.log(`✅ Seeded ${systemVoices.length} system voices successfully.`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
