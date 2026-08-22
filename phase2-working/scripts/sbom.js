/**
 * SBOM Generator — Creates a CycloneDX-compatible Software Bill of Materials
 *
 * Run: node scripts/sbom.js
 * Output: sbom.json in the project root
 *
 * This is a lightweight generator that parses package.json + package-lock.json.
 * For production use, consider @cyclonedx/cyclonedx-npm or similar tools.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const OUTPUT = path.join(ROOT, 'sbom.json');

function generateSBOM() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const lock = JSON.parse(fs.readFileSync(LOCKFILE, 'utf-8'));

  const deps = [];
  const seen = new Set();

  // Build dependency list from lockfile
  for (const [name, info] of Object.entries(lock.packages || {})) {
    if (name === '') continue; // root package

    // Extract version from the lock entry
    const version = info.version || 'unknown';
    const resolved = info.resolved || '';
    const integrity = info.integrity || '';

    // Identify if it's direct or transitive
    const isDirect = !!(pkg.dependencies?.[name.replace(/^node_modules\//, '')] ||
      pkg.devDependencies?.[name.replace(/^node_modules\//, '')]);

    deps.push({
      name: name.replace(/^node_modules\//, ''),
      version,
      resolved,
      integrity,
      isDirect,
    });
    seen.add(name);
  }

  const sbom = {
    $schema: 'https://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${require('crypto').randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'rementally-sbom-generator', version: '1.0.0' }],
      component: {
        type: 'application',
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        licenses: [{ license: { id: 'MIT' } }],
      },
    },
    components: deps.map((d) => ({
      type: 'library',
      name: d.name,
      version: d.version,
      'bom-ref': d.name + '@' + d.version,
      evidence: d.isDirect
        ? { identity: { field: 'purl', value: `pkg:npm/${d.name}@${d.version}` } }
        : undefined,
    })),
    dependencies: deps.map((d) => ({
      ref: d.name + '@' + d.version,
      dependsOn: [],
    })),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(sbom, null, 2));
  console.log(`[SBOM] Generated ${OUTPUT} with ${deps.length} components`);
}

generateSBOM();
