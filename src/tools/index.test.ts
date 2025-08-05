import {
	describe, test, expect, vi,
} from 'vitest';
import * as downdetector from './downdetector.js';

// Mock the downdetector-api module
vi.mock('downdetector-api', () => ({
	default: vi.fn().mockResolvedValue({
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
	test('should handle valid service request', async () => {
		const result = await downdetector.handler({serviceName: 'steam'});

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');
		expect(result.content[0].text).toContain('STEAM Status');
		expect(result.content[0].text).toContain('Recent Reports');
	});

	test('should handle domain parameter', async () => {
		const result = await downdetector.handler({serviceName: 'steam', domain: 'uk'});

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');
		expect(result.content[0].text).toContain('STEAM Status');
	});

	test('should validate schema', () => {
		expect(() => downdetector.schema.parse({serviceName: 'steam'})).not.toThrow();
		expect(() => downdetector.schema.parse({serviceName: 'steam', domain: 'uk'})).not.toThrow();
		expect(() => downdetector.schema.parse({})).toThrow();
	});
});
