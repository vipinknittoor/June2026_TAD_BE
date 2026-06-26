import dotenv from 'dotenv';
dotenv.config();

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

async function testChat() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return;
  }

  console.log('Initializing ChatGoogleGenerativeAI...');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.5-flash',
    apiKey: apiKey,
    temperature: 0.1,
  });

  console.log('Sending test prompt to Gemini...');
  try {
    const res = await model.invoke('Hello! Respond with the word "SUCCESS" if you can hear me.');
    console.log('Response content:', res.content);
  } catch (error) {
    console.error('Error invoking model:', error);
  }
}

testChat().catch(console.error);
