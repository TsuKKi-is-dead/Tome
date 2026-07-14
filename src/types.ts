export type ReadingStatus = "want-to-read" | "reading" | "read" | "dnf" | "on-hold";

export interface BookRecord {
	title: string;
	subtitle?: string;
	authors: string[];
	isbn10?: string;
	isbn13?: string;
	publisher?: string;
	publishedDate?: string;
	pageCount?: number;
	description?: string;
	subjects?: string[];
	language?: string;
	coverUrl?: string;
	sourceId: string; // provider-specific id, e.g. OL work id / Google volume id
	source: "open-library" | "google-books" | "openalex";
	// Populated after being saved as a note by the user
	rating?: number;
	status?: ReadingStatus;
	progress?: number; // pages read, or percent - user configurable meaning
	dateAdded?: string;
	dateStarted?: string;
	dateFinished?: string;
	localCoverPath?: string;
}

export interface SearchQuery {
	raw: string;
	isbn?: string;
	titleOrText?: string;
}

export interface ProviderResult {
	provider: BookRecord["source"];
	books: BookRecord[];
}
