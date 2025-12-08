import {
	describe, test, expect, vi, beforeEach,
} from 'vitest';
import type {
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../server.js';

// Mock the downdetector-api module
vi.mock('downdetector-api', () => ({
	downdetector: vi.fn().mockResolvedValue({
		reports: [
			{date: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(), value: 2},
			{date: new Date(Date.now() - (60 * 60 * 1000)).toISOString(), value: 5},
			{date: new Date().toISOString(), value: 1},
		],
		baseline: [
			{date: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(), value: 1},
			{date: new Date(Date.now() - (60 * 60 * 1000)).toISOString(), value: 1},
			{date: new Date().toISOString(), value: 1},
		],
	}),
}));

describe('Downdetector Tool', () => {
	let sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	let cleanup: () => Promise<void>;

	beforeEach(async () => {
		const server = createServer();
		const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);

		sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
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

		cleanup = async () => server.close();
	});

	test('should handle valid service request', async () => {
		const result = await sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '1',
			method: 'tools/call',
			params: {
				name: 'downdetector',
				arguments: {serviceName: 'steam'},
			},
		});

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');

		const parsed = JSON.parse((result.content[0] as {type: 'text'; text: string}).text);
		expect(parsed.serviceName).toBe('steam');
		expect(parsed.recentReports).toBeDefined();
		expect(parsed.summary).toContain('STEAM Status');

		await cleanup();
	});

	test('should handle domain parameter', async () => {
		const result = await sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '1',
			method: 'tools/call',
			params: {
				name: 'downdetector',
				arguments: {serviceName: 'steam', domain: 'uk'},
			},
		});

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');

		const parsed = JSON.parse((result.content[0] as {type: 'text'; text: string}).text);
		expect(parsed.serviceName).toBe('steam');

		await cleanup();
	});
});
