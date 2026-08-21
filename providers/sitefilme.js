/** SiteFilme - Nuvio provider bundle */
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

// src/sitefilme/index.js
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

// src/sitefilme/index.js
var BASE_URL = "https://sitefilme.com";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${BASE_URL}/`
      }
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
      return null;
    }
    return text;
  } catch (e) {
    console.error(`[sitefilme] Fetch error for ${url}:`, e.message);
    return null;
  }
}
async function searchSite(query) {
  const cleanQuery = query.replace(/[:\-–—]/g, " ").trim();
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(cleanQuery)}`;
  const html = await fetchHtml(searchUrl);
  if (!html) return [];
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const linkRe = /<a\b[^>]*href=["']([^"']*\/online\/(\d+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while (match = linkRe.exec(html)) {
    const url = match[1];
    const id = match[2];
    const inner = match[3];
    if (seen.has(id)) continue;
    seen.add(id);
    const titleAttrMatch = match[0].match(/title=["']([^"']+)["']/i);
    let titleText = titleAttrMatch ? titleAttrMatch[1] : inner.replace(/<[^>]+>/g, " ").trim();
    titleText = titleText.replace(/\s+/g, " ");
    const yearMatch = (titleText + " " + match[0]).match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
    results.push({
      id,
      url: url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`,
      title: titleText,
      year
    });
  }
  return results;
}
function extractStreamsFromHtml(html, videoId = null, season = null, episode = null) {
  if (!html) return [];
  const foundStreams = [];
  const seenUrls = /* @__PURE__ */ new Set();
  let detectedVideoId = videoId;
  let detectedSeason = season;
  let detectedEpisode = episode;
  if (!detectedVideoId) {
    const vMatch = html.match(/videoID\s*=\s*["'](\d+)["']/i);
    if (vMatch) detectedVideoId = vMatch[1];
  }
  if (!detectedSeason) {
    const sMatch = html.match(/season\s*=\s*["'](\d+)["']/i);
    if (sMatch) detectedSeason = sMatch[1];
  }
  if (!detectedEpisode) {
    const eMatch = html.match(/episode\s*=\s*["'](\d+)["']/i);
    if (eMatch) detectedEpisode = eMatch[1];
  }
  const resolveTemplate = (rawUrl) => {
    let res = rawUrl.replace(/[`'";]+$/g, "").trim();
    if (detectedVideoId) {
      res = res.replace(/\$\{videoID\}/g, detectedVideoId).replace(/videoID/g, detectedVideoId);
    }
    if (detectedSeason) {
      res = res.replace(/\$\{season\}/g, detectedSeason).replace(/season/g, detectedSeason);
    }
    if (detectedEpisode) {
      res = res.replace(/\$\{episode\}/g, detectedEpisode).replace(/episode/g, detectedEpisode);
    }
    return res;
  };
  const hlsSourceMatch = html.match(/hlsSource\s*=\s*["'`]?([^"'`\s;]+)["'`]?/i);
  if (hlsSourceMatch) {
    let m3u8 = resolveTemplate(hlsSourceMatch[1]);
    if (m3u8 && m3u8.startsWith("http") && m3u8.includes(".m3u8") && !m3u8.includes("${")) {
      seenUrls.add(m3u8);
      foundStreams.push({
        url: m3u8,
        type: "hls",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${BASE_URL}/`
        }
      });
    }
  }
  const mediaMatches = html.match(/https?:\/\/[^\s"'<>\\`]+(?:\.m3u8|\.mp4)[^\s"'<>\\`]*/gi) || [];
  mediaMatches.forEach((mediaUrl) => {
    const resolvedUrl = resolveTemplate(mediaUrl.replace(/\\/g, "").replace(/&amp;/g, "&"));
    if (!seenUrls.has(resolvedUrl) && !resolvedUrl.includes("youtube.com") && !resolvedUrl.includes("${")) {
      seenUrls.add(resolvedUrl);
      foundStreams.push({
        url: resolvedUrl,
        type: resolvedUrl.includes(".m3u8") ? "hls" : "mp4",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${BASE_URL}/`
        }
      });
    }
  });
  const iframeSrcMatches = html.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi) || [];
  iframeSrcMatches.forEach((iframeTag) => {
    const srcMatch = iframeTag.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch) {
      let src = srcMatch[1];
      if (src.startsWith("//")) src = "https:" + src;
      if (src.startsWith("http") && !src.includes("youtube.com") && !src.includes("youtu.be") && !seenUrls.has(src)) {
        seenUrls.add(src);
        foundStreams.push({
          url: src,
          type: "embed",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: `${BASE_URL}/`
          }
        });
      }
    }
  });
  return foundStreams;
}
function buildStreamObject(mediaStream, showTitle, season, episode, mediaType) {
  const isTv = mediaType === "tv" || mediaType === "series";
  const displayTitle = isTv && season && episode ? `${showTitle} S${season}E${episode}` : `${showTitle}`;
  let serverName = "Direct HLS";
  const lower = mediaStream.url.toLowerCase();
  if (lower.includes("filmm.link")) serverName = "Filmm Direct";
  else if (lower.includes(".vip/")) serverName = "STF Direct";
  else if (lower.includes("vidoza") || lower.includes("videzz")) serverName = "Vidoza";
  else if (lower.includes("streamtape")) serverName = "Streamtape";
  else if (lower.includes("filemoon")) serverName = "FileMoon";
  return {
    name: `SiteFilme - ${serverName}`,
    title: displayTitle,
    url: mediaStream.url,
    quality: "1080p",
    language: "ro",
    headers: mediaStream.headers || {
      "User-Agent": USER_AGENT,
      Referer: `${BASE_URL}/`
    }
  };
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
async function extract(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  console.log(
    `[sitefilme] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
  );
  try {
    const tmdbData = await fetchTmdbDetails(tmdbId, mediaType);
    if (!tmdbData) return [];
    const titlesToTry = Array.from(
      new Set([tmdbData.titleRo, tmdbData.title].filter(Boolean))
    );
    console.log("[sitefilme] Searching titles:", titlesToTry);
    const isTv = mediaType === "tv" || mediaType === "series";
    let targetHtml = null;
    let targetId = null;
    let matchedTitle = tmdbData.titleRo || tmdbData.title;
    searchLoop: for (const title of titlesToTry) {
      const queries = buildSearchQueries(title);
      const targetSlug = slugify(title);
      const slugPrefix = targetSlug.split("-").slice(0, 2).join("-");
      for (const query of queries) {
        console.log(`[sitefilme] Searching query: "${query}"`);
        const searchResults = await searchSite(query);
        if (!searchResults || searchResults.length === 0) continue;
        for (const item of searchResults) {
          if (item.year && tmdbData.year && Math.abs(item.year - tmdbData.year) > 1) {
            continue;
          }
          const itemSlug = slugify(item.title);
          const matchesTitle = itemSlug.includes(targetSlug) || itemSlug.includes(slugPrefix) || targetSlug.includes(itemSlug);
          if (!matchesTitle && searchResults.length > 1) {
            continue;
          }
          if (isTv && season && episode) {
            const epUrl = `${BASE_URL}/serial/${item.id}/s${season}e${episode}/`;
            console.log(`[sitefilme] Probing TV episode URL: ${epUrl}`);
            const epHtml = await fetchHtml(epUrl);
            if (epHtml && (epHtml.includes("hlsSource") || epHtml.includes(".m3u8"))) {
              targetHtml = epHtml;
              targetId = item.id;
              matchedTitle = title;
              break searchLoop;
            }
            const hubHtml = await fetchHtml(item.url);
            if (hubHtml) {
              const epRegex = new RegExp(
                `href=["']([^"']*\\/serial\\/${item.id}\\/s0*${season}e0*${episode}\\/?)["']`,
                "i"
              );
              const epMatch = hubHtml.match(epRegex);
              if (epMatch) {
                const subEpHtml = await fetchHtml(epMatch[1]);
                if (subEpHtml) {
                  targetHtml = subEpHtml;
                  targetId = item.id;
                  matchedTitle = title;
                  break searchLoop;
                }
              }
            }
          } else {
            console.log(`[sitefilme] Fetching movie page: ${item.url}`);
            const movieHtml = await fetchHtml(item.url);
            if (movieHtml && (movieHtml.includes("hlsSource") || movieHtml.includes(".m3u8"))) {
              targetHtml = movieHtml;
              targetId = item.id;
              matchedTitle = title;
              break searchLoop;
            }
          }
        }
      }
    }
    if (!targetHtml) {
      console.log("[sitefilme] No valid media page or stream found.");
      return [];
    }
    const extractedStreams = extractStreamsFromHtml(targetHtml, targetId, season, episode);
    console.log(`[sitefilme] Discovered ${extractedStreams.length} stream candidate(s)`);
    const streams = [];
    for (const st of extractedStreams) {
      streams.push(
        buildStreamObject(
          st,
          matchedTitle,
          season,
          episode,
          mediaType
        )
      );
    }
    return finalizeStreams(streams, {
      name: "SiteFilme",
      provider: "sitefilme"
    });
  } catch (error) {
    console.error("[sitefilme] Error:", error.message);
    return [];
  }
}
var getStreams = createProvider({
  name: "SiteFilme",
  supportedTypes: ["movie", "tv"],
  extract
});
