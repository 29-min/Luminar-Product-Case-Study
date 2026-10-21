import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', '.next', 'out', '.git', 'test-results', 'playwright-report']);
const failures = [];
const patterns = [
    ['private key', /-----BEGIN (?:RSA )?PRIVATE KEY-----/],
    ['Google OAuth secret', /GOCSPX-[A-Za-z0-9_-]{10,}/],
    ['Google refresh token', /1\/\/[A-Za-z0-9_-]{15,}/],
    ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
    ['GitHub token', /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/],
];
const scanned = [];
async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(root, absolute);
        if (entry.isSymbolicLink()) { failures.push(`${relative}: unexpected symlink`); continue; }
        if (entry.isDirectory()) { await walk(absolute); continue; }
        if (/^\.env|client_secret|service-account|refresh-token/i.test(entry.name)) failures.push(`${relative}: credential-related filename`);
        if ((await stat(absolute)).size > 2_000_000 || /\.(?:png|jpe?g|ico)$/i.test(entry.name)) continue;
        const text = await readFile(absolute, 'utf8');
        scanned.push(relative);
        for (const [name, pattern] of patterns) if (pattern.test(text)) failures.push(`${relative}: ${name}`);
        if (/^(app|components|lib)\//.test(relative) && /(?:drive\.google\.com|googleapis\.com|googleusercontent\.com|process\.env\.)/.test(text)) failures.push(`${relative}: live-service reference`);
        if (/^(app|components|lib)\//.test(relative) && /fetch\(\s*['"`]https?:\/\//.test(text)) failures.push(`${relative}: remote network fetch`);
    }
}
await walk(root);
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if ('googleapis' in packageJson.dependencies) failures.push('package.json: Google SDK dependency');
for (const forbidden of ['app/api', 'app/map', 'lib/auth.ts', 'lib/drive.ts']) {
    try { await stat(forbidden); failures.push(`${forbidden}: operational code must be absent`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const readme = await readFile('README.md', 'utf8');
for (const match of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    try { await stat(target.split('#')[0]); } catch { failures.push(`README.md: missing linked file ${target}`); }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${scanned.length} text files; no credential patterns, live-service code, Map route, or broken README links found.`);
console.log('Scope: current public candidate files. This does not audit Git history, image rights, or guarantee absence of every possible secret.');
