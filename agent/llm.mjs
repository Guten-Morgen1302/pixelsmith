// Model client. Two providers, same call shape; every call is logged to results/cost.jsonl with its provider.
//   PIXELSMITH_PROVIDER=baseten (default)  Muse Spark Open, open weights, served by Baseten (OpenAI-compatible)
//   PIXELSMITH_PROVIDER=meta               Meta Model API (api.meta.ai, Anthropic-compatible messages), model META_MODEL (default muse-wonder-1.0)
// Messages are written once in OpenAI style (text + image_url data URLs) and converted for the Meta API.
import fs from 'node:fs';
import 'node:process';

function loadEnv() {
  if (process.env.__ENV_LOADED) return;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
  process.env.__ENV_LOADED = '1';
}
const redact = (t) => String(t).replace(/[A-Za-z0-9_\-.]{40,}/g, '[redacted]');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const provider = () => (process.env.PIXELSMITH_PROVIDER || 'baseten');

function toAnthropic(messages) {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : m.content.map((p) => {
      if (p.type === 'text') return { type: 'text', text: p.text };
      const mt = p.image_url.url.match(/^data:(image\/\w+);base64,(.*)$/);
      return { type: 'image', source: { type: 'base64', media_type: mt[1], data: mt[2] } };
    }),
  }));
}

async function post(url, headers, body, tries = 4) {
  for (let i = 0; i < tries; i++) {
    let res, json;
    try { res = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) }); json = await res.json(); }
    catch (e) { if (i === tries - 1) throw e; await sleep(3000 * (i + 1)); continue; }
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && i < tries - 1) { await sleep(5000 * (i + 1)); continue; }
    throw new Error(`LLM HTTP ${res.status}: ${redact(JSON.stringify(json).slice(0, 300))}`);
  }
}

export async function chat(messages, { maxTokens = 16000, tag = 'call', effort = 'low' } = {}) {
  loadEnv();
  const t0 = Date.now(); const prov = provider();
  let content, model, usage = {}, thinking;
  if (prov === 'meta') {
    model = process.env.META_MODEL || 'muse-wonder-1.0';
    const body = await post(process.env.META_API_BASE_URL + '/v1/messages', { 'x-api-key': process.env.MODEL_API_KEY, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: maxTokens, output_config: { effort }, messages: toAnthropic(messages) });
    content = (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    usage = { prompt_tokens: body.usage?.input_tokens, completion_tokens: body.usage?.output_tokens }; thinking = body.usage?.output_tokens_details?.thinking_tokens;
  } else {
    model = process.env.BASETEN_MODEL;
    const body = await post(process.env.BASETEN_BASE_URL + '/chat/completions', { Authorization: 'Api-Key ' + process.env.BASETEN_API_KEY },
      { model, max_tokens: maxTokens, reasoning_effort: effort, messages });
    content = body.choices[0].message.content; usage = body.usage || {}; thinking = usage.completion_tokens_details?.reasoning_tokens;
  }
  fs.mkdirSync('results', { recursive: true });
  fs.appendFileSync('results/cost.jsonl', JSON.stringify({ ts: new Date().toISOString(), provider: prov, tag, model, ms: Date.now() - t0, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, reasoning_tokens: thinking }) + '\n');
  if (content == null || content === '') throw new Error('empty content (reasoning ate the token budget); raise maxTokens');
  return content;
}

export const imageMessage = (text, pngBuffer) => ({
  role: 'user',
  content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: 'data:image/png;base64,' + pngBuffer.toString('base64') } }],
});
