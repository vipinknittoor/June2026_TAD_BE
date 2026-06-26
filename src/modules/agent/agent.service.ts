import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { badRequest } from '../../utils/errors.util';
import { generatePDFReport, PDFTableColumn } from '../../utils/pdf-generator.util';
import { PrismaQuerySpec } from './agent.types';

// Supported models for dynamic querying
const ALLOWED_MODELS = ['task', 'user', 'effortLog', 'comment'];

// Supported read-only prisma operations
const ALLOWED_OPERATIONS = ['findMany', 'count', 'groupBy', 'aggregate', 'findFirst', 'findUnique'];

/**
 * Define the LangGraph State Annotation
 */
export const AgentStateAnnotation = Annotation.Root({
  prompt: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => ''
  }),
  querySpec: Annotation<PrismaQuerySpec | null>({
    reducer: (a, b) => b ?? a,
    default: () => null
  }),
  queryResults: Annotation<any[] | null>({
    reducer: (a, b) => b ?? a,
    default: () => null
  }),
  error: Annotation<string | null>({
    reducer: (a, b) => b,
    default: () => null
  }),
  retryCount: Annotation<number>({
    reducer: (a, b) => b ?? a,
    default: () => 0
  }),
  pdfUrl: Annotation<string | null>({
    reducer: (a, b) => b ?? a,
    default: () => null
  })
});

// Extract state type from annotation schema
export type AgentStateSchema = typeof AgentStateAnnotation.State;

/**
 * Clean markdown wrapping from LLM output before parsing JSON.
 */
function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

/**
 * Direct HTTPS REST call to Gemini with model fallback matching task.service.ts
 */
async function callGeminiAPI(promptText: string): Promise<string> {
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
  let responseText = '';
  let lastErrorMsg = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          responseText = candidateText;
          break;
        }
      } else {
        const errText = await response.text();
        lastErrorMsg = `Gemini API error for model ${model}: ${response.statusText} - ${errText}`;
      }
    } catch (error: any) {
      lastErrorMsg = `Failed to communicate with Gemini API for model ${model}: ${error.message}`;
    }
  }

  if (!responseText) {
    throw new Error(`AI generation failed. Details: ${lastErrorMsg}`);
  }

  return responseText;
}

/**
 * Recursively scans and parses ISO date strings into JS Date objects
 * so Prisma doesn't fail on date comparisons.
 */
function parseDatesRecursive(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (isoDateRegex.test(obj)) {
      const parsed = new Date(obj);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (simpleDateRegex.test(obj)) {
      const parsed = new Date(obj);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => parseDatesRecursive(item));
  }
  if (typeof obj === 'object') {
    const parsedObj: any = {};
    for (const key of Object.keys(obj)) {
      parsedObj[key] = parseDatesRecursive(obj[key]);
    }
    return parsedObj;
  }
  return obj;
}

/**
 * Resolves standard table report headers based on target query model.
 */
function getColumnsForModel(modelName: string, sampleRecord?: any): PDFTableColumn[] {
  if (sampleRecord && typeof sampleRecord === 'object') {
    const excludedKeys = [
      "id",
      "passwordHash",
      "isActive",
      "assignedById",
      "reviewingManagerId",
      "createdAt",
      "updatedAt"
    ];
    const keys = Object.keys(sampleRecord).filter(
      k => !excludedKeys.includes(k) && typeof sampleRecord[k] !== 'function'
    );
    
    // Allocate widths dynamically up to a maximum of 490 points (A4 printable width)
    const defaultWidth = Math.floor(490 / Math.max(1, keys.length));
    return keys.map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      width: defaultWidth
    }));
  }

  const normModel = modelName.toLowerCase();
  if (normModel === 'task') {
    return [
      { key: 'title', label: 'Title', width: 140 },
      { key: 'status', label: 'Status', width: 75 },
      { key: 'priority', label: 'Priority', width: 55 },
      { key: 'startDate', label: 'Start Date', width: 80 },
      { key: 'endDate', label: 'End Date', width: 80 },
      { key: 'effortHours', label: 'Hours', width: 40 }
    ];
  }
  if (normModel === 'user') {
    return [
      { key: 'name', label: 'Name', width: 130 },
      { key: 'email', label: 'Email', width: 170 },
      { key: 'role', label: 'Role', width: 70 },
      { key: 'title', label: 'Job Title', width: 100 }
    ];
  }
  if (normModel === 'effortlog') {
    return [
      { key: 'hours', label: 'Hours', width: 50 },
      { key: 'note', label: 'Progress Note', width: 220 },
      { key: 'createdAt', label: 'Logged Date', width: 110 },
      { key: 'actor', label: 'Logged By', width: 90 }
    ];
  }
  if (normModel === 'comment') {
    return [
      { key: 'text', label: 'Comment text', width: 250 },
      { key: 'type', label: 'Type', width: 80 },
      { key: 'createdAt', label: 'Date', width: 100 },
      { key: 'author', label: 'Author', width: 40 }
    ];
  }

  if (sampleRecord && typeof sampleRecord === 'object') {
    const keys = Object.keys(sampleRecord).filter(k => k !== 'id' && typeof sampleRecord[k] !== 'function');
    const defaultWidth = Math.floor(470 / Math.max(1, keys.length));
    return keys.slice(0, 6).map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      width: defaultWidth
    }));
  }

  return [{ key: 'id', label: 'ID', width: 470 }];
}

// ─────────────────────────────────────────────
// LangGraph Node: Decide Query Action
// ─────────────────────────────────────────────
async function decideActionNode(state: AgentStateSchema) {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw badRequest('Gemini API key is not configured');
  }

  const schemaContext = `
Available Prisma models:
1. "task"
   - id: String (UUID)
   - title: String
   - description: String
   - goal: String
   - startDate: DateTime
   - endDate: DateTime
   - priority: "LOW", "MEDIUM", "HIGH"
   - status: "DRAFT", "ASSIGNED", "IN_PROGRESS", "DENIED", "SUBMITTED", "APPROVED", "REOPENED"
   - effortHours: Float
   - acceptanceCriteria: String
   - denialReason: String (nullable)
   - actualCompletionDate: DateTime (nullable)
   - isActive: Boolean
   - Relations (connect via include):
     - assignedBy (User)
     - reviewingManager (User)
     - assignees (User[])

2. "user"
   - id: String (UUID)
   - name: String
   - email: String
   - role: "ADMIN", "EMPLOYEE"
   - title: String (nullable)
   - isActive: Boolean
   - Relations (connect via include):
     - tasksAssigned (Task[]) - Tasks created/assigned by this user
     - tasksReviewed (Task[]) - Tasks reviewed by this user
     - tasksParticipated (Task[]) - Tasks this user is assigned to work on (assignees)

3. "effortLog"
   - id: String (UUID)
   - taskId: String (UUID)
   - hours: Float
   - note: String
   - actorId: String (UUID)
   - Relations:
     - task (Task)
     - actor (User)

4. "comment"
   - id: String (UUID)
   - taskId: String (UUID)
   - authorId: String (UUID)
   - type: "GENERAL", "REVIEW_NOTE", "REOPEN_COMMENT"
   - text: String
   - Relations:
     - task (Task)
     - author (User)

CRITICAL RULES:
- If the user's message is a greeting (e.g., "hi", "hello"), social chat, or a general question about how to use the assistant (e.g., "what can you do?"), set "isConversational" to true, populate "reply" with a helpful conversational message, and set "model", "operation", and "args" to null.
- Otherwise, if it is a request for database records, stats, reports, or counts, set "isConversational" to false and "reply" to null, and build the Prisma query.
- You must ONLY use the following models for database queries: ${ALLOWED_MODELS.join(', ')}
- You must ONLY use the following read-only operations: ${ALLOWED_OPERATIONS.join(', ')}
- Always query with "isActive: true" in your "where" filter to exclude deleted entries.
- If dates are queried (like startDate or endDate), use standard ISO-8601 string format (e.g. "2026-06-25T00:00:00.000Z").
- Limit all database lists by adding "take: 100" in your args.
- Output ONLY a raw valid JSON object. Do not include markdown code ticks.
`;

  const errorHistory = state.error 
    ? `\nPREVIOUS ERROR:
Your previous query failed with this error message: "${state.error}". 
The invalid query specification was: ${JSON.stringify(state.querySpec)}.
Please inspect the database schema carefully, identify the mistakes, correct the fields/args, and return a fixed query specification.`
    : '';

  const promptText = `
You are a database querying and assistant agent for a task assignment project.
Analyze the user request, formulate the appropriate action matching the schema context below, and output it in JSON format.

SCHEMA CONTEXT:
${schemaContext}
${errorHistory}

USER REQUEST: "${state.prompt}"

CRITICAL INSTRUCTION FOR generatePDF:
Determine if the user is asking to generate a PDF report, file, document, or download. If so, set the "generatePDF" field to true. If not (or if it is conversational), set "generatePDF" to false.

Return your plan strictly in this JSON format:
{
  "isConversational": true | false,
  "reply": "Friendly conversational text response (only when isConversational is true; otherwise null)",
  "model": "task | user | effortLog | comment | null",
  "operation": "findMany | count | groupBy | aggregate | findFirst | findUnique | null",
  "args": {
    "where": { ... },
    "include": { ... },
    "orderBy": { ... },
    "take": 100
  } | null,
  "generatePDF": true | false
}
`;

  try {
    const textContent = await callGeminiAPI(promptText);
    const querySpec = cleanAndParseJSON(textContent) as PrismaQuerySpec;
    return {
      querySpec,
      error: null
    };
  } catch (err: any) {
    return {
      error: `Failed to generate or parse query: ${err.message}`
    };
  }
}

// ─────────────────────────────────────────────
// LangGraph Node: Query Database
// ─────────────────────────────────────────────
async function queryDatabaseNode(state: AgentStateSchema) {
  if (state.error) {
    // If the decideAction node itself failed to parse JSON
    return {
      retryCount: state.retryCount + 1
    };
  }

  const spec = state.querySpec;
  if (!spec) {
    return {
      error: 'No query specification generated by agent',
      retryCount: state.retryCount + 1
    };
  }

  // Conversational response bypass
  if (spec.isConversational) {
    return {
      queryResults: [],
      error: null
    };
  }

  if (!spec.model || !spec.operation) {
    return {
      error: 'Invalid database query specification: model or operation is missing',
      retryCount: state.retryCount + 1
    };
  }

  // Safety Guards
  if (!ALLOWED_MODELS.includes(spec.model)) {
    return {
      error: `Access to model '${spec.model}' is blocked for security reasons`,
      retryCount: state.retryCount + 1
    };
  }

  if (!ALLOWED_OPERATIONS.includes(spec.operation)) {
    return {
      error: `Operation '${spec.operation}' is not allowed. Only read-only operations are permitted.`,
      retryCount: state.retryCount + 1
    };
  }

  try {
    // Ensure the model property exists on the Prisma client
    const prismaModel = (prisma as any)[spec.model];
    if (!prismaModel) {
      throw new Error(`Prisma model client not found for '${spec.model}'`);
    }

    // Recursively parse string dates to Date objects
    const parsedArgs = parseDatesRecursive(spec.args || {});

    // Ensure we force default take limit to prevent OOM
    if (spec.operation === 'findMany' && (!parsedArgs.take || parsedArgs.take > 100)) {
      parsedArgs.take = 100;
    }

    // Run the Prisma action
    const queryResults = await prismaModel[spec.operation](parsedArgs);

    return {
      queryResults: Array.isArray(queryResults) ? queryResults : [queryResults],
      error: null
    };
  } catch (err: any) {
    return {
      error: err.message || 'Database query execution error',
      retryCount: state.retryCount + 1
    };
  }
}

// ─────────────────────────────────────────────
// LangGraph Node: Generate PDF Report
// ─────────────────────────────────────────────
async function generateFileNode(state: AgentStateSchema) {
  if (state.error || !state.queryResults || state.queryResults.length === 0) {
    return { pdfUrl: null };
  }

  const modelName = state.querySpec?.model || 'Report';
  const timestamp = Date.now();
  const filename = `${modelName.toLowerCase()}_report_${timestamp}.pdf`;
  const title = `AI Generated Database Report: ${modelName}`;

  try {
    const sample = state.queryResults[0];
    const columns = getColumnsForModel(modelName, sample);
    const pdfUrl = await generatePDFReport(filename, title, columns, state.queryResults);

    return { pdfUrl };
  } catch (err: any) {
    return {
      error: `Failed to compile PDF report: ${err.message}`
    };
  }
}

// Define the Graph Channels Reducers using StateGraph(AgentStateAnnotation)
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode('decideAction', decideActionNode)
  .addNode('queryDB', queryDatabaseNode)
  .addNode('generatePDF', generateFileNode)
  .setEntryPoint('decideAction')
  .addEdge('decideAction', 'queryDB')
  .addConditionalEdges('queryDB', (state: AgentStateSchema) => {
    // If we have an error and we haven't hit the max retries, loop back to self-heal
    if (state.error && state.retryCount < 3) {
      console.log(`[LangGraph Agent] Healing active. Error: "${state.error}". Retrying query...`);
      return 'decideAction';
    }
    // If the agent determined a PDF report is requested, generate it
    if (state.querySpec?.generatePDF) {
      return 'generatePDF';
    }
    // Otherwise, skip PDF generation and end workflow
    return END;
  })
  .addEdge('generatePDF', END);

// Compile the executable app
export const agentGraph = workflow.compile();

/**
 * Execute the agent with a given prompt
 */
export async function executeAgentQuery(prompt: string): Promise<AgentStateSchema> {
  const initialState = {
    prompt,
    querySpec: null,
    queryResults: null,
    error: null,
    retryCount: 0,
    pdfUrl: null
  };

  const finalState = await agentGraph.invoke(initialState);
  return finalState;
}
