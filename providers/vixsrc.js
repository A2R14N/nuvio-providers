/**
 * vixsrc - Built from src/vixsrc/
 * Generated: 2026-08-06T13:03:47.497Z
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

// src/vixsrc/index.js
var BASE_URL = "https://vixsrc.to";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  Referer: `${BASE_URL}/`,
  Accept: "*/*"
};
function fetchJson(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.json();
  });
}
function fetchText(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.text();
  });
}
function formatM3u8Url(url) {
  if (!url)
    return "";
  const cleanUrl = String(url).trim();
  if (cleanUrl.includes(".m3u8"))
    return cleanUrl;
  const hashIndex = cleanUrl.indexOf("#");
  const base = hashIndex !== -1 ? cleanUrl.slice(0, hashIndex) : cleanUrl;
  const hash = hashIndex !== -1 ? cleanUrl.slice(hashIndex) : "";
  const queryIndex = base.indexOf("?");
  const path = queryIndex !== -1 ? base.slice(0, queryIndex) : base;
  const query = queryIndex !== -1 ? base.slice(queryIndex) : "";
  const pathWithM3u8 = path.endsWith(".m3u8") ? path : `${path}.m3u8`;
  return `${pathWithM3u8}${query}${hash}`;
}
function extractMasterPlaylistDetails(html) {
  if (!html)
    return null;
  const masterIndex = html.indexOf("window.masterPlaylist");
  if (masterIndex === -1)
    return null;
  const section = html.slice(masterIndex, masterIndex + 1500);
  const tokenMatch = section.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
  const expiresMatch = section.match(
    /['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/
  );
  const asnMatch = section.match(/['"]?asn['"]?\s*:\s*['"]([^'"]*)['"]/);
  const urlMatch = section.match(/url:\s*['"]([^'"]+)['"]/);
  if (!urlMatch)
    return null;
  const baseUrl = urlMatch[1];
  const params = [];
  if (tokenMatch && tokenMatch[1]) {
    params.push(`token=${encodeURIComponent(tokenMatch[1])}`);
  }
  if (expiresMatch && expiresMatch[1]) {
    params.push(`expires=${encodeURIComponent(expiresMatch[1])}`);
  }
  if (asnMatch && asnMatch[1]) {
    params.push(`asn=${encodeURIComponent(asnMatch[1])}`);
  }
  params.push("h=1");
  params.push("lang=en");
  const delimiter = baseUrl.includes("?") ? "&" : "?";
  const fullUrl = baseUrl + delimiter + params.join("&");
  return formatM3u8Url(fullUrl);
}
function parseSubtitlesFromM3u8(playlistText) {
  if (!playlistText)
    return [];
  const subtitles = [];
  const regex = /#EXT-X-MEDIA:TYPE=SUBTITLES[^\n]*?NAME="([^"]+)"[^\n]*?(?:LANGUAGE="([^"]+)")?[^\n]*?URI="([^"]+)"/g;
  let match;
  while ((match = regex.exec(playlistText)) !== null) {
    const label = match[1] || "Subtitle";
    const lang = match[2] || "und";
    const url = match[3];
    if (url) {
      subtitles.push({
        url: formatM3u8Url(url),
        lang,
        label
      });
    }
  }
  return subtitles;
}
function parseRenditionsFromM3u8(playlistText) {
  if (!playlistText)
    return [];
  const renditions = [];
  const lines = playlistText.split("\n");
  let currentResolution = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/i);
      if (resMatch) {
        const heightMatch = resMatch[1].match(/x(\d+)/);
        currentResolution = heightMatch ? `${heightMatch[1]}p` : resMatch[1];
      } else {
        currentResolution = "1080p";
      }
    } else if (line && !line.startsWith("#") && line.startsWith("http")) {
      const quality = currentResolution || "1080p";
      renditions.push({
        name: "VixSrc",
        title: `VixSrc - ${quality}`,
        url: formatM3u8Url(line),
        quality,
        type: "application/x-mpegurl",
        headers: DEFAULT_HEADERS
      });
      currentResolution = "";
    }
  }
  return renditions;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const normalizedType = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || normalizedType !== "movie" && normalizedType !== "tv" || normalizedType === "tv" && (!season || !episode)) {
      return [];
    }
    try {
      const apiRoute = normalizedType === "tv" ? `${BASE_URL}/api/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}` : `${BASE_URL}/api/movie/${encodeURIComponent(tmdbId)}`;
      console.log(`[VixSrc] Fetching API: ${apiRoute}`);
      const apiData = yield fetchJson(apiRoute, { headers: DEFAULT_HEADERS });
      if (!apiData || !apiData.src) {
        console.log(`[VixSrc] No embed source found for TMDB ID: ${tmdbId}`);
        return [];
      }
      const rawEmbedPath = apiData.src;
      const embedUrl = rawEmbedPath.startsWith("http") ? rawEmbedPath : `${BASE_URL}${rawEmbedPath}`;
      const refererHeader = normalizedType === "tv" ? `${BASE_URL}/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}` : `${BASE_URL}/movie/${encodeURIComponent(tmdbId)}`;
      console.log(`[VixSrc] Fetching embed page: ${embedUrl}`);
      const embedPageHtml = yield fetchText(embedUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: refererHeader
        }
      });
      const finalPlaylistUrl = extractMasterPlaylistDetails(embedPageHtml);
      if (!finalPlaylistUrl) {
        console.log(`[VixSrc] Could not extract masterPlaylist from embed page`);
        return [];
      }
      console.log(`[VixSrc] Master HLS URL: ${finalPlaylistUrl}`);
      const streams = [];
      let subtitles = [];
      try {
        const playlistText = yield fetchText(finalPlaylistUrl, {
          headers: DEFAULT_HEADERS
        });
        subtitles = parseSubtitlesFromM3u8(playlistText);
        const parsedRenditions = parseRenditionsFromM3u8(playlistText);
        if (parsedRenditions.length > 0) {
          for (const rendition of parsedRenditions) {
            rendition.subtitles = subtitles;
            streams.push(rendition);
          }
        }
      } catch (err) {
        console.log(
          `[VixSrc] Master playlist parsing failed (${err.message})`
        );
      }
      if (streams.length === 0) {
        streams.push({
          name: "VixSrc",
          title: "VixSrc - 1080p",
          url: finalPlaylistUrl,
          quality: "1080p",
          type: "application/x-mpegurl",
          headers: DEFAULT_HEADERS,
          subtitles
        });
      }
      const seen = /* @__PURE__ */ new Set();
      return streams.filter((stream) => {
        if (seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[VixSrc] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
