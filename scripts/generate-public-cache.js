/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires */
// Node.js script to generate a list of all public files and API endpoints for service worker caching
const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');

const PUBLIC_GLOB = 'public/**/*.*'; // All files in public
const API_GLOB = 'app/api/**/route.ts'; // All API endpoints, including nested
const NEXT_STATIC_EXTENSIONS = [
  'js',
  'css',
  'json',
  'txt',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'ico',
  'bmp',
  'webp',
  'avif',
  'wasm',
  'map',
];
const NEXT_STATIC_GLOBS = [
  '.next/static',
  '.next/standalone/_next/static',
  'public/_next/static',
  'release/app/_next/static',
].map(
  base => `${base}/**/*.{${NEXT_STATIC_EXTENSIONS.join(',')}}`,
);
const OUTPUT_FILE = 'public/cache.json';

const normaliseSlashes = input => input.replace(/\\/g, '/');

const toWebPath = absolutePath => {
  const normalised = normaliseSlashes(absolutePath);

  if (normalised.startsWith('public/')) {
    return `/${normalised.slice('public/'.length)}`;
  }

  if (normalised.startsWith('.next/static/')) {
    return normalised.replace(/^\.next\/static\//, '/_next/static/');
  }

  if (normalised.startsWith('.next/standalone/_next/static/')) {
    return normalised.replace(/^\.next\/standalone/, '');
  }

  if (normalised.startsWith('release/app/_next/static/')) {
    return `/${normalised.slice('release/app/'.length)}`;
  }

  return null;
};

(async () => {
  // Find all public files (excluding service-worker.js and cache.json itself)
  const files = await fg([PUBLIC_GLOB], { dot: false });
  const filtered = files.filter(f =>
    !f.endsWith('service-worker.js') &&
    !f.endsWith('cache.json')
  );
  // Convert to web-accessible paths
  const webPaths = filtered.map(f => '/' + path.relative('public', f).replace(/\\/g, '/'));

  // Find all API endpoints
  const apiFiles = await fg([API_GLOB], { dot: false });
  const apiEndpoints = apiFiles.map(f => {
    const match = f.match(/app\/api\/(.*?)\/route\.ts$/);
    return match ? `/api/${match[1]}` : null;
  }).filter(Boolean);

  const nextStaticFiles = await fg(NEXT_STATIC_GLOBS, {
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
  });
  const nextStaticPaths = nextStaticFiles
    .map(toWebPath)
    .filter(Boolean);

  // Write to output file
  const cacheEntries = Array.from(
    new Set(['/'].concat(webPaths, apiEndpoints, nextStaticPaths)),
  ).sort();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheEntries, null, 2));
  console.log(`Public, API, and Next static cache list written to ${OUTPUT_FILE}`);
})();
