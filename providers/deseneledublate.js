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

// src/lib/deseneledublate.js
var DESENELEDUBLATE_ORIGIN = "https://deseneledublate.com";
function decodeJavaScriptEscapes(value) {
  return decodeHtml(String(value || "")).replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
}
function safeUrl(value, base = DESENELEDUBLATE_ORIGIN) {
  try {
    const url = new URL(decodeJavaScriptEscapes(value).trim(), base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*[\s\S]*$/.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function articleChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<article\b[^>]*>/gi)];
  return openings.map((match, index) => source.slice(match.index, openings[index + 1]?.index ?? source.length));
}
function extractSearchCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const article of articleChunks(html)) {
    const titleMatch = /<div\s+class=["'][^"']*\btitle\b[^"']*["']\s*>\s*<a\s+[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/i.exec(article);
    if (!titleMatch) continue;
    const url = safeUrl(titleMatch[2]);
    if (!url || url.origin !== DESENELEDUBLATE_ORIGIN) continue;
    const kind = /^\/desen\/[^/]+\/?$/i.test(url.pathname) ? "movie" : /^\/serial\/[^/]+\/?$/i.test(url.pathname) ? "tv" : null;
    if (!kind || seen.has(url.href)) continue;
    const title = stripTags(titleMatch[3]);
    if (!title) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    candidates.push({ url: url.href, title, titleWithoutYear: parsed.title, year: parsed.year, kind });
  }
  return candidates;
}
function titleSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function selectCandidate(candidates, metadata, mediaType) {
  const wanted = normalizeTitle(metadata?.title);
  const typed = candidates.filter((candidate) => candidate.kind === mediaType);
  const ranked = typed.map((candidate) => {
    const found = normalizeTitle(candidate.titleWithoutYear);
    let score = found === wanted ? 130 : found.includes(wanted) || wanted.includes(found) ? 85 : 0;
    score += Math.round(titleSimilarity(found, wanted) * 50);
    if (metadata?.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
    return { candidate, score };
  }).sort((left, right) => right.score - left.score);
  if (ranked[0] && ranked[0].score >= 105) return ranked[0].candidate;
  const sameYear = metadata?.year ? typed.filter((candidate) => candidate.year === metadata.year) : [];
  return sameYear.length === 1 ? sameYear[0] : null;
}
function extractEpisodeLinks(html) {
  const links = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of String(html || "").matchAll(
    /<div\s+class=["']numerando["']\s*>\s*(\d+)\s*-\s*(\d+)\s*<\/div>\s*<div\s+class=["']episodiotitle["']\s*>\s*<a\s+[^>]*href\s*=\s*(["'])([^"']+)\3[^>]*>/gi
  )) {
    const season = Number(match[1]);
    const episode = Number(match[2]);
    const url = safeUrl(match[4]);
    if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1 || !url) continue;
    if (url.origin !== DESENELEDUBLATE_ORIGIN || !/^\/episoade\/[^/]+\/?$/i.test(url.pathname)) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    links.push({ season, episode, url: url.href });
  }
  return links;
}
function findEpisodeUrl(links, season, episode) {
  return links.find((link) => link.season === season && link.episode === episode)?.url || null;
}
function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag)?.[2] || "").trim();
}
function extractPlayerOptions(html) {
  const options = [];
  const seen = /* @__PURE__ */ new Set();
  const source = String(html || "");
  const openings = [...source.matchAll(/<li\b[^>]*class=["'][^"']*dooplay_player_option[^"']*["'][^>]*>/gi)];
  openings.forEach((opening, index) => {
    const chunk = source.slice(opening.index, openings[index + 1]?.index ?? source.length);
    const type = attributeValue(opening[0], "data-type");
    const post = attributeValue(opening[0], "data-post");
    const nume = attributeValue(opening[0], "data-nume");
    if (!type || !/^\d+$/.test(post) || !nume || nume === "trailer" || seen.has(`${post}:${nume}`)) return;
    seen.add(`${post}:${nume}`);
    const label = stripTags(/<span\s+class=["']title["']\s*>([\s\S]*?)<\/span>/i.exec(chunk)?.[1] || "");
    options.push({ type, post, nume, label });
  });
  return options;
}
var STREAMTAPE_HOSTS = ["streamtape.com", "streamtape.to", "streamtape.net", "strcloud.in", "streamadblocker.tube", "tapewithadblock.org"];
function isStreamtapeHost(hostname) {
  const host = hostname.toLowerCase();
  return STREAMTAPE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function applySubstrings(value, offsets) {
  let result = value;
  for (const offset of offsets) result = result.slice(offset);
  return result;
}
function decodeStreamtapeSource(html) {
  const source = String(html || "");
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(
    /robotlink['"]?\)?[^=]{0,40}?=\s*(["'])([^"']*)\1\s*\+\s*(?:['"]{2}\s*\+\s*)?\(\s*(["'])((?:(?!\3).)+)\3\s*\)((?:\.substring\(\s*\d+\s*\))*)/gi
  )) {
    const prefix = decodeJavaScriptEscapes(match[2]).trim();
    const offsets = [...match[5].matchAll(/\.substring\(\s*(\d+)\s*\)/gi)].map((part) => Number(part[1]));
    const rebuilt = `${prefix}${applySubstrings(match[4], offsets)}`;
    try {
      const url = new URL(rebuilt.startsWith("//") ? `https:${rebuilt}` : rebuilt, DESENELEDUBLATE_ORIGIN);
      if (url.protocol !== "https:" || !isStreamtapeHost(url.hostname)) continue;
      if (url.pathname !== "/get_video" || !url.searchParams.get("id") || seen.has(url.href)) continue;
      seen.add(url.href);
      candidates.push(url.href);
    } catch {
    }
  }
  return candidates.find((url) => new URL(url).hostname.toLowerCase() === "streamtape.com") || candidates[0] || null;
}
function playerKindFromEmbed(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if ((host === "ok.ru" || host.endsWith(".ok.ru")) && /^\/videoembed\/\d+/i.test(url.pathname)) return "okru";
  if (host.split(".").some((label) => label === "vidmoly")) return "vidmoly";
  if (isStreamtapeHost(host)) return "streamtape";
  return null;
}
function parseEmbedResponse(payload) {
  let data;
  try {
    data = JSON.parse(String(payload || ""));
  } catch {
    return null;
  }
  const raw = typeof data?.embed_url === "string" ? data.embed_url.trim() : "";
  if (!raw) return null;
  const decoded = decodeJavaScriptEscapes(raw);
  if (data.type === "dtshcode" || /loadermain\.appspot\.com|<div\s+id=/i.test(decoded)) {
    return { kind: "netu", url: null };
  }
  const iframeSrc = /<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i.exec(decoded)?.[2] || "";
  const target = iframeSrc || decoded;
  return { kind: playerKindFromEmbed(target), url: safeUrl(target)?.href || null };
}
function unescapeJsonStrings(value) {
  return decodeHtml(String(value || "")).replace(/&quot;/gi, '"').replace(/\\"/g, '"').replace(/\\+u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\+(&|\/)/g, "$1");
}
function extractOkRuSource(html) {
  const decoded = unescapeJsonStrings(html).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  const hls = /["'](?:ondemandHls|hlsManifestUrl)["']\s*:\s*["'](https:[^"']+)["']/i.exec(decoded)?.[1] || /["'](?:ondemandHls|hlsManifestUrl)["']\s*:\s*["'](?:https:)?(\/\/[^"']+)["']/i.exec(decoded)?.[1];
  let mp4 = null;
  for (const match of decoded.matchAll(/"videos"\s*:\s*\[([\s\S]*?)\]/gi)) {
    const url = /"url"\s*:\s*"(https:[^"]+?)"/.exec(match[1])?.[1];
    if (url) {
      mp4 = url;
      break;
    }
  }
  const hlsUrl = hls && /^https:/i.test(hls) ? hls : hls ? `https:${hls}` : null;
  try {
    return {
      hls: hlsUrl ? new URL(hlsUrl).href : null,
      mp4: mp4 ? new URL(mp4).href : null
    };
  } catch {
    return { hls: null, mp4: null };
  }
}
function extractVidmolySource(html) {
  const decoded = decodeJavaScriptEscapes(html);
  const source = /\bfile\s*:\s*(["'])(https:[\s\S]*?\.m3u8(?:\?[^"']*)?)\1/i.exec(decoded)?.[2] || /(https:\/\/[^"'\s<>]+\.m3u8(?:\?[^"'\s<>]*)?)/i.exec(decoded)?.[1];
  const label = /\blabel\s*:\s*(["'])(.*?)\1/i.exec(decoded)?.[2] || "";
  const quality = /(\d{3,4})p/i.exec(label)?.[1];
  try {
    return {
      hls: source ? new URL(source).href : null,
      quality: quality ? `${quality}p` : "HD"
    };
  } catch {
    return { hls: null, quality: "HD" };
  }
}

// src/providers/deseneledublate.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var HTML_ACCEPT = "text/html,application/xhtml+xml";
var AJAX_URL = `${DESENELEDUBLATE_ORIGIN}/wp-admin/admin-ajax.php`;
async function fetchText(url, referer, accept = HTML_ACCEPT, attempts = 2, method = "GET", body = null) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method, headers, body: body || void 0 });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text === "string" && text.trim()) return text;
    } catch {
    }
  }
  return null;
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const variants = await Promise.all([
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=ro-RO`, DESENELEDUBLATE_ORIGIN, HTML_ACCEPT, 1),
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`, DESENELEDUBLATE_ORIGIN, HTML_ACCEPT, 1)
  ]);
  const titles = [];
  for (const html of variants) {
    const metadata = html ? extractTmdbMetadata(html) : null;
    if (metadata?.title && !titles.some((existing) => existing.title === metadata.title)) titles.push(metadata);
  }
  return titles.length ? { titles } : null;
}
async function resolveTitlePage(titles, mediaType) {
  const used = /* @__PURE__ */ new Set();
  for (const metadata of titles) {
    const searchUrl = `${DESENELEDUBLATE_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
    if (used.has(searchUrl)) continue;
    used.add(searchUrl);
    const html = await fetchText(searchUrl, `${DESENELEDUBLATE_ORIGIN}/`);
    if (!html) continue;
    const candidate = selectCandidate(extractSearchCandidates(html), metadata, mediaType);
    if (candidate) return { ...candidate, searchUrl };
  }
  return null;
}
async function resolvePlayerOption(option, pageUrl) {
  const payload = `action=doo_player_ajax&post=${encodeURIComponent(option.post)}&nume=${encodeURIComponent(option.nume)}&type=${encodeURIComponent(option.type)}`;
  const response = await fetchText(AJAX_URL, pageUrl, "application/json,text/plain;q=0.9,*/*;q=0.8", 2, "POST", payload);
  if (!response) return null;
  return parseEmbedResponse(response);
}
function playbackHeaders(embedUrl) {
  let origin = null;
  try {
    origin = new URL(embedUrl).origin;
  } catch {
  }
  const headers = { Referer: embedUrl, "User-Agent": USER_AGENT };
  if (origin) headers.Origin = origin;
  return headers;
}
async function resolveEmbed(embed, pageUrl) {
  if (embed.kind === "okru") {
    const html = await fetchText(embed.url, pageUrl, HTML_ACCEPT, 2);
    if (!html) return [];
    const source = extractOkRuSource(html);
    if (source.hls) {
      const master = await fetchText(
        source.hls,
        embed.url,
        "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8",
        1
      );
      const variants = master ? extractHlsVariants(master, source.hls) : [];
      if (variants.length) return variants.map((stream) => ({ ...stream, type: "hls", refererUrl: embed.url }));
      return [{ url: source.hls, quality: "HD", type: "hls", refererUrl: embed.url }];
    }
    if (source.mp4) return [{ url: source.mp4, quality: "HD", type: "mp4", refererUrl: embed.url }];
    return [];
  }
  if (embed.kind === "streamtape") {
    const html = await fetchText(embed.url, pageUrl, HTML_ACCEPT, 2);
    if (!html) return [];
    const url = decodeStreamtapeSource(html);
    return url ? [{ url, quality: "HD", type: "mp4", refererUrl: "https://streamtape.com/" }] : [];
  }
  if (embed.kind === "vidmoly") {
    const html = await fetchText(embed.url, pageUrl, HTML_ACCEPT, 2);
    if (!html) return [];
    const source = extractVidmolySource(html);
    if (!source.hls) return [];
    const master = await fetchText(
      source.hls,
      embed.url,
      "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8",
      1
    );
    const variants = master ? extractHlsVariants(master, source.hls) : [];
    if (variants.length) return variants.map((stream) => ({ ...stream, type: "hls", refererUrl: embed.url }));
    return [{ url: source.hls, quality: source.quality, type: "hls", refererUrl: embed.url }];
  }
  return [];
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  return {
    title: `DeseneleDublate${episodeLabel} • ${stream.quality} • RO`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "DeseneleDublate",
    type: stream.type,
    headers: playbackHeaders(stream.refererUrl)
  };
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const seasonNumber = mediaType === "tv" ? Number(season) : null;
    const episodeNumber = mediaType === "tv" ? Number(episode) : null;
    if (mediaType === "tv" && (!Number.isInteger(seasonNumber) || seasonNumber < 0 || !Number.isInteger(episodeNumber) || episodeNumber < 1)) return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveTitlePage(metadata.titles, mediaType);
    if (!page) return [];
    let pageUrl = page.url;
    let pageHtml = await fetchText(page.url, page.searchUrl);
    if (!pageHtml) return [];
    if (mediaType === "tv") {
      const episodeUrl = findEpisodeUrl(extractEpisodeLinks(pageHtml), seasonNumber, episodeNumber);
      if (!episodeUrl) return [];
      const episodeHtml = await fetchText(episodeUrl, page.url);
      if (!episodeHtml) return [];
      pageUrl = episodeUrl;
      pageHtml = episodeHtml;
    }
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const option of extractPlayerOptions(pageHtml)) {
      const embed = await resolvePlayerOption(option, pageUrl);
      if (!embed?.kind || !embed.url) continue;
      for (const stream of await resolveEmbed(embed, pageUrl)) {
        if (seen.has(stream.url)) continue;
        seen.add(stream.url);
        results.push(streamResult(stream, seasonNumber, episodeNumber));
      }
    }
    return results;
  } catch (error) {
    console.error("DeseneleDublate failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
