import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const registryUrl = 'https://github.com/ephie-w/cdd-plugin.git';
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
  assert.match(catalog, /https:\/\/github\.com\/newscorp-ghfb\/nca-component-metadata-enrichment-svc/);
  assert.match(catalog, /https:\/\/newsau\.atlassian\.net\/wiki\/spaces\/AAS\/pages\/81516068956/);
  assert.match(catalog, /skill: integrate-metadata-enrichment/);
  assert.match(catalog, /skill: assess-tracing/);
  assert.match(catalog, /category: identity/);
  assert.match(catalog, /marketplace_path: plugins\/cdd-okta-bff-auth/);
  assert.match(catalog, /skill: integrate-okta-bff-auth/);
  assert.match(catalog, /ncau-data-ai-newtongpt\/tree\/dev\/apps\/frontend\/packages\/okta-bff-auth/);
  assert.match(catalog, /id: PATTERN-01/);
  assert.match(catalog, /marketplace_path: plugins\/cdd-protected-source-delivery/);
  assert.match(catalog, /skill: apply-protected-source-delivery/);
  assert.match(catalog, /ncau-data-ai-newtongpt\/tree\/[0-9a-f]{40}/);
});

test('core exposes the Atlassian MCP for the metadata capability overview', () => {
  assert.ok(existsSync(join(root, 'plugins/cdd-core/.mcp.json')), 'core must provide the Atlassian MCP');
  const config = json('plugins/cdd-core/.mcp.json');
  assert.deepEqual(config.mcpServers.atlassian, {
    url: 'https://mcp.atlassian.com/v1/mcp',
    transport: 'http',
  });
  assert.doesNotMatch(JSON.stringify(config), /clientSecret|apiToken|password/i);
});

test('core catalog carries the exact install source for CDD component plugins', () => {
  const catalog = read('plugins/cdd-core/catalog/capabilities.yaml');
  const rootManifest = json('.devin-plugin/plugin.json');
  const source = catalog.match(/^plugin_source:\n  source: (.+)\n  url: (.+)\n  ref: (.+)$/m);
  assert.ok(source, 'core catalog must carry its own plugin source');
  for (const path of ['plugins/cdd-metadata-enrichment', 'plugins/cdd-braintrust-otel', 'plugins/cdd-okta-bff-auth', 'plugins/cdd-protected-source-delivery']) {
    const declarations = [...rootManifest.requiredPlugins, ...rootManifest.optionalPlugins];
    assert.ok(declarations.some((plugin) =>
      plugin.source === source[1] && plugin.url === source[2] && plugin.ref === source[3] && plugin.path === path
    ));
  }
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
  for (const [plugin, skill, agent, category, agentMarker] of [
    ['cdd-metadata-enrichment', 'integrate-metadata-enrichment', 'metadata-fit-reviewer', 'data', 'Metadata Enrichment fit reviewer'],
    ['cdd-braintrust-otel', 'assess-tracing', 'tracing-fit-reviewer', 'observe', 'name: tracing-fit-reviewer'],
    ['cdd-okta-bff-auth', 'integrate-okta-bff-auth', 'okta-bff-fit-reviewer', 'identity', 'name: okta-bff-fit-reviewer'],
    ['cdd-protected-source-delivery', 'apply-protected-source-delivery', 'source-delivery-fit-reviewer', 'security', 'name: source-delivery-fit-reviewer'],
  ]) {
    const manifest = json(`plugins/${plugin}/.devin-plugin/plugin.json`);
    assert.equal(manifest.name, plugin);
    assert.ok(manifest.keywords.includes(category));
    assert.match(read(`plugins/${plugin}/skills/${skill}/SKILL.md`), new RegExp(`name: ${skill}`));
    assert.ok(read(`plugins/${plugin}/agents/${agent}/AGENT.md`).includes(agentMarker));
  }
});

test('component advice remains candidate-only and trace-only where relevant', () => {
  assert.match(read('plugins/cdd-metadata-enrichment/agents/metadata-fit-reviewer/AGENT.md'), /candidate as production-approved/);
  const tracing = read('plugins/cdd-braintrust-otel/skills/assess-tracing/SKILL.md');
  assert.match(tracing, /candidate/);
  assert.match(tracing, /not OTel Metrics/);
  assert.match(tracing, /do not connect to Braintrust/i);
  assert.match(read('plugins/cdd-okta-bff-auth/agents/okta-bff-fit-reviewer/AGENT.md'), /candidate as production-approved/);
  const okta = read('plugins/cdd-okta-bff-auth/skills/integrate-okta-bff-auth/SKILL.md');
  assert.match(okta, /`candidate`/);
  assert.match(okta, /does not\*\* validate token signatures/);
  assert.match(okta, /Do not create or modify Okta applications/);
  assert.match(read('plugins/cdd-protected-source-delivery/agents/source-delivery-fit-reviewer/AGENT.md'), /draft pattern as production-approved/);
  const source = read('plugins/cdd-protected-source-delivery/skills/apply-protected-source-delivery/SKILL.md');
  assert.match(source, /`draft`/);
  assert.match(source, /not per-document entitlement/);
  assert.match(source, /Do not change buckets, IAM/);
});

test('root manifest wires CDD plugins to the requested repository branch', () => {
  const rootManifest = json('.devin-plugin/plugin.json');
  const has = (list, path) => list.some((ref) => ref?.source === 'git-subdir' && ref.url === registryUrl && ref.path === path && ref.ref === registryRef);
  assert.ok(has(rootManifest.requiredPlugins, 'plugins/cdd-core'));
  assert.ok(has(rootManifest.requiredPlugins, 'plugins/cdd-metadata-enrichment'));
  assert.ok(has(rootManifest.optionalPlugins, 'plugins/cdd-braintrust-otel'));
  assert.ok(has(rootManifest.optionalPlugins, 'plugins/cdd-okta-bff-auth'));
  assert.ok(has(rootManifest.optionalPlugins, 'plugins/cdd-protected-source-delivery'));
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
  for (const name of ['cdd-core', 'cdd-metadata-enrichment', 'cdd-braintrust-otel', 'cdd-okta-bff-auth', 'cdd-protected-source-delivery']) {
    assert.match(guide, new RegExp(name));
  }
  assert.match(guide, /ephie-w\/cdd-plugin/);
  assert.match(guide, /codex\/cdd-marketplace-import/);
  assert.match(guide, /push.*before.*install/i);
  assert.doesNotMatch(guide, /example\.invalid/);
});
