---
description: Test RAG functionality with Vertex AI Search
argument-hint: [question to test RAG, e.g. "How to create a data store?"]
---

# Test RAG (Vertex AI Search)

## Question

$ARGUMENTS

## Run Test

```bash
curl -s -X POST https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/gemini-chat \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYmN3dnhsdm96amxxa2huYXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDk5NTksImV4cCI6MjA4MTQyNTk1OX0.PYX-O9CbKiNuVsR8CtidbvgTcPWqwUeuHcWq6uY2BG4" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "$ARGUMENTS",
    "userId": "rag-test",
    "useRAG": true,
    "ragEngineId": "ai-citi-rag-search_1769480621647"
  }' | jq '{rag_used: .rag.used, sources_count: (.rag.sources | length), reply: .reply[0:500]}'
```

## Expected Response

```json
{
  "rag_used": true,
  "sources_count": 5,
  "reply": "Answer based on RAG sources..."
}
```

## RAG Configuration

- **Engine ID:** `ai-citi-rag-search_1769480621647`
- **Project:** `gen-lang-client-0102901194`
- **Location:** `global`

## Troubleshooting

If `rag_used: false`:
1. Check Engine ID is correct
2. Check question is relevant to indexed content
3. Check Edge Function logs: `supabase functions logs gemini-chat`
