import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Yemen': { lat: 15.55, lng: 48.52 },
  'Syria': { lat: 34.80, lng: 39.00 },
  'South Sudan': { lat: 6.87, lng: 31.31 },
  'Sudan': { lat: 12.86, lng: 30.22 },
  'Afghanistan': { lat: 33.93, lng: 67.71 },
  'Ukraine': { lat: 48.38, lng: 31.17 },
  'Ethiopia': { lat: 9.15, lng: 40.49 },
  'Somalia': { lat: 5.15, lng: 46.20 },
  'Haiti': { lat: 18.97, lng: -72.29 },
  'Myanmar': { lat: 21.91, lng: 95.96 },
};

async function main() {
  console.log('Updating crisis coordinates...');
  
  const crises = await prisma.crisis.findMany({
    where: { latitude: null },
  });
  
  console.log(`Found ${crises.length} crises without coordinates`);
  
  for (const crisis of crises) {
    const country = crisis.country;
    if (country && COUNTRY_COORDINATES[country]) {
      const coords = COUNTRY_COORDINATES[country];
      await prisma.crisis.update({
        where: { id: crisis.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
      console.log(`Updated ${country}: ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`No coordinates found for: ${country || 'unknown'}`);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
