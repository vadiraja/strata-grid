#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { Package, checkPackage } from '@arethetypeswrong/core';

const tempDir = mkdtempSync(join(tmpdir(), 'strata-attw-'));
const packDir = join(tempDir, 'pack');
const extractDir = join(tempDir, 'extract');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

try {
  mkdirSync(packDir);
  mkdirSync(extractDir);

  const packOutput = execFileSync('npm', ['pack', '--json', '--pack-destination', packDir], {
    encoding: 'utf8',
  });
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = join(packDir, filename);

  execFileSync('tar', ['-xzf', tarball, '-C', extractDir]);

  const packageRoot = join(extractDir, 'package');
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const files = Object.fromEntries(
    walk(packageRoot).map((file) => {
      const packagePath = relative(packageRoot, file);
      return [`/node_modules/${manifest.name}/${packagePath}`, readFileSync(file)];
    }),
  );

  const pkg = new Package(files, manifest.name, manifest.version);
  const analysis = await checkPackage(pkg, {
    // CSS subpath exports are validated by `npm pack` and `publint`; this gate
    // checks the typed JavaScript entrypoint consumers import from TypeScript.
    entrypoints: ['.'],
  });

  if (!analysis.types) {
    console.log('No types were detected in the packed package.');
    process.exit(0);
  }

  if (analysis.problems.length > 0) {
    console.error(JSON.stringify(analysis.problems, null, 2));
    process.exit(1);
  }

  console.log('Type resolution check passed.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
