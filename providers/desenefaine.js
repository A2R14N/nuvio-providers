/** Desenefaine - Nuvio provider bundle */
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

// src/desenefaine/index.js
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

// src/clicksud/http.js
var BASE_URL = "https://click-sud.pro";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};
async function fetchText(url, customHeaders = {}) {
  try {
    const response = await fetch(url, {
      headers: { ...HEADERS, ...customHeaders }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (e) {
    console.error(`[Clicksud] Fetch error for ${url}: ${e.message}`);
    return null;
  }
}

// src/clicksud/resolvers/vidoza.js
function normalizeEmbedUrl(input) {
  const url = new URL(input);
  const match = url.pathname.match(
    /\/(?:embed-)?([a-zA-Z0-9]+)(?:\.html)?\/?$/
  );
  if (!match) return input;
  return `${url.origin}/embed-${match[1]}.html`;
}
function parseQuality(value) {
  const match = String(value || "").match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
}
async function resolveVidoza(embedUrl) {
  try {
    const normalizedUrl = normalizeEmbedUrl(embedUrl);
    const html = await fetchText(normalizedUrl, {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
      Referer: normalizedUrl
    });
    if (!html) return null;
    const sources = [];
    const patterns = [
      /(?:file|src)\s*[:=,]?\s*["']([^"']+)["'][^}\]]*?\bres\s*[:=]\s*["']?([^"',}\]]+)/gi,
      /\bres\s*[:=]\s*["']?([^"',}\]]+)[^}\]]*?(?:file|src)\s*[:=,]?\s*["']([^"']+)["']/gi
    ];
    let match;
    while (match = patterns[0].exec(html)) {
      sources.push({ url: match[1], quality: parseQuality(match[2]) });
    }
    while (match = patterns[1].exec(html)) {
      sources.push({ url: match[2], quality: parseQuality(match[1]) });
    }
    if (!sources.length) {
      const direct = html.match(
        /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i
      );
      if (direct) sources.push({ url: direct[1], quality: 0 });
    }
    const playable = sources.map((source) => {
      let url = source.url.replace(/\\\//g, "/").replace(/&amp;/g, "&");
      if (url.startsWith("//")) url = `https:${url}`;
      else if (url.startsWith("/")) url = new URL(url, normalizedUrl).href;
      return { ...source, url };
    }).filter((source) => /^https?:\/\//i.test(source.url)).sort((left, right) => right.quality - left.quality);
    return playable[0]?.url || null;
  } catch (error) {
    console.error(`[Vidoza] Resolution error: ${error.message}`);
    return null;
  }
}

// src/desenefaine/extractors.js
var BASE_URL2 = "https://desenefaine.com";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
async function fetchHtml(url, customHeaders) {
  try {
    const response = await fetch(url, {
      headers: Object.assign(
        {
          "User-Agent": USER_AGENT,
          Referer: BASE_URL2 + "/"
        },
        customHeaders || {}
      )
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
      return null;
    }
    return text;
  } catch (e) {
    console.error(`[desenefaine] Fetch error for ${url}:`, e.message);
    return null;
  }
}
function decodeTid(tid) {
  if (!tid) return null;
  try {
    const reversed = tid.split("").reverse().join("");
    let decoded = "";
    for (let i = 0; i < reversed.length; i += 2) {
      decoded += String.fromCharCode(parseInt(reversed.substr(i, 2), 16));
    }
    decoded = decoded.replace(/&amp;/g, "&");
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}
function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function decryptFilemoonApi(playback) {
  try {
    const versionNum = parseInt(playback.version, 10);
    const idx1 = versionNum;
    const idx2 = 31 - versionNum;
    const keyPart1 = playback.key_parts[idx1 - 1];
    const keyPart2 = playback.key_parts[idx2 - 1];
    const b1 = base64UrlToBytes(keyPart1);
    const b2 = base64UrlToBytes(keyPart2);
    const keyBytes = new Uint8Array(b1.length + b2.length);
    keyBytes.set(b1, 0);
    keyBytes.set(b2, b1.length);
    const ivBytes = base64UrlToBytes(playback.iv);
    const payloadBytes = base64UrlToBytes(playback.payload);
    const cryptoObj = globalThis.crypto || typeof window !== "undefined" && window.crypto;
    const cryptoKey = await cryptoObj.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      cryptoKey,
      payloadBytes
    );
    const jsonStr = new TextDecoder().decode(decryptedBuffer);
    const data = JSON.parse(jsonStr);
    if (data.sources && data.sources.length > 0) {
      const best = data.sources[data.sources.length - 1];
      return best.url || best.file;
    }
  } catch (e) {
    console.error("[desenefaine] Filemoon AES-GCM error:", e.message);
  }
  return null;
}
async function decryptEmbed4MeApi(hexPayload) {
  if (!hexPayload || typeof hexPayload !== "string" || hexPayload.includes("error")) {
    return null;
  }
  try {
    const keyBytes = new TextEncoder().encode("kiemtienmua911ca");
    const ivBytes = new TextEncoder().encode("1234567890oiuytr");
    const cleanHex = hexPayload.trim();
    const payloadBytes = new Uint8Array(
      cleanHex.match(/[\da-f]{2}/gi).map((b) => parseInt(b, 16))
    );
    const cryptoObj = globalThis.crypto || typeof window !== "undefined" && window.crypto;
    const cryptoKey = await cryptoObj.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: "AES-CBC", iv: ivBytes },
      cryptoKey,
      payloadBytes
    );
    const jsonStr = new TextDecoder().decode(decryptedBuffer);
    const data = JSON.parse(jsonStr);
    return data.cfNative || data.source || data.file || null;
  } catch (e) {
    return null;
  }
}
async function resolveEmbedToRawM3u8(embedUrl) {
  if (!embedUrl) return null;
  if (embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) return embedUrl;
  try {
    if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
      const rawUrl = await resolveVidoza(embedUrl);
      if (rawUrl) return rawUrl;
    }
    if (embedUrl.includes("bysewihe") || embedUrl.includes("filemoon")) {
      let code = "";
      if (embedUrl.includes("/e/"))
        code = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
      if (code) {
        const urlObj = new URL(embedUrl);
        const apiUrl = `${urlObj.origin}/api/videos/${code}`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            Referer: embedUrl,
            Origin: urlObj.origin
          }
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.playback) {
            const rawM3u8 = await decryptFilemoonApi(json.playback);
            if (rawM3u8) {
              console.log(
                `[desenefaine] SUCCESS Extracted Filemoon raw .m3u8: ${rawM3u8}`
              );
              return rawM3u8;
            }
          }
        }
      }
    }
    if (embedUrl.includes("desenefaine.net")) {
      const pageHtml = await fetchHtml(embedUrl, {
        Referer: "https://desenefaine.com/"
      });
      if (pageHtml) {
        const m3u8Match = pageHtml.match(
          /["'](https?:\/\/[^"']+\.m3u8[^"']*)/i
        );
        if (m3u8Match) {
          console.log(
            `[desenefaine] SUCCESS Extracted desenefaine.net .m3u8: ${m3u8Match[1]}`
          );
          return m3u8Match[1];
        }
      }
    }
    let hashId = "";
    if (embedUrl.includes("#")) {
      hashId = embedUrl.split("#")[1];
    } else if (embedUrl.includes("/e/")) {
      hashId = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
    }
    if (hashId) {
      const urlObj = new URL(embedUrl);
      const apiUrl = `${urlObj.origin}/api/v1/video?id=${hashId}`;
      const apiRes = await fetch(apiUrl, {
        headers: { "User-Agent": USER_AGENT, Referer: embedUrl }
      });
      if (apiRes.ok) {
        const hexData = await apiRes.text();
        const rawM3u8 = await decryptEmbed4MeApi(hexData);
        if (rawM3u8) {
          console.log(`[desenefaine] SUCCESS Extracted raw .m3u8: ${rawM3u8}`);
          return rawM3u8;
        }
      }
    }
  } catch (e) {
  }
  return embedUrl;
}
async function extractEmbedsFromPage(html) {
  if (!html) return [];
  const initialEmbeds = /* @__PURE__ */ new Set();
  const isPlayableEmbed = (url) => {
    if (!url || typeof url !== "string") return false;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be"))
      return false;
    if (lower.includes("wp-json") || lower.includes("wp-content") || lower.includes("wp-includes"))
      return false;
    if (lower.endsWith(".js") || lower.includes(".js?") || lower.includes("loadermain") || lower.includes("googleapis.com"))
      return false;
    if (lower.includes("popads") || lower.includes("doubleclick") || lower.includes("adsterra") || lower.includes("popunder"))
      return false;
    return true;
  };
  const knownHosts = [
    "ok.ru",
    "filemoon",
    "streamtape",
    "vk.com",
    "vidoza",
    "videzz",
    "supervideo",
    "dood",
    "mixdrop",
    "upstream",
    "voe.sx",
    "streamwish",
    "mp4upload",
    "vidguard",
    "vid-guard",
    "vgembed",
    "vguard",
    "vsembed",
    "videasy",
    "embed4me",
    "player4me",
    "desenefaine.net",
    "bysewihe",
    "streamp2p",
    "seekstreaming",
    "seeksreaming",
    "embedseek",
    "p2pplay",
    "fileons",
    "lulu",
    "streamhub"
  ];
  const trembedRe = /(?:href|value|data-url|src)=["']([^"']*trembed=[^"']+)["']/gi;
  let trm;
  while ((trm = trembedRe.exec(html)) !== null) {
    let src = trm[1];
    if (src.startsWith("//")) src = "https:" + src;
    if (src.startsWith("/")) src = BASE_URL2 + src;
    initialEmbeds.add(src);
  }
  const tridMatch = html.match(/trid=(\d+)/i);
  const trtypeMatch = html.match(/trtype=(\d+)/i);
  if (tridMatch) {
    const trid = tridMatch[1];
    const trtype = trtypeMatch ? trtypeMatch[1] : "2";
    for (let i = 0; i <= 10; i++) {
      initialEmbeds.add(
        `${BASE_URL2}/?trembed=${i}&trid=${trid}&trtype=${trtype}`
      );
    }
  }
  const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
  rawUrls.forEach((url) => {
    let cleaned = url.replace(/['"\\>].*$/, "").replace(/&amp;/g, "&");
    const lower = cleaned.toLowerCase();
    if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(cleaned)) {
      initialEmbeds.add(cleaned);
    }
  });
  const embedUrls = /* @__PURE__ */ new Set();
  for (const url of Array.from(initialEmbeds)) {
    if (url.includes("trembed=") || url.includes("trid=") || url.includes("trhide=")) {
      try {
        const tidMatch = url.match(/tid=([a-f0-9]+)/i);
        if (tidMatch && tidMatch[1]) {
          const decodedUrl = decodeTid(tidMatch[1]);
          if (decodedUrl && isPlayableEmbed(decodedUrl)) {
            embedUrls.add(decodedUrl);
            continue;
          }
        }
        const trembedHtml = await fetchHtml(url);
        if (trembedHtml) {
          const respTidMatch = trembedHtml.match(/tid=([a-f0-9]+)/i);
          if (respTidMatch && respTidMatch[1]) {
            const decodedUrl = decodeTid(respTidMatch[1]);
            if (decodedUrl && isPlayableEmbed(decodedUrl)) {
              embedUrls.add(decodedUrl);
              continue;
            }
          }
          const iframeMatch = trembedHtml.match(/<iframe\s[^>]*(?:data-src|src)=["']([^"']+)["']/i);
          if (iframeMatch) {
            let iframeSrc = iframeMatch[1];
            if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;
            iframeSrc = iframeSrc.replace(/&amp;/g, "&");
            if (isPlayableEmbed(iframeSrc)) {
              embedUrls.add(iframeSrc);
            }
          }
          const tRawUrls = trembedHtml.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
          tRawUrls.forEach((rUrl) => {
            let cleaned = rUrl.replace(/['"\\>].*$/, "").replace(/&amp;/g, "&");
            const lower = cleaned.toLowerCase();
            if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(cleaned)) {
              embedUrls.add(cleaned);
            }
          });
        }
      } catch (e) {
      }
    } else {
      embedUrls.add(url.replace(/&amp;/g, "&"));
    }
  }
  const directStreams = [];
  for (const embedUrl of Array.from(embedUrls)) {
    const rawM3u8 = await resolveEmbedToRawM3u8(embedUrl);
    if (rawM3u8 && (rawM3u8.includes(".m3u8") || rawM3u8.includes(".mp4"))) {
      directStreams.push(rawM3u8);
    }
  }
  return directStreams;
}
function buildStreamObject(embedUrl, showTitle, season, episode, mediaType) {
  let serverName = "Direct Stream";
  const lower = embedUrl.toLowerCase();
  let targetOrigin = "https://desenefaine.com";
  if (lower.includes("embed4me") || lower.includes("player4me") || lower.includes("4meplayer")) {
    serverName = "Embed4Me";
    const originMatch = embedUrl.match(/^(https?:\/\/[^/]+)/i);
    targetOrigin = originMatch ? originMatch[1] : "https://player4me.embed4me.com";
  } else if (lower.includes("bysewihe") || lower.includes("filemoon") || lower.includes("sprintcdn") || lower.includes("r66nv9ed")) {
    serverName = "FileMoon";
    targetOrigin = "https://bysewihe.com";
  } else if (lower.includes("streamp2p") || lower.includes("p2pplay")) {
    serverName = "Streamp2p";
    targetOrigin = "https://streamp2p.p2pplay.online";
  } else if (lower.includes("seekstreaming") || lower.includes("seeksreaming") || lower.includes("embedseek")) {
    serverName = "SeekStreaming";
    targetOrigin = "https://seeksreaming.embedseek.com";
  } else if (lower.includes("vembed") || lower.includes("vsembed")) {
    serverName = "Vembed";
    targetOrigin = "https://vsembed.su";
  } else if (lower.includes("vidoza") || lower.includes("videzz")) {
    serverName = "Vidoza";
    targetOrigin = new URL(embedUrl).origin;
  }
  return {
    name: `Desenefaine - ${serverName}`,
    title: `Server ${serverName}`,
    url: embedUrl,
    quality: "1080p",
    language: "ro",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: `${targetOrigin}/`,
      Origin: targetOrigin
    }
  };
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

// src/desenefaine/index.js
var BASE_URL3 = "https://desenefaine.com";
function hasPlayerElements(html) {
  if (!html) return false;
  const lower = html.toLowerCase();
  return lower.includes("trembed=") || lower.includes("trid=") || lower.includes("<iframe") || lower.includes("player-option") || lower.includes("vsembed") || lower.includes("embed4me") || lower.includes("player4me") || lower.includes("desenefaine.net") || lower.includes("bysewihe");
}
function extractPageYear(html) {
  if (!html) return null;
  const patterns = [
    /"datePublished"\s*:\s*"(\d{4})/,
    /property="og:title"\s+content="[^"]*\((\d{4})\)/,
    /property="twitter:title"\s+content="[^"]*\((\d{4})\)/,
    /<title[^>]*>[^<]*\((\d{4})\)/,
    /(?:og:published_time|article:published_time)"\s+content="(\d{4})/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}
function isValidMoviePage(html, tmdbData) {
  if (!html || !hasPlayerElements(html)) return false;
  const pageYear = extractPageYear(html);
  if (tmdbData.year && pageYear && Math.abs(pageYear - tmdbData.year) > 1) {
    console.log(
      `[desenefaine] Rejecting wrong-year page: page year=${pageYear}, TMDB year=${tmdbData.year}`
    );
    return false;
  }
  return true;
}
async function extract(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  console.log(
    `[desenefaine] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
  );
  try {
    const tmdbData = await fetchTmdbDetails(tmdbId, mediaType);
    if (!tmdbData) return [];
    const titlesToTry = Array.from(
      new Set([tmdbData.titleRo, tmdbData.title].filter(Boolean))
    );
    console.log("[desenefaine] Searching titles:", titlesToTry);
    const isTv = mediaType === "tv" || mediaType === "series";
    let pageHtml = null;
    let matchedTitle = tmdbData.titleRo || tmdbData.title;
    for (const title of titlesToTry) {
      const slug = slugify(title);
      let urlsToTry = [];
      if (isTv && season && episode) {
        urlsToTry = [
          `${BASE_URL3}/epi/${slug}-sezonul-${season}-episodul-${episode}/`,
          `${BASE_URL3}/episoade/${slug}-sezonul-${season}-episodul-${episode}/`
        ];
      } else {
        urlsToTry = [
          `${BASE_URL3}/film/${slug}/`,
          `${BASE_URL3}/film/${slug}-${tmdbData.year}/`,
          `${BASE_URL3}/desen/${slug}/`,
          `${BASE_URL3}/desen/${slug}-${tmdbData.year}/`,
          `${BASE_URL3}/movie/${slug}/`
        ];
      }
      for (const targetUrl of urlsToTry) {
        console.log(`[desenefaine] Testing direct URL: ${targetUrl}`);
        const html = await fetchHtml(targetUrl);
        const valid = isTv ? hasPlayerElements(html) : isValidMoviePage(html, tmdbData);
        if (valid) {
          console.log(`[desenefaine] Found valid player page at ${targetUrl}`);
          pageHtml = html;
          matchedTitle = title;
          break;
        }
      }
      if (pageHtml) break;
    }
    if (!pageHtml) {
      const candidates = [];
      for (const title of titlesToTry) {
        const cleanQuery = title.replace(/[:\-]/g, " ").trim();
        const searchUrl = `${BASE_URL3}/?s=${encodeURIComponent(cleanQuery)}`;
        console.log(`[desenefaine] Searching site: ${searchUrl}`);
        const searchHtml = await fetchHtml(searchUrl);
        if (!searchHtml) continue;
        const targetSlug = slugify(title);
        const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
        let lm;
        while ((lm = linkRe.exec(searchHtml)) !== null) {
          const href = lm[1];
          if (!href || href.includes("wp-") || href === BASE_URL3 + "/") continue;
          const path = href.split("?")[0];
          let isMatch = false;
          let score = 0;
          if (isTv && season && episode) {
            const epRegex = new RegExp(
              `sezonul-${season}-episodul-${episode}(?:-|/|$)`,
              "i"
            );
            if (epRegex.test(href)) {
              isMatch = true;
              score += 2;
            }
          } else {
            const seg = (path.match(/\/(?:film|desen|movie)\/([^/]+)\/?$/) || [])[1];
            if (seg && seg.startsWith(targetSlug)) {
              isMatch = true;
              score += seg === targetSlug ? 3 : 2;
            }
          }
          if (!isMatch) continue;
          const yearMatch = path.match(/[-/](19\d{2}|20\d{2})(?:-|\/|$)/);
          if (yearMatch) {
            const yearInUrl = parseInt(yearMatch[1], 10);
            if (tmdbData.year && yearInUrl === tmdbData.year) score += 3;
            else if (tmdbData.year) score -= 3;
          }
          console.log(
            `[desenefaine] Search candidate: ${href} (score=${score})`
          );
          candidates.push({ href, score });
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      for (const candidate of candidates) {
        const yearMatch = candidate.href.match(/[-/](19\d{2}|20\d{2})(?:-|\/|$)/);
        if (tmdbData.year && yearMatch && parseInt(yearMatch[1], 10) !== tmdbData.year) {
          console.log(
            `[desenefaine] Rejecting wrong-year candidate: ${candidate.href}`
          );
          continue;
        }
        const candidateHtml = await fetchHtml(candidate.href);
        const valid = isTv ? hasPlayerElements(candidateHtml) : isValidMoviePage(candidateHtml, tmdbData);
        if (valid) {
          console.log(
            `[desenefaine] Found valid player page at ${candidate.href}`
          );
          pageHtml = candidateHtml;
          break;
        }
      }
    }
    if (!pageHtml) {
      console.log("[desenefaine] Could not find media page.");
      return [];
    }
    const embedUrls = await extractEmbedsFromPage(pageHtml);
    console.log(`[desenefaine] Discovered ${embedUrls.length} embed link(s)`);
    return finalizeStreams(
      embedUrls.map(
        (url) => buildStreamObject(url, matchedTitle, season, episode, mediaType)
      ),
      { name: "Desenefaine", provider: "desenefaine" }
    );
  } catch (error) {
    console.error("[desenefaine] Error:", error.message);
    return [];
  }
}
var getStreams = createProvider({
  name: "Desenefaine",
  supportedTypes: ["movie", "tv"],
  extract
});
