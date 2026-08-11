/**
 * peachify - Built from src/peachify/
 * Generated: 2026-08-11T00:43:52.559Z
 */
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

// src/peachify/index.js
var API_BASE = "https://proxy.eat-peach.sbs";
var SITE_BASE = "https://peachify.top";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function apiHeaders() {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Origin: SITE_BASE,
    Referer: `${SITE_BASE}/`
  };
}
function endpoint(tmdbId, mediaType, season, episode) {
  const id = encodeURIComponent(tmdbId);
  if (mediaType === "tv") {
    return `${API_BASE}/air/tv/${id}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
  }
  return `${API_BASE}/air/movie/${id}`;
}
function normalizeHeaders(headers) {
  const normalized = { "User-Agent": USER_AGENT, Accept: "*/*" };
  if (!headers || typeof headers !== "object")
    return normalized;
  for (const key of Object.keys(headers)) {
    if (headers[key] != null)
      normalized[key] = String(headers[key]);
  }
  return normalized;
}
function unwrapHlsSource(source) {
  if (!source || typeof source !== "object")
    return null;
  const wrapped = source.url || source.file || source.src || source.stream || source.streamUrl;
  if (!wrapped || typeof wrapped !== "string")
    return null;
  let directUrl = wrapped;
  let proxyHeaders = {};
  try {
    const parsed = new URL(wrapped);
    if (parsed.hostname === "proxy.eat-peach.sbs" && parsed.pathname === "/m3u8-proxy") {
      directUrl = parsed.searchParams.get("url") || "";
      const encodedHeaders = parsed.searchParams.get("headers");
      if (encodedHeaders) {
        try {
          proxyHeaders = JSON.parse(encodedHeaders);
        } catch (_) {
          proxyHeaders = {};
        }
      }
    }
  } catch (_) {
    return null;
  }
  if (!directUrl || !/^https?:\/\//i.test(directUrl) || !/\.m3u8(?:$|[?#])/i.test(directUrl)) {
    return null;
  }
  try {
    const direct = new URL(directUrl);
    if (direct.hostname === "proxy.eat-peach.sbs")
      return null;
  } catch (_) {
    return null;
  }
  return {
    url: directUrl,
    headers: normalizeHeaders(Object.assign({}, proxyHeaders, source.headers || {})),
    language: String(source.dub || source.audio || source.language || "en"),
    label: String(source.label || source.name || "Air")
  };
}
function maxQuality(playlist) {
  let height = 0;
  for (const match of playlist.matchAll(/RESOLUTION=\d+x(\d+)/gi)) {
    height = Math.max(height, Number(match[1]) || 0);
  }
  return height ? `${height}p` : "Auto";
}
function normalizeSubtitles(entries) {
  if (!Array.isArray(entries))
    return [];
  return entries.filter((entry) => entry && /^https?:\/\//i.test(entry.url || entry.file || "")).map((entry) => {
    const language = String(entry.langCode || entry.lang || entry.language || "und").toLowerCase();
    const label = String(entry.label || entry.name || entry.language || language);
    return {
      url: entry.url || entry.file,
      lang: language,
      language,
      label,
      name: label
    };
  });
}
function validateSource(source, subtitles) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(source.url, {
        headers: source.headers,
        redirect: "follow"
      });
      if (!response.ok)
        return null;
      const playlist = yield response.text();
      if (!playlist.trimStart().startsWith("#EXTM3U"))
        return null;
      const quality = maxQuality(playlist);
      return {
        name: "Peachify - Air",
        title: `Peachify \u2022 Air \u2022 ${source.label} \u2022 ${quality} \u2022 ${source.language}`,
        url: source.url,
        quality,
        language: source.language,
        type: "application/x-mpegurl",
        provider: "peachify",
        headers: source.headers,
        subtitles
      };
    } catch (_) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season = null, episode = null) {
  return __async(this, null, function* () {
    const normalizedType = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || normalizedType !== "movie" && normalizedType !== "tv")
      return [];
    if (normalizedType === "tv" && (!season || !episode))
      return [];
    try {
      const response = yield fetch(endpoint(tmdbId, normalizedType, season, episode), {
        headers: apiHeaders(),
        redirect: "follow"
      });
      if (!response.ok)
        return [];
      const payload = yield response.json();
      const data = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
      const sources = data && Array.isArray(data.sources) ? data.sources : [];
      const subtitles = normalizeSubtitles(
        data && data.subtitles || payload && payload.subtitles || []
      );
      const candidates = sources.map(unwrapHlsSource).filter(Boolean);
      const validated = yield Promise.all(
        candidates.map((source) => validateSource(source, subtitles))
      );
      const seen = /* @__PURE__ */ new Set();
      return validated.filter((stream) => {
        if (!stream || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Peachify] ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
