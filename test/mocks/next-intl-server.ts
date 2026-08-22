// next-intl/server's real implementation only works inside Next.js's RSC
// runtime (it checks for the "react-server" condition). Vitest runs plain
// Node, so importing it directly throws "getTranslations is not supported
// in Client Components." This lightweight stand-in resolves the same
// dot-path keys against the real locale files, so Server Actions under
// test get real English strings without needing the RSC runtime — mirrors
// the existing server-only mock in this same directory.
import en from "../../locales/en.json";

type Messages = Record<string, unknown>;

function resolve(messages: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Messages)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

function makeTranslator(namespace?: string) {
  const fn = (key: string, params?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const value = resolve(en as Messages, fullKey);
    return interpolate(value ?? fullKey, params);
  };
  fn.has = (key: string) => resolve(en as Messages, namespace ? `${namespace}.${key}` : key) !== undefined;
  return fn;
}

export async function getTranslations(namespace?: string) {
  return makeTranslator(namespace);
}

export async function getLocale() {
  return "en";
}

export async function getMessages() {
  return en;
}
