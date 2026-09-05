import { spawnSync } from 'node:child_process';

const composeArgs = [
  'compose',
  '-p',
  'nowtech-erp-e2e',
  '-f',
  'docker-compose.test.yml',
];
const databaseUrl =
  'postgresql://postgres:postgres@localhost:5433/nowtech_erp_test?schema=public';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

try {
  console.log('\n[e2e] Starting isolated PostgreSQL...');
  run('docker', [...composeArgs, 'up', '-d', '--wait']);

  console.log('\n[e2e] Applying Prisma migrations...');
  run(npmCommand, ['exec', '--', 'prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
    },
  });

  console.log('\n[e2e] Running tests...');
  run(npmCommand, ['exec', '--', 'jest', '--config', './test/jest-e2e.json', '--runInBand'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
    },
  });
} catch (error) {
  console.error('\n[e2e] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  console.log('\n[e2e] Stopping isolated PostgreSQL...');
  const result = spawnSync('docker', [...composeArgs, 'down', '-v'], {
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    console.error('[e2e] Failed to stop the test environment cleanly.');
    process.exitCode = 1;
  }
}
