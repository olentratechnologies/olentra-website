import test from "node:test";
import assert from "node:assert/strict";
import { toEmbed } from "../src/lib/intern/video-embed.mjs";

test("YouTube links in every common form embed via youtube-nocookie", () => {
  const expected = { provider: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0" };
  for (const url of [
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtube.com/watch?v=aqz-KE-bpKQ&t=12s",
    "https://m.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtu.be/aqz-KE-bpKQ?si=abc",
    "https://www.youtube.com/shorts/aqz-KE-bpKQ",
    "https://www.youtube.com/embed/aqz-KE-bpKQ",
  ]) assert.deepEqual(toEmbed(url), expected, url);
});

test("Loom, Vimeo and Google Drive links embed with their players", () => {
  assert.deepEqual(toEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef"), { provider: "Loom", embedUrl: "https://www.loom.com/embed/0123456789abcdef0123456789abcdef" });
  assert.deepEqual(toEmbed("https://vimeo.com/76979871"), { provider: "Vimeo", embedUrl: "https://player.vimeo.com/video/76979871" });
  assert.deepEqual(toEmbed("https://player.vimeo.com/video/76979871"), { provider: "Vimeo", embedUrl: "https://player.vimeo.com/video/76979871" });
  assert.deepEqual(toEmbed("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing"), { provider: "Google Drive", embedUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview" });
  assert.deepEqual(toEmbed("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp"), { provider: "Google Drive", embedUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview" });
});

test("lookalike hosts, insecure links, odd ids and junk are never embedded", () => {
  for (const url of [
    "https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ",
    "https://evilyoutube.com/watch?v=aqz-KE-bpKQ",
    "http://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=<script>",
    "https://www.youtube.com/watch",
    "https://example.com/video.mp4",
    "not a url",
    "",
    null,
  ]) assert.equal(toEmbed(url), null, String(url));
});
