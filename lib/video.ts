export type ParsedVideo =
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "file"; src: string };

export function parseVideoUrl(url: string): ParsedVideo {
  const youtube = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/,
  );
  if (youtube?.[1]) {
    return { kind: "youtube", src: `https://www.youtube.com/embed/${youtube[1]}` };
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo?.[1]) {
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }
  return { kind: "file", src: url };
}
