#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import {initServer, setupSignalHandlers, handleStartupError} from './transports/shared.js';

const transport = process.env.MCP_TRANSPORT || 'stdio';

async function main(): Promise<void> {
	const server = initServer();

	if (transport === 'stdio') {
		const stdioTransport = new StdioServerTransport();
		setupSignalHandlers(async () => {
			await server.close();
		});
		await server.connect(stdioTransport);
		console.error('MCP server running on stdio');
	} else if (transport === 'http') {
		const app = express();
		app.use(express.json());

		const httpTransport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});

		app.post('/mcp', async (req, res) => {
			await httpTransport.handleRequest(req, res, req.body);
		});

		const handleSessionRequest = (req: express.Request, res: express.Response) => {
			res.writeHead(405).end(JSON.stringify({
				jsonrpc: '2.0',
				error: {code: -32000, message: 'Method not allowed with stateless server'},
				id: null,
			}));
		};

		app.get('/mcp', handleSessionRequest);
		app.delete('/mcp', handleSessionRequest);

		await server.connect(httpTransport);

		const port = parseInt(process.env.PORT || '3000', 10);
		app.listen(port, () => {
			console.error(`MCP server running on http://localhost:${port}/mcp`);
		});

		setupSignalHandlers(async () => {
			await server.close();
		});
	} else {
		throw new Error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
	}
}

main().catch(handleStartupError);
