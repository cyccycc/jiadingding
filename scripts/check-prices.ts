import "dotenv/config";
import { checkAllEnabled } from "../src/lib/check";
import { prisma } from "../src/lib/prisma";

const summary = await checkAllEnabled();
console.log(
  JSON.stringify(
    {
      checked: summary.checked,
      notified: summary.notified,
      failed: summary.failed,
      results: summary.results,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
