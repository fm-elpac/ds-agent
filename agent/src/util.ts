// 多模块共用底层代码
import * as path from "@std/path";
import { encodeBase64 } from "@std/encoding";

export interface 命令行参数类型 {
  stdout: boolean;
}

export interface 消息类型 {
  role: string;
  content: string;
}

export interface 工具类型 {
  // TODO
}

// agent 启动目录 重要文件名称
// BOOT.md
export const BF_BOOT = "BOOT.md";
// WAKEUP.md
export const BF_WAKEUP = "WAKEUP.md";
// LAST.md
export const BF_LAST = "LAST.md";
// chatlog.json
export const BF_CHATLOG = "chatlog.json";
// chatlog.0.json
export const BF_CHATLOG_0 = "chatlog.0.json";
// chatlog.1.json
export const BF_CHATLOG_1 = "chatlog.1.json";
// mcp.json
export const BF_MCP = "mcp.json";

// 全局变量 (配置)
const etc = {
  // 调试输出
  debug_stdout: false,

  // 环境变量 (原始值)
  env: {
    // 必需
    DS_AGENT_DIR: "",
    DS_AGENT_MODEL_PROXY: "",
    DS_AGENT_MODEL_PROXY_USERPASS: "",

    // 可选
    DS_AGENT_MODEL: "" as string | undefined,
    DS_AGENT_DOC: "" as string | undefined,
    DS_AGENT_TOOL: "" as string | undefined,
  },

  // model-proxy 组件
  // 用户名
  mp_user: "",
  // 令牌 (hex 格式, 直接用于 HTTP 请求)
  mp_userpass: "",
};

export function 初始化调试输出(a: 命令行参数类型) {
  etc.debug_stdout = a.stdout;
}

// 调试输出 (stdout)
export function d(o: any) {
  if (etc.debug_stdout) {
    console.log("❀", o);
  }
}

function 必需环境变量(名称: string): string {
  const v = Deno.env.get(名称);
  if (!v) {
    console.error("ERROR: env " + 名称 + " must set !");
    Deno.exit(1);
  }
  return v;
}

function 可选环境变量(名称: string): string | undefined {
  return Deno.env.get(名称);
}

// 读取 环境变量, 初始化配置
export function 初始化环境配置() {
  // 读取环境变量 (原始值)
  etc.env.DS_AGENT_DIR = 必需环境变量("DS_AGENT_DIR");
  etc.env.DS_AGENT_MODEL_PROXY = 必需环境变量("DS_AGENT_MODEL_PROXY");
  etc.env.DS_AGENT_MODEL_PROXY_USERPASS = 必需环境变量(
    "DS_AGENT_MODEL_PROXY_USERPASS",
  );
  etc.env.DS_AGENT_MODEL = 可选环境变量("DS_AGENT_MODEL");
  etc.env.DS_AGENT_DOC = 可选环境变量("DS_AGENT_DOC");
  etc.env.DS_AGENT_TOOL = 可选环境变量("DS_AGENT_TOOL");

  // 解析参数

  // 处理 model-proxy
  const mp_i = etc.env.DS_AGENT_MODEL_PROXY_USERPASS.indexOf(":");
  etc.mp_user = etc.env.DS_AGENT_MODEL_PROXY_USERPASS.slice(0, mp_i);
  etc.mp_userpass = encodeBase64(
    new TextEncoder().encode(etc.env.DS_AGENT_MODEL_PROXY_USERPASS),
  );

  // 必需输出的日志 (stderr) 无法关闭
  console.error("DS_AGENT_DIR=" + etc.env.DS_AGENT_DIR);
  console.error(`agent  (${etc.mp_user}) ${etc.env.DS_AGENT_MODEL_PROXY}`);
}

// 返回 DS_AGENT_TOOL
export function 工具配置(): string {
  if (etc.env.DS_AGENT_TOOL) {
    return etc.env.DS_AGENT_TOOL;
  }
  return "";
}

// 计算相对于 agent 启动目录 的路径
export function boot路径(路径: string = ""): string {
  return path.join(etc.env.DS_AGENT_DIR, 路径);
}

export function boot_dir(path: string = ""): string {
  return boot路径(path);
}

// 在 agent 启动目录 检查文件是否存在
export async function boot存在(名称: string): Promise<boolean> {
  try {
    const i = await Deno.stat(boot路径(名称));
    return i.isFile;
  } catch (e) {
    // 忽略错误
    return false;
  }
}

// 在 agent 启动目录 读取 文本文件
export async function boot读(名称: string): Promise<string> {
  return await Deno.readTextFile(boot路径(名称));
}

// 在 agent 启动目录 写入 文本文件
export async function boot写(名称: string, 内容: string) {
  return await Deno.writeTextFile(boot路径(名称), 内容);
}

// 请求 model-proxy HTTP 接口 (POST)
export async function mp_post(接口: string, 数据: any): Promise<any> {
  const url = etc.env.DS_AGENT_MODEL_PROXY + 接口;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      // 基本 HTTP 认证
      "authorization": `Basic ${etc.mp_userpass}`,
    },
    body: JSON.stringify(数据),
  });

  // TODO 错误处理
  return await r.json();
}
