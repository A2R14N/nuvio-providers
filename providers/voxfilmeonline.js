/** VoxFilmeOnline - Nuvio provider bundle */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/voxfilmeonline/index.js
var index_exports = {};
__export(index_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(index_exports);

// src/shared/config.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";

// src/shared/tmdb.js
async function request(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `https://api.themoviedb.org/3/${path}${separator}api_key=${TMDB_API_KEY}`
  );
  if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
  return response.json();
}
async function resolveId(id, type) {
  const value = typeof id === "object" ? id.tmdbId || id.id : id;
  if (!String(value).startsWith("tt")) return value;
  const data = await request(`find/${value}?external_source=imdb_id`);
  const results = type === "movie" ? data.movie_results : data.tv_results;
  return results?.[0]?.id || null;
}
async function fetchTmdbDetails(id, type) {
  if (typeof id === "object" && id?.title) return id;
  try {
    const tmdbId = await resolveId(id, type);
    if (!tmdbId) return null;
    const endpoint = type === "movie" ? "movie" : "tv";
    const data = await request(`${endpoint}/${tmdbId}?append_to_response=translations`);
    const romanian = data.translations?.translations?.find(
      (translation) => translation.iso_639_1 === "ro"
    );
    const title = data.title || data.name;
    const titleRo = romanian?.data?.title || romanian?.data?.name || title;
    return {
      id: data.id,
      title,
      originalTitle: data.original_title || data.original_name || title,
      titleRo,
      roTitle: titleRo,
      romanianTitle: titleRo,
      year: (data.release_date || data.first_air_date || "").split("-")[0]
    };
  } catch (error) {
    console.error(`[TMDB] ${error.message}`);
    return null;
  }
}

// src/voxfilmeonline/http.js
var BASE_URL = "https://voxfilmeonline.biz";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
async function fetchText(url, referer = BASE_URL + "/") {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: referer,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${url}`);
  }
  return await response.text();
}

// src/shared/resolvers/filemoon.js
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function resolveFilemoon(embedUrl) {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT2,
        Referer: embedUrl
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m3u8Match = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
    if (m3u8Match) return m3u8Match[1];
    const packed = html.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\(([\s\S]*?)\)\)/);
    if (packed) {
      const unpackedM3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]+/i);
      if (unpackedM3u8) return unpackedM3u8[0];
    }
    return null;
  } catch (error) {
    console.error(`[Filemoon] Resolution error: ${error.message}`);
    return null;
  }
}

// src/voxfilmeonline/extractor.js
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function extractYear(value) {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}
function scoreResult(text, href, titles, year) {
  const normalized = normalizeText(text);
  const normalizedHref = normalizeText(href);
  let score = 0;
  for (const title of titles) {
    const target = normalizeText(title);
    if (!target) continue;
    if (normalized.includes(target)) score = Math.max(score, 100);
    if (normalizedHref.includes(target)) score = Math.max(score, 90);
  }
  const resultYear = extractYear(text + " " + href);
  if (year && resultYear === String(year)) score += 30;
  else if (year && resultYear && resultYear !== String(year)) score -= 40;
  return score;
}
async function findMoviePage(mediaInfo) {
  const titles = Array.from(
    new Set(
      [
        mediaInfo.romanianTitle,
        mediaInfo.title,
        mediaInfo.originalTitle
      ].filter(Boolean)
    )
  );
  let bestResult = null;
  for (const title of titles) {
    try {
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const html = await fetchText(searchUrl);
      const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = linkRe.exec(html)) !== null) {
        const href = m[1];
        if (!href || !href.startsWith(BASE_URL + "/")) continue;
        const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const score = scoreResult(text, href, titles, mediaInfo.year);
        if (score > 0 && (!bestResult || score > bestResult.score)) {
          bestResult = { href, score };
        }
      }
      if (bestResult && bestResult.score >= 130) break;
    } catch (error) {
      console.warn(
        `[VoxFilmeOnline] Search failed for "${title}": ${error.message}`
      );
    }
  }
  return bestResult?.href || null;
}
function extractEmbedUrls(html) {
  const urls = /* @__PURE__ */ new Set();
  const normalizedHtml = html.replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'");
  const matches = normalizedHtml.matchAll(
    /<iframe[^>]+src=["']([^"']+)["']/gi
  );
  for (const match of matches) {
    let url = match[1].trim();
    if (url.startsWith("//")) url = "https:" + url;
    if (/^https?:\/\//i.test(url)) urls.add(url);
  }
  const knownHostRe = /https?:\/\/(?:filemoon\.(?:to|sx)|bazavox\.com|videomega\.co|vidmoly|vidara|voe\.sx)[^\s"'<>\\]+/gi;
  for (const match of normalizedHtml.matchAll(knownHostRe)) {
    let url = match[0].replace(/["'\\>].*$/, "");
    if (url.startsWith("//")) url = "https:" + url;
    urls.add(url);
  }
  return Array.from(urls);
}
function cleanMediaUrl(value) {
  return String(value || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
}
async function resolveVidmoly(embedUrl, pageUrl) {
  const html = await fetchText(embedUrl, pageUrl);
  const match = html.match(
    /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  ) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
  return match ? cleanMediaUrl(match[1]) : null;
}
async function resolveVidara(embedUrl) {
  const url = new URL(embedUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const filecode = parts[parts.length - 1];
  if (!filecode) return null;
  const response = await fetch(`${url.origin}/api/stream${url.search}`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: embedUrl,
      Origin: url.origin,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ filecode, device: "web" })
  });
  if (!response.ok) {
    throw new Error(`Vidara API returned HTTP ${response.status}`);
  }
  const data = await response.json();
  return data?.streaming_url ? cleanMediaUrl(data.streaming_url) : null;
}
function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const input = String(value).replace(/\s+/g, "").replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < input.length; index++) {
    const digit = alphabet.indexOf(input[index]);
    if (digit === -1) return null;
    buffer = buffer << 6 | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode(buffer >> bits & 255);
    }
  }
  return output;
}
function decodeVoeConfig(payload) {
  try {
    const rot13 = payload.replace(/[a-zA-Z]/g, (character) => {
      const start = character <= "Z" ? 65 : 97;
      return String.fromCharCode(
        (character.charCodeAt(0) - start + 13) % 26 + start
      );
    });
    const normalized = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"].reduce(
      (value, marker) => value.split(marker).join("_"),
      rot13
    );
    const firstPass = decodeBase64(normalized.split("_").join(""));
    if (!firstPass) return null;
    const shifted = Array.from(
      firstPass,
      (character) => String.fromCharCode(character.charCodeAt(0) - 3)
    ).join("");
    const json = decodeBase64(shifted.split("").reverse().join(""));
    return json ? JSON.parse(json) : null;
  } catch (_) {
    return null;
  }
}
async function resolveBazavox(embedUrl) {
  try {
    const html = await fetchText(embedUrl, embedUrl);
    if (!html) return null;
    const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/src\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
    return m ? cleanMediaUrl(m[1]) : null;
  } catch (e) {
    console.warn(`[VoxFilmeOnline] Bazavox resolve error: ${e.message}`);
  }
  return null;
}
async function resolveVoe(embedUrl, pageUrl) {
  let currentUrl = embedUrl;
  let html = await fetchText(currentUrl, pageUrl);
  const redirect = html.match(
    /window\.location\.href\s*=\s*["']([^"']+)["']/i
  );
  if (redirect) {
    currentUrl = redirect[1];
    html = await fetchText(currentUrl, embedUrl);
  }
  const configMatch = html.match(
    /<script\s+type=["']application\/json["']>\s*(\[[^\]]+\])\s*<\/script>/i
  );
  if (configMatch) {
    const values = JSON.parse(configMatch[1]);
    const config = values[0] ? decodeVoeConfig(values[0]) : null;
    const source = config && (config.source || config.direct_access_url || config.fallback);
    if (source && /^https?:\/\//i.test(source)) {
      return cleanMediaUrl(source);
    }
  }
  const direct = html.match(
    /(?:["']?hls["']?\s*:|file\s*:)\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  return direct ? cleanMediaUrl(direct[1]) : null;
}
async function resolveStreams(pageUrl) {
  const html = await fetchText(pageUrl);
  const embeds = extractEmbedUrls(html).sort((left, right) => {
    return Number(/vidmoly/i.test(right)) - Number(/vidmoly/i.test(left));
  });
  const streams = [];
  const seen = /* @__PURE__ */ new Set();
  for (const embedUrl of embeds) {
    try {
      let mediaUrl = null;
      let host = null;
      if (/vidmoly/i.test(embedUrl)) {
        mediaUrl = await resolveVidmoly(embedUrl, pageUrl);
        host = "Vidmoly";
      } else if (/filemoon\./i.test(embedUrl)) {
        mediaUrl = await resolveFilemoon(embedUrl);
        host = "FileMoon";
      } else if (/vidara/i.test(embedUrl)) {
        mediaUrl = await resolveVidara(embedUrl);
        host = "Vidara";
      } else if (/(?:^|\/\/)(?:www\.)?voe\./i.test(embedUrl)) {
        mediaUrl = await resolveVoe(embedUrl, pageUrl);
        host = "VOE";
      } else if (/hqq\.tv|waaw\.|netu\./i.test(embedUrl)) {
        continue;
      } else if (/bazavox\.com/i.test(embedUrl)) {
        mediaUrl = await resolveBazavox(embedUrl);
        host = "Bazavox";
      } else if (/videomega\.co/i.test(embedUrl)) {
        mediaUrl = await resolveVidmoly(embedUrl, pageUrl);
        host = "VideoMega";
      }
      if (!mediaUrl || seen.has(mediaUrl)) continue;
      if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(mediaUrl)) continue;
      seen.add(mediaUrl);
      const origin = new URL(embedUrl).origin;
      streams.push({
        name: "VoxFilmeOnline",
        title: `${host}[RO]`,
        url: mediaUrl,
        quality: "Auto",
        language: "ro",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${origin}/`,
          Origin: origin
        }
      });
    } catch (error) {
      console.warn(
        `[VoxFilmeOnline] ${embedUrl} could not be resolved: ${error.message}`
      );
    }
  }
  return streams;
}

// src/shared/streams.js
var DIRECT_MEDIA_RE = /(?:\.m3u8|\.mp4|\.mkv|\.mpd)(?:$|[?#])/i;
var DIRECT_ENDPOINT_RE = /\/(?:get_video|download|stream)(?:[/?#]|$)/i;
var EMBED_RE = /\/(?:e|embed|videoembed|player)\//i;
var DISABLED_HOST_RE = /(?:^|\.)(?:hqq\.tv|netu\.(?:ac|cc|io|me|tv)|waaw\.(?:to|tv)|yandexcdn\.com)$/i;
function isDirectMediaUrl(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  const url = value.trim();
  try {
    if (DISABLED_HOST_RE.test(new URL(url).hostname)) return false;
  } catch {
    return false;
  }
  if (!url || /(?:^|\.)youtube\.com|youtu\.be/i.test(url)) return false;
  if (/\/embed[-_.]?|embed_player\.php|\/videoembed\//i.test(url)) return false;
  if (EMBED_RE.test(url) && !DIRECT_MEDIA_RE.test(url)) return false;
  if (/cfglobalcdn\.com\/.*\/1606597200\//i.test(url)) return false;
  return DIRECT_MEDIA_RE.test(url) || DIRECT_ENDPOINT_RE.test(url);
}
function stringHeaders(headers) {
  if (!headers || typeof headers !== "object") return void 0;
  const normalized = {};
  Object.keys(headers).forEach((key) => {
    const value = headers[key];
    if (typeof value === "string" && value) normalized[key] = value;
  });
  return Object.keys(normalized).length ? normalized : void 0;
}
function normalizeStream(stream, defaults = {}) {
  if (!stream || !isDirectMediaUrl(stream.url)) return null;
  const url = stream.url.trim();
  const providerName = defaults.name || defaults.provider || "Provider";
  const name = String(stream.name || providerName).trim();
  const title = String(stream.title || name).trim();
  return {
    name,
    title,
    url,
    quality: String(stream.quality || "Auto"),
    language: String(stream.language || defaults.language || "ro"),
    ...stream.size ? { size: String(stream.size) } : {},
    ...stream.provider || defaults.provider ? { provider: String(stream.provider || defaults.provider) } : {},
    ...stream.type ? { type: String(stream.type) } : {},
    ...stringHeaders(stream.headers) ? { headers: stringHeaders(stream.headers) } : {}
  };
}
function finalizeStreams(streams, defaults = {}) {
  if (!Array.isArray(streams)) return [];
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const candidate of streams) {
    const stream = normalizeStream(candidate, defaults);
    if (!stream || seen.has(stream.url)) continue;
    seen.add(stream.url);
    result.push(stream);
  }
  return result;
}

// src/shared/provider.js
var DEFAULT_DIAGNOSTIC_URL = "https://www.google.com/favicon.ico";
function validRequest(id, type, season, episode, supportedTypes) {
  if (!id || !supportedTypes.includes(type)) return false;
  return type === "movie" || season != null && episode != null;
}
function diagnostic(name, url) {
  return {
    name: `${name} \u2014 ERROR`,
    title: "No streams available",
    url: url || DEFAULT_DIAGNOSTIC_URL,
    quality: "No streams available",
    language: ""
  };
}
function createProvider({
  name,
  supportedTypes,
  extract: extract2,
  diagnosticUrl
}) {
  return async function getStreams2(id, mediaType, season, episode) {
    const type = mediaType === "series" ? "tv" : mediaType;
    if (!validRequest(id, type, season, episode, supportedTypes)) return [];
    try {
      const streams = await extract2(id, type, season, episode);
      if (Array.isArray(streams) && streams.length) return streams;
      return [
        diagnostic(name, diagnosticUrl)
      ];
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`[${name}] ${message}`);
      return [diagnostic(name, diagnosticUrl)];
    }
  };
}

// src/voxfilmeonline/index.js
async function extract(tmdbId, mediaType) {
  if (!tmdbId || mediaType !== "movie") return [];
  try {
    const mediaInfo = await fetchTmdbDetails(tmdbId, mediaType);
    if (!mediaInfo) return [];
    const pageUrl = await findMoviePage(mediaInfo);
    if (!pageUrl) {
      console.log(
        `[VoxFilmeOnline] No result for ${mediaInfo.title} (${mediaInfo.year})`
      );
      return [];
    }
    console.log(`[VoxFilmeOnline] Matched page: ${pageUrl}`);
    return finalizeStreams(await resolveStreams(pageUrl), {
      name: "VoxFilmeOnline",
      provider: "voxfilmeonline"
    });
  } catch (error) {
    console.error(`[VoxFilmeOnline] Error: ${error.message}`);
    return [];
  }
}
var getStreams = createProvider({
  name: "VoxFilmeOnline",
  supportedTypes: ["movie"],
  extract
});
