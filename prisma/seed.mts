import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.tag.createMany({
    data: [
      {
        id: '0c077abd-eca2-4cbb-818c-6cefbf2d169a',
        name: 'DRAFT'
      },
      {
        id: '4452656d-9fa4-4bd0-ba38-70492e31d180',
        name: 'EMERGENCY_FUND'
      },
      {
        id: 'f2e868af-8333-459f-b161-cbc6544c24bd',
        name: 'EXCLUDE_FROM_ANALYSIS'
      }
    ],
    skipDuplicates: true
  });

  // Hungarian retail government securities, shared by all users. They are
  // bought and redeemed at par from the treasury, so the price is fixed at 1:
  // the quantity is the nominal value and interest is booked as INTEREST.
  // Rates change with every series, so they live on allampapir.hu, not here.
  // Short names first: the manual search matches on the start of the name.
  // DKJ and MÁK are left out: they trade at market prices.
  await prisma.symbolProfile.createMany({
    data: [
      ['GF_MAPPLUSZ', 'MÁP+ (Magyar Állampapír Plusz)', 'HUF'],
      ['GF_FIXMAP', 'FixMÁP (Fix Magyar Állampapír)', 'HUF'],
      ['GF_BMAP', 'BMÁP (Bónusz Magyar Állampapír)', 'HUF'],
      ['GF_PMAP', 'PMÁP (Prémium Magyar Állampapír)', 'HUF'],
      ['GF_EMAP', 'EMÁP (Euró Magyar Állampapír)', 'EUR'],
      ['GF_BABAKOTVENY', 'Babakötvény', 'HUF'],
      ['GF_KTJ', 'KTJ (Kincstári Takarékjegy)', 'HUF']
    ].map(([symbol, name, currency]) => {
      return {
        currency,
        name,
        symbol,
        assetClass: 'FIXED_INCOME',
        assetSubClass: 'BOND',
        countries: [{ code: 'HU', weight: 1 }],
        dataSource: 'MANUAL',
        scraperConfiguration: { defaultMarketPrice: 1 },
        url: 'https://www.allampapir.hu'
      };
    }),
    skipDuplicates: true
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
