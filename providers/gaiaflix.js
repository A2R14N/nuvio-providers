/**
 * gaiaflix - Built from src/gaiaflix/
 * Generated: 2026-08-11T17:44:02.213Z
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

// src/gaiaflix/index.js
var API_URL = "https://movie.streamrip.fun";
var API_KEY = "streamrip_secret_2026";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var HEADERS = {
  Accept: "*/*",
  Referer: `${API_URL}/`,
  "User-Agent": USER_AGENT
};
function absoluteUrl(value) {
  if (!value || typeof value !== "string")
    return null;
  if (/^https?:\/\//i.test(value))
    return value;
  return `${API_URL}/${value.replace(/^\/+/, "").replace(/^downloads\//, "")}`;
}
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || type !== "movie")
      return [];
    try {
      const url = `${API_URL}/api/source/${encodeURIComponent(tmdbId)}?api_key=${encodeURIComponent(API_KEY)}&apikey=${encodeURIComponent(API_KEY)}`;
      const response = yield fetch(url, { headers: HEADERS, redirect: "follow" });
      if (!response.ok)
        return [];
      const data = yield response.json();
      const items = Array.isArray(data && data.sources) ? data.sources.slice() : [];
      if (!items.length && data && data.m3u8_path) {
        items.push({ url: data.m3u8_path, quality: "1080p", type: "m3u8" });
      }
      const results = yield Promise.all(items.map((item, index) => __async(this, null, function* () {
        try {
          const streamUrl = absoluteUrl(item && item.url);
          if (!streamUrl || !/\.m3u8(?:$|[?#])/i.test(streamUrl))
            return null;
          const playlist = yield fetch(streamUrl, { headers: HEADERS, redirect: "follow" });
          if (!playlist.ok)
            return null;
          const text = yield playlist.text();
          if (!text.trimStart().startsWith("#EXTM3U") || !text.includes("#EXT-X-ENDLIST"))
            return null;
          const quality = /^\d{3,4}p$/i.test(item.quality || "") ? item.quality : "1080p";
          return {
            name: `Gaiaflix - Server ${index + 1}`,
            title: `Gaiaflix \u2022 Direct VOD \u2022 ${quality}`,
            url: streamUrl,
            quality,
            language: "en",
            type: "application/x-mpegurl",
            provider: "gaiaflix",
            headers: HEADERS,
            subtitles: []
          };
        } catch (_) {
          return null;
        }
      })));
      const seen = /* @__PURE__ */ new Set();
      return results.filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Gaiaflix] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
