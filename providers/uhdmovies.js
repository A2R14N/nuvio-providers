/**
 * uhdmovies - Built from src/uhdmovies/
 * Generated: 2026-08-07T21:48:52.004Z
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

// src/uhdmovies/index.js
var BASE_URL = "https://uhdmovies.autos";
var TMDB_URL = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};
function fetchText(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    return response.text();
  });
}
function getOrigin(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    return "";
  }
}
function absoluteUrl(url, base) {
  if (!url)
    return "";
  if (/^https?:\/\//i.test(url))
    return url;
  if (url.startsWith("//"))
    return `https:${url}`;
  return `${getOrigin(base)}${url.startsWith("/") ? "" : "/"}${url}`;
}
function formBody(fields) {
  return Object.keys(fields).map(
    (key) => `${encodeURIComponent(key)}=${encodeURIComponent(fields[key] || "")}`
  ).join("&");
}
function decodeHtml(value) {
  return String(value || "").replace(/&amp;/gi, "&").replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function attribute(tag, name) {
  const match = String(tag || "").match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i")
  );
  return match ? decodeHtml(match[2]) : "";
}
function anchors(html) {
  const found = [];
  const pattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while (match = pattern.exec(String(html || ""))) {
    found.push({
      tag: match[0],
      href: attribute(match[0], "href"),
      title: attribute(match[0], "title"),
      text: stripTags(match[0])
    });
  }
  return found;
}
function readLandingForm(html) {
  var _a;
  const forms = String(html || "").match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];
  const form = forms.find((item) => /\bid\s*=\s*["']landing["']/i.test(item)) || "";
  const fields = {};
  const inputs = form.match(/<input\b[^>]*>/gi) || [];
  inputs.forEach((input) => {
    const name = attribute(input, "name");
    if (name)
      fields[name] = attribute(input, "value");
  });
  return {
    action: attribute(((_a = form.match(/<form\b[^>]*>/i)) == null ? void 0 : _a[0]) || "", "action"),
    fields
  };
}
function bypassGateway(url) {
  return __async(this, null, function* () {
    const origin = getOrigin(url);
    const firstHtml = yield fetchText(url, { headers: HEADERS });
    const firstForm = readLandingForm(firstHtml);
    if (!firstForm.action)
      return "";
    const secondHtml = yield fetchText(firstForm.action, {
      method: "POST",
      headers: Object.assign({}, HEADERS, {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: url
      }),
      body: formBody(firstForm.fields)
    });
    const secondForm = readLandingForm(secondHtml);
    if (!secondForm.action)
      return "";
    const thirdHtml = yield fetchText(secondForm.action, {
      method: "POST",
      headers: Object.assign({}, HEADERS, {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: firstForm.action
      }),
      body: formBody(secondForm.fields)
    });
    const goMatch = thirdHtml.match(/\?go=([^"'&]+)/);
    if (!goMatch)
      return "";
    const token = goMatch[1];
    const cookieValue = secondForm.fields._wp_http2 || "";
    const redirectHtml = yield fetchText(`${origin}/?go=${token}`, {
      headers: Object.assign({}, HEADERS, {
        Cookie: `${token}=${cookieValue}`,
        Referer: secondForm.action
      })
    });
    const refreshMatch = redirectHtml.match(
      /http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)/i
    );
    return refreshMatch ? refreshMatch[1].replace(/&amp;/g, "&") : "";
  });
}
function resolveDriveSeed(url) {
  return __async(this, null, function* () {
    let pageUrl = url;
    if (/\/r\?key=/i.test(pageUrl)) {
      const redirectHtml = yield fetchText(pageUrl, { headers: HEADERS });
      const redirectMatch = redirectHtml.match(
        /(?:window\.location\.)?replace\(["']([^"']+)["']\)/i
      );
      if (!redirectMatch)
        return "";
      pageUrl = absoluteUrl(redirectMatch[1], pageUrl);
    }
    const fileHtml = yield fetchText(pageUrl, { headers: HEADERS });
    const fileLinks = anchors(fileHtml);
    const resumeLink = fileLinks.find(
      (link) => /resume cloud/i.test(link.text)
    );
    if (resumeLink) {
      const resumeUrl = absoluteUrl(resumeLink.href, pageUrl);
      const resumeHtml = yield fetchText(resumeUrl, {
        headers: Object.assign({}, HEADERS, { Referer: pageUrl })
      });
      const resumeLinks = anchors(resumeHtml);
      const direct = resumeLinks.find(
        (link) => /^https?:\/\/[^/]*workers\.dev\//i.test(link.href)
      );
      if (direct)
        return direct.href;
    }
    return "";
  });
}
function fetchMetadata(tmdbId) {
  return __async(this, null, function* () {
    const response = yield fetch(
      `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
    );
    if (!response.ok)
      throw new Error(`TMDB HTTP ${response.status}`);
    const data = yield response.json();
    return {
      title: data.title || data.original_title || "",
      originalTitle: data.original_title || "",
      year: String(data.release_date || "").slice(0, 4)
    };
  });
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function findMoviePage(metadata) {
  return __async(this, null, function* () {
    const searchHtml = yield fetchText(
      `${BASE_URL}/?s=${encodeURIComponent(metadata.title)}`,
      { headers: HEADERS }
    );
    const expectedTitle = normalizeTitle(metadata.title);
    const expectedOriginal = normalizeTitle(metadata.originalTitle);
    let best = null;
    const articles = searchHtml.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];
    articles.forEach((article) => {
      const link = anchors(article)[0] || {};
      const href = link.href;
      const title = link.title || link.text || stripTags(article);
      if (!href || !title)
        return;
      const normalized = normalizeTitle(title);
      let score = 0;
      if (expectedTitle && normalized.includes(expectedTitle))
        score += 4;
      if (expectedOriginal && normalized.includes(expectedOriginal))
        score += 3;
      if (metadata.year && normalized.includes(metadata.year))
        score += 2;
      if (!best || score > best.score)
        best = { href, score };
    });
    return best && best.score >= 4 ? best.href : "";
  });
}
function parseQuality(label) {
  if (/\b2160p\b|\b4k\b|\buhd\b/i.test(label))
    return "2160p";
  const match = label.match(/\b(1080|720|480)p\b/i);
  return match ? `${match[1]}p` : "Unknown";
}
function parseSize(label) {
  const match = label.match(/\[\s*(\d+(?:\.\d+)?\s*(?:GB|MB))\s*\]/i);
  return match ? match[1].replace(/\s+/g, " ") : "";
}
function compactReleaseLabel(label) {
  return label.replace(/^.*?\(\d{4}\)\s*/i, "").replace(/\([^()]*UHDMovies[^()]*\)/gi, "").replace(/\s+/g, " ").trim();
}
function extractReleases(html) {
  const releases = [];
  const paragraphs = String(html || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  paragraphs.forEach((paragraph, index) => {
    const label = stripTags(paragraph);
    if (!/\[\s*(?:\d+(?:\.\d+)?\s*)?(?:GB|MB)\s*\]/i.test(label))
      return;
    const nearby = paragraphs.slice(index, index + 3).join("");
    const link = anchors(nearby).find(
      (item) => /unblockedgames/i.test(item.href)
    );
    const url = link ? link.href : "";
    if (!url)
      return;
    releases.push({
      label,
      url,
      quality: parseQuality(label),
      size: parseSize(label)
    });
  });
  return releases;
}
function resolveRelease(release) {
  return __async(this, null, function* () {
    try {
      console.log(
        `[UHDMovies] Resolving ${release.quality} ${release.size || ""}`.trim()
      );
      const driveSeedUrl = yield bypassGateway(release.url);
      if (!driveSeedUrl) {
        console.log("[UHDMovies] Gateway did not return a DriveSeed link");
        return null;
      }
      const streamUrl = yield resolveDriveSeed(driveSeedUrl);
      if (!streamUrl || !/^https?:\/\/[^/]*workers\.dev\//i.test(streamUrl)) {
        console.log("[UHDMovies] DriveSeed did not return a worker link");
        return null;
      }
      const details = compactReleaseLabel(release.label);
      return {
        name: "UHDMovies",
        title: `UHDMovies - ${details}`,
        url: streamUrl,
        quality: release.quality,
        language: "hi \u2022 en",
        type: "video/x-matroska",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: driveSeedUrl
        },
        size: release.size
      };
    } catch (error) {
      console.log(`[UHDMovies] Release unavailable: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (!tmdbId || mediaType !== "movie")
      return [];
    try {
      console.log(`[UHDMovies] Looking up movie ${tmdbId}`);
      const metadata = yield fetchMetadata(tmdbId);
      if (!metadata.title) {
        console.log("[UHDMovies] TMDB returned no title");
        return [];
      }
      const moviePage = yield findMoviePage(metadata);
      if (!moviePage) {
        console.log(`[UHDMovies] No result for ${metadata.title}`);
        return [];
      }
      const movieHtml = yield fetchText(moviePage, { headers: HEADERS });
      const releases = extractReleases(movieHtml);
      console.log(`[UHDMovies] Found ${releases.length} release(s)`);
      if (!releases.length)
        return [];
      const resolved = yield Promise.all(releases.map(resolveRelease));
      const streams = resolved.filter(Boolean);
      console.log(`[UHDMovies] Returning ${streams.length} stream(s)`);
      if (!streams.length) {
        console.log(
          "[UHDMovies] The download gateway rejected all requests in this runtime"
        );
      }
      const seen = {};
      return streams.filter((stream) => {
        if (seen[stream.url])
          return false;
        seen[stream.url] = true;
        return true;
      });
    } catch (error) {
      console.error(`[UHDMovies] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
