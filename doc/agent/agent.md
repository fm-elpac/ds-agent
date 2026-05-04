# ds-agent 常规助手 (regular agent) 说明文档

常规助手 (agent) 是 ds-agent 系统中用于执行具体任务的组件. 一个 ds-agent
系统中可能同时有多个 agent 在运行. 每个 agent 在一个 进程 (process) 中运行,
通常是普通 Linux 用户 (非 root) 权限.

agent 启动时, 会加载启动目录中的 `BOOT.md`, `WAKEUP.md` 等文件, 发送给 AI 大模型
(LLM), 进入 agent 循环. 如果没有更多工具调用, agent 代码就认为任务已经完成,
agent 进程会退出.

agent 使用工具的主要方式是运行命令 (shell 方式 或 非 shell 方式), 比如 `ls`.

agent 可以按需启动新的 agent (下级 agent).

## 程序代码

ds-agent 提供的 regular agent 可执行代码 (编译后) 位于
`/usr/lib/ds-agent/agent/agent.js`

运行方式为:

```sh
deno run -A /usr/lib/ds-agent/agent/agent.js
```

需要设置合适的 环境变量 才能正常启动.

启动时, 代码会通过 `systemd-detect-virt --vm` 检查当前是否为 虚拟机 环境,
如果不是, 直接退出. 也就是代码拒绝在 物理机 上运行.

---

如果必要 (regular agent 无法满足), 也可以写出新的 custom agent (自定义助手)
代码, 并启动运行.

regular agent 源代码位于: `/usr/src/ds-agent/agent/`

### 命令行参数

- `--stdout` (可选): 在进程的 stdout 输出调试日志. 默认不启用 (禁用调试日志),
  此时方便通过 stdin/stdout 进行 上/下级 agent 之间发送消息.

## 环境变量

agent 可以识别以下环境变量:

- `DS_AGENT_DIR` (必需): 启动目录.

  比如:

  ```sh
  DS_AGENT_DIR=/home/ai1/example-agent-1-boot/
  ```

  含有 agent 启动所必需的配置文件. 每个 agent 都应该使用专属自己的启动目录.

- `DS_AGENT_MODEL_PROXY` (必需): 通过 model-proxy 组件调用 AI 大模型 (LLM).

  比如:

  ```sh
  DS_AGENT_MODEL_PROXY=http://localhost:6666
  ```

  创建新的 agent 时, 可以使用与自身相同的配置 (继承).

- `DS_AGENT_MODEL_PROXY_USERPASS` (必需): 用于 model-proxy 认证的令牌.

  比如:

  ```sh
  DS_AGENT_MODEL_PROXY_USERPASS=aa:XXX
  ```

  创建新的 agent 时, 应该创建新的 令牌, 并配置新的 agent 使用新的 令牌.

- `DS_AGENT_MODEL` (可选): 覆盖调用 AI 模型时的参数.

  比如:

  ```sh
  DS_AGENT_MODEL='{"model":"deepseek-v4-flash","temperature":0.7,"max_tokens":32768}'
  ```

  通常无需设置, 会使用默认参数调用 AI 模型.

- `DS_AGENT_DOC` (可选): 指向 ds-agent 系统说明文档.

  通常无需设置, 默认为 `/usr/src/ds-agent/doc/agent/README.md`

---

进程的 当前工作目录 (cwd): 通常存放 agent 需要操作的数据文件.

当 agent 需要生成 临时文件 时, 一般也放在这个目录.

## 启动目录 (agent-boot)

具体示例详见 `./example-agent-boot/` 目录.

启动目录含有以下文件:

- `BOOT.md` (必需): 对整体 (运行) 环境进行简要描述.

  agent 启动时, 此文件的内容会作为 user 消息发送给 LLM.

  如果缺少 `BOOT.md` 文件, agent 不会启动, 代码会直接退出.

- `WAKEUP.md` (必需): 包含 本次任务 的具体描述, 也就是要让 agent 做什么.

  agent 启动时, 此文件的内容会拼接在 `BOOT.md` 后面, 发送给 LLM.

  如果 agent 进行 **深睡眠** (deep sleep), 也就是 agent 进程退出时不会生成
  `chatlog.json` 文件. 那么在退出之前, 可以把需要的说明写入 `WAKEUP.md` 文件,
  agent 下次启动 (醒来) 时, 就会读取.

  如果缺少 `WAKEUP.md` 文件, agent 不会启动, 代码会直接退出. 所以, 如果 agent
  完成了任务 (无需睡眠), 可以 **重命名** 此文件, 阻止再次启动, 比如:

  ```sh
  mv WAKEUP.md WAKEUP.old.md
  ```

- `mcp.json` (可选): 给 agent 配置额外的 MCP 工具.

- `chatlog.json` (可选): 用于 agent **浅睡眠** (shallow sleep) 功能.

  浅睡眠时, agent 进程退出前会生成此文件, 保存完整的 LLM 聊天记录 (上下文).

  agent 启动时, 如果此文件存在, agent 会跳过加载 `BOOT.md` 和 `WAKEUP.md`
  等启动流程, 直接加载 `chatlog.json` 文件, 并继续与 LLM 的会话.

- `chatlog.1.json` (可选): 仅用于 调试, 由 agent 代码自动生成.

如果需要, 这个目录还可以存放更多数据文件 (比如 任务的更多说明), 供 agent
启动后读取.

## 内置工具

当没有配置额外 MCP 工具时 (`mcp.json` 不存在), agent 内置有以下工具:

- `ds_agent_run`: 运行命令 (作为本进程的 child process).

- `ds_agent_sleep`: 用于 agent 睡眠 功能 (浅睡眠).

- `ds_agent_exit`: 异常退出本进程 (agent 进程).

- `ds_agent_new`: 创建新的下级 agent 令牌 (用于启动新的 agent).

- `ds_agent_stdout`: 写入本进程 stdout.

- `ds_agent_stderr`: 写入本进程 stderr.

- `ds_agent_stdin`: 读取本进程 stdin.

如果配置了 `mcp.json`, 其中的 MCP 工具无法覆盖此处的内置工具
(内置工具优先级更高).

---

以下工具暂未实现 (用于后台运行命令):

- `ds_agent_bg_ps` 查看运行的后台命令
- `ds_agent_bg_kill` 结束后台命令
- `ds_agent_bg_poll` 查看后台命令的输出 (stdout/stderr)
- `ds_agent_bg_input` 向后台命令的 stdin 写入数据

TODO

## 创建并启动新的 agent

创建新的 agent 流程如下:

- (1) 给新的 agent 起一个简短的名称, 比如 `test-agent-1`

  如果要启动多个 agent, 名称不要重复.

- (2) 创建新的 agent 启动目录, 比如:

  ```sh
  mkdir -p ~/test-agent-1-boot/
  ```

- (3) 写入所需的启动文件, 比如 `BOOT.md`, `WAKEUP.md`.

- (4) 调用 `ds_agent_new` 工具, 创建新的 agent 令牌.

---

启动新的 agent 则分为 2 种方式 (按需选择):

### 1 直接启动

使用类似 `deno run -A` 的方式, 启动新的 agent 即可. 新的 agent 将作为本进程的
child process 运行.

注意设置好所需的环境变量, 比如 `DS_AGENT_DIR`, `DS_AGENT_MODEL_PROXY`,
`DS_AGENT_MODEL_PROXY_USERPASS` (新的令牌).

这种方式的主要缺点是, 新的 agent 无法重启自身.

这种方式的主要优点是, 方便使用 stdin/stdout 在 agent 之间发送消息. (TODO
此功能待实现)

### 2 作为 systemd user service 启动

- (1) 在 `~/.config/systemd/user/` 目录写入新的 unit 文件, 具体示例见
  `./example-agent-1.service` 文件.

- (2) 加载新的用户服务:

  ```sh
  systemctl --user daemon-reload
  ```

- (3) 使用类似 `systemctl --user start example-agent-1` 的命令, 启动新的 agent.

  以这种方式启动的 agent, 可以使用类似 `systemctl --user restart`
  的命令重启自身.

- (4) 可以使用类似 `journalctl --user` 的命令查看运行日志, 使用类似
  `systemctl --user status` 的命令查看运行状态.

---

TODO
