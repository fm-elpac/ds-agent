# 白眠 (Day Sleep) AI 助手 (ds-agent) 整体架构

## 设计哲学 (指导思想)

- **提供 机制, 而非 策略**: 白眠 提供 (固定/底层) 机制, AI (大模型) 提供
  (动态/可持续优化) 策略.

- **邀请 AI "住进" 虚拟机**: 虚拟机 提供强隔离/安全, 虚拟机内部给 AI
  高灵活/权限.

  KVM 嵌套虚拟化 / podman 容器 等 虚拟化技术, 可以大量使用.

  口号: 给 AI 以信任, 给 AI 以工具, 给 AI 以软件.

- 不要另搞一套, 充分融入现有的 Linux (UNIX) 软件系统.

## 顶级节点

(top level node) 虚拟机.

TODO

## agent 类型

ds-agent 系统中有以下种类的 agent:

- **顶级助手** (master agent): 执行系统管理任务 (用于管理 ds-agent 系统自己).

  代码由 ds-agent 软件包提供.

- **常规助手** (regular agent): 执行具体任务 (最常用).

  代码由 ds-agent 软件包提供.

- **自定义助手** (custom agent): 当 常规助手 无法满足时使用.

  代码由 AI 写出.

## 依赖软件

这些软件被 `ds-agent` 软件包列为依赖, 所以应该已经在系统上安装了:

- `systemd`
- `deno`
- `podman`
- `git`
- `curl`
- ssh
- `nodejs`
- `pnpm`
- `python`
- `uv`
- `sqlite`
- `rsync`
- `chromium`
- `noto-fonts`
- `fish`

## 可选模块

- md-net: 超网文档库

  文档位于: `/usr/src/ds-agent/md-net/README.md`

## 外部数据备份系统

纯程序代码的软件, 没有 AI. 完全由 人类 (用户) 管理, AI 无法操作
(无权限删除数据).

定期对 AI 操作的数据文件 进行 快照/备份. 用于 AI 误删除/误操作 之后的灾难恢复.

注意: 此处对 防止数据丢失 (误删除) 进行了优化, 但是没有针对 数据泄露 的防护措施.
如果需要防止重要数据泄露, 请使用 物理隔离/网络隔离, 本地部署大模型, 禁止访问外网
等更强力的外部安全措施.

---

使用 胖喵必快 (`pmbs` + `rsync`) 系统: <https://github.com/fm-elpac/pmbs>

底层基于 btrfs 快照, 在另一个 虚拟机 (服务器) 中专门进行定期数据备份.

---

TODO
