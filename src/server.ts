import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {tools} from './tools/index.js';

const {version} = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {version: string};

// Create the server
export const server = new McpServer({
	name: 'downdetector-mcp',
	version,
}, {
	capabilities: {
		tools: {},
	},
});

// Register the tools. McpServer validates arguments against inputSchema and
// wraps thrown errors into an isError response, so the handlers stay plain.
Object.values(tools).forEach((module) => {
	server.registerTool(module.tool.name, {
		description: module.tool.description,
		inputSchema: module.schema.shape,
	}, async (args: Record<string, unknown>) => module.handler(args));
});

// Error handling
process.on('SIGINT', async () => {
	await server.close();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await server.close();
	process.exit(0);
});
