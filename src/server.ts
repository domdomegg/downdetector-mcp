import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll} from './tools/index.js';

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'downdetector-mcp',
		version: '1.0.1',
	});

	registerAll(server);

	return server;
}
