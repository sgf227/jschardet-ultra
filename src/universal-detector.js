'use strict';

const Constants = require('./constants');
const MBCSGroupProber = require('./probers/mbcs-group-prober');
const EscCharSetProber = require('./probers/esc-prober');
const iconv = require('iconv-lite');
const { mapProberResult } = require('./encoding-aliases');

// Single-byte encoding profiles with detailed byte frequency signatures
const SB_PROFILES = [
  // === Cyrillic ===
  {
    encoding: 'windows-1251',
    lang: 'cyrillic',
    // High bytes that are valid in this encoding
    validRange: [0x80, 0xFF],
    // Most frequent bytes for Russian text in this encoding
    signature: [0xE0, 0xEE, 0xE8, 0xE5, 0xED, 0xF2, 0xF1, 0xE2, 0xE0, 0xEB, 0xEA, 0xEF],
    // Bytes that should NOT appear for this encoding
    invalidBytes: [],
  },
  {
    encoding: 'koi8-r',
    lang: 'cyrillic',
    validRange: [0xC0, 0xFF],
    signature: [0xC1, 0xCF, 0xC9, 0xC5, 0xCE, 0xD4, 0xD3, 0xC2, 0xC1, 0xCC, 0xCB, 0xD0],
    invalidBytes: [],
  },
  {
    encoding: 'koi8-u',
    lang: 'cyrillic',
    validRange: [0xC0, 0xFF],
    signature: [0xC1, 0xCF, 0xC9, 0xC5, 0xCE, 0xD4, 0xD3, 0xC2, 0xC1, 0xCC, 0xCB, 0xD0],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-5',
    lang: 'cyrillic',
    validRange: [0xA0, 0xFF],
    signature: [0xD0, 0xDE, 0xD8, 0xD5, 0xDD, 0xE2, 0xE1, 0xD2],
    invalidBytes: [],
  },
  {
    encoding: 'cp866',
    lang: 'cyrillic',
    validRange: [0x80, 0xFF],
    signature: [0xA0, 0xAE, 0xA8, 0xA5, 0xAD, 0xE2, 0xE1, 0xA2],
    invalidBytes: [],
  },

  // === Western European ===
  {
    encoding: 'windows-1252',
    lang: 'western',
    validRange: [0x80, 0xFF],
    signature: [0xE9, 0xE8, 0xEA, 0xEB, 0xE0, 0xE2, 0xEE, 0xF4, 0xFC, 0xF6, 0xE4, 0xDF],
    invalidBytes: [0x81, 0x8D, 0x8F, 0x90, 0x9D],
  },
  {
    encoding: 'iso-8859-1',
    lang: 'western',
    validRange: [0xA0, 0xFF],
    signature: [0xE9, 0xE8, 0xEA, 0xEB, 0xE0, 0xE2, 0xEE, 0xF4, 0xFC, 0xF6, 0xE4, 0xDF],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-15',
    lang: 'western',
    validRange: [0xA0, 0xFF],
    signature: [0xE9, 0xE8, 0xEA, 0xEB, 0xE0, 0xE2, 0xEE, 0xF4, 0xFC, 0xF6, 0xE4, 0xDF],
    invalidBytes: [],
  },

  // === Central European ===
  {
    encoding: 'windows-1250',
    lang: 'central_european',
    validRange: [0x80, 0xFF],
    signature: [0xE1, 0xE9, 0xED, 0xF3, 0xFA, 0xE8, 0xF8, 0xF9, 0xF2, 0xBB, 0xAB],
    invalidBytes: [0x81, 0x83, 0x88, 0x98],
  },
  {
    encoding: 'iso-8859-2',
    lang: 'central_european',
    validRange: [0xA0, 0xFF],
    signature: [0xE1, 0xE9, 0xED, 0xF3, 0xFA, 0xE8, 0xF8, 0xF9],
    invalidBytes: [],
  },

  // === Greek ===
  {
    encoding: 'windows-1253',
    lang: 'greek',
    validRange: [0x80, 0xFF],
    signature: [0xE1, 0xE5, 0xE9, 0xEF, 0xF4, 0xED, 0xF3, 0xE7, 0xF0, 0xEA],
    invalidBytes: [0x81, 0x88, 0x8A, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x98, 0x9A, 0x9C, 0x9D, 0x9E, 0x9F, 0xAA, 0xD2, 0xFF],
  },
  {
    encoding: 'iso-8859-7',
    lang: 'greek',
    validRange: [0xA0, 0xFF],
    signature: [0xE1, 0xE5, 0xE9, 0xEF, 0xF4, 0xED, 0xF3, 0xE7],
    invalidBytes: [0xAE, 0xD2, 0xFF],
  },

  // === Turkish ===
  {
    encoding: 'windows-1254',
    lang: 'turkish',
    validRange: [0x80, 0xFF],
    signature: [0xE2, 0xE7, 0xF6, 0xFC, 0xFD, 0xF0, 0xFE, 0xE8, 0xED, 0xF1],
    invalidBytes: [0x81, 0x8D, 0x8E, 0x8F, 0x90, 0x9D, 0x9E],
  },
  {
    encoding: 'iso-8859-9',
    lang: 'turkish',
    validRange: [0xA0, 0xFF],
    signature: [0xE2, 0xE7, 0xF6, 0xFC, 0xFD, 0xF0, 0xFE, 0xE8],
    invalidBytes: [],
  },

  // === Hebrew ===
  {
    encoding: 'windows-1255',
    lang: 'hebrew',
    validRange: [0x80, 0xFF],
    signature: [0xE0, 0xE5, 0xE9, 0xEC, 0xEE, 0xF0, 0xF8, 0xFA, 0xE1, 0xE3],
    invalidBytes: [0x81, 0x8A, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x9A, 0x9C, 0x9D, 0x9E, 0x9F, 0xCA, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF, 0xFB, 0xFC, 0xFF],
  },
  {
    encoding: 'iso-8859-8',
    lang: 'hebrew',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE5, 0xE9, 0xEC, 0xEE, 0xF0, 0xF8, 0xFA],
    invalidBytes: [0xA1, 0xBF, 0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF, 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xFB, 0xFC, 0xFF],
  },

  // === Arabic ===
  {
    encoding: 'windows-1256',
    lang: 'arabic',
    validRange: [0x80, 0xFF],
    signature: [0xC7, 0xE1, 0xED, 0xE4, 0xE3, 0xD1, 0xE8, 0xC8, 0xC9, 0xCA],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-6',
    lang: 'arabic',
    validRange: [0xA0, 0xFF],
    signature: [0xC7, 0xE1, 0xED, 0xE4, 0xE3, 0xD1, 0xE8, 0xC8],
    invalidBytes: [0xA1, 0xA2, 0xA3, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBC, 0xBD, 0xBE, 0xC0, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF],
  },

  // === Baltic ===
  {
    encoding: 'windows-1257',
    lang: 'baltic',
    validRange: [0x80, 0xFF],
    signature: [0xE0, 0xE7, 0xEA, 0xEB, 0xEE, 0xF0, 0xF3, 0xFC, 0xE2, 0xE8],
    invalidBytes: [0x81, 0x83, 0x88, 0x8A, 0x8C, 0x8E, 0x90, 0x98, 0x9A, 0x9C, 0x9E, 0xA0],
  },
  {
    encoding: 'iso-8859-13',
    lang: 'baltic',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE7, 0xEA, 0xEB, 0xEE, 0xF0, 0xF3, 0xFC],
    invalidBytes: [],
  },

  // === Vietnamese ===
  {
    encoding: 'windows-1258',
    lang: 'vietnamese',
    validRange: [0x80, 0xFF],
    signature: [0xE0, 0xE1, 0xE2, 0xE3, 0xEA, 0xF4, 0xF5, 0xFD, 0xEC, 0xF9],
    invalidBytes: [0x81, 0x8A, 0x8D, 0x8E, 0x8F, 0x90, 0x9A, 0x9D, 0x9E],
  },

  // === Thai ===
  {
    encoding: 'windows-874',
    lang: 'thai',
    validRange: [0x80, 0xFF],
    signature: [0xA1, 0xB4, 0xC3, 0xC7, 0xCA, 0xD2, 0xD4, 0xE0, 0xE1, 0xE2, 0xE4],
    invalidBytes: [0x80, 0x81, 0x82, 0x83, 0x84, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x98, 0x9C, 0x9D, 0x9E, 0x9F, 0xDB, 0xDC, 0xDD, 0xDE, 0xFC, 0xFD, 0xFE, 0xFF],
  },
  {
    encoding: 'iso-8859-11',
    lang: 'thai',
    validRange: [0xA0, 0xFF],
    signature: [0xA1, 0xB4, 0xC3, 0xC7, 0xCA, 0xD2, 0xD4, 0xE0],
    invalidBytes: [0xDB, 0xDC, 0xDD, 0xDE, 0xFC, 0xFD, 0xFE, 0xFF],
  },
];

class UniversalDetector {
  constructor() {
    this._highBitDetector = /[\x80-\xFF]/;
    this._escDetector = /(\x1B|~\{)/;
    this._escProber = null;
    this._charsetProbers = [];
    this.reset();
  }

  reset() {
    this.result = { encoding: null, confidence: 0.0 };
    this.done = false;
    this._gotData = false;
    this._inputState = 0;
    this._lastChar = '';
    this._bom = '';
    this._rawInput = null;

    if (this._escProber) this._escProber.reset();
    for (const prober of this._charsetProbers) {
      if (prober) prober.reset();
    }
  }

  feed(buf) {
    if (this.done) return;

    let str;
    if (Buffer.isBuffer(buf)) {
      str = '';
      for (let i = 0; i < buf.length; i++) {
        str += String.fromCharCode(buf[i]);
      }
      this._rawInput = this._rawInput ? Buffer.concat([this._rawInput, buf]) : Buffer.from(buf);
    } else {
      str = buf;
      const rawBuf = Buffer.alloc(str.length);
      for (let i = 0; i < str.length; i++) rawBuf[i] = str.charCodeAt(i) & 0xFF;
      this._rawInput = this._rawInput ? Buffer.concat([this._rawInput, rawBuf]) : rawBuf;
    }

    if (!str.length) return;

    // BOM detection
    if (!this._gotData) {
      this._bom += str;
      if (this._bom.length >= 3 && this._bom.slice(0, 3) === '\xEF\xBB\xBF') {
        this.result = { encoding: 'utf-8', confidence: 1.0 };
      } else if (this._bom.length >= 4 && this._bom.slice(0, 4) === '\xFF\xFE\x00\x00') {
        this.result = { encoding: 'utf-32le', confidence: 1.0 };
      } else if (this._bom.length >= 4 && this._bom.slice(0, 4) === '\x00\x00\xFE\xFF') {
        this.result = { encoding: 'utf-32be', confidence: 1.0 };
      } else if (this._bom.length >= 4 && this._bom.slice(0, 4) === '\xFE\xFF\x00\x00') {
        this.result = { encoding: 'x-iso-10646-ucs-4-3412', confidence: 1.0 };
      } else if (this._bom.length >= 4 && this._bom.slice(0, 4) === '\x00\x00\xFF\xFE') {
        this.result = { encoding: 'x-iso-10646-ucs-4-2143', confidence: 1.0 };
      } else if (this._bom.length >= 2 && this._bom.slice(0, 2) === '\xFF\xFE') {
        this.result = { encoding: 'utf-16le', confidence: 1.0 };
      } else if (this._bom.length >= 2 && this._bom.slice(0, 2) === '\xFE\xFF') {
        this.result = { encoding: 'utf-16be', confidence: 1.0 };
      }
      if (this._bom.length > 3) this._gotData = true;
    }

    if (this.result.encoding && this.result.confidence > 0.0) {
      this.done = true;
      return;
    }

    // State transitions
    if (this._inputState === 0) {
      if (this._highBitDetector.test(str)) {
        this._inputState = 2;
      } else if (this._escDetector.test(this._lastChar + str)) {
        this._inputState = 1;
      }
    }
    this._lastChar = str.slice(-1);

    if (this._inputState === 1) {
      if (!this._escProber) this._escProber = new EscCharSetProber();
      if (this._escProber.feed(str) === Constants.foundIt) {
        this.result = {
          encoding: mapProberResult(this._escProber.getCharsetName()),
          confidence: this._escProber.getConfidence()
        };
        this.done = true;
      }
    } else if (this._inputState === 2) {
      if (this._charsetProbers.length === 0) {
        this._charsetProbers = [new MBCSGroupProber()];
      }
      for (const prober of this._charsetProbers) {
        if (prober.feed(str) === Constants.foundIt) {
          this.result = {
            encoding: mapProberResult(prober.getCharsetName()),
            confidence: prober.getConfidence()
          };
          this.done = true;
          break;
        }
      }
    }
  }

  close() {
    if (this.done) return;
    if (!this._bom || this._bom.length === 0) return;
    this.done = true;

    // Pure ASCII
    if (this._inputState === 0) {
      this.result = { encoding: 'ascii', confidence: 1.0 };
      return this.result;
    }

    // MBCS statistical probers
    let mbcsResult = null;
    if (this._inputState === 2) {
      let maxConf = 0.0, maxProber = null;
      for (const prober of this._charsetProbers) {
        if (!prober) continue;
        const conf = prober.getConfidence();
        if (conf > maxConf) { maxConf = conf; maxProber = prober; }
      }
      if (maxProber && maxConf > Constants.MINIMUM_THRESHOLD) {
        mbcsResult = {
          encoding: mapProberResult(maxProber.getCharsetName()),
          confidence: maxProber.getConfidence()
        };
        // High confidence MBCS → return directly
        if (maxConf >= 0.80) {
          this.result = mbcsResult;
          return this.result;
        }
      }
    }

    // Single-byte detection (also runs when MBCS confidence is low)
    let sbResult = null;
    if (this._rawInput && this._rawInput.length > 0) {
      sbResult = this._detectSingleByte(this._rawInput);
    }

    // Pick the better result between MBCS and single-byte
    if (mbcsResult && sbResult) {
      this.result = mbcsResult.confidence >= sbResult.confidence ? mbcsResult : sbResult;
    } else if (mbcsResult) {
      this.result = mbcsResult;
    } else if (sbResult) {
      this.result = sbResult;
    }
    return this.result;
  }

  /**
   * Single-byte encoding detection:
   * 0. First try DBCS roundtrip (for cases where MBCS prober failed on short text)
   * 1. Eliminate candidates with invalid bytes
   * 2. Score remaining candidates by signature byte frequency
   * 3. Use iconv-lite decode + Unicode range check as tiebreaker
   */
  _detectSingleByte(rawBuf) {
    // Step 0: Try common DBCS encodings via iconv-lite roundtrip first
    // This catches cases where MBCS prober failed due to insufficient data
    // Only return early if extremely confident (avoids false positives)
    const dbcsResult = this._tryDbcsRoundtrip(rawBuf);
    if (dbcsResult && dbcsResult.confidence >= 0.98) {
      return dbcsResult;
    }

    // Build byte histogram
    const hist = new Uint32Array(256);
    let totalHighBytes = 0;
    for (let i = 0; i < rawBuf.length; i++) {
      hist[rawBuf[i]]++;
      if (rawBuf[i] >= 0x80) totalHighBytes++;
    }
    if (totalHighBytes === 0) return null;

    let bestEnc = null;
    let bestScore = -Infinity;

    for (const profile of SB_PROFILES) {
      // Step 1: Check for invalid bytes (instant disqualify)
      let hasInvalid = false;
      for (const inv of profile.invalidBytes) {
        if (hist[inv] > 0) { hasInvalid = true; break; }
      }
      if (hasInvalid) continue;

      // Step 2: Check how many high bytes fall in valid range
      let validHighBytes = 0;
      const [lo, hi] = profile.validRange;
      for (let b = lo; b <= hi; b++) {
        validHighBytes += hist[b];
      }
      const validRatio = validHighBytes / totalHighBytes;
      if (validRatio < 0.5) continue; // More than half of high bytes must be in valid range

      // Step 3: Score by signature byte frequency match
      let sigScore = 0;
      for (const sigByte of profile.signature) {
        sigScore += hist[sigByte];
      }
      const sigRatio = sigScore / totalHighBytes;

      // Step 4: Use iconv-lite decode + Unicode range verification
      let langScore = 0;
      if (iconv.encodingExists(profile.encoding)) {
        try {
          const decoded = iconv.decode(rawBuf, profile.encoding);
          langScore = this._scoreLangMatch(decoded, profile.lang);
        } catch (e) {
          langScore = 0;
        }
      }

      // Composite score
      const score = validRatio * 0.2 + sigRatio * 0.3 + langScore * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestEnc = profile.encoding;
      }
    }

    if (bestEnc && bestScore > 0.1) {
      const sbResult = { encoding: bestEnc, confidence: Math.min(bestScore * 1.2, 0.95) };
      // Compare with DBCS roundtrip result: DBCS must be significantly better to win
      if (dbcsResult && dbcsResult.confidence > sbResult.confidence + 0.05) {
        return dbcsResult;
      }
      return sbResult;
    }

    // If DBCS roundtrip found something, use it
    if (dbcsResult) return dbcsResult;

    // Last resort: try all iconv-lite supported encodings with roundtrip check
    return this._detectByRoundtrip(rawBuf);
  }

  /**
   * Score how well decoded text matches expected Unicode ranges for a language.
   */
  _scoreLangMatch(decoded, lang) {
    const langUnicodeRanges = {
      cyrillic: [[0x0400, 0x04FF]],
      western: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
      central_european: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
      greek: [[0x0370, 0x03FF]],
      turkish: [[0x00C0, 0x00FF], [0x011E, 0x015F]],
      hebrew: [[0x0590, 0x05FF]],
      arabic: [[0x0600, 0x06FF]],
      baltic: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
      vietnamese: [[0x00C0, 0x00FF], [0x0100, 0x01B0], [0x1EA0, 0x1EFF]],
      thai: [[0x0E00, 0x0E7F]],
    };

    const ranges = langUnicodeRanges[lang];
    if (!ranges) return 0.5;

    let matchCount = 0, highCharCount = 0;
    for (let i = 0; i < decoded.length; i++) {
      const cp = decoded.charCodeAt(i);
      if (cp > 0x7F && cp !== 0xFFFD) {
        highCharCount++;
        for (const [lo, hi] of ranges) {
          if (cp >= lo && cp <= hi) { matchCount++; break; }
        }
      }
    }
    return highCharCount > 0 ? matchCount / highCharCount : 0;
  }

  /**
   * Try common DBCS (multi-byte) encodings via iconv-lite roundtrip.
   * Used when MBCS prober fails on short text but iconv-lite can still validate.
   */
  _tryDbcsRoundtrip(rawBuf) {
    const dbcsEncodings = [
      { enc: 'shift_jis', ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]] },
      { enc: 'euc-jp',    ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF]] },
      { enc: 'gbk',       ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]] },
      { enc: 'gb2312',    ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]] },
      { enc: 'big5',      ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]] },
      { enc: 'euc-kr',    ranges: [[0xAC00, 0xD7AF], [0x3000, 0x303F]] },
      { enc: 'cp932',     ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]] },
      { enc: 'cp949',     ranges: [[0xAC00, 0xD7AF]] },
      { enc: 'cp950',     ranges: [[0x4E00, 0x9FFF]] },
    ];

    let bestEnc = null;
    let bestScore = 0;

    for (const { enc, ranges } of dbcsEncodings) {
      if (!iconv.encodingExists(enc)) continue;
      try {
        const decoded = iconv.decode(rawBuf, enc);

        // Count replacement chars (indicates invalid sequences)
        let replacements = 0;
        let cjkChars = 0;
        let highChars = 0;
        for (let i = 0; i < decoded.length; i++) {
          const cp = decoded.charCodeAt(i);
          if (cp === 0xFFFD) { replacements++; continue; }
          if (cp > 0x7F) {
            highChars++;
            for (const [lo, hi] of ranges) {
              if (cp >= lo && cp <= hi) { cjkChars++; break; }
            }
          }
        }

        if (highChars === 0) continue;

        // Roundtrip check
        const reencoded = iconv.encode(decoded, enc);
        let matchBytes = 0;
        const minLen = Math.min(rawBuf.length, reencoded.length);
        for (let i = 0; i < minLen; i++) {
          if (rawBuf[i] === reencoded[i]) matchBytes++;
        }
        const roundtripRatio = matchBytes / rawBuf.length;

        const replacementPenalty = 1 - (replacements / decoded.length);
        const cjkRatio = cjkChars / highChars;

        // Strong signal: high roundtrip + mostly CJK chars + few replacements
        // Require at least 50% of high chars to be in expected CJK ranges
        // AND at least 3 CJK characters to avoid false positives on short text
        // Require: many CJK chars, OR significant ratio of high bytes in input
        const highByteRatio = highChars / decoded.length;
        if (cjkRatio < 0.8) continue;
        if (cjkChars < 3) continue;
        if (replacements > 0) continue;  // No replacement chars allowed for DBCS
        const score = roundtripRatio * 0.3 + cjkRatio * 0.5 + replacementPenalty * 0.2;

        if (score > bestScore) {
          bestScore = score;
          bestEnc = enc;
        }
      } catch (e) { continue; }
    }

    if (bestEnc && bestScore > 0.6) {
      return { encoding: bestEnc, confidence: Math.min(bestScore, 0.95) };
    }
    return null;
  }

  /**
   * Last-resort detection: try common encodings with iconv-lite roundtrip.
   */
  _detectByRoundtrip(rawBuf) {
    const fallbacks = [
      'cp437', 'cp737', 'cp775', 'cp850', 'cp852', 'cp855', 'cp857', 'cp858',
      'cp860', 'cp861', 'cp862', 'cp863', 'cp864', 'cp865', 'cp869',
      'macintosh', 'macroman', 'macgreek', 'maccyrillic', 'maciceland',
      'macturkish', 'maccenteuro', 'maccroatian', 'macromania', 'macukraine',
      'iso-8859-3', 'iso-8859-4', 'iso-8859-10', 'iso-8859-14', 'iso-8859-16',
    ];

    let bestEnc = null;
    let bestScore = -Infinity;

    for (const enc of fallbacks) {
      if (!iconv.encodingExists(enc)) continue;
      try {
        const decoded = iconv.decode(rawBuf, enc);
        // Count replacement characters
        let replacements = 0;
        for (let i = 0; i < decoded.length; i++) {
          if (decoded.charCodeAt(i) === 0xFFFD) replacements++;
        }
        // Roundtrip check
        const reencoded = iconv.encode(decoded, enc);
        let matchBytes = 0;
        const minLen = Math.min(rawBuf.length, reencoded.length);
        for (let i = 0; i < minLen; i++) {
          if (rawBuf[i] === reencoded[i]) matchBytes++;
        }
        const roundtripRatio = rawBuf.length > 0 ? matchBytes / rawBuf.length : 0;
        const replacementPenalty = rawBuf.length > 0 ? 1 - (replacements / rawBuf.length) : 1;
        const score = roundtripRatio * 0.5 + replacementPenalty * 0.5;

        if (score > bestScore) { bestScore = score; bestEnc = enc; }
      } catch (e) { continue; }
    }

    if (bestEnc && bestScore > 0.5) {
      return { encoding: bestEnc, confidence: Math.min(bestScore * 0.8, 0.85) };
    }
    return null;
  }
}

module.exports = UniversalDetector;
