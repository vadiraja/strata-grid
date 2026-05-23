#!/usr/bin/env node
import { copyFile } from 'node:fs/promises';

const SOURCE = 'docs-site/src/api-landing.mdx';
const TARGET = 'docs-site/src/content/docs/api/index.mdx';

await copyFile(SOURCE, TARGET);
console.log(`Copied ${SOURCE} -> ${TARGET}`);
