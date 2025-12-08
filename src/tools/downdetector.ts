import {z} from 'zod';
import {downdetector} from 'downdetector-api';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';

const reportSchema = z.object({
	date: z.string(),
	value: z.number(),
});

const outputSchema = z.object({
	serviceName: z.string(),
	currentReports: z.number().optional(),
	lastUpdated: z.string().optional(),
	baseline: z.number().optional(),
	recentReports: z.array(reportSchema),
	summary: z.string(),
});

export function registerDowndetector(server: McpServer): void {
	server.registerTool(
		'downdetector',
		{
			title: 'Downdetector Status',
			description: 'Get current status and outage reports for a service from Downdetector',
			inputSchema: {
				serviceName: z.string().describe('The name of the service to check (e.g., "steam", "netflix", "twitter", "claude-ai")'),
				domain: z.string().optional().describe('Optional domain for the service (e.g., "co.uk", "it", "fr"). Try to use this if you know the country the user is based in. Default: "com"'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const response = await downdetector(args.serviceName, args.domain);

			if (response.reports.length === 0 && response.baseline.length === 0) {
				const result = outputSchema.parse({
					serviceName: args.serviceName,
					recentReports: [],
					summary: `No report data available for ${args.serviceName}. Likely you've been blocked by Cloudflare rate-limiting.`,
				});
				return jsonResult(result);
			}

			const latestReport = response.reports[response.reports.length - 1];
			const latestBaseline = response.baseline[response.baseline.length - 1];
			const recentReports = response.reports.slice(-10);

			let summary = `${args.serviceName.toUpperCase()} Status: `;
			if (latestReport) {
				summary += `${latestReport.value} reports as of ${new Date(latestReport.date).toLocaleString()}`;
			}

			if (latestBaseline) {
				summary += ` (baseline: ${latestBaseline.value})`;
			}

			const result = outputSchema.parse({
				serviceName: args.serviceName,
				currentReports: latestReport?.value,
				lastUpdated: latestReport?.date,
				baseline: latestBaseline?.value,
				recentReports,
				summary,
			});

			return jsonResult(result);
		},
	);
}
