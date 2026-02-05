# Deploy Edge Functions for Canvas Workspace

The Canvas workspace requires three edge functions to be deployed:

1. **documents** - Document CRUD operations
2. **actions** - Action batching, undo/redo
3. **assets** - Asset upload and management

## Quick Deploy

Run these commands from the project root:

```bash
# Deploy documents function
supabase functions deploy documents

# Deploy actions function
supabase functions deploy actions

# Deploy assets function
supabase functions deploy assets
```

## Verify Deployment

After deploying, you can test the functions:

```bash
# Test documents function (requires auth)
supabase functions invoke documents --body '{"method":"list"}'
```

## If Functions Are Not Deployed

If you see "Failed to send a request to the Edge Function", it means:

1. **Functions not deployed** - Run the deploy commands above
2. **Supabase CLI not linked** - Run `supabase link --project-ref YOUR_PROJECT_REF`
3. **Local development** - If running locally, use `supabase functions serve` to test

## Local Development

For local testing:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Functions will be available at:
# http://localhost:54321/functions/v1/documents
# http://localhost:54321/functions/v1/actions
# http://localhost:54321/functions/v1/assets
```

## Troubleshooting

### Error: "Function not found"
- Deploy the function: `supabase functions deploy documents`
- Check function name matches exactly
- Verify you're linked to the correct project

### Error: "Failed to send request"
- Check Supabase project is running
- Verify network connectivity
- Check browser console for CORS errors
- Ensure JWT token is being sent

### Error: "Unauthorized"
- Check `verify_jwt = true` in config.toml
- Ensure user is logged in
- Verify session token is valid
