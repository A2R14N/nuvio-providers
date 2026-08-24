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

// src/lib/fsonline.js
var FSONLINE_ORIGIN = "https://www3.fsonline.app";
function safeUrl(value, base = FSONLINE_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*$/.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function extractSearchCandidates(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<article\b[^>]*class\s*=\s*(["'])[^"']*\bitem\s+(?:movies|tvshows)\b[^"']*\1[^>]*>/gi)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const card = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const anchor = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1/i.exec(card);
    if (!anchor) continue;
    const url = safeUrl(anchor[2]);
    if (!url || url.origin !== FSONLINE_ORIGIN || !/^\/(?:film|seriale)\/[a-z0-9-]+\/?$/i.test(url.pathname) || seen.has(url.href)) continue;
    const heading = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(card)?.[1];
    const title = decodeHtml(String(heading || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() || /\btitle\s*=\s*(["'])([\s\S]*?)\1/i.exec(card)?.[2]?.replace(/\s*Watch Online\s*$/i, "").trim();
    if (!title) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    const slugYear = Number(/-(\d{4})(?:-[a-z0-9]+)*\/?$/i.exec(url.pathname)?.[1] || 0);
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: parsed.title,
      year: parsed.year || slugYear || null,
      isSeries: /\btvshows\b/i.test(openings[index][0])
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
  let score = 0;
  if (full === wanted) score += 100;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(full)) score += 65;
  score += Math.round(tokenSimilarity(full, wanted) * 35);
  if (metadata.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
  const wantsSeries = mediaType === "tv";
  score += candidate.isSeries === wantsSeries ? 20 : -20;
  return score;
}
function selectCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function extractPlayerPostId(html) {
  for (const match of String(html || "").matchAll(/<div\b[^>]*>/gi)) {
    if (!/\bid\s*=\s*(["'])show_player_lazy\1/i.test(match[0])) continue;
    const id = /\bmovie-id\s*=\s*(["'])(\d+)\1/i.exec(match[0])?.[2];
    if (id) return id;
  }
  return null;
}
function extractPlayerEmbedUrls(html) {
  const source = decodeHtml(String(html || "")).replace(/\\(.)/g, "$1");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (value) => {
    const url = safeUrl(value);
    if (!url || seen.has(url.href)) return;
    seen.add(url.href);
    results.push(url.href);
  };
  for (const match of source.matchAll(/\bdata-vs\s*=\s*(["'])([\s\S]*?)\1/gi)) push(match[2]);
  for (const match of source.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1/gi)) push(match[2]);
  return results;
}
function classifyEmbedHost(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (/vidmoly/.test(host)) return "jwplayer";
  if (/^(?:www\.)?embedsun\.[a-z.]+$/.test(host)) return "jwplayer";
  if (/^(?:www\.)?(?:vsembed|cloudorchestranova)\.[a-z.]+$/.test(host)) return "vschain";
  if (/^(?:www\.)?playmogo\.[a-z.]+$/.test(host)) return "dood";
  if (host === "www3.fsonline.app" || host.endsWith(".fsonline.app")) return null;
  return "generic";
}
function subtitleLanguage(label) {
  const clean = String(label || "").trim().toLowerCase();
  return /^(?:romanian|romana|română)$/.test(clean) ? "ro" : clean;
}
function extractJwPlayerSources(html, embedUrl) {
  const source = String(html || "");
  const sourcesBlock = /sources\s*:\s*\[([\s\S]*?)\]/i.exec(source)?.[1] || "";
  const media = [...sourcesBlock.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl(match[2], embedUrl)).find((url) => url && /\.(?:m3u8|mp4)$/i.test(url.pathname));
  if (!media) return null;
  const tracksBlock = /baseTracks\s*=\s*\[([\s\S]*?)\]\s*;/i.exec(source)?.[1] || source;
  const subtitles = [];
  for (const match of tracksBlock.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:vtt|srt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl(match[2], embedUrl);
    if (!url) continue;
    subtitles.push({ url: url.href, language: subtitleLanguage(match[4]), label: match[4].trim() });
  }
  subtitles.sort((left, right) => Number(right.language === "ro") - Number(left.language === "ro"));
  const qualityHint = /label\s*:\s*(["'])(\d{3,4})p/i.exec(source)?.[2];
  return {
    url: media.href,
    type: /\.mp4$/i.test(media.pathname) ? "mp4" : "hls",
    quality: qualityHint ? `${qualityHint}p` : "HD",
    subtitles
  };
}
function extractSeasonUrl(html, season) {
  if (!Number.isInteger(season) || season < 1) return null;
  const expected = new RegExp(`/sezonul/[a-z0-9-]+-sezonul-${season}(?:/|[?#]|$)`, "i");
  for (const match of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
    const raw = decodeHtml(match[2]);
    if (!expected.test(raw)) continue;
    const url = safeUrl(raw);
    if (url && url.origin === FSONLINE_ORIGIN && expected.test(url.pathname)) return url.href;
  }
  return null;
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) return null;
  const expected = new RegExp(`/episoade/[a-z0-9-]+-sezonul-${season}-episodul-${episode}(?:/|[?#]|$)`, "i");
  for (const match of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
    const raw = decodeHtml(match[2]);
    if (!expected.test(raw)) continue;
    const url = safeUrl(raw);
    if (url && url.origin === FSONLINE_ORIGIN && expected.test(url.pathname + url.search)) return url.href;
  }
  return null;
}

// src/providers/fsonline.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PLAYLIST_ACCEPT = "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8";
async function fetchText(url, referer, accept = "text/html,application/xhtml+xml", attempts = 2) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", headers });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text === "string" && text.trim()) return text;
    } catch {
    }
  }
  return null;
}
async function fetchEmbed(url, referer) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", headers: { Accept: "text/html,application/xhtml+xml", Referer: referer, "User-Agent": USER_AGENT } });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text === "string" && text.trim()) return { url: response.url || url, text };
    } catch {
    }
  }
  return null;
}
function encodeForm(payload) {
  return Object.keys(payload).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`).join("&");
}
async function postForm(url, payload, referer) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: new URL(url).origin,
        Referer: referer,
        "User-Agent": USER_AGENT
      },
      body: encodeForm(payload)
    });
    if (!response || !response.ok) return null;
    const text = await response.text();
    return typeof text === "string" && text.trim() ? text : null;
  } catch {
    return null;
  }
}
function decodeEscaped(value) {
  return String(value || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveFsPage(metadata, mediaType) {
  const searchUrl = `${FSONLINE_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
  const html = await fetchText(searchUrl, `${FSONLINE_ORIGIN}/home2/`);
  if (!html) return null;
  const candidate = selectCandidate(extractSearchCandidates(html), metadata, mediaType);
  return candidate ? { ...candidate, searchUrl } : null;
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
function genericSources(html, playerUrl) {
  const decoded = decodeEscaped(html);
  const results = [];
  for (const match of decoded.matchAll(/(https:\/\/[^"'\s<>]+\.m3u8(?:\?[^"'\s<>]*)?)/gi)) {
    results.push({ url: match[1], type: "hls", quality: "HD", subtitles: [], playerUrl });
  }
  for (const match of decoded.matchAll(/(https:\/\/[^"'\s<>]+\.mp4(?:\?[^"'\s<>]*)?)/gi)) {
    results.push({ url: match[1], type: "mp4", quality: "HD", subtitles: [], playerUrl });
  }
  return results.slice(0, 2);
}
async function resolvePlayer(player) {
  const embed = await fetchEmbed(player.url, player.referer);
  if (!embed) return [];
  if (classifyEmbedHost(embed.url) === "vschain") return [];
  const sources = extractJwPlayerSources(embed.text, embed.url);
  if (sources) return sources.type === "hls" ? expandHlsVariants(sources, embed.url) : [{ ...sources, playerUrl: embed.url }];
  return genericSources(embed.text, embed.url);
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const origin = safeUrl(stream.playerUrl)?.origin;
  return {
    title: `FSonline${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "FSonline",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin, "User-Agent": USER_AGENT },
    subtitles: (stream.subtitles || []).map((subtitle) => ({
      url: subtitle.url,
      language: subtitle.language || "ro",
      name: subtitle.label || "Subtitrare",
      headers: { Referer: stream.playerUrl, "User-Agent": USER_AGENT }
    }))
  };
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveFsPage(metadata, mediaType);
    if (!page) return [];
    let playbackUrl = page.url;
    if (mediaType === "tv") {
      const seasonNumber = Number(season);
      const episodeNumber = Number(episode);
      if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 1 || episodeNumber < 1) return [];
      const seriesHtml = await fetchText(page.url, page.searchUrl);
      if (!seriesHtml) return [];
      const seasonUrl = extractSeasonUrl(seriesHtml, seasonNumber);
      if (!seasonUrl) return [];
      const seasonHtml = await fetchText(seasonUrl, page.url);
      if (!seasonHtml) return [];
      playbackUrl = extractEpisodeUrl(seasonHtml, seasonNumber, episodeNumber);
      if (!playbackUrl) return [];
    }
    const playbackHtml = mediaType === "movie" ? await fetchText(page.url, page.searchUrl) : await fetchText(playbackUrl, page.url);
    if (!playbackHtml) return [];
    const postId = extractPlayerPostId(playbackHtml);
    if (!postId) return [];
    const playerHtml = await postForm(`${FSONLINE_ORIGIN}/wp-admin/admin-ajax.php`, { action: "lazy_player", movieID: postId }, playbackUrl);
    if (!playerHtml) return [];
    const players = extractPlayerEmbedUrls(playerHtml).map((url) => ({ url, referer: playbackUrl }));
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const player of players) {
      for (const source of await resolvePlayer(player)) {
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
    console.error("FSonline failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
