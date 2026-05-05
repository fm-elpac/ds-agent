// 调用 openai API
//import type { ChatCompletionCreateParamsNonStreaming } from "openai";
import { OpenAI } from "openai";

import { Deepseek参数 } from "./t.ts";

// 初始化 客户端
export function 初始化openai(apiKey: string, baseURL: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

// 实际请求 openai (deepseek)
export async function llm_openai(
  d: Deepseek参数,
  a: OpenAI,
  [u, c]: [string, number],
  b: string,
) {
  const r = JSON.parse(b);

  // 日志 前缀
  const p = `❀ (${u}) ${c} `;

  // 默认参数
  const 参数 = {
    //messages,
    //tools,

    model: d.model,
    temperature: d.temperature,
    max_tokens: d.max_tokens,
    tool_choice: "auto",
  };
  // 请求 覆盖 默认参数
  Object.assign(参数, r);

  // DEBUG
  console.log(p + "请求", JSON.stringify(参数));

  // 调用 API 耗时计算
  const 开始 = Date.now();

  const 结果 = await a.chat.completions.create(
    //参数 as ChatCompletionCreateParamsNonStreaming,
    参数 as any,
  );

  const 时长 = Date.now() - 开始;

  // DEBUG
  console.log(p + "结果", JSON.stringify(结果));

  const usage = (结果.usage || {}) as any;
  // DEBUG
  console.log(
    p,
    `[调用 deepseek] 用时 ${时长}ms | 输入 ${usage.prompt_tokens} | 输出 ${usage.completion_tokens} | 总计 ${usage.total_tokens}tokens`,
  );

  return new Response(JSON.stringify(结果), {
    headers: {
      "content-type": "application/json",
    },
  });
}
