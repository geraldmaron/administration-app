import { describe, expect, it } from "vitest";
import { NO_ENTITLEMENTS } from "@admin/player-core";
import { displayAttributes, mapSettingsOf, resolvedTheme } from "./display";
import { honoredEntitlement } from "./device-settings";

describe("the display settings on the root element", () => {
  it("leaves the standard look unmarked", () => {
    expect(displayAttributes({}, { firstSession: false, reducedMotion: false })).toEqual({
      "data-camera": "quick",
      "data-map-density": "standard",
      "data-contrast": undefined,
      "data-vision": undefined,
      "data-theme": "light",
    });
  });

  it("resolves System against the device and keeps an explicit choice", () => {
    expect(resolvedTheme("system", true)).toBe("dark");
    expect(resolvedTheme("system", false)).toBe("light");
    expect(resolvedTheme("light", true)).toBe("light");
    expect(resolvedTheme("dark", false)).toBe("dark");
  });

  it("paints with the boot hint until the stored theme arrives, then follows the stored one", () => {
    const options = { firstSession: false, reducedMotion: false, systemDark: false, themeHint: "dark" } as const;
    expect(displayAttributes({}, options)["data-theme"]).toBe("dark");
    expect(displayAttributes({ theme: "system" }, options)["data-theme"]).toBe("light");
  });

  it("marks high contrast, a color-vision palette, the density and the camera", () => {
    const attributes = displayAttributes({ highContrast: true, colorVision: "tritan", mapDensity: "bold", camera: "fly" }, { firstSession: false, reducedMotion: false });
    expect(attributes).toMatchObject({ "data-contrast": "high", "data-vision": "tritan", "data-map-density": "bold", "data-camera": "fly" });
  });

  it("cuts the camera under reduced motion whatever was chosen", () => {
    expect(displayAttributes({ camera: "fly" }, { firstSession: true, reducedMotion: true })["data-camera"]).toBe("cut");
  });
});

describe("the display settings as the map takes them", () => {
  it("draws the standard map on the defaults", () => {
    expect(mapSettingsOf({}, { firstSession: false, reducedMotion: false })).toEqual({ camera: "quick", density: "standard", highContrast: false, palette: "standard" });
  });

  it("turns every color-vision palette into the map's color-vision variant", () => {
    for (const colorVision of ["protan", "deutan", "tritan"] as const) {
      expect(mapSettingsOf({ colorVision }, { firstSession: false, reducedMotion: false }).palette).toBe("color-vision");
    }
    expect(mapSettingsOf({ colorVision: "standard" }, { firstSession: false, reducedMotion: false }).palette).toBe("standard");
  });

  it("carries density and contrast, and cuts the camera under reduced motion", () => {
    expect(mapSettingsOf({ mapDensity: "bold", highContrast: true, camera: "fly" }, { firstSession: false, reducedMotion: true })).toEqual({ camera: "cut", density: "bold", highContrast: true, palette: "standard" });
  });
});

describe("the entitlement the shell acts on", () => {
  it("honors a development grant only in a development build", () => {
    const dev = { godMode: true, source: "dev-override" } as const;
    expect(honoredEntitlement(dev, true)).toEqual(dev);
    expect(honoredEntitlement(dev, false)).toEqual(NO_ENTITLEMENTS);
  });

  it("passes a verified answer through in any build", () => {
    const verified = { godMode: true, source: "server" } as const;
    expect(honoredEntitlement(verified, false)).toEqual(verified);
  });
});
