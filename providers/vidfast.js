/**
 * vidfast - Built from src/vidfast/
 * Generated: 2026-08-11T04:10:43.160Z
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

// src/vidfast/index.js
var BASE_URL = "https://vidfast.vc";
var DECRYPT_URL = "https://enc-dec.app/api";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var BASE_HEADERS = {
  Accept: "*/*",
  Referer: `${BASE_URL}/`,
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest"
};
function request(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    return fetch(url, __spreadValues({ redirect: "follow" }, options));
  });
}
function getText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield request(url, options);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  });
}
function getJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield request(url, options);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function decrypt(text) {
  return __async(this, null, function* () {
    if (!text || !text.trim())
      return null;
    const payload = yield getJson(`${DECRYPT_URL}/dec-vidfast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({ text, version: "1" })
    });
    return payload && payload.status === 200 ? payload.result : null;
  });
}
function route(tmdbId, type, season, episode) {
  if (type === "tv") {
    return `/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}/`;
  }
  return `/movie/${encodeURIComponent(tmdbId)}/`;
}
function encodedToken(html) {
  const match = html.match(/\\?"en\\?"\s*:\s*\\?"([^"\\]+)\\?"/);
  return match && match[1] ? match[1] : null;
}
function subtitlesFrom(result) {
  if (!result || !Array.isArray(result.tracks))
    return [];
  const seen = /* @__PURE__ */ new Set();
  return result.tracks.filter((track) => {
    const url = track && (track.file || track.url);
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url))
      return false;
    seen.add(url);
    return true;
  }).map((track) => {
    const url = track.file || track.url;
    const label = String(track.label || track.language || track.lang || "Subtitle");
    const language = String(track.language || track.lang || label).toLowerCase();
    return { url, name: label, label, language, lang: language };
  });
}
function resolveServer(server, streamEndpoint, requestHeaders) {
  return __async(this, null, function* () {
    try {
      if (!server || !server.data)
        return null;
      const encrypted = yield getText(`${streamEndpoint}/${server.data}`, {
        method: "POST",
        headers: requestHeaders
      });
      const result = yield decrypt(encrypted);
      const url = result && result.url;
      if (!url || !/^https?:\/\//i.test(url))
        return null;
      const streamHeaders = {
        Referer: `${BASE_URL}/`,
        "User-Agent": USER_AGENT
      };
      let type = null;
      let quality = "Auto";
      if (/\.m3u8(?:$|[?#])/i.test(url)) {
        type = "application/x-mpegurl";
        const fromUrl = url.match(/(?:s|index-|_|-)(2160|1080|720|480|360)p/i);
        quality = fromUrl ? `${fromUrl[1]}p` : result["4kAvailable"] === true ? "2160p" : "Auto";
        if (String(server.name || "").toLowerCase() === "bravo") {
          const rangeResponse = yield request(url, {
            headers: __spreadProps(__spreadValues({}, streamHeaders), { Range: "bytes=0-" })
          });
          if (!rangeResponse.ok)
            return null;
        }
      } else if (/\.(?:mp4|mkv)(?:$|[?#])/i.test(url)) {
        type = "video";
        quality = result["4kAvailable"] || /4k/i.test(server.description || "") ? "2160p" : "1080p";
      } else {
        return null;
      }
      const name = String(server.name || "Default");
      return {
        name: `VidFast - ${name}`,
        title: `VidFast \u2022 ${name} \u2022 ${quality}`,
        url,
        quality,
        language: "en",
        type,
        provider: "vidfast",
        headers: streamHeaders,
        subtitles: subtitlesFrom(result)
      };
    } catch (error) {
      console.warn(`[VidFast] ${server && server.name ? server.name : "server"}: ${error.message}`);
      return null;
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
      const pagePath = route(tmdbId, type, season, episode);
      const html = yield getText(`${BASE_URL}${pagePath}`, { headers: BASE_HEADERS });
      const token = encodedToken(html);
      if (!token)
        return [];
      const configPayload = yield getJson(
        `${DECRYPT_URL}/enc-vidfast?text=${encodeURIComponent(token)}&version=1`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      const config = configPayload && configPayload.result;
      if (!config || !config.servers || !config.stream || !config.token)
        return [];
      const requestHeaders = __spreadProps(__spreadValues({}, BASE_HEADERS), {
        "X-CSRF-Token": config.token
      });
      const encryptedServers = yield getText(config.servers, {
        method: "POST",
        headers: requestHeaders
      });
      const servers = yield decrypt(encryptedServers);
      if (!Array.isArray(servers) || !servers.length)
        return [];
      console.log(`[VidFast] Resolving ${servers.length} servers`);
      const resolved = yield Promise.all(
        servers.map((server) => resolveServer(server, config.stream, requestHeaders))
      );
      const seen = /* @__PURE__ */ new Set();
      const streams = resolved.filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
      console.log(`[VidFast] Returning ${streams.length} streams`);
      return streams;
    } catch (error) {
      console.error(`[VidFast] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
