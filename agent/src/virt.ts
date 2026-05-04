// 检查在 虚拟机 中运行
// systemd-detect-virt --vm

// 拒绝在 物理机 运行
export async function 检查虚拟机() {
  const c = new Deno.Command("systemd-detect-virt", {
    args: ["--vm"],
    stdin: "null",
    stderr: "inherit",
  });
  const { code, stdout } = await c.output();
  const r = new TextDecoder().decode(stdout);

  console.error(`ds-agent run in [${r.trim()}] (systemd-detect-virt --vm)`);
  if (0 != code) {
    console.error("ERROR: ds-agent must run in a virtual machine, exit !");
    Deno.exit(1);
  }
}
