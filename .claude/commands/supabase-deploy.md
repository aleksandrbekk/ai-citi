---
description: Deploy Supabase Edge Function
argument-hint: [function-name like "gemini-chat"]
---

# Deploy Supabase Edge Function

## Function to Deploy

$ARGUMENTS

## Step 1: Check Function Exists

```bash
ls -la supabase/functions/$ARGUMENTS/
```

## Step 2: Deploy

```bash
supabase functions deploy $ARGUMENTS --project-ref debcwvxlvozjlqkhnauy
```

## Step 3: Check Logs

```bash
supabase functions logs $ARGUMENTS --project-ref debcwvxlvozjlqkhnauy
```

## Project Info

- **Project ID:** debcwvxlvozjlqkhnauy
- **Functions URL:** https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/

## Test Example

```bash
curl -X POST https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/$ARGUMENTS \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
