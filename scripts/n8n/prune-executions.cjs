#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_RETENTION_DAYS = 7;
const DEFAULT_KEEP_RECENT = 50;
const PAGE_LIMIT = 100;
const ACTIVE_STATUSES = new Set(['new', 'running', 'waiting']);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const envText = fs.readFileSync(filePath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getNumberEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return parsed;
}

function getRetentionMs() {
  const hours = process.env.N8N_EXECUTION_RETENTION_HOURS;
  if (hours) return getNumberEnv('N8N_EXECUTION_RETENTION_HOURS', 0) * 60 * 60 * 1000;

  return getNumberEnv('N8N_EXECUTION_RETENTION_DAYS', DEFAULT_RETENTION_DAYS) *
    24 *
    60 *
    60 *
    1000;
}

function getExecutionTimestamp(execution) {
  const timestamp =
    execution.stoppedAt ||
    execution.finishedAt ||
    execution.startedAt ||
    execution.createdAt;

  const time = timestamp ? Date.parse(timestamp) : Number.NaN;
  return Number.isFinite(time) ? time : undefined;
}

function shouldDeleteExecution(execution, cutoffMs, index, keepRecent) {
  if (index < keepRecent) return false;
  if (ACTIVE_STATUSES.has(String(execution.status || '').toLowerCase())) return false;

  const timestamp = getExecutionTimestamp(execution);
  if (!timestamp) return false;

  return timestamp < cutoffMs;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `${options?.method || 'GET'} ${url} failed: ${response.status} ${body}\n` +
          'The configured N8N_API_KEY is not allowed to manage executions. ' +
          'Create or use an n8n API key with execution read/delete permission, ' +
          'or configure native n8n execution pruning on the n8n host.',
      );
    }
    throw new Error(`${options?.method || 'GET'} ${url} failed: ${response.status} ${body}`);
  }
  return response.json();
}

async function listExecutions(baseUrl, headers) {
  const executions = [];
  let cursor;

  do {
    const url = new URL(`${baseUrl}/api/v1/executions`);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('includeData', 'false');
    if (cursor) url.searchParams.set('cursor', cursor);

    const data = await fetchJson(url, { headers });
    executions.push(...(Array.isArray(data.data) ? data.data : []));
    cursor = data.nextCursor || undefined;
  } while (cursor);

  return executions.sort((a, b) => {
    const bTime = getExecutionTimestamp(b) || 0;
    const aTime = getExecutionTimestamp(a) || 0;
    return bTime - aTime;
  });
}

async function deleteExecution(baseUrl, headers, executionId) {
  const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DELETE execution ${executionId} failed: ${response.status} ${body}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '..', '..');
  loadEnvFile(path.join(repoRoot, '.env.local'));

  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.N8N_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Missing N8N_BASE_URL or N8N_API_KEY');

  const dryRun = !args.has('--yes');
  const keepRecent = getNumberEnv('N8N_EXECUTIONS_KEEP_RECENT', DEFAULT_KEEP_RECENT);
  const retentionMs = getRetentionMs();
  const cutoffMs = Date.now() - retentionMs;
  const headers = { 'X-N8N-API-KEY': apiKey, accept: 'application/json' };

  const executions = await listExecutions(baseUrl, headers);
  const candidates = executions.filter((execution, index) =>
    shouldDeleteExecution(execution, cutoffMs, index, keepRecent),
  );

  console.log(
    `${dryRun ? 'Dry run:' : 'Pruning:'} ${candidates.length}/${executions.length} executions ` +
      `older than ${new Date(cutoffMs).toISOString()} while keeping newest ${keepRecent}.`,
  );

  let deleted = 0;
  for (const execution of candidates) {
    const timestamp = getExecutionTimestamp(execution);
    const label = `${execution.id} status=${execution.status || 'unknown'} workflow=${execution.workflowId || 'unknown'} timestamp=${timestamp ? new Date(timestamp).toISOString() : 'unknown'}`;

    if (dryRun) {
      console.log(`Would delete execution ${label}`);
      continue;
    }

    await deleteExecution(baseUrl, headers, execution.id);
    deleted += 1;
    console.log(`Deleted execution ${label}`);
  }

  console.log(dryRun ? 'No executions deleted. Pass --yes to prune.' : `Deleted ${deleted} executions.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
