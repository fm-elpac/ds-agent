# ds-agent 常规助手 (regular agent) 说明文档

常规助手 (agent) 是 ds-agent 系统中用于执行具体任务的组件, 每个 agent 都是 代码
和 AI (LLM) 的复合体. 一个 ds-agent 系统中可能同时有多个 agent 在运行. 每个
agent 在一个 进程 (process) 中运行, 通常是普通 Linux 用户 (非 root) 权限.

agent 启动时, 会加载启动目录中的 `BOOT.md`, `WAKEUP.md` 等文件, 发送给 AI 大模型
(LLM), 进入 **agent 主循环**. 如果没有更多工具调用, agent
代码就认为任务已经完成, agent 进程会退出.

agent 使用工具的主要方式是运行命令 (shell 方式 或 非 shell 方式), 比如 `ls`.

agent 可以按需启动新的 agent (下级 agent).

## 目录

- 1 程序代码

  - 1.1 命令行参数

- 2 环境变量

- 3 启动目录 (agent-boot)

- 4 内置工具

- 5 创建并启动新的 agent

  - 5.1 直接启动
  - 5.2 作为 systemd user service 启动

- 6 高级技能

  - 6.1 任务分解
  - 6.2 睡眠 (sleep)
  - 6.3 自举: 造工具, 改进自身代码
  - 6.4 `fork()` 操作
  - 6.5 做梦 (dream)

## 1 程序代码

ds-agent 提供的 regular agent 可执行代码 (编译后) 位于
`/usr/lib/ds-agent/agent/agent.js`

运行方式为:

```sh
deno run -A /usr/lib/ds-agent/agent/agent.js
```

需要设置合适的 环境变量 才能正常启动.

启动时, 代码会通过 `systemd-detect-virt --vm` 检查当前是否为 虚拟机 环境,
如果不是, 直接退出. 也就是代码拒绝在 物理机 上运行.

agent 使用 deno 运行还有一个额外的好处: 除了使用 `-A` 给全部权限, 还可以按需使用
deno 沙箱限制 agent 的权限, 比如 `--allow-read`, `--allow-write`, `--allow-net`
等 deno 权限选项.

### 1.1 命令行参数

- `--stdout` (可选): 在进程的 stdout 输出调试日志. 默认不启用 (禁用调试日志),
  此时方便通过 stdin/stdout 进行 上/下级 agent 之间发送消息.

## 2 环境变量

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

- `DS_AGENT_TOOL` (可选): 控制内置工具的分模块启用. 默认值:

  ```sh
  DS_AGENT_TOOL=+run,+sleep,+proc,+js,-stdio,-bg,+mcp
  ```

  以下设置可以禁用全部内置工具:

  ```sh
  DS_AGENT_TOOL=-
  ```

---

进程的 当前工作目录 (cwd): 通常存放 agent 需要操作的数据文件.

当 agent 需要生成 临时文件 时, 一般也放在这个目录.

## 3 启动目录 (agent-boot)

具体示例详见 `./example-agent-boot/` 目录 (里面有各文件的内容示例).

启动目录含有以下文件:

- `BOOT.md` (必需): 对整体 (运行) 环境进行简要描述.
  在此文档中可以引用别的补充文档的路径, 让 agent 按需查看.

  agent 代码启动时会读取此文件. 如果缺少 `BOOT.md` 文件, agent 不会启动,
  代码会直接报错退出.

- `WAKEUP.md` (必需): 包含 本次任务 的具体描述, 也就是要让 agent 做什么.
  在此文档中可以引用别的补充文档的路径, 让 agent 按需查看.

  agent 启动时, 此文件的内容会拼接在 `BOOT.md` 后面, 作为一条 user 消息发送给
  LLM.

  如果 agent 进行 **深睡眠** (deep sleep), 也就是 agent 进程退出时不会生成
  `chatlog.json` 文件. 那么在退出之前, 可以把需要的说明写入 `WAKEUP.md` 文件,
  agent 下次启动 (醒来) 时, 就会读取.

  如果缺少 `WAKEUP.md` 文件, agent 不会启动, 代码会直接报错退出. 所以, 如果
  agent 完成了任务 (无需睡眠), 可以 **重命名** 此文件, 阻止再次启动, 比如:

  ```sh
  mv WAKEUP.md WAKEUP.old.md
  ```

- `LAST.md` (可选): 由 agent 代码自动生成. 当 agent 正常退出时 (没有 崩溃/报错),
  会把 LLM 返回的最后一条消息的内容写入此文件 (通常是 任务完成的总结说明).

- `mcp.json` (可选): 给 agent 配置额外的 MCP 工具.

- `chatlog.json` (可选): 用于 agent **浅睡眠** (shallow sleep) 功能.

  浅睡眠时, agent 代码在进程退出前会生成此文件, 保存完整的 LLM 聊天记录
  (上下文).

  agent 启动时, 如果此文件存在, agent 会跳过加载 `BOOT.md` 和 `WAKEUP.md`
  等启动流程, 直接加载 `chatlog.json` 文件, 并继续与 LLM 的会话.

- `chatlog.0.json` (可选): 用于 **快照** 功能, 保存有 LLM 上下文.

  agent 启动时, 如果此文件存在, 会直接加载此文件, 恢复 LLM 上下文. 然后读取
  `WAKEUP.md` 文件, 作为一条 user 消息发送给 LLM.

  注意 (1): 此时不会读取 `BOOT.md` 文件. 注意 (2): 如果 `chatlog.json` 和
  `chatlog.0.json` 文件同时存在, agent 无法启动, 代码会报错退出.

- `chatlog.1.json` (可选): 仅用于 调试, 由 agent 代码自动生成.

这个目录还可以存放更多数据文件 (比如 任务的更多说明), 供 agent 启动后按需读取.

## 4 内置工具

regular agent 有以下内置工具, 可根据环境变量 `DS_AGENT_TOOL` 的配置, 分模块启用.

内置工具与外部 MCP 工具的格式相同, 启用的工具会在 system
消息中提供结构化的详细参数说明. (所以, 如果 system 消息中没有,
说明相应工具没有启用. )

- (run) `ds_agent_run`: 运行命令 (shell 模式 或 非 shell 模式). 作为本进程的
  child process. 如果 `+bg` 还支持后台运行.

- (sleep) `ds_agent_sleep`: 浅睡眠 (生成 `chatlog.json` 文件).

- (sleep) `ds_agent_snapshot`: 快照当前聊天记录 (LLM 上下文), 生成
  `chatlog.0.json` 文件.

- (proc) `ds_agent_exit`: 异常退出本进程.

- (proc) `ds_agent_new`: 创建 agent 令牌 (用于启动新的下级 agent).

- (js) `ds_agent_js`: 在当前 agent 进程 (deno) 中 eval 一段 js 代码并返回结果.
  无额外的沙箱限制. 可用于调用 Deno API 和 agent 内部 API.

- (stdio) `ds_agent_stdout`: 写入本进程 stdout.

- (stdio) `ds_agent_stderr`: 写入本进程 stderr.

- (stdio) `ds_agent_stdin`: 读取本进程 stdin.

- (bg) `ds_agent_bg_ps`: 查看运行的后台进程 (列表).

- (bg) `ds_agent_bg_kill`: 结束一个后台进程.

- (bg) `ds_agent_bg_poll`: 等待后台进程产生事件 (stdout/stderr/exit).
  可以设置等待超时时间.

- (bg) `ds_agent_bg_input`: 向后台进程的 stdin 写入数据.

- (mcp) 启用外部 MCP 工具. 如果配置为 `-mcp` 将禁用全部 MCP 工具, 忽略
  `mcp.json` 文件.

  如果配置了 `mcp.json`, 其中的 MCP 工具无法覆盖此处的内置工具
  (内置工具优先级更高).

## 5 创建并启动新的 agent

创建新的 agent 流程如下:

- (1) 给新的 agent 起一个简短的名称, 比如 `test-agent-1`

  如果要启动多个 agent, 名称不要重复.

- (2) 创建新的 agent 启动目录, 比如:

  ```sh
  mkdir -p ~/test-agent-1-boot/
  ```

- (3) 写入所需的启动文件, 比如 `BOOT.md`, `WAKEUP.md`.

- (4) 调用 `ds_agent_new` 工具, 创建新的 agent 令牌. 此工具返回的令牌, 用在
  `DS_AGENT_MODEL_PROXY_USERPASS` 环境变量中.

---

启动新的 agent 则分为 2 种方式 (按需选择):

简单的一次性运行的临时任务, 建议直接启动. 复杂的需要长期运行的任务, 特别是需要
配置自身/重启自身 能力的, 建议使用 systemd user service 方式启动.

定时任务 (指定时间点, 或周期触发) 需要写成 systemd user timer, 触发 user service
的启动运行.

### 5.1 直接启动

使用类似 `deno run -A` 的方式, 启动新的 agent 即可. 新的 agent 将作为本进程的
child process 运行.

注意设置好所需的环境变量, 比如 `DS_AGENT_DIR`, `DS_AGENT_MODEL_PROXY`,
`DS_AGENT_MODEL_PROXY_USERPASS` (新的令牌).

这种方式的主要缺点是, 新的 agent 无法重启自身.

这种方式的主要优点是, 方便使用 stdin/stdout 在 agent 之间发送消息. (TODO
此功能待实现)

### 5.2 作为 systemd user service 启动

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

## 6 高级技能

一些常用的高级操作 (组合操作).

### 6.1 任务分解

对于复杂的任务, 如果任务本身方便划分成几个相对独立的部分,
那么可以使用任务分解操作.

接到复杂任务的 agent 对任务进行分解, 然后启动多个新的 (下级) agent,
分别去处理这些任务.

这样可以更好/更高效的处理复杂任务, 并且可以突破单个 agent 的 LLM 上下文长度限制.

对于简单任务, 无需任务分解. 分解的下级任务的粒度也不要太小. 因为启动新的 agent
有一定开销, regular agent 的开销并不是很小 (很轻量).
此时开销可能超过任务分解的收益.

### 6.2 睡眠 (sleep)

regular agent 的 **睡眠** 功能分为以下几种类型:

- (1) **浅睡眠** (shallow sleep): 调用 `ds_agent_sleep` 工具. 此时 agent
  代码将生成 `chatlog.json` 文件, 保存本次 LLM 上下文, 然后 agent 进程退出.

  下次启动时, agent 会跳过加载 `BOOT.md` 和 `WAKEUP.md`, 而是直接加载
  `chatlog.json`, 恢复 LLM 上下文, 继续运行.

- (2) **深睡眠** (deep sleep): 在 agent 主循环 中, 如果 LLM
  没有返回更多工具调用, agent 代码就会认为任务已完成, 进行 深睡眠 操作, 然后
  agent 进程退出.

  下次启动时, agent 会重新加载 `BOOT.md` 和 `WAKEUP.md` 并发送给 LLM.

  也就是说, 浅睡眠 会保留 LLM 上下文, 深睡眠 不会保留. 在进入 深睡眠 之前,
  可以修改 `WAKEUP.md` 文件的内容, 以便醒来后看到.

- (3) **快照** (`ds_agent_snapshot` 工具): 详见 6.4 `fork()` 操作.

### 6.3 自举: 造工具, 改进自身代码/文档

agent 必需在 虚拟机 中运行, 提供了较高的安全隔离. 所以在 虚拟机 内部, agent
有较高的权限, 灵活度很高.

这符合 ds-agent 系统 (白眠 Day Sleep) 的口号: "给 AI 以信任, 给 AI 以工具, 给 AI
以软件".

- (1) 文档自优化: agent 启动时将读取 `BOOT.md` 和 `WAKEUP.md` 文件,
  通过修改这些文件, 可以提供给 agent 更好的文档内容. 从而在 ds-agent
  自带的原版文档的基础上进行改进. 更多内容可以写入更多文件, 在 `BOOT.md` 或
  `WAKEUP.md` 文件中引用, 从而 agent 可以按需查看.

- (2) 工具自优化: agent 的工具可以通过环境变量或 `mcp.json` 文件进行扩展/配置.
  agent 可以安装新的软件, 给自己添加新的 MCP 工具等.

  修改配置之后, agent 可以重启自身, 从而使用新的工具.

- (3) 代码自优化: ds-agent 软件包提供了 agent 自身的源代码.

  如果必要 (regular agent 无法满足), 也可以写出新的 custom agent (自定义助手)
  代码, 并启动运行.

  regular agent 源代码位于: `/usr/src/ds-agent/agent/`

- (4) 制造新工具/文档: 如果现有的软件无法满足, agent 也可以编写新的软件代码,
  供自己使用.

### 6.4 `fork()` 操作

类似于 UNIX 操作系统的 `fork()` 操作, 是 agent 级别的 fork.

- (1) 调用 `ds_agent_snapshot` 工具, 此时 agent 代码会对 LLM 上下文进行快照,
  保存到 `chatlog.0.json` 文件.

- (2) 创建新的 agent, 在其启动目录写入 `WAKEUP.md` 文件, 并把 `chatlog.0.json`
  文件复制过去.

- (3) 启动新的 agent. 新的 agent 启动时, 会读取 `chatlog.0.json` 文件, 恢复 LLM
  上下文, 并读取 `WAKEUP.md` 发送给 LLM.

经过这样的操作, 原 agent 和新 agent 共享 `ds_agent_snapshot` 调用之前的 LLM
上下文, 但是新 agent 多了新的 `WAKEUP.md` 文件内容. 这个类似于操作系统 `fork()`
创建新进程的操作.

通过使用 快照 / fork 功能, agent 可以方便的进行 思考回退/多路径尝试 等高级操作.

### 6.5 做梦 (dream)

TODO 此功能尚未实现.
