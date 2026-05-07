# ds-agent/md-net: 白眠 超网文档库 (可选模块)

- 使用 markdown 文件格式的 (树状) 目录, AI 可自主决定 目录结构 / 文档内容.

- md 文件之间可以使用 超链接 相互引用, 形成网状结构.

  比如:

  ```markdown
  [名称](./相对/路径.md)
  ```

- 文档库 使用 git 进行版本控制.

  - 有外部专属的 gitea 实例 (AI 无法直接控制/关闭) 作为 git remote 服务器.

    每个 agent (主要, 非 临时) 在这个 gitea 实例上有自己的账号.

  - 系统知识库 (共享知识库) 作为 gitea 实例上的仓库.

    agent 可以对其 fork, clone 到自己的工作目录. 进行修改, git commit, git push
    等操作.

  - 专属 agent (系统知识库 维护员) 负责管理 主库 (main 分支).

    别的 agent 可以向 主库 提交 PR, 维护员 审核后 合并.

  - 也就是把 git 工具/协作生态 引入 agent 知识库.

---

TODO
