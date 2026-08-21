/** ClickSud - Nuvio provider bundle */
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

// src/clicksud/index.js
var index_exports = {};
__export(index_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(index_exports);

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

// src/clicksud/resolvers/embed4me.js
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
async function resolveEmbed4Me(embedUrl) {
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
      headers: { "User-Agent": HEADERS["User-Agent"], Referer: embedUrl }
    });
    if (apiRes.ok) {
      const hexData = await apiRes.text();
      return await decryptEmbed4MeApi(hexData);
    }
  }
  return null;
}

// src/clicksud/resolvers/veev.js
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
function decodeVeevTokenChar(tokenStr) {
  let decoded = [];
  for (let i = 0; i < tokenStr.length; i++) {
    let code = tokenStr.charCodeAt(i);
    if (code > 127) {
      decoded.push(
        String.fromCharCode(
          code % 16 < 10 ? code % 16 + 48 : code % 16 + 87
        )
      );
    } else {
      decoded.push(tokenStr[i]);
    }
  }
  return decoded.join("");
}
function buildVeevArray(encodedString) {
  let d = [];
  let c = encodedString.split("");
  let count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0) break;
      let val = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
      currentArray.unshift(val);
    }
    d.push(currentArray);
    if (c.length === 0) break;
    count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
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
    const fileCodeMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/) || embedUrl.match(/\/v\/([a-zA-Z0-9]+)/) || embedUrl.match(/file_code=([a-zA-Z0-9]+)/);
    if (!fileCodeMatch) return null;
    const fileCode = fileCodeMatch[1];
    const webUrl = `https://veev.to/e/${fileCode}`;
    const headers = {
      "User-Agent": HEADERS["User-Agent"],
      Referer: webUrl
    };
    const html = await fetchText(webUrl, headers);
    if (!html) return null;
    const tokenMatch = html.match(
      /window\._vvto\[[^\]]+\]\s*=\s*["']([^"']+)["']/
    );
    if (tokenMatch) {
      const cleanToken = decodeVeevTokenChar(tokenMatch[1]);
      const apiUrl = `https://veev.to/dl?op=player_api&cmd=gi&file_code=${fileCode}&token=${cleanToken}&ie=1`;
      const res = await fetch(apiUrl, {
        headers: { ...headers, "X-Requested-With": "XMLHttpRequest" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.file?.file_status === "OK" && data.file.dv?.[0]?.url) {
          return data.file.dv[0].url;
        }
      }
    }
    const fcRegex = /[\.\s'](?:fc|_vvto\[[^\]]*)(?:['\]]*)?\s*[:=]\s*['"]([^'"]+)['"]/g;
    let matches = [];
    let match;
    while ((match = fcRegex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    for (let f of matches.reverse()) {
      const ch = veevDecode(f);
      if (ch !== f) {
        const apiUrl = `https://veev.to/dl?op=player_api&cmd=gi&file_code=${fileCode}&ch=${encodeURIComponent(
          ch
        )}&ie=1`;
        const apiRes = await fetch(apiUrl, {
          headers: { ...headers, "X-Requested-With": "XMLHttpRequest" }
        });
        if (apiRes.ok) {
          const text = await apiRes.text();
          const jresp = JSON.parse(text).file;
          if (jresp && jresp.file_status === "OK" && jresp.dv?.[0]) {
            const rawS = jresp.dv[0].s;
            if (rawS) {
              const decompressedS = veevDecode(rawS);
              const tarray = buildVeevArray(ch)[0];
              const finalUrl = decodeVeevUrl(decompressedS, tarray);
              if (finalUrl) return finalUrl;
            } else if (jresp.dv[0].url) {
              return jresp.dv[0].url;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Clicksud] Veev resolution error: ${e.message}`);
  }
  return null;
}

// src/clicksud/resolvers/okru.js
async function resolveOK(embedUrl) {
  try {
    const vidMatch = embedUrl.match(/videoembed\/(\d+)/) || embedUrl.match(/video\/(\d+)/);
    if (!vidMatch) return null;
    const videoId = vidMatch[1];
    const embedFullUrl = `https://ok.ru/videoembed/${videoId}`;
    const html = await fetchText(embedFullUrl, {
      "User-Agent": HEADERS["User-Agent"],
      Referer: BASE_URL
    });
    if (!html) return null;
    const dataOptionsMatch = html.match(/data-options=["']([^"']+)["']/);
    if (dataOptionsMatch) {
      const rawOptions = dataOptionsMatch[1];
      const decoded = rawOptions.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      const json = JSON.parse(decoded);
      const meta = typeof json.flashvars?.metadata === "string" ? JSON.parse(json.flashvars.metadata) : json.flashvars?.metadata;
      if (meta?.hlsManifestUrl) return meta.hlsManifestUrl;
      if (meta?.videos && meta.videos.length > 0) {
        return meta.videos[meta.videos.length - 1].url;
      }
    }
  } catch (e) {
    console.error(`[Clicksud] OK.ru resolution error: ${e.message}`);
  }
  return null;
}

// src/clicksud/resolvers/vidmoly.js
async function resolveVidmoly(embedUrl) {
  try {
    const html = await fetchText(embedUrl, {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://click-sud.pro/"
    });
    if (!html) return null;
    const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
    if (m3u8Match) {
      return m3u8Match[1] || m3u8Match[0];
    }
  } catch (e) {
    console.error(`[Vidmoly] Resolution error: ${e.message}`);
  }
  return null;
}

// src/clicksud/resolvers/vk.js
async function resolveVK(embedUrl) {
  try {
    const html = await fetchText(embedUrl, {
      Referer: BASE_URL,
      "User-Agent": HEADERS["User-Agent"],
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site"
    });
    if (!html) return null;
    const unescapedHtml = html.replace(/\\/g, "");
    const hlsMatch = unescapedHtml.match(
      /["']hls["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
    );
    if (hlsMatch) return hlsMatch[1];
    const mp4Match = unescapedHtml.match(
      /["']mp4_1080["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
    ) || unescapedHtml.match(
      /["']mp4_720["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
    ) || unescapedHtml.match(
      /["']mp4_480["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
    ) || unescapedHtml.match(
      /["']mp4_360["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
    ) || unescapedHtml.match(/(https?:\/\/[^"'\s]+\.vkuser\.net[^"'\s]*)/i);
    if (mp4Match) {
      return mp4Match[1] || mp4Match[0];
    }
  } catch (e) {
    console.error(`[Clicksud] VK resolution error: ${e.message}`);
  }
  return null;
}

// src/clicksud/resolvers/rumble.js
async function resolveRumble(embedUrl) {
  try {
    const mediaIdMatch = embedUrl.match(/\/embed\/([a-zA-Z0-9]+)/) || embedUrl.match(/\/embedJS\/[^\?]+\?.*v=([a-zA-Z0-9]+)/) || embedUrl.match(/\/v\/([a-zA-Z0-9]+)/);
    if (!mediaIdMatch) return null;
    const mediaId = mediaIdMatch[1];
    const apiUrl = `https://rumble.com/embedJS/u3/?request=video&ver=2&v=${mediaId}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        Referer: "https://rumble.com/"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.u?.hls?.url) {
        return data.u.hls.url;
      }
      const ua = data.ua || {};
      if (ua.hls) {
        const hlsUrl = typeof ua.hls === "string" ? ua.hls : ua.hls.url || ua.hls["auto"]?.url || ua.hls["1080"]?.url;
        if (hlsUrl) return hlsUrl;
      }
      if (ua.mp4) {
        const mp4Url = ua.mp4["1080"]?.url || ua.mp4["720"]?.url || ua.mp4["480"]?.url || ua.mp4["360"]?.url || (typeof ua.mp4 === "string" ? ua.mp4 : null);
        if (mp4Url) return mp4Url;
      }
      const jsonStr = JSON.stringify(data);
      const streamMatch = jsonStr.match(/https?:\/\/[^"'\s\\]+?\.m3u8[^"'\s\\]*/i) || jsonStr.match(/https?:\/\/[^"'\s\\]+?\.mp4[^"'\s\\]*/i);
      if (streamMatch) {
        return streamMatch[0].replace(/\\/g, "");
      }
    }
  } catch (e) {
    console.error(`[Clicksud] Rumble resolution error: ${e.message}`);
  }
  return null;
}

// src/clicksud/resolvers/fsonline.js
async function resolveFSOnline(embedUrl) {
  try {
    const html = await fetchText(embedUrl, {
      Referer: "https://clicksud.com.in/"
    });
    if (!html) return null;
    const match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
    return match ? match[1] : null;
  } catch (error) {
    console.error(`[Clicksud] FSOnline resolution error: ${error.message}`);
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

// src/clicksud/resolvers/voe.js
function decodeBase64(value) {
  try {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const input = String(value).replace(/\s+/g, "").replace(/=+$/, "");
    let output = "", buffer = 0, bits = 0;
    for (const char of input) {
      const index = alphabet.indexOf(char);
      if (index < 0) return null;
      buffer = buffer << 6 | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode(buffer >> bits & 255);
      }
    }
    return output;
  } catch (_) {
    return null;
  }
}
function decodeConfig(payload) {
  try {
    const rot13 = payload.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      return String.fromCharCode((char.charCodeAt(0) - start + 13) % 26 + start);
    });
    const normalized = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"].reduce((value, marker) => value.split(marker).join("_"), rot13);
    const first = decodeBase64(normalized.split("_").join(""));
    if (!first) return null;
    const shifted = Array.from(first, (char) => String.fromCharCode(char.charCodeAt(0) - 3)).join("");
    const json = decodeBase64(shifted.split("").reverse().join(""));
    return json ? JSON.parse(json) : null;
  } catch (_) {
    return null;
  }
}
async function resolveVoe(embedUrl) {
  try {
    let currentUrl = embedUrl;
    let html = await fetchText(currentUrl, { Referer: "https://click-sud.pro/" });
    if (!html) return null;
    const redirect = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
    if (redirect) {
      currentUrl = new URL(redirect[1], currentUrl).href;
      html = await fetchText(currentUrl, { Referer: embedUrl });
      if (!html) return null;
    }
    const encoded = html.match(/<script\s+type=["']application\/json["']>\s*(\[[^\]]+\])\s*<\/script>/i);
    if (encoded) {
      const entries = JSON.parse(encoded[1]);
      const config = entries[0] && decodeConfig(entries[0]);
      const source = config && (config.source || config.direct_access_url || config.fallback);
      if (source && /^https?:\/\//i.test(source)) return source;
    }
    const direct = html.match(/["']?hls["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
    return direct ? direct[1] : null;
  } catch (error) {
    console.error(`[Clicksud] VOE resolution error: ${error.message}`);
    return null;
  }
}

// src/clicksud/resolvers/index.js
async function resolveEmbedToRawM3u8(embedUrl) {
  if (!embedUrl) return null;
  if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed") && !embedUrl.includes("video_ext.php")) {
    return embedUrl;
  }
  try {
    if (embedUrl.includes("player.fsonline.app")) {
      const stream = await resolveFSOnline(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
      const stream = await resolveVidoza(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("rumble.com") || embedUrl.includes("rumble")) {
      const stream = await resolveRumble(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("voe")) {
      const stream = await resolveVoe(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("veev.to") || embedUrl.includes("veev")) {
      const stream = await resolveVeev(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("ok.ru")) {
      const stream = await resolveOK(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("vidmoly")) {
      const stream = await resolveVidmoly(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("vkvideo.ru") || embedUrl.includes("vk.com")) {
      const stream = await resolveVK(embedUrl);
      if (stream) return stream;
    }
    if (embedUrl.includes("embed4me") || embedUrl.includes("player4me") || embedUrl.includes("p2pplay") || embedUrl.includes("streamp2p")) {
      const stream = await resolveEmbed4Me(embedUrl);
      if (stream) return stream;
    }
  } catch (e) {
    console.error(`[Clicksud] Resolution error for ${embedUrl}: ${e.message}`);
  }
  return null;
}

// src/clicksud/extractor.js
function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function isContentUrl(href) {
  try {
    const url = new URL(href, BASE_URL);
    return ["click-sud.pro", "clicksud.com.in"].includes(url.hostname) && !url.pathname.startsWith("/category/") && !url.pathname.startsWith("/page/") && !url.pathname.startsWith("/tag/");
  } catch (_) {
    return false;
  }
}
function isPlayableStream(url) {
  if (!url) return false;
  return url.includes(".m3u8") || url.includes(".mp4") || url.includes("/stream?") || url.includes("vkuser.net") || url.includes("rumble.com");
}
function extractLinks(html) {
  const results = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").trim() });
  }
  return results;
}
async function searchClicksud(query, season, episode) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchText(searchUrl);
  if (!html) return null;
  const normQuery = normalize(query);
  const isSpanishQuery = normQuery.includes("spania") || normQuery.includes("spain");
  let pageUrl = null;
  for (const { href, text } of extractLinks(html)) {
    if (!href || !isContentUrl(href)) continue;
    const absoluteHref = new URL(href, BASE_URL).href;
    const normText = normalize(text);
    const normHref = normalize(absoluteHref);
    if (!isSpanishQuery && (normText.includes("spania") || normHref.includes("spania"))) continue;
    if (season && episode) {
      const epPattern = `sezonul${season}episodul${episode}`;
      if (normHref.includes(epPattern) || normText.includes(epPattern)) {
        return absoluteHref;
      }
    }
    if (normText.includes(normQuery) || normHref.includes(normQuery) || normQuery.length > 5 && normText.length > 5 && normQuery.includes(normText)) {
      pageUrl = absoluteHref;
      break;
    }
  }
  return pageUrl;
}
async function extractStreams(mediaInfo, mediaType, season, episode) {
  if (!mediaInfo) return [];
  const cleanTitle = (mediaInfo.title || "").replace(/[:\-–—].*$/, "").trim();
  const cleanRoTitle = (mediaInfo.roTitle || "").replace(/[:\-–—].*$/, "").trim();
  const cleanOrigTitle = (mediaInfo.originalTitle || "").replace(/[:\-–—].*$/, "").trim();
  let searchQueries = [];
  if (mediaType === "tv") {
    searchQueries = [
      mediaInfo.roTitle ? `${mediaInfo.roTitle} Sezonul ${season} Episodul ${episode}` : null,
      cleanRoTitle ? `${cleanRoTitle} Sezonul ${season} Episodul ${episode}` : null,
      `${mediaInfo.title} Sezonul ${season} Episodul ${episode}`,
      cleanTitle ? `${cleanTitle} Sezonul ${season} Episodul ${episode}` : null,
      `${mediaInfo.originalTitle} Sezonul ${season} Episodul ${episode}`,
      cleanOrigTitle ? `${cleanOrigTitle} Sezonul ${season} Episodul ${episode}` : null,
      mediaInfo.roTitle ? `${mediaInfo.roTitle} Episodul ${episode}` : null,
      cleanRoTitle ? `${cleanRoTitle} Episodul ${episode}` : null,
      `${mediaInfo.title} Episodul ${episode}`,
      cleanTitle ? `${cleanTitle} Episodul ${episode}` : null,
      cleanTitle ? `${cleanTitle} S${season}E${episode}` : null,
      cleanTitle ? `${cleanTitle} ${season}x${episode}` : null,
      mediaInfo.roTitle,
      cleanRoTitle,
      mediaInfo.title,
      cleanTitle
    ].filter(Boolean);
  } else {
    searchQueries = [mediaInfo.roTitle, cleanRoTitle, mediaInfo.title, cleanTitle, mediaInfo.originalTitle, cleanOrigTitle].filter(Boolean);
  }
  let targetUrl = null;
  for (const q of searchQueries) {
    if (!q) continue;
    targetUrl = await searchClicksud(q, season, episode);
    if (targetUrl) break;
  }
  if (!targetUrl) {
    console.log(`[Clicksud] No page found for: ${mediaInfo.title}`);
    return [];
  }
  console.log(`[Clicksud] Extracting streams from: ${targetUrl}`);
  const pagesToScan = [targetUrl];
  if (!targetUrl.endsWith("/")) targetUrl += "/";
  pagesToScan.push(`${targetUrl}2/`, `${targetUrl}3/`);
  const embeds = /* @__PURE__ */ new Set();
  const knownHosts = [
    "rumble",
    "embed4me",
    "player4me",
    "p2pplay",
    "streamp2p",
    "vidmoly",
    "vkvideo.ru",
    "vk.com",
    "ok.ru",
    "veev",
    "filemoon",
    "vidoza",
    "videzz",
    "dood",
    "mixdrop",
    "voe",
    "player.fsonline.app"
  ];
  for (const pageUrl of pagesToScan) {
    const pageHtml = await fetchText(pageUrl);
    if (!pageHtml) continue;
    const iframeRe = /<iframe\s[^>]*>/gi;
    let im;
    while ((im = iframeRe.exec(pageHtml)) !== null) {
      const tag = im[0];
      const srcMatch = tag.match(/(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i);
      if (srcMatch) {
        let src = srcMatch[1];
        if (src.startsWith("//")) src = "https:" + src;
        embeds.add(src);
      }
    }
    const attrRe = /(?:data-link|data-embed|data-url|href)=["']([^"']+)["']/gi;
    let am;
    while ((am = attrRe.exec(pageHtml)) !== null) {
      let val = am[1];
      if (val.startsWith("//")) val = "https:" + val;
      if (knownHosts.some((host) => val.toLowerCase().includes(host))) {
        embeds.add(val);
      }
    }
    const rawUrls = pageHtml.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
    rawUrls.forEach((url) => {
      const cleaned = url.replace(/['"\\\>].*$/, "").replace(/&amp;/g, "&");
      if (knownHosts.some((host) => cleaned.toLowerCase().includes(host))) {
        embeds.add(cleaned);
      }
    });
  }
  const streams = [];
  for (const embedUrl of Array.from(embeds)) {
    const rawMediaUrl = await resolveEmbedToRawM3u8(embedUrl);
    if (rawMediaUrl && isPlayableStream(rawMediaUrl)) {
      const embedOrigin = new URL(embedUrl).origin;
      let serverName = "Direct Stream";
      if (embedUrl.includes("rumble")) serverName = "Rumble";
      else if (embedUrl.includes("player.fsonline.app")) serverName = "Vidmoly";
      else if (embedUrl.includes("veev")) serverName = "Veev";
      else if (embedUrl.includes("ok.ru")) serverName = "OK.ru";
      else if (embedUrl.includes("vidmoly")) serverName = "Vidmoly";
      else if (embedUrl.includes("vk")) serverName = "VK Video";
      else if (embedUrl.includes("vidoza") || embedUrl.includes("videzz")) serverName = "Vidoza";
      else if (embedUrl.includes("voe")) serverName = "VOE";
      else if (embedUrl.includes("embed4me") || embedUrl.includes("player4me")) serverName = "Embed4Me";
      streams.push({
        name: `Clicksud - ${serverName}`,
        title: `Server ${serverName}`,
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
  return streams;
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

// src/clicksud/index.js
async function extract(tmdbId, mediaType = "movie", season = null, episode = null) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  try {
    let mediaInfo = null;
    const id = typeof tmdbId === "object" ? tmdbId.tmdbId || tmdbId.id : tmdbId;
    if (id) {
      mediaInfo = await fetchTmdbDetails(id, mediaType);
    }
    if (!mediaInfo && typeof tmdbId === "object" && tmdbId !== null) {
      mediaInfo = {
        title: tmdbId.title || tmdbId.name,
        originalTitle: tmdbId.originalTitle || tmdbId.original_title || tmdbId.original_name,
        roTitle: tmdbId.roTitle || null
      };
    }
    if (!mediaInfo) return [];
    return finalizeStreams(
      await extractStreams(mediaInfo, mediaType, season, episode),
      { name: "ClickSud", provider: "clicksud" }
    );
  } catch (error) {
    console.error(`[Clicksud] Error in getStreams: ${error.message}`);
    return [];
  }
}
var getStreams = createProvider({
  name: "ClickSud",
  supportedTypes: ["tv"],
  extract
});
