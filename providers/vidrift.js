/**
 * vidrift - Built from src/vidrift/
 * Generated: 2026-08-11T15:28:22.525Z
 */
var __defProp = Object.defineProperty;
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

// src/vidrift/index.js
var TOKEN_URL = "https://7movies.in/api/playback-token";
var PLAYER_URL = "https://embed.animecurx.tech";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var PLAYER_HEADERS = {
  Accept: "*/*",
  Origin: "https://7movies.in",
  Referer: `${PLAYER_URL}/`,
  "User-Agent": USER_AGENT
};
function getJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({ redirect: "follow" }, options));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function playbackToken(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    const result = yield getJson(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://7movies.in",
        Referer: "https://7movies.in/",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({
        tmdbId: Number(tmdbId),
        type,
        season: type === "tv" ? Number(season) : null,
        episode: type === "tv" ? Number(episode) : null
      })
    });
    return result && result.token;
  });
}
function sourcePath(tmdbId, type, season, episode) {
  if (type === "tv") {
    return `/api/source/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
  }
  return `/api/source/movie/${encodeURIComponent(tmdbId)}`;
}
function absolutePlayerUrl(value) {
  if (!value || typeof value !== "string")
    return null;
  if (/^https?:\/\//i.test(value))
    return value;
  return `${PLAYER_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
function parseMaster(master, masterUrl) {
  const lines = master.split(/\r?\n/);
  const streams = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith("#EXT-X-STREAM-INF:"))
      continue;
    const resolution = lines[index].match(/RESOLUTION=(\d+)x(\d+)/i);
    const bandwidth = lines[index].match(/BANDWIDTH=(\d+)/i);
    let next = index + 1;
    while (next < lines.length && (!lines[next].trim() || lines[next].startsWith("#")))
      next += 1;
    if (next >= lines.length)
      continue;
    const url = absolutePlayerUrl(lines[next].trim());
    if (!url)
      continue;
    streams.push({
      url,
      quality: resolution ? `${resolution[2]}p` : "Auto",
      bandwidth: bandwidth ? Number(bandwidth[1]) : 0
    });
  }
  if (!streams.length)
    streams.push({ url: masterUrl, quality: "Auto", bandwidth: 0 });
  return streams;
}
function resolveStreams(tmdbId, type, season, episode, token) {
  return __async(this, null, function* () {
    const path = sourcePath(tmdbId, type, season, episode);
    const source = yield getJson(
      `${PLAYER_URL}${path}?token=${encodeURIComponent(token)}&provider=vaplayer`,
      { headers: PLAYER_HEADERS }
    );
    if (!source || source.success !== true || !Array.isArray(source.streams))
      return [];
    const output = [];
    for (const item of source.streams) {
      const masterUrl = absolutePlayerUrl(item.proxyUrl || item.url);
      if (!masterUrl || item.type !== "hls")
        continue;
      try {
        const response = yield fetch(masterUrl, { headers: PLAYER_HEADERS, redirect: "follow" });
        if (!response.ok)
          continue;
        const master = yield response.text();
        if (!master.trimStart().startsWith("#EXTM3U"))
          continue;
        for (const variant of parseMaster(master, masterUrl)) {
          const server = String(item.provider || source.source || "Earth");
          output.push({
            name: `VidRift - ${server}`,
            title: `VidRift \u2022 ${server} \u2022 ${variant.quality}`,
            url: variant.url,
            quality: variant.quality,
            language: "en",
            type: "application/x-mpegurl",
            provider: "vidrift",
            headers: PLAYER_HEADERS,
            subtitles: [],
            _bandwidth: variant.bandwidth
          });
        }
      } catch (error) {
        console.warn(`[VidRift] Stream validation failed: ${error.message}`);
      }
    }
    return output;
  });
}
function getStreams(tmdbId, mediaType, season = null, episode = null) {
  return __async(this, null, function* () {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || type !== "movie" && type !== "tv")
      return [];
    if (type === "tv" && (!season || !episode))
      return [];
    try {
      const token = yield playbackToken(tmdbId, type, season, episode);
      if (!token)
        return [];
      const streams = yield resolveStreams(tmdbId, type, season, episode, token);
      const seen = /* @__PURE__ */ new Set();
      return streams.sort((left, right) => right._bandwidth - left._bandwidth).filter((stream) => {
        delete stream._bandwidth;
        if (seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[VidRift] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
