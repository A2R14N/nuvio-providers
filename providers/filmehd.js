// src/lib/sitefilme.js
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

// src/lib/filmehd.js
var FILMEHD_ORIGIN = "https://filmehd.to";
var JUNK_MEDIA_HOSTS = [
  "jwpcdn.com",
  "jsdelivr.net",
  "yandex.ru",
  "ytimg.com",
  "youtube.com",
  "youtu.be",
  "googlevideo.com"
];
function isJunkMediaHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return JUNK_MEDIA_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function safeUrl(value, base = FILMEHD_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function subtitleLanguage(label) {
  const value = normalizeTitle(label);
  if (!value) return "ro";
  if (/(?:romanian|romana|romaneasca)/.test(value)) return "ro";
  if (/english/.test(value)) return "en";
  return value.split(" ")[0] || "ro";
}
function parseCardTitle(title, pathname) {
  const clean = decodeHtml(String(title || "")).replace(/\s+/g, " ").trim();
  const isSerialPath = /^\/seriale\//i.test(pathname || "");
  const seasonMatch = /(?:^|\s)Sezonul\s+(\d+)\s*$/i.exec(clean);
  const withoutSeason = seasonMatch ? clean.slice(0, seasonMatch.index).trim() : clean;
  const yearMatch = /^(.*?)\s*\((\d{4})\)\s*$/.exec(withoutSeason);
  const titleWithoutYear = yearMatch ? yearMatch[1].trim() : withoutSeason;
  let year = yearMatch ? Number(yearMatch[2]) : null;
  let season = seasonMatch ? Number(seasonMatch[1]) : null;
  if (!year && !isSerialPath) year = Number(/-(\d{4})\/?$/i.exec(pathname || "")?.[1] || 0) || null;
  if (!season && isSerialPath) season = Number(/-sezonul-(\d+)\/?$/i.exec(pathname || "")?.[1] || 0) || null;
  return { titleWithoutYear, year, season };
}
function extractSearchCandidates(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<article\b[^>]*>/gi)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const kind = /\bclass\s*=\s*(["'])([^"']*)\1/i.exec(openings[index][0])?.[2] ? /\bitem\s+(movies|seasons|tvshows)\b/i.exec(/\bclass\s*=\s*(["'])([^"']*)\1/i.exec(openings[index][0])?.[2] || "")?.[1]?.toLowerCase() : null;
    if (!kind) continue;
    const chunk = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const anchors = [...chunk.matchAll(/<a\b[^>]*href\s*=\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl(match[2])).filter((url2) => url2 && url2.origin === FILMEHD_ORIGIN && /^\/(?:filme|seriale)\/[a-z0-9-]+\/?$/i.test(url2.pathname));
    const url = anchors.find((candidate) => !seen.has(candidate.href));
    if (!url) continue;
    seen.add(url.href);
    const heading = stripTags(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(chunk)?.[1] || "");
    const fallbackTitle = stripTags(/\btitle\s*=\s*(["'])([\s\S]*?)\1/i.exec(chunk)?.[2] || "").replace(/\s*Online Subtitrat.*$/i, "").trim();
    const title = heading || fallbackTitle;
    if (!title) continue;
    const parsed = parseCardTitle(title, url.pathname);
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: parsed.titleWithoutYear,
      year: parsed.year,
      season: parsed.season,
      kind: kind === "movies" ? "movie" : "tv"
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
function scoreFilmehdCandidate(candidate, metadata, mediaType, season = null) {
  if (!candidate || !metadata) return 0;
  const wantedType = mediaType === "tv" ? "tv" : "movie";
  if (candidate.kind !== wantedType) return 0;
  if (wantedType === "tv" && (!Number.isInteger(season) || Number(season) < 0 || candidate.season !== Number(season))) return 0;
  const wanted = normalizeTitle(metadata.title);
  const full = normalizeTitle(candidate.titleWithoutYear);
  if (!wanted || !full) return 0;
  let score = 0;
  if (full === wanted) score += 120;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(full)) score += 65;
  else return 0;
  score += Math.round(tokenSimilarity(full, wanted) * 30);
  if (wantedType === "movie") {
    if (!metadata.year || !candidate.year) score -= 10;
    else if (metadata.year !== candidate.year) return 0;
    else score += 30;
  }
  return score;
}
function selectCandidate(candidates, metadata, mediaType, season = null) {
  const ranked = (Array.isArray(candidates) ? candidates : []).map((candidate) => ({ candidate, score: scoreFilmehdCandidate(candidate, metadata, mediaType, season) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function extractPlayerOptions(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<li\b[^>]*class\s*=\s*(["'])[^"']*\bdooplay_player_option\b[^"']*\1[^>]*>/gi)];
  const options = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const chunk = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const url = safeUrl(/\bdata-vs\s*=\s*(["'])([\s\S]*?)\1/i.exec(openings[index][0])?.[2]);
    if (!url || seen.has(url.href)) continue;
    seen.add(url.href);
    const name = stripTags(/<span\s+class=["'][^"']*\bservers\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(chunk)?.[1] || "").trim();
    options.push({ url: url.href, name });
  }
  return options;
}
function isTrailerOption(option) {
  if (isJunkMediaHost(new URL(option.url).hostname)) return true;
  return /trailer/i.test(String(option.name || ""));
}
function filterServerOptions(options) {
  return (Array.isArray(options) ? options : []).filter((option) => option && option.url).filter((option) => !/^\d+$/.test(String(option.name || "").trim())).filter((option) => {
    try {
      return !isTrailerOption(option);
    } catch {
      return false;
    }
  });
}
function selectEpisodeOptions(options, episode) {
  const wanted = Number(episode);
  if (!Number.isInteger(wanted) || wanted < 1) return [];
  return (Array.isArray(options) ? options : []).filter((option) => option && option.url).filter((option) => /^\d+$/.test(String(option.name || "").trim()) && Number(String(option.name).trim()) === wanted).filter((option) => {
    try {
      return !isTrailerOption(option);
    } catch {
      return false;
    }
  });
}
function extractMetaframeUrl(html) {
  const tag = [...String(html || "").matchAll(/<iframe\b[^>]*>/gi)].find((match) => /\bmetaframe\b/i.test(match[0]));
  if (!tag) return null;
  return safeUrl(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(tag[0])?.[2]);
}
function extractEmbedSources(html, playerUrl) {
  const source = String(html || "");
  const files = [...source.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => ({ match: match[2], url: safeUrl(match[2], playerUrl) })).filter((entry) => entry.url);
  if (!files.length) return null;
  const media = files.find((entry) => /\.m3u8$/i.test(entry.url.pathname)) || files.find((entry) => /\.mp4$/i.test(entry.url.pathname));
  if (!media) return null;
  const subtitles = [];
  for (const match of source.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:srt|vtt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl(match[2], playerUrl);
    if (!url) continue;
    const label = decodeHtml(match[4]).replace(/\s+/g, " ").trim() || "Subtitrare";
    subtitles.push({ url: url.href, language: subtitleLanguage(label), label });
  }
  const quality = /label\s*:\s*(["'])\s*(\d{3,4})p/i.exec(source)?.[2];
  return { url: media.url.href, type: /\.m3u8$/i.test(media.url.pathname) ? "hls" : "mp4", quality: quality ? `${quality}p` : "HD", subtitles };
}
function extractGenericMediaUrls(html, playerUrl) {
  const source = String(html || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(/https:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/gi)) {
    const url = safeUrl(match[0], playerUrl);
    if (!url || seen.has(url.href) || isJunkMediaHost(url.hostname)) continue;
    seen.add(url.href);
    results.push({ url: url.href, type: /\.m3u8$/i.test(url.pathname) ? "hls" : "mp4", quality: "HD", subtitles: [] });
    if (results.length >= 2) break;
  }
  return results;
}

// src/providers/filmehd.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PLAYLIST_ACCEPT = "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8";
var MAX_PLAYERS = 3;
async function fetchText(url, referer, accept = "text/html,application/xhtml+xml", attempts = 2) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", headers, redirect: "follow" });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text !== "string" || !text.trim()) continue;
      const finalUrl = typeof response.url === "string" && /^https:\/\//i.test(response.url) ? response.url : url;
      return { text, url: finalUrl };
    } catch {
    }
  }
  return null;
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html.text) : null;
}
function subtitleResult(subtitle, playerUrl) {
  return {
    url: subtitle.url,
    language: subtitle.language || "ro",
    name: subtitle.label || "Subtitrare",
    headers: { Referer: playerUrl, "User-Agent": USER_AGENT }
  };
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const origin = safeUrl(stream.playerUrl)?.origin;
  const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles.map((subtitle) => subtitleResult(subtitle, stream.playerUrl)) : [];
  return {
    title: `FilmeHD${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "FilmeHD",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin, "User-Agent": USER_AGENT },
    subtitles
  };
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist.text, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
async function resolveEmbed(option, pageUrl) {
  const embed = await fetchText(option.url, pageUrl);
  if (!embed) return [];
  const source = extractEmbedSources(embed.text, embed.url);
  if (source) return source.type === "hls" ? expandHlsVariants(source, embed.url) : [{ ...source, playerUrl: embed.url }];
  return extractGenericMediaUrls(embed.text, embed.url).map((entry) => ({ ...entry, playerUrl: embed.url }));
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const searchUrl = `${FILMEHD_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
    const searchPage = await fetchText(searchUrl, `${FILMEHD_ORIGIN}/`);
    if (!searchPage) return [];
    const picked = selectCandidate(extractSearchCandidates(searchPage.text), metadata, mediaType, mediaType === "tv" ? Number(season) : null);
    if (!picked) return [];
    const page = await fetchText(picked.url, searchPage.url);
    if (!page) return [];
    let options = extractPlayerOptions(page.text);
    options = mediaType === "tv" ? selectEpisodeOptions(options, Number(episode)) : filterServerOptions(options);
    if (!options.length && mediaType === "movie") {
      const metaframe = extractMetaframeUrl(page.text);
      if (metaframe) options = [{ url: metaframe.href, name: "" }];
    }
    if (!options.length) return [];
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const option of options.slice(0, MAX_PLAYERS)) {
      for (const source of await resolveEmbed(option, page.url)) {
        if (!source?.url || seen.has(source.url)) continue;
        seen.add(source.url);
        resolved.push(source);
      }
    }
    return resolved.map((stream) => streamResult(
      stream,
      mediaType === "tv" ? Number(season) : null,
      mediaType === "tv" ? Number(episode) : null
    ));
  } catch (error) {
    console.error("FilmeHD failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
