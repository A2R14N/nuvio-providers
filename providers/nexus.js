/**
 * nexus - Built from src/nexus/
 * Generated: 2026-08-11T17:04:21.847Z
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

// src/nexus/index.js
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var API_URL = "https://box.filmu.in";
var API_KEY = "09eb429913afb6b1cc90f23746f41fb3279aed77726c625c40672b81444c0bac";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
function getJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({ redirect: "follow" }, options));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function mediaInfo(tmdbId, type) {
  return __async(this, null, function* () {
    const data = yield getJson(
      `${TMDB_API}/${type}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_KEY}&append_to_response=external_ids`,
      { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }
    );
    const date = type === "movie" ? data.release_date : data.first_air_date;
    return {
      title: data.title || data.name || "",
      year: String(date || "").split("-")[0],
      imdbId: data.external_ids && data.external_ids.imdb_id || data.imdb_id || ""
    };
  });
}
function scraperUrl(tmdbId, type, season, episode, info) {
  const id = info.imdbId || String(tmdbId);
  const params = [
    `title=${encodeURIComponent(info.title)}`,
    `tmdbId=${encodeURIComponent(tmdbId)}`,
    `imdbId=${encodeURIComponent(info.imdbId)}`,
    `year=${encodeURIComponent(info.year)}`
  ];
  if (type === "tv") {
    params.push(`season=${encodeURIComponent(season)}`);
    params.push(`episode=${encodeURIComponent(episode)}`);
  }
  return `${API_URL}/scrape/Vaplayer/${type}/${encodeURIComponent(id)}?${params.join("&")}`;
}
function queryValue(url, key) {
  const query = String(url).split("?")[1] || "";
  for (const pair of query.split("&")) {
    const separator = pair.indexOf("=");
    const name = separator < 0 ? pair : pair.slice(0, separator);
    if (decodeURIComponent(name) !== key)
      continue;
    try {
      return decodeURIComponent(separator < 0 ? "" : pair.slice(separator + 1));
    } catch (_) {
      return separator < 0 ? "" : pair.slice(separator + 1);
    }
  }
  return null;
}
function unwrap(source) {
  if (!source || !source.url)
    return null;
  if (!source.url.includes("/proxy/m3u8?")) {
    return /^https?:\/\//i.test(source.url) ? { url: source.url, headers: source.headers || {} } : null;
  }
  const url = queryValue(source.url, "url");
  if (!url || !/^https?:\/\//i.test(url))
    return null;
  const referer = queryValue(source.url, "referer");
  const origin = queryValue(source.url, "origin");
  const headers = { "User-Agent": USER_AGENT };
  if (referer)
    headers.Referer = referer;
  if (origin)
    headers.Origin = origin;
  return { url, headers };
}
function absoluteUrl(value, base) {
  if (!value || typeof value !== "string")
    return null;
  if (/^https?:\/\//i.test(value))
    return value;
  const origin = base.match(/^(https?:\/\/[^/]+)/i);
  if (!origin)
    return null;
  if (value.startsWith("/"))
    return `${origin[1]}${value}`;
  return `${base.slice(0, base.lastIndexOf("/") + 1)}${value.replace(/^\.\//, "")}`;
}
function variants(text, masterUrl) {
  const lines = text.split(/\r?\n/);
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const info = lines[index].trim();
    if (!info.startsWith("#EXT-X-STREAM-INF:"))
      continue;
    let next = index + 1;
    while (next < lines.length && (!lines[next].trim() || lines[next].trim().startsWith("#")))
      next += 1;
    if (next >= lines.length)
      continue;
    const url = absoluteUrl(lines[next].trim(), masterUrl);
    const resolution = info.match(/RESOLUTION=(\d+)x(\d+)/i);
    const bandwidth = info.match(/BANDWIDTH=(\d+)/i);
    if (url)
      output.push({
        url,
        quality: resolution ? `${resolution[2]}p` : "Auto",
        bandwidth: bandwidth ? Number(bandwidth[1]) : 0
      });
  }
  return output;
}
function resolveSource(source, index) {
  return __async(this, null, function* () {
    try {
      const direct = unwrap(source);
      if (!direct)
        return [];
      const headers = __spreadValues({ "User-Agent": USER_AGENT }, direct.headers);
      const response = yield fetch(direct.url, { headers, redirect: "follow" });
      if (!response.ok)
        return [];
      const text = yield response.text();
      if (!text.trimStart().startsWith("#EXTM3U"))
        return [];
      let streams = variants(text, direct.url);
      if (!streams.length && text.includes("#EXT-X-ENDLIST")) {
        streams = [{ url: direct.url, quality: source.quality || "Auto", bandwidth: 0 }];
      }
      const server = `Server ${index + 1}`;
      return streams.map((stream) => ({
        name: `Nexus - ${server}`,
        title: `Nexus \u2022 ${server} \u2022 ${stream.quality}`,
        url: stream.url,
        quality: stream.quality,
        language: "en",
        type: "application/x-mpegurl",
        provider: "nexus",
        headers,
        subtitles: [],
        _bandwidth: stream.bandwidth
      }));
    } catch (error) {
      console.warn(`[Nexus] Server ${index + 1}: ${error.message}`);
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
    try {
      const info = yield mediaInfo(tmdbId, type);
      const data = yield getJson(scraperUrl(tmdbId, type, season, episode, info), {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT, "x-api-key": API_KEY }
      });
      if (!data || !Array.isArray(data.sources))
        return [];
      const groups = yield Promise.all(data.sources.map(resolveSource));
      const seen = /* @__PURE__ */ new Set();
      return groups.reduce((all, group) => all.concat(group), []).sort((left, right) => right._bandwidth - left._bandwidth).filter((stream) => {
        delete stream._bandwidth;
        if (seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Nexus] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
