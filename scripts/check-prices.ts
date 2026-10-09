import "dotenv/config";
import { checkAllEnabled } from "../src/lib/check";
import { prisma } from "../src/lib/prisma";

async function main() {
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
