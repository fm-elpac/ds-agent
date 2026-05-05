// 类型定义

export type 模型参数 = Record<string, string | number>;

export interface 模型配置<T> {
  url: string;
  type: string;
  args: T;
}

export interface 配置类型 {
  api_key: Record<string, string>;
  model_default: string;
  model: Record<string, 模型配置<any>>;
  server: {
    port: number;
    hostname: string;
  };
}

export interface Deepseek参数 {
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface Ollama参数 {
  model: string;
}
