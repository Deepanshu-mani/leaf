import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI schema operations must use Neon's direct, unpooled URL.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
