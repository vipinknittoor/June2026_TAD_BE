import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in .env');
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`HTTP error: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    const data: any = await res.json();
    console.log('Available models:');
    if (data && data.models && Array.isArray(data.models)) {
      data.models.forEach((m: any) => {
        console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods})`);
      });
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels().catch(console.error);
