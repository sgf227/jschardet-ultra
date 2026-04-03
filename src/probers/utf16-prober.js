'use strict';

const Constants = require('../constants');
const CharSetProber = require('./charset-prober');

/**
 * UTF16Prober - Detects UTF-16 LE/BE without BOM.
 *
 * Strategy:
 *  - UTF-16LE: even-position bytes have many NULs (for ASCII-dominant text)
 *    OR many bytes fall in common Unicode ranges with the right structure.
 *  - UTF-16BE: odd-position bytes have many NULs.
 *  - We also check for consistent 2-byte pair patterns.
 */
class UTF16Prober extends CharSetProber {
  constructor() {
    super();
    this._leNulCount = 0;
    this._beNulCount = 0;
    this._totalPairs = 0;
    this._leHighByteVariety = new Set();
    this._beHighByteVariety = new Set();
    this._detectedEncoding = null;
  }

  reset() {
    super.reset();
    this._leNulCount = 0;
    this._beNulCount = 0;
    this._totalPairs = 0;
    this._leHighByteVariety = new Set();
    this._beHighByteVariety = new Set();
    this._detectedEncoding = null;
  }

  getCharsetName() {
    return this._detectedEncoding || 'UTF-16LE';
  }

  feed(buf) {
    // Need at least 8 bytes to make a decision
    const len = buf.length;
    if (len < 8) return this.getState();

    // Analyze pairs: assume UTF-16LE (byte0=low, byte1=high) or UTF-16BE (byte0=high, byte1=low)
    const pairs = Math.floor(len / 2);
    let leNuls = 0, beNuls = 0;
    let leHighSum = 0, beHighSum = 0;
    let leValidPairs = 0, beValidPairs = 0;

    for (let i = 0; i + 1 < len; i += 2) {
      const b0 = typeof buf[i] === 'number' ? buf[i] : buf.charCodeAt(i);
      const b1 = typeof buf[i + 1] === 'number' ? buf[i + 1] : buf.charCodeAt(i + 1);

      // UTF-16LE interpretation: code unit = b1 * 256 + b0
      // UTF-16BE interpretation: code unit = b0 * 256 + b1

      // For UTF-16LE: if b1 (high byte) is 0, this is a BMP char < 0x100
      if (b1 === 0) leNuls++;
      else leHighSum += b1;

      // For UTF-16BE: if b0 (high byte) is 0, this is a BMP char < 0x100
      if (b0 === 0) beNuls++;
      else beHighSum += b0;

      // Check plausibility: for LE, b0 should be a printable ASCII or common char
      // For BE, b1 should be in similar range
      const leCp = b1 * 256 + b0;
      const beCp = b0 * 256 + b1;

      if (this._isValidUnicode(leCp)) leValidPairs++;
      if (this._isValidUnicode(beCp)) beValidPairs++;
    }

    this._totalPairs = pairs;
    this._leNulCount = leNuls;
    this._beNulCount = beNuls;

    // Heuristic: a high NUL ratio in one byte position strongly suggests UTF-16
    const leNulRatio = leNuls / pairs;
    const beNulRatio = beNuls / pairs;

    // Threshold: >50% NULs in alternating bytes = very likely UTF-16
    // But also ensure we're not just looking at binary data
    if (leNulRatio > 0.5 && leNulRatio > beNulRatio * 1.5) {
      this._detectedEncoding = 'UTF-16LE';
      // Only claim foundIt if very high confidence
      if (leNulRatio > 0.7 && leValidPairs / pairs > 0.8) {
        this._state = Constants.foundIt;
      }
    } else if (beNulRatio > 0.5 && beNulRatio > leNulRatio * 1.5) {
      this._detectedEncoding = 'UTF-16BE';
      if (beNulRatio > 0.7 && beValidPairs / pairs > 0.8) {
        this._state = Constants.foundIt;
      }
    } else {
      // Not UTF-16 without BOM - need stronger evidence
      this._state = Constants.notMe;
    }

    return this.getState();
  }

  _isValidUnicode(cp) {
    // Check if code point is in a plausible Unicode range (not a surrogate, not in private use area)
    if (cp === 0) return true; // NUL is valid
    if (cp < 0x0020 && cp !== 0x0009 && cp !== 0x000A && cp !== 0x000D) return false;
    if (cp >= 0xD800 && cp <= 0xDFFF) return false; // surrogates
    if (cp >= 0xFFF0 && cp <= 0xFFFF) return false; // specials
    return true;
  }

  getConfidence() {
    if (this._state === Constants.foundIt) return 0.85;
    if (this._state === Constants.notMe) return 0.01;

    const pairs = this._totalPairs;
    if (pairs === 0) return 0;

    const leRatio = this._leNulCount / pairs;
    const beRatio = this._beNulCount / pairs;

    if (this._detectedEncoding === 'UTF-16LE') return Math.min(leRatio * 0.9, 0.85);
    if (this._detectedEncoding === 'UTF-16BE') return Math.min(beRatio * 0.9, 0.85);
    return 0;
  }
}

module.exports = UTF16Prober;
