export function normalizeDisplayName(input: string) {
  return input.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}
