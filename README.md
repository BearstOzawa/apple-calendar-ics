# 中国日历频道

面向 iPhone、iPad 与 Mac 的可组合中国日期信息服务。订阅前可在真实月视图中预览频道密度和重复关系；数据来源可追溯，算法版本固定，构建结果可复现。

[![Verify calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml)
[![Publish calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml)

[国内频道中心](https://apple-calendar.lili.uno/) · [GitHub Pages 源站](https://bearstozawa.github.io/apple-calendar-ics/) · [版本清单](https://apple-calendar.lili.uno/manifest.json) · [数据与许可](DATA_LICENSE.md)

## 产品定位

国内手机系统通常把农历、班休、黄历、天气和生活服务做成系统日期层与可选卡片。标准 ICS 无法复制全部系统能力，但可以提供一组清晰、稳定、可组合的只读频道。

本项目遵循四项产品原则：

- **先预览再订阅**：网站展示预计月度事件数和 Apple 月视图效果，不用盲选。
- **基础日历保持安静**：精选只包含班休、核心传统节日与二十四节气，并按假期范围去重。
- **标题不重复频道名**：日历颜色已经表达频道，事件标题只保留真正有用的信息。
- **高频内容明确隔离**：每日黄历和星宿默认折叠、互斥，不进入推荐搭配。
- **可信度明确分层**：官方、算法、年表与民俗内容使用不同说明。
- **拒绝伪丰富**：天气、股价、影视上新、模板化运势等动态信息不进入公共频道。

## 订阅频道

### 推荐入口

`essential.ics` 是一份清爽预设，已经包含班休、核心传统节日和二十四节气。不要再同时订阅它的拆分频道。

| 频道 | 月视图内容 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **中国日历・精选** | 假期、调休、核心节日与节气 | 约每月 3 条 | [`essential.ics`](https://apple-calendar.lili.uno/essential.ics) |

### 可拆分的基础频道

希望分别设置颜色时，用下列频道替代“精选”。

| 频道 | 月视图内容 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **中国班休** | 法定放假与调休上班 | 按官方通知 | [`work-rest.ics`](https://apple-calendar.lili.uno/work-rest.ics) |
| **传统节日** | 除夕、元宵、七夕、中元、重阳等 | 每年约 10 条 | [`festivals.ics`](https://apple-calendar.lili.uno/festivals.ics) |
| **二十四节气** | 立春、春分、夏至、冬至等 | 每月 2 条 | [`solar-terms.ics`](https://apple-calendar.lili.uno/solar-terms.ics) |
| **公众节日与纪念日** | 妇女节、青年节、教师节及全国性纪念日 | 每年 13 条 | [`observances.ics`](https://apple-calendar.lili.uno/observances.ics) |

### 按需扩展

| 频道 | 月视图内容 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **中国时令** | 七十二候、数九、三伏 | 约每月 7 条 | [`seasonal.ics`](https://apple-calendar.lili.uno/seasonal.ics) |
| **月相** | 新月、上弦月、满月、下弦月 | 每月约 4 条 | [`moon-phases.ics`](https://apple-calendar.lili.uno/moon-phases.ics) |
| **重要天象** | 日月食、主要流星雨、冲日与大距 | 不定期 | [`sky-events.ics`](https://apple-calendar.lili.uno/sky-events.ics) |
| **星座季节** | 太阳进入十二热带黄道区段 | 每月 1 条 | [`zodiac-seasons.ics`](https://apple-calendar.lili.uno/zodiac-seasons.ics) |

### 高频文化频道

| 频道 | 月视图标题 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **黄历宜忌** | `宜 纳财 · 忌 移徙`，完整信息在详情 | 每天 1 条 | [`almanac.ics`](https://apple-calendar.lili.uno/almanac.ics) |
| **二十八星宿** | `角木蛟 · 吉`，完整星宿歌在详情 | 每天 1 条 | [`lunar-mansions.ics`](https://apple-calendar.lili.uno/lunar-mansions.ics) |

这两个频道都会覆盖一年 365 天，且信息存在重叠。频道搭配器默认折叠并保持二选一。

## 数据范围

| 数据集 | 当前覆盖 | 来源性质 | 发布策略 |
| --- | --- | --- | --- |
| 法定放假与调休 | 2025—2026 | 国务院办公厅正式通知 | 人工复核；不使用预测数据 |
| 传统节日与节气 | 2025—2030 | `lunar-python==1.4.8` | 固定规则计算 |
| 公众节日与纪念日 | 2025—2030 | 国务院行政法规 | 固定日期，详情注明放假性质 |
| 黄历、星宿与时令 | 2025—2030 | `lunar-python==1.4.8` | 固定规则计算，标注民俗参考 |
| 月相、日月食与行星事件 | 2025—2030 | `astronomy-engine==2.1.19` | 固定天文算法，北京时间呈现 |
| 主要流星雨 | 2025—2030 | IMO 参考太阳黄经 + 天文算法 | 发布参考极大，说明观测条件 |
| 星座季节 | 2025—2030 | 热带黄道 + 天文算法 | 只发布星象时间 |

2027 年法定班休尚未正式公布，因此班休频道不会提前填充推测安排。传统与天文频道已经计算至 2030 年，不依赖每日在线 API。

## 日历行为标准

每次发布必须满足以下约束：

1. 连续假期合并为一条跨日事件，不生成“第 N 天”等重复内容。
2. 公共频道均为全天、透明事件，不占用忙闲状态，不包含 `VALARM`。
3. UID 来自固定逻辑 ID，不依赖标题、随机数或构建时间。
4. 只有事件实质变化时才调整 `SEQUENCE` 和数据版本。
5. 事件详情只保留对当天有用的内容；来源、许可证与算法版本集中在 Manifest 和数据说明中，避免逐条重复小尾巴。
6. 高频频道独立发布，精选频道不因新增内容而持续膨胀。
7. 天象详情采用北京时间；实际可见性仍取决于位置、昼夜和天气。

## 安装方式

最简单的方式是访问[国内频道中心](https://apple-calendar.lili.uno/)，先在月视图中搭配频道，再打开订阅清单逐个添加。也可以复制 HTTPS 地址手动添加：

- **iPhone / iPad**：设置 → 日历账户 → 添加账户 → 其他 → 添加已订阅的日历。
- **Mac**：日历 → 文件 → 新建日历订阅。

订阅为单向只读。刷新时机由 iOS、iPadOS 或 macOS 决定，GitHub Pages 更新不等于设备端实时推送。

## 访问与代理

`https://apple-calendar.lili.uno/` 是面向国内网络的主入口。Cloudflare Worker 只代理本项目固定的 GitHub Pages 源站，不接受任意目标地址，也不记录或修改日历内容。

- 页面、Manifest 和 ICS 均可通过相同路径访问，例如 `https://apple-calendar.lili.uno/essential.ics`。
- Worker 保留 ETag、Last-Modified、Range 与条件请求，ICS 响应固定为 `text/calendar`。
- 日历数据使用 5 分钟边缘缓存；源站仍是唯一发布源，不会形成两份独立数据。
- Cloudflare 不可用时，可使用 [GitHub Pages 源站](https://bearstozawa.github.io/apple-calendar-ics/)核对内容。

## 数据治理与发布

```text
国务院正式通知 ──→ 人工结构化与复核 ──→ data/official/*.json ──┐
                                                               │
固定版本历法规则 ───────────────────────────────────────────────┤
固定版本天文算法 + IMO 参考年表 ────────────────────────────────┤
                                                               ▼
                                            确定性事件生成与去重
                                                               │
                       RFC 5545、语义、密度、哈希和独立解析校验
                                                               │
                                                GitHub Pages 发布
                                                               │
                                                               ▼
                                      Cloudflare Worker 固定源站代理
                                                               │
                                                               ▼
                                        apple-calendar.lili.uno
```

候选开源项目 `NateScarlet/holiday-cn` 只用于发现班休变化。监测工作流可以创建差异报告 PR，但不会自动修改正式数据或合并候选安排。

### GitHub Actions

| 工作流 | 触发条件 | 职责 |
| --- | --- | --- |
| `ci.yml` | push、pull request | 代码规范、构建、ICS 校验、测试与产物一致性 |
| `publish.yml` | `main`、每周计划、手动触发 | 重新构建并发布 GitHub Pages |
| `monitor.yml` | 每日计划、手动触发 | 对比候选班休上游并创建审核 PR |

GitHub 的计划任务可能延迟；公共仓库连续 60 天没有活动时，计划任务也可能暂停。所有计划工作流都保留手动入口。

## 项目结构

```text
data/                       已审核的正式班休数据与文化规则
dist/                       可直接订阅的 ICS 与版本清单
site/                       GitHub Pages 频道搭配器与月视图预览
worker/                     Cloudflare Worker 固定源站代理
src/apple_calendar_ics/     构建、历法、天文、校验与监测逻辑
tests/                      数据、ICS、站点与代理测试
.github/workflows/          校验、发布与上游监测
```

## 本地开发

要求 Python 3.11 或更高版本，并使用 Node.js 检查前端与 Worker 脚本。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'

calendar-build
calendar-validate dist
ruff check src tests
ruff format --check src tests
node --check site/app.js
node --check worker/src/index.mjs
node tests/test_worker.mjs
python -m unittest discover -s tests -v
```

Worker 使用固定配置部署到已绑定的自定义域名：

```bash
npx --yes wrangler@4.124.0 deploy --config worker/wrangler.jsonc
```

`dist/` 是生成产物，不应手工编辑。使用同一输入重复运行 `calendar-build` 时，输出必须保持字节级一致。

## 能力边界

- ICS 无法复制国产系统的系统级农历层、桌面组件、卡片或专用班休样式；每日黄历只能表现为全天事件。
- 黄历和星宿属于传统民俗，不同资料可能存在口径差异。
- 日月食、流星雨与行星事件并不保证在所有地区可见。
- 本项目不发布随机生成的星座运势，不接入需要持续抓取的天气、限行、影视或赛事接口。
- Apple 私有扩展只用于渐进增强；标准标题始终保留完整语义。

## 反馈与参与

请通过分类后的 [Issue 表单](https://github.com/BearstOzawa/apple-calendar-ics/issues/new/choose)报告数据、兼容性、页面或自动化问题。提交代码和数据前请阅读[参与贡献](CONTRIBUTING.md)；安全漏洞请按照[安全策略](SECURITY.md)私下报告。

## 许可

代码采用 [MIT License](LICENSE)。政府公开信息、历法与天文依赖及 IMO 年表的许可边界见[数据来源与许可说明](DATA_LICENSE.md)。
