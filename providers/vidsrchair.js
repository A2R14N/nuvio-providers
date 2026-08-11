/**
 * vidsrchair - Built from src/vidsrchair/
 * Generated: 2026-08-11T02:26:59.354Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/vidsrchair/index.js
var BASE_URL = "https://vidsrc.hair";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var API_TIMEOUT_MS = 6500;
var MEDIA_TIMEOUT_MS = 5500;
var RESOLVE_CONCURRENCY = 8;
function requestHeaders(referer, accept = "*/*") {
  return {
    Accept: accept,
    Origin: BASE_URL,
    Referer: referer || `${BASE_URL}/`,
    "User-Agent": USER_AGENT
  };
}
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), timeoutMs))
  ]);
}
function fetchText(_0, _1) {
  return __async(this, arguments, function* (url, referer, timeoutMs = API_TIMEOUT_MS, extraHeaders = {}) {
    const response = yield withTimeout(fetch(url, {
      headers: __spreadValues(__spreadValues({}, requestHeaders(referer)), extraHeaders),
      redirect: "follow"
    }), timeoutMs);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  });
}
function fetchJson(_0, _1) {
  return __async(this, arguments, function* (url, referer, timeoutMs = API_TIMEOUT_MS) {
    const response = yield withTimeout(fetch(url, {
      headers: requestHeaders(referer, "application/json, text/plain, */*"),
      redirect: "follow"
    }), timeoutMs);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function playerUrl(tmdbId, mediaType, season, episode) {
  if (mediaType === "tv") {
    return `${BASE_URL}/embed/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
  }
  return `${BASE_URL}/embed/movie/${encodeURIComponent(tmdbId)}`;
}
function extractConfig(html) {
  const match = html.match(/var\s+Q\s*=\s*(\{[^;]+\})\s*;/);
  if (!match)
    return null;
  try {
    const config = JSON.parse(match[1]);
    if (!config || !config.id || !config.t)
      return null;
    return config;
  } catch (_) {
    return null;
  }
}
function apiUrl(action, params) {
  const query = new URLSearchParams(__spreadValues({ a: action }, params));
  return `${BASE_URL}/api.php?${query.toString()}`;
}
function sourceParams(config) {
  return {
    type: config.type,
    id: config.id,
    s: String(config.s || 0),
    e: String(config.e || 0),
    t: config.t
  };
}
function loadServers(config, referer) {
  return __async(this, null, function* () {
    const payload = yield fetchJson(apiUrl("sources", sourceParams(config)), referer);
    return payload && payload.status === "ok" && Array.isArray(payload.servers) ? payload.servers.filter((server) => server && server.ref) : [];
  });
}
function loadSubtitles(config, referer) {
  return __async(this, null, function* () {
    try {
      const payload = yield fetchJson(apiUrl("subs", sourceParams(config)), referer);
      if (!payload || !Array.isArray(payload.subs))
        return [];
      return payload.subs.filter((subtitle) => subtitle && subtitle.ref).map((subtitle) => {
        const label = subtitle.label || subtitle.lang || "Subtitle";
        const language = String(subtitle.lang || label || "und").toLowerCase();
        return {
          url: apiUrl("sub", { ref: subtitle.ref }),
          label,
          name: label,
          lang: language,
          language
        };
      });
    } catch (_) {
      return [];
    }
  });
}
function maxQuality(playlist) {
  let height = 0;
  for (const match of playlist.matchAll(/RESOLUTION=\d+x(\d+)/gi)) {
    height = Math.max(height, Number(match[1]) || 0);
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
function bestRendition(playlist, masterUrl) {
  const lines = playlist.split(/\r?\n/);
  let best = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:"))
      continue;
    const resolution = line.match(/RESOLUTION=\d+x(\d+)/i);
    const height = resolution ? Number(resolution[1]) || 0 : 0;
    let url = "";
    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next].trim();
      if (!candidate || candidate.startsWith("#"))
        continue;
      url = new URL(candidate, masterUrl).href;
      break;
    }
    if (url && (!best || height > best.height))
      best = { url, height };
  }
  return best;
}
function isFiniteVod(playlist) {
  if (!/#EXT-X-ENDLIST/i.test(playlist))
    return false;
  let duration = 0;
  for (const match of playlist.matchAll(/#EXTINF:([\d.]+)/gi)) {
    duration += Number(match[1]) || 0;
  }
  return duration >= 300;
}
function streamLanguage(server) {
  const value = String(server.lang || "").trim().toLowerCase();
  if (!value || value === "original")
    return "und";
  return value.split(/\s+-\s+|\s+/)[0] || "und";
}
function serverLabel(server) {
  return String(server.name || "Server").replace(/^Server\s+/i, "").trim() || "Server";
}
function validateHls(url, referer) {
  return __async(this, null, function* () {
    if (/tiktoks\.animanga\.fun|tiktokcdn\.com/i.test(url))
      return null;
    const playlist = yield fetchText(url, referer, MEDIA_TIMEOUT_MS);
    if (!playlist.trimStart().startsWith("#EXTM3U"))
      return null;
    const rendition = bestRendition(playlist, url);
    const mediaPlaylist = rendition ? yield fetchText(rendition.url, referer, MEDIA_TIMEOUT_MS) : playlist;
    if (!mediaPlaylist.trimStart().startsWith("#EXTM3U") || !isFiniteVod(mediaPlaylist))
      return null;
    const quality = rendition && rendition.height ? `${rendition.height}p` : maxQuality(playlist);
    return { quality, type: "application/x-mpegurl" };
  });
}
function validateDash(url, referer) {
  return __async(this, null, function* () {
    const manifest = yield fetchText(url, referer, MEDIA_TIMEOUT_MS);
    if (!/<MPD(?:\s|>)/i.test(manifest))
      return null;
    return { quality: "Auto", type: "application/dash+xml" };
  });
}
function validateMp4(url, referer) {
  return __async(this, null, function* () {
    if (/\.mkv(?:$|[?#])/i.test(url))
      return null;
    const response = yield withTimeout(fetch(url, {
      headers: __spreadProps(__spreadValues({}, requestHeaders(referer)), { Range: "bytes=0-1" }),
      redirect: "follow"
    }), MEDIA_TIMEOUT_MS);
    if (!response.ok && response.status !== 206)
      return null;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const contentRange = response.headers.get("content-range");
    if (!contentRange && !contentType.startsWith("video/") && !/\.mp4(?:$|[?#])/i.test(response.url || url)) {
      return null;
    }
    return { quality: "Auto", type: "video/mp4" };
  });
}
function resolveServer(server, referer, subtitles) {
  return __async(this, null, function* () {
    try {
      const payload = yield fetchJson(apiUrl("play", { ref: server.ref }), referer);
      const url = payload && payload.url;
      if (!url || !/^https?:\/\//i.test(url))
        return null;
      const reportedType = String(payload.type || "").toLowerCase();
      let media;
      if (reportedType === "hls" || /\.m3u8?(?:$|[?#])|\/hls(?:\/|$)/i.test(url)) {
        media = yield validateHls(url, referer);
      } else if (reportedType === "dash" || /\.mpd(?:$|[?#])/i.test(url)) {
        media = yield validateDash(url, referer);
      } else if (reportedType === "mp4" || /\.mp4(?:$|[?#])/i.test(url)) {
        media = yield validateMp4(url, referer);
      } else {
        return null;
      }
      if (!media)
        return null;
      const label = serverLabel(server);
      return {
        name: `VidSrc Hair - ${label}`,
        title: `VidSrc Hair \u2022 ${label} \u2022 ${media.quality}`,
        url,
        quality: media.quality,
        language: streamLanguage(server),
        type: media.type,
        provider: "vidsrchair",
        headers: requestHeaders(referer),
        subtitles
      };
    } catch (_) {
      return null;
    }
  });
}
function mapConcurrent(items, limit, mapper) {
  return __async(this, null, function* () {
    const results = new Array(items.length);
    let cursor = 0;
    function worker() {
      return __async(this, null, function* () {
        while (cursor < items.length) {
          const index = cursor;
          cursor += 1;
          results[index] = yield mapper(items[index], index);
        }
      });
    }
    const count = Math.min(limit, items.length);
    yield Promise.all(Array.from({ length: count }, () => worker()));
    return results;
  });
}
function getStreams(tmdbId, mediaType, season = null, episode = null) {
  return __async(this, null, function* () {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || type !== "movie" && type !== "tv")
      return [];
    if (type === "tv" && (!season || !episode))
      return [];
    const referer = playerUrl(tmdbId, type, season, episode);
    try {
      const html = yield fetchText(referer, `${BASE_URL}/`);
      const config = extractConfig(html);
      if (!config || config.type !== type)
        return [];
      const [servers, subtitles] = yield Promise.all([
        loadServers(config, referer),
        loadSubtitles(config, referer)
      ]);
      if (!servers.length)
        return [];
      const resolved = yield mapConcurrent(
        servers,
        RESOLVE_CONCURRENCY,
        (server) => resolveServer(server, referer, subtitles)
      );
      const seen = /* @__PURE__ */ new Set();
      return resolved.filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[VidSrc Hair] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
