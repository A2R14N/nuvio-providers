/** FSOnline - Nuvio provider bundle */
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

// src/fsonline/index.js
var index_exports = {};
__export(index_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(index_exports);

// src/fsonline/http.js
var BASE_URL = "https://www3.fsonline.app";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};
async function fetchText(url, options = {}) {
  console.log(`[FSOnline] Fetching HTML: ${url}`);
  const response = await fetch(url, {
    headers: { ...HEADERS, ...options.headers }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${url}`);
  return await response.text();
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

// src/fsonline/extractor.js
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
async function extractVidmolyStream(fileCode) {
  const candidates = [
    `https://vidmoly.to/e/${fileCode}`,
    `https://vidmoly.me/w/${fileCode}`,
    `https://vidmoly.to/w/${fileCode}`,
    `https://vidmoly.me/embed-${fileCode}.html`,
    `https://vidmoly.to/embed-${fileCode}.html`,
    `https://vidmoly.me/${fileCode}.html`,
    `https://vidmoly.to/${fileCode}.html`
  ];
  for (const url of candidates) {
    try {
      const html = await fetchText(url, {
        headers: { ...HEADERS, Referer: "https://player.fsonline.app/" }
      });
      if (html && !html.includes("404 Not Found")) {
        const match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
        if (match) {
          const directM3u8 = match[1];
          try {
            const probe = await fetch(directM3u8, {
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                Referer: "https://vidmoly.me/",
                Accept: "*/*"
              }
            });
            const probeBody = await probe.text();
            if (probe.ok && probeBody.startsWith("#EXTM3U")) {
              return directM3u8;
            }
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }
  }
  return null;
}
async function buildTargetUrl(title, year, mediaType, season, episode) {
  const slug = slugify(title);
  if (mediaType === "movie") {
    return `${BASE_URL}/film/${slug}-${year}/`;
  }
  const tvCandidates = [
    `${BASE_URL}/tv/${slug}-season-${season}-episode-${episode}/`,
    `${BASE_URL}/episoade/${slug}-sezonul-${season}-episodul-${episode}/`,
    `${BASE_URL}/tv/${slug}-sezonul-${season}-episodul-${episode}/`,
    `${BASE_URL}/episoade/${slug}-season-${season}-episode-${episode}/`
  ];
  for (const candidate of tvCandidates) {
    try {
      const html = await fetchText(candidate);
      if (html && !html.includes("404 Not Found") && !html.includes("Page Not Found")) {
        return candidate;
      }
    } catch (e) {
    }
  }
  return tvCandidates[0];
}
async function unpackPlayerPage(playerUrl, serverName) {
  const results = [];
  try {
    const res = await fetch(playerUrl, {
      headers: { ...HEADERS, Referer: `${BASE_URL}/` }
    });
    if (!res.ok) return results;
    const html = await res.text();
    const fileCodeMatch = html.match(/file_code\s*=\s*['"]([a-zA-Z0-9]+)['"]/);
    if (fileCodeMatch) {
      const directM3u8 = await extractVidmolyStream(fileCodeMatch[1]);
      if (directM3u8 && directM3u8.includes(".m3u8")) {
        results.push({
          title: serverName,
          url: directM3u8,
          quality: "1080p",
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: "https://vidmoly.me/"
          }
        });
      }
    }
  } catch (e) {
  }
  return results;
}
async function getStreamsFromFSOnline(tmdbId, mediaType, season, episode) {
  const streams = [];
  const addedUrls = /* @__PURE__ */ new Set();
  try {
    const info = await fetchTmdbDetails(tmdbId, mediaType);
    if (!info) return [];
    const targetUrl = await buildTargetUrl(
      info.title,
      info.year,
      mediaType,
      season,
      episode
    );
    const pageHtml = await fetchText(targetUrl);
    let movieId = null;
    const movieIdMatch = pageHtml.match(/movie-id=["'](\d+)["']/i);
    if (movieIdMatch) {
      movieId = movieIdMatch[1];
    }
    if (!movieId) {
      const bodyClassMatch = pageHtml.match(/<body[^>]*class=["'][^"']*postid-(\d+)[^"']*["']/);
      if (bodyClassMatch) movieId = bodyClassMatch[1];
    }
    if (movieId) {
      const lazyParams = new URLSearchParams();
      lazyParams.append("action", "lazy_player");
      lazyParams.append("movieID", movieId);
      const lazyRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: {
          ...HEADERS,
          Referer: targetUrl,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: lazyParams.toString()
      });
      if (lazyRes.ok) {
        const lazyHtml = await lazyRes.text();
        const tabRe = /<li\b[^>]*\bdata-vs=["']([^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi;
        let tm;
        let i = 0;
        while ((tm = tabRe.exec(lazyHtml)) !== null) {
          const playerUrl = tm[1];
          const liContent = tm[2];
          const spanMatch = liContent.match(/<span[^>]*>([^<]+)<\/span>/);
          const serverName = spanMatch ? spanMatch[1].trim() : `Server ${i + 1}`;
          i++;
          if (playerUrl) {
            const unpacked = await unpackPlayerPage(playerUrl, serverName);
            for (const stream of unpacked || []) {
              if (stream.url && stream.url.includes(".m3u8") && !addedUrls.has(stream.url)) {
                addedUrls.add(stream.url);
                streams.push({
                  name: `FSOnline - ${serverName}`,
                  title: stream.title,
                  url: stream.url,
                  quality: stream.quality || "1080p",
                  language: "ro",
                  headers: stream.headers
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
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

// src/fsonline/index.js
async function extract(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !["movie", "tv", "series"].includes(mediaType)) return [];
  if ((mediaType === "tv" || mediaType === "series") && (!season || !episode)) return [];
  try {
    return finalizeStreams(
      await getStreamsFromFSOnline(tmdbId, mediaType, season, episode),
      { name: "FSOnline", provider: "fsonline" }
    );
  } catch (error) {
    console.error(`[FSOnline] Error: ${error.message}`);
    return [];
  }
}
var getStreams = createProvider({
  name: "FSOnline",
  supportedTypes: ["movie", "tv"],
  extract
});
