import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

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
