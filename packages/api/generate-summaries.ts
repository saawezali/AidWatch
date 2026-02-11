import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { prisma } from './src/lib/prisma';
import { generateCrisisSummary } from './src/services/aiService';
import { SummaryType } from '@prisma/client';

async function generateSummariesForExistingCrises() {
  console.log('=== Generating AI Summaries for Existing Crises ===\n');

  const crises = await prisma.crisis.findMany({
    include: { events: true, summaries: true },
  });

  console.log(`Found ${crises.length} crises\n`);

  for (const crisis of crises) {
    console.log(`\n📍 Processing: ${crisis.title}`);
    console.log(`   Events: ${crisis.events.length}, Existing summaries: ${crisis.summaries.length}`);

    // Skip if already has summaries
    if (crisis.summaries.length > 0) {
      console.log('   ⏭️  Skipping (already has summaries)');
      continue;
    }

    // Generate a SITUATION summary
    try {
      console.log('   🤖 Generating SITUATION summary...');
      const summary = await generateCrisisSummary(crisis.id, SummaryType.SITUATION);
      console.log('   [Done] Summary generated!');
      console.log(`   Preview: ${summary.content.substring(0, 200)}...`);
    } catch (error: unknown) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Summary Generation Complete ===');
  await prisma.$disconnect();
}

generateSummariesForExistingCrises().catch(console.error);
