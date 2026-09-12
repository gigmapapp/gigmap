import { parseVideoUrl } from "@/lib/video";

export default function VideoEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const parsed = parseVideoUrl(url);

  if (parsed.kind === "file") {
    return (
      <video
        className="aspect-video w-full rounded-xl bg-black object-cover"
        controls
        preload="metadata"
        playsInline
        src={parsed.src}
      >
        Your browser cannot play this clip.
      </video>
    );
  }

  return (
    <iframe
      className="aspect-video w-full rounded-xl bg-black"
      src={parsed.src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}
