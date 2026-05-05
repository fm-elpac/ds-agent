// 调用 ollama API
import { Ollama } from "ollama";

import { Ollama参数 } from "./t.ts";

// 初始化 客户端
export function 初始化ollama(_key: string | undefined, host: string) {
  return new Ollama({
    host,
  });
}

// 请求 LLM
export async function llm_ollama(
  d: Ollama参数,
  a: Ollama,
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
    // TODO
  };
  // 请求 覆盖 默认参数
  Object.assign(参数, r);

  // DEBUG
  console.log(p + "请求", JSON.stringify(参数));

  // 调用 API 耗时计算
  const 开始 = Date.now();

  const 结果 = await a.chat(参数);

  const 时长 = Date.now() - 开始;

  // DEBUG
  console.log(p + "结果", JSON.stringify(结果));

  // const usage = (结果.usage || {}) as any;
  // console.log(
  //   p,
  //   `[调用 ollama] 用时 ${时长}ms | 输入 ${usage.prompt_tokens} | 输出 ${usage.completion_tokens} | 总计 ${usage.total_tokens}tokens`,
  // );
  // DEBUG
  console.log(p, `[调用 ollama] 用时 ${时长}ms`);

  return new Response(JSON.stringify(结果), {
    headers: {
      "content-type": "application/json",
    },
  });
}
