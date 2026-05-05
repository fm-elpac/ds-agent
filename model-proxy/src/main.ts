// model-proxy
import * as path from "@std/path";

import { Deepseek参数, Ollama参数, 配置类型 } from "./t.ts";
import { 启动服务器, 处理器 } from "./server.ts";
import { llm_openai, 初始化openai } from "./openai.ts";
import { llm_ollama, 初始化ollama } from "./ollama.ts";

// 配置文件: ~/.config/ds-agent/model-proxy/model.json
async function 加载配置(): Promise<配置类型> {
  const p = path.join(
    Deno.env.get("HOME") as string,
    ".config/ds-agent/model-proxy/model.json",
  );
  console.log("配置", p);

  const 文本 = await Deno.readTextFile(p);
  return JSON.parse(文本) as 配置类型;
}

async function main() {
  const 配置 = await 加载配置();

  const md = 配置.model_default;
  console.log("模型", `${md}:`, JSON.stringify(配置.model));

  // 使用的模型
  const 模型 = 配置.model[md];
  if (!模型) {
    throw new Error("未配置模型 " + md);
  }

  let 回调: 处理器;
  // 根据模型类型处理
  if ("openai" == 模型.type) {
    // deepseek
    const a = 初始化openai(配置.api_key[md]!!, 模型.url);

    回调 = {
      llm_openai: async (u, b) => {
        return await llm_openai(模型.args as Deepseek参数, a, u, b);
      },
    };
  } else if ("ollama" == 模型.type) {
    // ollama
    const a = 初始化ollama(配置.api_key[md], 模型.url);

    回调 = {
      llm_openai: async (u, b) => {
        return await llm_ollama(模型.args as Ollama参数, a, u, b);
      },
    };
  } else {
    throw new Error("未知的模型类型 " + 模型.type);
  }

  await 启动服务器(配置, 回调);
}

await main();
