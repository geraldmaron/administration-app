// Save files in a browser: an export is a download, an import is the file
// picker. Electron hosts this same web export, so the desktop gets both.

/** Whether this host can hand a save to the player as a file and take one back. */
export const SAVE_FILES_SUPPORTED = true;

function fileName(name: string): string {
  const stem = name.trim().replace(/[^A-Za-z0-9._ -]+/g, "").replace(/\s+/g, "-").slice(0, 60);
  return `${stem || "administration"}.json`;
}

/** Hands the save to the browser as a download; the object URL is released once the click has been handed off. */
export async function writeSaveFile(name: string, text: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(name);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The text of a file the player picks, or undefined when they close the picker without one. */
export function readSaveFile(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return resolve(undefined);
      file.text().then(resolve, reject);
    });
    input.addEventListener("cancel", () => resolve(undefined));
    input.click();
  });
}
