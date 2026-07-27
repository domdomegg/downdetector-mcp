import {
	describe, test, expect, beforeEach, afterEach,
} from 'vitest';
import type {
	CallToolResult,
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {execSync, spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {server} from './server.js';

type MCPClient = {
	sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	close: () => Promise<void>;
};

/**
 * Creates an MCP client that communicates with a spawned process via stdin/stdout
 */
function createProcessBasedClient(
	serverProcess: ReturnType<typeof spawn>,
	cleanup?: () => void,
): MCPClient {
	let requestId = 1;

	const pendingRequests = new Map<string, {resolve: (value: any) => void; reject: (error: any) => void}>();

	// Handle server responses
	serverProcess.stdout?.on('data', (data) => {
		const lines = data.toString().split('\n').filter((line: string) => line.trim());

		for (const line of lines) {
			try {
				const response = JSON.parse(line);
				if (response.id && pendingRequests.has(response.id)) {
					const {resolve, reject} = pendingRequests.get(response.id)!;
					pendingRequests.delete(response.id);
					if ('result' in response) {
						resolve(response.result);
					} else if ('error' in response) {
						reject(new Error(response.error.message || 'Unknown error'));
					}
				}
			} catch {
				// Ignore non-JSON lines
			}
		}
	});

	const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
		return new Promise((resolve, reject) => {
			// eslint-disable-next-line no-plusplus
			const id = (requestId++).toString();
			const requestWithId = {...message, id};

			pendingRequests.set(id, {resolve: resolve as any, reject: reject as any});

			try {
				serverProcess.stdin?.write(`${JSON.stringify(requestWithId)}\n`);
			} catch (e: unknown) {
				pendingRequests.delete(id);
				reject(e instanceof Error ? e : new Error(String(e)));
			}

			// Timeout
			setTimeout(() => {
				if (pendingRequests.has(id)) {
					pendingRequests.delete(id);
					reject(new Error('Request timeout'));
				}
			}, 10_000);
		});
	};

	return {
		sendRequest,
		async close() {
			try {
				serverProcess.kill();
			} catch {
				// Process might already be dead
			}

			// Run any additional cleanup
			if (cleanup) {
				cleanup();
			}
		},
	};
}

/**
 * Main test suite that runs the same tests across different deployment methods
 */
describe.each([
	{
		name: 'InMemory Transport',
		condition: true,
		async createClient(): Promise<MCPClient> {
			const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
			await server.connect(serverTransport);

			const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
				return new Promise((resolve, reject) => {
					clientTransport.onmessage = (response: JSONRPCMessage) => {
						const typedResponse = response as JSONRPCResponse;
						if ('result' in typedResponse) {
							resolve(typedResponse.result as T);
							return;
						}

						reject(new Error('No result in response'));
					};

					clientTransport.onerror = (err: Error) => {
						reject(err);
					};

					clientTransport.send(message).catch((err: unknown) => {
						reject(err instanceof Error ? err : new Error(String(err)));
					});
				});
			};

			return {
				sendRequest,
				close: async () => server.close(),
			};
		},
	},
	{
		name: 'MCP Bundle',
		condition: process.env.RUN_MCPB_TEST,
		async createClient(): Promise<MCPClient> {
			// Build MCP Bundle if it doesn't exist
			if (!existsSync('downdetector-mcp.mcpb')) {
				execSync('./build-mcpb.sh', {stdio: 'inherit'});
			}

			// Extract MCP Bundle to test directory
			const testDir = 'test-mcpb-client';
			execSync(`rm -rf ${testDir}`);
			execSync(`mkdir -p ${testDir} && unzip -q downdetector-mcp.mcpb -d ${testDir}`);

			// Start the MCP server from the extracted MCP Bundle
			const serverProcess = spawn('node', [path.join(testDir, 'dist/index.js')], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {...process.env},
			});

			return createProcessBasedClient(
				serverProcess,
				() => {
					// Clean up test directory
					if (fs.existsSync(testDir)) {
						execSync(`rm -rf ${testDir}`);
					}
				},
			);
		},
	},
])('MCP Server Tests - $name', ({name, condition, createClient}) => {
	(condition ? describe : describe.skip)(`${name} Integration`, () => {
		let client: MCPClient;

		beforeEach(async () => {
			client = await createClient();
		}, 60_000);

		afterEach(async () => {
			if (client) {
				await client.close();
			}
		});

		test('should list available tools', async () => {
			const result = await client.sendRequest<ListToolsResult>({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/list',
				params: {},
			});

			expect(result.tools).toHaveLength(1);
			expect(result.tools[0].name).toBe('downdetector');
			expect(result.tools[0]).toMatchObject({
				name: expect.any(String),
				description: expect.any(String),
				inputSchema: expect.objectContaining({
					type: 'object',
				}),
			});
		}, 30_000);

		// Hits the real Downdetector API, so this asserts on the shape of the
		// response rather than specific report counts.
		//
		// Downdetector sits behind Cloudflare, which blocks shared CI egress: the
		// request either fails fast or hangs. Both outcomes skip rather than fail,
		// since neither says anything about the server. The race gives the request
		// a shorter deadline than the test itself so a hang skips instead of
		// blowing the test timeout.
		test('should get a service status via tools/call', async ({skip}) => {
			const TIMED_OUT = Symbol('timed-out');
			let timer: NodeJS.Timeout | undefined;

			const result = await Promise.race([
				client.sendRequest<CallToolResult>({
					jsonrpc: '2.0',
					id: '2',
					method: 'tools/call',
					params: {
						name: 'downdetector',
						arguments: {serviceName: 'steam'},
					},
				}),
				new Promise<typeof TIMED_OUT>((resolve) => {
					timer = setTimeout(() => {
						resolve(TIMED_OUT);
					}, 15_000);
				}),
			]).finally(() => {
				clearTimeout(timer);
			});

			if (result === TIMED_OUT) {
				skip('Downdetector did not respond in time (Cloudflare blocking CI egress)');
				return;
			}

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');

			const {text} = result.content[0] as {text: string};

			if (text.includes('No report data available') || text.startsWith('Failed to get status')) {
				skip('Downdetector unreachable from this network (Cloudflare)');
				return;
			}

			expect(result.isError).toBeFalsy();
			expect(text).toContain('STEAM Status');
			expect(text).toMatch(/\*\*Current reports:\*\* \d+/);
			expect(text).toContain('Recent Reports');
		}, 30_000);
	});
});
