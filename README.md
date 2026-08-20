# 中国日历频道

面向 iPhone、iPad 与 Mac 的可组合中国日期信息服务。提供法定班休、传统黄历、二十八星宿、中国时令、月相、重要天象与星座季节；数据来源可追溯，算法版本固定，构建结果可复现。

[![Verify calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml)
[![Publish calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml)

[国内频道中心](https://apple-calendar.lili.uno/) · [GitHub Pages 源站](https://bearstozawa.github.io/apple-calendar-ics/) · [版本清单](https://apple-calendar.lili.uno/manifest.json) · [数据与许可](DATA_LICENSE.md)

## 产品定位

国内手机系统通常把农历、班休、黄历、天气和生活服务做成系统日期层与可选卡片。标准 ICS 无法复制全部系统能力，但可以提供一组清晰、稳定、可组合的只读频道。

本项目遵循四项产品原则：

- **基础日历保持安静**：精选只包含班休、核心传统节日与二十四节气。
- **高频内容独立订阅**：每日黄历和星宿不会默认进入精选。
- **可信度明确分层**：官方、算法、年表与民俗内容使用不同说明。
- **个性化信息留在本地**：塔罗工具在浏览器生成个人 ICS，不上传用户输入或结果。

## 订阅频道

### 基础日历

两个基础方案二选一；`essential.ics` 已包含 `work-rest.ics` 的全部内容。

| 频道 | 内容 | 更新依据 | 订阅 |
| --- | --- | --- | --- |
| **中国日历・精选** | 法定班休、核心传统节日、二十四节气 | 国务院正式通知 + 固定历法规则 | [`essential.ics`](https://apple-calendar.lili.uno/essential.ics) |
| **中国班休** | 仅法定放假与调休上班 | 国务院正式通知 | [`work-rest.ics`](https://apple-calendar.lili.uno/work-rest.ics) |

### 传统历法

| 频道 | 内容 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **中国黄历** | 农历、干支、宜忌、冲煞、彭祖百忌、神位、星宿摘要 | 每日一条 | [`almanac.ics`](https://apple-calendar.lili.uno/almanac.ics) |
| **二十八星宿** | 星宿吉凶、十二值星、值日天神、九星、星宿歌 | 每日一条 | [`lunar-mansions.ics`](https://apple-calendar.lili.uno/lunar-mansions.ics) |
| **中国时令** | 七十二候、数九、三伏 | 约每五日 | [`seasonal.ics`](https://apple-calendar.lili.uno/seasonal.ics) |

黄历已经包含星宿摘要。只想查看完整星宿信息时选择“二十八星宿”；同时订阅两份会在每天产生两条传统历法事件。

### 天文与星象

| 频道 | 内容 | 频率 | 订阅 |
| --- | --- | --- | --- |
| **月相** | 新月、上弦月、满月、下弦月 | 每月四次 | [`moon-phases.ics`](https://apple-calendar.lili.uno/moon-phases.ics) |
| **重要天象** | 日月食、主要流星雨、火木土星冲日、水星金星大距 | 不定期 | [`sky-events.ics`](https://apple-calendar.lili.uno/sky-events.ics) |
| **星座季节** | 太阳进入十二热带黄道区段的北京时间 | 每月一次 | [`zodiac-seasons.ics`](https://apple-calendar.lili.uno/zodiac-seasons.ics) |

“星座季节”只发布可复现的黄道时间，不提供模板化每日运势。热带黄道的十二等分也不等同于 IAU 天文学星座边界。

## 塔罗个人工具

[频道中心](https://apple-calendar.lili.uno/#tarot) 提供两个完全在浏览器运行的工具：

- **每日一牌**：同一设备当天结果保持稳定，可下载为一条私人全天事件。
- **塔罗 78 日研习**：选择开始日期后生成包含 78 张牌的个人 ICS。

项目不提供一份所有人相同的公共塔罗订阅，也不上传问题、生日或抽牌结果。塔罗内容用于文化学习与自我反思，不构成心理、医疗、财务或其他专业建议。

## 数据范围

| 数据集 | 当前覆盖 | 来源性质 | 发布策略 |
| --- | --- | --- | --- |
| 法定放假与调休 | 2025—2026 | 国务院办公厅正式通知 | 人工复核；不使用预测数据 |
| 传统节日与节气 | 2025—2030 | `lunar-python==1.4.8` | 固定规则计算 |
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
5. 所有事件保留 HTTPS 来源、内容类型和数据状态元数据。
6. 高频频道独立发布，精选频道不因新增内容而持续膨胀。
7. 天象详情采用北京时间；实际可见性仍取决于位置、昼夜和天气。

## 安装方式

最简单的方式是访问[国内频道中心](https://apple-calendar.lili.uno/)，点击对应频道的“添加频道”。也可以复制 HTTPS 地址手动添加：

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
site/                       GitHub Pages 频道中心与本地个人工具
worker/                     Cloudflare Worker 固定源站代理
src/apple_calendar_ics/     构建、历法、天文、校验与监测逻辑
tests/                      数据、ICS、站点和塔罗生成测试
.github/workflows/          校验、发布与上游监测
```

## 本地开发

要求 Python 3.11 或更高版本，并使用可执行 Node.js 语法检查和塔罗生成测试。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'

calendar-build
calendar-validate dist
ruff check src tests
ruff format --check src tests
node --check site/app.js
node --check site/tarot.js
node tests/test_tarot.js
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

- ICS 无法复制国产系统的系统级农历层、桌面组件、卡片或专用班休样式。
- 黄历和星宿属于传统民俗，不同资料可能存在口径差异。
- 日月食、流星雨与行星事件并不保证在所有地区可见。
- 本项目不发布随机生成的星座运势，不接入需要持续抓取的天气、限行、影视或赛事接口。
- Apple 私有扩展只用于渐进增强；标准标题始终保留完整语义。

## 反馈与参与

请通过分类后的 [Issue 表单](https://github.com/BearstOzawa/apple-calendar-ics/issues/new/choose)报告数据、兼容性、页面或自动化问题。提交代码和数据前请阅读[参与贡献](CONTRIBUTING.md)；安全漏洞请按照[安全策略](SECURITY.md)私下报告。

## 许可

代码采用 [MIT License](LICENSE)。政府公开信息、历法与天文依赖、IMO 年表及塔罗文本的许可边界见[数据来源与许可说明](DATA_LICENSE.md)。
