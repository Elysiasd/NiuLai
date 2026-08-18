# NiuLai 牛来

> 牛来了！让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）拥有 2026 年动画电影《牛来》的美术风格与抽象精神状态。

一个 `dsh` 插件（`dsh-plugin`）：水墨海报风主题 + 《牛来》梗状态语 + 「牛来模式」agent preset。纯手搓 JS，零依赖，零构建。

```
      (__)
      (oo)     牛来了！
/------\/      纯手搓，拒绝敷衍
* |    ||      首日票房 342 元 → 现在是你的 dsh
  ||---||
```

## 《牛来》是什么

《牛来》是 2026 年 8 月 5 日在中国大陆上映的国产 3D 动画电影，片长 86 分钟，由信雨萌执导、其母亲孙丽芳编剧，母子二人包办导演、编剧、配音等几乎全部工作，用闲鱼淘来的二手电脑纯手工制作五年，无外部投资。出品方前身是一家装修公司——导演形容自己的转行：「以前是用砖头搭建，现在是用多边形搭建。」

剧情：初生的小牛犊牛来将刚从荒漠飞来的云雀带入梦乡。梦中，云雀见证牛来在母亲牺牲、挚友豹拉相伴、狼群侵袭的多重力量感召下，成长为敢于担当、直面生死的勇士。

它的走红是 2026 年中文互联网最抽象的文化事件之一：

- 上映前只有一张**水墨风海报**，宣传词「治愈系水墨国风」；进场看到的是粗糙的三维色块建模，反差引爆全网。
- 零宣发「裸映」：首日票房 342 元，第 10 天累计仅 7705 元。
- 网友玩梗式围观（「这不叫牛来，这叫胡来」「十年后你会看懂这部电影」「见证历史」），排片从不足 5 场暴增到 359 场，媒体报道排片涨幅超 2300%、票房暴涨超 6000%，最终破 1700 万。
- 股民把片名解读成「牛（市）来了」，称其为「2026 年 A 股股民必看电影」。
- 观众同时肯定母子俩「拒绝 AI、纯手工」的态度与影片的情绪价值——「老抽象依然坚持手搓」。

### 资讯与来源

- [维基百科《牛来》](https://zh.wikipedia.org/wiki/%E7%89%9B%E6%9D%A5)：剧情、角色表、制作细节、票房节点、争议与 27 条参考来源
- [豆瓣电影条目](https://movie.douban.com/subject/38581618/)
- [百度百科电影词条](https://baike.baidu.com/item/%E7%89%9B%E6%9D%A5/59676341) / [角色词条](https://baike.baidu.com/item/%E7%89%9B%E6%9D%A5/68559184)
- [腾讯新闻：《牛来》反向爆火，全网猎奇玩梗](https://news.qq.com/rain/a/20260815A06TFD00)
- [券商中国（网易转载）：暴涨超 6000%！《牛来》突然刷屏](https://m.163.com/dy/article/L4D33GNE05568W0A.html)
- [深圳商报：《牛来》8 月 17 日下线？深圳部分影院回应](https://news.qq.com/rain/a/20260816A09GQG00)
- [搜狐：一部母子五年手作的动画奇迹](https://www.sohu.com/a/1063251239_121814834)
- [知乎专栏：7000 元票房背后，创作者朴素的动画初心](https://zhuanlan.zhihu.com/p/2071632273254961367)
- [哔哩哔哩：《牛来》万字深度解析](https://www.bilibili.com/video/BV1yJbY6zEcF/)

## 功能

### 1. 水墨海报主题（美术风格）

复刻「宣传海报」的视觉：明亮主题是**水墨海报版**——宣纸底、淡墨层次、朱砂印红主按钮；暗色主题是**梦境版**——夜晚草原深青，朱砂提亮。只覆盖 `ui-theme` 的 `--dsw-*` 语义 token，不改组件结构，随官方明暗切换自动跟随。

### 2. 抽象状态语（精神状态·表）

回合状态标签「Deep diving...」被《牛来》梗接管，每 9 秒轮换：

> 牛来了… / 正在用多边形搭建答案… / 治愈系水墨国风加载中… / 排片暴涨 2300%… / 见证历史…

回合超过 60 秒进入「五年手搓」阶段：

> 五年了，还在渲染第一帧… / 第 10 天，票房 7705 元，坚持住… / 十年后你会看懂这次深潜的…

### 3. 牛来模式 agent preset（精神状态·里）

新建会话的预设选择器中会出现「**牛来模式**」：逐行镜像官方「标准模式」的全部工具能力，仅把 persona 换成牛来——

1. **手搓精神**：做完、做对、测过再交付，拒绝 AI 味儿的糊弄；
2. **初生牛犊**：不怕硬问题，直面生死（以及生产环境）；
3. **抽象但清醒**：梗只出现在开场与收尾，代码、命令与技术结论朴素准确、零梗——梗是宣纸上的朱砂印，不许盖在正文上；
4. **票房播报**：完成任务用一行票房播报收尾（失败也如实播报，牛来从不虚报票房）。

### 4. 正片模式（彩蛋）

宣传是水墨国风，进场是五毛特效。浏览器控制台执行：

```js
localStorage.setItem("niulai.crude", "1"); location.reload();
```

字体变成 Comic Sans 系、主按钮变成高饱和绿（既是五毛特效绿，也是「绿完了才轮到牛来」的自嘲）。删除该键恢复海报版。

## 安装

需要已安装 `dsh` CLI（`npx @deepseek-ai/dsh web`）。本包为纯 JS、无任何 install/prepare 脚本，从 git 安装**不需要** `allowBuilds` 授权：

```sh
dsh plugin --profile web add github:yujiezhang-ops/NiuLai
```

建议锁定 commit，防止后续推送悄悄改变实际运行的代码：

```sh
dsh plugin --profile web add github:yujiezhang-ops/NiuLai#<commit-sha>
```

重启 `dsh --profile web`（或 `dsh web`）并硬刷新浏览器后生效：主题与状态语立即可见，「牛来模式」出现在新建会话的预设选择器中（preset 同步进 `$DSH_HOME/.agent-presets/niulai`，默认 `~/.dsh/.agent-presets/niulai`）。

卸载：

```sh
dsh plugin --profile web remove niulai
```

卸载后可手动删除 `~/.dsh/.agent-presets/niulai`。

## 配置

插件行配置（在 profile 的 `cordis.patch.yml` 里按 `id: niulai` 覆盖）：

```yaml
- override:
    - id: niulai
      config:
        enabled: true          # 总开关
        announceToAgent: true  # 是否向模型注册插件声明段落
        syncPreset: true       # 是否同步「牛来模式」preset
```

浏览器端 localStorage 开关（改后刷新生效）：

| 键 | 值 | 作用 |
|---|---|---|
| `niulai.theme` | `"off"` | 关闭主题，只留状态语 |
| `niulai.phrases` | JSON 数组，或 `{"phrases":[],"long":[]}` | 覆盖状态语 |
| `niulai.crude` | `"1"` | 正片模式彩蛋 |

## 校验

```sh
npm test
```

跑 `scripts/check.mjs`：入口语法、manifest 完整性、patch/preset 结构，以及宿主半部（假 ctx + 临时 `DSH_HOME`，断言 preset 真被同步、声明段落真被注册）与浏览器半部（导出形状）的烟囱测试。

## 兼容性与已知限制

- DeepSeek Harness 处于**开发者预览**阶段，上游会出现破坏性变更：`--dsw-*` token 名、状态标签的 DOM 结构、preset 的行清单都可能漂移。升级 dsh 后请对照上游 `standard` preset 重新 diff 本包的 `presets/niulai/agent.cordis.yml`。
- 状态语目前仅中文（《牛来》的梗翻译了就不抽象了）。
- 「牛来模式」为完整的 agent-plane 组合，只在支持 agent preset 发现（`$DSH_HOME/.agent-presets`）的 dsh 版本中出现。

## 声明

粉丝作品。本插件与电影《牛来》剧组、出品方无任何关联，不包含影片的任何图像、音频或文本素材——只有宣纸配色、一头 ASCII 牛和对这场手搓奇迹的敬意。引用的票房与报道数据均来自上方公开来源。

拒绝 AI，纯手搓。（本插件由 AI 手搓。）

## License

[MIT](LICENSE)
