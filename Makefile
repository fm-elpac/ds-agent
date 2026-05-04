
# 打包源代码, 用于 AUR 软件包
ds-agent-src:
	mkdir -p tmp
	- rm tmp/ds-agent-src.tar
	tar -cvf tmp/ds-agent-src.tar \
		.github doc \
		agent cli dsd master-agent model-proxy \
		.gitignore deno.json LICENSE Makefile README.md \
		aur/.gitignore aur/PKGBUILD aur/README.md
	cp tmp/ds-agent-src.tar aur
.PHONY: ds-agent-src
