import { App, normalizePath, requestUrl } from "obsidian";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function downloadCover(
	app: App,
	url: string,
	folder: string,
	fileBaseName: string
): Promise<string | null> {
	try {
		await ensureFolder(app, folder);

		const res = await requestUrl({ url, method: "GET", throw: false });
		if (res.status !== 200) return null;

		const contentType = (res.headers?.["content-type"] ?? "").split(";")[0].trim();
		if (!VALID_IMAGE_TYPES.includes(contentType)) {
			console.warn(`Tome: refused to cache non-image response (${contentType}) from ${url}`);
			return null;
		}

		const ext = extensionFor(contentType);
		const safeName = sanitizeFileName(fileBaseName);
		const path = normalizePath(`${folder}/${safeName}.${ext}`);

		const existing = app.vault.getAbstractFileByPath(path);
		if (existing) return path; // already cached

		await app.vault.createBinary(path, res.arrayBuffer);
		return path;
	} catch (e) {
		console.error("Tome: cover download failed", e);
		return null;
	}
}

async function ensureFolder(app: App, folder: string) {
	const normalized = normalizePath(folder);
	if (!app.vault.getAbstractFileByPath(normalized)) {
		await app.vault.createFolder(normalized).catch(() => {
			/* race condition-safe: folder may have been created concurrently */
		});
	}
}

function extensionFor(contentType: string): string {
	switch (contentType) {
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		case "image/gif":
			return "gif";
		default:
			return "jpg";
	}
}

function sanitizeFileName(name: string): string {
	return name.replace(/[\\/:*?"<>|#^[\]]/g, "").trim().slice(0, 100);
}
