#!/usr/bin/env node
/**
 * NiuLai 插件校验：不依赖 dsh 或任何第三方包，验证四层：
 *  1. 两个入口的语法（node --check）；
 *  2. package.json 的 dsh manifest 完整性与文件存在性；
 *  3. bundle patch 与 preset 文件的结构要点；
 *  4. 宿主半部烟囱测试：假 ctx + 临时 DSH_HOME，断言 preset 真被同步、
 *     声明段落真被注册；浏览器半部用假 __ModuleLoader__ 断言导出形状。
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const check = (label, fn) => {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${label}\n     ${error.message}`);
  }
};

// ── 1. 语法 ──────────────────────────────────────────────────────────────
for (const file of ["lib/index.js", "lib/client.js", "scripts/check.mjs"]) {
  check(`syntax: ${file}`, () => {
    const r = spawnSync(process.execPath, ["--check", join(root, file)], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  });
}

// ── 2. manifest ──────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("manifest: name/type/entry", () => {
  assert.equal(pkg.name, "niulai");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.exports["."], "./lib/index.js");
  assert.equal(pkg.exports["./client"], "./lib/client.js");
});
check("manifest: dsh.bundle.patch 指向存在的文件", () => {
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.ok(existsSync(join(root, "cordis.patch.yml")));
});
check("manifest: dsh.client 声明 web 平台", () => {
  assert.equal(pkg.dsh.client.platform, "web");
});
check("manifest: 无 install-time 脚本（git 安装免 allowBuilds）", () => {
  for (const key of ["prepare", "preinstall", "install", "postinstall"]) {
    assert.ok(!pkg.scripts?.[key], `scripts.${key} 会要求用户授权构建`);
  }
});

// ── 3. patch 与 preset 结构 ──────────────────────────────────────────────
check("patch: 插入 niulai 行", () => {
  const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
  assert.match(patch, /-\s*insert:/);
  assert.match(patch, /name:\s*niulai/);
  assert.ok(!patch.includes("\t"), "YAML 不允许制表符");
});
check("preset: 文件齐全且 persona 行就位", () => {
  const dir = join(root, "presets", "niulai");
  assert.ok(existsSync(join(dir, "preset.yml")));
  const agent = readFileSync(join(dir, "agent.cordis.yml"), "utf8");
  assert.match(agent, /@deepseek-ai\/dsh-persona/);
  assert.match(agent, /牛来/);
  assert.ok(!agent.includes("\t"), "YAML 不允许制表符");
});
check("client: v0.3 特性标记齐全（盗摄滤镜/票房计数/控制台 API/常驻布景）", () => {
  const client = readFileSync(join(root, "lib", "client.js"), "utf8");
  for (const marker of [
    "niulai-pirate",
    "niulai-boxoffice",
    "window.niulai",
    "buildPoster",
    "MILESTONES",
    "niulai-decor",
    "buildDecor",
    "nd-lobby",
  ]) {
    assert.ok(client.includes(marker), `缺特性标记: ${marker}`);
  }
});
check("assets: decor 轮播覆盖全部 8 张栅格", () => {
  const manifest = JSON.parse(readFileSync(join(root, "assets", "manifest.json"), "utf8"));
  const rasters = readdirSync(join(root, "assets", "raster"));
  assert.equal(manifest.decor.rotation.length, rasters.length, "轮播条目数应与栅格文件数一致");
  for (const item of manifest.decor.rotation) assert.ok(item.title, `轮播项缺标题: ${item.img}`);
});

// ── 4. 宿主半部烟囱测试 ──────────────────────────────────────────────────
await (async () => {
  const home = mkdtempSync(join(tmpdir(), "niulai-check-"));
  const savedHome = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  try {
    const host = await import(pathToFileURL(join(root, "lib", "index.js")).href);
    const sections = [];
    const effects = [];
    const routes = [];
    const ctx = {
      effect(fn) {
        effects.push(fn());
      },
      systemPrompt: {
        section(s) {
          sections.push(s);
          return () => sections.pop();
        },
      },
      webServer: {
        register(route) {
          routes.push(route);
          return () => {};
        },
      },
      logger: { info() {}, warn: (m) => console.error("     [host warn]", m) },
    };
    check("host: apply() 同步 preset 到 $DSH_HOME/.agent-presets", () => {
      host.apply(ctx);
      assert.ok(existsSync(join(home, ".agent-presets", "niulai", "agent.cordis.yml")));
      assert.ok(existsSync(join(home, ".agent-presets", "niulai", "preset.yml")));
    });
    check("host: assets 逐文件注册 exact 路由（含 manifest.json）", () => {
      assert.ok(routes.length >= 15, `路由数异常: ${routes.length}`);
      assert.ok(routes.every((r) => r.kind === "exact" && typeof r.handler === "function"));
      assert.ok(routes.some((r) => r.path === "/plugins/niulai/assets/manifest.json"));
    });
    check("host: 注册 plugin:niulai 声明段落，effect 返回清理函数", () => {
      assert.equal(sections.length, 1);
      assert.equal(sections[0].name, "plugin:niulai");
      assert.ok(sections[0].text.includes("牛来模式"));
      assert.ok(effects.every((d) => typeof d === "function"), "effect 回调必须返回 disposer");
    });
    check("host: enabled=false 时不做任何事", () => {
      const before = sections.length;
      host.apply(ctx, { enabled: false });
      assert.equal(sections.length, before);
    });
  } finally {
    if (savedHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = savedHome;
    rmSync(home, { recursive: true, force: true });
  }
})();

// ── 5. 浏览器半部导出形状 ────────────────────────────────────────────────
await (async () => {
  let loaded = null;
  globalThis.window = { __ModuleLoader__: { load: (def) => (loaded = def) } };
  try {
    await import(pathToFileURL(join(root, "lib", "client.js")).href);
    check("client: 注册 id=niulai 且导出 apply/inject/name", () => {
      assert.ok(loaded, "__ModuleLoader__.load 未被调用");
      assert.equal(loaded.id, "niulai");
      const exported = loaded.factory(() => ({}));
      assert.equal(exported.name, "niulai");
      assert.deepEqual(exported.inject, []);
      assert.equal(typeof exported.apply, "function");
    });
  } finally {
    delete globalThis.window;
  }
})();

// ── 6. 素材库：manifest 完整性 / SVG 卫生 / 体积红线 ─────────────────────
{
  const assetsRoot = join(root, "assets");
  const manifest = JSON.parse(readFileSync(join(assetsRoot, "manifest.json"), "utf8"));
  const refs = new Set(["manifest.json"]);
  for (const key of ["poster", "cow", "audience"]) refs.add(manifest.premiere[key]);
  for (const item of manifest.decor.rotation) refs.add(item.img);
  refs.add("sprites/cow-head.svg");
  refs.add(manifest.stamp);
  refs.add(manifest.audienceStrip);
  refs.add(manifest.danmaku);
  for (const p of Object.values(manifest.seals)) refs.add(p);
  for (const c of manifest.cards) {
    if (c.svg) refs.add(c.svg);
    if (c.bg) refs.add(c.bg);
  }
  check("assets: manifest 引用的文件全部存在", () => {
    for (const rel of refs) assert.ok(existsSync(join(assetsRoot, rel)), `缺文件: ${rel}`);
  });
  check("assets: 卡组含 firstInSession 合规卡且文案齐全", () => {
    assert.ok(manifest.cards.some((c) => c.firstInSession));
    for (const c of manifest.cards) {
      assert.ok(c.id && c.title && c.line, `卡片字段不全: ${c.id}`);
      assert.ok(c.svg || c.bg, `卡片无画面: ${c.id}`);
    }
  });

  const walk = (dir) => {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
    return out;
  };
  const files = walk(assetsRoot);
  check("assets: SVG 无脚本、无外链资源", () => {
    for (const f of files.filter((p) => p.endsWith(".svg"))) {
      const body = readFileSync(f, "utf8");
      assert.ok(!body.includes("<script"), `${f} 含 <script`);
      assert.ok(!/(?:href|src)\s*=\s*"https?:/.test(body), `${f} 引用外链资源`);
      assert.ok(!body.includes("javascript:"), `${f} 含 javascript: URL`);
    }
  });
  check("assets: 体积红线（单 SVG ≤30KB，单栅格 ≤300KB，总量 ≤1.8MB）", () => {
    let total = 0;
    for (const f of files) {
      const size = statSync(f).size;
      total += size;
      if (f.endsWith(".svg")) assert.ok(size <= 30 * 1024, `${f} 超 30KB: ${size}`);
      if (/\.(jpe?g|png|webp)$/.test(f)) assert.ok(size <= 300 * 1024, `${f} 超 300KB: ${size}`);
    }
    assert.ok(total <= 1.8 * 1024 * 1024, `assets/ 总量超 1.8MB: ${total}`);
  });
}

console.log(failures === 0 ? "\n全部通过：牛来了！" : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
