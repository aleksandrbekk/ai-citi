#!/bin/bash
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ"

curl -s -X GET "https://n8n.iferma.pro/api/v1/workflows/RgapTTGAu6acuaGc" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json"
