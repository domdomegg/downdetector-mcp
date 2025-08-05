declare module 'downdetector-api' {
	type Report = {
		date: string;
		value: number;
	};

	type DowndetectorResponse = {
		reports: Report[];
		baseline: Report[];
	};

	export function downdetector(serviceName: string, domain?: string): Promise<DowndetectorResponse>;
}
