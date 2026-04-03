'use strict';

const jschardet = require('..');
const iconv = require('iconv-lite');

/**
 * 全面测试 + 边界条件测试
 */

// ============ 测试文本素材 ============
const TEXTS = {
  zh: '情人节为每年的2月14日，是西方的传统节日之一。这节日原来纪念两位同是名叫华伦泰的基督宗教初期教会殉道圣人。中国是一个伟大的国家。',
  zh_short: '你好世界',
  zh_single: '中',
  zh_trad: '維基百科是自由的百科全書，中華人民共和國是世界上最大的發展中國家。',
  ja: 'ウィキペディアはオープンコンテントの百科事典です。基本方針に賛同していただけるなら、誰でも記事を編集したり新しく作成したりできます。',
  ja_short: 'データ',
  ja_hiragana: 'おはようございます。今日はいい天気ですね。',
  ja_katakana: 'コンピュータサイエンス',
  ko: '화성 기후 탐사선 마스 클라이미트 오비터는 화성 궤도에 진입했으나 우주선이 폭발하고 말았습니다.',
  ko_short: '한국어',
  ru: 'Википедия — свободная энциклопедия, которую может редактировать каждый. Россия — самая большая страна в мире по площади территории.',
  ru_short: 'Привет',
  fr: 'Le café est une boisson préparée à partir des graines torréfiées. La résistance des matériaux étudie le comportement des solides déformables.',
  de: 'Wikipedia ist ein Projekt zum Aufbau einer Enzyklopädie aus freien Inhalten. Ärger über Öffnungszeiten der Bücherei.',
  el: 'Η Βικιπαίδεια είναι ελεύθερη εγκυκλοπαίδεια που γράφεται συλλογικά από εθελοντές.',
  he: 'ויקיפדיה היא אנציקלופדיה חופשית הנכתבת בידי מתנדבים מרחבי העולם.',
  ar: 'ويكيبيديا موسوعة حرة يكتبها متطوعون من جميع أنحاء العالم.',
  th: 'วิกิพีเดีย สารานุกรมเสรี ที่ทุกคนสามารถแก้ไขได้ ประเทศไทยเป็นประเทศในเอเชีย',
  ascii: 'The quick brown fox jumps over the lazy dog. 0123456789',
  ascii_empty: '',
  numbers: '1234567890',
  mixed_ascii: 'Hello World! @#$%^&*()_+-=[]{}|;:,.<>?/',
};

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
const failures = [];

function test(name, inputBuf, acceptableEncodings, minConfidence) {
  totalTests++;
  const result = jschardet.detect(inputBuf);
  const enc = result.encoding;
  const conf = result.confidence;
  const passed = acceptableEncodings.includes(enc) && conf >= (minConfidence || 0);

  if (passed) {
    totalPassed++;
    console.log(`  [OK] ${name} => ${enc} (${conf.toFixed(2)})`);
  } else {
    totalFailed++;
    failures.push({ name, expected: acceptableEncodings, got: enc, conf });
    console.log(`  [FAIL] ${name} => ${enc} (${conf.toFixed(2)}) expected: [${acceptableEncodings}]`);
  }
}

function encode(text, encoding) {
  return iconv.encode(text, encoding);
}

// ============ 运行测试 ============
console.log('='.repeat(70));
console.log('jschardet-ultra 全面测试 + 边界条件');
console.log('='.repeat(70));

// ---- 1. BOM 检测 ----
console.log('\n--- 1. BOM 检测 ---');
test('UTF-8 BOM', Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]), ['utf-8'], 1.0);
test('UTF-16LE BOM', Buffer.concat([Buffer.from([0xFF, 0xFE]), iconv.encode('Hello', 'utf-16le')]), ['utf-16le'], 1.0);
test('UTF-16BE BOM', Buffer.concat([Buffer.from([0xFE, 0xFF]), iconv.encode('Hello', 'utf-16be')]), ['utf-16be'], 1.0);
test('UTF-32LE BOM', Buffer.from([0xFF, 0xFE, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00]), ['utf-32le'], 1.0);
test('UTF-32BE BOM', Buffer.from([0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x48]), ['utf-32be'], 1.0);
test('UTF-8 BOM + 中文', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), encode(TEXTS.zh, 'utf-8')]), ['utf-8'], 1.0);

// ---- 2. 纯 ASCII ----
console.log('\n--- 2. 纯 ASCII ---');
test('英文句子', Buffer.from(TEXTS.ascii), ['ascii'], 1.0);
test('纯数字', Buffer.from(TEXTS.numbers), ['ascii'], 1.0);
test('ASCII特殊字符', Buffer.from(TEXTS.mixed_ascii), ['ascii'], 1.0);
test('单个字符 A', Buffer.from('A'), ['ascii'], 1.0);
test('单个空格', Buffer.from(' '), ['ascii'], 1.0);

// ---- 3. 边界条件 ----
console.log('\n--- 3. 边界条件 ---');
test('空输入', Buffer.alloc(0), [null], 0);
test('单字节 0x00', Buffer.from([0x00]), ['ascii'], 0);
test('单字节 high 0xFF', Buffer.from([0xFF]), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256'], 0);
test('全 0x00 填充', Buffer.alloc(100), ['ascii'], 0);
test('2字节 UTF-8 中文', encode(TEXTS.zh_single, 'utf-8'), ['utf-8'], 0.3);
test('非常短的 UTF-8', encode(TEXTS.zh_short, 'utf-8'), ['utf-8'], 0.5);
test('1个字节的 high byte', Buffer.from([0xC0]), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'iso-8859-5', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'windows-874'], 0);

// ---- 4. CJK 多字节编码（长文本） ----
console.log('\n--- 4. CJK 多字节（长文本）---');
test('GB2312 长中文', encode(TEXTS.zh, 'gb2312'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('GBK 长中文', encode(TEXTS.zh, 'gbk'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('GB18030 长中文', encode(TEXTS.zh, 'gb18030'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('Big5 繁体中文', encode(TEXTS.zh_trad, 'big5'), ['big5', 'cp950'], 0.9);
test('Shift_JIS 日文', encode(TEXTS.ja, 'shift_jis'), ['shift_jis', 'cp932'], 0.9);
test('EUC-JP 日文', encode(TEXTS.ja, 'euc-jp'), ['euc-jp'], 0.9);
test('EUC-KR 韩文', encode(TEXTS.ko, 'euc-kr'), ['euc-kr', 'cp949'], 0.9);

// ---- 5. CJK 短文本 ----
console.log('\n--- 5. CJK 短文本 ---');
test('GB2312 短中文(你好世界)', encode(TEXTS.zh_short, 'gb2312'), ['gb2312', 'gbk', 'gb18030', 'utf-8', 'euc-kr', 'big5'], 0.2);
test('Shift_JIS 短日文(データ)', encode(TEXTS.ja_short, 'shift_jis'), ['shift_jis', 'cp932', 'utf-8'], 0.2);
test('Shift_JIS 平假名', encode(TEXTS.ja_hiragana, 'shift_jis'), ['shift_jis', 'cp932'], 0.5);
test('Shift_JIS 片假名', encode(TEXTS.ja_katakana, 'shift_jis'), ['shift_jis', 'cp932'], 0.5);
test('EUC-KR 短韩文', encode(TEXTS.ko_short, 'euc-kr'), ['euc-kr', 'cp949', 'utf-8', 'gb2312', 'big5'], 0.2);
test('UTF-8 单汉字', encode(TEXTS.zh_single, 'utf-8'), ['utf-8'], 0.2);

// ---- 6. 西里尔编码 ----
console.log('\n--- 6. 西里尔编码 ---');
test('windows-1251 长俄文', encode(TEXTS.ru, 'windows-1251'), ['windows-1251', 'koi8-r', 'iso-8859-5'], 0.8);
test('KOI8-R 长俄文', encode(TEXTS.ru, 'koi8-r'), ['koi8-r', 'koi8-u', 'windows-1251', 'iso-8859-5'], 0.8);
test('ISO-8859-5 长俄文', encode(TEXTS.ru, 'iso-8859-5'), ['iso-8859-5', 'windows-1251', 'koi8-r'], 0.8);
test('CP866 长俄文', encode(TEXTS.ru, 'cp866'), ['cp866', 'windows-1251', 'koi8-r', 'iso-8859-5', 'cp855'], 0.5);
test('windows-1251 短俄文', encode(TEXTS.ru_short, 'windows-1251'), ['windows-1251', 'koi8-r', 'iso-8859-5', 'cp866', 'koi8-u', 'gb2312', 'gbk', 'euc-kr', 'big5', 'shift_jis', 'euc-jp', 'iso-8859-13', 'iso-8859-2', 'iso-8859-4', 'windows-1250', 'windows-1257'], 0.1);

// ---- 7. 西欧编码 ----
console.log('\n--- 7. 西欧编码 ---');
test('windows-1252 法文', encode(TEXTS.fr, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.8);
test('ISO-8859-1 法文', encode(TEXTS.fr, 'iso-8859-1'), ['iso-8859-1', 'windows-1252', 'iso-8859-15'], 0.8);
test('windows-1252 德文', encode(TEXTS.de, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.8);

// ---- 8. 希腊/希伯来/阿拉伯/泰文 ----
console.log('\n--- 8. 其他单字节 ---');
test('windows-1253 希腊', encode(TEXTS.el, 'windows-1253'), ['windows-1253', 'iso-8859-7'], 0.8);
test('ISO-8859-7 希腊', encode(TEXTS.el, 'iso-8859-7'), ['iso-8859-7', 'windows-1253'], 0.8);
test('windows-1255 希伯来', encode(TEXTS.he, 'windows-1255'), ['windows-1255', 'iso-8859-8'], 0.8);
test('windows-1256 阿拉伯', encode(TEXTS.ar, 'windows-1256'), ['windows-1256', 'iso-8859-6'], 0.8);
test('windows-874 泰文', encode(TEXTS.th, 'windows-874'), ['windows-874', 'iso-8859-11', 'tis-620'], 0.8);

// ---- 9. 混合内容 ----
console.log('\n--- 9. 混合内容 ---');
test('ASCII+UTF8中文混合', encode('Hello ' + TEXTS.zh_short + ' World', 'utf-8'), ['utf-8'], 0.5);
test('ASCII占大量+少量GB中文', encode('abcdefghijklmnopqrstuvwxyz ' + TEXTS.zh_short, 'gb2312'), ['gb2312', 'gbk', 'gb18030', 'utf-8', 'ascii'], 0.1);
test('纯ASCII伪装(全low byte)', Buffer.from('Hello World 12345 test data aaaa bbbb cccc'), ['ascii'], 1.0);

// ---- 10. 大文件模拟 ----
console.log('\n--- 10. 大数据量 ---');
const bigUtf8 = Buffer.from((TEXTS.zh + '\n').repeat(100));
test('UTF-8 大文本(15KB)', bigUtf8, ['utf-8'], 0.95);
const bigGb = iconv.encode((TEXTS.zh + '\n').repeat(100), 'gb2312');
test('GB2312 大文本', bigGb, ['gb2312', 'gbk', 'gb18030'], 0.95);
const bigSjis = iconv.encode((TEXTS.ja + '\n').repeat(100), 'shift_jis');
test('Shift_JIS 大文本', bigSjis, ['shift_jis', 'cp932'], 0.95);
const bigRu = iconv.encode((TEXTS.ru + '\n').repeat(100), 'windows-1251');
test('windows-1251 大文本', bigRu, ['windows-1251', 'koi8-r', 'iso-8859-5'], 0.8);

// ---- 11. 特殊字节序列 ----
console.log('\n--- 11. 特殊字节序列 ---');
test('全 0x80 填充', Buffer.alloc(50, 0x80), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'iso-8859-5', 'windows-1253', 'shift_jis', 'gbk', 'gb2312', 'euc-kr', 'big5'], 0);
test('交替 high/low', Buffer.from([0x41, 0xC0, 0x42, 0xD0, 0x43, 0xE0, 0x44, 0xF0]), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'utf-8', 'shift_jis', 'gbk', 'windows-1258', 'windows-1250', 'iso-8859-2'], 0);
test('连续 0xFF', Buffer.alloc(10, 0xFF), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'iso-8859-5', 'shift_jis', 'gbk'], 0);

// ============ 汇总 ============
console.log('\n' + '='.repeat(70));
console.log(`总计: ${totalTests} | 通过: ${totalPassed} | 失败: ${totalFailed}`);
console.log(`通过率: ${(totalPassed / totalTests * 100).toFixed(1)}%`);
if (failures.length > 0) {
  console.log('\n失败详情:');
  for (const f of failures) {
    console.log(`  ${f.name}: got ${f.got}(${f.conf.toFixed(2)}), expected [${f.expected}]`);
  }
}
console.log('='.repeat(70));
