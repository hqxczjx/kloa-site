// 「去注释」工具 —— generate-font-subset.mjs 与 check-font-coverage.mjs 共用。
// 背景（Task#9 review）：子集收集此前直接扫源码全文，注释里的中文也进了子集
// （如倒计时脚本的说明文字），~105 个字形纯占体积。本工具先把注释剔除再收集。
//
// 剔除对象：/* */ 块注释、// 行注释、.astro 模板区的 <!-- --> HTML 注释
// （CSS 注释走 /* */，一并剔除）。保留对象：'...'、"..."、`...`（含 ${} 嵌套
// 插值）与正则字面量的全部内容——字符串/模板里的中文是真实渲染文本，误删即线上缺字形。
//
// 实现为单遍状态机而非正则替换：.astro/.tsx 混合 JS/TS/JSX/HTML/CSS，正则无法
// 正确处理「注释符出现在字符串里」「URL 的 //」等情况。歧义按保守原则处理：
//   - 斜杠歧义（除法 vs 正则开头）：按前一个有效 token 判定；判不准时当普通
//     字符保留。多留一个字符只让子集大几十字节，误删一个字符就是静默缺字形
//     （两个脚本同口径，CI 审计发现不了这类错删）。
//   - URL 的 //：scheme:（≥2 个字母/数字）后跟 // 不视为行注释。
export function stripComments(src) {
  // 斜杠前是这些字符之一 → 允许开正则（标识符/数字/)/] 之后 → 除法）。
  // 刻意不含 '<' 与 '}'：JSX/astro 里 </tag> 与 {...} /> 无处不在，把它们当
  // 正则开头会吞到下一个 '/' 为止（实测让 {/* */} 注释漏剔）——判不准宁可不进正则态。
  const REGEX_BEFORE = new Set('(,=:[!&|?;+-*%>^~');
  const REGEX_KEYWORDS = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
    'throw', 'case', 'do', 'else', 'yield', 'await',
  ]);
  const isWord = (c) => /[A-Za-z0-9_$]/.test(c);

  // code 态最近输出的非空白字符 + 以它结尾的词（斜杠歧义判定用；注释/空白不更新）
  let prevSig = '';
  let lastWord = '';
  const feed = (c) => {
    if (/\s/.test(c)) return;
    prevSig = c;
    lastWord = isWord(c) ? lastWord + c : '';
  };

  // scheme:（≥2 字符）后紧跟 // → 是 URL，不是行注释
  const isUrlSlashSlash = (i) => {
    if (src[i - 1] !== ':') return false;
    let j = i - 2;
    while (j >= 0 && /[A-Za-z0-9+.-]/.test(src[j])) j--;
    return i - 2 - j >= 2;
  };

  // 正则态是否处于 [...] 字符类（类里的 / 不闭合正则）
  let inClass = false;
  let out = '';
  let state = 'code'; // code | sq | dq | tpl | regex | line | block | html
  const tplStack = []; // 模板字面量 ${ 插值嵌套：} 且栈非空 → 回模板态
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];

    if (state === 'sq' || state === 'dq') {
      const q = state === 'sq' ? "'" : '"';
      if (c === '\\') {
        out += c + (n ?? '');
        i += 2;
        continue;
      }
      out += c;
      if (c === q) state = 'code';
      i++;
      continue;
    }

    if (state === 'tpl') {
      if (c === '\\') {
        out += c + (n ?? '');
        i += 2;
        continue;
      }
      if (c === '`') {
        out += c;
        state = 'code';
        i++;
        continue;
      }
      if (c === '$' && n === '{') {
        out += '${';
        tplStack.push('tpl');
        state = 'code';
        prevSig = '{';
        lastWord = '';
        i += 2;
        continue;
      }
      out += c;
      i++;
      continue;
    }

    if (state === 'regex') {
      if (c === '\\') {
        out += c + (n ?? '');
        i += 2;
        continue;
      }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        out += c;
        state = 'code';
        feed(c);
        // 吃掉正则标志位（/re/gi 的 gi）
        while (i + 1 < src.length && /[a-z]/.test(src[i + 1])) {
          out += src[i + 1];
          i++;
        }
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        out += '\n';
        state = 'code';
      }
      i++;
      continue;
    }

    if (state === 'block' || state === 'html') {
      const close = state === 'block' ? '*/' : '-->';
      if (c === '\n') out += '\n';
      if (c === close[0] && n === close[1]) {
        state = 'code';
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // ---- code 态 ----
    if (c === '/' && n === '/' && !isUrlSlashSlash(i)) {
      state = 'line';
      i += 2;
      continue;
    }
    if (c === '/' && n === '*') {
      state = 'block';
      i += 2;
      continue;
    }
    if (c === '<' && n === '!' && src[i + 2] === '-' && src[i + 3] === '-') {
      state = 'html';
      i += 4;
      continue;
    }
    if (c === "'") {
      state = 'sq';
      out += c;
      i++;
      continue;
    }
    if (c === '"') {
      state = 'dq';
      out += c;
      i++;
      continue;
    }
    if (c === '`') {
      state = 'tpl';
      out += c;
      i++;
      continue;
    }
    if (c === '/' && prevSig && (isWord(prevSig) || prevSig === ')' || prevSig === ']')) {
      // 前面是标识符/数字/右括号：除法——除非那个词是 return 等关键字
      if (!REGEX_KEYWORDS.has(lastWord)) {
        out += c;
        feed(c);
        i++;
        continue;
      }
    }
    if (c === '/' && (prevSig === '' || REGEX_BEFORE.has(prevSig) || REGEX_KEYWORDS.has(lastWord))) {
      state = 'regex';
      inClass = false;
      out += c;
      i++;
      continue;
    }
    if (c === '}' && tplStack.length > 0) {
      tplStack.pop();
      state = 'tpl';
      out += c;
      i++;
      continue;
    }
    out += c;
    feed(c);
    i++;
  }
  return out;
}
