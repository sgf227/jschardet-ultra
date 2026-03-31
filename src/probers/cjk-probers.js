'use strict';

const MultiByteCharSetProber = require('./mb-charset-prober');
const CodingStateMachine = require('../coding-state-machine');
const mbcssm = require('../models/mbcssm');
const chardist = require('../models/chardistribution');

class Big5Prober extends MultiByteCharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.Big5SMModel);
    this._distributionAnalyzer = new chardist.Big5DistributionAnalysis();
    this.reset();
  }
  getCharsetName() { return 'Big5'; }
}

class GB2312Prober extends MultiByteCharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.GB2312SMModel);
    this._distributionAnalyzer = new chardist.GB2312DistributionAnalysis();
    this.reset();
  }
  getCharsetName() { return 'GB2312'; }
}

class EUCKRProber extends MultiByteCharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.EUCKRSMModel);
    this._distributionAnalyzer = new chardist.EUCKRDistributionAnalysis();
    this.reset();
  }
  getCharsetName() { return 'EUC-KR'; }
}

class EUCTWProber extends MultiByteCharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.EUCTWSMModel);
    this._distributionAnalyzer = new chardist.EUCTWDistributionAnalysis();
    this.reset();
  }
  getCharsetName() { return 'EUC-TW'; }
}

module.exports = { Big5Prober, GB2312Prober, EUCKRProber, EUCTWProber };
