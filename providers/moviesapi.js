/**
 * moviesapi - Built from src/moviesapi/
 * Generated: 2026-08-11T02:53:31.268Z
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

// src/moviesapi/index.js
var BASE_URL = "https://moviesapi.to";
var FALLBACK_URL = "https://ww2.moviesapi.to";
var PLAYER_KEY = "3a67e8866ae1d2bb9e81fe7f73315a56eb3bdf5e3e755c7554c8be6910aa6b13";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var AES_KEY = "kiemtienmua911ca";
var AES_IV = "1234567890oiuytr";
var API_TIMEOUT_MS = 6500;
var MEDIA_TIMEOUT_MS = 5500;
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), timeoutMs))
  ]);
}
function headersFor(origin, referer, accept = "*/*") {
  return {
    Accept: accept,
    Origin: origin,
    Referer: referer,
    "User-Agent": USER_AGENT
  };
}
function fetchResponse(_0, _1) {
  return __async(this, arguments, function* (url, headers, timeoutMs = API_TIMEOUT_MS) {
    const response = yield withTimeout(fetch(url, {
      headers,
      redirect: "follow"
    }), timeoutMs);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response;
  });
}
function fetchJson(url, headers) {
  return __async(this, null, function* () {
    return (yield fetchResponse(url, headers)).json();
  });
}
function fetchText(_0, _1) {
  return __async(this, arguments, function* (url, headers, timeoutMs = API_TIMEOUT_MS) {
    return (yield fetchResponse(url, headers, timeoutMs)).text();
  });
}
function route(tmdbId, type, season, episode) {
  if (type === "tv") {
    return `tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
  }
  return `movie/${encodeURIComponent(tmdbId)}`;
}
function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) {
    throw new Error("Invalid encrypted response");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
function decryptPayload(payload) {
  return __async(this, null, function* () {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle)
      throw new Error("Web Crypto is unavailable");
    const encoder = new TextEncoder();
    const key = yield cryptoApi.subtle.importKey(
      "raw",
      encoder.encode(AES_KEY),
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const decrypted = yield cryptoApi.subtle.decrypt(
      { name: "AES-CBC", iv: encoder.encode(AES_IV) },
      key,
      hexToBytes(payload.trim())
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  });
}
function playerReference(value) {
  if (!value || typeof value !== "string")
    return null;
  try {
    const parsed = new URL(value);
    const id = parsed.hash.slice(1).split("&")[0];
    if (!id || !/^[\w-]+$/.test(id))
      return null;
    if (parsed.hostname === "flixcdn.cyou")
      return { id, host: "flixcdn.cyou", label: "Alpha" };
    if (parsed.hostname === "hd4u.sbs")
      return { id, host: "hd4u.sbs", label: "Beta" };
  } catch (_) {
    return null;
  }
  return null;
}
function subtitlesFrom(payload) {
  if (!payload || !Array.isArray(payload.subtitles))
    return [];
  const seen = /* @__PURE__ */ new Set();
  return payload.subtitles.filter((item) => {
    if (!item || !/^https?:\/\//i.test(item.url || "") || seen.has(item.url))
      return false;
    seen.add(item.url);
    return true;
  }).map((item) => {
    const label = String(item.label || item.language || "Subtitle");
    const language = String(item.language || label || "und").toLowerCase();
    return { url: item.url, name: label, label, language, lang: language };
  });
}
function bestRendition(playlist, masterUrl) {
  const lines = playlist.split(/\r?\n/);
  let best = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("#EXT-X-STREAM-INF:"))
      continue;
    const resolution = lines[index].match(/RESOLUTION=\d+x(\d+)/i);
    const height = resolution ? Number(resolution[1]) || 0 : 0;
    for (let next = index + 1; next < lines.length; next += 1) {
      const value = lines[next].trim();
      if (!value || value.startsWith("#"))
        continue;
      const url = new URL(value, masterUrl).href;
      if (!best || height > best.height)
        best = { url, height };
      break;
    }
  }
  return best;
}
function finiteVod(playlist) {
  if (!playlist.trimStart().startsWith("#EXTM3U") || !/#EXT-X-ENDLIST/i.test(playlist))
    return false;
  let duration = 0;
  for (const match of playlist.matchAll(/#EXTINF:([\d.]+)/gi))
    duration += Number(match[1]) || 0;
  return duration >= 300;
}
function validateHls(url, headers) {
  return __async(this, null, function* () {
    const master = yield fetchText(url, headers, MEDIA_TIMEOUT_MS);
    if (!master.trimStart().startsWith("#EXTM3U"))
      return null;
    const rendition = bestRendition(master, url);
    const media = rendition ? yield fetchText(rendition.url, headers, MEDIA_TIMEOUT_MS) : master;
    if (!finiteVod(media))
      return null;
    return rendition && rendition.height ? `${rendition.height}p` : "Auto";
  });
}
function resolveFallback(reference, subtitles) {
  return __async(this, null, function* () {
    try {
      const origin = `https://${reference.host}`;
      const requestHeaders = headersFor(origin, `${origin}/`);
      const endpoint = `${origin}/api/v1/video?id=${encodeURIComponent(reference.id)}&w=1920&h=1080&r=ww2.moviesapi.to`;
      const encrypted = yield fetchText(endpoint, __spreadProps(__spreadValues({}, requestHeaders), {
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      }));
      const payload = yield decryptPayload(encrypted);
      const url = payload && payload.cfNative;
      if (!url || !/^https?:\/\//i.test(url))
        return null;
      const quality = yield validateHls(url, requestHeaders);
      if (!quality)
        return null;
      return {
        name: `MoviesAPI - ${reference.label}`,
        title: `MoviesAPI \u2022 ${reference.label} \u2022 ${quality}`,
        url,
        quality,
        language: "en",
        type: "application/x-mpegurl",
        provider: "moviesapi",
        headers: requestHeaders,
        subtitles
      };
    } catch (_) {
      return null;
    }
  });
}
function loadFallback(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    const path = route(tmdbId, type, season, episode);
    const payload = yield fetchJson(`${FALLBACK_URL}/api/${path}`, headersFor(
      FALLBACK_URL,
      `${FALLBACK_URL}/${path}`,
      "application/json, text/plain, */*"
    ));
    const subtitles = subtitlesFrom(payload);
    const references = [payload.video_url, payload.upn_url].map(playerReference).filter(Boolean);
    return Promise.all(references.map((reference) => resolveFallback(reference, subtitles)));
  });
}
function loadNative(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    try {
      const path = route(tmdbId, type, season, episode);
      const referer = `${BASE_URL}/${path}`;
      const payload = yield fetchJson(`${BASE_URL}/api/vidora/v1/${path}`, __spreadProps(__spreadValues({}, headersFor(BASE_URL, referer, "application/json, text/plain, */*")), {
        "x-player-key": PLAYER_KEY
      }));
      if (!payload || !payload.result || !Array.isArray(payload.sources))
        return [];
      const results = yield Promise.all(payload.sources.map((source) => __async(this, null, function* () {
        try {
          const url = source && source.url;
          if (!url || !/^https?:\/\//i.test(url))
            return null;
          const streamHeaders = headersFor(BASE_URL, referer);
          const quality = yield validateHls(url, streamHeaders);
          if (!quality)
            return null;
          const subtitles = Array.isArray(source.tracks) ? source.tracks.filter((track) => track && /^https?:\/\//i.test(track.file || "")).map((track) => ({
            url: track.file,
            name: track.label || "Subtitle",
            label: track.label || "Subtitle",
            language: String(track.label || "und").toLowerCase(),
            lang: String(track.label || "und").toLowerCase()
          })) : [];
          return {
            name: "MoviesAPI - Vidora",
            title: `MoviesAPI \u2022 Vidora \u2022 ${quality}`,
            url,
            quality,
            language: "en",
            type: "application/x-mpegurl",
            provider: "moviesapi",
            headers: streamHeaders,
            subtitles
          };
        } catch (_) {
          return null;
        }
      })));
      return results.filter(Boolean);
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
    try {
      const [native, fallback] = yield Promise.all([
        loadNative(tmdbId, type, season, episode),
        loadFallback(tmdbId, type, season, episode).catch(() => [])
      ]);
      const seen = /* @__PURE__ */ new Set();
      return [...native, ...fallback].filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[MoviesAPI] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
