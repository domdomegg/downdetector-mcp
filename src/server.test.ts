import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, it, expect} from 'vitest';
import {server} from './server.js';

const {version: pkgVersion} = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {version: string};

describe('server', () => {
	it('reports the package.json version, not a hardcoded literal', () => {
		const {version} = (server as unknown as {_serverInfo: {version: string}})._serverInfo;
		expect(version).toBe(pkgVersion);
	});
});
