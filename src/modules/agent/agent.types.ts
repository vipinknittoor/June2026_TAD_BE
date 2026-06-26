export interface PrismaQuerySpec {
  model: string | null;       // e.g. 'task', 'user', 'effortLog', 'comment'
  operation: string | null;   // e.g. 'findMany', 'count', 'groupBy'
  args: any;                  // e.g. { where: { ... }, select: { ... } }
  generatePDF?: boolean;      // True if user requested a file/report/download
  isConversational?: boolean; // True if the request is conversational
  reply?: string | null;      // Direct conversational response from AI
}

export interface AgentState {
  prompt: string;
  querySpec: PrismaQuerySpec | null;
  queryResults: any[] | null;
  error: string | null;
  retryCount: number;
  pdfUrl: string | null;
}

export interface AgentQueryRequest {
  prompt: string;
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
