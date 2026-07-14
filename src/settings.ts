import { App, PluginSettingTab, Setting } from "obsidian";
import type TomePlugin from "./main";
import { ProviderName } from "./api/providerManager";

export interface TomeSettings {
	providerOrder: ProviderName[];
	enabledProviders: Record<ProviderName, boolean>;
	googleBooksApiKey: string;
	contactEmail: string; // used for OpenAlex "polite pool" - optional, speeds up their rate limit tier
	notesFolder: string;
	coversFolder: string;
	noteTemplate: string;
	fileNameTemplate: string;
	defaultStatus: string;
	openAfterCreate: boolean;
	cacheCoversLocally: boolean;
}

export const DEFAULT_SETTINGS: TomeSettings = {
	providerOrder: ["google-books", "openalex", "open-library"],
	enabledProviders: {
		"open-library": true,
		"google-books": true,
		openalex: false,
	},
	googleBooksApiKey: "",
	contactEmail: "",
	notesFolder: "Books",
	coversFolder: "Books/covers",
	fileNameTemplate: "{{title}} - {{author}}",
	openAfterCreate: true,
	cacheCoversLocally: true,
	defaultStatus: "want-to-read",
	noteTemplate: `---
title: "{{title}}"
subtitle: "{{subtitle}}"
author: [{{authors}}]
isbn: "{{isbn}}"
publisher: "{{publisher}}"
published: {{publishedDate}}
pages: {{pageCount}}
language: "{{language}}"
subjects: [{{subjects}}]
cover: "{{coverPath}}"
status: {{status}}
rating: {{rating}}
progress: {{progress}}
dateAdded: {{dateAdded}}
dateStarted:
dateFinished:
source: {{source}}
tags: [book]
---

![[{{coverPath}}|200]]

## Notes


## Highlights

`,
};

export class TomeSettingTab extends PluginSettingTab {
	plugin: TomePlugin;

	constructor(app: App, plugin: TomePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;

		containerEl.createEl("h2", { text: "Tome settings" });

		containerEl.createEl("h3", { text: "Providers" });

		new Setting(containerEl)
			.setName("Open Library")
			.setDesc("Free, no API key required. Primary source for cover images.")
			.addToggle((t) =>
				t.setValue(s.enabledProviders["open-library"]).onChange(async (v) => {
					s.enabledProviders["open-library"] = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Google Books")
			.setDesc("Works without a key, but adding one raises your rate limit.")
			.addToggle((t) =>
				t.setValue(s.enabledProviders["google-books"]).onChange(async (v) => {
					s.enabledProviders["google-books"] = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Google Books API key (optional)")
			.setDesc("Only used if you hit rate limits without one.")
			.addText((t) =>
				t.setValue(s.googleBooksApiKey).onChange(async (v) => {
					s.googleBooksApiKey = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("OpenAlex")
			.setDesc(
				"Metadata fallback for academic books/monographs. Rarely provides cover images."
			)
			.addToggle((t) =>
				t.setValue(s.enabledProviders["openalex"]).onChange(async (v) => {
					s.enabledProviders["openalex"] = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Contact email for OpenAlex polite pool")
			.setDesc("Optional. Gets you a faster, more reliable rate-limit tier on OpenAlex.")
			.addText((t) =>
				t.setValue(s.contactEmail).onChange(async (v) => {
					s.contactEmail = v.trim();
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Storage" });

		new Setting(containerEl)
			.setName("Notes folder")
			.setDesc("Where new book notes are created.")
			.addText((t) =>
				t.setValue(s.notesFolder).onChange(async (v) => {
					s.notesFolder = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Covers folder")
			.setDesc("Where downloaded cover images are cached locally.")
			.addText((t) =>
				t.setValue(s.coversFolder).onChange(async (v) => {
					s.coversFolder = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Cache covers locally")
			.setDesc(
				"Download covers into your vault instead of linking the remote URL. Recommended - keeps notes working offline and stable if a provider changes URLs."
			)
			.addToggle((t) =>
				t.setValue(s.cacheCoversLocally).onChange(async (v) => {
					s.cacheCoversLocally = v;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Note template" });

		new Setting(containerEl)
			.setName("File name template")
			.setDesc("Placeholders: {{title}}, {{author}}, {{isbn}}")
			.addText((t) =>
				t.setValue(s.fileNameTemplate).onChange(async (v) => {
					s.fileNameTemplate = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Note body template")
			.setDesc(
				"Full frontmatter + body template. Supports Tome placeholders below, and if Templater is installed, its syntax (<% tp... %>) will be processed after Tome fills in its own fields."
			)
			.addTextArea((t) => {
				t.setValue(s.noteTemplate).onChange(async (v) => {
					s.noteTemplate = v;
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = 18;
				t.inputEl.addClass("tome-template-textarea");
			});

		containerEl.createEl("p", {
			text: "Placeholders: {{title}} {{subtitle}} {{authors}} {{isbn}} {{publisher}} {{publishedDate}} {{pageCount}} {{language}} {{subjects}} {{coverPath}} {{status}} {{rating}} {{progress}} {{dateAdded}} {{source}}",
			cls: "setting-item-description",
		});
	}
}
