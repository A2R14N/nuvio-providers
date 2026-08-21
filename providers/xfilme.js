/** XFilme - Nuvio provider bundle */
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

// src/xfilme/index.js
var index_exports = {};
__export(index_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(index_exports);

// src/xfilme/http.js
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://xfilme.ro/",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
};
async function fetchText(url, customHeaders = {}) {
  const response = await fetch(url, {
    headers: { ...HEADERS, ...customHeaders }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${url}`);
  return await response.text();
}

// src/xfilme/extractor.js
var BASE_URL = "https://xfilme.ro";
function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
    console.error(`[XFilme] Filemoon AES-GCM error: ${e.message}`);
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
function veevDecode(etext) {
  if (!etext || etext.length === 0) return etext;
  let result = [];
  let lut = {};
  let n = 256;
  let c = etext[0];
  result.push(c);
  for (let i = 1; i < etext.length; i++) {
    let char = etext[i];
    let code = char.charCodeAt(0);
    let nc = code < 256 ? char : lut[code] !== void 0 ? lut[code] : c + c[0];
    result.push(nc);
    lut[n] = c + nc[0];
    n++;
    c = nc;
  }
  return result.join("");
}
function buildArray(encodedString) {
  let d = [];
  let c = encodedString.split("");
  let count = parseInt(c.shift(), 10) || 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0) break;
      currentArray.unshift(parseInt(c.shift(), 10) || 0);
    }
    d.push(currentArray);
    if (c.length === 0) break;
    count = parseInt(c.shift(), 10) || 0;
  }
  return d;
}
function decodeVeevUrl(etext, tarray) {
  let ds = etext;
  if (!tarray) return ds;
  for (let t of tarray) {
    if (t === 1) {
      ds = ds.split("").reverse().join("");
    }
    let hex = "";
    for (let i = 0; i < ds.length; i += 2) {
      hex += String.fromCharCode(parseInt(ds.substr(i, 2), 16));
    }
    ds = hex;
    ds = ds.replace("dXRmOA==", "");
  }
  return ds;
}
async function resolveVeev(embedUrl) {
  try {
    const urlObj = new URL(embedUrl);
    const mediaId = embedUrl.split("/e/")[1]?.split("?")[0]?.split("/")[0] || embedUrl.split("/d/")[1]?.split("?")[0]?.split("/")[0];
    if (!mediaId) return null;
    const webUrl = `${urlObj.origin}/e/${mediaId}`;
    const headers = {
      "User-Agent": HEADERS["User-Agent"],
      Referer: webUrl
    };
    const res = await fetch(webUrl, { headers });
    const html = await res.text();
    const regex = /[\.\s'](?:fc|_vvto\[[^\]]*)(?:['\]]*)?\s*[:=]\s*['"]([^'"]+)['"]/g;
    let matches = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    for (let f of matches.reverse()) {
      const ch = veevDecode(f);
      if (ch !== f) {
        const apiUrl = `${urlObj.origin}/dl?op=player_api&cmd=gi&file_code=${mediaId}&ch=${encodeURIComponent(ch)}&ie=1`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            ...headers,
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        const jsonText = await apiRes.text();
        const jresp = JSON.parse(jsonText).file;
        if (jresp && jresp.file_status === "OK" && jresp.dv && jresp.dv[0]) {
          const rawS = jresp.dv[0].s;
          const decompressedS = veevDecode(rawS);
          const tarray = buildArray(ch)[0];
          return decodeVeevUrl(decompressedS, tarray);
        }
      }
    }
  } catch (e) {
    console.error(`[XFilme] Veev resolution error: ${e.message}`);
  }
  return null;
}
async function resolveStreamWish(embedUrl) {
  try {
    const html = await fetchText(embedUrl);
    const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
    if (m3u8Match) return m3u8Match[1] || m3u8Match[0];
  } catch (e) {
    console.error(`[XFilme] StreamWish error: ${e.message}`);
  }
  return null;
}
async function resolveStreamFlash(embedUrl) {
  try {
    const html = await fetchText(embedUrl);
    const videoSrcMatch = html.match(/<source\s[^>]*src=["']([^"']+)["']/i) || html.match(/<video\s[^>]*src=["']([^"']+)["']/i);
    if (videoSrcMatch) {
      let videoSrc = videoSrcMatch[1];
      if (videoSrc.startsWith("//")) videoSrc = "https:" + videoSrc;
      if (videoSrc.startsWith("/")) {
        const urlObj = new URL(embedUrl);
        videoSrc = `${urlObj.origin}${videoSrc}`;
      }
      return videoSrc;
    }
    const iframeMatch = html.match(/<iframe\s[^>]*src=["']([^"']+)["']/i);
    if (iframeMatch) {
      let iframeSrc = iframeMatch[1];
      if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;
      return await resolveEmbedToRawM3u8(iframeSrc);
    }
    const m3u8Match = html.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/i);
    if (m3u8Match) return m3u8Match[0];
  } catch (e) {
    console.error(`[XFilme] StreamFlash resolution error: ${e.message}`);
  }
  return null;
}
async function resolveEmbedToRawM3u8(embedUrl) {
  if (!embedUrl) return null;
  if (embedUrl.includes("listeamed.net")) {
    return null;
  }
  if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed/") && !embedUrl.includes("/watch") && !embedUrl.includes("/v/")) {
    return embedUrl;
  }
  try {
    const urlObj = new URL(embedUrl);
    if (embedUrl.includes("streamflash.sx")) {
      const stream = await resolveStreamFlash(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("ghbrisk.com") || embedUrl.includes("streamwish") || embedUrl.includes("filelions") || embedUrl.includes("streamhg")) {
      const stream = await resolveStreamWish(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("veev.to") || embedUrl.includes("voe.sx") || embedUrl.includes("poophq.com") || embedUrl.includes("doods.to")) {
      const stream = await resolveVeev(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("waaw.to") || embedUrl.includes("netu")) {
      return null;
    }
    let code = "";
    if (embedUrl.includes("/e/")) {
      code = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
    } else if (embedUrl.includes("/v/")) {
      code = embedUrl.split("/v/")[1].split("?")[0].split("/")[0];
    }
    if (code) {
      try {
        const apiUrl = `${urlObj.origin}/api/videos/${code}`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: embedUrl,
            Origin: urlObj.origin
          }
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json && json.playback) {
            const rawM3u8 = await decryptFilemoonApi(json.playback);
            if (rawM3u8) return rawM3u8;
          }
        }
      } catch (e) {
      }
    }
    let hashId = embedUrl.includes("#") ? embedUrl.split("#")[1] : code;
    if (hashId) {
      try {
        const apiUrl = `${urlObj.origin}/api/v1/video?id=${hashId}`;
        const apiRes = await fetch(apiUrl, {
          headers: { "User-Agent": HEADERS["User-Agent"], Referer: embedUrl }
        });
        if (apiRes.ok) {
          const hexData = await apiRes.text();
          const rawM3u8 = await decryptEmbed4MeApi(hexData);
          if (rawM3u8) return rawM3u8;
        }
      } catch (e) {
      }
    }
  } catch (e) {
    console.error(`[XFilme] Resolution error: ${e.message}`);
  }
  return null;
}
function isPlayableStream(url) {
  if (!url) return false;
  if (url.includes(".m3u8") || url.includes(".mp4") || url.includes("/stream?")) {
    return true;
  }
  return false;
}
async function searchXFilme(query, year) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchText(searchUrl);
  const blockRe = /<(?:article|div)[^>]*class=["'][^"']*(?:result-item|item|post)[^"']*["'][^>]*>[\s\S]*?<\/(?:article|div)>/gi;
  let block;
  while ((block = blockRe.exec(html)) !== null) {
    const blockHtml = block[0];
    const titleMatch = blockHtml.match(/<(?:h[23]|[^>]*class=["'][^"']*(?:title|entry-title)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:h[23]|[^>]+)>/i);
    const linkMatch = blockHtml.match(/<a\s[^>]*href=["']([^"']+)["']/i);
    if (!linkMatch) continue;
    const titleText = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (normalize(titleText).includes(normalize(query))) {
      return linkMatch[1];
    }
  }
  const fallbackRe = /<a\s[^>]*href=["']([^"']*)["'][^>]*>/gi;
  let fm;
  while ((fm = fallbackRe.exec(html)) !== null) {
    if (normalize(fm[1]).includes(normalize(query))) return fm[1];
  }
  return null;
}
async function getEpisodeUrl(tvShowUrl, season, episode) {
  try {
    const html = await fetchText(tvShowUrl);
    const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const link = m[1];
      if (link && (link.includes(`-${season}x${episode}`) || link.includes(`season-${season}-episode-${episode}`))) {
        return link;
      }
    }
    return tvShowUrl;
  } catch {
    return tvShowUrl;
  }
}
async function fetchPlayerEmbed(postId, nume, type, referer) {
  const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
  const body = new URLSearchParams({
    action: "doo_player_ajax",
    post: postId,
    nume,
    type
  });
  try {
    const res = await fetch(ajaxUrl, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: referer
      },
      body: body.toString()
    });
    const text = await res.text();
    if (res.ok && text && text !== "0" && text !== "-1") {
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        return json.embed_url || json.url || json.code || null;
      } else {
        const iframeMatch = text.match(/<iframe\s[^>]*src=["']([^"']+)["']/i);
        return iframeMatch ? iframeMatch[1] : null;
      }
    }
  } catch (e) {
    console.error(
      `[XFilme] Failed to fetch player embed ${nume}: ${e.message}`
    );
  }
  return null;
}
async function extractStreams(mediaInfo, mediaType, season, episode) {
  if (!mediaInfo) return [];
  let targetUrl = await searchXFilme(mediaInfo.originalTitle, mediaInfo.year);
  if (!targetUrl)
    targetUrl = await searchXFilme(mediaInfo.title, mediaInfo.year);
  if (!targetUrl) return [];
  if (mediaType === "tv") {
    targetUrl = await getEpisodeUrl(targetUrl, season, episode);
  }
  const pageHtml = await fetchText(targetUrl);
  const streams = [];
  const playerOptions = [];
  const optRe = /<li\s[^>]*\bdata-post=["']([^"']+)["'][^>]*>/gi;
  let om;
  while ((om = optRe.exec(pageHtml)) !== null) {
    const tag = om[0];
    const post = (tag.match(/data-post=["']([^"']+)["']/) || [])[1];
    const nume = (tag.match(/data-nume=["']([^"']+)["']/) || [])[1];
    const type = (tag.match(/data-type=["']([^"']+)["']/) || [])[1] || (mediaType === "tv" ? "tv" : "movie");
    const liEnd = pageHtml.indexOf("</li>", om.index);
    const liContent = liEnd > -1 ? pageHtml.slice(om.index, liEnd) : tag;
    const titleMatch = liContent.match(/<[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)</) || liContent.match(/>([^<]{2,})</g);
    const title = titleMatch ? (titleMatch[1] || titleMatch[0]).replace(/<[^>]+>/g, "").trim() : "";
    if (nume && nume !== "trailer" && post && !title.toLowerCase().includes("netu") && !title.toLowerCase().includes("waaw")) {
      playerOptions.push({ post, nume, type, title });
    }
  }
  for (const opt of playerOptions) {
    const embedUrl = await fetchPlayerEmbed(
      opt.post,
      opt.nume,
      opt.type,
      targetUrl
    );
    if (embedUrl) {
      const cleanEmbedUrl = embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl;
      const rawMediaUrl = await resolveEmbedToRawM3u8(cleanEmbedUrl);
      if (rawMediaUrl && isPlayableStream(rawMediaUrl)) {
        const embedOrigin = new URL(cleanEmbedUrl).origin;
        let hostName = opt.title || `Server ${opt.nume}`;
        if (cleanEmbedUrl.includes("filemoon") || cleanEmbedUrl.includes("byselapuix")) hostName = "FileMoon";
        else if (cleanEmbedUrl.includes("strp2p") || cleanEmbedUrl.includes("ethernix") || cleanEmbedUrl.includes("fortimax")) hostName = "XStream";
        else if (cleanEmbedUrl.includes("streamflash")) hostName = "StreamFlash";
        streams.push({
          name: `XFilme - ${hostName}`,
          title: `Server ${hostName}`,
          url: rawMediaUrl,
          quality: "1080p",
          language: "ro",
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: `${embedOrigin}/`,
            Origin: embedOrigin
          }
        });
      }
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

// src/xfilme/index.js
async function extract(tmdbId, mediaType = "movie", season = null, episode = null) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  try {
    let mediaInfo = null;
    if (typeof tmdbId === "object" && tmdbId !== null && tmdbId.title) {
      mediaInfo = tmdbId;
    } else {
      mediaInfo = await fetchTmdbDetails(tmdbId, mediaType);
    }
    if (!mediaInfo) return [];
    return finalizeStreams(
      await extractStreams(mediaInfo, mediaType, season, episode),
      { name: "XFilme", provider: "xfilme" }
    );
  } catch (error) {
    console.error(`[XFilme] Error in getStreams: ${error.message}`);
    return [];
  }
}
var getStreams = createProvider({
  name: "XFilme",
  supportedTypes: ["movie", "tv"],
  extract
});
