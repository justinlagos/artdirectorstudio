# Provider Billing Map

## Overview
This document describes the AI provider billing system for Art Director Studio, including which providers are used, where billing is managed, and how to check balances/quota.

## Providers Used

### Primary Provider: Google Gemini (Default)
- **API Key Env Var**: `GOOGLE_AI_API_KEY`
- **Model**: `gemini-2.5-flash` (default), configurable via options
- **Billing Location**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Check Balance**: Visit Google AI Studio dashboard

### Secondary Provider: OpenAI
- **API Key Env Var**: `OPENAI_API_KEY`
- **Model**: `gpt-4o` (default)
- **Env Var to Enable**: `AI_PROVIDER=openai`
- **Billing Location**: [OpenAI Platform](https://platform.openai.com/account/billing)
- **Check Balance**: Visit OpenAI Platform dashboard > Billing

## How Provider Selection Works

1. Edge functions check `AI_PROVIDER` environment variable
2. If `AI_PROVIDER=openai`, uses OpenAI; otherwise defaults to Gemini
3. Each provider requires its respective API key to be set in Supabase Edge Function secrets

## Where Platform Owner Pays

The platform owner (admin) pays for AI services directly to the providers:
- **Google**: Pay-as-you-go billing via Google Cloud / AI Studio
- **OpenAI**: Pay-as-you-go billing via OpenAI platform

There is no intermediary - the API keys belong to the platform owner's accounts.

## Checking Provider Status

### Google Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. View your API key and usage
3. Check [Google Cloud Console](https://console.cloud.google.com/) for billing

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/account/billing)
2. Check "Usage" tab for current month spending
3. Check "Billing" tab for payment methods and limits

## Error Handling

When provider is out of funds or misconfigured, users see:
- **"Admin: Provider not configured or out of funds"** - API key missing or invalid
- **"Rate limit exceeded"** - Too many requests (429)
- **"AI service quota exceeded"** - Provider quota reached

## Troubleshooting

### "Provider not configured"
- Verify `GOOGLE_AI_API_KEY` or `OPENAI_API_KEY` is set in Supabase Edge Function secrets
- Deploy edge functions after adding secrets: `supabase functions deploy`

### "Provider out of funds"
- Check provider dashboard for remaining balance
- Add payment method if needed

### "Rate limit exceeded"
- Wait and retry (exponential backoff is built-in)
- Consider upgrading provider plan for higher limits

## Edge Function Secrets Configuration

To configure providers:

```bash
# Set Google AI key (default)
supabase secrets set GOOGLE_AI_API_KEY=your_google_api_key

# Optionally set OpenAI as provider
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set AI_PROVIDER=openai
```

## Monitoring

Check Supabase Edge Function logs for:
- `action: 'analyze_start'` - Request started
- `action: 'analyze_success'` - Request completed
- `action: 'analyze_error'` - Request failed with error details

Each log entry includes a `requestId` for tracing.
