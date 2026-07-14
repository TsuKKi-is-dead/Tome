import { BookRecord } from "../types";
import { limiters } from "./rateLimiter";
import { safeRequest, isIsbn } from "./httpUtil";

const BASE = "https://api.openalex.org/works";


export async function searchOpenAlex(
	query: string,
	mailto?: string
): Promise<BookRecord[]> {
	const isbn = isIsbn(query);
	const filter = isbn ? `filter=ids.isbn:${isbn}` : `search=${encodeURIComponent(query)}`;
	const politeParam = mailto ? `&mailto=${encodeURIComponent(mailto)}` : "";
	const url = `${BASE}?${filter}&per-page=10${politeParam}`;

	const res = await limiters.openAlex.schedule(() =>
		safeRequest({ url, method: "GET" })
	);
	if (!res || !res.json || !res.json.results) return [];

	return res.json.results
		.filter((r: any) => r.type === "book" || r.type === "book-chapter" || r.type === "monograph")
		.map((r: any) => ({
			title: r.title ?? r.display_name,
			authors: (r.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
			publisher: r.host_venue?.publisher ?? r.primary_location?.source?.host_organization_name,
			publishedDate: r.publication_year ? String(r.publication_year) : undefined,
			subjects: (r.concepts ?? []).slice(0, 8).map((c: any) => c.display_name),
			language: r.language,
			coverUrl: undefined,
			sourceId: r.id,
			source: "openalex" as const,
		}));
}
