import { requestUrl, RequestUrlParam } from "obsidian";

export async function safeRequest(
	params: RequestUrlParam,
	maxRetries = 3
): Promise<{ status: number; json: any } | null> {
	let attempt = 0;
	let delay = 500;

	console.log(`Tome: requesting ${params.url}`);

	while (attempt <= maxRetries) {
		try {
			const res = await requestUrl({ ...params, throw: false });
			console.log(`Tome: response ${res.status} from ${params.url}`);
			if (res.status === 200) {
				return { status: res.status, json: safeParseJson(res.text) };
			}
			if (res.status === 429 || res.status >= 500) {
				const retryAfter = res.headers?.["retry-after"];
				const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
				await sleep(waitMs);
				delay *= 2;
				attempt++;
				continue;
			}
			// 4xx other than 429 - not retryable
			return { status: res.status, json: null };
		} catch (e) {
			console.error(`Tome: request threw for ${params.url}`, e);
			await sleep(delay);
			delay *= 2;
			attempt++;
		}
	}
	console.error(`Tome: giving up on ${params.url} after ${maxRetries} retries`);
	return null;
}

function safeParseJson(text: string): any {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isIsbn(query: string): string | null {
	const cleaned = query.replace(/[-\s]/g, "");
	if (/^(97[89])?\d{9}[\dXx]$/.test(cleaned)) return cleaned.toUpperCase();
	return null;
}