// src/lib/sitefilme.js
var SITE_ORIGIN = "https://sitefilme.com";
function decodeHtml(value) {
  if (typeof value !== "string") return "";
  const named = {
    amp: "&",
    apos: "'",
    quot: '"',
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    ș: "ș",
    ţ: "ţ"
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 1114111) {
        try {
          return String.fromCodePoint(code);
        } catch {
        }
      }
      return match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function normalizeTitle(value) {
  return decodeHtml(String(value || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function attributeValue(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
  return decodeHtml(pattern.exec(tag)?.[2] || "").trim();
}
function splitTitleAndYear(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((?:TV\s+Series\s+)?(\d{4})\)\s*$/i.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function extractTmdbMetadata(html) {
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html || "")?.[1];
  const pageTitle = stripTags(titleTag || "");
  const suffixRemoved = pageTitle.replace(/\s+[—–-]\s+The Movie Database\s*\(TMDB\)\s*$/i, "").trim();
  const parsed = splitTitleAndYear(suffixRemoved);
  if (!parsed.title) return null;
  return parsed;
}
function postChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*>/gi)].filter((match) => attributeValue(match[0], "class").split(/\s+/).includes("post"));
  return openings.map((match, index) => {
    const start = match.index + match[0].length;
    const end = openings[index + 1]?.index ?? source.length;
    return source.slice(start, end);
  });
}
function extractSearchCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const card of postChunks(html)) {
    const anchors = [...card.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>/gi)];
    const anchor = anchors.find((match) => /\/online\/\d+\/?(?:[?#]|$)/i.test(decodeHtml(match[2])) && attributeValue(match[0], "title"));
    if (!anchor) continue;
    let url;
    try {
      url = new URL(decodeHtml(anchor[2]), SITE_ORIGIN).href;
    } catch {
      continue;
    }
    if (!/^https:\/\/sitefilme\.com\/online\/\d+\/?$/i.test(url) || seen.has(url)) continue;
    const title = attributeValue(anchor[0], "title");
    if (!title) continue;
    seen.add(url);
    const parsed = splitTitleAndYear(title);
    candidates.push({
      url,
      title,
      titleWithoutYear: parsed.title,
      year: parsed.year,
      isSeries: /Seriale\s+Online/i.test(stripTags(card))
    });
  }
  return candidates;
}
function tokenSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreCandidate(candidate, metadata, mediaType) {
  const wanted = normalizeTitle(metadata.title);
  const full = normalizeTitle(candidate.titleWithoutYear);
  const primary = normalizeTitle(candidate.titleWithoutYear.split(/\s+[–—-]\s+/)[0]);
  let score = 0;
  if (primary === wanted) score += 100;
  else if (full === wanted) score += 95;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${primary} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(primary)) score += 65;
  score += Math.round(tokenSimilarity(full, wanted) * 35);
  if (metadata.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
  const wantsSeries = mediaType === "tv";
  score += candidate.isSeries === wantsSeries ? 20 : -20;
  return score;
}
function selectCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 90 ? ranked[0].candidate : null;
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) return null;
  const expected = new RegExp(`/serial/\\d+/s${season}e${episode}/?`, "i");
  for (const match of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
    const raw = decodeHtml(match[2]);
    if (!expected.test(raw)) continue;
    try {
      const url = new URL(raw, SITE_ORIGIN);
      return url.origin === SITE_ORIGIN && expected.test(url.pathname) ? url.href : null;
    } catch {
    }
  }
  return null;
}
function extractAssignment(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=\\s*([\\x60"'])([\\s\\S]*?)\\1\\s*;`, "i");
  return pattern.exec(String(html || ""))?.[2]?.trim() || null;
}
function interpolateKnownVariables(value, variables) {
  if (!value) return null;
  return value.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match);
}
function validatedMediaUrl(value, extension) {
  if (!value || value.includes("${")) return null;
  try {
    const url = new URL(decodeHtml(value));
    return url.protocol === "https:" && url.pathname.toLowerCase().endsWith(extension) ? url.href : null;
  } catch {
    return null;
  }
}
function extractPlayerSources(html) {
  const variables = {
    videoID: extractAssignment(html, "videoID") || "",
    season: extractAssignment(html, "season") || "",
    episode: extractAssignment(html, "episode") || ""
  };
  let hls = interpolateKnownVariables(extractAssignment(html, "hlsSource"), variables);
  let subtitle = interpolateKnownVariables(extractAssignment(html, "subtitleSrc"), variables);
  if (!hls) {
    const sourceTag = /<(?:source|video)\b[^>]*\bsrc\s*=\s*(["'])([^"']+\.m3u8(?:\?[^"']*)?)\1/i.exec(String(html || ""));
    hls = sourceTag?.[2] || null;
  }
  if (!subtitle) {
    const trackTag = /<track\b[^>]*\bsrc\s*=\s*(["'])([^"']+\.(?:vtt|srt)(?:\?[^"']*)?)\1/i.exec(String(html || ""));
    subtitle = trackTag?.[2] || null;
  }
  return {
    hls: validatedMediaUrl(hls, ".m3u8"),
    subtitle: validatedMediaUrl(subtitle, ".vtt")
  };
}
function resolvePlaylistUrl(baseUrl, reference) {
  const value = decodeHtml(String(reference || "")).trim();
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) return null;
  try {
    const resolved = new URL(value, baseUrl);
    return resolved.protocol === "https:" && resolved.pathname.toLowerCase().endsWith(".m3u8") ? resolved.href : null;
  } catch {
    return null;
  }
}
function extractHlsVariants(playlist, masterUrl) {
  if (typeof playlist !== "string" || !playlist.includes("#EXTM3U")) return [];
  const lines = playlist.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const byResolution = /* @__PURE__ */ new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const resolution = /(?:^|,)RESOLUTION=(\d+)x(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1));
    if (!resolution) continue;
    const width = Number(resolution[1]);
    const height = Number(resolution[2]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) continue;
    const bandwidth = Number(/(?:^|,)(?:AVERAGE-)?BANDWIDTH=(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1))?.[1] || 0);
    let reference = null;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (!lines[next] || lines[next].startsWith("#")) continue;
      reference = lines[next];
      index = next;
      break;
    }
    const url = resolvePlaylistUrl(masterUrl, reference);
    if (!url || url === masterUrl) continue;
    const candidate = { url, quality: `${height}p`, width, height, bandwidth };
    const existing = byResolution.get(height);
    if (!existing || candidate.bandwidth > existing.bandwidth) byResolution.set(height, candidate);
  }
  return [...byResolution.values()].sort((left, right) => right.height - left.height);
}
function normalizeMediaType(value) {
  const type = String(value || "").toLowerCase();
  return type === "series" || type === "show" ? "tv" : type;
}

// src/providers/sitefilme.js
var REQUEST_HEADERS = {
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,ro;q=0.8"
};
async function fetchText(url, referer, accept = REQUEST_HEADERS.Accept) {
  const headers = { ...REQUEST_HEADERS, Accept: accept };
  if (referer) headers.Referer = referer;
  const response = await fetch(url, { method: "GET", headers });
  if (!response || !response.ok) return null;
  const text = await response.text();
  return typeof text === "string" && text.trim() ? text : null;
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const url = `https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`;
  const html = await fetchText(url);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveSitePage(metadata, mediaType) {
  const searchUrl = `${SITE_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
  const html = await fetchText(searchUrl, SITE_ORIGIN + "/");
  if (!html) return null;
  const candidate = selectCandidate(extractSearchCandidates(html), metadata, mediaType);
  return candidate ? { ...candidate, searchUrl } : null;
}
function streamResult(pageUrl, sources, stream, season, episode) {
  const episodeLabel = season != null && episode != null ? ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}` : "";
  const headers = { Referer: pageUrl, Origin: SITE_ORIGIN };
  const subtitles = sources.subtitle ? [{
    url: sources.subtitle,
    language: "ro",
    name: "Română",
    headers: { Referer: pageUrl }
  }] : [];
  return {
    title: `SiteFilme${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "SiteFilme",
    type: "hls",
    headers,
    subtitles
  };
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveSitePage(metadata, mediaType);
    if (!page) return [];
    const detailHtml = await fetchText(page.url, page.searchUrl);
    if (!detailHtml) return [];
    let playbackUrl = page.url;
    let playbackHtml = detailHtml;
    if (mediaType === "tv") {
      const seasonNumber = Number(season);
      const episodeNumber = Number(episode);
      if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) return [];
      const episodeUrl = extractEpisodeUrl(detailHtml, seasonNumber, episodeNumber);
      if (!episodeUrl) return [];
      const episodeHtml = await fetchText(episodeUrl, page.url);
      if (!episodeHtml) return [];
      playbackUrl = episodeUrl;
      playbackHtml = episodeHtml;
    }
    const sources = extractPlayerSources(playbackHtml);
    if (!sources.hls) return [];
    const masterPlaylist = await fetchText(sources.hls, playbackUrl, "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8");
    const variants = masterPlaylist ? extractHlsVariants(masterPlaylist, sources.hls) : [];
    const streams = variants.length ? variants : [{ url: sources.hls, quality: "HD" }];
    return streams.map((stream) => streamResult(
      playbackUrl,
      sources,
      stream,
      mediaType === "tv" ? Number(season) : null,
      mediaType === "tv" ? Number(episode) : null
    ));
  } catch (error) {
    console.error("SiteFilme failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
