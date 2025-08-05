import * as downdetector from './downdetector.js';

export const tools: Record<string, {
	tool: {
		name: string;
		description: string;
		inputSchema: object;
	};
	schema: any;
	handler: (args: any) => Promise<{content: {type: 'text'; text: string}[]}>;
}> = {
	downdetector,
};
