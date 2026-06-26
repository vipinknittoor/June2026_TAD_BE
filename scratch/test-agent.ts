import dotenv from 'dotenv';
dotenv.config();

import { executeAgentQuery } from '../src/modules/agent/agent.service';
import { prisma } from '../src/config/db';

async function runTests() {
  console.log('=== Connecting to Database ===');
  await prisma.$connect();
  console.log('Database connected successfully.\n');

  try {
    // Test 1: Standard Valid query
    console.log('=== Test 1: Standard Query ===');
    const prompt1 = 'Find all tasks that are active and have HIGH priority';
    console.log(`Prompt: "${prompt1}"`);
    
    const start1 = Date.now();
    const result1 = await executeAgentQuery(prompt1);
    const duration1 = Date.now() - start1;

    console.log(`Duration: ${duration1}ms`);
    console.log(`Retry Count: ${result1.retryCount}`);
    console.log(`Error: ${result1.error}`);
    console.log(`Generated Query:`, JSON.stringify(result1.querySpec, null, 2));
    console.log(`Results Count: ${result1.queryResults?.length || 0}`);
    console.log(`PDF URL: ${result1.pdfUrl}\n`);

    // Test 2: Self-healing query (uses non-existent field "deadline" instead of "endDate")
    console.log('=== Test 2: Self-Healing Query (Errors & Correction) ===');
    const prompt2 = 'Get all tasks whose deadline is before tomorrow';
    console.log(`Prompt: "${prompt2}"`);

    const start2 = Date.now();
    const result2 = await executeAgentQuery(prompt2);
    const duration2 = Date.now() - start2;

    console.log(`Duration: ${duration2}ms`);
    console.log(`Retry Count: ${result2.retryCount}`);
    console.log(`Error: ${result2.error}`);
    console.log(`Final Query Healed Spec:`, JSON.stringify(result2.querySpec, null, 2));
    console.log(`Results Count: ${result2.queryResults?.length || 0}`);
    console.log(`PDF URL: ${result2.pdfUrl}\n`);

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database disconnected.');
  }
}

runTests().catch(console.error);
