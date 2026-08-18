/**
 * niulai — 浏览器半部：《牛来》美术风格 + 抽象精神状态 + 影厅引擎。
 *
 *  1. 主题：明亮主题 =「水墨海报版」（宣纸、淡墨、朱砂印），暗色主题 =
 *     「梦境版」（夜晚草原深青）。只覆盖 ui-theme 的 --dsw-* 语义别名
 *     token（覆盖面与 dsh-ux 主题插件一致，保证 token 真实存在），不碰
 *     组件结构。
 *  2. 状态语：接管回合状态标签（"Deep diving..."），轮播《牛来》梗；
 *     回合超过 60 秒进入 long 阶段，换用「五年手搓」系文案。检测方式
 *     沿用 dsh-status-rotator（MIT）。
 *  3. 影厅引擎（docs/art-plan.md）：
 *     - 完成时刻：落「手搓·测过」章 + 前排观众剪影从底边浮现 +
 *       笑声弹幕（每会话 ≤ 2 次爆发）；
 *     - 大任务（≥45s）加放名场面卡，每会话第一张固定是「牛来合规认证」
 *       （梗浓档）；
 *     - 入场三幕：装后自动播一次（海报 → 低模牛 → 满座影厅），全程可
 *       跳过，reduced-motion 直接出第三幕静帧。
 *     所有装饰 aria-hidden、pointer-events:none（卡片与跳过按钮除外），
 *     弹幕只走视口上部，永不遮输入框。
 *
 * localStorage 开关（详见 README 与 docs/art-plan.md §6.4）：
 *   niulai.theme    = "off"          关闭主题，只留状态语
 *   niulai.phrases  = JSON           覆盖状态语（数组，或 {phrases:[], long:[]}）
 *   niulai.crude    = "1"            正片模式彩蛋
 *   niulai.art      = "full|calm|off" 影厅引擎档位（默认 full；calm=只留落章）
 *   niulai.danmaku  = "off"          关闭弹幕（默认开）
 *   niulai.premiere = "done"         入场三幕已放映标记（删除可重播）
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
    /** 回合超过该毫秒数算「大任务」，完成时加放名场面卡。 */
    const BIG_TURN_MS = 45000;

    const THEME_KEY = "niulai.theme";
    const PHRASE_KEY = "niulai.phrases";
    const CRUDE_KEY = "niulai.crude";
    const ART_KEY = "niulai.art";
    const DANMAKU_KEY = "niulai.danmaku";
    const PREMIERE_KEY = "niulai.premiere";
    const PIRATE_KEY = "niulai.pirate";
    /** 累计票房与场次（跨会话持久，完成时刻累加）。 */
    const GROSS_KEY = "niulai.gross";
    const SHOWS_KEY = "niulai.shows";
    /** 票房里程碑：对应影片的真实票房节点。 */
    const MILESTONES = [
      [100000, "破 10 万！"],
      [5000000, "破 500 万，国产动画第 10 名！"],
      [11000000, "破 1100 万！"],
      [17000000, "破 1700 万，见证历史。"],
    ];

    /** 素材路由前缀，与宿主半部 ROUTE_PREFIX、manifest.base 一致。 */
    const ASSET_BASE = "/plugins/niulai/assets/";

    const BANNER = [
      "      (__)",
      "      (oo)     牛来了！NiuLai plugin v0.3.0",
      "/------\\/      纯手搓，拒绝敷衍",
      "* |    ||      首日票房 342 元 → 现在是你的 dsh",
      "  ||---||",
    ].join("\n");

    // ══ 主题 ══（token 覆盖面与 dsh-ux 一致，明=水墨海报版 暗=梦境版）
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

    // ══ 影厅引擎样式（独立于主题开关，档位 off 时整段不注入）══
    const ART_CSS = `
      #niulai-stage { position: fixed; inset: 0; pointer-events: none; z-index: 2147482000; overflow: hidden; }
      #niulai-stage * { box-sizing: border-box; }
      .niulai-stamp {
        position: absolute; right: 42px; bottom: 132px; width: 118px; height: 118px;
        opacity: 0; transform: rotate(-6deg);
        animation: niulai-stamp-in 1.9s cubic-bezier(.2,1.6,.35,1) forwards;
      }
      @keyframes niulai-stamp-in {
        0% { opacity: 0; transform: scale(1.9) rotate(-14deg); }
        14% { opacity: 1; transform: scale(1) rotate(-6deg); }
        78% { opacity: 1; }
        100% { opacity: 0; transform: scale(1) rotate(-6deg) translateY(-8px); }
      }
      .niulai-audience {
        position: absolute; left: 0; right: 0; bottom: 0; height: 104px;
        background-repeat: repeat-x; background-size: auto 100%; background-position: bottom left;
        opacity: 0.92; transform: translateY(100%);
        animation: niulai-audience 2.6s ease-in-out forwards;
      }
      @keyframes niulai-audience {
        0% { transform: translateY(100%); }
        22% { transform: translateY(46%); }
        78% { transform: translateY(46%); }
        100% { transform: translateY(100%); }
      }
      .niulai-danmaku {
        position: absolute; left: 100vw; white-space: nowrap;
        font-family: "Kaiti SC", "STKaiti", KaiTi, sans-serif;
        font-size: 22px; font-weight: 700; color: #fff;
        text-shadow: 0 0 3px rgba(0,0,0,.85), 0 0 8px rgba(0,0,0,.5);
        animation: niulai-danmaku-fly linear forwards;
      }
      @keyframes niulai-danmaku-fly { to { transform: translateX(calc(-100vw - 100%)); } }
      .niulai-card {
        position: absolute; left: 50%; top: 44%; width: min(560px, 86vw); aspect-ratio: 16/9;
        transform: translate(-50%, -50%); pointer-events: auto; cursor: pointer;
        border-radius: 14px; overflow: hidden; background: #111 center/cover no-repeat;
        box-shadow: 0 18px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.12);
        opacity: 0; animation: niulai-card-in .5s ease-out forwards;
      }
      @keyframes niulai-card-in {
        from { opacity: 0; transform: translate(-50%, -47%) scale(.96); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .niulai-card .niulai-card-text {
        position: absolute; left: 0; right: 0; bottom: 0; padding: 44px 20px 14px;
        background: linear-gradient(transparent, rgba(0,0,0,.78));
        color: #f7f2e7; font-family: "Kaiti SC", "STKaiti", KaiTi, serif;
      }
      .niulai-card .niulai-card-title { font-size: 20px; font-weight: 700; }
      .niulai-card .niulai-card-line { font-size: 14px; opacity: .88; margin-top: 4px; }
      .niulai-card img.niulai-card-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      #niulai-premiere {
        position: fixed; inset: 0; z-index: 2147482600; pointer-events: auto;
        background: #f4eddd; overflow: hidden; transition: background .45s ease;
      }
      #niulai-premiere .np-layer { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transition: opacity .45s ease; }
      #niulai-premiere .np-poster { max-height: 76%; max-width: 70%; box-shadow: 0 24px 80px rgba(47,42,36,.35); }
      #niulai-premiere .np-seal { position: absolute; width: 64px; height: 64px; margin-left: 30%; margin-top: -52%; }
      #niulai-premiere .np-caption {
        position: absolute; bottom: 9%; left: 0; right: 0; text-align: center;
        font-family: "Kaiti SC", "STKaiti", KaiTi, serif; font-size: 19px; color: #6b6259; letter-spacing: .35em;
      }
      #niulai-premiere .np-cow { max-height: 62%; max-width: 60%; }
      #niulai-premiere.np-act2 { background: #9e9e9e; }
      #niulai-premiere.np-act3 { background: #0b0b0b; }
      #niulai-premiere .np-screen {
        position: absolute; top: 7%; left: 50%; transform: translateX(-50%);
        height: 34%; border-radius: 6px; box-shadow: 0 0 46px rgba(120,220,200,.4), 0 0 0 1px rgba(255,255,255,.14);
      }
      #niulai-premiere .np-tagline {
        position: absolute; top: 52%; left: 0; right: 0; text-align: center;
        font-family: "Kaiti SC", "STKaiti", KaiTi, serif; font-size: clamp(18px, 3vw, 26px);
        color: #f7f2e7; text-shadow: 0 2px 14px rgba(0,0,0,.7); padding: 0 8vw;
      }
      #niulai-premiere .np-audience {
        position: absolute; left: 0; right: 0; bottom: 0; height: 118px;
        background-repeat: repeat-x; background-size: auto 100%; background-position: bottom left;
      }
      #niulai-premiere .np-skip {
        position: absolute; right: 22px; bottom: 20px; padding: 7px 16px; border-radius: 999px;
        border: 1px solid rgba(120,120,120,.55); background: rgba(20,20,20,.35); color: #f7f2e7;
        font-size: 13px; cursor: pointer; backdrop-filter: blur(3px);
      }
      @media (prefers-reduced-motion: reduce) {
        .niulai-stamp, .niulai-audience, .niulai-card { animation: none !important; opacity: 1; }
        .niulai-audience { transform: translateY(46%); }
      }
      .niulai-boxoffice {
        position: absolute; right: 42px; bottom: 96px;
        padding: 6px 14px; border: 1.5px solid #b3392f; border-radius: 4px;
        background: rgba(247, 242, 231, 0.94); color: #2f2a24;
        font-family: "Kaiti SC", "STKaiti", KaiTi, serif; font-size: 14px; line-height: 1.5;
        transform: rotate(-2deg); opacity: 0;
        animation: niulai-boxoffice-in 2.4s ease-out forwards;
      }
      .niulai-boxoffice b { color: #b3392f; }
      @keyframes niulai-boxoffice-in {
        0% { opacity: 0; transform: rotate(-2deg) translateY(8px); }
        12% { opacity: 1; transform: rotate(-2deg) translateY(0); }
        84% { opacity: 1; }
        100% { opacity: 0; }
      }
      /* ── 盗摄滤镜（niulai.pirate=1）：C1 语言，全部 CSS 原创质感模拟 ── */
      #niulai-pirate { position: fixed; inset: 0; pointer-events: none; z-index: 2147481000; }
      #niulai-pirate .np-frame {
        position: absolute; inset: 0; border-radius: 26px;
        box-shadow: inset 0 0 0 10px #000, inset 0 0 90px rgba(0,0,0,.55);
        transform: rotate(0.6deg) scale(1.004);
        animation: niulai-shake 5.5s ease-in-out infinite;
      }
      @keyframes niulai-shake {
        0%, 100% { transform: rotate(0.6deg) translate(0, 0) scale(1.004); }
        23% { transform: rotate(0.35deg) translate(1px, -1px) scale(1.004); }
        51% { transform: rotate(0.8deg) translate(-1px, 1px) scale(1.006); }
        77% { transform: rotate(0.5deg) translate(1px, 0) scale(1.004); }
      }
      #niulai-pirate .np-moire {
        position: absolute; inset: 0; opacity: 0.16; mix-blend-mode: overlay;
        background: repeating-linear-gradient(0deg, rgba(0,0,0,.55) 0 1px, transparent 1px 3px);
        animation: niulai-moire 7s linear infinite;
      }
      @keyframes niulai-moire { to { background-position: 0 9px; } }
      #niulai-pirate .np-hud {
        position: absolute; top: 14px; left: 0; right: 0; display: flex;
        justify-content: space-between; padding: 0 30px;
        font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 13px;
        color: rgba(255,255,255,.88); text-shadow: 0 1px 3px rgba(0,0,0,.8);
      }
      #niulai-pirate .np-rec::before {
        content: "●"; color: #ff3b30; margin-right: 5px;
        animation: niulai-rec 1.1s steps(1) infinite;
      }
      @keyframes niulai-rec { 50% { opacity: 0.15; } }
      #niulai-pirate .np-heads {
        position: absolute; left: 0; right: 0; bottom: -12px; height: 92px; opacity: 0.5;
        background-repeat: repeat-x; background-size: auto 100%; background-position: bottom -40px left 60px;
        filter: blur(1.2px);
      }
      /* ── 正片模式孪生（NL-40）：卡片与三幕素材整体劣化 ── */
      html[data-niulai-crude] .niulai-card,
      html[data-niulai-crude] #niulai-premiere .np-poster {
        filter: saturate(1.85) contrast(1.18) hue-rotate(8deg);
        image-rendering: pixelated;
      }
      html[data-niulai-crude] .niulai-boxoffice {
        border-color: #23b45a; }
      @media (prefers-reduced-motion: reduce) {
        #niulai-pirate .np-frame, #niulai-pirate .np-moire, #niulai-pirate .np-rec::before { animation: none !important; }
        .niulai-boxoffice { animation: none !important; opacity: 1; }
      }
    `;

    // ══ 纯工具函数 ══

    /** localStorage 安全读写：隐私模式等场景下静默降级。 */
    function safeGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }
    function safeSet(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        /* 写不进就当次性体验 */
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

    /** 按权重随机抽词。 */
    function weightedPick(words) {
      let total = 0;
      for (const w of words) total += w.w || 1;
      let roll = Math.random() * total;
      for (const w of words) {
        roll -= w.w || 1;
        if (roll <= 0) return w.t;
      }
      return words[words.length - 1].t;
    }

    // ══ 插件定义 ══
    const name = "niulai";
    const inject = [];

    function apply(ctx) {
      const themeOff = safeGet(THEME_KEY) === "off";
      const crude = safeGet(CRUDE_KEY) === "1";
      const pirate = safeGet(PIRATE_KEY) === "1";
      const artLevel = ["full", "calm", "off"].includes(safeGet(ART_KEY)) ? safeGet(ART_KEY) : "full";
      const danmakuOn = safeGet(DANMAKU_KEY) !== "off";
      const reducedMotion =
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const phrases = readPhrases();

      let styleEl = null;
      let artStyleEl = null;
      let timer = null;
      let rescanner = null;
      const adopted = new Set();
      /** el -> 上次文案，防止连续重复。 */
      const lastPicks = new Map();

      // ── 影厅引擎状态 ──
      let stage = null;
      let manifest = null;
      let danmaku = null;
      let turnWatch = null;
      /** el -> 接管时刻，用于估算回合时长（±0.8s 足够判定大任务）。 */
      const turnStarts = new Map();
      let lastCompletionAt = 0;
      let burstCount = 0;
      let firstCardPending = true;
      const shownCards = new Set();
      const artTimeouts = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          artTimeouts.delete(id);
          fn();
        }, ms);
        artTimeouts.add(id);
        return id;
      };
      const assetUrl = (p) => ASSET_BASE + p;

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
        if (!turnStarts.has(el)) turnStarts.set(el, Date.now());
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
          // 回合结束的主侦测路径：接管过的状态标签被移出文档。
          // MutationObserver 是微任务，不受后台标签页的定时器节流影响；
          // checkTurns 轮询只作兜底（比如整棵子树被替换时的漏网）。
          for (const node of record.removedNodes) {
            if (!(node instanceof Element)) continue;
            for (const [el, startedAt] of turnStarts) {
              if ((node === el || node.contains(el)) && !el.isConnected) {
                turnStarts.delete(el);
                completion(Date.now() - startedAt);
              }
            }
          }
        }
      });

      // ══ 影厅引擎 ══

      const ensureStage = () => {
        if (stage && stage.isConnected) return stage;
        stage = document.createElement("div");
        stage.id = "niulai-stage";
        stage.setAttribute("aria-hidden", "true");
        document.body.appendChild(stage);
        return stage;
      };

      /** 完成时刻编排：落章（calm 起）+ 观众剪影 + 弹幕（full）。 */
      const completion = (durationMs) => {
        const now = Date.now();
        if (now - lastCompletionAt < 1500) return;
        lastCompletionAt = now;
        const root = ensureStage();

        // 落章：calm 与 full 都有。
        const stamp = document.createElement("img");
        stamp.className = "niulai-stamp";
        stamp.alt = "";
        stamp.src = assetUrl(manifest?.stamp || "seals/shousa.svg");
        stamp.onerror = () => stamp.remove();
        root.appendChild(stamp);
        later(() => stamp.remove(), reducedMotion ? 1300 : 2100);

        // 票房累计：小任务 +342（首日价），大任务 +7705（第 10 天价）。
        const delta = durationMs >= BIG_TURN_MS ? 7705 : 342;
        const prevGross = Number(safeGet(GROSS_KEY)) || 0;
        const gross = prevGross + delta;
        const shows = (Number(safeGet(SHOWS_KEY)) || 0) + 1;
        safeSet(GROSS_KEY, String(gross));
        safeSet(SHOWS_KEY, String(shows));

        if (artLevel !== "full") return;

        // 票房计数器：随落章出现的纸条，跨里程碑时播报。
        const milestone = MILESTONES.find(([t]) => prevGross < t && gross >= t);
        const chip = document.createElement("div");
        chip.className = "niulai-boxoffice";
        chip.innerHTML =
          `第 ${shows} 场 · 本场 +¥${delta.toLocaleString("zh-CN")} · 累计 <b>¥${gross.toLocaleString("zh-CN")}</b>` +
          (milestone ? `<br><b>${milestone[1]}</b>` : "");
        root.appendChild(chip);
        later(() => chip.remove(), reducedMotion ? 1800 : 2600);

        // 前排观众剪影浮现（决策 4：仅完成时刻）。
        if (!reducedMotion) {
          const aud = document.createElement("div");
          aud.className = "niulai-audience";
          aud.style.backgroundImage = `url("${assetUrl(manifest?.audienceStrip || "sprites/audience-strip.svg")}")`;
          root.appendChild(aud);
          later(() => aud.remove(), 2700);
        }

        // 笑声弹幕（决策 3：默认开；每会话 ≤ 2 次爆发，只走视口上部）。
        if (danmakuOn && !reducedMotion && danmaku && burstCount < (danmaku.burst?.maxPerSession ?? 2)) {
          burstCount++;
          const per = danmaku.burst?.perBurst ?? 6;
          const lanes = danmaku.burst?.maxLanes ?? 3;
          const dur = danmaku.burst?.durationMs ?? 2400;
          for (let i = 0; i < per; i++) {
            later(() => {
              const span = document.createElement("span");
              span.className = "niulai-danmaku";
              span.textContent = weightedPick(danmaku.words);
              span.style.top = `${10 + (i % lanes) * 9 + Math.random() * 3}vh`;
              span.style.animationDuration = `${dur + Math.random() * 700}ms`;
              root.appendChild(span);
              later(() => span.remove(), dur + 900);
            }, i * 210);
          }
        }

        // 大任务加放名场面卡；每会话第一张固定为「牛来合规认证」（决策 2 梗浓档）。
        if (durationMs >= BIG_TURN_MS && manifest?.cards?.length) showCard();
      };

      const showCard = () => {
        const root = ensureStage();
        let pick;
        const deck = manifest.cards;
        if (firstCardPending) {
          pick = deck.find((c) => c.firstInSession) || deck[0];
          firstCardPending = false;
        } else {
          const rest = deck.filter((c) => !c.firstInSession && !shownCards.has(c.id));
          const pool = rest.length > 0 ? rest : deck.filter((c) => !c.firstInSession);
          pick = pool[Math.floor(Math.random() * pool.length)];
        }
        if (!pick) return;
        shownCards.add(pick.id);

        const card = document.createElement("div");
        card.className = "niulai-card";
        if (pick.svg) {
          const img = document.createElement("img");
          img.className = "niulai-card-svg";
          img.alt = "";
          img.src = assetUrl(pick.svg);
          card.appendChild(img);
        } else if (pick.bg) {
          card.style.backgroundImage = `url("${assetUrl(pick.bg)}")`;
        }
        const text = document.createElement("div");
        text.className = "niulai-card-text";
        text.innerHTML = "";
        const title = document.createElement("div");
        title.className = "niulai-card-title";
        title.textContent = pick.title;
        const line = document.createElement("div");
        line.className = "niulai-card-line";
        line.textContent = pick.line;
        text.appendChild(title);
        text.appendChild(line);
        card.appendChild(text);
        card.addEventListener("click", () => card.remove(), { once: true });
        root.appendChild(card);
        later(() => card.remove(), 6200);
      };

      /** 回合结束侦测：接管过的状态标签从文档中消失 = 一次完成。 */
      const checkTurns = () => {
        for (const [el, startedAt] of turnStarts) {
          if (!el.isConnected) {
            turnStarts.delete(el);
            completion(Date.now() - startedAt);
          }
        }
      };

      // ── 入场三幕（决策 5：装后自动播一次，可跳过）──
      const premiere = () => {
        if (artLevel !== "full") return;
        if (safeGet(PREMIERE_KEY) === "done") return;
        if (!manifest?.premiere) return;
        const pre = manifest.premiere;
        const overlay = document.createElement("div");
        overlay.id = "niulai-premiere";
        const timeouts = [];
        const at = (ms, fn) => timeouts.push(setTimeout(fn, ms));
        const finish = () => {
          for (const t of timeouts) clearTimeout(t);
          safeSet(PREMIERE_KEY, "done");
          overlay.style.opacity = "0";
          overlay.style.transition = "opacity .45s ease";
          setTimeout(() => overlay.remove(), 480);
          document.removeEventListener("keydown", onKey);
        };
        const onKey = (e) => {
          if (e.key === "Escape") finish();
        };
        document.addEventListener("keydown", onKey);

        const mk = (html) => {
          const layer = document.createElement("div");
          layer.className = "np-layer";
          layer.innerHTML = html;
          overlay.appendChild(layer);
          return layer;
        };
        const esc = (s) => s.replace(/"/g, "&quot;");

        // 第一幕「场外」：水墨海报 + 朱砂印 + 宣传词。
        const act1 = mk(
          `<img class="np-poster" alt="" src="${esc(assetUrl(pre.poster))}">` +
            `<img class="np-seal" alt="" src="${esc(assetUrl("seals/niulai.svg"))}">` +
            `<div class="np-caption">治 愈 系 水 墨 国 风</div>`,
        );
        // 第二幕「银幕」：低模牛瞪眼。
        const act2 = mk(`<img class="np-cow" alt="" src="${esc(assetUrl(pre.cow))}">`);
        act2.style.opacity = "0";
        // 第三幕「影厅」：银幕缩小 + 观众 + 落版。
        const act3 = mk(
          `<img class="np-screen" alt="" src="${esc(assetUrl(pre.cow))}">` +
            `<div class="np-tagline">${pre.tagline}</div>` +
            `<div class="np-audience" style="background-image:url('${esc(assetUrl(pre.audience))}')"></div>`,
        );
        act3.style.opacity = "0";

        const skip = document.createElement("button");
        skip.className = "np-skip";
        skip.textContent = "跳过 ▸▸";
        skip.addEventListener("click", finish, { once: true });
        overlay.appendChild(skip);
        document.body.appendChild(overlay);

        if (reducedMotion) {
          // 静帧：直接出第三幕，停 2.2s。
          act1.style.opacity = "0";
          act3.style.opacity = "1";
          overlay.classList.add("np-act3");
          at(2200, finish);
          return;
        }
        at(2000, () => {
          overlay.classList.add("np-act2");
          act1.style.opacity = "0";
          act2.style.opacity = "1";
        });
        at(4000, () => {
          overlay.classList.remove("np-act2");
          overlay.classList.add("np-act3");
          act2.style.opacity = "0";
          act3.style.opacity = "1";
          // 三幕内的弹幕（不计入会话爆发配额）。
          if (danmaku) {
            for (let i = 0; i < 5; i++) {
              at(4200 + i * 260, () => {
                const span = document.createElement("span");
                span.className = "niulai-danmaku";
                span.textContent = weightedPick(danmaku.words);
                span.style.top = `${46 + (i % 3) * 8}vh`;
                span.style.animationDuration = `${2300 + Math.random() * 600}ms`;
                overlay.appendChild(span);
              });
            }
          }
        });
        at(7200, finish);
      };

      const artInit = () => {
        if (artLevel === "off") return;
        artStyleEl = document.createElement("style");
        artStyleEl.id = "niulai-art-style";
        artStyleEl.textContent = ART_CSS;
        document.head.appendChild(artStyleEl);
        turnWatch = setInterval(checkTurns, 800);
        // manifest 与弹幕词库异步加载；失败则引擎降级为纯落章。
        fetch(assetUrl("manifest.json"), { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((m) => {
            manifest = m;
            if (!m) return;
            return fetch(assetUrl(m.danmaku || "fx/danmaku.json"), { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                danmaku = d;
              });
          })
          .then(() => premiere())
          .catch(() => {
            /* 素材路由不可用：保持主题与状态语，静默放弃影厅编排 */
          });
      };

      // ── 盗摄滤镜（NL-41）：取景框 + 摩尔纹 + 假 HUD + 前排头影，纯 CSS 质感 ──
      const buildPirate = () => {
        if (document.getElementById("niulai-pirate")) return;
        const p = document.createElement("div");
        p.id = "niulai-pirate";
        p.setAttribute("aria-hidden", "true");
        p.innerHTML =
          '<div class="np-moire"></div>' +
          '<div class="np-frame"></div>' +
          '<div class="np-hud"><span class="np-rec">REC</span><span>21:47 · 电量 3%</span></div>' +
          `<div class="np-heads" style="background-image:url('${assetUrl("sprites/audience-strip.svg")}')"></div>`;
        document.body.appendChild(p);
      };

      // ── 战报海报（NL-43）：Canvas 合成宣纸风战报，控制台 niulai.poster() 触发 ──
      const loadImage = (src) =>
        new Promise((resolveImg, rejectImg) => {
          const img = new Image();
          img.onload = () => resolveImg(img);
          img.onerror = rejectImg;
          img.src = src;
        });

      const buildPoster = async (download) => {
        const W = 750;
        const H = 1200;
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const g = cv.getContext("2d");
        // 宣纸底 + 细噪点
        g.fillStyle = "#f4eddd";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(96,86,60,0.05)";
        for (let i = 0; i < 1400; i++) {
          g.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2);
        }
        // 淡墨横带
        g.fillStyle = "rgba(47,42,36,0.08)";
        g.fillRect(0, 232, W, 3);
        g.fillRect(0, H - 176, W, 3);
        const kai = (size, weight) => `${weight || 400} ${size}px "Kaiti SC","STKaiti",KaiTi,serif`;
        g.fillStyle = "#2f2a24";
        g.textAlign = "center";
        g.font = kai(84, 700);
        g.fillText("牛 来 战 报", W / 2, 158);
        const now = new Date();
        const date = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
        g.font = kai(26);
        g.fillStyle = "#8a8272";
        g.fillText(date, W / 2, 208);
        const gross = Number(safeGet(GROSS_KEY)) || 0;
        const shows = Number(safeGet(SHOWS_KEY)) || 0;
        g.fillStyle = "#2f2a24";
        g.font = kai(40, 700);
        g.fillText(`第 ${shows} 场放映圆满结束`, W / 2, 400);
        g.font = kai(56, 700);
        g.fillStyle = "#b3392f";
        g.fillText(`累计票房 ¥${gross.toLocaleString("zh-CN")}`, W / 2, 500);
        g.fillStyle = "#2f2a24";
        g.font = kai(30);
        const phrase = phrases.normal[Math.floor(Math.random() * phrases.normal.length)];
        g.fillText(`本场状态：${phrase.replace(/…$/, "")}`, W / 2, 590);
        g.font = kai(24);
        g.fillStyle = "#8a8272";
        g.fillText("纯手搓 · 拒绝敷衍 · 抽象但清醒", W / 2, 648);
        g.fillText("这里没人管盗摄，也没人管你笑多大声。", W / 2, H - 120);
        // 双印：右上朱砂「牛来」、左下「手搓·测过」
        try {
          const [sealNiulai, sealShousa] = await Promise.all([
            loadImage(assetUrl("seals/niulai.svg")),
            loadImage(assetUrl("seals/shousa.svg")),
          ]);
          g.drawImage(sealNiulai, W - 176, 264, 108, 108);
          g.drawImage(sealShousa, 64, H - 320, 128, 128);
        } catch (error) {
          /* 印章加载失败就出无印版 */
        }
        const dataUrl = cv.toDataURL("image/png");
        window.niulai.lastPoster = dataUrl;
        if (download !== false) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `niulai-poster-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.png`;
          a.click();
        }
        return dataUrl;
      };

      // ── 控制台 API：README「使用」一节文档化 ──
      const publicApi = {
        version: "0.3.0",
        replay() {
          try {
            localStorage.removeItem(PREMIERE_KEY);
          } catch (error) {
            /* ignore */
          }
          location.reload();
        },
        pirate(on) {
          if (on === false) {
            try {
              localStorage.removeItem(PIRATE_KEY);
            } catch (error) {
              /* ignore */
            }
          } else safeSet(PIRATE_KEY, "1");
          location.reload();
        },
        crude(on) {
          if (on === false) {
            try {
              localStorage.removeItem(CRUDE_KEY);
            } catch (error) {
              /* ignore */
            }
          } else safeSet(CRUDE_KEY, "1");
          location.reload();
        },
        poster(download) {
          buildPoster(download).catch(() => {});
          return "战报生成中：完成后自动下载（数据同时存于 niulai.lastPoster）";
        },
        stats() {
          return {
            shows: Number(safeGet(SHOWS_KEY)) || 0,
            gross: Number(safeGet(GROSS_KEY)) || 0,
          };
        },
      };

      const start = () => {
        if (!themeOff) {
          styleEl = document.createElement("style");
          styleEl.id = "niulai-theme";
          styleEl.textContent = THEME_CSS;
          document.head.appendChild(styleEl);
        }
        if (crude) document.documentElement.dataset.niulaiCrude = "1";
        if (pirate && artLevel !== "off") buildPirate();
        window.niulai = publicApi;
        console.log("%c" + BANNER, "color:#b3392f;font-family:monospace");
        observer.observe(document.body, { childList: true, subtree: true });
        scan(document.body);
        timer = setInterval(rotate, ROTATE_MS);
        // 兜底轮询：防止 MutationObserver 漏掉早期节点。
        rescanner = setInterval(() => scan(document.body), 2000);
        artInit();
      };

      if (document.body !== null) start();
      else document.addEventListener("DOMContentLoaded", start, { once: true });

      // ctx.effect 立即执行回调，回调的返回值才是卸载时的清理函数。
      ctx.effect(() => {
        return () => {
          observer.disconnect();
          if (timer !== null) clearInterval(timer);
          if (rescanner !== null) clearInterval(rescanner);
          if (turnWatch !== null) clearInterval(turnWatch);
          for (const id of artTimeouts) clearTimeout(id);
          artTimeouts.clear();
          if (styleEl !== null && styleEl.isConnected) styleEl.remove();
          if (artStyleEl !== null && artStyleEl.isConnected) artStyleEl.remove();
          if (stage !== null && stage.isConnected) stage.remove();
          const pre = document.getElementById("niulai-premiere");
          if (pre) pre.remove();
          const pirateEl = document.getElementById("niulai-pirate");
          if (pirateEl) pirateEl.remove();
          if (window.niulai === publicApi) delete window.niulai;
          delete document.documentElement.dataset.niulaiCrude;
          adopted.clear();
          lastPicks.clear();
          turnStarts.clear();
        };
      }, "niulai: theme + status phrases + cinema");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});
