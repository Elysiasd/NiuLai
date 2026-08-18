/**
 * niulai — 宿主半部。
 *
 * 让 DeepSeek Harness 拥有《牛来》(2026) 的精神状态，做三件事：
 *  1. 启动时把打包的 presets/niulai 同步进 harness-home 的 agent-presets
 *     发现根（`$DSH_HOME/.agent-presets`，默认 `~/.dsh/.agent-presets`），
 *     使「牛来模式」出现在新建会话的预设选择器里。
 *  2. 注册一段 system-prompt 声明，让 agent 知道用户说「牛来模式 /
 *     NiuLai / 牛来了」时指的是什么。
 *  3. 把包内 assets/ 逐文件注册成 `/plugins/niulai/assets/*` 路由，
 *     供浏览器半部的「影厅引擎」取用（manifest、印章、名场面卡、
 *     弹幕词库、三幕素材）。只用 webServer 已被社区插件证实的
 *     `kind: "exact"` 注册方式，启动时枚举文件各注册一条。
 *
 * 美术风格（水墨主题）与影厅编排在浏览器半部 lib/client.js。
 * 结构参考 dsh-liangshen（Apache-2.0）与 dsh-status-rotator（MIT）。
 */
import { readdirSync, readFile, statSync } from "node:fs";
import { homedir } from "node:os";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** cordis 插件名。 */
const name = "niulai";
/** 声明段落与素材路由的宿主服务，二者就绪后才加载本插件。 */
const inject = ["systemPrompt", "webServer"];

/** 声明段落在 tool-guidance 频段内的次序，与社区 preset 插件一致。 */
const SECTION_ORDER = 150;

/** 面向模型的声明：插件存在、原理与边界。 */
const GUIDANCE =
  "本机已安装 NiuLai（牛来）插件，灵感来自 2026 年动画电影《牛来》。" +
  "Web UI 已换上水墨海报风主题，回合状态语会轮播《牛来》梗（牛来了/纯手搓/用多边形搭建/票房逆袭），" +
  "完成任务时界面可能出现落章、观众剪影与弹幕等影厅彩蛋（纯前端装饰，与任务结果无关）。" +
  "新建会话的预设选择器中可选「牛来模式」：标准模式的全部工具能力不变，仅人设换成牛来——" +
  "手搓精神（把任务做完做对、如实报告）、初生牛犊（不怕难题）、抽象但清醒（梗只出现在开场与收尾，" +
  "代码与技术结论保持朴素准确）。用户提到「牛来模式 / NiuLai / 牛来了」时即指本插件，请据此协作。";

const here = dirname(fileURLToPath(import.meta.url));
/** 打包的 preset 树与素材库位于包根，lib/ 的上一级。 */
const BUNDLED_PRESET = join(here, "..", "presets", "niulai");
const ASSETS_ROOT = join(here, "..", "assets");
/** 素材路由前缀，浏览器半部与 manifest.base 保持一致。 */
const ROUTE_PREFIX = "/plugins/niulai/assets/";

const CONTENT_TYPES = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** $DSH_HOME 覆盖，带平台 home 回退与 ~ 展开（与 dsh 家族共享的约定一致）。 */
function dshHome() {
  const raw = process.env.DSH_HOME;
  if (!raw) return join(homedir(), ".dsh");
  if (raw === "~") return homedir();
  if (raw.startsWith("~/")) return join(homedir(), raw.slice(2));
  return resolve(raw);
}

/** 递归列出 assets/ 下所有可服务文件（相对路径，POSIX 分隔）。 */
function listAssets(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (CONTENT_TYPES[extname(entry).toLowerCase()]) {
        out.push(relative(root, path).split(sep).join("/"));
      }
    }
  };
  walk(root);
  return out;
}

/** 单文件处理器：GET/HEAD 直读包内文件。路径在注册时就已钉死，无遍历风险。 */
function makeHandler(absPath, contentType) {
  return (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    readFile(absPath, (error, body) => {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "content-type": contentType,
        // 素材随插件版本更新，开发期禁缓存换取热改生效。
        "cache-control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    });
  };
}

/**
 * 挂载插件：同步 preset、注册声明段落、注册素材路由。
 * @param {object} ctx - 宿主插件上下文，携带 systemPrompt 与 webServer。
 * @param {{enabled?: boolean, announceToAgent?: boolean, syncPreset?: boolean, serveAssets?: boolean}} [config]
 */
function apply(ctx, config) {
  const enabled = config?.enabled ?? true;
  const announce = config?.announceToAgent ?? true;
  const sync = config?.syncPreset ?? true;
  const serve = config?.serveAssets ?? true;
  if (!enabled) return;

  if (sync) {
    try {
      const targetRoot = join(dshHome(), ".agent-presets");
      mkdirSync(targetRoot, { recursive: true });
      // 只写自己的 niulai/ 目录，兄弟 preset（用户自建或其他插件的）不碰。
      cpSync(BUNDLED_PRESET, join(targetRoot, "niulai"), { recursive: true, force: true });
      ctx.logger?.info?.(`niulai: 牛来模式 preset synced into ${targetRoot}`);
    } catch (error) {
      ctx.logger?.warn?.(
        `niulai: preset sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (serve) {
    try {
      const files = listAssets(ASSETS_ROOT);
      for (const rel of files) {
        const contentType = CONTENT_TYPES[extname(rel).toLowerCase()];
        ctx.effect(
          () =>
            ctx.webServer.register({
              kind: "exact",
              path: ROUTE_PREFIX + rel,
              handler: makeHandler(join(ASSETS_ROOT, rel), contentType),
            }),
          `niulai: asset route ${rel}`,
        );
      }
      ctx.logger?.info?.(`niulai: ${files.length} asset routes registered under ${ROUTE_PREFIX}`);
    } catch (error) {
      ctx.logger?.warn?.(
        `niulai: asset routes failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (announce) {
    // ctx.effect 立即执行回调；section() 的返回值（disposer）即卸载时的清理函数。
    ctx.effect(
      () => ctx.systemPrompt.section({ name: "plugin:niulai", order: SECTION_ORDER, text: GUIDANCE }),
      "niulai: announcement",
    );
  }
}

export { apply, inject, name };
