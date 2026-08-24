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

// src/lib/desenefaine.js
var AES_SBOX = new Uint8Array([
  99,
  124,
  119,
  123,
  242,
  107,
  111,
  197,
  48,
  1,
  103,
  43,
  254,
  215,
  171,
  118,
  202,
  130,
  201,
  125,
  250,
  89,
  71,
  240,
  173,
  212,
  162,
  175,
  156,
  164,
  114,
  192,
  183,
  253,
  147,
  38,
  54,
  63,
  247,
  204,
  52,
  165,
  229,
  241,
  113,
  216,
  49,
  21,
  4,
  199,
  35,
  195,
  24,
  150,
  5,
  154,
  7,
  18,
  128,
  226,
  235,
  39,
  178,
  117,
  9,
  131,
  44,
  26,
  27,
  110,
  90,
  160,
  82,
  59,
  214,
  179,
  41,
  227,
  47,
  132,
  83,
  209,
  0,
  237,
  32,
  252,
  177,
  91,
  106,
  203,
  190,
  57,
  74,
  76,
  88,
  207,
  208,
  239,
  170,
  251,
  67,
  77,
  51,
  133,
  69,
  249,
  2,
  127,
  80,
  60,
  159,
  168,
  81,
  163,
  64,
  143,
  146,
  157,
  56,
  245,
  188,
  182,
  218,
  33,
  16,
  255,
  243,
  210,
  205,
  12,
  19,
  236,
  95,
  151,
  68,
  23,
  196,
  167,
  126,
  61,
  100,
  93,
  25,
  115,
  96,
  129,
  79,
  220,
  34,
  42,
  144,
  136,
  70,
  238,
  184,
  20,
  222,
  94,
  11,
  219,
  224,
  50,
  58,
  10,
  73,
  6,
  36,
  92,
  194,
  211,
  172,
  98,
  145,
  149,
  228,
  121,
  231,
  200,
  55,
  109,
  141,
  213,
  78,
  169,
  108,
  86,
  244,
  234,
  101,
  122,
  174,
  8,
  186,
  120,
  37,
  46,
  28,
  166,
  180,
  198,
  232,
  221,
  116,
  31,
  75,
  189,
  139,
  138,
  112,
  62,
  181,
  102,
  72,
  3,
  246,
  14,
  97,
  53,
  87,
  185,
  134,
  193,
  29,
  158,
  225,
  248,
  152,
  17,
  105,
  217,
  142,
  148,
  155,
  30,
  135,
  233,
  206,
  85,
  40,
  223,
  140,
  161,
  137,
  13,
  191,
  230,
  66,
  104,
  65,
  153,
  45,
  15,
  176,
  84,
  187,
  22
]);

// src/lib/luminsangels.js
var LSA_ORIGIN = "https://luminsangelsseriale.ro";
function decodeJavaScriptEscapes(value) {
  return decodeHtml(String(value || "")).replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
}
function safeUrl(value, base = LSA_ORIGIN) {
  try {
    const url = new URL(decodeJavaScriptEscapes(value).trim(), base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const stripped = clean.replace(/\s*[–—-]\s*(?:Dublat|Subtitrat|Online)\s.*$/i, "").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*[\s\S]*$/.exec(stripped);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: stripped, year: null };
}
function extractRestSearchResults(jsonText) {
  let data;
  try {
    data = JSON.parse(String(jsonText || "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of data) {
    const url = safeUrl(item?.url);
    const title = stripTags(item?.title || "");
    if (!url || url.origin !== LSA_ORIGIN || !title || seen.has(url.href)) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    candidates.push({ url: url.href, title, titleWithoutYear: parsed.title, year: parsed.year });
  }
  return candidates;
}
function normalize(value) {
  return decodeHtml(String(value || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function titleSimilarity(left, right) {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function rankSearchResults(candidates, metadata) {
  const wanted = normalize(metadata?.title);
  const scored = candidates.map((candidate) => {
    const found = normalize(candidate.titleWithoutYear);
    let score = found === wanted ? 130 : found.includes(wanted) || wanted.includes(found) ? 85 : 0;
    score += Math.round(titleSimilarity(candidate.titleWithoutYear, metadata?.title) * 50);
    if (metadata?.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
    return { candidate, score };
  }).sort((left, right) => right.score - left.score);
  const strong = scored.filter((entry) => entry.score >= 85).map((entry) => entry.candidate);
  return strong.length ? strong : [];
}
function classifyEmbed(url) {
  const host = url.hostname.toLowerCase();
  if ((host === "ok.ru" || host.endsWith(".ok.ru")) && /^\/(?:videoembed|video)\//i.test(url.pathname)) return "okru";
  if (host.includes("vidmoly")) return "vidmoly";
  if ((host === "my.mail.ru" || host === "mail.ru") && url.pathname.includes("/video/embed/")) return "mailru";
  if (host === "sendvid.com" && url.pathname.includes("/embed/")) return "sendvid";
  return null;
}
function extractEmbedUrls(html) {
  const source = String(html || "");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1/gi)) {
    const raw = decodeJavaScriptEscapes(match[2]).trim();
    const url = safeUrl(raw.startsWith("//") ? `https:${raw}` : raw);
    if (!url) continue;
    const kind = classifyEmbed(url);
    if (!kind || seen.has(url.href)) continue;
    seen.add(url.href);
    results.push({ kind, url: url.href });
  }
  return results;
}

// src/providers/luminsangels.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var HTML_ACCEPT = "text/html,application/xhtml+xml";
var JSON_ACCEPT = "application/json,text/plain;q=0.9,*/*;q=0.8";
async function fetchText(url, referer, accept = HTML_ACCEPT, attempts = 2) {
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
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const variants = await Promise.all([
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=ro-RO`, LSA_ORIGIN, HTML_ACCEPT, 1),
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`, LSA_ORIGIN, HTML_ACCEPT, 1)
  ]);
  const titles = [];
  for (const html of variants) {
    const metadata = html ? extractTmdbMetadata(html) : null;
    if (metadata?.title && !titles.some((existing) => existing.title === metadata.title)) titles.push(metadata);
  }
  return titles.length ? { titles } : null;
}
async function resolveTitlePage(titles) {
  const seenUrls = /* @__PURE__ */ new Set();
  for (const metadata of titles) {
    const searchUrl = `${LSA_ORIGIN}/wp-json/wp/v2/search?search=${encodeURIComponent(metadata.title)}&per_page=10`;
    const payload = await fetchText(searchUrl, `${LSA_ORIGIN}/`, JSON_ACCEPT);
    if (!payload) continue;
    const ranked = rankSearchResults(extractRestSearchResults(payload), metadata).slice(0, 3);
    for (const candidate of ranked) {
      if (seenUrls.has(candidate.url)) continue;
      seenUrls.add(candidate.url);
      const pageHtml = await fetchText(candidate.url, searchUrl);
      if (!pageHtml) continue;
      const embeds = extractEmbedUrls(pageHtml);
      if (embeds.length) return { pageUrl: candidate.url, embeds };
    }
  }
  for (const metadata of titles) {
    const searchUrl = `${LSA_ORIGIN}/wp-json/wp/v2/search?search=${encodeURIComponent(metadata.title)}&per_page=10`;
    const payload = await fetchText(searchUrl, `${LSA_ORIGIN}/`, JSON_ACCEPT, 1);
    if (!payload) continue;
    const all = extractRestSearchResults(payload);
    for (const candidate of all.slice(0, 5)) {
      if (seenUrls.has(candidate.url)) continue;
      seenUrls.add(candidate.url);
      const pageHtml = await fetchText(candidate.url, searchUrl);
      if (!pageHtml) continue;
      const embeds = extractEmbedUrls(pageHtml);
      if (embeds.length) return { pageUrl: candidate.url, embeds };
    }
  }
  return null;
}
async function resolveOkRu(embedUrl, pageUrl) {
  const html = await fetchText(embedUrl, pageUrl, HTML_ACCEPT, 2);
  if (!html) return [];
  const decoded = decodeJavaScriptEscapes(html).replace(/&quot;/gi, '"').replace(/\\"/g, '"').replace(/\\+u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\+(&|\/)/g, "$1");
  const hls = /["'](?:ondemandHls|hlsManifestUrl)["']\s*:\s*["'](https:[^"']+)["']/i.exec(decoded)?.[1];
  if (hls) {
    try {
      new URL(hls);
    } catch {
      return [];
    }
    const master = await fetchText(hls, embedUrl, "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8", 1);
    const variants = master ? extractHlsVariants(master, hls) : [];
    if (variants.length) return variants.map((s) => ({ ...s, type: "hls", refererUrl: embedUrl }));
    return [{ url: hls, quality: "HD", type: "hls", refererUrl: embedUrl }];
  }
  const mp4 = /"videos"\s*:\s*\[.*?"url"\s*:\s*"(https:[^"]+?)"/i.exec(decoded)?.[1];
  if (mp4) {
    try {
      new URL(mp4);
      return [{ url: mp4, quality: "HD", type: "mp4", refererUrl: embedUrl }];
    } catch {
    }
  }
  return [];
}
async function resolveVidmoly(embedUrl, pageUrl) {
  const html = await fetchText(embedUrl, pageUrl, HTML_ACCEPT, 2);
  if (!html) return [];
  const decoded = decodeJavaScriptEscapes(html);
  const source = /\bfile\s*:\s*(["'])(https:[\s\S]*?\.m3u8(?:\?[^"']*)?)\1/i.exec(decoded)?.[2] || /(https:\/\/[^"'\s<>]+\.m3u8(?:\?[^"'\s<>]*)?)/i.exec(decoded)?.[1];
  if (!source) return [];
  let url;
  try {
    url = new URL(source);
  } catch {
    return [];
  }
  if (url.protocol !== "https:") return [];
  const label = /\blabel\s*:\s*(["'])(.*?)\1/i.exec(decoded)?.[2] || "";
  const qualityMatch = /(\d{3,4})p/i.exec(label);
  const quality = qualityMatch ? `${qualityMatch[1]}p` : "HD";
  const master = await fetchText(url.href, embedUrl, "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8", 1);
  const variants = master ? extractHlsVariants(master, url.href) : [];
  if (variants.length) return variants.map((s) => ({ ...s, type: "hls", refererUrl: embedUrl }));
  return [{ url: url.href, quality, type: "hls", refererUrl: embedUrl }];
}
async function resolveMailRu(embedUrl, pageUrl) {
  const html = await fetchText(embedUrl, pageUrl, HTML_ACCEPT, 2);
  if (!html) return [];
  const metaMatch = /["']metadataUrl["']\s*:\s*["']([^"']+)["']/i.exec(decodeJavaScriptEscapes(html));
  if (!metaMatch) return [];
  let metaUrl;
  try {
    metaUrl = new URL(metaMatch[1], "https://my.mail.ru");
  } catch {
    return [];
  }
  if (metaUrl.protocol !== "https:" || !metaUrl.hostname.includes("mail.ru")) return [];
  const payload = await fetchText(metaUrl.href, embedUrl, JSON_ACCEPT, 1);
  if (!payload) return [];
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return [];
  }
  const results = [];
  for (const video of Array.isArray(data?.videos) ? data.videos : []) {
    if (typeof video?.url !== "string") continue;
    try {
      new URL(video.url);
    } catch {
      continue;
    }
    const qualityMatch = /(\d{3,4})p/i.exec(String(video?.key || ""));
    results.push({ url: video.url, quality: qualityMatch ? `${qualityMatch[1]}p` : "HD", type: "mp4", refererUrl: embedUrl });
  }
  results.sort((a, b) => Number.parseInt(b.quality) - Number.parseInt(a.quality));
  return results;
}
async function resolveEmbed(embed, pageUrl) {
  if (embed.kind === "okru") return resolveOkRu(embed.url, pageUrl);
  if (embed.kind === "vidmoly") return resolveVidmoly(embed.url, pageUrl);
  if (embed.kind === "mailru") return resolveMailRu(embed.url, pageUrl);
  return [];
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveTitlePage(metadata.titles);
    if (!page) return [];
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const embed of page.embeds) {
      const streams = await resolveEmbed(embed, page.pageUrl);
      for (const stream of streams) {
        if (seen.has(stream.url)) continue;
        seen.add(stream.url);
        let origin = null;
        try {
          origin = new URL(stream.refererUrl || embed.url).origin;
        } catch {
        }
        const headers = { Referer: stream.refererUrl || embed.url, "User-Agent": USER_AGENT };
        if (origin) headers.Origin = origin;
        results.push({
          title: `LuminsAngels • ${stream.quality} • RO`,
          url: stream.url,
          quality: stream.quality,
          language: "ro",
          provider: "LuminsAngels",
          type: stream.type,
          headers
        });
      }
    }
    return results;
  } catch (error) {
    console.error("LuminsAngels failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
