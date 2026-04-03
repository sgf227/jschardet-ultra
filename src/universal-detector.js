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
    validRange: [0x80, 0xFF],
    // Most frequent bytes for Russian text in windows-1251
    signature: [0xE0, 0xEE, 0xE8, 0xE5, 0xED, 0xF2, 0xF1, 0xE2, 0xEB, 0xEA, 0xEF, 0xF0, 0xE4, 0xE7, 0xE3, 0xEC],
    invalidBytes: [],
  },
  {
    encoding: 'koi8-r',
    lang: 'cyrillic',
    validRange: [0xC0, 0xFF],
    signature: [0xC1, 0xCF, 0xC9, 0xC5, 0xCE, 0xD4, 0xD3, 0xC2, 0xCC, 0xCB, 0xD0, 0xC4, 0xC7, 0xC3, 0xCD],
    invalidBytes: [],
  },
  {
    encoding: 'koi8-u',
    lang: 'cyrillic',
    validRange: [0xC0, 0xFF],
    signature: [0xC1, 0xCF, 0xC9, 0xC5, 0xCE, 0xD4, 0xD3, 0xC2, 0xCC, 0xCB, 0xD0],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-5',
    lang: 'cyrillic',
    validRange: [0xA0, 0xFF],
    signature: [0xD0, 0xDE, 0xD8, 0xD5, 0xDD, 0xE2, 0xE1, 0xD2, 0xDA, 0xD9, 0xDF, 0xD4],
    invalidBytes: [],
  },
  {
    encoding: 'cp866',
    lang: 'cyrillic',
    validRange: [0x80, 0xFF],
    signature: [0xA0, 0xAE, 0xA8, 0xA5, 0xAD, 0xE2, 0xE1, 0xA2, 0xAA, 0xA9, 0xAF, 0xA4],
    invalidBytes: [],
  },

  // === Western European ===
  {
    encoding: 'windows-1252',
    lang: 'western',
    validRange: [0x80, 0xFF],
    signature: [0xE9, 0xE8, 0xEA, 0xEB, 0xE0, 0xE2, 0xEE, 0xF4, 0xFC, 0xF6, 0xE4, 0xDF, 0xE1, 0xED, 0xF3, 0xFA],
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
    signature: [0xE1, 0xE9, 0xED, 0xF3, 0xFA, 0xE8, 0xF8, 0xF9, 0xF2, 0xBB, 0xAB, 0xF6, 0xFC, 0xE0],
    invalidBytes: [0x81, 0x83, 0x88, 0x98],
  },
  {
    encoding: 'iso-8859-2',
    lang: 'central_european',
    validRange: [0xA0, 0xFF],
    signature: [0xE1, 0xE9, 0xED, 0xF3, 0xFA, 0xE8, 0xF8, 0xF9, 0xF6, 0xFC],
    invalidBytes: [],
  },

  // === Greek ===
  {
    encoding: 'windows-1253',
    lang: 'greek',
    validRange: [0x80, 0xFF],
    signature: [0xE1, 0xE5, 0xE9, 0xEF, 0xF4, 0xED, 0xF3, 0xE7, 0xF0, 0xEA, 0xEF, 0xF5, 0xEC],
    invalidBytes: [0x81, 0x88, 0x8A, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x98, 0x9A, 0x9C, 0x9D, 0x9E, 0x9F, 0xAA, 0xD2, 0xFF],
  },
  {
    encoding: 'iso-8859-7',
    lang: 'greek',
    validRange: [0xA0, 0xFF],
    signature: [0xE1, 0xE5, 0xE9, 0xEF, 0xF4, 0xED, 0xF3, 0xE7, 0xF5, 0xEC],
    invalidBytes: [0xAE, 0xD2, 0xFF],
  },

  // === Turkish ===
  {
    encoding: 'windows-1254',
    lang: 'turkish',
    validRange: [0x80, 0xFF],
    signature: [0xE2, 0xE7, 0xF6, 0xFC, 0xFD, 0xF0, 0xFE, 0xE8, 0xED, 0xF1, 0xE1, 0xE9],
    invalidBytes: [0x81, 0x8D, 0x8E, 0x8F, 0x90, 0x9D, 0x9E],
  },
  {
    encoding: 'iso-8859-9',
    lang: 'turkish',
    validRange: [0xA0, 0xFF],
    signature: [0xE2, 0xE7, 0xF6, 0xFC, 0xFD, 0xF0, 0xFE, 0xE8, 0xED, 0xF1],
    invalidBytes: [],
  },

  // === Hebrew ===
  {
    encoding: 'windows-1255',
    lang: 'hebrew',
    validRange: [0x80, 0xFF],
    signature: [0xE0, 0xE5, 0xE9, 0xEC, 0xEE, 0xF0, 0xF8, 0xFA, 0xE1, 0xE3, 0xE4, 0xE6],
    invalidBytes: [0x81, 0x8A, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x9A, 0x9C, 0x9D, 0x9E, 0x9F, 0xCA, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF, 0xFB, 0xFC, 0xFF],
  },
  {
    encoding: 'iso-8859-8',
    lang: 'hebrew',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE5, 0xE9, 0xEC, 0xEE, 0xF0, 0xF8, 0xFA, 0xE3, 0xE4],
    invalidBytes: [0xA1, 0xBF, 0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF, 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xFB, 0xFC, 0xFF],
  },

  // === Arabic ===
  {
    encoding: 'windows-1256',
    lang: 'arabic',
    validRange: [0x80, 0xFF],
    signature: [0xC7, 0xE1, 0xED, 0xE4, 0xE3, 0xD1, 0xE8, 0xC8, 0xC9, 0xCA, 0xE6, 0xCC, 0xCD],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-6',
    lang: 'arabic',
    validRange: [0xA0, 0xFF],
    signature: [0xC7, 0xE1, 0xED, 0xE4, 0xE3, 0xD1, 0xE8, 0xC8, 0xE6],
    invalidBytes: [0xA1, 0xA2, 0xA3, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBC, 0xBD, 0xBE, 0xC0, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF],
  },

  // === Baltic ===
  {
    encoding: 'windows-1257',
    lang: 'baltic',
    validRange: [0x80, 0xFF],
    signature: [0xE0, 0xE7, 0xEA, 0xEB, 0xEE, 0xF0, 0xF3, 0xFC, 0xE2, 0xE8, 0xE4, 0xF5],
    invalidBytes: [0x81, 0x83, 0x88, 0x8A, 0x8C, 0x8E, 0x90, 0x98, 0x9A, 0x9C, 0x9E, 0xA0],
  },
  {
    encoding: 'iso-8859-13',
    lang: 'baltic',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE7, 0xEA, 0xEB, 0xEE, 0xF0, 0xF3, 0xFC, 0xE2, 0xF5],
    invalidBytes: [],
  },
  {
    encoding: 'iso-8859-4',
    lang: 'baltic',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE1, 0xE8, 0xEE, 0xF5, 0xF3, 0xFA, 0xEC],
    invalidBytes: [],
  },

  // === Vietnamese ===
  {
    encoding: 'windows-1258',
    lang: 'vietnamese',
    validRange: [0x80, 0xFF],
    // Vietnamese-specific bytes in windows-1258:
    // 0xD0=Đ(U+0110), 0xF0=đ(U+0111): ONLY in Vietnamese
    // 0xD5=Ơ(U+01A0), 0xF5=ơ(U+01A1), 0xDD=Ư(U+01AF), 0xFD=ư(U+01B0): also distinctive
    // 0xC3=Ă(U+0102), 0xE3=ă(U+0103): frequent in VI
    // 0xE0=à, 0xEA=ê, 0xF4=ô: shared with Western but very frequent in VI text
    signature: [0xE0, 0xF0, 0xE3, 0xD0, 0xF5, 0xFD, 0xC3, 0xD5, 0xDD, 0xCC, 0xD2, 0xDE, 0xEA, 0xF4],
    invalidBytes: [0x81, 0x8A, 0x8D, 0x8E, 0x8F, 0x90, 0x9A, 0x9D, 0x9E],
  },
  {
    encoding: 'viscii',
    lang: 'vietnamese',
    validRange: [0x80, 0xFF],
    signature: [0xB0, 0xB4, 0xB8, 0xC0, 0xC3, 0xC5, 0xC7, 0xCF, 0xD0, 0xD3, 0xD5],
    invalidBytes: [],
  },

  // === Thai ===
  {
    encoding: 'windows-874',
    lang: 'thai',
    validRange: [0x80, 0xFF],
    signature: [0xA1, 0xB4, 0xC3, 0xC7, 0xCA, 0xD2, 0xD4, 0xE0, 0xE1, 0xE2, 0xE4, 0xC2, 0xB5],
    invalidBytes: [0x80, 0x81, 0x82, 0x83, 0x84, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x98, 0x9C, 0x9D, 0x9E, 0x9F, 0xDB, 0xDC, 0xDD, 0xDE, 0xFC, 0xFD, 0xFE, 0xFF],
  },
  {
    encoding: 'iso-8859-11',
    lang: 'thai',
    validRange: [0xA0, 0xFF],
    signature: [0xA1, 0xB4, 0xC3, 0xC7, 0xCA, 0xD2, 0xD4, 0xE0, 0xE1, 0xC2],
    invalidBytes: [0xDB, 0xDC, 0xDD, 0xDE, 0xFC, 0xFD, 0xFE, 0xFF],
  },

  // === Nordic / Scandinavian ===
  {
    encoding: 'iso-8859-10',
    lang: 'nordic',
    validRange: [0xA0, 0xFF],
    signature: [0xE6, 0xF8, 0xE5, 0xE4, 0xF6, 0xFC, 0xE9, 0xE1, 0xED, 0xF3],
    invalidBytes: [],
  },

  // === Celtic / Romanian ===
  {
    encoding: 'iso-8859-14',
    lang: 'celtic',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE1, 0xE2, 0xE3, 0xE9, 0xEE, 0xF4, 0xFA, 0xBD, 0xBE],
    invalidBytes: [],
  },

  // === South-East European ===
  {
    encoding: 'iso-8859-16',
    lang: 'south_european',
    validRange: [0xA0, 0xFF],
    signature: [0xE2, 0xE3, 0xE0, 0xE1, 0xE9, 0xEE, 0xF3, 0xFA, 0xBA, 0xBE, 0xAB, 0xBB],
    invalidBytes: [],
  },

  // === Maltese / South European ===
  {
    encoding: 'iso-8859-3',
    lang: 'maltese',
    validRange: [0xA0, 0xFF],
    signature: [0xE0, 0xE7, 0xE8, 0xE9, 0xF2, 0xF4, 0xF5, 0xFA, 0xAB, 0xBB],
    invalidBytes: [0xA5, 0xAE, 0xBE, 0xC3, 0xD0, 0xE3, 0xF0],
  },

  // === DOS Code Pages ===
  {
    encoding: 'cp850',
    lang: 'western',
    validRange: [0x80, 0xFF],
    // CP850 Western European DOS: heavily uses 0x80-0x8F range for accented chars
    signature: [0x82, 0x83, 0x87, 0x88, 0x8B, 0x80, 0x81, 0x84, 0x85, 0x89, 0x8A, 0x8C],
    invalidBytes: [],  // CP850 has no undefined bytes
  },
  {
    encoding: 'cp852',
    lang: 'central_european',
    validRange: [0x80, 0xFF],
    // CP852 Central European DOS: heavily uses 0xA0-0xAF and 0x9F+ range
    // 移除0xFD(˝): 该字节在土耳其文(windows-1254)中是ı(极高频)，会导致误判
    signature: [0xA0, 0x9F, 0xA1, 0xA2, 0xA3, 0xA6, 0xA7, 0xAC, 0xB5, 0xB7, 0xD6],
    invalidBytes: [],  // CP852 has no undefined bytes
  },

  // === Apple Macintosh Encodings ===
  {
    encoding: 'macintosh',
    lang: 'western',
    validRange: [0x80, 0xFF],
    // MacRoman: heavily uses 0x80-0x9F for accented chars (unlike cp850 which also uses this range)
    signature: [0x8E, 0x89, 0x8D, 0x90, 0x95, 0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x88],
    invalidBytes: [0xF0],  // MacRoman has one undefined byte at 0xF0
  },
  {
    encoding: 'maccyrillic',
    lang: 'cyrillic',
    validRange: [0x80, 0xFF],
    // MacCyrillic uses 0xE0+ range for Cyrillic, similar to windows-1251
    signature: [0xE8, 0xF1, 0xEE, 0xF0, 0xF2, 0xE5, 0xE0, 0xE2, 0xEA, 0xE9, 0xED, 0xFB],
    invalidBytes: [],
  },
  {
    encoding: 'macgreek',
    lang: 'greek',
    validRange: [0x80, 0xFF],
    // MacGreek uses 0xE0+ range for Greek lowercase
    signature: [0xE1, 0xEC, 0xE5, 0xEE, 0xE8, 0xEB, 0xEF, 0xF3, 0xDD, 0xED, 0xF2, 0xA3],
    invalidBytes: [0xFF],
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

    // Very short all-high-byte input cannot be reliably identified
    // e.g. single 0xFF byte, 2-byte 0xFF 0xFF etc.
    let inputBuf = null;
    if (Buffer.isBuffer(buf)) {
      inputBuf = buf;
    } else if (typeof buf === 'string') {
      inputBuf = Buffer.alloc(buf.length);
      for (let i = 0; i < buf.length; i++) inputBuf[i] = buf.charCodeAt(i) & 0xFF;
    }
    if (inputBuf) {
      // For very short inputs (< 4 bytes), if ALL bytes are high bytes, we can't determine encoding
      // EXCEPTION: known BOM sequences must not be blocked
      const totalLen = (this._rawInput ? this._rawInput.length : 0) + inputBuf.length;
      if (totalLen <= 3) {
        const combined = this._rawInput ? Buffer.concat([this._rawInput, inputBuf]) : inputBuf;
        const b0 = combined[0], b1 = combined[1], b2 = combined[2];
        // Check if this could be a BOM sequence - don't block these
        // BOM needs at least 2 bytes to be identifiable
        const isBomCandidate = combined.length >= 2 && (
          (b0 === 0xEF && b1 === 0xBB) ||          // UTF-8 BOM start
          (b0 === 0xFF && b1 === 0xFE) ||           // UTF-16LE/UTF-32LE BOM start
          (b0 === 0xFE && b1 === 0xFF) ||           // UTF-16BE BOM start
          (b0 === 0x00 && b1 === 0x00 && b2 === 0xFE)  // UTF-32BE BOM start
        );
        if (!isBomCandidate) {
          const allHigh = Array.from(inputBuf).every(b => b >= 0x80);
          if (allHigh) {
            // Check if this could be valid UTF-8 multi-byte sequence
            const isValidUtf8Short = this._isValidUtf8(combined);
            if (isValidUtf8Short) {
              // Let it through - will be handled by UTF-8 detection
            } else if (combined.length === 2) {
              // 2-byte: could be a CJK character in GBK/Big5/Shift-JIS/EUC-KR
              // Let it through for DBCS detection
            } else {
              // Mark as done with null result - too short to determine
              this._gotData = true;
              this._rawInput = this._rawInput ? Buffer.concat([this._rawInput, inputBuf]) : Buffer.from(inputBuf);
              this.result = { encoding: null, confidence: 0 };
              this.done = true;
              return;
            }
          }
        }
      }
    }

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

    this._gotData = true;

    // BOM detection: only check at the very start of the stream
    const prevLen = this._rawInput ? this._rawInput.length - str.length : 0;
    if (prevLen < 4) {
      // Accumulate enough bytes to check for BOM
      const bomCheck = this._rawInput ? this._rawInput.slice(0, Math.min(this._rawInput.length, 4)) : Buffer.alloc(0);
      const bs = Array.from(bomCheck);
      const b = (i) => bs[i] !== undefined ? bs[i] : -1;

      // UTF-32 BOM 检测必须先于 UTF-16（因为 UTF-32LE BOM 以 FF FE 00 00 开头）
      if (bomCheck.length >= 4 && b(0) === 0xFF && b(1) === 0xFE && b(2) === 0x00 && b(3) === 0x00) {
        this.result = { encoding: 'UTF-32', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 4 && b(0) === 0x00 && b(1) === 0x00 && b(2) === 0xFE && b(3) === 0xFF) {
        this.result = { encoding: 'UTF-32', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 4 && b(0) === 0xFE && b(1) === 0xFF && b(2) === 0x00 && b(3) === 0x00) {
        this.result = { encoding: 'x-iso-10646-ucs-4-3412', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 4 && b(0) === 0x00 && b(1) === 0x00 && b(2) === 0xFF && b(3) === 0xFE) {
        this.result = { encoding: 'x-iso-10646-ucs-4-2143', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 3 && b(0) === 0xEF && b(1) === 0xBB && b(2) === 0xBF) {
        this.result = { encoding: 'utf-8', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 2 && b(0) === 0xFF && b(1) === 0xFE) {
        this.result = { encoding: 'UTF-16', confidence: 1.0 };
        this.done = true; return;
      } else if (bomCheck.length >= 2 && b(0) === 0xFE && b(1) === 0xFF) {
        this.result = { encoding: 'UTF-16', confidence: 1.0 };
        this.done = true; return;
      }
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
    if (!this._gotData && (!this._rawInput || this._rawInput.length === 0)) return;
    this.done = true;

    // Pure ASCII - but first check if it could be UTF-16 with ASCII content
    if (this._inputState === 0) {
      // UTF-16LE with ASCII content has alternating bytes: [ASCII, 0x00, ASCII, 0x00, ...]
      // Check if rawInput could be UTF-16 before returning ascii
      if (this._rawInput && this._rawInput.length >= 8) {
        const utf16Check = this._detectUtf16NoBom(this._rawInput);
        if (utf16Check && utf16Check.confidence >= 0.80) {
          this.result = utf16Check;
          return this.result;
        }
      }
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
        // High confidence MBCS → validate with roundtrip before returning directly
        if (maxConf >= 0.80) {
          // Verify: decode with this encoding and check for replacement chars
          const mbcsEnc = mbcsResult.encoding;
          let mbcsValid = true;
          if (this._rawInput && iconv.encodingExists(mbcsEnc)) {
            try {
              const decoded = iconv.decode(this._rawInput, mbcsEnc);
              let repCount = 0;
              for (let i = 0; i < decoded.length; i++) {
                if (decoded.charCodeAt(i) === 0xFFFD) repCount++;
              }
              const repRatio = repCount / (decoded.length || 1);
              // For truncated DBCS sequences (odd byte count ending with a high byte),
              // be more lenient with replacement characters
              const isTruncatedDbcs = this._rawInput.length % 2 === 1 &&
                this._rawInput[this._rawInput.length - 1] >= 0x80;
              const repTolerance = isTruncatedDbcs ? 0.30 : 0.10;
              if (repRatio > repTolerance) {
                // Too many replacement chars - prober may be wrong
                mbcsValid = false;
                mbcsResult.confidence *= (1 - repRatio); // Reduce confidence
              }
              // If all decoded characters are the same, the input is ambiguous
              // (e.g. repeated 0xA1 0xA1 = full-width space in both EUC-JP and GBK)
              if (mbcsValid && decoded.length > 0) {
                const firstChar = decoded[0];
                const allSame = decoded.split('').every(c => c === firstChar);
                if (allSame && decoded.length >= 4) {
                  mbcsValid = false;
                  mbcsResult = null; // Cannot determine encoding
                }
              }
            } catch (e) {}
          }
          if (mbcsValid) {
            this.result = mbcsResult;
            return this.result;
          }
          // Fall through to try other detection methods
        }
      }
    }

    // UTF-16 without BOM detection (for CJK and other non-ASCII-dominant text)
    // But first verify it's not valid UTF-8 (UTF-8 takes priority)
    let utf16Result = null;
    if (this._rawInput && this._rawInput.length >= 16) {
      // Only try UTF-16 detection if the data is NOT valid UTF-8
      const isUtf8 = this._isValidUtf8(this._rawInput);
      if (!isUtf8) {
        utf16Result = this._detectUtf16NoBom(this._rawInput);
        if (utf16Result && utf16Result.confidence >= 0.50) {
          this.result = utf16Result;
          return this.result;
        }
      }
    }

    // Single-byte detection (also runs when MBCS confidence is low)
    // If MBCS prober was invalidated by roundtrip check, try DBCS roundtrip directly
    // Also try when mbcsResult is null (MBCS prober didn't detect anything, e.g. very short CJK text)
    let dbcsEarlyResult = null;
    const mbcsInvalidated = mbcsResult && mbcsResult.confidence < 0.85;
    const mbcsMissed = !mbcsResult && this._inputState === 2; // high-byte input but no MBCS result
    if (this._rawInput && this._rawInput.length > 0 && (mbcsInvalidated || mbcsMissed)) {
      // Don't try DBCS if the data is valid UTF-8 (emoji, etc.)
      const isValidUtf8 = this._isValidUtf8(this._rawInput);
      if (!isValidUtf8) {
        // Check for random binary / sequential byte patterns before DBCS detection
        const rawForCheck = this._rawInput;
        const allHighForCheck = rawForCheck.length >= 4 && Array.from(rawForCheck).every(b => b >= 0x80);
        let isBinaryData = false;
        if (allHighForCheck) {
          const hist3 = new Uint32Array(256);
          for (let j = 0; j < rawForCheck.length; j++) hist3[rawForCheck[j]]++;
          let uniqueHigh = 0;
          for (let b = 0x80; b <= 0xFF; b++) if (hist3[b] > 0) uniqueHigh++;
          if (uniqueHigh <= 2) {
            isBinaryData = true;
          } else if (rawForCheck.length >= 6) {
            let seqCnt = 0;
            for (let j = 1; j < rawForCheck.length; j++) {
              const diff = rawForCheck[j] - rawForCheck[j - 1];
              if (diff === 1 || diff === -1 || diff === 0) seqCnt++;
            }
            if (seqCnt / (rawForCheck.length - 1) > 0.7) isBinaryData = true;
          }
        }
        if (!isBinaryData) {
          dbcsEarlyResult = this._tryDbcsRoundtrip(this._rawInput);
        }
        if (dbcsEarlyResult) {
          // For invalidated MBCS: lower threshold since we have evidence of wrong detection
          // For missed MBCS on short text: use 0.97+ (near-perfect) to avoid false positives
          // For missed MBCS on longer text: use 0.90
          let threshold;
          if (mbcsInvalidated) {
            threshold = 0.80;
          } else if (this._rawInput.length <= 4) {
            threshold = 0.97; // Very short text needs near-perfect confidence
          } else {
            threshold = 0.90;
          }
          if (dbcsEarlyResult.confidence >= threshold) {
            this.result = dbcsEarlyResult;
            return this.result;
          }
        }
      }
    }

    let sbResult = null;
    if (this._rawInput && this._rawInput.length > 0) {
      sbResult = this._detectSingleByte(this._rawInput);
    }

    // Pick the best result
    // Note: dbcsEarlyResult is only included if it met its threshold (already returned above if so)
    // If we reach here, dbcsEarlyResult didn't meet the threshold, so don't include it
    const candidates = [mbcsResult, utf16Result, sbResult].filter(Boolean);
    if (candidates.length > 0) {
      this.result = candidates.reduce((best, cur) =>
        cur.confidence > best.confidence ? cur : best
      );
    }
    return this.result;
  }

  /**
   * Detect UTF-16 without BOM by analyzing byte patterns.
   * Handles CJK text where high bytes are NOT zero.
   */
  _detectUtf16NoBom(rawBuf) {
    const len = rawBuf.length;
    if (len < 8 || len % 2 !== 0) return null;

    const pairs = len / 2;
    let leNuls = 0, beNuls = 0;
    let leValidCjk = 0, beValidCjk = 0;
    let leValidBmp = 0, beValidBmp = 0;
    // Track invalid/surrogate code points
    let leInvalid = 0, beInvalid = 0;

    for (let i = 0; i < len - 1; i += 2) {
      const b0 = rawBuf[i];
      const b1 = rawBuf[i + 1];

      const leCp = b1 * 256 + b0; // UTF-16LE
      const beCp = b0 * 256 + b1; // UTF-16BE

      if (b1 === 0) leNuls++;
      if (b0 === 0) beNuls++;

      // Track invalid code points (surrogates, C0 control chars etc.)
      if (!this._isValidBmpChar(leCp)) leInvalid++;
      if (!this._isValidBmpChar(beCp)) beInvalid++;

      // Check CJK ranges for UTF-16LE
      if (this._isCjkCodepoint(leCp)) leValidCjk++;
      if (this._isValidBmpChar(leCp)) leValidBmp++;

      // Check CJK ranges for UTF-16BE
      if (this._isCjkCodepoint(beCp)) beValidCjk++;
      if (this._isValidBmpChar(beCp)) beValidBmp++;
    }

    const leNulRatio = leNuls / pairs;
    const beNulRatio = beNuls / pairs;
    const leCjkRatio = leValidCjk / pairs;
    const beCjkRatio = beValidCjk / pairs;
    const leBmpRatio = leValidBmp / pairs;
    const beBmpRatio = beValidBmp / pairs;
    const leInvalidRatio = leInvalid / pairs;
    const beInvalidRatio = beInvalid / pairs;

    // Case 1: ASCII-dominant UTF-16 (high NUL ratio)
    if (leNulRatio > 0.5 && leNulRatio > beNulRatio * 2 && leBmpRatio > 0.85 && leInvalidRatio < 0.05) {
      // confidence: base 0.80 + NUL ratio bonus
      const conf = Math.min(0.80 + leNulRatio * 0.15, 0.95);
      return { encoding: 'UTF-16', confidence: conf };
    }
    if (beNulRatio > 0.5 && beNulRatio > leNulRatio * 2 && beBmpRatio > 0.85 && beInvalidRatio < 0.05) {
      const conf = Math.min(0.80 + beNulRatio * 0.15, 0.95);
      return { encoding: 'UTF-16', confidence: conf };
    }

    // Case 2: CJK-dominant UTF-16 (many CJK codepoints)
    // Lower threshold to 0.3 (from 0.4) to catch shorter CJK texts
    if (leCjkRatio > 0.3 && leCjkRatio > beCjkRatio * 1.5 && leBmpRatio > 0.80 && leInvalidRatio < 0.05) {
      // Guard: if data can be losslessly decoded as a DBCS encoding, it's NOT UTF-16
      if (!this._isDbcsCandidateBytes(rawBuf)) {
        const conf = Math.min(leCjkRatio * 0.5 + leBmpRatio * 0.5, 0.90);
        return { encoding: 'UTF-16', confidence: conf };
      }
    }
    if (beCjkRatio > 0.3 && beCjkRatio > leCjkRatio * 1.5 && beBmpRatio > 0.80 && beInvalidRatio < 0.05) {
      if (!this._isDbcsCandidateBytes(rawBuf)) {
        const conf = Math.min(beCjkRatio * 0.5 + beBmpRatio * 0.5, 0.90);
        return { encoding: 'UTF-16', confidence: conf };
      }
    }

    // Case 3: Mixed Unicode (Hangul, Hiragana, etc.) - check overall BMP validity
    // If one direction has very high BMP validity and very few invalids, it's likely UTF-16
    if (leBmpRatio > 0.95 && leInvalidRatio < 0.02 && leBmpRatio > beBmpRatio + 0.1) {
      // Extra check: at least some non-ASCII chars
      const leHighCp = Array.from({ length: pairs }, (_, i) => {
        const b0 = rawBuf[i * 2], b1 = rawBuf[i * 2 + 1];
        return b1 * 256 + b0;
      }).filter(cp => cp > 0x7F).length;
      if (leHighCp / pairs > 0.3) {
        return { encoding: 'UTF-16', confidence: 0.82 };
      }
    }
    if (beBmpRatio > 0.95 && beInvalidRatio < 0.02 && beBmpRatio > leBmpRatio + 0.1) {
      const beHighCp = Array.from({ length: pairs }, (_, i) => {
        const b0 = rawBuf[i * 2], b1 = rawBuf[i * 2 + 1];
        return b0 * 256 + b1;
      }).filter(cp => cp > 0x7F).length;
      if (beHighCp / pairs > 0.3) {
        return { encoding: 'UTF-16', confidence: 0.82 };
      }
    }

    return null;
  }

  _isCjkCodepoint(cp) {
    return (cp >= 0x4E00 && cp <= 0x9FFF)   // CJK Unified Ideographs
        || (cp >= 0x3000 && cp <= 0x30FF)   // CJK Symbols, Hiragana, Katakana
        || (cp >= 0xAC00 && cp <= 0xD7AF)   // Hangul Syllables
        || (cp >= 0x3100 && cp <= 0x31FF)   // Bopomofo, Hangul Compatibility
        || (cp >= 0xFF00 && cp <= 0xFFEF);  // Halfwidth/Fullwidth Forms
  }

  _isValidBmpChar(cp) {
    if (cp === 0) return true;
    if (cp < 0x0020 && cp !== 0x0009 && cp !== 0x000A && cp !== 0x000D) return false;
    if (cp >= 0xD800 && cp <= 0xDFFF) return false; // surrogates
    return true;
  }

  /**
   * Strict UTF-8 byte-level validation.
   * Returns true only if the entire buffer is valid UTF-8 with no overlong sequences.
   */
  _isValidUtf8(buf) {
    let i = 0;
    while (i < buf.length) {
      const b = buf[i];
      let seqLen;
      if (b < 0x80) {
        // ASCII
        i++;
        continue;
      } else if ((b & 0xE0) === 0xC0) {
        seqLen = 2;
        if ((b & 0x1F) < 2) return false; // overlong
      } else if ((b & 0xF0) === 0xE0) {
        seqLen = 3;
      } else if ((b & 0xF8) === 0xF0) {
        seqLen = 4;
        if (b > 0xF4) return false; // beyond Unicode range
      } else {
        return false; // invalid lead byte
      }

      if (i + seqLen > buf.length) return false;

      for (let j = 1; j < seqLen; j++) {
        if ((buf[i + j] & 0xC0) !== 0x80) return false; // invalid continuation byte
      }

      // Check for overlong sequences and surrogate pairs
      if (seqLen === 3) {
        const cp = ((b & 0x0F) << 12) | ((buf[i+1] & 0x3F) << 6) | (buf[i+2] & 0x3F);
        if (cp < 0x0800) return false; // overlong
        if (cp >= 0xD800 && cp <= 0xDFFF) return false; // surrogate
      } else if (seqLen === 4) {
        const cp = ((b & 0x07) << 18) | ((buf[i+1] & 0x3F) << 12) | ((buf[i+2] & 0x3F) << 6) | (buf[i+3] & 0x3F);
        if (cp < 0x10000 || cp > 0x10FFFF) return false; // overlong or out of range
      }

      i += seqLen;
    }
    return true;
  }

  /**
   * Check if the raw bytes look like a DBCS encoding (Shift-JIS, GBK, EUC-JP, etc.)
   * rather than UTF-16. This prevents CJK DBCS text from being misidentified as UTF-16.
   *
   * Key insight: DBCS encodings have specific lead byte ranges:
   * - Shift-JIS: lead bytes 0x81-0x9F or 0xE0-0xFC
   * - GBK/GB2312: lead bytes 0x81-0xFE
   * - EUC-JP: lead bytes 0xA1-0xFE
   * - EUC-KR: lead bytes 0xA1-0xFE
   * - Big5: lead bytes 0x81-0xFE
   *
   * If >60% of even-position bytes are in DBCS lead byte ranges AND
   * the data can be decoded without replacement chars, it's likely DBCS.
   */
  _isDbcsCandidateBytes(buf) {
    if (buf.length < 2) return false;
    // Check Shift-JIS lead byte pattern: 0x81-0x9F or 0xE0-0xFC at even positions
    let sjisLeads = 0, gbkLeads = 0;
    const pairs = Math.floor(buf.length / 2);
    for (let i = 0; i < buf.length - 1; i += 2) {
      const b = buf[i];
      if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) sjisLeads++;
      if (b >= 0x81 && b <= 0xFE) gbkLeads++;
    }
    const sjisRatio = sjisLeads / pairs;
    const gbkRatio = gbkLeads / pairs;

    // If most even-position bytes are in DBCS lead ranges, it's DBCS
    if (sjisRatio > 0.6 || gbkRatio > 0.8) {
      // Verify with roundtrip
      try {
        const enc = sjisRatio > 0.6 ? 'shift_jis' : 'gbk';
        const decoded = iconv.decode(buf, enc);
        let rep = 0;
        for (let i = 0; i < decoded.length; i++) {
          if (decoded.charCodeAt(i) === 0xFFFD) rep++;
        }
        if (rep / (decoded.length || 1) < 0.05) return true;
      } catch (e) {}
    }
    return false;
  }

  /**
   * 0. First try DBCS roundtrip (for cases where MBCS prober failed on short text)
   * 1. Eliminate candidates with invalid bytes
   * 2. Score remaining candidates by signature byte frequency
   * 3. Use iconv-lite decode + Unicode range check as tiebreaker
   */
  _detectSingleByte(rawBuf) {
    // Pre-check: strict UTF-8 byte-level validation
    // This handles emoji, 4-byte chars, and other cases where the state machine
    // might not accumulate enough multi-byte chars for high confidence
    if (this._isValidUtf8(rawBuf)) {
      // Count multi-byte chars to confirm it's non-trivial UTF-8
      let mbCount = 0;
      let seqCount = 0; // count of complete multi-byte sequences
      let i = 0;
      while (i < rawBuf.length) {
        const b = rawBuf[i];
        if (b < 0x80) { i++; continue; }
        mbCount++;
        // Determine sequence length
        let seqLen = 1;
        if ((b & 0xE0) === 0xC0) seqLen = 2;
        else if ((b & 0xF0) === 0xE0) seqLen = 3;
        else if ((b & 0xF8) === 0xF0) seqLen = 4;
        if (i + seqLen <= rawBuf.length) seqCount++;
        i += seqLen;
      }
      if (seqCount > 0) {
        return { encoding: 'utf-8', confidence: 0.99 };
      }
    }

    // Early binary guard: if ALL bytes are >= 0x80 (e.g. 0xFF-filled buffer),
    // and no valid single-byte encoding profile can decode it cleanly, return null.
    // This prevents misidentifying random binary as some encoding.
    const allHighBytes = Array.from(rawBuf).every(b => b >= 0x80);
    if (allHighBytes && rawBuf.length >= 4) {
      // Check if the byte distribution looks like real text
      // Real text has a characteristic distribution; random/uniform data does not
      const hist2 = new Uint32Array(256);
      for (let j = 0; j < rawBuf.length; j++) hist2[rawBuf[j]]++;

      // Count unique high bytes
      let uniqueHighBytes = 0;
      for (let b = 0x80; b <= 0xFF; b++) {
        if (hist2[b] > 0) uniqueHighBytes++;
      }

      // If only 1-2 unique byte values (e.g. all 0xFF), it's not real text
      if (uniqueHighBytes <= 2) {
        return null;
      }

      // Detect sequential/arithmetic byte patterns (e.g. 0x80,0x81,0x82,...) - not real text
      if (rawBuf.length >= 6) {
        let sequentialCount = 0;
        for (let j = 1; j < rawBuf.length; j++) {
          const diff = rawBuf[j] - rawBuf[j - 1];
          if (diff === 1 || diff === -1 || diff === 0) sequentialCount++;
        }
        const seqRatio = sequentialCount / (rawBuf.length - 1);
        if (seqRatio > 0.7) {
          return null;
        }
      }

      // If bytes are spread uniformly across ALL 128 high-byte values with similar frequency,
      // it's likely random binary data
      if (uniqueHighBytes > 60) {
        // Very high entropy - check if any profile has invalid bytes
        let anyProfileValid = false;
        for (const profile of SB_PROFILES) {
          let hasInvalid = false;
          for (const inv of profile.invalidBytes) {
            if (hist2[inv] > 0) { hasInvalid = true; break; }
          }
          if (!hasInvalid) { anyProfileValid = true; break; }
        }
        if (!anyProfileValid) return null;
      }
    }

    // Step 0: Try common DBCS encodings via iconv-lite roundtrip first
    // This catches cases where MBCS prober failed due to insufficient data
    const dbcsResult = this._tryDbcsRoundtrip(rawBuf);
    if (dbcsResult && dbcsResult.confidence >= 0.85) {
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

    // Guard: if bytes are spread too uniformly across all 256 values (entropy too high),
    // this is likely random binary data - return null instead of guessing
    if (rawBuf.length >= 8) {
      const uniqueHighBytes = Object.keys(
        Array.from(rawBuf).filter(b => b >= 0x80).reduce((acc, b) => { acc[b] = 1; return acc; }, {})
      ).length;
      const highByteRatio = totalHighBytes / rawBuf.length;
      // All-high-byte data with high variety = likely binary
      if (highByteRatio >= 0.95 && uniqueHighBytes > 20) {
        // Check if it could be a valid single-byte encoding by looking for invalid bytes
        let anyProfileValid = false;
        for (const profile of SB_PROFILES) {
          let hasInvalid = false;
          for (const inv of profile.invalidBytes) {
            if (hist[inv] > 0) { hasInvalid = true; break; }
          }
          if (!hasInvalid) { anyProfileValid = true; break; }
        }
        if (!anyProfileValid) return null;
      }
    }

    let bestEnc = null;
    let bestScore = -Infinity;

    // Pre-compute byte segment statistics for pattern matching
    let bytes_80_9F = 0; // Windows-specific control area (used by CE/Baltic/etc.)
    let bytes_A0_BF = 0; // Lower Latin/punctuation
    let bytes_C0_DF = 0; // Upper Latin area
    let bytes_E0_FF = 0; // Very high byte area

    for (let b = 0x80; b <= 0x9F; b++) bytes_80_9F += hist[b];
    for (let b = 0xA0; b <= 0xBF; b++) bytes_A0_BF += hist[b];
    for (let b = 0xC0; b <= 0xDF; b++) bytes_C0_DF += hist[b];
    for (let b = 0xE0; b <= 0xFF; b++) bytes_E0_FF += hist[b];

    // Hebrew/Arabic detection heuristic:
    // - All or nearly all high bytes are in 0xE0-0xFF range
    // - No bytes in 0x80-0xDF range at all
    // - AND we have enough high bytes to make this meaningful (> 10)
    // Note: Western European (French, etc.) ALSO has bytes in 0xE0-0xFF (é=0xE9, etc.)
    // but these ALSO typically have bytes in 0xC0-0xDF (à=0xE0 is >= 0xE0 but common western
    // chars like Â=0xC2, Ä=0xC4, etc. are in 0xC0-0xDF).
    // Hebrew text uses ONLY 0xE0-0xFA range for Hebrew letters, no 0xC0-0xDF.
    const isHighOnly = bytes_80_9F === 0 && bytes_A0_BF === 0 && bytes_C0_DF === 0 &&
                       bytes_E0_FF > 8 && totalHighBytes >= 10;

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

      // Composite score - langScore is the primary discriminator
      let score = validRatio * 0.1 + sigRatio * 0.1 + langScore * 0.8;

      // High-byte density constraint: languages like Cyrillic and Greek use ONLY high bytes
      // for their script, so the high-byte ratio in authentic text should be very high.
      // Real Cyrillic text typically has 50-90% high bytes. Western European text is usually <35%.
      const highByteRatio = totalHighBytes / rawBuf.length;
      if (highByteRatio < 0.40) {
        if (profile.lang === 'cyrillic') {
          // Gradual penalty: stronger the lower the ratio
          score -= (0.40 - highByteRatio) * 3.0;
        } else if (profile.lang === 'greek' || profile.lang === 'hebrew' ||
                   profile.lang === 'arabic' || profile.lang === 'thai') {
          score -= (0.40 - highByteRatio) * 2.0;
        }
      }
      // 上限惩罚：高字节比例过高时惩罚西里尔/希腊/希伯来/阿拉伯
      // 真正的西里尔文本高字节比例通常不超过85%（因为有标点、数字、空格）
      // 泰文文本几乎全是高字节（>90%），因此高比例应该加分给泰文，惩罚西里尔
      if (highByteRatio > 0.88) {
        if (profile.lang === 'cyrillic') {
          score -= (highByteRatio - 0.88) * 5.0;
        } else if (profile.lang === 'greek' || profile.lang === 'hebrew' || profile.lang === 'arabic') {
          score -= (highByteRatio - 0.88) * 3.0;
        }
        // 泰文在高字节比例极高时加分（但需要足够长的文本才可靠）
        if (profile.lang === 'thai' && highByteRatio > 0.90 && rawBuf.length >= 20) {
          score += (highByteRatio - 0.90) * 3.0;
        }
      }

      // Pattern-based bonus/penalty
      if (isHighOnly) {
        // All high bytes in 0xE0-0xFF: strongly favors Hebrew/Arabic, penalizes CE/Western
        if (profile.lang === 'hebrew' || profile.lang === 'arabic') {
          score += 0.3; // Strong bonus for Hebrew/Arabic
        } else if (profile.lang === 'central_european' || profile.lang === 'western' ||
                   profile.lang === 'baltic' || profile.lang === 'vietnamese') {
          score -= 0.3; // Penalty for CE/Western that should use 0x80-0x9F range
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestEnc = profile.encoding;
      }
    }

    if (bestEnc && bestScore > 0.1) {
      // Post-processing: for Cyrillic encodings, verify the decoded output actually contains
      // Cyrillic Unicode characters. If not, fall through to let other encodings win.
      const cyrillicEncodings = new Set(['windows-1251', 'koi8-r', 'koi8-u', 'iso-8859-5', 'cp866', 'koi8-ru', 'koi8-t']);
      if (cyrillicEncodings.has(bestEnc) && iconv.encodingExists(bestEnc)) {
        try {
          const decoded = iconv.decode(rawBuf, bestEnc);
          let cyrCount = 0, totalHigh = 0;
          for (let i = 0; i < decoded.length; i++) {
            const cp = decoded.charCodeAt(i);
            if (cp > 0x7F && cp !== 0xFFFD) {
              totalHigh++;
              if (cp >= 0x0400 && cp <= 0x04FF) cyrCount++;
            }
          }
          // If less than 40% of high chars are Cyrillic, don't claim this is Cyrillic
          if (totalHigh > 0 && cyrCount / totalHigh < 0.4) {
            // Re-run scoring excluding Cyrillic encodings to find the real match
            let altBestEnc = null, altBestScore = -Infinity;
            for (const profile of SB_PROFILES) {
              if (cyrillicEncodings.has(profile.encoding)) continue;
              let hasInvalid = false;
              for (const inv of profile.invalidBytes) {
                if (hist[inv] > 0) { hasInvalid = true; break; }
              }
              if (hasInvalid) continue;
              let validHighBytes = 0;
              const [lo, hi] = profile.validRange;
              for (let b = lo; b <= hi; b++) validHighBytes += hist[b];
              const altValidRatio = validHighBytes / totalHighBytes;
              if (altValidRatio < 0.5) continue;
              let altSigScore = 0;
              for (const sigByte of profile.signature) altSigScore += hist[sigByte];
              let altLangScore = 0;
              if (iconv.encodingExists(profile.encoding)) {
                try {
                  const altDecoded = iconv.decode(rawBuf, profile.encoding);
                  altLangScore = this._scoreLangMatch(altDecoded, profile.lang);
                } catch (e) {}
              }
              const altScore = altValidRatio * 0.1 + (altSigScore / totalHighBytes) * 0.1 + altLangScore * 0.8;
              if (altScore > altBestScore) { altBestScore = altScore; altBestEnc = profile.encoding; }
            }
            if (altBestEnc && altBestScore > 0.3) {
              return { encoding: altBestEnc, confidence: Math.min(altBestScore * 1.2, 0.92) };
            }
          }
        } catch (e) {}
      }

      const sbResult = { encoding: bestEnc, confidence: Math.min(bestScore * 1.2, 0.95) };

      // Post-process: prefer ISO-8859 over Windows code pages when the input
      // doesn't contain bytes in the Windows-specific range (0x80-0x9F).
      // This avoids false positives for "windows-1253" when "iso-8859-7" is more appropriate.
      if (sbResult.encoding) {
        const windowsToIso = {
          'windows-1252': 'iso-8859-1',   // Western European
          'windows-1253': 'iso-8859-7',   // Greek
          'windows-1255': 'iso-8859-8',   // Hebrew
          'windows-1254': 'iso-8859-9',   // Turkish
          'windows-1250': 'iso-8859-2',   // Central European
          'windows-1257': 'iso-8859-13',  // Baltic
        };
        const isoEquiv = windowsToIso[sbResult.encoding];
        if (isoEquiv) {
          // Check if any bytes in 0x80-0x9F range exist
          let has80_9F = false;
          for (let b = 0x80; b <= 0x9F; b++) {
            if (hist[b] > 0) { has80_9F = true; break; }
          }
          if (!has80_9F) {
            sbResult.encoding = isoEquiv;
          }
        }
      }

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
   * Uses both general ranges AND distinctive character features to disambiguate
   * between similar encodings (e.g. windows-1252 vs windows-1250).
   */
  _scoreLangMatch(decoded, lang) {
    // Distinctive character sets that strongly identify a specific language/encoding
    // Format: { required: Set (at least one must appear for bonus), ranges: [...] }
    const langProfiles = {
      cyrillic: {
        ranges: [[0x0400, 0x04FF], [0x0500, 0x052F]],
        // Cyrillic letters а-я (most common lowercase)
        distinctive: new Set([0x0430, 0x0431, 0x0432, 0x0433, 0x0434, 0x0435, 0x0436, 0x0437,
                               0x0438, 0x0439, 0x043A, 0x043B, 0x043C, 0x043D, 0x043E, 0x043F,
                               0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447,
                               0x0448, 0x0449, 0x044A, 0x044B, 0x044C, 0x044D, 0x044E, 0x044F]),
        // Exclude Latin-1 Supplement (0x00C0-0x00FF): if we see these, it's NOT Cyrillic text
        // Also exclude Greek range
        excludeRanges: [[0x00C0, 0x00FF], [0x0370, 0x03FF], [0x0100, 0x017F]],
      },
      western: {
        // Western: mainly 0x00C0-0x00FF, very few or no chars in 0x0100+
        ranges: [[0x00C0, 0x00FF]],
        // Should NOT have many chars in 0x100-0x17F (those are Central European)
        excludeRanges: [[0x0100, 0x017F]],
        // Western-ONLY distinctive chars, including German-specific (ä Ä ö Ö ü Ü ß):
        // French: é è ê ë î ï ù û ç ñ É È Î
        // German: ä Ä ö Ö ü Ü ß (0xE4 0xC4 0xF6 0xD6 0xFC 0xDC 0xDF)
        distinctive: new Set([0x00E9, 0x00E8, 0x00EA, 0x00EB, 0x00EF, 0x00EE, 0x00F9, 0x00FB,
                               0x00DF, 0x00C9, 0x00C8, 0x00CA, 0x00CB, 0x00E7, 0x00F1, 0x00C0,
                               0x00E4, 0x00C4, 0x00F6, 0x00D6, 0x00FC, 0x00DC]),
      },
      central_european: {
        // CE: mix of 0x00C0-0x00FF AND significant 0x0100-0x017F
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
        // Strongly distinctive CE chars: č,š,ž,ř,ý,ě,ď,ť,ň and Polish ą,ę,ó,ś,ź,ż,ł,ń
        distinctive: new Set([0x010D, 0x0161, 0x017E, 0x0159, 0x011B, 0x010F, 0x0165, 0x0148,
                               0x0105, 0x0119, 0x015B, 0x017A, 0x017C, 0x0142, 0x0144,
                               0x010C, 0x0160, 0x017D, 0x0158]),
      },
      greek: {
        ranges: [[0x0370, 0x03FF], [0x1F00, 0x1FFF]],
        distinctive: new Set([0x03B1, 0x03B2, 0x03B3, 0x03B4, 0x03B5, 0x03B6, 0x03B7, 0x03B8,
                               0x03B9, 0x03BA, 0x03BB, 0x03BC, 0x03BD, 0x03BE, 0x03BF, 0x03C0,
                               0x03C1, 0x03C2, 0x03C3, 0x03C4, 0x03C5, 0x03C6, 0x03C7, 0x03C8,
                               0x03C9, 0x0391, 0x0395, 0x0397, 0x0399, 0x039F, 0x03A5, 0x03A9]),
      },
      turkish: {
        ranges: [[0x00C0, 0x00FF], [0x011E, 0x011F], [0x0130, 0x0131], [0x015E, 0x015F]],
        // Turkish-ONLY distinctive chars: Ğğ(011E/F), Şş(015E/F), İı(0130/0131)
        // ü ö are NOT distinctive (shared with German/Nordic)
        distinctive: new Set([0x011E, 0x011F, 0x0130, 0x0131, 0x015E, 0x015F]),
      },
      hebrew: {
        ranges: [[0x0590, 0x05FF], [0xFB1D, 0xFB4F]],
        distinctive: new Set([0x05D0, 0x05D1, 0x05D2, 0x05D3, 0x05D4, 0x05D5, 0x05D6, 0x05D7,
                               0x05D8, 0x05D9, 0x05DA, 0x05DB, 0x05DC, 0x05DD, 0x05DE, 0x05DF]),
      },
      arabic: {
        ranges: [[0x0600, 0x06FF], [0x0750, 0x077F], [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]],
        distinctive: new Set([0x0627, 0x0628, 0x062A, 0x062B, 0x062C, 0x062E, 0x062F,
                               0x0631, 0x0633, 0x0634, 0x0639, 0x0641, 0x0644, 0x0645,
                               0x0646, 0x0647, 0x0648, 0x064A]),
      },
      baltic: {
        // Baltic: 0x0100-0x017F area with specific letters (ā ē ģ ī ķ ļ ņ š ū ž)
        ranges: [[0x0100, 0x017F]],
        // Highly distinctive Baltic chars: Āā Ēē Ģģ Īī Ķķ Ļļ Ņņ Šš Ūū Žž
        distinctive: new Set([0x0101, 0x0100, 0x0113, 0x0112, 0x0123, 0x0122, 0x012B, 0x012A,
                               0x0137, 0x0136, 0x013C, 0x013B, 0x0146, 0x0145, 0x0161, 0x0160,
                               0x016B, 0x016A, 0x017E, 0x017D]),
        // Baltic text must NOT contain Cyrillic chars
        excludeRanges: [[0x0400, 0x04FF]],
      },
      vietnamese: {
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x01B0], [0x1EA0, 0x1EFF]],
        // Highly distinctive Vietnamese: Ơơ(U+01A0/01A1), Ưư(U+01AF/01B0), Đđ(U+0110/0111), Ăă(U+0102/0103)
        // U+01A0, U+01A1, U+01AF, U+01B0 are ONLY used in Vietnamese!
        distinctive: new Set([0x01A0, 0x01A1, 0x01AF, 0x01B0, 0x0110, 0x0111, 0x0102, 0x0103]),
      },
      thai: {
        ranges: [[0x0E00, 0x0E7F]],
        distinctive: new Set([0x0E01, 0x0E02, 0x0E03, 0x0E04, 0x0E05, 0x0E06, 0x0E07,
                               0x0E14, 0x0E19, 0x0E1B, 0x0E23, 0x0E27, 0x0E2A, 0x0E2B, 0x0E2D]),
      },
      nordic: {
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
        // True Nordic-exclusive chars: æ ø å Æ Ø Å (NOT ü ö ä, which are German/Turkish too)
        distinctive: new Set([0x00E6, 0x00F8, 0x00E5, 0x00C6, 0x00D8, 0x00C5]),
      },
      celtic: {
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x017F], [0x1E00, 0x1EFF]],
        distinctive: new Set([0x1E02, 0x1E03, 0x1E0A, 0x1E0B, 0x1E1E, 0x1E1F,
                               0x1E40, 0x1E41, 0x1E56, 0x1E57, 0x1E60, 0x1E61]),
      },
      south_european: {
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
        distinctive: new Set([0x0102, 0x0103, 0x015E, 0x015F, 0x0162, 0x0163]), // Romanian: Ăă Şş Ţţ
      },
      maltese: {
        ranges: [[0x00C0, 0x00FF], [0x0100, 0x017F]],
        distinctive: new Set([0x010A, 0x010B, 0x0120, 0x0121, 0x0126, 0x0127, 0x017B, 0x017C]),
      },
      armenian: {
        ranges: [[0x0530, 0x058F]],
        distinctive: new Set([0x0531, 0x0532, 0x0533, 0x0534, 0x0535]),
      },
      georgian: {
        ranges: [[0x10A0, 0x10FF]],
        distinctive: new Set([0x10D0, 0x10D1, 0x10D2, 0x10D3, 0x10D4]),
      },
    };

    const profile = langProfiles[lang];
    if (!profile) return 0.5;

    let matchCount = 0, highCharCount = 0, replacementCount = 0;
    let distinctiveCount = 0;
    let excludeCount = 0;
    const { ranges, distinctive, excludeRanges } = profile;

    for (let i = 0; i < decoded.length; i++) {
      const cp = decoded.charCodeAt(i);
      if (cp === 0xFFFD) { replacementCount++; continue; }
      if (cp > 0x7F) {
        highCharCount++;
        // Check main ranges
        for (const [lo, hi] of ranges) {
          if (cp >= lo && cp <= hi) { matchCount++; break; }
        }
        // Check distinctive characters
        if (distinctive && distinctive.has(cp)) distinctiveCount++;
        // Check exclude ranges (chars that shouldn't appear)
        if (excludeRanges) {
          for (const [lo, hi] of excludeRanges) {
            if (cp >= lo && cp <= hi) { excludeCount++; break; }
          }
        }
      }
    }

    // Penalize replacement characters heavily
    if (replacementCount > 0 && decoded.length > 0) {
      const replacementRatio = replacementCount / decoded.length;
      if (replacementRatio > 0.05) return 0;
    }

    if (highCharCount === 0) return 0;

    const rangeScore = matchCount / highCharCount;

    // Distinctive character ratio: what fraction of high chars are distinctive?
    // This is more reliable than absolute counts for variable-length texts
    const distinctiveRatio = distinctiveCount / highCharCount;

    // Bonus: 0.0 to 0.5 based on how many distinctive chars appear
    // Using ratio-based approach prevents score inflation for longer texts
    const distinctiveBonus = distinctiveRatio * 0.5;

    // Penalty for exclude range chars
    const excludePenalty = excludeRanges ? (excludeCount / highCharCount) * 0.5 : 0;

    // Cap at 1.5 to prevent extreme values
    return Math.max(0, Math.min(1.5, rangeScore + distinctiveBonus - excludePenalty));
  }

  /**
   * Try common DBCS (multi-byte) encodings via iconv-lite roundtrip.
   * Used when MBCS prober fails on short text but iconv-lite can still validate.
   */
  _tryDbcsRoundtrip(rawBuf) {
    // 短文本（< 2字节）不做DBCS检测
    if (rawBuf.length < 2) return null;

    // Guard: single repeated byte value is ambiguous across many encodings
    // Only apply this guard for 4+ bytes (2 bytes could be a single CJK char)
    if (rawBuf.length >= 4) {
      const firstByte = rawBuf[0];
      let allSame = true;
      for (let i = 1; i < rawBuf.length; i++) {
        if (rawBuf[i] !== firstByte) { allSame = false; break; }
      }
      if (allSame && firstByte >= 0x80) return null;
    }

    const dbcsEncodings = [
      { enc: 'utf-8',     ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F], [0xAC00, 0xD7AF], [0x0080, 0x07FF]], minCjk: 1, allowReplace: false },
      // Japanese encodings before Chinese ones - Shift-JIS has distinctive byte ranges
      { enc: 'shift_jis', ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]], minCjk: 1, allowReplace: true },
      { enc: 'euc-jp',    ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF], [0xFF61, 0xFF9F]], minCjk: 1, allowReplace: true },
      // Korean
      { enc: 'euc-kr',    ranges: [[0xAC00, 0xD7AF], [0x3000, 0x303F]], minCjk: 1, allowReplace: false },
      { enc: 'cp949',     ranges: [[0xAC00, 0xD7AF], [0x3100, 0x31FF]], minCjk: 1, allowReplace: false },
      // GB18030 must come before gbk/gb2312 - it's a superset and handles 4-byte sequences
      { enc: 'gb18030',   ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F], [0x2000, 0x206F], [0x3400, 0x4DBF], [0x20000, 0x2A6DF]], minCjk: 1, allowReplace: true },
      { enc: 'gbk',       ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]], minCjk: 1, allowReplace: true },
      { enc: 'gb2312',    ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]], minCjk: 1, allowReplace: true },
      { enc: 'big5',      ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]], minCjk: 1, allowReplace: false },
      { enc: 'cp932',     ranges: [[0x3000, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]], minCjk: 1, allowReplace: false },
      { enc: 'cp950',     ranges: [[0x4E00, 0x9FFF], [0x3000, 0x303F]], minCjk: 1, allowReplace: false },
    ];

    let bestEnc = null;
    let bestScore = 0;
    // Track whether GB18030-exclusive chars were found
    let gb18030ExclusiveScore = 0;

    for (const { enc, ranges, minCjk, allowReplace } of dbcsEncodings) {
      if (!iconv.encodingExists(enc)) continue;
      try {
        const decoded = iconv.decode(rawBuf, enc);

        // Count replacement chars (indicates invalid sequences)
        let replacements = 0;
        let cjkChars = 0;
        let highChars = 0;
        let gb18030Exclusive = 0; // chars only in GB18030 extended range
        for (let i = 0; i < decoded.length; i++) {
          const cp = decoded.charCodeAt(i);
          if (cp === 0xFFFD) { replacements++; continue; }
          if (cp > 0x7F) {
            highChars++;
            for (const [lo, hi] of ranges) {
              if (cp >= lo && cp <= hi) { cjkChars++; break; }
            }
            // GB18030-exclusive: Extension B (0x20000-0x2A6DF) and CJK Extension A (0x3400-0x4DBF)
            if (enc === 'gb18030' && (
              (cp >= 0x3400 && cp <= 0x4DBF) ||
              (cp >= 0xF900 && cp <= 0xFAFF) ||
              cp > 0xFFFF
            )) {
              gb18030Exclusive++;
            }
          }
        }

        if (highChars === 0) continue;
        if (!allowReplace && replacements > 0) continue;
        // For allowReplace=true (truncated sequences), still limit to at most 1 replacement
        if (allowReplace && replacements > 1) continue;
        if (cjkChars < minCjk) continue;

        const cjkRatio = cjkChars / highChars;
        if (cjkRatio < 0.65) continue;

        // Roundtrip check
        const reencoded = iconv.encode(decoded, enc);
        let matchBytes = 0;
        const minLen = Math.min(rawBuf.length, reencoded.length);
        for (let i = 0; i < minLen; i++) {
          if (rawBuf[i] === reencoded[i]) matchBytes++;
        }
        const roundtripRatio = matchBytes / rawBuf.length;
        // Length difference penalty
        const lenDiffPenalty = Math.abs(rawBuf.length - reencoded.length) / rawBuf.length;

        const replacementPenalty = 1 - (replacements / (decoded.length || 1));
        let score = roundtripRatio * 0.35 + cjkRatio * 0.45 + replacementPenalty * 0.2 - lenDiffPenalty * 0.1;

        // Bonus for GB18030 exclusive characters
        if (enc === 'gb18030' && gb18030Exclusive > 0) {
          score += 0.15;
          gb18030ExclusiveScore = score;
        }

        // EUC-JP bonus: SS2 prefix (0x8E) is a strong indicator of EUC-JP half-width katakana
        if (enc === 'euc-jp') {
          let ss2Count = 0;
          for (let j = 0; j < rawBuf.length; j++) {
            if (rawBuf[j] === 0x8E) ss2Count++;
          }
          const ss2Ratio = ss2Count / rawBuf.length;
          if (ss2Ratio > 0.2) {
            score += ss2Ratio * 0.3; // Strong bonus for SS2-heavy content
          }
        }

        // CJK encodings require sufficient CJK chars relative to total text to avoid false
        // positives on Western European text (which can sometimes roundtrip through CJK encodings).
        // Real CJK text has CJK chars as a significant fraction of total chars.
        const cjkEncodings = new Set(['gb18030', 'gbk', 'gb2312', 'big5', 'cp950', 'euc-kr', 'cp949', 'shift_jis', 'euc-jp', 'cp932']);
        if (cjkEncodings.has(enc)) {
          // gb18030Exclusive > 2: 至少3个GB18030专属字符才认为是真正的GB18030文本
          // 1-2个可能是偶然命中（如土耳其文字节对碰巧落在CJK Extension A范围）
          if (gb18030Exclusive <= 2) {
            const cjkToTotal = cjkChars / (decoded.length || 1);
            // Short text needs higher CJK ratio threshold to avoid false positives
            const minCjkToTotal = rawBuf.length < 8 ? 0.65 : 0.25;
            if (cjkToTotal < minCjkToTotal) {
              // Not enough CJK chars relative to total text - likely not CJK text
              continue;
            }
          }
          // 对于变长编码（shift_jis/euc-jp/cp932），要求解码后字符数/字节数 < 0.65
          // 真正的日文文本几乎全是双字节字符，字符数/字节数 ≈ 0.5
          // 如果比例太高（> 0.65），说明原始数据主要是单字节编码，被误识别
          if (enc === 'shift_jis' || enc === 'euc-jp' || enc === 'cp932') {
            const charToBytesRatio = decoded.length / rawBuf.length;
            if (charToBytesRatio > 0.65) {
              continue;
            }
          }
          // 泰文字节范围检查：如果原始字节主要在泰文范围(0xA1-0xDB)，则不应该判断为CJK编码
          // 泰文(windows-874/TIS-620)字节范围是0xA1-0xFB，GBK可以将这些字节对解码为汉字
          // 但真正的中文文本字节范围更广（0x81-0xFE），而泰文字节集中在0xA0-0xDF
          if (enc === 'gbk' || enc === 'gb2312' || enc === 'gb18030' || enc === 'euc-jp' || enc === 'euc-kr' || enc === 'cp949') {
            let thaiRangeBytes = 0;
            for (let i = 0; i < rawBuf.length; i++) {
              const b = rawBuf[i];
              if (b >= 0xA1 && b <= 0xDB) thaiRangeBytes++;
            }
            const thaiRangeRatio = thaiRangeBytes / rawBuf.length;
            // 如果超过75%的字节在泰文范围，很可能是泰文而非中文
            if (thaiRangeRatio > 0.75) {
              continue;
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestEnc = enc;
        }
      } catch (e) { continue; }
    }

    if (bestEnc && bestScore > 0.55) {
      // If GB18030-exclusive chars were found, always return gb18030 (not gbk/gb2312)
      if (gb18030ExclusiveScore > 0.55) {
        return { encoding: 'gb18030', confidence: Math.min(gb18030ExclusiveScore, 0.97) };
      }
      // Map cp950 → big5, cp949 → euc-kr for cleaner output
      const encMap = { 'cp950': 'big5', 'cp949': 'euc-kr' };
      const finalEnc = encMap[bestEnc] || bestEnc;
      return { encoding: finalEnc, confidence: Math.min(bestScore, 0.97) };
    }
    return null;
  }

  /**
   * Last-resort detection: try common encodings with iconv-lite roundtrip.
   * Each entry has: encoding name + expected Unicode range hints for scoring.
   */
  _detectByRoundtrip(rawBuf) {
    const fallbacks = [
      // === DOS / OEM code pages ===
      { enc: 'cp437',    lang: null,             ranges: [[0x0080, 0x024F]] },  // US DOS
      { enc: 'cp737',    lang: 'greek',          ranges: [[0x0370, 0x03FF]] },  // Greek DOS
      { enc: 'cp775',    lang: 'baltic',         ranges: [[0x0100, 0x017F]] },  // Baltic DOS
      { enc: 'cp850',    lang: 'western',        ranges: [[0x00C0, 0x024F]] },  // Western Europe DOS
      { enc: 'cp852',    lang: 'central_european', ranges: [[0x0100, 0x017F]] }, // CE DOS
      { enc: 'cp855',    lang: 'cyrillic',       ranges: [[0x0400, 0x04FF]] },  // Cyrillic DOS
      { enc: 'cp857',    lang: 'turkish',        ranges: [[0x00C0, 0x017F]] },  // Turkish DOS
      { enc: 'cp858',    lang: 'western',        ranges: [[0x00C0, 0x024F]] },  // Western Europe + €
      { enc: 'cp860',    lang: 'western',        ranges: [[0x00C0, 0x00FF]] },  // Portuguese DOS
      { enc: 'cp861',    lang: 'western',        ranges: [[0x00C0, 0x00FF]] },  // Icelandic DOS
      { enc: 'cp862',    lang: 'hebrew',         ranges: [[0x0590, 0x05FF]] },  // Hebrew DOS
      { enc: 'cp863',    lang: 'western',        ranges: [[0x00C0, 0x00FF]] },  // Canadian French DOS
      { enc: 'cp864',    lang: 'arabic',         ranges: [[0x0600, 0x06FF]] },  // Arabic DOS
      { enc: 'cp865',    lang: 'nordic',         ranges: [[0x00C0, 0x00FF]] },  // Nordic DOS
      { enc: 'cp866',    lang: 'cyrillic',       ranges: [[0x0400, 0x04FF]] },  // Cyrillic DOS (Russia)
      { enc: 'cp869',    lang: 'greek',          ranges: [[0x0370, 0x03FF]] },  // Greek DOS 2
      { enc: 'cp808',    lang: 'cyrillic',       ranges: [[0x0400, 0x04FF]] },  // Russian + €
      { enc: 'cp720',    lang: 'arabic',         ranges: [[0x0600, 0x06FF]] },  // Arabic DOS

      // === Macintosh encodings ===
      { enc: 'macintosh',   lang: 'western',   ranges: [[0x00C0, 0x024F]] },
      { enc: 'macroman',    lang: 'western',   ranges: [[0x00C0, 0x024F]] },
      { enc: 'macgreek',    lang: 'greek',     ranges: [[0x0370, 0x03FF]] },
      { enc: 'maccyrillic', lang: 'cyrillic',  ranges: [[0x0400, 0x04FF]] },
      { enc: 'maciceland',  lang: 'western',   ranges: [[0x00C0, 0x00FF]] },
      { enc: 'macturkish',  lang: 'turkish',   ranges: [[0x00C0, 0x017F]] },
      { enc: 'maccenteuro', lang: 'central_european', ranges: [[0x0100, 0x017F]] },
      { enc: 'maccroatian', lang: 'central_european', ranges: [[0x0100, 0x017F]] },
      { enc: 'macromania',  lang: 'central_european', ranges: [[0x0100, 0x017F]] },
      { enc: 'macukraine',  lang: 'cyrillic',  ranges: [[0x0400, 0x04FF]] },

      // === Extended ISO-8859 ===
      { enc: 'iso-8859-3',  lang: 'maltese',   ranges: [[0x0100, 0x017F]] },
      { enc: 'iso-8859-4',  lang: 'baltic',    ranges: [[0x0100, 0x017F]] },
      { enc: 'iso-8859-10', lang: 'nordic',    ranges: [[0x00C0, 0x017F]] },
      { enc: 'iso-8859-14', lang: 'celtic',    ranges: [[0x00C0, 0x1EFF]] },
      { enc: 'iso-8859-16', lang: 'south_european', ranges: [[0x00C0, 0x017F]] },

      // === KOI8 variants ===
      { enc: 'koi8-ru', lang: 'cyrillic', ranges: [[0x0400, 0x04FF]] },
      { enc: 'koi8-t',  lang: 'cyrillic', ranges: [[0x0400, 0x04FF]] },

      // === Other single-byte ===
      { enc: 'armscii-8',       lang: 'armenian',   ranges: [[0x0530, 0x058F]] },
      { enc: 'viscii',          lang: 'vietnamese', ranges: [[0x1EA0, 0x1EFF]] },
      { enc: 'tcvn',            lang: 'vietnamese', ranges: [[0x1EA0, 0x1EFF]] },
      { enc: 'rk1048',          lang: 'cyrillic',   ranges: [[0x0400, 0x04FF]] },
      { enc: 'georgian-academy', lang: 'georgian',  ranges: [[0x10A0, 0x10FF]] },
      { enc: 'georgian-ps',      lang: 'georgian',  ranges: [[0x10A0, 0x10FF]] },
      { enc: 'pt154',            lang: 'cyrillic',   ranges: [[0x0400, 0x04FF]] },
      { enc: 'mik',              lang: 'cyrillic',   ranges: [[0x0400, 0x04FF]] },
      { enc: 'cp1124',           lang: 'cyrillic',   ranges: [[0x0400, 0x04FF]] },
      { enc: 'cp1125',           lang: 'cyrillic',   ranges: [[0x0400, 0x04FF]] },
      { enc: 'cp1133',           lang: null,         ranges: [[0x0E80, 0x0EFF]] },  // Lao
      { enc: 'cp1161',           lang: 'thai',       ranges: [[0x0E00, 0x0E7F]] },
      { enc: 'cp1162',           lang: 'thai',       ranges: [[0x0E00, 0x0E7F]] },
      { enc: 'cp1163',           lang: 'vietnamese', ranges: [[0x1EA0, 0x1EFF]] },
      { enc: 'hp-roman8',        lang: 'western',    ranges: [[0x00C0, 0x024F]] },
    ];

    let bestEnc = null;
    let bestScore = -Infinity;

    for (const { enc, lang, ranges } of fallbacks) {
      if (!iconv.encodingExists(enc)) continue;
      try {
        const decoded = iconv.decode(rawBuf, enc);
        // Count replacement characters
        let replacements = 0;
        let langMatch = 0;
        let highChars = 0;
        for (let i = 0; i < decoded.length; i++) {
          const cp = decoded.charCodeAt(i);
          if (cp === 0xFFFD) { replacements++; continue; }
          if (cp > 0x7F) {
            highChars++;
            if (ranges) {
              for (const [lo, hi] of ranges) {
                if (cp >= lo && cp <= hi) { langMatch++; break; }
              }
            }
          }
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
        const langScore = highChars > 0 ? langMatch / highChars : 0.5;
        const score = roundtripRatio * 0.4 + replacementPenalty * 0.3 + langScore * 0.3;

        if (score > bestScore) { bestScore = score; bestEnc = enc; }
      } catch (e) { continue; }
    }

    if (bestEnc && bestScore > 0.5) {
      // Additional guard: require that the decoded text has meaningful lang-range chars
      // This prevents random binary data from being misidentified as some encoding
      try {
        const decoded = iconv.decode(rawBuf, bestEnc);
        let highChars = 0, replacements = 0;
        for (let i = 0; i < decoded.length; i++) {
          const cp = decoded.charCodeAt(i);
          if (cp === 0xFFFD) replacements++;
          else if (cp > 0x7F) highChars++;
        }
        // If more than 5% replacement chars, this encoding is wrong
        if (decoded.length > 0 && replacements / decoded.length > 0.05) {
          return null;
        }
        // If no high chars at all, the data is pure ASCII - shouldn't reach here
        const rawHighBytes = Array.from(rawBuf).filter(b => b >= 0x80).length;
        if (highChars === 0 && rawHighBytes > 0) {
          return null;
        }
      } catch (e) {
        return null;
      }
      return { encoding: bestEnc === 'gb2312' ? 'gbk' : bestEnc, confidence: Math.min(bestScore * 0.85, 0.88) };
    }
    return null;
  }
}

module.exports = UniversalDetector;
