'use strict';

const jschardet = require('..');
const iconv = require('iconv-lite');

describe('jschardet-ultra', () => {

  describe('BOM Detection', () => {
    test('UTF-8 BOM', () => {
      const result = jschardet.detect('\xEF\xBB\xBFHello');
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(1.0);
    });

    test('UTF-16LE BOM', () => {
      const result = jschardet.detect('\xFF\xFEH\x00e\x00l\x00');
      expect(result.encoding).toBe('utf-16le');
      expect(result.confidence).toBe(1.0);
    });

    test('UTF-16BE BOM', () => {
      const result = jschardet.detect('\xFE\xFF\x00H\x00e\x00l');
      expect(result.encoding).toBe('utf-16be');
      expect(result.confidence).toBe(1.0);
    });

    test('UTF-32LE BOM', () => {
      const result = jschardet.detect('\xFF\xFE\x00\x00Hello');
      expect(result.encoding).toBe('utf-32le');
      expect(result.confidence).toBe(1.0);
    });

    test('UTF-32BE BOM', () => {
      const result = jschardet.detect('\x00\x00\xFE\xFFHello');
      expect(result.encoding).toBe('utf-32be');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('ASCII', () => {
    test('pure ASCII text', () => {
      const result = jschardet.detect('Hello World! 12345');
      expect(result.encoding).toBe('ascii');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('UTF-8 (no BOM)', () => {
    test('Chinese UTF-8', () => {
      const buf = iconv.encode('情人节为每年的2月14日', 'utf-8');
      const result = jschardet.detect(buf);
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('CJK Multi-byte Encodings', () => {
    test('GB2312', () => {
      const buf = iconv.encode('情人节为每年的2月14日，是西方的传统节日之一。', 'gb2312');
      const result = jschardet.detect(buf);
      expect(['gb2312', 'gbk', 'gb18030']).toContain(result.encoding);
    });

    test('Big5', () => {
      const buf = iconv.encode('次常用國字標準字體表', 'big5');
      const result = jschardet.detect(buf);
      expect(['big5', 'cp950']).toContain(result.encoding);
    });

    test('Shift_JIS', () => {
      const buf = iconv.encode('ウィキペディアはオープンコンテントの百科事典です', 'shift_jis');
      const result = jschardet.detect(buf);
      expect(['shift_jis', 'cp932']).toContain(result.encoding);
    });

    test('EUC-JP', () => {
      const buf = iconv.encode('ウィキペディアはオープンコンテントの百科事典です', 'euc-jp');
      const result = jschardet.detect(buf);
      expect(result.encoding).toBe('euc-jp');
    });

    test('EUC-KR', () => {
      const buf = iconv.encode('화성 기후 탐사선 마스 클라이미트 오비터', 'euc-kr');
      const result = jschardet.detect(buf);
      expect(['euc-kr', 'cp949']).toContain(result.encoding);
    });
  });

  describe('Windows Code Pages', () => {
    test('windows-1251 (Cyrillic)', () => {
      const buf = iconv.encode('Википедия — свободная энциклопедия, которую может редактировать каждый.', 'windows-1251');
      const result = jschardet.detect(buf);
      expect(['windows-1251', 'koi8-r', 'iso-8859-5']).toContain(result.encoding);
    });

    test('windows-1252 (Western)', () => {
      const buf = iconv.encode('Le café est une boisson préparée à partir des graines torréfiées.', 'windows-1252');
      const result = jschardet.detect(buf);
      expect(['windows-1252', 'iso-8859-1', 'iso-8859-15']).toContain(result.encoding);
    });

    test('windows-1253 (Greek)', () => {
      const buf = iconv.encode('Η Βικιπαίδεια είναι ελεύθερη εγκυκλοπαίδεια', 'windows-1253');
      const result = jschardet.detect(buf);
      expect(['windows-1253', 'iso-8859-7']).toContain(result.encoding);
    });
  });

  describe('API', () => {
    test('detect returns encoding and confidence', () => {
      const result = jschardet.detect('Hello');
      expect(result).toHaveProperty('encoding');
      expect(result).toHaveProperty('confidence');
    });

    test('detect with Buffer input', () => {
      const buf = Buffer.from('Hello World', 'ascii');
      const result = jschardet.detect(buf);
      expect(result.encoding).toBe('ascii');
    });

    test('detect with empty input', () => {
      const result = jschardet.detect('');
      expect(result.encoding).toBeNull();
    });

    test('VERSION exists', () => {
      expect(jschardet.VERSION).toBe('2.1.0');
    });

    test('encodingExists works', () => {
      expect(jschardet.encodingExists('utf-8')).toBe(true);
      expect(jschardet.encodingExists('windows-1251')).toBe(true);
    });
  });
});
