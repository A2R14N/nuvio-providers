/**
 * vidnest - Built from src/vidnest/
 * Generated: 2026-08-11T02:00:12.447Z
 */
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vidnest/index.js
var API_BASE = "https://new.vidnest.fun/hollymoviehd";
var SITE_BASE = "https://vidnest.fun";
var CUSTOM_BASE64 = "RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function requestHeaders(referer = `${SITE_BASE}/`) {
  return { Accept: "*/*", Referer: referer, "User-Agent": USER_AGENT };
}
function decodePayload(input) {
  const values = {};
  for (let index = 0; index < CUSTOM_BASE64.length; index += 1)
    values[CUSTOM_BASE64[index]] = index;
  const bytes = [];
  for (let offset = 0; offset < input.length; offset += 4) {
    let block = input.slice(offset, offset + 4);
    while (block.length < 4)
      block += "=";
    const parts = block.split("").map((char) => values[char] === void 0 ? 64 : values[char]);
    bytes.push(parts[0] << 2 | parts[1] >> 4);
    if (parts[2] !== 64)
      bytes.push((parts[1] & 15) << 4 | parts[2] >> 2);
    if (parts[3] !== 64)
      bytes.push((parts[2] & 3) << 6 | parts[3]);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}
function quality(text) {
  let height = 0;
  for (const match of text.matchAll(/RESOLUTION=(\d+)x(\d+)/gi)) {
    height = Math.max(height, Math.min(Number(match[1]) || 0, Number(match[2]) || 0));
  }
  if (height >= 2e3)
    return "2160p";
  if (height >= 1e3)
    return "1080p";
  if (height >= 700)
    return "720p";
  if (height >= 470)
    return "480p";
  if (height >= 350)
    return "360p";
  return "Auto";
}
function validate(source) {
  return __async(this, null, function* () {
    try {
      const headers = requestHeaders(source.headers && source.headers.Referer);
      if (String(source.type).toLowerCase() === "mp4")
        headers.Range = "bytes=0-31";
      const response = yield fetch(source.url, { headers, redirect: "follow" });
      if (!response.ok)
        return null;
      if (String(source.type).toLowerCase() === "mp4") {
        const contentType = response.headers.get("content-type") || "";
        return response.status === 206 && /video\/mp4|application\/octet-stream/i.test(contentType) ? { type: "video/mp4", quality: source.quality || "Auto" } : null;
      }
      const playlist = yield response.text();
      return playlist.trimStart().startsWith("#EXTM3U") ? { type: "application/x-mpegurl", quality: quality(playlist) } : null;
    } catch (_) {
      return null;
    }
  });
}
function loadSubtitles(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = mediaType === "tv" ? `https://sub.vdrk.site/v2/tv/${encodeURIComponent(id)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}` : `https://sub.vdrk.site/v2/movie/${encodeURIComponent(id)}`;
      const response = yield fetch(url, { headers: requestHeaders() });
      if (!response.ok)
        return [];
      const entries = yield response.json();
      if (!Array.isArray(entries))
        return [];
      return entries.filter((entry) => entry && (entry.file || entry.url)).map((entry) => {
        const label = entry.display || entry.language || "Subtitle";
        const language = String(entry.language || label).toLowerCase();
        return { url: entry.file || entry.url, label, name: label, lang: language, language };
      });
    } catch (_) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season = null, episode = null) {
  return __async(this, null, function* () {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || type !== "movie" && type !== "tv")
      return [];
    if (type === "tv" && (!season || !episode))
      return [];
    const endpoint = type === "tv" ? `${API_BASE}/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}` : `${API_BASE}/movie/${encodeURIComponent(tmdbId)}`;
    try {
      const [response, subtitles] = yield Promise.all([
        fetch(endpoint, { headers: requestHeaders(), redirect: "follow" }),
        loadSubtitles(tmdbId, type, season, episode)
      ]);
      if (!response.ok)
        return [];
      const envelope = yield response.json();
      const payload = envelope.encrypted ? JSON.parse(decodePayload(envelope.data)) : envelope;
      if (!Array.isArray(payload.streams))
        return [];
      const checked = yield Promise.all(payload.streams.map((source) => __async(this, null, function* () {
        if (!source || !source.url || String(source.type).toLowerCase() !== "mp4")
          return null;
        const media = yield validate(source);
        if (!media)
          return null;
        const label = source.language || media.quality;
        return {
          name: `VidNest - ${label}`,
          title: `VidNest \u2022 ${label} \u2022 ${media.quality}`,
          url: source.url,
          quality: media.quality,
          language: "en",
          type: media.type,
          provider: "vidnest",
          headers: requestHeaders(source.headers && source.headers.Referer),
          subtitles
        };
      })));
      const seen = /* @__PURE__ */ new Set();
      return checked.filter((stream) => stream && !seen.has(stream.url) && seen.add(stream.url));
    } catch (_) {
      return [];
    }
  });
}
module.exports = { getStreams };
