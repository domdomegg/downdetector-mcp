import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerDowndetector} from './downdetector.js';

export function registerAll(server: McpServer): void {
	registerDowndetector(server);
}
