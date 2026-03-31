'use strict';

const Constants = require('../constants');
const CharSetProber = require('./charset-prober');
const CodingStateMachine = require('../coding-state-machine');
const mbcssm = require('../models/mbcssm');
const chardist = require('../models/chardistribution');
const jpcntx = require('../models/jpcntx');

/**
 * EUCJPProber - Probes for EUC-JP encoding with context analysis.
 */
class EUCJPProber extends CharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.EUCJPSMModel);
    this._distributionAnalyzer = new chardist.EUCJPDistributionAnalysis();
    this._contextAnalyzer = new jpcntx.EUCJPContextAnalysis();
    this._lastChar = '\x00\x00';
    this.reset();
  }

  reset() {
    super.reset();
    this._codingSM.reset();
    this._distributionAnalyzer.reset();
    this._contextAnalyzer.reset();
    this._lastChar = '\x00\x00';
  }

  getCharsetName() { return 'EUC-JP'; }

  feed(buf) {
    const aLen = buf.length;
    for (let i = 0; i < aLen; i++) {
      const codingState = this._codingSM.nextState(buf[i]);
      if (codingState === Constants.error) {
        this._state = Constants.notMe;
        break;
      } else if (codingState === Constants.itsMe) {
        this._state = Constants.foundIt;
        break;
      } else if (codingState === Constants.start) {
        const charLen = this._codingSM.getCurrentCharLen();
        if (i === 0) {
          this._lastChar = this._lastChar[0] + buf[0];
          this._contextAnalyzer.feed(this._lastChar, charLen);
          this._distributionAnalyzer.feed(this._lastChar, charLen);
        } else {
          this._contextAnalyzer.feed(buf.slice(i - 1, i + 1), charLen);
          this._distributionAnalyzer.feed(buf.slice(i - 1, i + 1), charLen);
        }
      }
    }

    this._lastChar = buf[aLen - 1] + this._lastChar[1];

    if (this.getState() === Constants.detecting) {
      if (this._contextAnalyzer.gotEnoughData() &&
          this.getConfidence() > Constants.SHORTCUT_THRESHOLD) {
        this._state = Constants.foundIt;
      }
    }

    return this.getState();
  }

  getConfidence() {
    const contxtCf = this._contextAnalyzer.getConfidence();
    const distribCf = this._distributionAnalyzer.getConfidence();
    return Math.max(contxtCf, distribCf);
  }
}

/**
 * SJISProber - Probes for Shift_JIS encoding with context analysis.
 */
class SJISProber extends CharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.SJISSMModel);
    this._distributionAnalyzer = new chardist.SJISDistributionAnalysis();
    this._contextAnalyzer = new jpcntx.SJISContextAnalysis();
    this._lastChar = '\x00\x00';
    this.reset();
  }

  reset() {
    super.reset();
    this._codingSM.reset();
    this._distributionAnalyzer.reset();
    this._contextAnalyzer.reset();
    this._lastChar = '\x00\x00';
  }

  getCharsetName() { return 'SHIFT_JIS'; }

  feed(buf) {
    const aLen = buf.length;
    for (let i = 0; i < aLen; i++) {
      const codingState = this._codingSM.nextState(buf[i]);
      if (codingState === Constants.error) {
        this._state = Constants.notMe;
        break;
      } else if (codingState === Constants.itsMe) {
        this._state = Constants.foundIt;
        break;
      } else if (codingState === Constants.start) {
        const charLen = this._codingSM.getCurrentCharLen();
        if (i === 0) {
          this._lastChar = this._lastChar[0] + buf[0];
          this._contextAnalyzer.feed(this._lastChar.slice(2 - charLen), charLen);
          this._distributionAnalyzer.feed(this._lastChar, charLen);
        } else {
          this._contextAnalyzer.feed(buf.slice(i + 1 - charLen, i + 3 - charLen), charLen);
          this._distributionAnalyzer.feed(buf.slice(i - 1, i + 1), charLen);
        }
      }
    }

    this._lastChar = buf[aLen - 1] + this._lastChar[1];

    if (this.getState() === Constants.detecting) {
      if (this._contextAnalyzer.gotEnoughData() &&
          this.getConfidence() > Constants.SHORTCUT_THRESHOLD) {
        this._state = Constants.foundIt;
      }
    }

    return this.getState();
  }

  getConfidence() {
    const contxtCf = this._contextAnalyzer.getConfidence();
    const distribCf = this._distributionAnalyzer.getConfidence();
    return Math.max(contxtCf, distribCf);
  }
}

module.exports = { EUCJPProber, SJISProber };
