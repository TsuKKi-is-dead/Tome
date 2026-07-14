import { BookRecord } from "../types";
import { limiters } from "./rateLimiter";
import { safeRequest, isIsbn } from "./httpUtil";

const BASE = "https://www.googleapis.com/books/v1/volumes";

export async function searchGoogleBooks(
	query: string,
	apiKey?: string
): Promise<BookRecord[]> {
	const isbn = isIsbn(query);
	const q = isbn ? `isbn:${isbn}` : query;
	const url = `${BASE}?q=${encodeURIComponent(q)}&maxResults=10${
		apiKey ? `&key=${apiKey}` : ""
	}`;

	const res = await limiters.googleBooks.schedule(() =>
		safeRequest({ url, method: "GET" })
	);
	if (!res || !res.json || !res.json.items) return [];

	return res.json.items.map((item: any) => {
		const info = item.volumeInfo ?? {};
		const isbns: Record<string, string> = {};
		(info.industryIdentifiers ?? []).forEach((id: any) => {
			if (id.type === "ISBN_10") isbns.isbn10 = id.identifier;
			if (id.type === "ISBN_13") isbns.isbn13 = id.identifier;
		});
		// Google serves covers over http by default; upgrade to https and request larger zoom
		let cover: string | undefined = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
		if (cover) cover = cover.replace(/^http:/, "https:").replace("zoom=1", "zoom=2");

		return {
			title: info.title,
			subtitle: info.subtitle,
			authors: info.authors ?? [],
			isbn10: isbns.isbn10,
			isbn13: isbns.isbn13,
			publisher: info.publisher,
			publishedDate: info.publishedDate,
			pageCount: info.pageCount,
			description: info.description,
			subjects: info.categories ?? [],
			language: info.language,
			coverUrl: cover,
			sourceId: item.id,
			source: "google-books" as const,
		};
	});
}
