/**
 * videasy - Built from src/videasy/
 * Generated: 2026-07-30T18:30:40.938Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// src/vidking/index.js
var require_vidking = __commonJS({
  "src/vidking/index.js"(exports2, module2) {
    var API_URL = "https://api.speedracelight.com";
    var METADATA_URL = "https://db.speedracelight.com/3";
    var API_HEADERS = {
      Origin: "https://www.vidking.net",
      Referer: "https://www.vidking.net/",
      "User-Agent": "Mozilla/5.0"
    };
    var SERVERS = [
      { name: "Yoru", endpoint: "cdn/sources-with-title" },
      {
        name: "Omen",
        endpoint: "lamovie/sources-with-title",
        qualityFilter: "Vimeos"
      }
    ];
    var HASH_CONSTANTS = [
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580
    ];
    var INITIAL_HASH = [1732584193, 4023233417, 2562383102, 271733878];
    var STATE_SIZE = 61;
    var ROUNDS = 8;
    var GOLDEN_RATIO = 2654435769;
    var PAYLOAD_MAGIC = [109, 118, 109, 49];
    function mix(value) {
      value >>>= 0;
      value ^= value >>> 16;
      value = Math.imul(value, 2246822507) >>> 0;
      value ^= value >>> 13;
      value = Math.imul(value, 3266489909) >>> 0;
      value ^= value >>> 16;
      return value >>> 0;
    }
    function rotateLeft(value, shift) {
      value >>>= 0;
      shift &= 31;
      return shift === 0 ? value >>> 0 : (value << shift | value >>> 32 - shift) >>> 0;
    }
    function hashSeed(seed) {
      let hash = INITIAL_HASH[0] >>> 0;
      for (let index = 0; index < seed.length; index++) {
        hash = rotateLeft(
          (hash ^ Math.imul(seed.charCodeAt(index), HASH_CONSTANTS[index & 15])) >>> 0,
          5
        );
      }
      return mix(hash);
    }
    function makePermutation(seed) {
      const state = new Array(256);
      for (let index = 0; index < 256; index++)
        state[index] = index;
      let cursor = 0;
      for (let index = 0; index < 256; index++) {
        cursor = cursor + state[index] + seed.charCodeAt(index % seed.length) & 255;
        const temporary = state[index];
        state[index] = state[cursor];
        state[cursor] = temporary;
      }
      return state;
    }
    function hashString(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index++) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
      }
      return mix(hash);
    }
    function combine(left, right, mask) {
      return ((left ^ right) >>> 0 | (left & right & mask) >>> 0) >>> 0;
    }
    function createCipherState(seed, mediaId) {
      if ((seed.length * (seed.length + 1) & 1) === 1) {
        return { state: makePermutation(seed), accumulator: hashSeed(seed) };
      }
      const state = new Array(STATE_SIZE);
      let accumulator = mix(hashString(seed) ^ mix(mediaId >>> 0 ^ GOLDEN_RATIO)) >>> 0;
      for (let round = 0; round < ROUNDS; round++) {
        if ((round * (round + 1) & 1) === 0) {
          const index = accumulator % STATE_SIZE;
          accumulator = rotateLeft(
            accumulator + GOLDEN_RATIO >>> 0,
            7 + (round & 7)
          );
          state[index] = (accumulator ^ mix(accumulator)) >>> 0;
          accumulator = mix(accumulator + index >>> 0);
        } else {
          state[round] = HASH_CONSTANTS[round & 15];
        }
      }
      return {
        state,
        accumulator: mix(accumulator ^ 2779096485) >>> 0
      };
    }
    function nextCipherWord(cipher, index) {
      const state = cipher.state;
      let accumulator = cipher.accumulator;
      const stateIndex = accumulator % STATE_SIZE;
      const mask = 0 - Number(stateIndex in state);
      const stateValue = state[stateIndex] >>> 0;
      const offset = Math.imul(GOLDEN_RATIO, index + 1) >>> 0;
      let value = combine(
        accumulator,
        (stateValue ^ offset) >>> 0,
        mask
      );
      value = (rotateLeft(value + accumulator >>> 0, stateIndex & 31) ^ rotateLeft(accumulator, Math.imul(stateIndex, 7) & 31)) >>> 0;
      accumulator = mix(value + GOLDEN_RATIO >>> 0);
      state[stateIndex] = accumulator >>> 0;
      cipher.accumulator = accumulator;
      return accumulator >>> 0;
    }
    function createKeyStream(seed, mediaId, length) {
      const cipher = createCipherState(seed, mediaId);
      const output = new Uint8Array(length);
      let wordIndex = 0;
      for (let index = 0; index < length; ) {
        const word = nextCipherWord(cipher, wordIndex++);
        output[index++] = word & 255;
        if (index < length)
          output[index++] = word >>> 8 & 255;
        if (index < length)
          output[index++] = word >>> 16 & 255;
        if (index < length)
          output[index++] = word >>> 24 & 255;
      }
      return output;
    }
    function decodeBase64Url(value) {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
      const binary = atob(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
    function decodeUtf8(bytes) {
      let output = "";
      for (let index = 0; index < bytes.length; ) {
        const first = bytes[index++];
        if (first < 128) {
          output += String.fromCharCode(first);
        } else if (first < 224) {
          const second = bytes[index++];
          output += String.fromCharCode(
            (first & 31) << 6 | second & 63
          );
        } else if (first < 240) {
          const second = bytes[index++];
          const third = bytes[index++];
          output += String.fromCharCode(
            (first & 15) << 12 | (second & 63) << 6 | third & 63
          );
        } else {
          const second = bytes[index++];
          const third = bytes[index++];
          const fourth = bytes[index++];
          let codePoint = (first & 7) << 18 | (second & 63) << 12 | (third & 63) << 6 | fourth & 63;
          codePoint -= 65536;
          output += String.fromCharCode(
            55296 + (codePoint >> 10),
            56320 + (codePoint & 1023)
          );
        }
      }
      return output;
    }
    function decryptPayload(payload, seed, mediaId) {
      const bytes = decodeBase64Url(payload);
      const keyStream = createKeyStream(seed, mediaId, bytes.length);
      for (let index = 0; index < bytes.length; index++) {
        bytes[index] ^= keyStream[index];
      }
      for (let index = 0; index < PAYLOAD_MAGIC.length; index++) {
        if (bytes[index] !== PAYLOAD_MAGIC[index]) {
          throw new Error("Invalid encrypted response");
        }
      }
      return decodeUtf8(bytes.subarray(PAYLOAD_MAGIC.length));
    }
    function fetchJson(url, options) {
      return __async(this, null, function* () {
        const response = yield fetch(url, options);
        if (!response.ok)
          throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    }
    function fetchMetadata(tmdbId, mediaType) {
      return __async(this, null, function* () {
        const data = yield fetchJson(
          `${METADATA_URL}/${mediaType}/${tmdbId}?append_to_response=external_ids`
        );
        return {
          title: mediaType === "movie" ? data.title : data.name,
          year: String(
            new Date(
              mediaType === "movie" ? data.release_date : data.first_air_date
            ).getFullYear() || ""
          ),
          imdbId: data.external_ids && data.external_ids.imdb_id || ""
        };
      });
    }
    function buildSourceUrl(server, request, seed) {
      const params = {
        title: request.title,
        mediaType: request.mediaType,
        year: request.year,
        episodeId: request.episode || "1",
        seasonId: request.season || "1",
        tmdbId: request.tmdbId,
        imdbId: request.imdbId,
        enc: "2",
        seed,
        _t: String(Date.now())
      };
      Object.assign(params, server.params || {});
      const query = Object.keys(params).map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      ).join("&");
      return `${API_URL}/${server.endpoint}?${query}`;
    }
    function normalizeSubtitles(subtitles) {
      if (!Array.isArray(subtitles))
        return [];
      return subtitles.filter((subtitle) => subtitle && subtitle.url).map((subtitle) => ({
        url: subtitle.url,
        lang: subtitle.lang || subtitle.language || "und",
        label: subtitle.label || subtitle.display || subtitle.language || "Subtitle"
      }));
    }
    function fetchServer(server, request, seed) {
      return __async(this, null, function* () {
        try {
          const response = yield fetch(buildSourceUrl(server, request, seed), {
            headers: Object.assign({}, API_HEADERS, {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0"
            })
          });
          if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
          const data = JSON.parse(
            decryptPayload(yield response.text(), seed, Number(request.tmdbId))
          );
          if (!data || !Array.isArray(data.sources))
            return [];
          const sharedSubtitles = normalizeSubtitles(data.subtitles);
          return data.sources.filter(
            (source) => source && source.url && (!server.qualityFilter || source.quality === server.qualityFilter)
          ).map((source, index) => ({
            name: `VidKing - ${server.name}`,
            title: `${server.name} - ${source.quality || source.label || `Source ${index + 1}`}`,
            url: source.url,
            quality: source.quality || source.label || "Auto",
            type: source.type || (source.url.includes(".mpd") ? "application/dash+xml" : source.url.includes(".mp4") ? "video/mp4" : "application/x-mpegurl"),
            headers: Object.assign({}, API_HEADERS, source.headers || {}),
            subtitles: normalizeSubtitles(source.subtitles).concat(
              sharedSubtitles
            )
          }));
        } catch (error) {
          console.log(`[VidKing] ${server.name} unavailable: ${error.message}`);
          return [];
        }
      });
    }
    function getStreams2(tmdbId, mediaType, season, episode) {
      return __async(this, null, function* () {
        const normalizedType = mediaType === "series" ? "tv" : mediaType;
        if (!tmdbId || normalizedType !== "movie" && normalizedType !== "tv" || normalizedType === "tv" && (!season || !episode)) {
          return [];
        }
        try {
          const metadata = yield fetchMetadata(tmdbId, normalizedType);
          const seedData = yield fetchJson(
            `${API_URL}/seed?mediaId=${encodeURIComponent(String(tmdbId))}`,
            { headers: API_HEADERS }
          );
          if (!seedData || !seedData.seed)
            return [];
          const request = {
            mediaType: normalizedType,
            tmdbId: String(tmdbId),
            season: String(season || 1),
            episode: String(episode || 1),
            title: metadata.title,
            year: metadata.year,
            imdbId: metadata.imdbId
          };
          const results = yield Promise.all(
            SERVERS.map(
              (server) => fetchServer(server, request, seedData.seed)
            )
          );
          const streams = [].concat.apply([], results);
          const seen = {};
          return streams.filter((stream) => {
            if (seen[stream.url])
              return false;
            seen[stream.url] = true;
            return true;
          });
        } catch (error) {
          console.error(`[VidKing] Error: ${error.message}`);
          return [];
        }
      });
    }
    module2.exports = { getStreams: getStreams2 };
  }
});

// src/videasy/index.js
var vidKingProvider = require_vidking();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const streams = yield vidKingProvider.getStreams(
        tmdbId,
        mediaType,
        season,
        episode
      );
      return streams.map(
        (stream) => Object.assign({}, stream, {
          name: stream.name.replace(/^VidKing/, "Videasy")
        })
      );
    } catch (error) {
      console.error(`[Videasy] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
