import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const cwd = process.cwd();
const nextBin = join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');

const placeholderManifest = JSON.stringify(
  {
    version: 3,
    pages404: true,
    appType: 'app',
    caseSensitive: false,
    basePath: '',
    redirects: [],
    headers: [],
    onMatchHeaders: [],
    rewrites: { beforeFiles: [], afterFiles: [], fallback: [] },
    dynamicRoutes: [],
    staticRoutes: [],
    dataRoutes: [],
    rsc: {
      header: 'rsc',
      varyHeader: 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
      prefetchHeader: 'next-router-prefetch',
      didPostponeHeader: 'x-nextjs-postponed',
      contentTypeHeader: 'text/x-component',
      suffix: '.rsc',
      prefetchSegmentHeader: 'next-router-segment-prefetch',
      prefetchSegmentSuffix: '.segment.rsc',
      prefetchSegmentDirSuffix: '.segments',
      clientParamParsing: false,
      dynamicRSCPrerender: false,
    },
    rewriteHeaders: {
      pathHeader: 'x-nextjs-rewritten-path',
      queryHeader: 'x-nextjs-rewritten-query',
    },
  },
  null,
  2,
);

const candidates = [
  {
    source: join(cwd, '.next', 'routes-manifest.json'),
    target: join(cwd, '.next', 'routes-manifest-deterministic.json'),
  },
];

if (cwd.replaceAll('\\', '/').startsWith('/vercel/')) {
  candidates.push({
    source: join(dirname(cwd), '.next', 'routes-manifest.json'),
    target: join(dirname(cwd), '.next', 'routes-manifest-deterministic.json'),
  });
}

function syncRoutesManifest() {
  for (const { source, target } of candidates) {
    mkdirSync(dirname(target), { recursive: true });

    if (existsSync(source)) {
      copyFileSync(source, target);
    } else if (!existsSync(target)) {
      writeFileSync(target, placeholderManifest);
    }
  }
}

const childEnv = { ...process.env };
delete childEnv.NEXT_ENABLE_ADAPTER;

syncRoutesManifest();
const interval = setInterval(syncRoutesManifest, 25);

const child = spawn(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd,
  env: childEnv,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  clearInterval(interval);
  syncRoutesManifest();
  console.log(`Ensured Vercel routes manifest at ${candidates.map(({ target }) => target).join(', ')}`);

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
