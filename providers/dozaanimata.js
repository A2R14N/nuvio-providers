/** DozaAnimata - Nuvio provider bundle */
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

// src/dozaanimata/index.js
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

// src/dozaanimata/constants.js
var BASE_URL = "https://www.dozaanimata.net";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  Referer: BASE_URL + "/"
};
function slugify(text) {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// src/dozaanimata/http.js
async function fetchHtml(url, customHeaders = {}) {
  try {
    const mergedHeaders = Object.assign({}, HEADERS, customHeaders);
    let response = await fetch(url, {
      headers: mergedHeaders,
      skipSizeCheck: true,
      cfKiller: true
    });
    if ((response.status === 403 || response.status === 503) && typeof globalThis.Cloudflare !== "undefined" && globalThis.Cloudflare.solve) {
      console.log(`[dozaanimata] Solved Cloudflare for: ${url}`);
      const solvedHeaders = await globalThis.Cloudflare.solve(url);
      if (solvedHeaders["Cookie"]) HEADERS["Cookie"] = solvedHeaders["Cookie"];
      if (solvedHeaders["User-Agent"])
        HEADERS["User-Agent"] = solvedHeaders["User-Agent"];
      const retryHeaders = Object.assign({}, mergedHeaders, {
        Cookie: HEADERS["Cookie"],
        "User-Agent": HEADERS["User-Agent"]
      });
      response = await fetch(url, {
        headers: retryHeaders,
        skipSizeCheck: true,
        cfKiller: true
      });
    }
    if (!response.ok) return null;
    const text = await response.text();
    if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
      return null;
    }
    return text;
  } catch (e) {
    console.error(`[dozaanimata] Fetch error for ${url}:`, e.message);
    return null;
  }
}

// src/dozaanimata/extractors/dood.js
var DOOD_DOMAINS = [
  "dood.watch",
  "doodstream.com",
  "dood.to",
  "dood.so",
  "dood.cx",
  "dood.la",
  "dood.ws",
  "dood.sh",
  "doodstream.co",
  "dood.pm",
  "dood.wf",
  "dood.re",
  "dood.yt",
  "dooood.com",
  "dood.stream",
  "ds2play.com",
  "doods.pro",
  "ds2video.com",
  "d0o0d.com",
  "do0od.com",
  "d0000d.com",
  "d000d.com",
  "dood.li",
  "dood.work",
  "dooodster.com",
  "vidply.com",
  "all3do.com",
  "do7go.com",
  "doodcdn.io",
  "doply.net",
  "vide0.net",
  "vvide0.com",
  "d-s.io",
  "dsvplay.com",
  "myvidplay.com",
  "playmogo.com"
];
function isDoodDomain(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return DOOD_DOMAINS.some((domain) => lower.includes(domain));
}
async function resolveDood(embedUrl) {
  try {
    const urlObj = new URL(embedUrl);
    const customHeaders = Object.assign({}, HEADERS, {
      Referer: "https://www.dozaanimata.net/",
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site"
    });
    const html = await fetchHtml(embedUrl, customHeaders);
    if (!html) return null;
    const passMatch = html.match(/\/pass_md5\/[^\s"'<>\\]+/);
    if (!passMatch) return null;
    const passPath = passMatch[0];
    const passUrl = `${urlObj.origin}${passPath}`;
    const passRes = await fetch(passUrl, {
      headers: Object.assign({}, HEADERS, {
        Referer: embedUrl,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      })
    });
    if (!passRes.ok) return null;
    const passText = await passRes.text();
    const randStr = Math.random().toString(36).substring(2, 12);
    const token = passPath.split("/").pop();
    const rawVideoUrl = `${passText.trim()}${randStr}?token=${token}&expiry=${Date.now()}`;
    return {
      rawUrl: rawVideoUrl,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${urlObj.origin}/`,
        Origin: urlObj.origin
      }
    };
  } catch (e) {
    console.error(`[dozaanimata] DoodStream error: ${e.message}`);
  }
  return null;
}

// src/dozaanimata/extractors/vk.js
async function resolveVk(embedUrl) {
  try {
    const html = await fetchHtml(embedUrl, {
      Referer: "https://dozaanimata.net/"
    });
    if (!html) return null;
    const hlsMatch = html.match(/["']hls["']\s*:\s*["']([^"']+)["']/i);
    if (hlsMatch) return hlsMatch[1].replace(/\\/g, "");
    const mp4Match = html.match(/["']url1080["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url720["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url480["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url360["']\s*:\s*["']([^"']+)["']/i);
    if (mp4Match) return mp4Match[1].replace(/\\/g, "");
  } catch {
  }
  return null;
}

// src/dozaanimata/extractors/veev.js
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
  let count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0) break;
      currentArray.unshift(/^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0);
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
    if (t === 1) ds = ds.split("").reverse().join("");
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
    const html = await fetchHtml(webUrl, { Referer: webUrl });
    if (!html) return null;
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
          headers: Object.assign({}, HEADERS, {
            Referer: webUrl,
            "X-Requested-With": "XMLHttpRequest"
          })
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
  } catch {
  }
  return null;
}

// src/dozaanimata/extractors/filemoon.js
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
  } catch {
  }
  return null;
}

// src/dozaanimata/extractors/streamwish.js
async function resolveStreamWish(embedUrl) {
  try {
    const html = await fetchHtml(embedUrl);
    if (!html) return null;
    const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
    if (m3u8Match) return m3u8Match[1] || m3u8Match[0];
  } catch {
  }
  return null;
}

// src/clicksud/http.js
var BASE_URL2 = "https://click-sud.pro";
var HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL2}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};
async function fetchText(url, customHeaders = {}) {
  try {
    const response = await fetch(url, {
      headers: { ...HEADERS2, ...customHeaders }
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

// src/dozaanimata/extractors/netu.js
var NETU_ORIGINS = ["https://yandexcdn.com", "https://hqq.tv"];
var DOZA_REFERER = "https://www.dozaanimata.net/";
function pageValue(html, name, fallback = "") {
  const match = html.match(
    new RegExp(`(?:var\\s+)?${name}\\s*=\\s*["']([^"']*)`, "i")
  );
  return match ? match[1] : fallback;
}
function decodeObfuscatedLink(value) {
  if (!value) return "";
  if (value.includes(".")) return value;
  const encoded = value.slice(1);
  let decoded = "";
  for (let index = 0; index < encoded.length; index += 3) {
    const code = Number.parseInt(encoded.slice(index, index + 3), 16);
    if (!Number.isFinite(code)) return "";
    decoded += String.fromCharCode(code);
  }
  return decoded;
}
function extractCookies(response) {
  const raw = response.headers.get("set-cookie") || "";
  return Array.from(raw.matchAll(/(?:^|,\s*)([^=;,\s]+=[^;,]*)/g)).map((match) => match[1]).filter((cookie) => cookie.startsWith("__ddg")).join("; ");
}
async function postJson(origin, path, body, referer, cookie) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: referer,
      Origin: origin,
      "Content-Type": "application/json",
      ...cookie ? { Cookie: cookie } : {}
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) return null;
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}
function mediaFromResponse(data) {
  if (!data || data.need_captcha || data.wrong_recaptcha || !data.obf_link) {
    return null;
  }
  const decoded = decodeObfuscatedLink(data.obf_link);
  if (!decoded) return null;
  const url = decoded.startsWith("//") ? `https:${decoded}` : decoded;
  if (!/^https?:\/\//i.test(url)) return null;
  return url.includes(".m3u8") ? url : `${url}.mp4.m3u8`;
}
async function resolveWithOrigin(embedUrl, origin) {
  try {
    const sourceId = new URL(embedUrl).searchParams.get("vid");
    if (!sourceId) return null;
    const playerUrl = `${origin}/player/embed_player.php?vid=${encodeURIComponent(sourceId)}&autoplay=none`;
    const pageResponse = await fetch(playerUrl, {
      headers: { "User-Agent": USER_AGENT, Referer: DOZA_REFERER }
    });
    if (!pageResponse.ok) return null;
    const html = await pageResponse.text();
    const cookie = extractCookies(pageResponse);
    const videoKey = pageValue(
      html,
      "videokeyorig",
      pageValue(html, "orig_vid", sourceId)
    );
    const videoId = html.match(/["']videoid["']\s*:\s*["']([^"']+)/i)?.[1] || pageValue(html, "videoid");
    if (!videoId || !videoKey) return null;
    const requestBody = {
      htoken: pageValue(html, "htoken"),
      sh: pageValue(html, "shh"),
      ver: "4",
      secure: pageValue(html, "secure", "0"),
      adb: pageValue(html, "adbn", "0"),
      v: encodeURIComponent(videoKey),
      token: "",
      gt: pageValue(html, "gtr"),
      embed_from: pageValue(html, "embedfrm", "0"),
      wasmcheck: 0,
      adscore: "",
      click_hash: "",
      clickx: 0,
      clicky: 0
    };
    const initial = await postJson(
      origin,
      "/player/get_md5.php",
      requestBody,
      playerUrl,
      cookie
    );
    const immediateUrl = mediaFromResponse(initial);
    if (immediateUrl) return buildResult(immediateUrl, origin);
    if (!initial || initial["407"] || initial.need_captcha || initial.wrong_recaptcha)
      return null;
    if (initial.try_again === "1" || initial.try_again === 1) {
      const delay = Math.min(6e3, Math.max(0, Number(initial.isec || 1) * 1e3));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const width = 640;
    const height = 360;
    const context = await postJson(
      origin,
      "/player/get_player_image.php",
      { videoid: videoId, videokey: videoKey, width, height },
      playerUrl,
      cookie
    );
    if (!context?.hash_image) return null;
    requestBody.click_hash = encodeURIComponent(context.hash_image);
    requestBody.clickx = Math.floor(width / 2);
    requestBody.clicky = Math.floor(height / 2);
    const media = await postJson(
      origin,
      "/player/get_md5.php",
      requestBody,
      playerUrl,
      cookie
    );
    const mediaUrl = mediaFromResponse(media);
    return mediaUrl ? buildResult(mediaUrl, origin) : null;
  } catch (error) {
    console.warn(`[dozaanimata] Netu ${origin} failed: ${error.message}`);
    return null;
  }
}
async function resolveNetu(embedUrl) {
  try {
    const origin = new URL(embedUrl).origin;
    const response = await fetch(embedUrl, {
      headers: { "User-Agent": USER_AGENT, Referer: DOZA_REFERER }
    });
    if (response.ok) {
      const html = await response.text();
      const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i);
      if (m3u8Match) {
        return buildResult(m3u8Match[1], origin);
      }
    }
  } catch (_) {
  }
  for (const origin of NETU_ORIGINS) {
    const result = await resolveWithOrigin(embedUrl, origin);
    if (result) return result;
  }
  return null;
}
function buildResult(rawUrl, origin) {
  return {
    rawUrl,
    headers: {
      "User-Agent": USER_AGENT,
      Referer: `${origin}/`,
      Origin: origin
    }
  };
}

// src/dozaanimata/extractors/index.js
async function resolveEmbedToRawStream(embedUrl) {
  if (!embedUrl) return null;
  if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed/") && !embedUrl.includes("/v/")) {
    return { rawUrl: embedUrl, headers: HEADERS };
  }
  try {
    const urlObj = new URL(embedUrl);
    let rawResult = null;
    if (embedUrl.includes("hqq.tv") || embedUrl.includes("waaw.to") || embedUrl.includes("netu")) {
      rawResult = await resolveNetu(embedUrl);
    } else if (isDoodDomain(embedUrl)) {
      rawResult = await resolveDood(embedUrl);
    } else if (embedUrl.includes("vk.com") || embedUrl.includes("vkvideo.ru")) {
      const rawUrl = await resolveVk(embedUrl);
      if (rawUrl)
        rawResult = {
          rawUrl,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://dozaanimata.net/"
          }
        };
    } else if (embedUrl.includes("veev.to") || embedUrl.includes("voe") || embedUrl.includes("poophq")) {
      const rawUrl = await resolveVeev(embedUrl);
      if (rawUrl) rawResult = { rawUrl, headers: HEADERS };
    } else if (embedUrl.includes("ghbrisk") || embedUrl.includes("streamwish") || embedUrl.includes("filelions") || embedUrl.includes("streamhg")) {
      const rawUrl = await resolveStreamWish(embedUrl);
      if (rawUrl) rawResult = { rawUrl, headers: HEADERS };
    } else if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
      const rawUrl = await resolveVidoza(embedUrl);
      if (rawUrl) {
        rawResult = {
          rawUrl,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: `${urlObj.origin}/`
          }
        };
      }
    }
    let code = embedUrl.includes("/e/") ? embedUrl.split("/e/")[1].split("?")[0].split("/")[0] : null;
    if (!rawResult && code) {
      try {
        const apiUrl = `${urlObj.origin}/api/videos/${code}`;
        const apiRes = await fetch(apiUrl, {
          headers: Object.assign({}, HEADERS, {
            Referer: embedUrl,
            Origin: urlObj.origin
          })
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json?.playback) {
            const rawUrl = await decryptFilemoonApi(json.playback);
            if (rawUrl)
              rawResult = {
                rawUrl,
                headers: {
                  "User-Agent": USER_AGENT,
                  Referer: `${urlObj.origin}/`
                }
              };
          }
        }
      } catch {
      }
    }
    return rawResult;
  } catch (e) {
    console.error(`[dozaanimata] Master resolution error: ${e.message}`);
  }
  return null;
}
async function extractEmbedsFromPage(html) {
  if (!html) return [];
  const embedUrls = /* @__PURE__ */ new Set();
  for (const match of html.matchAll(/<div\b[^>]*\bid=["']((?:[0-9a-f]{3})+)["'][^>]*>/gi)) {
    try {
      const decoded = match[1].match(/.{3}/g).map((chunk) => String.fromCharCode(Number.parseInt(chunk, 16))).join("");
      const videoId = JSON.parse(decoded)?.v;
      if (videoId) {
        embedUrls.add(
          `https://hqq.tv/player/embed_player.php?vid=${encodeURIComponent(videoId)}&autoplay=none`
        );
      }
    } catch (_) {
    }
  }
  const isPlayableEmbed = (url) => {
    if (!url || typeof url !== "string") return false;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("wp-") || lower.endsWith(".js") || lower.includes("popads"))
      return false;
    return true;
  };
  const embedTagRe = /<(?:iframe|embed|object)\s[^>]*>/gi;
  let et;
  while ((et = embedTagRe.exec(html)) !== null) {
    const tag = et[0];
    const srcMatch = tag.match(/(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i);
    if (srcMatch) {
      let src = srcMatch[1];
      if (src.startsWith("//")) src = "https:" + src;
      if (isPlayableEmbed(src)) embedUrls.add(src);
    }
  }
  const knownHosts = [
    "ok.ru",
    "filemoon",
    "streamtape",
    "vk.com",
    "vkvideo.ru",
    "vidoza",
    "videzz",
    "voe",
    "streamwish",
    "hqq.tv",
    "waaw.to",
    "netu"
  ].concat(DOOD_DOMAINS);
  const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
  rawUrls.forEach((url) => {
    const lower = url.toLowerCase();
    if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(url)) {
      embedUrls.add(url.replace(/['"\\>].*$/, ""));
    }
  });
  return Array.from(embedUrls);
}
function buildStreamObject(rawStream, embedUrl, showTitle, season, episode, mediaType) {
  let serverName = "Server";
  const lower = (embedUrl || "").toLowerCase();
  if (isDoodDomain(embedUrl)) {
    if (lower.includes("playmogo")) serverName = "PlayMogo";
    else serverName = "DoodStream";
  } else if (lower.includes("ok.ru")) serverName = "OK.ru";
  else if (lower.includes("filemoon")) serverName = "FileMoon";
  else if (lower.includes("vk.com") || lower.includes("vkvideo.ru"))
    serverName = "VK Video";
  else if (lower.includes("streamtape")) serverName = "StreamTape";
  else if (lower.includes("hqq.tv") || lower.includes("waaw.to") || lower.includes("netu"))
    serverName = "Netu";
  else if (lower.includes("vidoza") || lower.includes("videzz")) serverName = "Vidoza";
  const isTv = mediaType === "tv" || mediaType === "series";
  const displayTitle = isTv && season && episode ? `${showTitle} S${season}E${episode}` : showTitle;
  const rawUrl = typeof rawStream === "string" ? rawStream : rawStream?.rawUrl;
  const isM3u8 = rawUrl && rawUrl.includes(".m3u8");
  return {
    name: `DozaAnimata - ${serverName}`,
    title: displayTitle,
    url: rawUrl,
    quality: isM3u8 ? "Auto" : "1080p",
    language: "ro",
    headers: rawStream?.headers || HEADERS
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

// src/dozaanimata/index.js
async function extract(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  console.log(
    `[dozaanimata] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
  );
  try {
    const tmdbData = await fetchTmdbDetails(tmdbId, mediaType);
    if (!tmdbData) return [];
    const isTv = mediaType === "tv" || mediaType === "series";
    const titlesToTry = Array.from(
      new Set([tmdbData.title, tmdbData.titleRo].filter(Boolean))
    );
    let pageHtml = null;
    let matchedTitle = tmdbData.title;
    const slugCandidates = [];
    const baseSlugs = titlesToTry.map((t) => slugify(t)).filter(Boolean);
    if (isTv && season && episode) {
      for (const slug of baseSlugs) {
        slugCandidates.push(`episode/${slug}-sezonul-${season}-episodul-${episode}`);
        slugCandidates.push(`episode/${slug}-sezonul-${season}-episodul-${episode}-online-in-romana`);
        slugCandidates.push(`episode/${slug}-sezonul-${season}-episodul-${episode}-dublat-in-romana`);
        slugCandidates.push(`${slug}-sezonul-${season}-episodul-${episode}-online-in-romana`);
        slugCandidates.push(`${slug}-sezonul-${season}-episodul-${episode}-dublat-in-romana`);
        slugCandidates.push(`${slug}-sezonul-${season}-episodul-${episode}`);
      }
    } else {
      if (tmdbData.year) {
        for (const slug of baseSlugs) {
          slugCandidates.push(`${slug}-${tmdbData.year}-dublat-in-romana`);
          slugCandidates.push(`${slug}-${tmdbData.year}-subtitrat-in-romana`);
          slugCandidates.push(`${slug}-${tmdbData.year}-online-in-romana`);
          slugCandidates.push(`${slug}-${tmdbData.year}`);
        }
      }
      for (const slug of baseSlugs) {
        slugCandidates.push(`${slug}-dublat-in-romana`);
        slugCandidates.push(`${slug}-subtitrat-in-romana`);
        slugCandidates.push(`${slug}-online-in-romana`);
        slugCandidates.push(`${slug}`);
      }
    }
    for (const slug of slugCandidates) {
      const candidateUrl = `${BASE_URL}/${slug}/`;
      console.log(`[dozaanimata] Checking direct slug URL: ${candidateUrl}`);
      const html = await fetchHtml(candidateUrl);
      if (html) {
        console.log(`[dozaanimata] Direct URL matched: ${candidateUrl}`);
        pageHtml = html;
        break;
      }
    }
    if (!pageHtml) {
      for (const title of titlesToTry) {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
        const searchHtml = await fetchHtml(searchUrl);
        if (searchHtml) {
          const searchResults = [];
          const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
          let lm;
          while ((lm = linkRe.exec(searchHtml)) !== null) {
            const href = lm[1];
            if (!href || href.includes("wp-") || href.includes("/category/") || href.includes("/genre/") || href.includes("/release-year/") || href.includes("/country/") || href.includes("/tag/") || href === BASE_URL + "/") continue;
            const lower = href.toLowerCase();
            if (isTv && season && episode) {
              const epRegex = new RegExp(
                `sezonul-${season}-episodul-${episode}(?:-|\\/|$)`,
                "i"
              );
              if (epRegex.test(lower)) searchResults.push(href);
            } else {
              if (href.startsWith(BASE_URL) && (lower.includes("dublat-in-romana") || lower.includes("subtitrat-in-romana") || lower.includes("online-in-romana") || baseSlugs.some((s) => lower.includes(s)))) {
                searchResults.push(href);
              }
            }
          }
          if (searchResults.length > 0) {
            const targetUrl = searchResults[0];
            pageHtml = await fetchHtml(targetUrl);
            if (pageHtml) {
              matchedTitle = title;
              break;
            }
          }
        }
      }
    }
    if (!pageHtml) {
      console.log("[dozaanimata] Could not find media page.");
      return [];
    }
    const embedUrls = await extractEmbedsFromPage(pageHtml);
    console.log(`[dozaanimata] Discovered ${embedUrls.length} stream embed(s)`);
    const finalStreams = [];
    for (const embedUrl of embedUrls) {
      console.log(`[dozaanimata] Resolving raw stream for embed: ${embedUrl}`);
      const rawStream = await resolveEmbedToRawStream(embedUrl);
      if (rawStream && rawStream.rawUrl) {
        console.log(
          `[dozaanimata] Successfully resolved raw stream: ${rawStream.rawUrl}`
        );
        finalStreams.push(
          buildStreamObject(
            rawStream,
            embedUrl,
            matchedTitle,
            season,
            episode,
            mediaType
          )
        );
      } else {
        console.log(`[dozaanimata] Skipping unresolved embed: ${embedUrl}`);
      }
    }
    return finalizeStreams(finalStreams, {
      name: "DozaAnimata",
      provider: "dozaanimata"
    });
  } catch (error) {
    console.error("[dozaanimata] Error:", error.message);
    return [];
  }
}
var getStreams = createProvider({
  name: "DozaAnimata",
  supportedTypes: ["movie", "tv"],
  extract
});
