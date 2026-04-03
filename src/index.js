'use strict';

const UniversalDetector = require('./universal-detector');
const { normalizeEncoding, ENCODING_ALIASES } = require('./encoding-aliases');
const iconv = require('iconv-lite');

const VERSION = '2.1.0';

/**
 * Detect the encoding of a Buffer or binary string.
 *
 * @param {Buffer|string} input - The input data to detect
 * @returns {{ encoding: string|null, confidence: number }} Detection result
 */
function detect(input) {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return { encoding: null, confidence: 0 };
  }
  // Handle empty inputs
  if (Buffer.isBuffer(input) && input.length === 0) {
    return { encoding: null, confidence: 0 };
  }
  if (typeof input === 'string' && input.length === 0) {
    return { encoding: null, confidence: 0 };
  }
  // Convert number arrays to Buffer
  if (Array.isArray(input)) {
    input = Buffer.from(input);
  }

  const detector = new UniversalDetector();
  detector.reset();
  detector.feed(input);
  detector.close();
  return detector.result || { encoding: null, confidence: 0 };
}

/**
 * Detect encoding with all candidates and their confidence levels.
 *
 * @param {Buffer|string} input - The input data to detect
 * @returns {Array<{ encoding: string, confidence: number }>} Sorted array of candidates
 */
function detectAll(input) {
  const primary = detect(input);
  if (!primary.encoding) return [];

  const results = [primary];

  // If confidence is not very high, also try iconv-lite validation on alternatives
  if (primary.confidence < 0.99 && Buffer.isBuffer(input)) {
    const alternatives = _getAlternatives(primary.encoding);
    for (const alt of alternatives) {
      if (iconv.encodingExists(alt)) {
        try {
          const decoded = iconv.decode(input, alt);
          const reencoded = iconv.encode(decoded, alt);
          // Roundtrip check
          if (Buffer.compare(input, reencoded) === 0) {
            results.push({ encoding: alt, confidence: primary.confidence * 0.8 });
          }
        } catch (e) {
          // skip
        }
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get alternative encoding candidates for a detected encoding.
 */
function _getAlternatives(encoding) {
  const groups = {
    // Chinese
    'gb2312':    ['gbk', 'gb18030', 'cp936'],
    'gbk':       ['gb2312', 'gb18030', 'cp936'],
    'gb18030':   ['gb2312', 'gbk', 'cp936'],
    'cp936':     ['gbk', 'gb2312', 'gb18030'],
    'big5':      ['cp950', 'big5-hkscs'],
    'cp950':     ['big5'],
    // Japanese
    'shift_jis': ['cp932', 'euc-jp'],
    'cp932':     ['shift_jis', 'euc-jp'],
    'euc-jp':    ['shift_jis', 'cp932'],
    // Korean
    'euc-kr':    ['cp949'],
    'cp949':     ['euc-kr'],
    // Cyrillic
    'windows-1251': ['koi8-r', 'iso-8859-5', 'cp866', 'koi8-u'],
    'koi8-r':    ['windows-1251', 'iso-8859-5', 'koi8-u', 'cp866'],
    'koi8-u':    ['windows-1251', 'koi8-r', 'iso-8859-5'],
    'iso-8859-5': ['windows-1251', 'koi8-r', 'cp866'],
    'cp866':     ['windows-1251', 'koi8-r', 'iso-8859-5'],
    // Western
    'windows-1252': ['iso-8859-1', 'iso-8859-15'],
    'iso-8859-1':   ['windows-1252', 'iso-8859-15'],
    'iso-8859-15':  ['iso-8859-1', 'windows-1252'],
    // Central European
    'windows-1250': ['iso-8859-2'],
    'iso-8859-2':   ['windows-1250'],
    // Greek
    'windows-1253': ['iso-8859-7'],
    'iso-8859-7':   ['windows-1253'],
    // Turkish
    'windows-1254': ['iso-8859-9'],
    'iso-8859-9':   ['windows-1254'],
    // Hebrew
    'windows-1255': ['iso-8859-8'],
    'iso-8859-8':   ['windows-1255'],
    // Arabic
    'windows-1256': ['iso-8859-6'],
    'iso-8859-6':   ['windows-1256'],
    // Baltic
    'windows-1257': ['iso-8859-13', 'iso-8859-4'],
    'iso-8859-13':  ['windows-1257', 'iso-8859-4'],
    // Thai
    'windows-874':  ['iso-8859-11'],
    'iso-8859-11':  ['windows-874'],
    // Vietnamese
    'windows-1258': ['viscii', 'tcvn'],
    'viscii':       ['windows-1258', 'tcvn'],
  };
  return groups[encoding] || [];
}

/**
 * Check if an encoding is supported by this library.
 */
function encodingExists(encoding) {
  const normalized = normalizeEncoding(encoding);
  return iconv.encodingExists(normalized);
}

module.exports = {
  VERSION,
  detect,
  detectAll,
  encodingExists,
  normalizeEncoding,
  UniversalDetector,
  Constants: require('./constants'),
  ENCODING_ALIASES
};
