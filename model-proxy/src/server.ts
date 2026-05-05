// http 服务, 令牌 处理
import { ulid } from "@std/ulid";
import { decodeBase64, decodeHex, encodeHex } from "@std/encoding";
import { timingSafeEqual } from "@std/crypto";

import { 配置类型 } from "./t.ts";

interface 令牌类型 {
  检查: (u: string, p: string) => [string, number] | undefined;
  创建: (u: string) => string;
}

// 基本 HTTP 认证
async function 令牌(): Promise<令牌类型> {
  // 生成 256bit (32 字节) 随机数据 (hex)
  function 随机(): Uint8Array {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return b;
  }

  // 存储 用户名/密码 对
  const k: Map<string, Uint8Array> = new Map();
  // 请求计数
  const c: Map<string, number> = new Map();

  function 检查(u: string, p: string): [string, number] | undefined {
    const p1 = k.get(u);
    if (!p1) {
      return;
    }

    const p2 = decodeHex(p);
    if (timingSafeEqual(p1, p2)) {
      // 增加计数
      const i = c.get(u)!! + 1;
      c.set(u, i);

      return [u, i];
    }
    return;
  }

  function 创建(u: string): string {
    const p = 随机();
    k.set(u, p);
    c.set(u, 0);

    return encodeHex(p);
  }

  // 初始化 master-agent 令牌
  const u0 = "master-agent";
  const p0 = 创建(u0);
  console.log(`令牌 ${u0}:${p0}`);

  await Deno.writeTextFile("master-agent.pass", `${u0}:${p0}`);

  return {
    检查,
    创建,
  };
}

function 检查令牌(
  检查: (u: string, p: string) => [string, number] | undefined,
  a: string | null,
): [string, number] | undefined {
  if ((!a) || (!a.startsWith("Basic "))) {
    return;
  }
  // 解码 base64
  const b = decodeBase64(a.slice(6));
  const d = new TextDecoder().decode(b);
  const i = d.indexOf(":");
  if (i < 0) {
    return;
  }
  return 检查(d.slice(0, i), d.slice(i + 1));
}

async function 新令牌(b: string, u: [string, number], a: 令牌类型) {
  const { name } = JSON.parse(b) as { name: string };
  // 名称不得含有 `/` 字符
  if (name.includes("/")) {
    return new Response("name 不能有 / 字符", {
      status: 400,
    });
  }
  // 名称不得含有 `:` 字符
  if (name.includes(":")) {
    return new Response("name 不能有 : 字符", {
      status: 400,
    });
  }

  // 实际创建
  const n = u[0] + "/" + name;
  const p = a.创建(n);

  console.log("新令牌", n);

  const r = {
    userpass: n + ":" + p,
  };
  return new Response(JSON.stringify(r), {
    headers: {
      "content-type": "application-json",
    },
  });
}

export interface 处理器 {
  // POST /llm_openai
  llm_openai: (
    u: [string, number],
    b: string,
  ) => Promise<Response>;
}

function r405() {
  return new Response("405", {
    status: 405,
  });
}

async function 路由(
  req: Request,
  url: URL,
  u: [string, number],
  a: 令牌类型,
  回调: 处理器,
) {
  // 检查路径
  const { pathname } = url;
  const { method } = req;

  if ("/llm_openai" == pathname) {
    if ("POST" == method) {
      const b = await req.text();
      return await 回调.llm_openai(u, b);
    }
    return r405();
  } else if ("/new" == pathname) {
    if ("POST" == method) {
      try {
        const b = await req.text();
        return await 新令牌(b, u, a);
      } catch (e) {
        console.error(e);

        return new Response("400", {
          status: 400,
        });
      }
    }
    return r405();
  }

  return new Response("404", {
    status: 404,
  });
}

export async function 启动服务器(配置: 配置类型, 回调: 处理器) {
  const a = await 令牌();

  // 使用 ULID 标记每次启动的 model-proxy 实例
  const id = ulid();
  console.log("model-proxy", id);

  Deno.serve(配置.server, async (req) => {
    const url = new URL(req.url);
    // 健康检查
    if ("/health" == url.pathname) {
      if ("GET" == req.method) {
        return new Response("ok. " + id);
      }
      return r405();
    }

    // 检查 请求令牌
    const u = 检查令牌(a.检查, req.headers.get("authorization"));
    if (!u) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="ds-model-proxy"',
        },
      });
    }

    return await 路由(req, url, u, a, 回调);
  });

  //console.log("监听", `http://${配置.server.hostname}:${配置.server.port}`);
}
