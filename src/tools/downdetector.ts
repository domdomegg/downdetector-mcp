import {z} from 'zod';
import {downdetector} from 'downdetector-api';
import {zodToJsonSchema} from 'zod-to-json-schema';

export const schema = z.object({
	serviceName: z.string().describe('The name of the service to check (e.g., "steam", "netflix", "twitter", "claude-ai")'),
	domain: z.string().optional().describe('Optional domain for the service (e.g., "co.uk", "it", "fr"). Try to use this if you know the country the user is based in. Default: "com"'),
});

export const tool = {
	name: 'downdetector',
	description: 'Get current status and outage reports for a service from Downdetector',
	inputSchema: zodToJsonSchema(schema),
};

export async function handler(args: z.infer<typeof schema>): Promise<{content: {type: 'text'; text: string}[]}> {
	try {
		const response = await downdetector(args.serviceName, args.domain);

		if (response.reports.length === 0 && response.baseline.length === 0) {
			return {
				content: [{
					type: 'text',
					text: `No report data available for ${args.serviceName}. Likely you've been blocked by Cloudflare rate-limiting.`,
				}],
			};
		}

		const latestReport = response.reports[response.reports.length - 1];
		const latestBaseline = response.baseline[response.baseline.length - 1];

		let statusText = `## ${args.serviceName.toUpperCase()} Status\n\n`;

		if (latestReport) {
			statusText += `**Current reports:** ${latestReport.value}\n`;
			statusText += `**Last updated:** ${new Date(latestReport.date).toLocaleString()}\n`;
		}

		if (latestBaseline) {
			statusText += `**Baseline:** ${latestBaseline.value}\n`;
		}

		if (response.reports.length > 0) {
			statusText += '\n### Recent Reports:\n';
			const recentReports = response.reports.slice(-10);
			recentReports.forEach((report) => {
				const date = new Date(report.date).toLocaleString();
				statusText += `- ${date}: ${report.value} reports\n`;
			});
		}

		return {
			content: [{
				type: 'text',
				text: statusText,
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Failed to get status for ${args.serviceName}: ${error instanceof Error ? error.message : String(error)}`,
			}],
		};
	}
}
