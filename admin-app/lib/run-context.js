/**
 * Shared run context for interactive CLI (e.g. "return to main menu").
 * Commands set returnToMainMenu when the user chooses ← Main menu in a sub-menu.
 */

export const runContext = { returnToMainMenu: false };

export function requestMainMenu() {
  runContext.returnToMainMenu = true;
}

export function clearMainMenuRequest() {
  runContext.returnToMainMenu = false;
}
