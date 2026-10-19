import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const config: ForgeConfig = {
  packagerConfig: {
    name: "The Administration",
    executableName: "the-administration",
    asar: true,
    extraResource: [path.join(root, "../web/dist")],
    ignore: (file: string) => {
      if (file.includes("steam_appid.txt")) return true;
      if (file === "" || file === "/package.json") return false;
      if (file.startsWith("/dist")) return false;
      if (file.startsWith("/node_modules/steamworks.js")) return false;
      return true;
    },
  },
  makers: [
    new MakerZIP({}, ["darwin", "linux", "win32"]),
    new MakerDMG({}, ["darwin"]),
    new MakerSquirrel({ name: "TheAdministration" }, ["win32"]),
  ],
};

export default config;
