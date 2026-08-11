/**
 * 1embed - Built from src/1embed/
 * Generated: 2026-08-11T02:00:12.465Z
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

// src/1embed/index.js
var BASE_URL = "https://1embed.cc";
var SERVERS = [
  { id: "MAIN", endpoint: "/server/vidsrc" },
  { id: "VIDEASY", endpoint: "/server/videasy" },
  { id: "GOATED", endpoint: "/server/goated" },
  { id: "NEPT", endpoint: "/server/buke" },
  { id: "KAORI", endpoint: "/server/buke" }
];
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function headers(referer = `${BASE_URL}/`) {
  return { Accept: "*/*", Origin: BASE_URL, Referer: referer, "User-Agent": USER_AGENT };
}
function maxQuality(text) {
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
function normalizeSubtitles(entries) {
  if (!Array.isArray(entries))
    return [];
  return entries.filter((entry) => entry && (entry.url || entry.file)).map((entry) => {
    const label = entry.label || entry.display || entry.language || "Subtitle";
    const language = String(entry.language || label).toLowerCase();
    return { url: entry.url || entry.file, label, name: label, lang: language, language };
  });
}
function token(referer) {
  return __async(this, null, function* () {
    const response = yield fetch(`${BASE_URL}/api/token`, { headers: headers(referer) });
    if (!response.ok)
      return "";
    const payload = yield response.json();
    return payload && payload.token || "";
  });
}
function route(server, tmdbId, mediaType, season, episode, streamToken) {
  let url = `${BASE_URL}${server.endpoint}/id=${encodeURIComponent(tmdbId)}`;
  url += mediaType === "tv" ? `?s=${encodeURIComponent(season)}&e=${encodeURIComponent(episode)}&type=tv` : "?type=movie";
  return `${url}&title=&server=${server.id}&_st=${encodeURIComponent(streamToken)}`;
}
function resolveServer(server, tmdbId, mediaType, season, episode, streamToken, referer) {
  return __async(this, null, function* () {
    try {
      const requestHeaders = headers(referer);
      requestHeaders["X-Stream-Token"] = streamToken;
      const response = yield fetch(route(server, tmdbId, mediaType, season, episode, streamToken), {
        headers: requestHeaders,
        redirect: "follow"
      });
      if (!response.ok)
        return [];
      const payload = yield response.json();
      const url = payload && payload.streams && (payload.streams.proxy_m3u8 || payload.streams.raw_m3u8 || payload.streams.m3u8);
      if (payload.success === false || !url || payload.isIframe)
        return [];
      const mediaResponse = yield fetch(url, { headers: headers(referer), redirect: "follow" });
      if (!mediaResponse.ok)
        return [];
      const playlist = yield mediaResponse.text();
      if (!playlist.trimStart().startsWith("#EXTM3U"))
        return [];
      const quality = maxQuality(playlist);
      return [{
        name: `1Embed - ${server.id}`,
        title: `1Embed \u2022 ${server.id} \u2022 ${quality}`,
        url,
        quality,
        language: "en",
        type: "application/x-mpegurl",
        provider: "1embed",
        headers: headers(referer),
        subtitles: normalizeSubtitles(payload.subtitles)
      }];
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
    const referer = type === "tv" ? `${BASE_URL}/embed/tv/${tmdbId}/${season}/${episode}` : `${BASE_URL}/embed/movie/${tmdbId}`;
    try {
      const streamToken = yield token(referer);
      if (!streamToken)
        return [];
      const groups = yield Promise.all(SERVERS.map((server) => resolveServer(server, tmdbId, type, season, episode, streamToken, referer)));
      const seen = /* @__PURE__ */ new Set();
      return groups.flat().filter((stream) => stream && !seen.has(stream.url) && seen.add(stream.url));
    } catch (_) {
      return [];
    }
  });
}
module.exports = { getStreams };
