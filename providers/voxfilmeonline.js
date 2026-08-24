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

// src/lib/voxfilmeonline.js
var VOXFILMEONLINE_ORIGIN = "https://voxfilmeonline.biz";
var AD_HOSTS = [
  "acceptableredheadcaviar.com",
  "googlesyndication.com",
  "doubleclick.net",
  "googletagmanager.com",
  "histats.com",
  "organicpimping.com",
  "boyangvenires.com",
  "cloudflareinsights.com"
];
function isAdHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return AD_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function safeUrl(value, base = VOXFILMEONLINE_ORIGIN) {
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
function extractVoxCandidates(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*class\s*=\s*(["'])[^"']*\bmovie-card\b[^"']*\1[^>]*>/gi)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const card = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const anchor = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1/i.exec(card);
    if (!anchor) continue;
    const url = safeUrl(anchor[2]);
    if (!url || url.origin !== VOXFILMEONLINE_ORIGIN || !/^\/[a-z0-9-]+\/?$/i.test(url.pathname) || url.pathname === "/" || seen.has(url.href)) continue;
    const title = stripTags(/<div\s+class=["']movie-title["']\s*>([\s\S]*?)<\/div>/i.exec(card)?.[1] || "");
    if (!title) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    const slugYear = Number(/-(\d{4})\/?$/i.exec(url.pathname)?.[1] || 0);
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: parsed.title,
      year: parsed.year || slugYear || null,
      isSeries: /\b(?:sezonul?|serial)\b/i.test(title)
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
function scoreVoxCandidate(candidate, metadata, mediaType) {
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
function selectVoxCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreVoxCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function voxPlayerKind(playerUrl) {
  const url = safeUrl(playerUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "voxfilmeonline.biz" || host.endsWith(".voxfilmeonline.biz")) return null;
  if (/^(?:www\.)?streamflash\.[a-z.]+$/.test(host)) return "streamflash";
  if (/^(?:www\.)?firestream\.[a-z.]+$/.test(host)) return "firestream";
  if (/^(?:www\.)?vidara\.[a-z.]+$/.test(host)) return "vidara";
  if (host.includes("vidmoly")) return "vidmoly";
  return "generic";
}
function extractVoxPlayerUrls(html) {
  const source = decodeHtml(String(html || "")).replace(/\\(.)/g, "$1");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const url = safeUrl(match[2]);
    const kind = url ? voxPlayerKind(url.href) : null;
    if (!url || !kind || isAdHost(url.hostname) || seen.has(url.href)) continue;
    seen.add(url.href);
    results.push({ url: url.href, kind });
  }
  return results;
}
function extractStreamFlashSources(html, playerUrl) {
  const video = /<video\b[^>]*>([\s\S]*?)<\/video>/i.exec(String(html || ""))?.[1] || "";
  if (!video) return null;
  const sourceTag = /<source\b[^>]*>/i.exec(video)?.[0] || "";
  const trackTag = [...video.matchAll(/<track\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /\bkind\s*=\s*(["'])?(?:subtitles|captions)\1?/i.test(tag));
  const media = safeUrl(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(sourceTag)?.[2], playerUrl);
  if (!media) return null;
  const subtitle = safeUrl(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag || "")?.[2], playerUrl);
  const quality = /(\d{3,4})p/i.exec(stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ""))?.[1];
  return {
    url: media.href,
    type: "mp4",
    quality: quality ? `${quality}p` : "HD",
    subtitle: subtitle ? { url: subtitle.href, language: /\bsrclang\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "ro", label: /\blabel\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "Subtitrare" } : null
  };
}
function extractVidmolySources(html) {
  const source = String(html || "");
  const sourcesBlock = /sources\s*:\s*\[([\s\S]*?)\]/i.exec(source)?.[1] || "";
  const hls = [...sourcesBlock.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl(match[2])).find((url) => url && /\.m3u8$/i.test(url.pathname));
  const subtitles = [];
  for (const match of source.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:srt|vtt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl(match[2]);
    if (!url) continue;
    subtitles.push({ url: url.href, language: match[4].trim().toLowerCase(), label: match[4].trim() });
  }
  if (!hls) return null;
  return { url: hls.href, type: "hls", quality: "HD", subtitles };
}
function extractVidaraFilecode(playerUrl) {
  const url = safeUrl(playerUrl);
  return url ? /^\/e\/([A-Za-z0-9]+)/.exec(url.pathname)?.[1] || null : null;
}
function mapVidaraStream(data, playerUrl) {
  const url = safeUrl(data?.streaming_url, playerUrl);
  if (!url) return null;
  const subtitles = (Array.isArray(data?.subtitles) ? data.subtitles : []).map((entry) => ({ entry, url: safeUrl(entry?.file_path, playerUrl) })).filter((item) => item.url && item.entry?.type !== 1).map((item) => ({ url: item.url.href, language: String(item.entry.language || "").toLowerCase(), label: String(item.entry.language || "Subtitrare") }));
  return { url: url.href, type: "hls", quality: "HD", subtitles };
}
function extractFireStreamSlug(playerUrl) {
  const url = safeUrl(playerUrl);
  return url ? /^\/e\/([^/?#]+)/i.exec(url.pathname)?.[1] || null : null;
}
function extractFireStreamData(html, playerUrl) {
  const blob = /<script id="token-blob"[^>]*>([\s\S]*?)<\/script>/i.exec(String(html || ""))?.[1]?.trim();
  const dataTag = /<script id="video-data"[^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1];
  if (!blob || !dataTag) return null;
  let video = null;
  try {
    video = JSON.parse(dataTag.trim())?.video;
  } catch {
  }
  if (!video) return null;
  const subtitles = (Array.isArray(video.subtitles) ? video.subtitles : []).map((entry) => ({ entry, url: safeUrl(entry?.url, playerUrl) })).filter((item) => item.url).map((item) => ({ url: item.url.href, language: String(item.entry.language || "").toLowerCase(), label: String(item.entry.label || item.entry.language || "Subtitrare") }));
  const quality = /(\d{3,4})p/i.exec(String(video.originalName || video.title || ""))?.[1];
  return {
    blob,
    quality: quality ? `${quality}p` : "HD",
    subtitles,
    signedVideoUrl: safeUrl(video.signedVideoUrl, playerUrl)?.href || null
  };
}
function mapFireStreamResolved(payload, fallbackQuality) {
  const url = typeof payload?.signedVideoUrl === "string" ? payload.signedVideoUrl.trim() : "";
  if (!/^https:\/\/[^\s]+$/.test(url)) return null;
  const isHls = /\/video\.m3u8(?:[?#]|$)/i.test(url);
  return { url, type: isHls ? "hls" : "mp4", quality: fallbackQuality || "HD", subtitles: [] };
}

// src/providers/voxfilmeonline.js
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
async function postJson(url, payload, playerUrl) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: new URL(url).origin,
        Referer: playerUrl,
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify(payload)
    });
    if (!response || !response.ok) return null;
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveVoxPage(metadata, mediaType) {
  const searchUrl = `${VOXFILMEONLINE_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
  const html = await fetchText(searchUrl, `${VOXFILMEONLINE_ORIGIN}/`);
  if (!html) return null;
  const candidate = selectVoxCandidate(extractVoxCandidates(html), metadata, mediaType);
  return candidate ? { ...candidate, searchUrl } : null;
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
  const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles.map((subtitle) => subtitleResult(subtitle, stream.playerUrl)) : stream.subtitle ? [subtitleResult(stream.subtitle, stream.playerUrl)] : [];
  return {
    title: `VoxFilmeOnline${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "VoxFilmeOnline",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin, "User-Agent": USER_AGENT },
    subtitles
  };
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
async function resolvePlayer(player) {
  const kind = player.kind;
  const playerUrl = player.url;
  if (kind === "streamflash") {
    const html2 = await fetchText(playerUrl, `${VOXFILMEONLINE_ORIGIN}/`);
    const sources = html2 ? extractStreamFlashSources(html2, playerUrl) : null;
    return sources ? [{ ...sources, playerUrl }] : [];
  }
  if (kind === "vidmoly") {
    const html2 = await fetchText(playerUrl, `${VOXFILMEONLINE_ORIGIN}/`);
    const sources = html2 ? extractVidmolySources(html2) : null;
    if (!sources) return [];
    return expandHlsVariants(sources, playerUrl);
  }
  if (kind === "vidara") {
    const filecode = extractVidaraFilecode(playerUrl);
    if (!filecode) return [];
    const data = await postJson(`${new URL(playerUrl).origin}/api/stream`, { filecode, device: "web" }, playerUrl);
    const source = data ? mapVidaraStream(data, playerUrl) : null;
    if (!source) return [];
    return expandHlsVariants(source, playerUrl);
  }
  if (kind === "firestream") {
    const slug = extractFireStreamSlug(playerUrl);
    if (!slug) return [];
    const origin = new URL(playerUrl).origin;
    const html2 = await fetchText(playerUrl, `${VOXFILMEONLINE_ORIGIN}/`);
    const data = html2 ? extractFireStreamData(html2, playerUrl) : null;
    if (!data) return [];
    let resolvedSource = data.signedVideoUrl ? mapFireStreamResolved({ signedVideoUrl: data.signedVideoUrl }, data.quality) : null;
    if (!resolvedSource) {
      const payload = await postJson(`${origin}/api/videos/${encodeURIComponent(slug)}/resolve`, { blob: data.blob }, playerUrl);
      resolvedSource = payload ? mapFireStreamResolved(payload, data.quality) : null;
    }
    if (!resolvedSource) return [];
    const source = { ...resolvedSource, subtitles: data.subtitles };
    return source.type === "hls" ? expandHlsVariants(source, playerUrl) : [{ ...source, playerUrl }];
  }
  const html = await fetchText(playerUrl, `${VOXFILMEONLINE_ORIGIN}/`);
  if (!html) return [];
  const results = [];
  for (const match of decodeEscaped(html).matchAll(/(https:\/\/[^"'\s<>]+\.m3u8(?:\?[^"'\s<>]*)?)/gi)) {
    results.push({ url: match[1], type: "hls", quality: "HD", subtitles: [], playerUrl });
  }
  for (const match of decodeEscaped(html).matchAll(/(https:\/\/[^"'\s<>]+\.mp4(?:\?[^"'\s<>]*)?)/gi)) {
    results.push({ url: match[1], type: "mp4", quality: "HD", subtitles: [], playerUrl });
  }
  return results.slice(0, 2);
}
function decodeEscaped(value) {
  return String(value || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveVoxPage(metadata, mediaType);
    if (!page) return [];
    const detailHtml = await fetchText(page.url, page.searchUrl);
    if (!detailHtml) return [];
    const players = extractVoxPlayerUrls(detailHtml);
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
    console.error("VoxFilmeOnline failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
