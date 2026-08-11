/**
 * ember - Built from src/ember/
 * Generated: 2026-08-11T17:38:03.175Z
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
  return new Promise((resolve2, reject) => {
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
    var step = (x) => x.done ? resolve2(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/ember/index.js
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var API_BASES = [
  "https://showbox.filmu.in",
  "https://backend-api2-bxhuur-7f7bc0-15-235-147-53.sslip.io"
];
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
function movieInfo(tmdbId) {
  return __async(this, null, function* () {
    const data = yield getJson(
      `${TMDB_API}/movie/${encodeURIComponent(tmdbId)}?api_key=${TMDB_KEY}&append_to_response=external_ids`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    return {
      title: data.title || "",
      year: String(data.release_date || "").split("-")[0],
      imdbId: data.external_ids && data.external_ids.imdb_id || data.imdb_id || ""
    };
  });
}
function path(tmdbId, info) {
  const id = info.imdbId || String(tmdbId);
  return `/scrape/FSonic/movie/${encodeURIComponent(id)}?tmdbId=${encodeURIComponent(tmdbId)}&title=${encodeURIComponent(info.title)}&year=${encodeURIComponent(info.year)}`;
}
function sources(route) {
  return __async(this, null, function* () {
    let lastError = null;
    for (const base of API_BASES) {
      try {
        const data = yield getJson(`${base}${route}`, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
            "x-api-key": API_KEY
          }
        });
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
function resolve(source, index) {
  return __async(this, null, function* () {
    try {
      if (!source || !/^https?:\/\//i.test(source.url || ""))
        return null;
      const headers = __spreadValues({ "User-Agent": USER_AGENT }, source.headers || {});
      const response = yield fetch(source.url, {
        headers: __spreadProps(__spreadValues({}, headers), { Range: "bytes=0-1" }),
        redirect: "follow"
      });
      const contentType = response.headers.get("content-type") || "";
      const contentRange = response.headers.get("content-range") || "";
      if (response.status !== 206 || !contentRange || !/(video\/mp4|octet-stream)/i.test(contentType))
        return null;
      const quality = /^\d{3,4}p$/i.test(source.quality || "") ? source.quality : "1080p";
      return {
        name: `Ember - Server ${index + 1}`,
        title: `Ember \u2022 Direct MP4 \u2022 ${quality}`,
        url: source.url,
        quality,
        language: "en",
        type: "video/mp4",
        provider: "ember",
        headers,
        subtitles: []
      };
    } catch (error) {
      console.warn(`[Ember] Server ${index + 1}: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || type !== "movie")
      return [];
    try {
      const info = yield movieInfo(tmdbId);
      if (!info.title)
        return [];
      const items = yield sources(path(tmdbId, info));
      const resolved = yield Promise.all(items.map(resolve));
      const seen = /* @__PURE__ */ new Set();
      return resolved.filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Ember] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
