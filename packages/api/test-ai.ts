import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { analyzeContent, generateSummary, detectCrisisSignals } from './src/ai/analyzer';
import { prisma } from './src/lib/prisma';

async function testAI() {
  console.log('=== Testing AidWatch AI Functions ===\n');

  // Test 1: Analyze content
  console.log('1. Testing analyzeContent...');
  try {
    const analysis = await analyzeContent(
      'Major 7.8 earthquake strikes southeastern Turkey near Syrian border. ' +
      'At least 2,000 dead and thousands injured. Rescue teams from 20 countries deployed. ' +
      'WHO warns of disease outbreak risk in temporary shelters. UN launches emergency appeal.'
    );
    console.log('[Test] Analysis result:', JSON.stringify(analysis, null, 2));
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
  }

  // Test 2: Detect crisis signals
  console.log('\n2. Testing detectCrisisSignals...');
  try {
    const signals = await detectCrisisSignals([
      'Flooding devastates Bangladesh coastal regions',
      'Cholera outbreak reported in refugee camps',
      'Food prices surge across East Africa',
      'Armed conflict intensifies in Sudan',
    ]);
    console.log('[Test] Signals detected:', JSON.stringify(signals, null, 2));
  } catch (error: any) {
    console.error('❌ Signal detection failed:', error.message);
  }

  // Test 3: Generate summary for a crisis
  console.log('\n3. Testing generateSummary...');
  try {
    const summary = await generateSummary(
      'Turkey-Syria Earthquake 2023',
      [
        { title: 'Earthquake hits Turkey', description: '7.8 magnitude earthquake strikes southeastern Turkey', source: 'Reuters' },
        { title: 'Death toll rises', description: 'Over 2000 confirmed dead, rescue operations ongoing', source: 'AP News' },
        { title: 'International aid arrives', description: 'UN and NGOs deploy emergency response teams', source: 'OCHA' },
      ],
      'SITUATION'
    );
    console.log('[Test] Summary generated:', summary);
  } catch (error: any) {
    console.error('❌ Summary generation failed:', error.message);
  }

  // Check existing crises in DB
  console.log('\n4. Checking database for crises...');
  const crises = await prisma.crisis.findMany({
    include: { summaries: true, _count: { select: { events: true } } },
    take: 5,
  });
  console.log(`Found ${crises.length} crises in database`);
  for (const crisis of crises) {
    console.log(`  - ${crisis.title}: ${crisis._count.events} events, ${crisis.summaries.length} summaries`);
  }

  await prisma.$disconnect();
  console.log('\n=== AI Test Complete ===');
}

testAI().catch(console.error);
