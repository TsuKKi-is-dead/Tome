import { BookRecord } from "./types";

/** Escapes a value for safe use inside a YAML double-quoted string. */
function yamlEscape(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function listToYaml(items: string[] = []): string {
	return items.map((i) => `"${yamlEscape(i)}"`).join(", ");
}

export interface TemplateContext extends BookRecord {
	coverPath: string;
}

/**
 * Fills {{placeholder}} tokens in a template string with book metadata.
 * Runs BEFORE Templater processes the note (if Templater is installed), so users
 * can freely mix Tome placeholders with Templater's <% tp.* %> syntax in the same template -
 * Tome only touches its own {{...}} tokens and leaves everything else untouched.
 */
export function renderTemplate(template: string, ctx: TemplateContext): string {
	const values: Record<string, string> = {
		title: yamlEscape(ctx.title ?? ""),
		subtitle: yamlEscape(ctx.subtitle ?? ""),
		authors: listToYaml(ctx.authors),
		isbn: ctx.isbn13 ?? ctx.isbn10 ?? "",
		publisher: yamlEscape(ctx.publisher ?? ""),
		publishedDate: ctx.publishedDate ?? "",
		pageCount: ctx.pageCount ? String(ctx.pageCount) : "",
		language: ctx.language ?? "",
		subjects: listToYaml(ctx.subjects),
		coverPath: ctx.coverPath ?? "",
		status: ctx.status ?? "want-to-read",
		rating: ctx.rating !== undefined ? String(ctx.rating) : "",
		progress: ctx.progress !== undefined ? String(ctx.progress) : "0",
		dateAdded: ctx.dateAdded ?? new Date().toISOString().slice(0, 10),
		source: ctx.source ?? "",
		author: ctx.authors?.[0] ?? "Unknown",
	};

	return template.replace(/{{\s*([\w]+)\s*}}/g, (_match, key: string) => {
		return key in values ? values[key] : "";
	});
}

export function renderFileName(template: string, ctx: TemplateContext): string {
	const rendered = renderTemplate(template, ctx);
	return rendered.replace(/[\\/:*?"<>|]/g, "").trim();
}
