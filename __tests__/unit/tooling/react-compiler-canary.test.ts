// React Compiler vitest 侧接线金丝雀（Task#7 审查跟进）：
// vitest.config.ts 用 @rolldown/plugin-babel + reactCompilerPreset 挂编译器，
// 并把 preset 的 applyToEnvironmentHook 强制为 () => true（preset 自限 client
// 环境，而 vitest 跑 ssr consumer——不覆盖则编译器在测试侧静默失效）。
// 该覆盖是对 plugin-react preset 内部协议的耦合：上游 6.x minor 若改协议，
// 编译器会无声停摆（没有测试会红）。本金丝雀穿透 vitest transform 管道断言
// 编译器真实生效：编译后的组件函数体含 memo cache 哨兵（React Compiler 特有
// 输出，手写代码不可能出现）。失败时先查 vitest.config.ts 的接线，而不是组件。
import { describe, it, expect } from 'vitest';
import SongList from '../../../src/components/react/SongList';

describe('React Compiler vitest 接线金丝雀', () => {
  it('SongList 经 vitest transform 后含 memo cache 哨兵（编译器在测试侧生效）', () => {
    expect(SongList.toString()).toContain('react.memo_cache_sentinel');
  });
});
