import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;
  if (result[0]?.result !== 1) {
    throw new Error("PostgreSQL returned an unexpected result.");
  }
  const [authors, books, tickets] = await Promise.all([
    prisma.author.count(),
    prisma.book.count(),
    prisma.ticket.count(),
  ]);
  console.log("Neon Postgres connection verified through Prisma: SELECT 1 returned 1.");
  console.log(`Seeded data verified: ${authors} authors, ${books} books, ${tickets} support tickets.`);
}

main()
  .catch((error: unknown) => {
    console.error("Prisma Postgres connection check failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
