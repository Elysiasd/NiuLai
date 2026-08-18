/**
 * niulai — 浏览器半部：《牛来》美术风格 + 抽象精神状态。
 *
 *  1. 主题：明亮主题 =「水墨海报版」（宣纸、淡墨、朱砂印），暗色主题 =
 *     「梦境版」（夜晚草原深青）。只覆盖 ui-theme 的 --dsw-* 语义别名
 *     token（覆盖面与 dsh-ux 主题插件一致，保证 token 真实存在），不碰
 *     组件结构。
 *  2. 状态语：接管回合状态标签（"Deep diving..."），轮播《牛来》梗；
 *     回合超过 60 秒进入 long 阶段，换用「五年手搓」系文案。检测方式
 *     沿用 dsh-status-rotator（MIT）：[role=status][aria-live=polite] +
 *     初始文案或 aria-hidden 时钟。
 *  3. 彩蛋：localStorage 设 `niulai.crude = "1"` 开启「正片模式」——
 *     字体与按钮变成五毛特效味，复刻"水墨海报 vs 粗糙正片"的名场面。
 *
 * localStorage 开关（详见 README）：
 *   niulai.theme   = "off"  关闭主题，只留状态语
 *   niulai.phrases = JSON   覆盖状态语（数组，或 {phrases:[], long:[]}）
 *   niulai.crude   = "1"    正片模式彩蛋
 */
window.__ModuleLoader__.load({
  id: "niulai",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // ══ 《牛来》状态语（梗的出处见 README「资讯与来源」）══
    const PHRASES = [
      "牛来了…",
      "云雀正在入梦…",
      "正在用多边形搭建答案…",
      "纯手搓推理中，绝不敷衍…",
      "治愈系水墨国风加载中…",
      "初生牛犊，直面难题…",
      "排片暴涨 2300%…",
      "见证历史…",
      "老抽象依然坚持手搓…",
      "首日票房 342 元，不慌…",
    ];
    const PHRASES_LONG = [
      "五年了，还在渲染第一帧…",
      "手搓需要时间，票房需要耐心…",
      "第 10 天，票房 7705 元，坚持住…",
      "十年后你会看懂这次深潜的…",
      "牛市还没来，但快了…",
    ];
    /** 回合时钟超过该毫秒数进入 long 阶段。 */
    const LONG_AFTER_MS = 60000;
    /** 状态语轮换间隔（毫秒）。 */
    const ROTATE_MS = 9000;

    const THEME_KEY = "niulai.theme";
    const PHRASE_KEY = "niulai.phrases";
    const CRUDE_KEY = "niulai.crude";

    const BANNER = [
      "      (__)",
      "      (oo)     牛来了！NiuLai plugin v0.1.0",
      "/------\\/      纯手搓，拒绝敷衍",
      "* |    ||      首日票房 342 元 → 现在是你的 dsh",
      "  ||---||",
    ].join("\n");

    // ══ 主题 ══
    // token 清单与 dsh-ux 的覆盖面一致：只用已被证实存在的语义别名。
    // 明亮 =「水墨海报版」：宣纸 #f4eddd 系、淡墨、朱砂 #b3392f。
    // 暗色 =「梦境版」：夜晚草原深青 #16211f 系，朱砂提亮。
    const THEME_CSS = `
      body:not([data-ds-dark-theme]) {
        --dsw-alias-bg-layer-3: #f4eddd !important;
        --dsw-specific-menu: #f4eddd !important;
        --dsw-specific-input-major: #ece3cd !important;
        --dsw-specific-login-input: #ece3cd !important;
        --dsw-specific-tip: #f4eddd !important;
        --dsw-specific-selector: #f4eddd !important;
        --dsw-specific-bubble: #f4eddd !important;
        --dsw-specific-bubble-highlight: #eadfc6 !important;
        --dsw-specific-sidebar-nav-item-active: #f4eddd !important;
        --dsw-specific-sidebar-nav-item-hover: #eadfc6 !important;
        --dsw-specific-sidebar-nav-item-active-accent: #eadfc6 !important;
        --dsw-alias-markdown-code-block: #f1e9d6 !important;
        --dsw-alias-markdown-code-block-banner: #e7dcc0 !important;
        --dsw-alias-markdown-inline-code: #e9dfc5 !important;
        --dsw-alias-markdown-code-segment-unselected: #e7dcc0 !important;
        --dsw-alias-markdown-citation: #e7dcc0 !important;
        --dsw-alias-label-tertiary: #8a8272 !important;
        --dsw-alias-label-caption: #8a8272 !important;
        --dsw-alias-label-dimmed: #cabfa0 !important;
        --dsw-alias-interactive-bg-hover: rgba(96, 86, 60, 0.10) !important;
        --dsw-alias-interactive-bg-hover-solid: rgba(96, 86, 60, 0.16) !important;
        --dsw-alias-interactive-bg-active: rgba(179, 57, 47, 0.10) !important;
        --dsw-alias-interactive-bg-hover-accent: rgba(90, 125, 79, 0.14) !important;
        --dsw-alias-interactive-bg-hover-danger: rgba(220, 50, 47, 0.08) !important;
        --dsw-alias-button-primary-fill: #b3392f !important;
        --dsw-alias-button-primary-hover: #c44a3f !important;
        --dsw-alias-button-primary-dimmed: #eadfc6 !important;
        --dsw-alias-button-info-fill: #3d6e70 !important;
        --dsw-alias-button-info-hover: #4f8385 !important;
        --dsw-alias-button-contrast-fill: #2f2a24 !important;
        --dsw-alias-button-floating-fill: #faf5e9 !important;
        --dsw-alias-button-floating-hover: #f1e9d6 !important;
        --dsw-alias-button-elevated-fill: #faf5e9 !important;
        --dsw-alias-button-ghost-active-fill: #f1e9d6 !important;
        --dsw-alias-button-ghost-active-border: #cfc4a3 !important;
        --dsw-alias-tooltip-bg: #2f2a24 !important;
        --dsw-alias-toast-bg: #2f2a24 !important;
        --dsw-hovercard-bg: #2f2a24 !important;
        --dsw-alias-border-inverted: #c9a878 !important;
        --dsw-alias-border-l3: #cfc4a3 !important;
        --dsw-alias-border-l4: #b6a888 !important;
        --dsw-alias-border-l2-darkmode-thin: #cfc4a3 !important;
        --dsw-alias-bg-skeleton: rgba(96, 86, 60, 0.08) !important;
        --dsw-alias-scrollbar-bg-l1: #d8cdae !important;
        --dsw-alias-scrollbar-bg-l2: #d8cdae !important;
        --dsw-alias-scrollbar-hover-l1: #c5b892 !important;
        --dsw-alias-scrollbar-hover-l2: #c5b892 !important;
      }
      body[data-ds-dark-theme] {
        --dsw-alias-bg-layer-3: #16211f !important;
        --dsw-specific-menu: #17231f !important;
        --dsw-specific-input-major: #141e1b !important;
        --dsw-specific-tip: #17231f !important;
        --dsw-specific-selector: #17231f !important;
        --dsw-specific-bubble: #17231f !important;
        --dsw-specific-bubble-highlight: #1e2c27 !important;
        --dsw-specific-sidebar-nav-item-active: #1e2c27 !important;
        --dsw-specific-sidebar-nav-item-hover: #1a2823 !important;
        --dsw-specific-sidebar-nav-item-active-accent: #1a2823 !important;
        --dsw-alias-markdown-code-block: #14201c !important;
        --dsw-alias-markdown-code-block-banner: #1b2823 !important;
        --dsw-alias-markdown-inline-code: #1b2823 !important;
        --dsw-alias-markdown-code-segment-unselected: #1b2823 !important;
        --dsw-alias-markdown-citation: #1b2823 !important;
        --dsw-alias-interactive-bg-active: rgba(194, 73, 60, 0.16) !important;
        --dsw-alias-button-primary-fill: #c2493c !important;
        --dsw-alias-button-primary-hover: #d05a4c !important;
        --dsw-alias-tooltip-bg: #0d1412 !important;
        --dsw-alias-toast-bg: #0d1412 !important;
        --dsw-hovercard-bg: #0d1412 !important;
        --dsw-alias-border-l3: #2c3a34 !important;
        --dsw-alias-border-l4: #3a4a42 !important;
        --dsw-alias-scrollbar-bg-l1: #24312c !important;
        --dsw-alias-scrollbar-bg-l2: #24312c !important;
        --dsw-alias-scrollbar-hover-l1: #2f3f38 !important;
        --dsw-alias-scrollbar-hover-l2: #2f3f38 !important;
      }
      /* 正片模式彩蛋：宣传是治愈系水墨国风，进场是五毛特效。 */
      html[data-niulai-crude] body {
        font-family: "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive !important;
      }
      html[data-niulai-crude] body:not([data-ds-dark-theme]),
      html[data-niulai-crude] body[data-ds-dark-theme] {
        --dsw-alias-button-primary-fill: #23b45a !important;
        --dsw-alias-button-primary-hover: #2fca69 !important;
      }
    `;

    // ══ 纯工具函数 ══

    /** localStorage 安全读取：隐私模式等场景下直接当作未设置。 */
    function safeGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }

    /** 读取状态语（含 localStorage 覆盖），保证两组均非空。 */
    function readPhrases() {
      let normal = PHRASES;
      let long = PHRASES_LONG;
      const raw = safeGet(PHRASE_KEY);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          const clean = (v) =>
            Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.length > 0) : [];
          if (Array.isArray(parsed)) {
            if (clean(parsed).length > 0) normal = clean(parsed);
          } else if (parsed !== null && typeof parsed === "object") {
            if (clean(parsed.phrases).length > 0) normal = clean(parsed.phrases);
            if (clean(parsed.long).length > 0) long = clean(parsed.long);
          }
        } catch (error) {
          /* 数据损坏则用内置文案 */
        }
      }
      if (long.length === 0) long = normal;
      return { normal, long };
    }

    /**
     * 解析回合时钟文本为秒数（dsh 的时钟按语言本地化）：
     * zh "15秒"/"1分02秒"，en "15s"/"1m 02s"，兼容冒号与纯数字。
     */
    function parseClock(text) {
      const t = String(text || "").trim();
      const patterns = [
        [/^(\d+):(\d{2}):(\d{2})$/, (m) => +m[1] * 3600 + +m[2] * 60 + +m[3]],
        [/^(\d+):(\d{2})$/, (m) => +m[1] * 60 + +m[2]],
        [/^(\d+)分(\d+)秒$/, (m) => +m[1] * 60 + +m[2]],
        [/^(\d+)m\s*(\d+)s$/, (m) => +m[1] * 60 + +m[2]],
        [/^(\d+)秒$/, (m) => +m[1]],
        [/^(\d+)s$/, (m) => +m[1]],
        [/^(\d+)$/, (m) => +m[1]],
      ];
      for (const [re, toSeconds] of patterns) {
        const m = t.match(re);
        if (m) return toSeconds(m);
      }
      return 0;
    }

    // ══ 插件定义 ══
    const name = "niulai";
    const inject = [];

    function apply(ctx) {
      const themeOff = safeGet(THEME_KEY) === "off";
      const crude = safeGet(CRUDE_KEY) === "1";
      const phrases = readPhrases();

      let styleEl = null;
      let timer = null;
      let rescanner = null;
      const adopted = new Set();
      /** el -> 上次文案，防止连续重复。 */
      const lastPicks = new Map();

      /** 时钟是带 aria-hidden="true" 的直接子元素（dsh 本体渲染约定）。 */
      const clockEl = (el) =>
        Array.from(el.children).find((n) => n.getAttribute("aria-hidden") === "true");

      /** 元素的第一个文本节点：状态文案所在，改它不动时钟。 */
      const firstTextNode = (el) => {
        for (const node of el.childNodes) if (node.nodeType === 3) return node;
        return null;
      };

      /** 无时钟或时钟未过阈值用常规组，超时进入「五年手搓」组。 */
      const poolOf = (el) => {
        const clock = clockEl(el);
        if (clock && parseClock(clock.textContent) * 1000 >= LONG_AFTER_MS) return phrases.long;
        return phrases.normal;
      };

      const pickFrom = (list, el) => {
        if (list.length === 1) return list[0];
        let next = lastPicks.get(el);
        for (let i = 0; i < 8 && (next === undefined || next === lastPicks.get(el)); i++) {
          next = list[Math.floor(Math.random() * list.length)];
        }
        lastPicks.set(el, next);
        return next;
      };

      const refresh = (el) => {
        const node = firstTextNode(el);
        if (!node) return;
        const next = pickFrom(poolOf(el), el);
        if (node.nodeValue !== next) node.nodeValue = next;
      };

      /**
       * role=status 在页面上不唯一，必须再按 TurnStatus 的内容/结构过滤：
       * 时钟出现前初始文案固定是 "Deep diving..."；时钟出现后按可解析的
       * 正时长判定。其余 status 区域两个条件都不满足，不会被动到。
       */
      const adopt = (el) => {
        if (adopted.has(el)) return;
        const clock = clockEl(el);
        const isTurnStatus =
          el.getAttribute("role") === "status" &&
          el.getAttribute("aria-live") === "polite" &&
          (el.textContent.startsWith("Deep diving...") ||
            (clock !== undefined && parseClock(clock.textContent) > 0));
        if (!isTurnStatus) return;
        adopted.add(el);
        refresh(el);
      };

      const scan = (root) => {
        if (!(root instanceof Element)) return;
        for (const el of root.querySelectorAll('[role="status"][aria-live="polite"]')) adopt(el);
      };

      const rotate = () => {
        for (const el of adopted) {
          if (!el.isConnected) {
            adopted.delete(el);
            lastPicks.delete(el);
            continue;
          }
          refresh(el);
        }
      };

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          // 已接管元素内部变化（时钟出现/React 重写文案）→ 立即刷回牛来文案。
          if (record.type === "childList" && adopted.has(record.target)) refresh(record.target);
          for (const node of record.addedNodes) {
            if (node instanceof Element) {
              adopt(node);
              scan(node);
            }
          }
        }
      });

      const start = () => {
        if (!themeOff) {
          styleEl = document.createElement("style");
          styleEl.id = "niulai-theme";
          styleEl.textContent = THEME_CSS;
          document.head.appendChild(styleEl);
        }
        if (crude) document.documentElement.dataset.niulaiCrude = "1";
        console.log("%c" + BANNER, "color:#b3392f;font-family:monospace");
        observer.observe(document.body, { childList: true, subtree: true });
        scan(document.body);
        timer = setInterval(rotate, ROTATE_MS);
        // 兜底轮询：防止 MutationObserver 漏掉早期节点。
        rescanner = setInterval(() => scan(document.body), 2000);
      };

      if (document.body !== null) start();
      else document.addEventListener("DOMContentLoaded", start, { once: true });

      // ctx.effect 立即执行回调，回调的返回值才是卸载时的清理函数。
      ctx.effect(() => {
        return () => {
          observer.disconnect();
          if (timer !== null) clearInterval(timer);
          if (rescanner !== null) clearInterval(rescanner);
          if (styleEl !== null && styleEl.isConnected) styleEl.remove();
          delete document.documentElement.dataset.niulaiCrude;
          adopted.clear();
          lastPicks.clear();
        };
      }, "niulai: theme + status phrases");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});
