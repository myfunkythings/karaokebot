export type ParsedSongRequest = {
  rawText: string;
  artist: string | null;
  title: string | null;
  parseConfidence: "high" | "low";
};

const separators = [" - ", " — ", " – ", " / "];

export function parseSongRequest(rawInput: string): ParsedSongRequest {
  const rawText = rawInput.trim().replace(/\s+/g, " ");

  if (!rawText) {
    return {
      rawText,
      artist: null,
      title: null,
      parseConfidence: "low"
    };
  }

  for (const separator of separators) {
    if (rawText.includes(separator)) {
      const [artist, title] = rawText.split(separator, 2);
      if (artist && title) {
        return {
          rawText,
          artist: artist.trim(),
          title: title.trim(),
          parseConfidence: "high"
        };
      }
    }
  }

  return {
    rawText,
    artist: null,
    title: rawText,
    parseConfidence: "low"
  };
}
