export interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

export interface PrismaQuerySpec {
  model: string | null;       // e.g. 'task', 'user', 'effortLog', 'comment'
  operation: string | null;   // e.g. 'findMany', 'count', 'groupBy'
  args: any;                  // e.g. { where: { ... }, select: { ... } }
  generatePDF?: boolean;      // True if user requested a file/report/download
  pdfColumns?: string[] | null; // Optional list of specific columns requested in report
  isConversational?: boolean; // True if the request is conversational
  reply?: string | null;      // Direct conversational response from AI
}

export interface AgentState {
  prompt: string;
  history?: ChatMessage[] | null;
  preferredModel?: string | null;
  querySpec: PrismaQuerySpec | null;
  queryResults: any[] | null;
  error: string | null;
  retryCount: number;
  pdfUrl: string | null;
}

export interface AgentQueryRequest {
  prompt: string;
  history?: ChatMessage[];
  model?: string;
}

export interface AgentQueryResponse {
  success: boolean;
  message: string;
  querySpec?: PrismaQuerySpec | null;
  resultsCount?: number;
  queryResults?: any[] | null;
  pdfUrl?: string | null;
  error?: string | null;
}
