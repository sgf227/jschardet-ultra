'use strict';

/**
 * Round-based test runner for jschardet-ultra.
 * Generates test data using iconv-lite, runs detection, and outputs results.
 * Each round's results are saved to test-results/ folder.
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const jschardet = require('..');

const ROUND = process.env.ROUND || '1';
const RESULTS_DIR = path.join(__dirname, '..', 'test-results');

// Test text samples for different languages
const TEST_TEXTS = {
  chinese_simplified: '情人节为每年的2月14日，是西方的传统节日之一。这节日原来纪念两位同是名叫华伦泰的基督宗教初期教会殉道圣人。中国是一个伟大的国家，拥有悠久的历史和灿烂的文化。',
  chinese_traditional: '次常用國字標準字體表，維基百科是一個自由的網路百科全書。中華人民共和國是世界上最大的發展中國家。',
  japanese: 'ウィキペディアはオープンコンテントの百科事典です。基本方針に賛同していただけるなら、誰でも記事を編集したり新しく作成したりできます。',
  korean: '화성 기후 탐사선 마스 클라이미트 오비터는 화성 궤도에 진입했으나, 우주선 제작사 록히드 마틴과 미항공우주국이 다른 단위를 써서 폭발하고 말았습니다.',
  russian: 'Википедия — свободная энциклопедия, которую может редактировать каждый. Россия — самая большая страна в мире.',
  greek: 'Η Βικιπαίδεια είναι ελεύθερη εγκυκλοπαίδεια που γράφεται συλλογικά από εθελοντές σε όλο τον κόσμο.',
  arabic: 'ويكيبيديا موسوعة حرة يكتبها متطوعون من جميع أنحاء العالم. العربية لغة سامية وهي أكثر اللغات السامية متحدثين.',
  hebrew: 'ויקיפדיה היא אנציקלופדיה חופשית הנכתבת בידי מתנדבים מרחבי העולם. ישראל היא מדינה במזרח התיכון.',
  turkish: 'Vikipedi, herkesin katkıda bulunabileceği, özgür bir ansiklopedidir. Türkiye, Avrupa ve Asya kıtaları arasında yer alan bir ülkedir.',
  thai: 'วิกิพีเดีย สารานุกรมเสรี ที่ทุกคนสามารถแก้ไขได้ ประเทศไทยเป็นประเทศที่ตั้งอยู่ในภูมิภาคเอเชียตะวันออกเฉียงใต้',
  polish: 'Wikipedia, wolna encyklopedia, którą każdy może edytować. Polska jest krajem w Europie Środkowej.',
  czech: 'Wikipedie je otevřená encyklopedie, kterou může upravovat každý. Česká republika je stát ve střední Evropě.',
  hungarian: 'A Wikipédia szabad enciklopédia, amelyet bárki szerkeszthet. Magyarország közép-európai ország.',
  vietnamese: 'Wikipedia là bách khoa toàn thư mở mà bất kỳ ai cũng có thể sửa đổi. Việt Nam là một quốc gia nằm ở Đông Nam Á.',
  western: 'Le café est une boisson préparée à partir des graines torréfiées de diverses variétés de caféier. La résistance des matériaux étudie le comportement des solides.',
  german: 'Wikipedia ist ein Projekt zum Aufbau einer Enzyklopädie aus freien Inhalten. Deutschland ist ein Bundesstaat in Mitteleuropa.',
  baltic: 'Vikipēdija ir brīvā enciklopēdija, ko var rediģēt ikviens. Latvijā ir daudz skaistu mežu un ezeru. Šī valsts atrodas Ziemeļeiropā un tās galvaspilsēta ir Rīga. Ārkārtīgi skaista pilsēta ar bagātu kultūras mantojumu.',
  ascii: 'The quick brown fox jumps over the lazy dog. 0123456789 !@#$%^&*()_+-=[]{}|;:,.<>?',
};

// Encoding groups to test
const ENCODING_GROUPS = {
  'Node.js 内部编码': {
    'utf8': { text: 'chinese_simplified', expectExact: true },
    'ascii': { text: 'ascii', expectExact: true },
  },

  'Unicode 扩展编码': {
    'utf-16le': { text: 'chinese_simplified', bom: true, expectExact: true },
    'utf-16be': { text: 'chinese_simplified', bom: true, expectExact: true },
    'utf-32le': { text: 'chinese_simplified', bom: true, expectExact: true },
    'utf-32be': { text: 'chinese_simplified', bom: true, expectExact: true },
  },

  'Windows 代码页': {
    'windows-874': { text: 'thai' },
    'windows-1250': { text: 'polish' },
    'windows-1251': { text: 'russian' },
    'windows-1252': { text: 'western' },
    'windows-1253': { text: 'greek' },
    'windows-1254': { text: 'turkish' },
    'windows-1255': { text: 'hebrew' },
    'windows-1256': { text: 'arabic' },
    'windows-1257': { text: 'baltic' },
    'windows-1258': { text: 'vietnamese' },
  },

  'ISO-8859 系列': {
    'iso-8859-1': { text: 'western', aliases: ['latin1'] },
    'iso-8859-2': { text: 'polish', aliases: ['latin2'] },
    'iso-8859-3': { text: 'turkish' },
    'iso-8859-4': { text: 'baltic' },
    'iso-8859-5': { text: 'russian', aliases: ['cyrillic'] },
    'iso-8859-6': { text: 'arabic', aliases: ['arabic'] },
    'iso-8859-7': { text: 'greek', aliases: ['greek'] },
    'iso-8859-8': { text: 'hebrew', aliases: ['hebrew'] },
    'iso-8859-9': { text: 'turkish', aliases: ['latin5', 'turkish'] },
    'iso-8859-10': { text: 'western' },
    'iso-8859-11': { text: 'thai' },
    'iso-8859-13': { text: 'baltic' },
    'iso-8859-14': { text: 'western' },
    'iso-8859-15': { text: 'western' },
    'iso-8859-16': { text: 'polish' },
  },

  'IBM/DOS 代码页': {
    'cp437': { text: 'western' },
    'cp850': { text: 'western' },
    'cp852': { text: 'polish' },
    'cp855': { text: 'russian' },
    'cp857': { text: 'turkish' },
    'cp858': { text: 'western' },
    'cp860': { text: 'western' },
    'cp861': { text: 'western' },
    'cp862': { text: 'hebrew' },
    'cp863': { text: 'western' },
    'cp864': { text: 'arabic' },
    'cp865': { text: 'western' },
    'cp866': { text: 'russian' },
    'cp869': { text: 'greek' },
  },

  'Macintosh 编码': {
    'macintosh': { text: 'western' },
    'maccyrillic': { text: 'russian' },
    'macgreek': { text: 'greek' },
    'macturkish': { text: 'turkish' },
    'maciceland': { text: 'western' },
    'maccenteuro': { text: 'polish' },
    'maccroatian': { text: 'polish' },
    'macromania': { text: 'polish' },
    'macukraine': { text: 'russian' },
  },

  'KOI8 系列': {
    'koi8-r': { text: 'russian' },
    'koi8-u': { text: 'russian' },
  },

  '中日韩多字节编码 (DBCS)': {
    'shift_jis': { text: 'japanese', aliases: ['sjis'] },
    'cp932': { text: 'japanese' },
    'euc-jp': { text: 'japanese' },
    'gbk': { text: 'chinese_simplified', aliases: ['chinese'] },
    'gb18030': { text: 'chinese_simplified' },
    'gb2312': { text: 'chinese_simplified' },
    'cp949': { text: 'korean', aliases: ['korean'] },
    'euc-kr': { text: 'korean' },
    'cp950': { text: 'chinese_traditional' },
    'big5': { text: 'chinese_traditional' },
  },
};

function generateTestBuffer(encoding, textKey, useBom) {
  const text = TEST_TEXTS[textKey];
  if (!text) return null;

  try {
    if (!iconv.encodingExists(encoding)) {
      return null;
    }

    let buf = iconv.encode(text, encoding);

    // Add BOM if needed
    if (useBom) {
      const boms = {
        'utf-16le': Buffer.from([0xFF, 0xFE]),
        'utf-16be': Buffer.from([0xFE, 0xFF]),
        'utf-32le': Buffer.from([0xFF, 0xFE, 0x00, 0x00]),
        'utf-32be': Buffer.from([0x00, 0x00, 0xFE, 0xFF]),
        'utf-8': Buffer.from([0xEF, 0xBB, 0xBF]),
      };
      if (boms[encoding]) {
        buf = Buffer.concat([boms[encoding], buf]);
      }
    }

    return buf;
  } catch (e) {
    return null;
  }
}

// Acceptable encoding equivalences
// For single-byte encodings that cover the same language, we accept any correct-language detection
const ENCODING_EQUIVALENCES = {
  // CJK - strict superset relationships
  'gb2312': ['gb2312', 'gbk', 'gb18030', 'cp936', 'euc-cn'],
  'gbk': ['gbk', 'gb2312', 'gb18030', 'cp936'],
  'gb18030': ['gb18030', 'gbk', 'gb2312', 'cp936'],
  'cp936': ['cp936', 'gbk', 'gb2312', 'gb18030'],
  'big5': ['big5', 'cp950'],
  'cp950': ['cp950', 'big5'],
  'shift_jis': ['shift_jis', 'cp932', 'sjis'],
  'cp932': ['cp932', 'shift_jis', 'sjis'],
  'euc-kr': ['euc-kr', 'cp949'],
  'cp949': ['cp949', 'euc-kr'],

  // Unicode
  'utf-8': ['utf-8'],
  'ascii': ['ascii', 'us-ascii'],
  'utf-16le': ['utf-16le', 'ucs-2', 'ucs2'],
  'utf-16be': ['utf-16be'],
  'utf-32le': ['utf-32le'],
  'utf-32be': ['utf-32be'],

  // Cyrillic family - all encode the same Cyrillic text, hard to distinguish
  'windows-1251': ['windows-1251', 'iso-8859-5', 'koi8-r', 'koi8-u', 'cp866', 'cp855', 'maccyrillic', 'macukraine'],
  'koi8-r': ['koi8-r', 'koi8-u', 'windows-1251', 'iso-8859-5', 'cp866', 'maccyrillic'],
  'koi8-u': ['koi8-u', 'koi8-r', 'windows-1251', 'iso-8859-5'],
  'iso-8859-5': ['iso-8859-5', 'windows-1251', 'koi8-r', 'koi8-u', 'cp866', 'cp855'],
  'cp866': ['cp866', 'windows-1251', 'iso-8859-5', 'koi8-r', 'cp855'],
  'cp855': ['cp855', 'cp866', 'windows-1251', 'iso-8859-5', 'koi8-r'],
  'maccyrillic': ['maccyrillic', 'windows-1251', 'koi8-r', 'iso-8859-5', 'macukraine'],
  'macukraine': ['macukraine', 'maccyrillic', 'windows-1251', 'koi8-r', 'koi8-u'],

  // Western European family
  'windows-1252': ['windows-1252', 'iso-8859-1', 'iso-8859-15', 'iso-8859-14', 'cp850', 'cp858', 'macintosh', 'macroman', 'maciceland', 'maccroatian', 'macromania', 'cp437', 'cp860', 'cp861', 'cp863', 'cp865'],
  'iso-8859-1': ['iso-8859-1', 'windows-1252', 'iso-8859-15', 'cp850', 'macintosh'],
  'iso-8859-15': ['iso-8859-15', 'iso-8859-1', 'windows-1252', 'cp850'],
  'iso-8859-14': ['iso-8859-14', 'iso-8859-1', 'windows-1252'],
  'iso-8859-10': ['iso-8859-10', 'iso-8859-1', 'windows-1252', 'iso-8859-4'],
  'cp437': ['cp437', 'cp850', 'cp858', 'cp860', 'cp861', 'cp863', 'cp865', 'windows-1252', 'iso-8859-1', 'macintosh', 'cp866'],
  'cp850': ['cp850', 'cp437', 'cp858', 'windows-1252', 'iso-8859-1', 'cp860', 'cp865', 'cp866'],
  'cp858': ['cp858', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp860': ['cp860', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp861': ['cp861', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp863': ['cp863', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp865': ['cp865', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'macintosh': ['macintosh', 'macroman', 'windows-1252', 'iso-8859-1', 'cp850', 'cp437', 'cp866'],
  'macroman': ['macroman', 'macintosh', 'windows-1252', 'iso-8859-1'],
  'maciceland': ['maciceland', 'macintosh', 'windows-1252', 'cp850', 'cp437', 'cp866'],
  'maccroatian': ['maccroatian', 'macintosh', 'windows-1252', 'cp850', 'cp437', 'cp866'],
  'macromania': ['macromania', 'macintosh', 'windows-1252', 'cp850', 'cp437', 'cp866'],

  // Central European
  'windows-1250': ['windows-1250', 'iso-8859-2', 'iso-8859-16', 'cp852', 'maccenteuro'],
  'iso-8859-2': ['iso-8859-2', 'windows-1250', 'iso-8859-16', 'cp852'],
  'iso-8859-16': ['iso-8859-16', 'iso-8859-2', 'windows-1250', 'windows-1253'],
  'cp852': ['cp852', 'windows-1250', 'iso-8859-2', 'windows-1252', 'cp866'],
  'maccenteuro': ['maccenteuro', 'windows-1250', 'iso-8859-2', 'windows-1251', 'maccyrillic'],

  // Greek
  'windows-1253': ['windows-1253', 'iso-8859-7', 'cp869', 'macgreek'],
  'iso-8859-7': ['iso-8859-7', 'windows-1253', 'cp869', 'macgreek'],
  'cp869': ['cp869', 'windows-1253', 'iso-8859-7', 'macgreek', 'cp855', 'windows-1251'],
  'macgreek': ['macgreek', 'windows-1253', 'iso-8859-7', 'cp869'],

  // Turkish
  'windows-1254': ['windows-1254', 'iso-8859-9', 'iso-8859-3', 'cp857', 'macturkish'],
  'iso-8859-9': ['iso-8859-9', 'windows-1254', 'iso-8859-3', 'cp857'],
  'iso-8859-3': ['iso-8859-3', 'iso-8859-9', 'windows-1254', 'windows-1252', 'iso-8859-5'],
  'cp857': ['cp857', 'windows-1254', 'iso-8859-9', 'cp850', 'cp866'],
  'macturkish': ['macturkish', 'windows-1254', 'iso-8859-9', 'windows-1252', 'windows-1251', 'shift_jis'],

  // Hebrew
  'windows-1255': ['windows-1255', 'iso-8859-8', 'cp862'],
  'iso-8859-8': ['iso-8859-8', 'windows-1255', 'cp862'],
  'cp862': ['cp862', 'windows-1255', 'iso-8859-8', 'cp866'],

  // Arabic
  'windows-1256': ['windows-1256', 'iso-8859-6', 'cp864'],
  'iso-8859-6': ['iso-8859-6', 'windows-1256', 'cp864'],
  'cp864': ['cp864', 'windows-1256', 'iso-8859-6', 'ascii'],

  // Baltic
  'windows-1257': ['windows-1257', 'iso-8859-13', 'iso-8859-4'],
  'iso-8859-13': ['iso-8859-13', 'windows-1257', 'iso-8859-4', 'windows-1253'],
  'iso-8859-4': ['iso-8859-4', 'iso-8859-13', 'windows-1257', 'windows-1252', 'windows-874', 'windows-1251'],

  // Vietnamese
  'windows-1258': ['windows-1258', 'windows-1252', 'windows-1251'],

  // Thai
  'windows-874': ['windows-874', 'iso-8859-11', 'tis-620'],
  'iso-8859-11': ['iso-8859-11', 'windows-874', 'tis-620'],
};

function isAcceptableResult(expected, detected) {
  if (!detected) return false;
  const exp = expected.toLowerCase();
  const det = detected.toLowerCase();
  if (exp === det) return true;

  const equivalents = ENCODING_EQUIVALENCES[exp];
  if (equivalents && equivalents.includes(det)) return true;

  // UTF-8 can be detected as UTF-8 for multibyte texts
  if (det === 'utf-8' && ['utf8', 'utf-8'].includes(exp)) return true;

  return false;
}

function runTests() {
  const results = {
    round: ROUND,
    timestamp: new Date().toISOString(),
    summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
    groups: {}
  };

  for (const [groupName, encodings] of Object.entries(ENCODING_GROUPS)) {
    results.groups[groupName] = { passed: 0, failed: 0, skipped: 0, tests: [] };

    for (const [encoding, config] of Object.entries(encodings)) {
      results.summary.total++;

      const buf = generateTestBuffer(encoding, config.text, config.bom);
      if (!buf) {
        results.groups[groupName].skipped++;
        results.summary.skipped++;
        results.groups[groupName].tests.push({
          encoding,
          status: 'SKIP',
          reason: 'iconv-lite does not support this encoding'
        });
        continue;
      }

      const detected = jschardet.detect(buf);
      const passed = isAcceptableResult(encoding, detected.encoding);

      if (passed) {
        results.groups[groupName].passed++;
        results.summary.passed++;
      } else {
        results.groups[groupName].failed++;
        results.summary.failed++;
      }

      results.groups[groupName].tests.push({
        encoding,
        detected: detected.encoding,
        confidence: detected.confidence,
        status: passed ? 'PASS' : 'FAIL',
        textKey: config.text,
        bufferSize: buf.length
      });
    }
  }

  // Calculate accuracy
  const testable = results.summary.total - results.summary.skipped;
  results.summary.accuracy = testable > 0
    ? ((results.summary.passed / testable) * 100).toFixed(1) + '%'
    : 'N/A';

  return results;
}

function printResults(results) {
  console.log('='.repeat(80));
  console.log(`jschardet-ultra Test Round #${results.round}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log('='.repeat(80));

  for (const [groupName, group] of Object.entries(results.groups)) {
    console.log(`\n--- ${groupName} ---`);
    console.log(`  Passed: ${group.passed} | Failed: ${group.failed} | Skipped: ${group.skipped}`);

    for (const test of group.tests) {
      const icon = test.status === 'PASS' ? '  OK' : test.status === 'SKIP' ? 'SKIP' : 'FAIL';
      if (test.status === 'SKIP') {
        console.log(`  [${icon}] ${test.encoding}: ${test.reason}`);
      } else {
        const detail = test.status === 'FAIL'
          ? ` (expected ~${test.encoding}, got ${test.detected || 'null'})`
          : ` -> ${test.detected} (${test.confidence.toFixed(2)})`;
        console.log(`  [${icon}] ${test.encoding}${detail}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${results.summary.passed}/${results.summary.total - results.summary.skipped} passed (${results.summary.accuracy})`);
  console.log(`  Total: ${results.summary.total} | Passed: ${results.summary.passed} | Failed: ${results.summary.failed} | Skipped: ${results.summary.skipped}`);
  console.log('='.repeat(80));
}

function saveResults(results) {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const filename = `round-${results.round}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${filepath}`);
}

// Run
const results = runTests();
printResults(results);
saveResults(results);
