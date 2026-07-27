import type {z} from 'zod';
import * as downdetector from './downdetector.js';

export type ToolModule = {
	tool: {
		name: string;
		description: string;
	};
	schema: z.AnyZodObject;
	handler: (args: any) => Promise<{content: {type: 'text'; text: string}[]}>;
};

export const tools: Record<string, ToolModule> = {
	downdetector,
};
