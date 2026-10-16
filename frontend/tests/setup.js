/** Install DOM assertions and isolated origin storage for every Vitest module. */
import "@testing-library/jest-dom/vitest";
import { JSDOM } from "jsdom";

const storageWindow = new JSDOM("", { url: "https://writespace.test" }).window;

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storageWindow.localStorage,
});
