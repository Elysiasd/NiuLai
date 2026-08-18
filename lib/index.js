/**
 * niulai — 宿主半部。
 *
 * 让 DeepSeek Harness 拥有《牛来》(2026) 的精神状态，做两件事：
 *  1. 启动时把打包的 presets/niulai 同步进 harness-home 的 agent-presets
 *     发现根（`$DSH_HOME/.agent-presets`，默认 `~/.dsh/.agent-presets`），
 *     使「牛来模式」出现在新建会话的预设选择器里。
 *  2. 注册一段 system-prompt 声明，让 agent 知道用户说「牛来模式 /
 *     NiuLai / 牛来了」时指的是什么。
 *
 * 美术风格（水墨主题）与状态语轮播在浏览器半部 lib/client.js。
 * 结构参考 dsh-liangshen（Apache-2.0）与 dsh-status-rotator（MIT）。
 */
import { cpSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** cordis 插件名。 */
const name = "niulai";
/** 声明段落注册之前，提示词组装服务必须就绪。 */
const inject = ["systemPrompt"];

/** 声明段落在 tool-guidance 频段内的次序，与社区 preset 插件一致。 */
const SECTION_ORDER = 150;

/** 面向模型的声明：插件存在、原理与边界。 */
const GUIDANCE =
  "本机已安装 NiuLai（牛来）插件，灵感来自 2026 年动画电影《牛来》。" +
  "Web UI 已换上水墨海报风主题，回合状态语会轮播《牛来》梗（牛来了/纯手搓/用多边形搭建/票房逆袭）。" +
  "新建会话的预设选择器中可选「牛来模式」：标准模式的全部工具能力不变，仅人设换成牛来——" +
  "手搓精神（把任务做完做对、如实报告）、初生牛犊（不怕难题）、抽象但清醒（梗只出现在开场与收尾，" +
  "代码与技术结论保持朴素准确）。用户提到「牛来模式 / NiuLai / 牛来了」时即指本插件，请据此协作。";

const here = dirname(fileURLToPath(import.meta.url));
/** 打包的 preset 树位于包根 presets/，lib/ 的上一级。 */
const BUNDLED_PRESET = join(here, "..", "presets", "niulai");

/** $DSH_HOME 覆盖，带平台 home 回退与 ~ 展开（与 dsh 家族共享的约定一致）。 */
function dshHome() {
  const raw = process.env.DSH_HOME;
  if (!raw) return join(homedir(), ".dsh");
  if (raw === "~") return homedir();
  if (raw.startsWith("~/")) return join(homedir(), raw.slice(2));
  return resolve(raw);
}

/**
 * 挂载插件：同步 preset，再注册声明段落。
 * @param {object} ctx - 宿主插件上下文，携带 systemPrompt。
 * @param {{enabled?: boolean, announceToAgent?: boolean, syncPreset?: boolean}} [config]
 */
function apply(ctx, config) {
  const enabled = config?.enabled ?? true;
  const announce = config?.announceToAgent ?? true;
  const sync = config?.syncPreset ?? true;
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

  if (announce) {
    // ctx.effect 立即执行回调；section() 的返回值（disposer）即卸载时的清理函数。
    ctx.effect(
      () => ctx.systemPrompt.section({ name: "plugin:niulai", order: SECTION_ORDER, text: GUIDANCE }),
      "niulai: announcement",
    );
  }
}

export { apply, inject, name };
