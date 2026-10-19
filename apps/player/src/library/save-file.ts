// Save files on iOS and Android need a document picker and a share sheet,
// which this build does not carry yet; the screen hides export and import
// here rather than offering a button that cannot work.

export const SAVE_FILES_SUPPORTED = false;

const UNAVAILABLE = "You can't export or import save files on this device yet. Your saves are still kept here on the device.";

export async function writeSaveFile(_name: string, _text: string): Promise<void> {
  throw new Error(UNAVAILABLE);
}

export async function readSaveFile(): Promise<string | undefined> {
  throw new Error(UNAVAILABLE);
}
