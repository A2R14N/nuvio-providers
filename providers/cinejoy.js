/**
 * cinejoy - Built from src/cinejoy/
 * Generated: 2026-08-11T14:53:57.487Z
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

// src/cinejoy/index.js
var CINEJOY_URL = "https://cinejoy.to";
var STREAM_API = "https://api.shegu.st";
var ENCDEC_API = "https://enc-dec.app/api";
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
var API_HEADERS = {
  Accept: "*/*",
  Origin: CINEJOY_URL,
  Referer: `${CINEJOY_URL}/`,
  "User-Agent": USER_AGENT
};
function cryptoApi() {
  const api = globalThis.crypto || typeof window !== "undefined" && window.crypto;
  if (!api || !api.subtle)
    throw new Error("Web Crypto is unavailable");
  return api;
}
function getJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({ redirect: "follow" }, options));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function getText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({ redirect: "follow" }, options));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  });
}
function pbkdf2(password, salt, length) {
  return __async(this, null, function* () {
    const api = cryptoApi();
    const key = yield api.subtle.importKey("raw", password, "PBKDF2", false, ["deriveBits"]);
    const bits = yield api.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 1 },
      key,
      length * 8
    );
    return new Uint8Array(bits);
  });
}
function rotl(value, shift) {
  return value << shift | value >>> 32 - shift;
}
function salsa208(block) {
  const x = new Uint32Array(block);
  for (let index = 0; index < 8; index += 2) {
    x[4] ^= rotl(x[0] + x[12] | 0, 7);
    x[8] ^= rotl(x[4] + x[0] | 0, 9);
    x[12] ^= rotl(x[8] + x[4] | 0, 13);
    x[0] ^= rotl(x[12] + x[8] | 0, 18);
    x[9] ^= rotl(x[5] + x[1] | 0, 7);
    x[13] ^= rotl(x[9] + x[5] | 0, 9);
    x[1] ^= rotl(x[13] + x[9] | 0, 13);
    x[5] ^= rotl(x[1] + x[13] | 0, 18);
    x[14] ^= rotl(x[10] + x[6] | 0, 7);
    x[2] ^= rotl(x[14] + x[10] | 0, 9);
    x[6] ^= rotl(x[2] + x[14] | 0, 13);
    x[10] ^= rotl(x[6] + x[2] | 0, 18);
    x[3] ^= rotl(x[15] + x[11] | 0, 7);
    x[7] ^= rotl(x[3] + x[15] | 0, 9);
    x[11] ^= rotl(x[7] + x[3] | 0, 13);
    x[15] ^= rotl(x[11] + x[7] | 0, 18);
    x[1] ^= rotl(x[0] + x[3] | 0, 7);
    x[2] ^= rotl(x[1] + x[0] | 0, 9);
    x[3] ^= rotl(x[2] + x[1] | 0, 13);
    x[0] ^= rotl(x[3] + x[2] | 0, 18);
    x[6] ^= rotl(x[5] + x[4] | 0, 7);
    x[7] ^= rotl(x[6] + x[5] | 0, 9);
    x[4] ^= rotl(x[7] + x[6] | 0, 13);
    x[5] ^= rotl(x[4] + x[7] | 0, 18);
    x[11] ^= rotl(x[10] + x[9] | 0, 7);
    x[8] ^= rotl(x[11] + x[10] | 0, 9);
    x[9] ^= rotl(x[8] + x[11] | 0, 13);
    x[10] ^= rotl(x[9] + x[8] | 0, 18);
    x[12] ^= rotl(x[15] + x[14] | 0, 7);
    x[13] ^= rotl(x[12] + x[15] | 0, 9);
    x[14] ^= rotl(x[13] + x[12] | 0, 13);
    x[15] ^= rotl(x[14] + x[13] | 0, 18);
  }
  for (let index = 0; index < 16; index += 1)
    block[index] = block[index] + x[index] >>> 0;
}
function blockMix(input, r) {
  const x = new Uint32Array(16);
  const output = new Uint32Array(input.length);
  x.set(input.subarray((2 * r - 1) * 16, 2 * r * 16));
  for (let index = 0; index < 2 * r; index += 1) {
    const offset = index * 16;
    for (let word = 0; word < 16; word += 1)
      x[word] ^= input[offset + word];
    salsa208(x);
    const destination = (index % 2 === 0 ? index / 2 : r + (index - 1) / 2) * 16;
    output.set(x, destination);
  }
  return output;
}
function bytesToWords(bytes) {
  const words = new Uint32Array(bytes.length / 4);
  for (let index = 0; index < words.length; index += 1) {
    const offset = index * 4;
    words[index] = (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] << 24) >>> 0;
  }
  return words;
}
function wordsToBytes(words) {
  const bytes = new Uint8Array(words.length * 4);
  for (let index = 0; index < words.length; index += 1) {
    const value = words[index];
    const offset = index * 4;
    bytes[offset] = value;
    bytes[offset + 1] = value >>> 8;
    bytes[offset + 2] = value >>> 16;
    bytes[offset + 3] = value >>> 24;
  }
  return bytes;
}
function scrypt(password, salt, n, r, p, length) {
  return __async(this, null, function* () {
    const blockBytes = 128 * r;
    const initial = yield pbkdf2(password, salt, p * blockBytes);
    for (let parallel = 0; parallel < p; parallel += 1) {
      const start = parallel * blockBytes;
      let x = bytesToWords(initial.subarray(start, start + blockBytes));
      const blockWords = x.length;
      const memory = new Uint32Array(n * blockWords);
      for (let index = 0; index < n; index += 1) {
        memory.set(x, index * blockWords);
        x = blockMix(x, r);
      }
      for (let index = 0; index < n; index += 1) {
        const integerOffset = (2 * r - 1) * 16;
        const selected = x[integerOffset] & n - 1;
        const memoryOffset = selected * blockWords;
        for (let word = 0; word < blockWords; word += 1)
          x[word] ^= memory[memoryOffset + word];
        x = blockMix(x, r);
      }
      initial.set(wordsToBytes(x), start);
    }
    return pbkdf2(password, initial, length);
  });
}
function leadingZeroBits(bytes) {
  let count = 0;
  for (const value of bytes) {
    if (value === 0) {
      count += 8;
      continue;
    }
    for (let mask = 128; mask && !(value & mask); mask >>= 1)
      count += 1;
    break;
  }
  return count;
}
function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1)
    binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}
function solveChallenge(challenge) {
  return __async(this, null, function* () {
    if (!challenge || !challenge.b || !challenge.s)
      throw new Error("Invalid challenge");
    const encoder = new TextEncoder();
    const saltSeed = encoder.encode(`pow2-salt|${challenge.s}|${challenge.b}`);
    const salt = new Uint8Array(yield cryptoApi().subtle.digest("SHA-256", saltSeed));
    for (let counter = 0; counter < 1e4; counter += 1) {
      const payload = encoder.encode(`pow2|${challenge.b}|${challenge.s}|${counter}`);
      const result = yield scrypt(payload, salt, challenge.n, challenge.r, challenge.p, 32);
      if (leadingZeroBits(result) >= challenge.d) {
        return base64Utf8(JSON.stringify(__spreadProps(__spreadValues({}, challenge), { c: counter })));
      }
    }
    throw new Error("Challenge limit exceeded");
  });
}
function metadata(tmdbId, type) {
  return __async(this, null, function* () {
    const endpoint = type === "tv" ? "tv" : "movie";
    return getJson(
      `${TMDB_API}/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_KEY}&append_to_response=external_ids`,
      { headers: { "User-Agent": USER_AGENT } }
    );
  });
}
function buildMediaUrl(info, tmdbId, type, server, season, episode) {
  const title = info.title || info.name || "";
  const date = info.release_date || info.first_air_date || "";
  const imdb = info.imdb_id || info.external_ids && info.external_ids.imdb_id || "";
  const params = [
    `title=${encodeURIComponent(title)}`,
    `type=${type === "tv" ? "series" : "movie"}`,
    `year=${encodeURIComponent(date.slice(0, 4))}`,
    `imdb=${encodeURIComponent(imdb)}`,
    `tmdb=${encodeURIComponent(tmdbId)}`,
    `server=${encodeURIComponent(server)}`
  ];
  if (type === "tv")
    params.push(`season=${encodeURIComponent(season)}`, `episode=${encodeURIComponent(episode)}`);
  return `${STREAM_API}/?${params.join("&")}`;
}
function collectUrls(value, output = []) {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value))
      output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value)
      collectUrls(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value))
      collectUrls(item, output);
  }
  return output;
}
function collectSubtitles(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value)
      collectSubtitles(item, output);
  } else if (value && typeof value === "object") {
    const url = value.url || value.file || value.src;
    if (typeof url === "string" && /\.(?:vtt|srt)(?:$|[?#])/i.test(url)) {
      const label = String(value.label || value.name || value.language || value.lang || `Subtitle ${output.length + 1}`);
      const language = String(value.language || value.lang || label || "und").toLowerCase();
      output.push({ url, name: label, label, language, lang: language });
    }
    for (const item of Object.values(value))
      collectSubtitles(item, output);
  }
  return output;
}
function validateStream(url) {
  return __async(this, null, function* () {
    const headers = { Referer: `${CINEJOY_URL}/`, Origin: CINEJOY_URL, "User-Agent": USER_AGENT };
    const response = yield fetch(url, { headers, redirect: "follow" });
    if (!response.ok)
      return null;
    const contentType = response.headers.get("content-type") || "";
    if (/\.m3u8(?:$|[?#])/i.test(url) || /mpegurl/i.test(contentType)) {
      const text = yield response.text();
      if (!text.trimStart().startsWith("#EXTM3U"))
        return null;
      return { type: "application/x-mpegurl", quality: "Auto", headers };
    }
    if (/\.(?:mp4|mkv)(?:$|[?#])/i.test(url) || /^video\//i.test(contentType)) {
      if (response.body && response.body.cancel)
        yield response.body.cancel();
      return { type: "video", quality: /2160|4k/i.test(url) ? "2160p" : "Auto", headers };
    }
    if (response.body && response.body.cancel)
      yield response.body.cancel();
    return null;
  });
}
function resolveServer(info, tmdbId, type, server, season, episode) {
  return __async(this, null, function* () {
    try {
      const mediaUrl = buildMediaUrl(info, tmdbId, type, server, season, episode);
      const encryptedResult = yield getJson(
        `${ENCDEC_API}/enc-cinejoy?url=${encodeURIComponent(mediaUrl)}`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (!encryptedResult || encryptedResult.status !== 200 || !encryptedResult.result)
        return [];
      const requestId = encryptedResult.result;
      const challenge = yield getJson(`${STREAM_API}/challenge?rid=${encodeURIComponent(requestId)}`, {
        headers: API_HEADERS
      });
      const attestation = yield solveChallenge(challenge);
      const encrypted = yield getText(`${STREAM_API}/${requestId}`, {
        headers: __spreadProps(__spreadValues({}, API_HEADERS), { "X-At": attestation })
      });
      const decryptedResult = yield getJson(`${ENCDEC_API}/dec-cinejoy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ text: encrypted })
      });
      if (!decryptedResult || decryptedResult.status !== 200 || !decryptedResult.result)
        return [];
      const urls = collectUrls(decryptedResult.result);
      const subtitleCandidates = collectSubtitles(decryptedResult.result);
      const subtitleUrls = urls.filter((url) => /\.(?:vtt|srt)(?:$|[?#])/i.test(url));
      const subtitleSeen = /* @__PURE__ */ new Set();
      const subtitles = subtitleCandidates.filter((subtitle) => {
        if (subtitleSeen.has(subtitle.url))
          return false;
        subtitleSeen.add(subtitle.url);
        return true;
      });
      for (const url of subtitleUrls) {
        if (subtitleSeen.has(url))
          continue;
        subtitleSeen.add(url);
        const label = `Subtitle ${subtitles.length + 1}`;
        subtitles.push({ url, name: label, label, language: "und", lang: "und" });
      }
      const mediaUrls = urls.filter((url) => !subtitleSeen.has(url));
      const streams = [];
      for (const url of mediaUrls) {
        const validation = yield validateStream(url);
        if (!validation)
          continue;
        streams.push({
          name: `Cinejoy - ${server}`,
          title: `Cinejoy \u2022 ${server} \u2022 ${validation.quality}`,
          url,
          quality: validation.quality,
          language: server === "Canaias" ? "pt" : server === "Sakura" ? "ja" : "en",
          type: validation.type,
          provider: "cinejoy",
          headers: validation.headers,
          subtitles
        });
      }
      return streams;
    } catch (error) {
      console.warn(`[Cinejoy] ${server}: ${error.message}`);
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
      const info = yield metadata(tmdbId, type);
      if (!info || !info.title && !info.name)
        return [];
      const serverResult = yield getJson(`${STREAM_API}/servers`, { headers: API_HEADERS });
      const supported = /* @__PURE__ */ new Set(["Lisbon", "Solara"]);
      const servers = (serverResult.servers || []).filter((server) => server && server.status === "ok" && supported.has(server.name)).map((server) => server.name);
      const resolved = [];
      for (const server of servers) {
        const streams = yield resolveServer(info, tmdbId, type, server, season, episode);
        resolved.push(...streams);
      }
      const seen = /* @__PURE__ */ new Set();
      return resolved.filter((stream) => {
        if (seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Cinejoy] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
