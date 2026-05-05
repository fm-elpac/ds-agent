// ds-agent 常规助手 (regular agent)
import { 检查虚拟机 } from "./virt.ts";

import {
  BF_BOOT,
  BF_CHATLOG,
  BF_CHATLOG_0,
  BF_WAKEUP,
  boot存在,
  初始化环境配置,
  初始化调试输出,
  命令行参数类型,
} from "./util.ts";
import { 初始化工具 } from "./内置工具.ts";
import { 主循环, 启动类型, 快照启动, 正常启动, 浅眠启动 } from "./agent.ts";

// 命令行参数
// --stdout  启用调试输出
function 解析命令行(a: Array<string>): 命令行参数类型 {
  const o = {
    stdout: false,
  };

  // TODO 更好的 错误处理
  if (a.length > 0) {
    if ("--stdout" == a[0]) {
      o.stdout = true;
    }
  }

  return o;
}

// agent 内部初始化
function 初始化() {
  const a = 解析命令行(Deno.args);
  初始化调试输出(a);

  初始化环境配置();
}

async function main() {
  await 检查虚拟机();

  初始化();
  // 检查 agent 启动目录

  // `BOOT.md` 必需存在
  if (!await boot存在(BF_BOOT)) {
    console.error("ERROR: BOOT.md not exist");
    Deno.exit(1);
  }
  // `WAKEUP.md` 必需存在
  if (!await boot存在(BF_WAKEUP)) {
    console.error("ERROR: WAKEUP.md not exist");
    Deno.exit(1);
  }
  // 检查 `chatlog.json` 是否存在
  const C = await boot存在(BF_CHATLOG);
  // 检查 `chatlog.0.json` 是否存在
  const C0 = await boot存在(BF_CHATLOG_0);

  // 同时存在
  if (C && C0) {
    console.error(
      "ERROR: `chatlog.json` and `chatlog.0.json` can not both exist !",
    );
    Deno.exit(1);
  }

  let 启动: 启动类型 = [[], "", []];
  if (C) {
    // 仅 `chatlog.json` 存在
    启动 = await 浅眠启动();
  } else if (C0) {
    // 仅 `chatlog.0.json` 存在
    启动 = await 快照启动();
  } else {
    // 都不存在
    启动 = await 正常启动();
  }

  // 推迟 初始化工具, 因为上面的初始化过程只是简单的读取几个文件, 速度快
  const 工具 = await 初始化工具();

  await 主循环(工具, 启动);
}

await main();
