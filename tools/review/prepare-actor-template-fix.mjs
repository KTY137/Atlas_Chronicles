// Temporary patch preparation; produces immutable source blobs, never updates refs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

const files = [];
const blobHash = text => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
function edit(path, expected, transform) {
  const before = fs.readFileSync(path, 'utf8');
  if (expected) assert.equal(blobHash(before), expected, `Unexpected baseline: ${path}`);
  const after = transform(before);
  assert.notEqual(after, before, `No change: ${path}`);
  fs.writeFileSync(path, after);
  files.push({ path, before: blobHash(before), after: blobHash(after) });
}
function once(text, before, after) {
  assert.equal(text.split(before).length, 2, `Expected exactly one match: ${before}`);
  return text.replace(before, after);
}
for (const [path, sha, before, after] of [
  ['packages/protocol/src/actors.ts', '272870d081a170b615018fa10cb3293d62e75a6c', 'maxProperties: 64', 'maxProperties: 512'],
  ['packages/protocol/src/figurantrag.ts', 'e71916e4c6ef213a5031315111425eeb0e389e90', 'maxProperties: 64', 'maxProperties: 512'],
  ['packages/protocol/src/gameplay.ts', '2f37c02fdd0a2f65b1e88a4d1f2b96944db198ed', 'maxProperties:128', 'maxProperties:512'],
]) edit(path, sha, text => once(text, before, after));
for (const version of [1, 2]) {
  edit(`packages/rules/schema/rule-package-v${version}.schema.json`, null, text => {
    assert.equal([...text.matchAll(/"maxProperties":\s*64/g)].length, 2);
    return text.replaceAll(/("maxProperties":\s*)64/g, '$1512');
  });
}
edit('packages/client/src/features/ActorWorkbench.tsx', '86c3e37bf922602b51e3110ac9cf2dcff957b750', text => {
  const start = text.indexOf('function ActorTemplateForm(');
  assert.ok(start >= 0);
  const end = text.indexOf('\n}', start) + 2;
  assert.ok(end > start);
  let form = text.slice(start, end);
  form = once(form,
    '  const [pin, setPin] = useState(original?.definition.package ?? rules.pin);\n  const pkg = rules.packages.find(p => p.id === pin.id && p.version === pin.version);\n  const [fields, setFields] = useState<Record<string, Scalar>>(original?.definition.fields ?? (pkg ? defaults(pkg.fields) : {}));',
    '  // Until values or a package are explicitly chosen, a new template follows\n  // the current campaign rules. Identity edits do not freeze stale rule defaults.\n  // Existing templates and edited values stay pinned: a refresh must not lose work.\n  const [ruleDraft, setRuleDraft] = useState<{ pin: RulesState["pin"]; fields: Record<string, Scalar> } | null>(\n    original ? { pin: original.definition.package, fields: original.definition.fields } : null);\n  const pin = ruleDraft?.pin ?? rules.pin;\n  const pkg = rules.packages.find(p => p.id === pin.id && p.version === pin.version);\n  const fields = ruleDraft?.fields ?? (pkg ? defaults(pkg.fields) : {});\n  const setFields = (values: Record<string, Scalar>) => setRuleDraft({ pin, fields: values });');
  form = once(form,
    '      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value)!; setPin({ id: p.id, version: p.version }); setFields(defaults(p.fields));',
    '      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value);\n      if (!p) return;\n      // Package identity and its values change together; no foreign skill keys survive.\n      setRuleDraft({ pin: { id: p.id, version: p.version }, fields: defaults(p.fields) });\n      task.setError(""); onDirty(true);');
  form = once(form,
    '{task.error ? <Notice error>{task.error} {t("Lade die Vorlage erneut, falls inzwischen eine neue Revision gespeichert wurde.")}</Notice> : null}',
    '{task.error ? <Notice error>{task.error}{original && task.status === 409 ? ` ${t("Lade die Vorlage erneut, falls inzwischen eine neue Revision gespeichert wurde.")}` : ""}</Notice> : null}');
  return text.slice(0, start) + form + text.slice(end);
});
for (const path of ['packages/client/test/actor-template-rules.test.ts', 'packages/server/test/large-actor-template.test.ts']) {
  files.push({ path, before: null, after: blobHash(fs.readFileSync(path, 'utf8')) });
}
fs.mkdirSync('.local', { recursive: true });
fs.writeFileSync('.local/actor-template-fix-files.json', JSON.stringify(files));
console.log(JSON.stringify(files, null, 2));
