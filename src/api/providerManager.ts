import { BookRecord } from "../types";
import { searchOpenLibrary } from "./openLibrary";
import { searchGoogleBooks } from "./googleBooks";
import { searchOpenAlex } from "./openAlex";
import { TomeSettings } from "../settings";

export type ProviderName = "open-library" | "google-books" | "openalex";

interface SearchCacheEntry {
	timestamp: number;
	results: BookRecord[];
}

export class ProviderManager {
	private cache = new Map<string, SearchCacheEntry>();
	private readonly cacheTtlMs = 5 * 60 * 1000;

	constructor(private settings: TomeSettings) {}

	async search(query: string): Promise<BookRecord[]> {
		const cacheKey = query.trim().toLowerCase();
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
			return cached.results;
		}

		const order = this.settings.providerOrder;
		let combined: BookRecord[] = [];

		for (const provider of order) {
			if (!this.settings.enabledProviders[provider]) continue;
			try {
				const results = await this.runProvider(provider, query);
				combined = this.mergeResults(combined, results);
			} catch (e) {
				console.error(`Tome: provider ${provider} failed`, e);
			}
			// Stop early once we have enough well-formed (with cover) results,
			// but still allow the loop to fill in covers for entries missing one.
			const wellFormedCount = combined.filter((b) => b.coverUrl).length;
			if (wellFormedCount >= 5 && combined.length >= 5) break;
		}

		// Final fallback pass: for any result still missing a cover, try to patch it in
		// from whichever provider we haven't exhausted yet, matched by ISBN.
		combined = await this.patchMissingCovers(combined);

		this.cache.set(cacheKey, { timestamp: Date.now(), results: combined });
		return combined;
	}

	private async runProvider(provider: ProviderName, query: string): Promise<BookRecord[]> {
		switch (provider) {
			case "open-library":
				return searchOpenLibrary(query);
			case "google-books":
				return searchGoogleBooks(query, this.settings.googleBooksApiKey || undefined);
			case "openalex":
				return searchOpenAlex(query, this.settings.contactEmail || undefined);
		}
	}

	private mergeResults(existing: BookRecord[], incoming: BookRecord[]): BookRecord[] {
		const merged = [...existing];
		for (const book of incoming) {
			const dupe = merged.find(
				(b) =>
					(book.isbn13 && b.isbn13 === book.isbn13) ||
					(book.isbn10 && b.isbn10 === book.isbn10) ||
					(b.title?.toLowerCase() === book.title?.toLowerCase() &&
						b.authors?.[0]?.toLowerCase() === book.authors?.[0]?.toLowerCase())
			);
			if (dupe) {
				// Fill in any gaps rather than dropping the new record
				dupe.coverUrl = dupe.coverUrl ?? book.coverUrl;
				dupe.description = dupe.description ?? book.description;
				dupe.pageCount = dupe.pageCount ?? book.pageCount;
				dupe.publisher = dupe.publisher ?? book.publisher;
				dupe.subjects = dupe.subjects?.length ? dupe.subjects : book.subjects;
			} else {
				merged.push(book);
			}
		}
		return merged;
	}

	private async patchMissingCovers(books: BookRecord[]): Promise<BookRecord[]> {
		const missing = books.filter((b) => !b.coverUrl && (b.isbn13 || b.isbn10));
		if (missing.length === 0) return books;

		for (const book of missing) {
			const isbn = book.isbn13 ?? book.isbn10!;
			if (this.settings.enabledProviders["open-library"] && book.source !== "open-library") {
				const res = await searchOpenLibrary(isbn);
				if (res[0]?.coverUrl) {
					book.coverUrl = res[0].coverUrl;
					continue;
				}
			}
			if (this.settings.enabledProviders["google-books"] && book.source !== "google-books") {
				const res = await searchGoogleBooks(isbn, this.settings.googleBooksApiKey || undefined);
				if (res[0]?.coverUrl) {
					book.coverUrl = res[0].coverUrl;
				}
			}
		}
		return books;
	}

	clearCache() {
		this.cache.clear();
	}
}
