import { Request, Response } from 'express';
import { executeAgentQuery } from './agent.service';
import { sendSuccess } from '../../utils/response.util';
import { badRequest } from '../../utils/errors.util';

/**
 * POST /api/v1/agent/query
 * Receives a natural language prompt, runs the LangGraph agent, and returns database query results and PDF path.
 */
export async function queryAgent(req: Request, res: Response): Promise<void> {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw badRequest('prompt field is required and must be a non-empty string');
  }

  const finalState = await executeAgentQuery(prompt.trim());

  if (finalState.error && !finalState.queryResults) {
    // If the query failed completely and could not heal
    res.status(500).json({
      success: false,
      message: 'Agent execution failed to retrieve results',
      error: finalState.error,
      retryCount: finalState.retryCount
    });
    return;
  }

  const message = finalState.querySpec?.isConversational
    ? (finalState.querySpec.reply || 'Agent query completed successfully')
    : 'Agent query completed successfully';

  sendSuccess(
    res,
    {
      querySpec: finalState.querySpec,
      resultsCount: finalState.queryResults ? finalState.queryResults.length : 0,
      queryResults: finalState.queryResults,
      pdfUrl: finalState.pdfUrl,
      error: finalState.error, // Could contain a warning error if PDF failed but query succeeded
      retryCount: finalState.retryCount
    },
    message
  );
}
