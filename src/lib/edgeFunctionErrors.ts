export interface ParsedEdgeFunctionError {
  message: string;
  errorType?: string;
  status?: number;
  details?: Record<string, unknown>;
  rawMessage: string;
  providerStatus?: number;
  providerMessage?: string;
}

const ERROR_TYPE_MESSAGES: Record<string, string> = {
  insufficient_credits: 'Insufficient internal credits',
  invalid_reservation: 'Reservation expired or invalid',
  auth_required: 'Session expired, sign in again',
  auth_missing: 'Session expired, sign in again',
  invalid_token: 'Session expired, sign in again',
  no_user_id: 'Session expired, sign in again',
  config_error: 'Admin: Provider not configured or out of funds',
  provider_error: 'Admin: Provider not configured or out of funds',
  validation_error: 'Invalid input provided',
  parse_error: 'AI returned unexpected format. Credits refunded.',
  rate_limit: 'Rate limit exceeded. Please wait and try again.',
  storage_error: 'Upload blocked by policy',
  server_error: 'Server error occurred. Please try again.',
};

export function getErrorMessage(parsed: ParsedEdgeFunctionError): string {
  const msg = parsed.message || '';
  const msgLower = msg.toLowerCase();
  
  if (parsed.status === 401) {
    return ERROR_TYPE_MESSAGES.auth_required;
  }
  
  if (parsed.status === 403) {
    return ERROR_TYPE_MESSAGES.auth_required;
  }
  
  if (parsed.status === 402) {
    return ERROR_TYPE_MESSAGES.insufficient_credits;
  }
  
  if (parsed.status === 429) {
    return ERROR_TYPE_MESSAGES.rate_limit;
  }
  
  if (parsed.errorType) {
    if (parsed.errorType === 'config_error' || parsed.errorType === 'provider_error') {
      return ERROR_TYPE_MESSAGES.config_error;
    }
    if (parsed.errorType === 'insufficient_credits') {
      return ERROR_TYPE_MESSAGES.insufficient_credits;
    }
    if (parsed.errorType === 'invalid_reservation') {
      return ERROR_TYPE_MESSAGES.invalid_reservation;
    }
    if (parsed.errorType === 'storage_error') {
      return ERROR_TYPE_MESSAGES.storage_error;
    }
    if (ERROR_TYPE_MESSAGES[parsed.errorType]) {
      return ERROR_TYPE_MESSAGES[parsed.errorType];
    }
  }
  
  if (msgLower.includes('api key') || msgLower.includes('not configured') || msgLower.includes('provider')) {
    return ERROR_TYPE_MESSAGES.config_error;
  }
  
  if (msgLower.includes('rate limit') || msgLower.includes('quota')) {
    return ERROR_TYPE_MESSAGES.rate_limit;
  }
  
  console.error('[EdgeFunction Error]', parsed.rawMessage, parsed);
  
  return msg || 'An error occurred';
}

function isResponseLike(value: unknown): value is Response {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as Response).status === "number" &&
    "json" in value &&
    typeof (value as Response).json === "function"
  );
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

async function parseContextPayload(context: unknown): Promise<{ payload: Record<string, unknown> | null; status?: number }> {
  if (!context) return { payload: null };

  if (typeof context === "string") {
    try {
      return { payload: toRecord(JSON.parse(context)) };
    } catch {
      return { payload: null };
    }
  }

  if (isResponseLike(context)) {
    const status = context.status;
    try {
      const payload = toRecord(await context.clone().json());
      return { payload, status };
    } catch {
      return { payload: null, status };
    }
  }

  const record = toRecord(context);
  if (!record) return { payload: null };

  const status = typeof record.status === "number" ? record.status : undefined;
  const body = record.body;

  if (typeof body === "string") {
    try {
      return { payload: toRecord(JSON.parse(body)), status };
    } catch {
      return { payload: record, status };
    }
  }

  return { payload: record, status };
}

export async function parseEdgeFunctionError(error: unknown): Promise<ParsedEdgeFunctionError> {
  const record = toRecord(error);
  const rawMessage = typeof record?.message === "string" ? record.message : "Unknown error";

  const { payload, status } = await parseContextPayload(record?.context);
  const message =
    (typeof payload?.error === "string" && payload.error) ||
    (typeof payload?.message === "string" && payload.message) ||
    rawMessage;

  const details = toRecord(payload?.details) ?? undefined;
  const errorType =
    (typeof payload?.errorType === "string" && payload.errorType) ||
    (typeof payload?.errorCode === "string" && payload.errorCode) ||
    undefined;

  const providerStatus = typeof payload?.provider_status === "number" ? payload.provider_status : undefined;
  const providerMessage = typeof payload?.provider_message === "string" ? payload.provider_message : undefined;

  return {
    message,
    errorType,
    status,
    details,
    rawMessage,
    providerStatus,
    providerMessage,
  };
}
