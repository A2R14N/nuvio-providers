/**
 * vidrock - Built from src/vidrock/
 * Generated: 2026-08-11T16:33:04.695Z
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

// src/vidrock/index.js
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var API_BASES = [
  "https://showbox.filmu.in",
  "https://backend-api2-bxhuur-7f7bc0-15-235-147-53.sslip.io"
];
var API_KEY = "09eb429913afb6b1cc90f23746f41fb3279aed77726c625c40672b81444c0bac";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var API_HEADERS = {
  Accept: "application/json",
  Origin: "https://vidbolt.net",
  Referer: "https://vidbolt.net/",
  "User-Agent": USER_AGENT,
  "x-api-key": API_KEY
};
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
function apiPath(tmdbId, type, season, episode, info) {
  const id = info.imdbId || String(tmdbId);
  const params = [
    `tmdbId=${encodeURIComponent(tmdbId)}`,
    `title=${encodeURIComponent(info.title)}`,
    `year=${encodeURIComponent(info.year)}`
  ];
  if (type === "tv") {
    params.push(`season=${encodeURIComponent(season)}`);
    params.push(`episode=${encodeURIComponent(episode)}`);
  }
  return `/scrape/VidRock/${type}/${encodeURIComponent(id)}?${params.join("&")}`;
}
function sourceData(path) {
  return __async(this, null, function* () {
    let lastError = null;
    for (const base of API_BASES) {
      try {
        const data = yield getJson(`${base}${path}`, { headers: API_HEADERS });
        if (data && Array.isArray(data.sources))
          return data.sources;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError)
      throw lastError;
    return [];
  });
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
function qualityFromVariant(infoLine, url) {
  const pathQuality = String(url).match(/(?:^|\/)(2160|1440|1080|720|480|360|240)p?(?:\/|\.|$)/i);
  if (pathQuality)
    return `${pathQuality[1]}p`;
  const resolution = String(infoLine).match(/RESOLUTION=(\d+)x(\d+)/i);
  if (!resolution)
    return "Auto";
  const width = Number(resolution[1]);
  if (width >= 3800)
    return "2160p";
  if (width >= 1900)
    return "1080p";
  if (width >= 1270)
    return "720p";
  if (width >= 850)
    return "480p";
  if (width >= 630)
    return "360p";
  return `${resolution[2]}p`;
}
function variantsFromMaster(text, masterUrl) {
  const lines = text.split(/\r?\n/);
  const variants = [];
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
    if (!url)
      continue;
    const bandwidth = info.match(/BANDWIDTH=(\d+)/i);
    variants.push({
      url,
      quality: qualityFromVariant(info, url),
      bandwidth: bandwidth ? Number(bandwidth[1]) : 0
    });
  }
  return variants;
}
function resolveHls(source, headers) {
  return __async(this, null, function* () {
    const response = yield fetch(source.url, { headers, redirect: "follow" });
    if (!response.ok)
      return [];
    const text = yield response.text();
    if (!text.trimStart().startsWith("#EXTM3U"))
      return [];
    const variants = variantsFromMaster(text, source.url);
    if (variants.length)
      return variants;
    return text.includes("#EXT-X-ENDLIST") ? [{ url: source.url, quality: "Auto", bandwidth: 0 }] : [];
  });
}
function resolveMp4(source, headers) {
  return __async(this, null, function* () {
    const response = yield fetch(source.url, {
      headers: __spreadProps(__spreadValues({}, headers), { Range: "bytes=0-1" }),
      redirect: "follow"
    });
    const contentType = response.headers.get("content-type") || "";
    const range = response.headers.get("content-range") || "";
    if (!response.ok || response.status !== 206 && !range || !/(video|octet-stream)/i.test(contentType))
      return [];
    return [{ url: source.url, quality: /^\d{3,4}p$/i.test(source.quality || "") ? source.quality : "Auto" }];
  });
}
function resolveSource(source) {
  return __async(this, null, function* () {
    try {
      if (!source || !/^https?:\/\//i.test(source.url || ""))
        return [];
      const server = String(source.name || "Server").replace(/^VidRock\s*[•-]?\s*/i, "") || "Server";
      if (/^(nova|atlas)$/i.test(server))
        return [];
      const headers = __spreadValues({
        "User-Agent": USER_AGENT
      }, source.headers);
      const isHls = source.type === "m3u8" || /\.m3u8(?:$|[?#])/i.test(source.url);
      const isMp4 = source.type === "video" || /\.mp4(?:$|[?#])/i.test(source.url);
      const resolved = isHls ? yield resolveHls(source, headers) : isMp4 ? yield resolveMp4(source, headers) : [];
      return resolved.map((item) => ({
        name: `VidRock - ${server}`,
        title: `VidRock \u2022 ${server} \u2022 ${item.quality}`,
        url: item.url,
        quality: item.quality,
        language: /hindi/i.test(server) ? "hi" : "en",
        type: isHls ? "application/x-mpegurl" : "video/mp4",
        provider: "vidrock",
        headers,
        subtitles: [],
        _bandwidth: item.bandwidth || 0
      }));
    } catch (error) {
      console.warn(`[VidRock] ${source && source.name ? source.name : "server"}: ${error.message}`);
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
      const sources = yield sourceData(apiPath(tmdbId, type, season, episode, info));
      const groups = yield Promise.all(sources.map(resolveSource));
      const seen = /* @__PURE__ */ new Set();
      return groups.reduce((all, group) => all.concat(group), []).sort((left, right) => right._bandwidth - left._bandwidth).filter((stream) => {
        delete stream._bandwidth;
        if (seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[VidRock] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
