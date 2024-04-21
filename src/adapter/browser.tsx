import { Result } from "~/typings/utilities";
import { OpenedFile, SurrealistAdapter } from "./base";

/**
 * Surrealist adapter for running as web app
 */
export class BrowserAdapter implements SurrealistAdapter {

	public isServeSupported = false;
	public isPinningSupported = false;
	public isUpdateCheckSupported = false;
	public isPromotionSupported = true;

	public async setWindowTitle(title: string) {
		document.title = title;
	}

	public async loadConfig() {
		return localStorage.getItem("surrealist:config") || "{}";
	}

	public async saveConfig(config: string) {
		localStorage.setItem("surrealist:config", config);
	}

	public async startDatabase() {
		throw new Error("Not supported");
	}

	public async stopDatabase() {
		throw new Error("Not supported");
	}

	public async setWindowPinned() {
		throw new Error("Not supported");
	}

	public async openUrl(url: string) {
		window.open(url, '_blank');
	}

	public async saveFile(
		_title: string,
		defaultPath: string,
		_filters: any,
		content: () => Result<string | Blob | null>
	): Promise<boolean> {
		const result = await content();

		if (!result) {
			return false;
		}

		const file = (typeof result === 'string')
			? new File([result], '', { type: 'text/plain' })
			: result;
		
		const url = window.URL.createObjectURL(file);
		const el = document.createElement('a');

		el.style.display = 'none';
		document.body.append(el);

		el.href = url;
		el.download = defaultPath;
		el.click();

		window.URL.revokeObjectURL(url);
		el.remove();

		return true;
	}

	public async openFile(): Promise<OpenedFile[]> {
		const el = document.createElement('input');

		el.type = 'file';
		el.style.display = 'none';

		el.click();

		return new Promise((resolve, reject) => {
			el.addEventListener('change', async () => {
				const files = [...(el.files ?? [])];
				const tasks = files.map(async (file) => ({
					name: file.name,
					content: await file.text(),
				}));

				const results = await Promise.all(tasks);

				resolve(results);
			});

			el.addEventListener('error', async () => {
				reject(new Error('Failed to read file'));
			});
		});
	}

}
