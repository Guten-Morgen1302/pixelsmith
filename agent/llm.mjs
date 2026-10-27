// Minimal Baseten (OpenAI-compatible) client for Muse Spark Open. Logs every call to results/cost.jsonl.
import fs from 'node:fs';
import 'node:process';

function loadEnv() {
  if (process.env.BASETEN_API_KEY) return;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export async function chat(messages, { maxTokens = 16000, tag = 'call', effort = 'low' } = {}) {
  loadEnv();
  const t0 = Date.now();
  const res = await fetch(process.env.BASETEN_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Api-Key ' + process.env.BASETEN_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.BASETEN_MODEL, max_tokens: maxTokens, reasoning_effort: effort, messages }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300).replace(/[A-Za-z0-9_\-.]{40,}/g, '[redacted]')}`);
  const u = body.usage || {};
  fs.mkdirSync('results', { recursive: true });
  fs.appendFileSync('results/cost.jsonl', JSON.stringify({
    ts: new Date().toISOString(), tag, model: process.env.BASETEN_MODEL, ms: Date.now() - t0,
    prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens,
    reasoning_tokens: u.completion_tokens_details?.reasoning_tokens,
  }) + '\n');
  const content = body.choices[0].message.content;
  if (content == null) throw new Error('empty content (reasoning ate the token budget); raise maxTokens');
  return content;
}

export const imageMessage = (text, pngBuffer) => ({
  role: 'user',
  content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: 'data:image/png;base64,' + pngBuffer.toString('base64') } }],
});
