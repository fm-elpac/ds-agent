// +sleep,+proc,+js: agent 内置工具

import { 工具类型, 工具配置 } from "./util.ts";

// 内置工具 分模块 启用情况
interface 工具模块启用 {
  run: boolean;
  sleep: boolean;
  proc: boolean;
  js: boolean;
  stdio: boolean;
  bg: boolean;
  mcp: boolean;
}

// DS_AGENT_TOOL=+run,+sleep,+proc,+js,-stdio,-bg,+mcp
// DS_AGENT_TOOL=-
function 解析工具配置(配置: string): 工具模块启用 {
  console.error("DS_AGENT_TOOL=" + 配置);

  if ("-" == 配置) {
    // 关闭所有内置工具
    return {
      run: false,
      sleep: false,
      proc: false,
      js: false,
      stdio: false,
      bg: false,
      mcp: false,
    };
  }

  // 输出警告
  function w(额外: string | undefined = undefined) {
    let o = "WARN: bad DS_AGENT_TOOL=" + 配置;
    if (额外) {
      o += ` (${额外})`;
    }
    console.error(o);
  }

  // 默认配置
  const o = {
    run: true,
    sleep: true,
    proc: true,
    js: true,
    stdio: false,
    bg: false,
    mcp: true,
  };
  if (配置) {
    // 允许的配置项
    const N = Object.keys(o);

    // 修改配置
    function 设(名称: string, 值: boolean) {
      // 检查名称
      if (N.includes(名称)) {
        Object.assign(o, {
          [名称]: 值,
        });
      } else {
        // 错误的名称
        w(名称);
      }
    }

    // 每个开关选项
    for (const i of 配置.split(",")) {
      if (!i) {
        // 空白: 错误
        w();
      } else {
        if ("+" == i[0]) {
          // 启用模块
          设(i.slice(1), true);
        } else if ("-" == i[0]) {
          // 禁用模块
          设(i.slice(1), false);
        } else {
          // 错误的格式
          w(i);
        }
      }
    }
  }
  return o;
}

export async function 初始化工具(): Promise<Array<工具类型>> {
  const 配置 = 解析工具配置(工具配置());

  // TODO
  return [];
}
