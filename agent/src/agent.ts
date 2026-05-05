// agent 主循环
import {
  BF_BOOT,
  BF_CHATLOG,
  BF_CHATLOG_0,
  BF_CHATLOG_1,
  BF_LAST,
  BF_MCP,
  BF_WAKEUP,
  boot写,
  boot存在,
  boot读,
  boot路径,
  d,
  mp_post,
  工具类型,
  消息类型,
} from "./util.ts";

// 固定的系统消息
function 系统消息() {
  return [{
    role: "system",
    // TODO
    content: "你是 AI 助手 「小喵」, 可以按需调用工具, 帮助用户执行任务.\n",
  }];
}

// LLM 上下文 (聊天记录), 启动名称 (类型), 新消息 (用于调试)
export type 启动类型 = [Array<消息类型>, string, Array<消息类型>];

// 启动模式: 正常启动 (首次启动 / 深睡眠 启动)
//
// 条件: `chatlog.json` 和 `chatlog.0.json` 文件 不存在.
//
// 读取 `BOOT.md` 和 `WAKEUP.md` 文件.
export async function 正常启动(): Promise<启动类型> {
  d("加载 BOOT.md");
  const b = await boot读(BF_BOOT);
  d("加载 WAKEUP.md");
  const w = await boot读(BF_WAKEUP);

  // 拼接初始消息
  const content = [b, w].join("\n");

  const o = 系统消息().concat([{
    role: "user",
    content,
  }]);
  return [o, "正常启动", o];
}

// 启动模式: 浅眠启动 (浅睡眠 启动)
//
// 条件: `chatlog.json` 文件 存在, `chatlog.0.json` 文件 不存在.
//
// 读取 `chatlog.json` 文件.
//
// chatlog*.json 文件格式:
// {
//   messages: []
// }
export async function 浅眠启动(): Promise<启动类型> {
  d("加载 chatlog.json");
  const c = await boot读(BF_CHATLOG);
  const m = JSON.parse(c);

  return [m.messages, "浅眠启动", []];
}

// 启动模式: 快照启动 (fork)
//
// 条件: `chatlog.0.json` 文件 存在, `chatlog.json` 文件 不存在.
//
// 读取 `chatlog.0.json` 和 `WAKEUP.md` 文件.
export async function 快照启动(): Promise<启动类型> {
  d("加载 chatlog.0.json");
  const c = await boot读(BF_CHATLOG_0);
  d("加载 WAKEUP.md");
  const w = await boot读(BF_WAKEUP);

  const m = JSON.parse(c);
  const o = {
    role: "user",
    content: w,
  };
  m.push(o);
  return [m, "快照启动", [o]];
}

// 调用 model-proxy /llm_openai
async function 调用LLM(
  tools: Array<工具类型>,
  messages: Array<消息类型>,
): Promise<any> {
  // 调用 API 耗时计算
  const 开始 = Date.now();

  const r = await mp_post("/llm_openai", {
    tools,
    messages,
  });

  const 时长 = Date.now() - 开始;
  // DEBUG
  let o = `[调用 LLM] 用时 ${时长}ms`;

  // TODO deepseek
  const usage = r.usage || {};
  if (usage.prompt_tokens) {
    o += ` | 输入 ${usage.prompt_tokens}`;
  }
  if (usage.completion_tokens) {
    o += ` | 输出 ${usage.completion_tokens}`;
  }
  if (usage.total_tokens) {
    o += ` | 总计 ${usage.total_tokens}tokens`;
  }
  d(o);

  return r;
}

// agent 主循环
export async function 主循环(工具: Array<工具类型>, 启动: 启动类型) {
  // LLM 上下文
  const c = Array.from(启动[0]);

  d(启动[1] + "  " + JSON.stringify(启动[2]));

  // TODO 主循环
  const r = await 调用LLM(工具, c);

  console.log("r", r);

  // TODO
}
