'use strict';

const UniversalDetector = require('./universal-detector');
const { normalizeEncoding, ENCODING_ALIASES } = require('./encoding-aliases');
const iconv = require('iconv-lite');

const VERSION = '2.0.0';

/**
 * Detect the encoding of a Buffer or binary string.
 *
 * @param {Buffer|string} input - The input data to detect
 * @returns {{ encoding: string|null, confidence: number }} Detection result
 */
function detect(input) {
  if (!input || (Buffer.isBuffer(input) && input.length === 0) ||
      (typeof input === 'string' && input.length === 0)) {
    return { encoding: null, confidence: 0 };
  }

  const detector = new UniversalDetector();
  detector.reset();
  detector.feed(input);
  detector.close();
  return detector.result;
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
    'gb2312': ['gbk', 'gb18030', 'cp936'],
    'gbk': ['gb2312', 'gb18030', 'cp936'],
    'gb18030': ['gb2312', 'gbk', 'cp936'],
    'big5': ['cp950'],
    'cp950': ['big5'],
    'shift_jis': ['cp932'],
    'cp932': ['shift_jis'],
    'euc-kr': ['cp949'],
    'cp949': ['euc-kr'],
    'windows-1252': ['iso-8859-1', 'iso-8859-15'],
    'iso-8859-1': ['windows-1252', 'iso-8859-15'],
    'windows-1251': ['koi8-r', 'iso-8859-5', 'cp866'],
    'koi8-r': ['windows-1251', 'iso-8859-5', 'koi8-u'],
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
