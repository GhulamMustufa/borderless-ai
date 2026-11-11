import type { CriticResult } from "./types";
import { log } from "./logger";

export type DecisionTraceStep = {
  name: string;
  latencyMs: number;
  details?: Record<string, any>;
};

export type DecisionTrace = {
  traceId: string;
  startTime: number;
  totalLatencyMs: number;
  steps: DecisionTraceStep[];
  retrievalCount: number;
  evidenceIds: string[];
  retryCount: number;
  validationFailures: string[];
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  finalDecisionStatus: string;
};

export class TraceContext {
  private trace: DecisionTrace;

  constructor(traceId: string) {
    this.trace = {
      traceId,
      startTime: Date.now(),
      totalLatencyMs: 0,
      steps: [],
      retrievalCount: 0,
      evidenceIds: [],
      retryCount: 0,
      validationFailures: [],
      modelUsed: "unknown",
      finalDecisionStatus: "pending",
    };
  }

  async runStep<T>(
    name: string,
    operation: () => Promise<T>,
    extractDetails?: (result: T) => Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const latencyMs = Date.now() - start;
      
      this.trace.steps.push({
        name,
        latencyMs,
        details: extractDetails ? extractDetails(result) : undefined,
      });
      
      return result;
    } catch (error) {
      const latencyMs = Date.now() - start;
      this.trace.steps.push({
        name,
        latencyMs,
        details: { error: (error as Error).message },
      });
      throw error;
    }
  }

  recordRetrieval(evidenceIds: string[]) {
    this.trace.retrievalCount = evidenceIds.length;
    this.trace.evidenceIds = evidenceIds;
  }

  recordRetry(criticResult: CriticResult) {
    this.trace.retryCount += 1;
    this.trace.validationFailures.push(...criticResult.feedback);
  }

  recordValidationFailure(reason: string) {
    this.trace.validationFailures.push(reason);
  }

  recordModelInfo(model: string, promptTokens?: number, completionTokens?: number) {
    this.trace.modelUsed = model;
    if (promptTokens) this.trace.promptTokens = (this.trace.promptTokens || 0) + promptTokens;
    if (completionTokens) this.trace.completionTokens = (this.trace.completionTokens || 0) + completionTokens;
    
    if (this.trace.modelUsed === "gpt-4o-mini" && this.trace.promptTokens && this.trace.completionTokens) {
      const inCost = (this.trace.promptTokens / 1_000_000) * 0.150;
      const outCost = (this.trace.completionTokens / 1_000_000) * 0.600;
      this.trace.estimatedCostUsd = inCost + outCost;
    }
  }

  complete(finalStatus: string) {
    this.trace.finalDecisionStatus = finalStatus;
    this.trace.totalLatencyMs = Date.now() - this.trace.startTime;
    
    // Log structured trace (without PII)
    log("info", "decision_trace", this.trace);
  }
}
