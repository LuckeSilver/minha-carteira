import { PrismaClient } from "@prisma/client";

const localUrl =
  process.env.LOCAL_DATABASE_URL ??
  "mysql://root:root@127.0.0.1:3307/minha_carteira";
const remoteUrl = process.env.DATABASE_URL;

if (!remoteUrl) {
  throw new Error("DATABASE_URL não definida para o banco remoto.");
}

const local = new PrismaClient({
  datasources: { db: { url: localUrl } },
});

const remote = new PrismaClient({
  datasources: { db: { url: remoteUrl } },
});

async function main() {
  const [localCategories, localTransactions] = await Promise.all([
    local.category.findMany(),
    local.transaction.findMany(),
  ]);

  await remote.transaction.deleteMany();
  await remote.category.deleteMany();

  if (localCategories.length > 0) {
    await remote.category.createMany({
      data: localCategories,
      skipDuplicates: true,
    });
  }

  if (localTransactions.length > 0) {
    await remote.transaction.createMany({
      data: localTransactions,
      skipDuplicates: true,
    });
  }

  const [remoteCategoryCount, remoteTransactionCount] = await Promise.all([
    remote.category.count(),
    remote.transaction.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        local: {
          categories: localCategories.length,
          transactions: localTransactions.length,
        },
        remote: {
          categories: remoteCategoryCount,
          transactions: remoteTransactionCount,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Erro ao sincronizar dados:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([local.$disconnect(), remote.$disconnect()]);
  });
