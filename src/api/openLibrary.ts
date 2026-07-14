import { BookRecord } from "../types";
import { limiters } from "./rateLimiter";
import { safeRequest, isIsbn } from "./httpUtil";

const BASE = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org/b";

export async function searchOpenLibrary(query: string): Promise<BookRecord[]> {
	const isbn = isIsbn(query);
	const url = isbn
		? `${BASE}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
		: `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,subtitle,author_name,isbn,publisher,first_publish_year,number_of_pages_median,subject,language,cover_i`;

	const res = await limiters.openLibrary.schedule(() =>
		safeRequest({ url, method: "GET" })
	);
	if (!res || !res.json) return [];

	if (isbn) {
		const entry = res.json[`ISBN:${isbn}`];
		if (!entry) return [];
		return [
			{
				title: entry.title,
				authors: (entry.authors ?? []).map((a: any) => a.name),
				isbn10: isbn.length === 10 ? isbn : undefined,
				isbn13: isbn.length === 13 ? isbn : undefined,
				publisher: entry.publishers?.[0]?.name,
				publishedDate: entry.publish_date,
				pageCount: entry.number_of_pages,
				subjects: (entry.subjects ?? []).map((s: any) => s.name).slice(0, 8),
				coverUrl: entry.cover?.large ?? entry.cover?.medium,
				sourceId: entry.key ?? isbn,
				source: "open-library",
			},
		];
	}

	const docs = res.json.docs ?? [];
	return docs.map((d: any) => ({
		title: d.title,
		subtitle: d.subtitle,
		authors: d.author_name ?? [],
		isbn10: (d.isbn ?? []).find((i: string) => i.length === 10),
		isbn13: (d.isbn ?? []).find((i: string) => i.length === 13),
		publisher: d.publisher?.[0],
		publishedDate: d.first_publish_year ? String(d.first_publish_year) : undefined,
		pageCount: d.number_of_pages_median,
		subjects: (d.subject ?? []).slice(0, 8),
		language: d.language?.[0],
		coverUrl: d.cover_i ? `${COVERS}/id/${d.cover_i}-L.jpg` : undefined,
		sourceId: d.key,
		source: "open-library" as const,
	}));
}
