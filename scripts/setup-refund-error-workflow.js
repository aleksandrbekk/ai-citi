#!/usr/bin/env node
/**
 * Создаёт n8n Error Workflow для AI CITI карусели — возврат монет при ошибках.
 * Запуск: node scripts/setup-refund-error-workflow.js
 * Требует: docs/N8N_API.md с API Key
 */

const https = require('https');

const N8N_API = 'https://n8n.iferma.pro/api/v1';
const API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ';
const AI_CITI_WORKFLOW_ID = 'RgapTTGAu6acuaGc';
const REFUND_URL = 'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/refund-carousel-coins';
const TELEGRAM_BOT = '8265353203:AAFTK0IbDcfn9laPc5h6lQ32o4rYZ3iFjq4';

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: opts.method || 'GET',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...opts.headers
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

const ERROR_WORKFLOW = {
  name: 'AI CITI — Refund при ошибке карусели',
  nodes: [
    { parameters: {}, id: 'error-trigger-001', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0] },
    {
      parameters: { jsCode: `const exec = $json.execution || {};\nreturn [{ json: { executionId: exec.id } }];` },
      id: 'extract-001', name: 'Extract execId', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0]
    },
    {
      parameters: {
        conditions: { options: { version: 2 }, conditions: [{ leftValue: '={{ $json.executionId }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty' } }], combinator: 'and' }
      },
      id: 'has-execid-001', name: 'Has execId?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [480, 0]
    },
    {
      parameters: {
        method: 'POST', url: REFUND_URL,
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ executionId: $json.executionId, amount: 30, reason: "Ошибка генерации карусели" }) }}',
        options: {}
      },
      id: 'refund-001', name: 'Refund Coins', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [720, -80]
    },
    {
      parameters: {
        method: 'POST', url: `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`,
        sendBody: true, specifyBody: 'json',
        jsonBody: '={\"chat_id\": {{ $json.telegram_id }}, \"text\": \"❌ Ошибка генерации карусели.\\n\\n30 монет возвращены на баланс.\\n\\nПопробуй ещё раз или напиши в поддержку.\"}',
        options: {}
      },
      id: 'send-msg-001', name: 'Send Telegram', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [960, -80]
    }
  ],
  connections: {
    'Error Trigger': { main: [[{ node: 'Extract execId', type: 'main', index: 0 }]] },
    'Extract execId': { main: [[{ node: 'Has execId?', type: 'main', index: 0 }]] },
    'Has execId?': { main: [[{ node: 'Refund Coins', type: 'main', index: 0 }], []] },
    'Refund Coins': { main: [[{ node: 'Send Telegram', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' }
};

async function main() {
  const createRes = await fetch(`${N8N_API}/workflows`, { method: 'POST', body: ERROR_WORKFLOW });
  if (createRes.message || createRes.error) { console.error('Create failed:', createRes); process.exit(1); }
  const errorWorkflowId = createRes.id;
  console.log('Created Error Workflow:', errorWorkflowId);

  const w = await fetch(`${N8N_API}/workflows/${AI_CITI_WORKFLOW_ID}`);
  if (!w.nodes) { console.error('Failed to fetch AI CITI workflow'); process.exit(1); }
  w.settings = w.settings || {};
  w.settings.errorWorkflow = errorWorkflowId;

  const putRes = await fetch(`${N8N_API}/workflows/${AI_CITI_WORKFLOW_ID}`, {
    method: 'PUT',
    body: { name: w.name, nodes: w.nodes, connections: w.connections, settings: w.settings, staticData: w.staticData || null }
  });
  if (putRes.message) { console.error('PUT failed:', putRes); process.exit(1); }

  await fetch(`${N8N_API}/workflows/${errorWorkflowId}/activate`, { method: 'POST' });
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
