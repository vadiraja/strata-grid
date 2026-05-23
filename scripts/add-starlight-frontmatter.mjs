#!/usr/bin/env node
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = 'docs-site/src/content/docs/api';

export function extractTitle(markdown) {
  const m = markdown.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}

export function withFrontmatter(markdown, title) {
  if (markdown.startsWith('---\n')) return markdown;
  const escaped = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const stripped = markdown.replace(/^#\s+.+?\s*$\n?/m, '');
  return `---\ntitle: "${escaped}"\n---\n\n${stripped.trimStart()}`;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.name.endsWith('.md')) {
      const raw = await readFile(full, 'utf8');
      const title = extractTitle(raw) ?? entry.name.replace(/\.md$/, '');
      const next = withFrontmatter(raw, title);
      if (next !== raw) await writeFile(full, next, 'utf8');
    }
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  try {
    await stat(API_DIR);
  } catch {
    console.error(`Directory ${API_DIR} not found — run typedoc first.`);
    process.exit(1);
  }
  await walk(API_DIR);
  console.log(`Added Starlight frontmatter under ${API_DIR}`);
}
