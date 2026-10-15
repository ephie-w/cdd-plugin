import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const registryUrl = 'https://github.com/newscorp-ghfb/nca-ai-engineering-cdd-registry.git';
const registryRef = 'codex/cdd-marketplace-import';

test('root plugin declares the CDD marketplace identity', () => {
  const manifest = json('.devin-plugin/plugin.json');
  assert.equal(manifest.name, 'cdd-marketplace');
  assert.equal(manifest.version, '0.1.0');
  assert.match(manifest.description, /CDD discovery/i);
  assert.deepEqual(manifest.author, { name: 'AI Engineering CDD Team' });
  assert.equal(manifest.license, 'MIT');
});

test('core packages the CDD snapshot and uses flat plugin paths', () => {
  assert.equal(json('plugins/cdd-core/.devin-plugin/plugin.json').name, 'cdd-core');
  const catalog = read('plugins/cdd-core/catalog/capabilities.yaml');
  assert.match(catalog, /id: BLUEPRINT-01/);
  assert.match(catalog, /status: draft/);
  assert.match(catalog, /category: data/);
  assert.match(catalog, /category: observe/);
  assert.match(catalog, /marketplace_path: plugins\/cdd-metadata-enrichment/);
  assert.match(catalog, /marketplace_path: plugins\/cdd-braintrust-otel/);
  assert.match(catalog, /skill: assess-metadata-enrichment/);
  assert.match(catalog, /skill: assess-tracing/);
});

test('discovery fails closed and does not treat optional plugins as installed', () => {
  const skill = read('plugins/cdd-core/skills/discover/SKILL.md');
  assert.match(skill, /catalog\/capabilities\.yaml/);
  assert.match(skill, /If the catalog is unavailable/i);
  assert.match(skill, /check.*installed/i);
  assert.match(skill, /draft.*candidate.*not approved/i);
  assert.match(skill, /do not.*search/i);
});

test('component manifests and local agent profiles match flat names', () => {
  for (const [plugin, skill, agent, category] of [
    ['cdd-metadata-enrichment', 'assess-metadata-enrichment', 'metadata-fit-reviewer', 'data'],
    ['cdd-braintrust-otel', 'assess-tracing', 'tracing-fit-reviewer', 'observe'],
  ]) {
    const manifest = json(`plugins/${plugin}/.devin-plugin/plugin.json`);
    assert.equal(manifest.name, plugin);
    assert.ok(manifest.keywords.includes(category));
    assert.match(read(`plugins/${plugin}/skills/${skill}/SKILL.md`), new RegExp(`name: ${skill}`));
    assert.match(read(`plugins/${plugin}/agents/${agent}/AGENT.md`), new RegExp(`name: ${agent}`));
  }
});

test('component advice remains candidate-only and trace-only where relevant', () => {
  assert.match(read('plugins/cdd-metadata-enrichment/skills/assess-metadata-enrichment/SKILL.md'), /candidate/);
  const tracing = read('plugins/cdd-braintrust-otel/skills/assess-tracing/SKILL.md');
  assert.match(tracing, /candidate/);
  assert.match(tracing, /not OTel Metrics/);
  assert.match(tracing, /do not connect to Braintrust/i);
});

test('root manifest wires CDD plugins to the requested repository branch', () => {
  const rootManifest = json('.devin-plugin/plugin.json');
  const has = (list, path) => list.some((ref) => ref?.source === 'git-subdir' && ref.url === registryUrl && ref.path === path && ref.ref === registryRef);
  assert.ok(has(rootManifest.requiredPlugins, 'plugins/cdd-core'));
  assert.ok(has(rootManifest.optionalPlugins, 'plugins/cdd-metadata-enrichment'));
  assert.ok(has(rootManifest.optionalPlugins, 'plugins/cdd-braintrust-otel'));
  assert.ok(rootManifest.requiredPlugins.some((ref) => ref.path === 'plugins/engineering-baseline'));
  assert.ok(rootManifest.optionalPlugins.some((ref) => ref.path === 'plugins/frontend-standards'));
  assert.ok(rootManifest.optionalPlugins.some((ref) => ref.url === 'https://github.com/anthropics/claude-code.git'));
});

test('validator rejects a missing same-repo plugin path', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'cdd-validator-'));
  try {
    mkdirSync(join(fixture, 'scripts'), { recursive: true });
    mkdirSync(join(fixture, '.devin-plugin'), { recursive: true });
    mkdirSync(join(fixture, 'plugins', 'example', '.devin-plugin'), { recursive: true });
    cpSync(join(root, 'scripts', 'validate-template.mjs'), join(fixture, 'scripts', 'validate-template.mjs'));
    writeFileSync(join(fixture, 'plugins', 'example', '.devin-plugin', 'plugin.json'), '{"name":"example"}');
    writeFileSync(join(fixture, '.devin-plugin', 'plugin.json'), JSON.stringify({
      name: 'fixture',
      requiredPlugins: [{ source: 'git-subdir', url: registryUrl, ref: registryRef, path: 'plugins/missing' }],
    }));
    const result = spawnSync(process.execPath, [join(fixture, 'scripts', 'validate-template.mjs')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /plugins\/missing.*does not resolve/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('validator rejects uploaded-bundle-style relative references', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'cdd-validator-relative-'));
  try {
    mkdirSync(join(fixture, 'scripts'), { recursive: true });
    mkdirSync(join(fixture, '.devin-plugin'), { recursive: true });
    mkdirSync(join(fixture, 'plugins', 'example', '.devin-plugin'), { recursive: true });
    cpSync(join(root, 'scripts', 'validate-template.mjs'), join(fixture, 'scripts', 'validate-template.mjs'));
    writeFileSync(join(fixture, 'plugins', 'example', '.devin-plugin', 'plugin.json'), '{"name":"example"}');
    writeFileSync(join(fixture, '.devin-plugin', 'plugin.json'), JSON.stringify({
      name: 'fixture', requiredPlugins: ['./plugins/example'],
    }));
    const result = spawnSync(process.execPath, [join(fixture, 'scripts', 'validate-template.mjs')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /relative plugin reference/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('README explains that the new branch must be pushed before root installation', () => {
  const guide = read('README.md');
  for (const name of ['cdd-core', 'cdd-metadata-enrichment', 'cdd-braintrust-otel']) {
    assert.match(guide, new RegExp(name));
  }
  assert.match(guide, /nca-ai-engineering-cdd-registry/);
  assert.match(guide, /codex\/cdd-marketplace-import/);
  assert.match(guide, /push.*before.*install/i);
  assert.doesNotMatch(guide, /example\.invalid/);
});
