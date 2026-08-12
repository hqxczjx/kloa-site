// ESLint 安全自查配置（flat config，ESLint v10）。
//
// 目的：提交前本地 + CI 各跑一次，提前拦截 CodeQL 会报的同类 JS/TS 安全问题，
// 让代码到 CI CodeQL 时已能通过。只启用「安全」相关规则，不做通用代码风格 lint，
// 不干扰现有代码。聚焦四类：
//   1. 动态代码执行（eval / new Function）   → CodeQL: code-injection
//   2. DOM XSS（innerHTML / outerHTML / document.write / insertAdjacentHTML）→ CodeQL: dom-based-xss
//   3. ReDoS（灾难性回溯正则 / 非字面量正则）→ CodeQL: js/redos
//   4. 弱随机 / 子进程注入 / 密钥时序比较     → CodeQL: insecure-randomness / command-injection
//
// 故意不开 eslint-plugin-security 的高误报规则（detect-object-injection 等）。
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'coverage/**', // 测试覆盖率产物
      'node_modules/**',
      'src/data/**', // 静态数据，非业务源码
      'scripts/**', // 构建脚本
      '**/*.config.*',
      'test-e2e.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      security,
      'no-unsanitized': noUnsanitized,
    },
    rules: {
      // 1. 动态代码执行
      'no-eval': 'error',
      'no-new-func': 'error',
      'security/detect-eval-with-expression': 'error',

      // 2. DOM XSS —— 未消毒直接写入 HTML sink
      'no-unsanitized/method': 'error', // document.write / insertAdjacentHTML(... , <untrusted>)
      'no-unsanitized/property': 'error', // el.innerHTML = <untrusted> / outerHTML

      // 3. ReDoS
      'security/detect-unsafe-regex': 'error', // 已知的灾难性回溯正则
      'security/detect-non-literal-regexp': 'warn', // 用变量构造 RegExp（可能用户输入注入模式）

      // 4. 其他高危（低误报精选）
      'security/detect-child-process': 'error', // 子进程命令注入
      'security/detect-pseudoRandomBytes': 'error', // 弱随机（应取 Math.random → crypto）
      'security/detect-possible-timing-attacks': 'warn', // 密钥/密码的不等比较

      // 故意关闭的高误报 / 不适用规则
      'security/detect-object-injection': 'off', // 误报王：几乎所有 a[b] 访问都报
      'security/detect-non-literal-fs-filename': 'off', // Worker 环境无 fs
      'security/detect-non-literal-require': 'off', // 项目用 ESM，无 require 注入面
    },
  },
];
