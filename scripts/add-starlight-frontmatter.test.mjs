import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTitle, withFrontmatter } from './add-starlight-frontmatter.mjs';

test('extractTitle pulls the first H1', () => {
  const md = '# DataGrid\n\nA tree-aware grid component.\n';
  assert.equal(extractTitle(md), 'DataGrid');
});

test('extractTitle returns null when no H1', () => {
  assert.equal(extractTitle('No heading here\n'), null);
});

test('withFrontmatter prepends frontmatter and strips the H1', () => {
  const md = '# DataGrid\n\nBody text.\n';
  const out = withFrontmatter(md, 'DataGrid');
  assert.ok(out.startsWith('---\ntitle: "DataGrid"\n'));
  assert.ok(!out.includes('# DataGrid'));
  assert.ok(out.includes('Body text.'));
});

test('withFrontmatter escapes double quotes in titles', () => {
  const out = withFrontmatter('# Foo "bar"\n', 'Foo "bar"');
  assert.ok(out.includes('title: "Foo \\"bar\\""'));
});

test('withFrontmatter is idempotent when frontmatter already present', () => {
  const md = '---\ntitle: "Existing"\n---\n\n# Body\n';
  assert.equal(withFrontmatter(md, 'Anything'), md);
});
