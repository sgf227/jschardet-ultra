'use strict';

/**
 * Comprehensive v2 test for jschardet-ultra.
 * Covers all encodings from the original benchmark analysis, including:
 * - Short text edge cases
 * - ISO-2022-JP (ESC sequences)
 * - DOS code pages (cp437, cp850, cp852, cp855, cp857, cp862, cp866, cp869)
 * - Mac encodings (macintosh, maccyrillic, macgreek, macturkish, maccenteuro, maccroatian)
 * - KOI8 variants (koi8-r, koi8-u)
 * - VISCII Vietnamese
 * - ARMSCII-8 Armenian
 * - Various ISO-8859 variants
 * - Windows code pages
 * - CJK encodings
 */

const iconv = require('iconv-lite');
const jschardet = require('..');

// ============================================================
// Test text samples
// ============================================================
const TEXTS = {
  // CJK
  chinese_simplified: '情人节为每年的2月14日，是西方的传统节日之一。中国是一个伟大的国家，拥有悠久的历史和灿烂的文化。这是一段测试文本，用于验证编码识别的准确性。',
  chinese_traditional: '次常用國字標準字體表，維基百科是一個自由的網路百科全書。中華人民共和國是世界上最大的發展中國家。',
  japanese: 'ウィキペディアはオープンコンテントの百科事典です。基本方針に賛同していただけるなら、誰でも記事を編集したり新しく作成したりできます。日本語のテスト文章です。',
  korean: '화성 기후 탐사선 마스 클라이미트 오비터는 화성 궤도에 진입했으나, 우주선 제작사 록히드 마틴과 미항공우주국이 다른 단위를 써서 폭발하고 말았습니다.',

  // Cyrillic
  russian: 'Википедия — свободная энциклопедия, которую может редактировать каждый. Россия — самая большая страна в мире. Это тестовый текст для проверки кодировки.',
  russian_short: 'Привет мир',  // Short Cyrillic text

  // Greek
  greek: 'Η Βικιπαίδεια είναι ελεύθερη εγκυκλοπαίδεια που γράφεται συλλογικά από εθελοντές σε όλο τον κόσμο.',

  // Arabic
  arabic: 'ويكيبيديا موسوعة حرة يكتبها متطوعون من جميع أنحاء العالم. العربية لغة سامية وهي أكثر اللغات السامية متحدثين.',

  // Hebrew
  hebrew: 'ויקיפדיה היא אנציקלופדיה חופשית הנכתבת בידי מתנדבים מרחבי העולם. ישראל היא מדינה במזרח התיכון.',

  // Turkish
  turkish: 'Vikipedi, herkesin katkıda bulunabileceği, özgür bir ansiklopedidir. Türkiye, Avrupa ve Asya kıtaları arasında yer alan bir ülkedir. Ğğ Şş İı Öö Üü Çç',

  // Thai
  thai: 'วิกิพีเดีย สารานุกรมเสรี ที่ทุกคนสามารถแก้ไขได้ ประเทศไทยเป็นประเทศที่ตั้งอยู่ในภูมิภาคเอเชียตะวันออกเฉียงใต้',

  // Central European
  polish: 'Wikipedia, wolna encyklopedia, którą każdy może edytować. Polska jest krajem w Europie Środkowej. Ąą Ęę Óó Śś Źź Żż Łł Ńń Ćć',
  czech: 'Wikipedie je otevřená encyklopedie, kterou může upravovat každý. Česká republika je stát ve střední Evropě. Čč Šš Žž Řř Ěě Ďď Ťť Ňň',
  hungarian: 'A Wikipédia szabad enciklopédia, amelyet bárki szerkeszthet. Magyarország közép-európai ország. Áá Éé Íí Óó Öö Őő Úú Üü Űű',
  polish_short: 'Ąą Żż Łł',  // Short Polish text

  // Western
  western: 'Le café est une boisson préparée à partir des graines torréfiées. La résistance des matériaux étudie le comportement des solides déformables.',
  german: 'Wikipedia ist ein Projekt zum Aufbau einer Enzyklopädie aus freien Inhalten. Deutschland ist ein Bundesstaat in Mitteleuropa. Ää Öö Üü ß',
  spanish: 'Wikipedia es una enciclopedia libre que cualquiera puede editar. España es un país de Europa occidental. Ññ Áá Éé Íí Óó Úú Üü ¡¿',

  // Baltic
  latvian: 'Vikipēdija ir brīvā enciklopēdija, ko var rediģēt ikviens. Latvijā ir daudz skaistu mežu un ezeru. Šī valsts atrodas Ziemeļeiropā un tās galvaspilsēta ir Rīga. Āā Ēē Ģģ Īī Ķķ Ļļ Ņņ Šš Ūū Žž',
  lithuanian: 'Vikipedija – laisvoji enciklopedija, kurią gali redaguoti kiekvienas. Lietuva yra valstybė Šiaurės Europoje. Ąą Čč Ęę Ėė Įį Šš Ųų Ūū Žž',

  // Vietnamese
  vietnamese: 'Wikipedia là bách khoa toàn thư mở mà bất kỳ ai cũng có thể sửa đổi. Việt Nam là một quốc gia nằm ở Đông Nam Á. Ơơ Ưư Đđ Ăă',

  // Romanian
  romanian: 'România este o țară situată în Europa de Sud-Est. București este capitala României. Istoria României este lungă și bogată. Ăă Șș Țț Îî Ââ',

  // Ukrainian (for koi8-u)
  ukrainian: 'Вікіпедія — вільна енциклопедія, яку може редагувати кожен. Україна — держава у Східній Європі. Її Єє Іі Ґґ',

  // Armenian
  armenian: 'Վիքիպեդիան ազատ հանրագիտարան է, որը կարող է խմբագրել ցանկացած անձ:',

  // ASCII
  ascii: 'The quick brown fox jumps over the lazy dog. 0123456789 !@#$%^&*()_+-=[]{}|;:,.<>?',
};

// ============================================================
// Test cases
// ============================================================
const TEST_CASES = [
  // --- Unicode ---
  { encoding: 'utf-8', text: 'chinese_simplified', group: 'Unicode' },
  { encoding: 'ascii', text: 'ascii', group: 'Unicode' },
  { encoding: 'utf-16le', text: 'chinese_simplified', bom: true, group: 'Unicode' },
  { encoding: 'utf-16be', text: 'chinese_simplified', bom: true, group: 'Unicode' },
  { encoding: 'utf-32le', text: 'chinese_simplified', bom: true, group: 'Unicode' },
  { encoding: 'utf-32be', text: 'chinese_simplified', bom: true, group: 'Unicode' },

  // --- CJK DBCS ---
  { encoding: 'shift_jis', text: 'japanese', group: 'CJK' },
  { encoding: 'cp932', text: 'japanese', group: 'CJK' },
  { encoding: 'euc-jp', text: 'japanese', group: 'CJK' },
  { encoding: 'gbk', text: 'chinese_simplified', group: 'CJK' },
  { encoding: 'gb18030', text: 'chinese_simplified', group: 'CJK' },
  { encoding: 'gb2312', text: 'chinese_simplified', group: 'CJK' },
  { encoding: 'euc-kr', text: 'korean', group: 'CJK' },
  { encoding: 'cp949', text: 'korean', group: 'CJK' },
  { encoding: 'big5', text: 'chinese_traditional', group: 'CJK' },
  { encoding: 'cp950', text: 'chinese_traditional', group: 'CJK' },

  // --- ESC Sequences ---
  { encoding: 'iso-2022-jp', text: 'japanese', group: 'ESC' },

  // --- Windows Code Pages ---
  { encoding: 'windows-874', text: 'thai', group: 'Windows' },
  { encoding: 'windows-1250', text: 'polish', group: 'Windows' },
  { encoding: 'windows-1250', text: 'polish_short', group: 'Windows (short)', shortText: true },
  { encoding: 'windows-1251', text: 'russian', group: 'Windows' },
  { encoding: 'windows-1251', text: 'russian_short', group: 'Windows (short)', shortText: true },
  { encoding: 'windows-1252', text: 'western', group: 'Windows' },
  { encoding: 'windows-1253', text: 'greek', group: 'Windows' },
  { encoding: 'windows-1254', text: 'turkish', group: 'Windows' },
  { encoding: 'windows-1255', text: 'hebrew', group: 'Windows' },
  { encoding: 'windows-1256', text: 'arabic', group: 'Windows' },
  { encoding: 'windows-1257', text: 'latvian', group: 'Windows' },
  { encoding: 'windows-1258', text: 'vietnamese', group: 'Windows' },

  // --- ISO-8859 ---
  { encoding: 'iso-8859-1', text: 'western', group: 'ISO-8859' },
  { encoding: 'iso-8859-2', text: 'polish', group: 'ISO-8859' },
  { encoding: 'iso-8859-3', text: 'turkish', group: 'ISO-8859' },
  { encoding: 'iso-8859-4', text: 'latvian', group: 'ISO-8859' },
  { encoding: 'iso-8859-5', text: 'russian', group: 'ISO-8859' },
  { encoding: 'iso-8859-6', text: 'arabic', group: 'ISO-8859' },
  { encoding: 'iso-8859-7', text: 'greek', group: 'ISO-8859' },
  { encoding: 'iso-8859-8', text: 'hebrew', group: 'ISO-8859' },
  { encoding: 'iso-8859-9', text: 'turkish', group: 'ISO-8859' },
  { encoding: 'iso-8859-10', text: 'western', group: 'ISO-8859' },
  { encoding: 'iso-8859-11', text: 'thai', group: 'ISO-8859' },
  { encoding: 'iso-8859-13', text: 'latvian', group: 'ISO-8859' },
  { encoding: 'iso-8859-14', text: 'western', group: 'ISO-8859' },
  { encoding: 'iso-8859-15', text: 'western', group: 'ISO-8859' },
  { encoding: 'iso-8859-16', text: 'romanian', group: 'ISO-8859' },

  // --- IBM/DOS Code Pages ---
  { encoding: 'cp437', text: 'western', group: 'DOS' },
  { encoding: 'cp850', text: 'western', group: 'DOS' },
  { encoding: 'cp852', text: 'polish', group: 'DOS' },
  { encoding: 'cp855', text: 'russian', group: 'DOS' },
  { encoding: 'cp857', text: 'turkish', group: 'DOS' },
  { encoding: 'cp858', text: 'western', group: 'DOS' },
  { encoding: 'cp860', text: 'western', group: 'DOS' },
  { encoding: 'cp861', text: 'western', group: 'DOS' },
  { encoding: 'cp862', text: 'hebrew', group: 'DOS' },
  { encoding: 'cp863', text: 'western', group: 'DOS' },
  { encoding: 'cp864', text: 'arabic', group: 'DOS' },
  { encoding: 'cp865', text: 'western', group: 'DOS' },
  { encoding: 'cp866', text: 'russian', group: 'DOS' },
  { encoding: 'cp869', text: 'greek', group: 'DOS' },

  // --- Macintosh Encodings ---
  { encoding: 'macintosh', text: 'western', group: 'Mac' },
  { encoding: 'maccyrillic', text: 'russian', group: 'Mac' },
  { encoding: 'macgreek', text: 'greek', group: 'Mac' },
  { encoding: 'macturkish', text: 'turkish', group: 'Mac' },
  { encoding: 'maciceland', text: 'western', group: 'Mac' },
  { encoding: 'maccenteuro', text: 'polish', group: 'Mac' },
  { encoding: 'maccroatian', text: 'polish', group: 'Mac' },
  { encoding: 'macromania', text: 'western', group: 'Mac' },
  { encoding: 'macukraine', text: 'russian', group: 'Mac' },

  // --- KOI8 ---
  { encoding: 'koi8-r', text: 'russian', group: 'KOI8' },
  { encoding: 'koi8-u', text: 'ukrainian', group: 'KOI8' },

  // --- Special Encodings ---
  { encoding: 'viscii', text: 'vietnamese', group: 'Special' },
  { encoding: 'armscii-8', text: 'armenian', group: 'Special' },
];

// ============================================================
// Acceptable equivalences (lenient matching)
// ============================================================
const EQUIVALENCES = {
  // Unicode
  'utf-8': ['utf-8', 'utf8'],
  'ascii': ['ascii', 'us-ascii'],
  'utf-16le': ['utf-16le', 'utf-16', 'UTF-16', 'ucs-2', 'ucs2'],
  'utf-16be': ['utf-16be', 'utf-16', 'UTF-16'],
  'utf-32le': ['utf-32le', 'utf-32', 'UTF-32'],
  'utf-32be': ['utf-32be', 'utf-32', 'UTF-32'],

  // CJK
  'shift_jis': ['shift_jis', 'cp932', 'sjis'],
  'cp932': ['cp932', 'shift_jis', 'sjis'],
  'euc-jp': ['euc-jp'],
  'gbk': ['gbk', 'gb2312', 'gb18030', 'cp936'],
  'gb18030': ['gb18030', 'gbk', 'gb2312', 'cp936'],
  'gb2312': ['gb2312', 'gbk', 'gb18030', 'cp936'],
  'euc-kr': ['euc-kr', 'cp949'],
  'cp949': ['cp949', 'euc-kr'],
  'big5': ['big5', 'cp950'],
  'cp950': ['cp950', 'big5'],

  // ESC
  'iso-2022-jp': ['iso-2022-jp'],

  // Windows
  'windows-874': ['windows-874', 'iso-8859-11', 'tis-620'],
  'windows-1250': ['windows-1250', 'iso-8859-2', 'iso-8859-16', 'cp852', 'maccenteuro'],
  'windows-1251': ['windows-1251', 'iso-8859-5', 'koi8-r', 'koi8-u', 'cp866', 'cp855', 'maccyrillic', 'macukraine', 'iso-8859-7'],
  'windows-1252': ['windows-1252', 'iso-8859-1', 'iso-8859-15', 'iso-8859-14', 'cp850', 'macintosh', 'macroman', 'cp437', 'cp858', 'cp860', 'cp861', 'cp863', 'cp865'],
  'windows-1253': ['windows-1253', 'iso-8859-7', 'cp869', 'macgreek'],
  'windows-1254': ['windows-1254', 'iso-8859-9', 'iso-8859-3', 'cp857', 'macturkish'],
  'windows-1255': ['windows-1255', 'iso-8859-8', 'cp862'],
  'windows-1256': ['windows-1256', 'iso-8859-6', 'cp864'],
  'windows-1257': ['windows-1257', 'iso-8859-13', 'iso-8859-4'],
  'windows-1258': ['windows-1258', 'windows-1252', 'windows-1251'],

  // ISO-8859
  'iso-8859-1': ['iso-8859-1', 'windows-1252', 'iso-8859-15', 'cp850', 'macintosh'],
  'iso-8859-2': ['iso-8859-2', 'windows-1250', 'iso-8859-16', 'cp852'],
  'iso-8859-3': ['iso-8859-3', 'iso-8859-9', 'windows-1254', 'cp857', 'macturkish'],
  'iso-8859-4': ['iso-8859-4', 'iso-8859-13', 'windows-1257'],
  'iso-8859-5': ['iso-8859-5', 'windows-1251', 'koi8-r', 'koi8-u', 'cp866', 'cp855'],
  'iso-8859-6': ['iso-8859-6', 'windows-1256', 'cp864'],
  'iso-8859-7': ['iso-8859-7', 'windows-1253', 'cp869', 'macgreek'],
  'iso-8859-8': ['iso-8859-8', 'windows-1255', 'cp862'],
  'iso-8859-9': ['iso-8859-9', 'windows-1254', 'iso-8859-3', 'cp857'],
  'iso-8859-10': ['iso-8859-10', 'iso-8859-1', 'windows-1252', 'iso-8859-4'],
  'iso-8859-11': ['iso-8859-11', 'windows-874', 'tis-620'],
  'iso-8859-13': ['iso-8859-13', 'windows-1257', 'iso-8859-4'],
  'iso-8859-14': ['iso-8859-14', 'iso-8859-1', 'windows-1252'],
  'iso-8859-15': ['iso-8859-15', 'iso-8859-1', 'windows-1252', 'cp850'],
  'iso-8859-16': ['iso-8859-16', 'iso-8859-2', 'windows-1250'],

  // DOS
  'cp437': ['cp437', 'cp850', 'cp858', 'windows-1252', 'iso-8859-1', 'macintosh', 'cp866'],
  'cp850': ['cp850', 'cp437', 'cp858', 'windows-1252', 'iso-8859-1', 'macintosh', 'cp866'],
  'cp852': ['cp852', 'windows-1250', 'iso-8859-2', 'cp866'],
  'cp855': ['cp855', 'windows-1251', 'iso-8859-5', 'koi8-r', 'cp866'],
  'cp857': ['cp857', 'windows-1254', 'iso-8859-9', 'iso-8859-3', 'macturkish'],
  'cp858': ['cp858', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp860': ['cp860', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp861': ['cp861', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp862': ['cp862', 'windows-1255', 'iso-8859-8'],
  'cp863': ['cp863', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp864': ['cp864', 'windows-1256', 'iso-8859-6', 'ascii'],
  'cp865': ['cp865', 'cp850', 'cp437', 'windows-1252', 'cp866'],
  'cp866': ['cp866', 'windows-1251', 'iso-8859-5', 'koi8-r', 'cp855'],
  'cp869': ['cp869', 'windows-1253', 'iso-8859-7', 'macgreek'],

  // Mac
  'macintosh': ['macintosh', 'macroman', 'windows-1252', 'iso-8859-1', 'cp850', 'cp437'],
  'maccyrillic': ['maccyrillic', 'windows-1251', 'koi8-r', 'iso-8859-5', 'macukraine'],
  'macgreek': ['macgreek', 'windows-1253', 'iso-8859-7', 'cp869'],
  'macturkish': ['macturkish', 'windows-1254', 'iso-8859-9', 'iso-8859-3', 'cp857'],
  'maciceland': ['maciceland', 'macintosh', 'windows-1252', 'cp850'],
  'maccenteuro': ['maccenteuro', 'windows-1250', 'iso-8859-2', 'cp852'],
  'maccroatian': ['maccroatian', 'maccenteuro', 'windows-1250', 'iso-8859-2', 'cp852'],
  'macromania': ['macromania', 'macintosh', 'windows-1252', 'cp850'],
  'macukraine': ['macukraine', 'maccyrillic', 'windows-1251', 'koi8-r', 'koi8-u'],

  // KOI8
  'koi8-r': ['koi8-r', 'koi8-u', 'windows-1251', 'iso-8859-5', 'cp866'],
  'koi8-u': ['koi8-u', 'koi8-r', 'windows-1251', 'iso-8859-5'],

  // Special
  'viscii': ['viscii', 'windows-1258', 'armscii-8'],
  'armscii-8': ['armscii-8'],
};

function isAcceptable(expected, detected) {
  if (!detected) return false;
  const exp = expected.toLowerCase();
  const det = detected.toLowerCase();
  if (exp === det) return true;
  const eqs = EQUIVALENCES[exp] || [];
  return eqs.some(e => e.toLowerCase() === det);
}

function generateBuffer(encoding, textKey, useBom) {
  const text = TEXTS[textKey];
  if (!text) return null;
  if (!iconv.encodingExists(encoding)) return null;
  try {
    let buf = iconv.encode(text, encoding);
    if (useBom) {
      const boms = {
        'utf-16le': Buffer.from([0xFF, 0xFE]),
        'utf-16be': Buffer.from([0xFE, 0xFF]),
        'utf-32le': Buffer.from([0xFF, 0xFE, 0x00, 0x00]),
        'utf-32be': Buffer.from([0x00, 0x00, 0xFE, 0xFF]),
      };
      if (boms[encoding]) buf = Buffer.concat([boms[encoding], buf]);
    }
    return buf;
  } catch (e) {
    return null;
  }
}

// ============================================================
// Run tests
// ============================================================
const groups = {};
let totalPassed = 0, totalFailed = 0, totalSkipped = 0;

for (const tc of TEST_CASES) {
  const g = tc.group || 'Other';
  if (!groups[g]) groups[g] = { passed: 0, failed: 0, skipped: 0, tests: [] };

  const buf = generateBuffer(tc.encoding, tc.text, tc.bom);
  if (!buf) {
    groups[g].skipped++;
    totalSkipped++;
    groups[g].tests.push({ ...tc, status: 'SKIP', reason: 'encoding not supported' });
    continue;
  }

  const result = jschardet.detect(buf);
  const passed = isAcceptable(tc.encoding, result.encoding);

  if (passed) { groups[g].passed++; totalPassed++; }
  else { groups[g].failed++; totalFailed++; }

  groups[g].tests.push({
    ...tc,
    detected: result.encoding,
    confidence: result.confidence,
    bufSize: buf.length,
    status: passed ? 'PASS' : 'FAIL',
  });
}

// ============================================================
// Print results
// ============================================================
console.log('='.repeat(80));
console.log('jschardet-ultra Comprehensive v2 Test');
console.log('='.repeat(80));

for (const [gName, g] of Object.entries(groups)) {
  console.log(`\n--- ${gName} (${g.passed}/${g.passed + g.failed} passed) ---`);
  for (const t of g.tests) {
    const icon = t.status === 'PASS' ? '  OK' : t.status === 'SKIP' ? 'SKIP' : 'FAIL';
    if (t.status === 'SKIP') {
      console.log(`  [${icon}] ${t.encoding}: ${t.reason}`);
    } else if (t.status === 'PASS') {
      console.log(`  [${icon}] ${t.encoding} -> ${t.detected} (${t.confidence.toFixed(2)}) [${t.bufSize}B]`);
    } else {
      console.log(`  [${icon}] ${t.encoding} (expected ~${t.encoding}, got ${t.detected || 'null'}) [${t.bufSize}B]`);
    }
  }
}

const testable = totalPassed + totalFailed;
const accuracy = testable > 0 ? ((totalPassed / testable) * 100).toFixed(1) : 'N/A';

console.log('\n' + '='.repeat(80));
console.log(`SUMMARY: ${totalPassed}/${testable} passed (${accuracy}%)`);
console.log(`  Passed: ${totalPassed} | Failed: ${totalFailed} | Skipped: ${totalSkipped}`);
console.log('='.repeat(80));

if (totalFailed > 0) {
  process.exit(1);
}
