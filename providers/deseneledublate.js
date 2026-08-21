/** DeseneDublate - Nuvio provider bundle */
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

// src/deseneledublate/index.js
var index_exports = {};
__export(index_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(index_exports);

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

// src/deseneledublate/index.js
var BASE_URL = "https://deseneledublate.com";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var cachedNonce = null;
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: BASE_URL + "/"
      }
    });
    if (!response.ok) return null;
    try {
      const requested = new URL(url);
      const finalUrl = new URL(response.url || url);
      if (requested.pathname !== "/" && finalUrl.origin === requested.origin && finalUrl.pathname === "/") {
        return null;
      }
    } catch (_) {
    }
    const text = await response.text();
    if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
      return null;
    }
    return text;
  } catch (e) {
    console.error(`[deseneledublate] Fetch error for ${url}:`, e.message);
    return null;
  }
}
async function getDooPlayNonce() {
  if (cachedNonce) return cachedNonce;
  try {
    const html = await fetchHtml(`${BASE_URL}/`);
    if (!html) return null;
    const match = html.match(/var\s+dtGonza\s*=\s*({[^;]+});/);
    if (match) {
      const dtGonza = JSON.parse(match[1]);
      if (dtGonza.nonce) {
        cachedNonce = dtGonza.nonce;
        return cachedNonce;
      }
    }
    const nonceMatch = html.match(/"nonce"\s*:\s*"([a-zA-Z0-9]{8,64})"/);
    if (nonceMatch) {
      cachedNonce = nonceMatch[1];
      return cachedNonce;
    }
  } catch (_) {
  }
  return null;
}
async function searchDooPlay(query) {
  const results = [];
  const nonce = await getDooPlayNonce();
  if (nonce) {
    try {
      const apiUrl = `${BASE_URL}/wp-json/dooplay/search/?keyword=${encodeURIComponent(query)}&nonce=${nonce}`;
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${BASE_URL}/`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && !data.error) {
          for (const key of Object.keys(data)) {
            const item = data[key];
            if (item && item.url) {
              results.push({
                title: item.title || "",
                url: item.url,
                year: item.extra && item.extra.date ? parseInt(item.extra.date, 10) : null
              });
            }
          }
          if (results.length > 0) return results;
        }
      }
    } catch (_) {
    }
  }
  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const html = await fetchHtml(searchUrl);
    if (html) {
      const hrefRe = /\bhref\s*=\s*["']([^"']+)["']/gi;
      let match;
      const seen = /* @__PURE__ */ new Set();
      while (match = hrefRe.exec(html)) {
        const href = match[1];
        if (!href || seen.has(href)) continue;
        seen.add(href);
        if (href.includes("/desen/") || href.includes("/serial/") || href.includes("/episoade/")) {
          results.push({
            title: href,
            url: href,
            year: (href.match(/(?:19|20)\d{2}/) || [])[0] ? parseInt((href.match(/(?:19|20)\d{2}/) || [])[0], 10) : null
          });
        }
      }
    }
  } catch (_) {
  }
  return results;
}
function buildSearchQueries(title) {
  const cleaned = title.replace(/[:–—\-]/g, " ").replace(/\s+/g, " ").trim();
  const queries = [cleaned];
  const withoutParens = cleaned.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParens && !queries.includes(withoutParens)) queries.push(withoutParens);
  const words = cleaned.split(" ").map((word) => word.replace(/[^a-z0-9]/gi, "")).filter((word) => word.length >= 3);
  if (words.length > 2) {
    const firstTwo = words.slice(0, 2).join(" ");
    if (!queries.includes(firstTwo)) queries.push(firstTwo);
  }
  for (const word of words) {
    if (word.length >= 4 && !queries.includes(word)) queries.push(word);
  }
  return queries;
}
async function findEpisodeFromSerial(serialHref, season, episode) {
  const html = await fetchHtml(serialHref);
  if (!html) return null;
  const targetSeason = Number(season) || 1;
  const targetEpisode = Number(episode) || 1;
  const pageSeasonMatch = serialHref.match(/sezonul-(\d+)/i);
  const pageSeason = pageSeasonMatch ? Number(pageSeasonMatch[1]) : 1;
  const hrefRe = /\bhref\s*=\s*["']([^"']+)["']/gi;
  let match;
  let fallbackHref = null;
  while (match = hrefRe.exec(html)) {
    let href = match[1];
    const em = href.match(/\/episoade\/[^"']*sezonul-(\d+)-episodul-(\d+)/i);
    if (em && Number(em[1]) === targetSeason && Number(em[2]) === targetEpisode) {
      if (!href.startsWith("http")) {
        href = BASE_URL + (href.startsWith("/") ? href : "/" + href);
      }
      if (href.includes("dublat-in-romana")) return { type: "page", url: href };
      if (!fallbackHref) fallbackHref = href;
    }
  }
  if (fallbackHref) return { type: "page", url: fallbackHref };
  const itemRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let itemMatch;
  while (itemMatch = itemRe.exec(html)) {
    const embedUrl = itemMatch[1];
    const anchorText = itemMatch[2].replace(/<[^>]+>/g, " ").toLowerCase();
    const sMatch = anchorText.match(/sezonul\s*(\d+)/i);
    const eMatch = anchorText.match(/episodul\s*(\d+)/i);
    const itemSeason = sMatch ? Number(sMatch[1]) : pageSeason;
    if (eMatch && itemSeason === targetSeason && Number(eMatch[1]) === targetEpisode) {
      if (embedUrl.includes("/episoade/")) {
        return { type: "page", url: embedUrl };
      }
      return { type: "embed", url: embedUrl };
    }
  }
  return null;
}
function mediaHeaders(origin) {
  return {
    "User-Agent": USER_AGENT,
    Referer: `${origin}/`,
    Origin: origin
  };
}
async function validateMediaUrl(url, headers) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return false;
    if (url.includes(".m3u8")) {
      const playlist = await response.text();
      return playlist.startsWith("#EXTM3U");
    }
    return true;
  } catch (_) {
    return false;
  }
}
var ST_SCRIPT_URL_RE = /(?:ideoolink|botlink|robotlink)[^=]*=\s*["']([^"']*)["']\s*\+\s*(?:''\s*\+\s*)?\(\s*["']([^"']*)["']\)\.substring\((\d+)\)(?:\.substring\((\d+)\))?/gi;
function reconstructStreamtapeUrls(html) {
  const candidates = [];
  let match;
  while (match = ST_SCRIPT_URL_RE.exec(html)) {
    const [, part1, part2, n1, n2] = match;
    let part = part2.substring(Number(n1));
    if (n2 != null) part = part.substring(Number(n2));
    let url = part1 + part;
    if (!url.includes("get_video")) continue;
    url = url.replace(/^\/streamtape\.com(?=\/)/, "");
    if (url.startsWith("//")) url = `https:${url}`;
    else if (url.startsWith("/")) url = `https://streamtape.com${url}`;
    if (url.startsWith("https://") && url.includes("/get_video?")) {
      candidates.push(url);
    }
  }
  return candidates.filter((url) => url.startsWith("https://streamtape.com")).sort((a, b) => {
    const realA = a.startsWith("https://streamtape.com/get_video") ? 0 : 1;
    const realB = b.startsWith("https://streamtape.com/get_video") ? 0 : 1;
    return realA - realB;
  });
}
async function validateStreamtapeUrl(url, headers) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return false;
    if (url.includes(".m3u8")) {
      const playlist = await response.text();
      return playlist.startsWith("#EXTM3U");
    }
    const requested = url.split("?")[0].replace(/\/$/, "");
    const finalUrl = (response.url || url).split("?")[0].replace(/\/$/, "");
    return finalUrl !== requested;
  } catch (_) {
    return false;
  }
}
async function resolveStreamtape(embedUrl) {
  try {
    const html = await fetchHtml(embedUrl);
    if (!html || /video not found/i.test(html)) return null;
    const origin = new URL(embedUrl).origin;
    const headers = mediaHeaders(origin);
    const candidates = reconstructStreamtapeUrls(html);
    for (const candidate of candidates) {
      if (await validateStreamtapeUrl(candidate, headers)) {
        return { url: candidate, headers };
      }
    }
    let mediaUrl = null;
    const direct = html.match(
      /(?:https?:)?\/\/[^"'\\\s]+\/get_video\?[^"'\\\s<]+/i
    );
    if (direct) {
      mediaUrl = direct[0].startsWith("//") ? `https:${direct[0]}` : direct[0];
    }
    if (!mediaUrl) {
      const path = html.match(/\/get_video\?[^"'\\\s<+]+/i)?.[0];
      const token = html.match(
        /token=['"]?\s*\+\s*\(['"]([^'"]+)['"]\)\.substring\((\d+)\)/i
      );
      if (path && token) {
        mediaUrl = `${new URL(embedUrl).origin}${path}${token[1].substring(
          Number(token[2])
        )}`;
      }
    }
    if (!mediaUrl) return null;
    mediaUrl = mediaUrl.replace(/&amp;/g, "&");
    if (!await validateMediaUrl(mediaUrl, headers)) return null;
    return { url: mediaUrl, headers };
  } catch (_) {
    return null;
  }
}
async function resolveOkRu(embedUrl) {
  try {
    const origin = new URL(embedUrl).origin;
    const headers = mediaHeaders(origin);
    const html = await fetchHtml(embedUrl);
    if (!html) return null;
    const clean = (s) => s.replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    const mediaUrl = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i)?.[0] || html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/i)?.[0] || html.match(/https?:\/\/vd\d*\.okcdn\.ru\/?[^"'\s<>]*/i)?.[0] || "";
    if (!mediaUrl) return null;
    const finalUrl = clean(mediaUrl);
    if (!await validateMediaUrl(finalUrl, headers)) return null;
    return { url: finalUrl, headers };
  } catch (_) {
    return null;
  }
}
async function resolveDeseneMirror(embedUrl) {
  try {
    const urlObject = new URL(embedUrl);
    let playerUrl = embedUrl.replace(/\/f\//, "/e/");
    if (playerUrl.includes("watch_video.php")) {
      const vMatch = playerUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (vMatch) {
        playerUrl = `${urlObject.origin}/e/${vMatch[1]}`;
      }
    }
    const html = await fetchHtml(playerUrl);
    if (!html) return null;
    const mediaUrl = (html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i)?.[0] || "").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (!mediaUrl) return null;
    const headers = mediaHeaders(urlObject.origin);
    return { url: mediaUrl, headers };
  } catch (_) {
    return null;
  }
}
async function resolveGenericEmbed(embedUrl) {
  try {
    const origin = new URL(embedUrl).origin;
    const headers = mediaHeaders(origin);
    const html = await fetchHtml(embedUrl);
    if (!html) return null;
    const clean = (s) => s.replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    const candidates = [];
    const mediaRe = /https?:\/\/[^"'\s\\<>]*(?:\.m3u8|\.mp4)[^"'\s\\<>]*/gi;
    let match;
    while (match = mediaRe.exec(html)) candidates.push(clean(match[0]));
    const absGvRe = /https?:\/\/[^"'\s\\<>]*get_video\?[^"'\s\\<>]*/gi;
    while (match = absGvRe.exec(html)) candidates.push(clean(match[0]));
    const relGvRe = /\/get_video\?[^"'\s\\<>]+/gi;
    while (match = relGvRe.exec(html)) {
      const url = clean(match[0]);
      if (url.startsWith("/")) candidates.push(origin + url);
    }
    for (const url of candidates) {
      if (!/^https?:\/\//i.test(url)) continue;
      const valid = url.includes("get_video") ? await validateStreamtapeUrl(url, headers) : await validateMediaUrl(url, headers);
      if (valid) return { url, headers };
    }
    return null;
  } catch (_) {
    return null;
  }
}
function normalizeVidozaEmbedUrl(input) {
  const url = new URL(input);
  const match = url.pathname.match(
    /\/(?:embed-)?([a-zA-Z0-9]+)(?:\.html)?\/?$/
  );
  if (!match) return input;
  return `${url.origin}/embed-${match[1]}.html`;
}
function parseVidozaQuality(value) {
  const match = String(value || "").match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
}
async function resolveVidoza(embedUrl) {
  try {
    const normalizedUrl = normalizeVidozaEmbedUrl(embedUrl);
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: normalizedUrl
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const sources = [];
    const patterns = [
      /(?:file|src)\s*[:=,]?\s*["']([^"']+)["'][^}\]]*?\bres\s*[:=]\s*["']?([^"',}\]]+)/gi,
      /\bres\s*[:=]\s*["']?([^"',}\]]+)[^}\]]*?(?:file|src)\s*[:=,]?\s*["']([^"']+)["']/gi
    ];
    let match;
    while (match = patterns[0].exec(html)) {
      sources.push({ url: match[1], quality: parseVidozaQuality(match[2]) });
    }
    while (match = patterns[1].exec(html)) {
      sources.push({ url: match[2], quality: parseVidozaQuality(match[1]) });
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
  } catch (_) {
    return null;
  }
}
async function extractEmbedsFromPage(html) {
  if (!html) return [];
  const embedUrls = /* @__PURE__ */ new Set();
  const isPlayableEmbed = (url) => {
    if (!url || typeof url !== "string") return false;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return false;
    if (lower.includes("wp-json") || lower.includes("wp-content") || lower.includes("wp-includes"))
      return false;
    if (lower.endsWith(".js") || lower.includes(".js?") || lower.includes("loadermain") || lower.includes("googleapis.com"))
      return false;
    if (lower.includes("popads") || lower.includes("doubleclick") || lower.includes("adsterra") || lower.includes("popunder"))
      return false;
    return true;
  };
  const playerOptions = [];
  const attrOf = (attrs, name) => {
    const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(
      attrs
    );
    return match ? match[1] : null;
  };
  const openTagRe = /<([a-z0-9]+)([^>]*)>/gi;
  let tagMatch;
  while (tagMatch = openTagRe.exec(html)) {
    const attrs = tagMatch[2];
    const post = attrOf(attrs, "data-post") || attrOf(attrs, "data-id");
    const type = attrOf(attrs, "data-type");
    const nume = attrOf(attrs, "data-nume") || attrOf(attrs, "data-option");
    if (post && type && nume) {
      playerOptions.push({ post, type, nume });
    }
  }
  if (playerOptions.length > 0) {
    for (const opt of playerOptions) {
      try {
        const formData = new URLSearchParams();
        formData.append("action", "doo_player_ajax");
        formData.append("post", opt.post);
        formData.append("nume", opt.nume);
        formData.append("type", opt.type);
        const ajaxRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: `${BASE_URL}/`
          },
          body: formData.toString()
        });
        if (ajaxRes.ok) {
          const ajaxData = await ajaxRes.json();
          if (ajaxData && ajaxData.embed_url) {
            let embed = ajaxData.embed_url;
            const iframeMatch = embed.match(/src=["']([^"']+)["']/i);
            if (iframeMatch) embed = iframeMatch[1];
            if (embed.startsWith("//")) embed = "https:" + embed;
            if (isPlayableEmbed(embed)) {
              embedUrls.add(embed);
            }
          }
        }
      } catch (_) {
      }
    }
  }
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
    "vidmoly",
    "desene.deseneledublate.com"
  ];
  const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
  rawUrls.forEach((url) => {
    const lower = url.toLowerCase();
    if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(url)) {
      const cleaned = url.replace(/['"\\>].*$/, "");
      embedUrls.add(cleaned);
    }
  });
  return Array.from(embedUrls);
}
function buildStreamObject(embedUrl, showTitle, season, episode, mediaType, playbackUrl = embedUrl, playbackHeaders = null) {
  let serverName = "Server";
  const lower = embedUrl.toLowerCase();
  if (lower.includes("ok.ru")) serverName = "OK.ru";
  else if (lower.includes("filemoon")) serverName = "Filemoon";
  else if (lower.includes("streamtape")) serverName = "Streamtape";
  else if (lower.includes("vk.com")) serverName = "VK Video";
  else if (lower.includes("vidoza") || lower.includes("videzz")) serverName = "Vidoza";
  else if (lower.includes("dood")) serverName = "DoodStream";
  else if (lower.includes("mixdrop")) serverName = "Mixdrop";
  else if (lower.includes("supervideo")) serverName = "SuperVideo";
  else if (lower.includes("desene.deseneledublate.com")) serverName = "Desene Mirror";
  else if (lower.includes("vidguard") || lower.includes("vid-guard") || lower.includes("vgembed") || lower.includes("vguard"))
    serverName = "VidGuard";
  const isTv = mediaType === "tv" || mediaType === "series";
  const displayTitle = isTv && season && episode ? `${showTitle} S${season}E${episode}` : `${showTitle}`;
  return {
    name: `DeseneDublate - ${serverName}`,
    title: displayTitle,
    url: playbackUrl,
    quality: "Auto",
    language: "ro",
    headers: playbackHeaders || {
      "User-Agent": USER_AGENT,
      Referer: `${BASE_URL}/`
    }
  };
}
async function resolveEmbedToStream(embedUrl) {
  let resolved = null;
  if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
    const streamUrl = await resolveVidoza(embedUrl);
    if (streamUrl) {
      const origin = new URL(embedUrl).origin;
      resolved = {
        url: streamUrl,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${origin}/`,
          Origin: origin
        }
      };
    }
  } else if (embedUrl.includes("streamtape")) {
    resolved = await resolveStreamtape(embedUrl);
  } else if (embedUrl.includes("ok.ru")) {
    resolved = await resolveOkRu(embedUrl);
  } else if (/vidmoly|streamwish|vid-guard|vguard|vgembed|vidguard/i.test(embedUrl)) {
    resolved = await resolveGenericEmbed(embedUrl);
  } else if (embedUrl.includes("desene.deseneledublate.com")) {
    resolved = await resolveDeseneMirror(embedUrl);
  }
  return resolved;
}
async function extract(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  try {
    const tmdbData = await fetchTmdbDetails(tmdbId, mediaType);
    if (!tmdbData) return [];
    const titlesToTry = Array.from(
      new Set([tmdbData.titleRo, tmdbData.title].filter(Boolean))
    );
    const isTv = mediaType === "tv" || mediaType === "series";
    let targetEmbeds = [];
    let matchedTitle = tmdbData.titleRo || tmdbData.title;
    const URL_SUFFIXES = ["dublat-in-romana", "online-subtitrat"];
    for (const title of titlesToTry) {
      const slug = slugify(title);
      const urlsToTry = [];
      if (isTv && season && episode) {
        const episodeTag = `sezonul-${season}-episodul-${episode}`;
        if (tmdbData.year) {
          for (const suffix of [...URL_SUFFIXES, ""]) {
            urlsToTry.push(
              `${BASE_URL}/episoade/${slug}-${tmdbData.year}-${episodeTag}${suffix ? "-" + suffix : ""}/`
            );
          }
        }
        for (const suffix of [...URL_SUFFIXES, ""]) {
          urlsToTry.push(
            `${BASE_URL}/episoade/${slug}-${episodeTag}${suffix ? "-" + suffix : ""}/`
          );
        }
      } else {
        if (tmdbData.year) {
          for (const suffix of URL_SUFFIXES) {
            urlsToTry.push(
              `${BASE_URL}/desen/${slug}-${tmdbData.year}-${suffix}/`
            );
          }
        }
        for (const suffix of URL_SUFFIXES) {
          urlsToTry.push(`${BASE_URL}/desen/${slug}-${suffix}/`);
          urlsToTry.push(`${BASE_URL}/${slug}-${suffix}/`);
        }
      }
      for (const targetUrl of urlsToTry) {
        const html = await fetchHtml(targetUrl);
        if (html) {
          const embeds = await extractEmbedsFromPage(html);
          if (embeds.length > 0) {
            targetEmbeds = embeds;
            matchedTitle = title;
            break;
          }
        }
      }
      if (targetEmbeds.length > 0) break;
    }
    if (targetEmbeds.length === 0) {
      searchLoop: for (const title of titlesToTry) {
        const targetSlug = slugify(title);
        const slugPrefix = targetSlug.split("-").slice(0, 2).join("-");
        const queries = buildSearchQueries(title);
        for (const query of queries) {
          const searchResults = await searchDooPlay(query);
          if (!searchResults || searchResults.length === 0) continue;
          for (const item of searchResults) {
            const itemUrl = item.url;
            const itemLower = itemUrl.toLowerCase();
            if (!isTv && item.year && tmdbData.year && item.year !== tmdbData.year) {
              if (Math.abs(item.year - tmdbData.year) > 1) continue;
            }
            if (isTv && season && episode) {
              const epSearchStr = `sezonul-${season}-episodul-${episode}`;
              if (itemLower.includes(epSearchStr) && (itemLower.includes(targetSlug) || itemLower.includes(slugPrefix))) {
                const epHtml = await fetchHtml(itemUrl);
                if (epHtml) {
                  const embeds = await extractEmbedsFromPage(epHtml);
                  if (embeds.length > 0) {
                    targetEmbeds = embeds;
                    matchedTitle = title;
                    break searchLoop;
                  }
                }
              } else if (itemLower.includes("/serial/")) {
                const serialSeasonMatch = itemLower.match(/sezonul-(\d+)/i);
                if (serialSeasonMatch && Number(serialSeasonMatch[1]) !== Number(season)) {
                  continue;
                }
                const epResult = await findEpisodeFromSerial(itemUrl, season, episode);
                if (epResult) {
                  if (epResult.type === "embed") {
                    targetEmbeds = [epResult.url];
                    matchedTitle = title;
                    break searchLoop;
                  } else if (epResult.type === "page") {
                    const epHtml = await fetchHtml(epResult.url);
                    if (epHtml) {
                      const embeds = await extractEmbedsFromPage(epHtml);
                      if (embeds.length > 0) {
                        targetEmbeds = embeds;
                        matchedTitle = title;
                        break searchLoop;
                      }
                    }
                  }
                }
              }
            } else {
              if (itemLower.includes("/desen/") && (itemLower.includes(targetSlug) || itemLower.includes(slugPrefix))) {
                const movieHtml = await fetchHtml(itemUrl);
                if (movieHtml) {
                  const embeds = await extractEmbedsFromPage(movieHtml);
                  if (embeds.length > 0) {
                    targetEmbeds = embeds;
                    matchedTitle = title;
                    break searchLoop;
                  }
                }
              }
            }
          }
        }
      }
    }
    if (targetEmbeds.length === 0) {
      return [];
    }
    const streamPromises = targetEmbeds.map(async (embedUrl) => {
      const resolved = await resolveEmbedToStream(embedUrl);
      if (!resolved?.url) return null;
      return buildStreamObject(
        embedUrl,
        matchedTitle,
        season,
        episode,
        mediaType,
        resolved.url,
        resolved.headers
      );
    });
    const resolvedStreams = (await Promise.all(streamPromises)).filter(Boolean);
    return finalizeStreams(resolvedStreams, {
      name: "DeseneDublate",
      provider: "deseneledublate"
    });
  } catch (error) {
    console.error("[deseneledublate] Error:", error.message);
    return [];
  }
}
var getStreams = createProvider({
  name: "DeseneDublate",
  supportedTypes: ["movie", "tv"],
  extract
});
