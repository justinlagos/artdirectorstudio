/**
 * Structured logging utility for edge functions
 * Format: [op=...] [user=...] [req=...] [phase=...] [result=...] [ms=...] [err?=...]
 */

export type Operation = 'analyze' | 'blend' | 'upscale' | 'batch' | 'generate' | 'reserve' | 'commit' | 'refund';
export type Phase = 'preflight' | 'reserve' | 'model' | 'commit' | 'refund' | 'storage' | 'db';
export type Result = 'ok' | 'err';

export interface LogEntry {
  op: Operation;
  user: string;
  req: string;
  phase: Phase;
  result: Result;
  ms?: number;
  err?: string;
}

/**
 * Generate structured log line
 */
export function structuredLog(entry: LogEntry): string {
  const parts = [
    `[op=${entry.op}]`,
    `[user=${entry.user}]`,
    `[req=${entry.req}]`,
    `[phase=${entry.phase}]`,
    `[result=${entry.result}]`,
  ];
  
  if (entry.ms !== undefined) {
    parts.push(`[ms=${entry.ms}]`);
  }
  
  if (entry.err) {
    // Sanitize error message - remove newlines and truncate if needed
    const sanitized = entry.err.replace(/\n/g, ' ').substring(0, 200);
    parts.push(`[err=${sanitized}]`);
  }
  
  return parts.join(' ');
}

/**
 * Create a logger for a specific operation
 */
export class OperationLogger {
  private startTime: number;
  
  constructor(
    private op: Operation,
    private user: string,
    private req: string
  ) {
    this.startTime = Date.now();
  }
  
  log(phase: Phase, result: Result, error?: string): void {
    const ms = Date.now() - this.startTime;
    console.log(structuredLog({
      op: this.op,
      user: this.user,
      req: this.req,
      phase,
      result,
      ms,
      err: error,
    }));
  }
  
  success(phase: Phase): void {
    this.log(phase, 'ok');
  }
  
  error(phase: Phase, error: string): void {
    this.log(phase, 'err', error);
  }
}
