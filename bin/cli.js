#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const binDir = dirname(fileURLToPath(import.meta.url));
const entry = resolve(binDir, '../src/index.ts');
const tsxCli = require.resolve('tsx/cli');

const child = spawn(process.execPath, [tsxCli, entry], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error(`Failed to start nvidia-vision-mcp: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
