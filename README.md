# 中国日历（Apple Calendar ICS）

面向 iPhone、iPad 与 Mac 的可组合中国日期信息订阅服务。支持在真实 Apple 月视图中翻月预览密度与跨日排版，提供 **Cloudflare 边缘一键合订（单一日历）** 与 **分频道独立配色** 两种订阅模式。

[![Verify calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml)
[![Publish calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml)

[在线预览与搭配中心](https://apple-calendar.lili.uno/) · [版本清单](https://apple-calendar.lili.uno/manifest.json) · [数据与许可](DATA_LICENSE.md)

## 核心特性

- **交互式月视图预览**：支持 2025—2030 年自由翻月、长假快捷跳转、连续多日横条渲染与点击弹出日程备注详情，支持浅色/深色外观。
- **双模式订阅交付**：
  - **一键合订（`/bundle.ics`）**：在 Cloudflare 边缘实时合并所选频道并自动执行跨频道去重，可选开启当天 09:00 或前一日 20:00 提醒、自定义日历名称与颜色，并支持生成本地二维码扫码订阅。
  - **分频道订阅**：13 个静态 ICS 均内置 `X-APPLE-CALENDAR-COLOR` 与 RFC 7986 `COLOR` 扩展，客户端订阅时自动带入推荐配色。
- **严谨克制的数据治理**：法定班休人工核对国务院办公厅通知（已更新至 **2027 年**，国办发明电〔2026〕10号）；历法与天象采用固定版本算法计算至 **2030 年**，字节级确定性输出。

## 订阅频道

### 推荐主频道

`essential.ics` 已包含法定班休、核心传统节日与二十四节气，并完成跨频道语义去重。

| 频道 | 默认色 | 月视图内容 | 频率 | 静态地址 |
| --- | --- | --- | --- | --- |
| **中国日历** | `#DE3D32` | 法定放假、调休、传统节日与节气 | 约 3 条/月 | [`essential.ics`](https://apple-calendar.lili.uno/essential.ics) |

### 可拆分基础频道

希望为班休、传统节日和节气分别设置不同颜色时，可单独订阅以下拆分频道（请勿与「中国日历」同时订阅）：

| 频道 | 默认色 | 月视图内容 | 频率 | 静态地址 |
| --- | --- | --- | --- | --- |
| **中国班休** | `#684B83` | 法定放假与调休上班 | 按官方通知 | [`work-rest.ics`](https://apple-calendar.lili.uno/work-rest.ics) |
| **传统节日** | `#D66B2C` | 除夕、元宵、龙抬头、七夕、中元、重阳等 | 每年约 10 条 | [`festivals.ics`](https://apple-calendar.lili.uno/festivals.ics) |
| **二十四节气** | `#BF8626` | 立春、春分、夏至、冬至等 | 每月 2 条 | [`solar-terms.ics`](https://apple-calendar.lili.uno/solar-terms.ics) |
| **公众节日与纪念日** | `#5B708F` | 妇女节、青年节、教师节及全国性纪念日 | 每年 13 条 | [`observances.ics`](https://apple-calendar.lili.uno/observances.ics) |

### 按需扩展频道

| 频道 | 默认色 | 月视图内容 | 频率 | 静态地址 |
| --- | --- | --- | --- | --- |
| **假期提醒** | `#CC5F3B` | 已确认法定假期开始前 7 天提示一次 | 每个假期 1 条 | [`holiday-reminders.ics`](https://apple-calendar.lili.uno/holiday-reminders.ics) |
| **生活节日** | `#BA506D` | 情人节、母亲节、父亲节、520、感恩节、圣诞节等 | 每年 9 条 | [`life-festivals.ics`](https://apple-calendar.lili.uno/life-festivals.ics) |
| **农历初一十五** | `#52705E` | 每个农历月初一与十五 | 每月 2 条 | [`lunar-days.ics`](https://apple-calendar.lili.uno/lunar-days.ics) |
| **中国时令** | `#8A6235` | 七十二候、数九、三伏节点 | 约每 5 日 | [`seasonal.ics`](https://apple-calendar.lili.uno/seasonal.ics) |
| **月相** | `#47749F` | 新月、上弦月、满月、下弦月 | 每月约 4 条 | [`moon-phases.ics`](https://apple-calendar.lili.uno/moon-phases.ics) |
| **重要天象** | `#B72F59` | 日月食、主要流星雨极大、行星冲日与大距 | 不定期 | [`sky-events.ics`](https://apple-calendar.lili.uno/sky-events.ics) |

### 每日文化频道

| 频道 | 默认色 | 月视图内容 | 频率 | 静态地址 |
| --- | --- | --- | --- | --- |
| **黄历宜忌** | `#9A4FA5` | `宜 纳财 · 忌 移徙`，完整干支冲煞在详情 | 每日 1 条 | [`almanac.ics`](https://apple-calendar.lili.uno/almanac.ics) |
| **二十八星宿** | `#765D45` | `角木蛟 · 吉`，完整值星九星在详情 | 每日 1 条 | [`lunar-mansions.ics`](https://apple-calendar.lili.uno/lunar-mansions.ics) |

### 边缘动态合订参数（`/bundle.ics`）

```text
https://apple-calendar.lili.uno/bundle.ics?feeds=essential,holiday-reminders,life-festivals&name=中国日历&color=%23DE3D32&remind=09:00
```

- `feeds`：必填，逗号分隔的频道标识（最多 8 个），自动执行跨频道语义去重。
- `name`：可选，自定义日历显示名称（最长 32 字符）。
- `color`：可选，6 位十六进制颜色值（如 `#DE3D32`）。
- `remind`：可选，支持 `08:00`、`09:00`、`12:00`、`20:00` 或 `prev-20:00`（前一日 20:00）；省略则不生成 `VALARM`。
- `download=1`：可选，附加 `Content-Disposition: attachment` 以便离线下载 `.ics` 文件。

## 数据范围

| 数据集 | 当前覆盖 | 来源性质 | 发布策略 |
| --- | --- | --- | --- |
| 法定放假与调休 | 2025—2027 | 国务院办公厅正式通知 | 人工复核；不使用预测数据 |
| 传统节日与节气 | 2025—2030 | `lunar-python==1.4.8` | 固定规则计算 |
| 公众节日与纪念日 | 2025—2030 | 国务院行政法规 | 固定日期，详情注明放假性质 |
| 生活节日 | 2025—2030 | 固定日期与星期规则 | 明确标注不属于法定节假日 |
| 黄历、星宿与时令 | 2025—2030 | `lunar-python==1.4.8` | 固定规则计算，标注民俗参考 |
| 农历初一十五 | 2025—2030 | `lunar-python==1.4.8` | 每月仅发布两条 |
| 月相、日月食与行星事件 | 2025—2030 | `astronomy-engine==2.1.19` | 固定天文算法，北京时间呈现 |
| 主要流星雨 | 2025—2030 | IMO 参考太阳黄经 + 天文算法 | 发布参考极大，说明观测条件 |

## 部署架构（Cloudflare Workers + Static Assets）

本项目完整托管于 **Cloudflare Workers（兼容免费版配额）**，无需依赖外部源站：

1. **静态资产层（Workers Static Assets）**：网页前端与 13 个预构建单频道 `.ics` 直接由 Cloudflare 边缘静态资产网络直出，零跨洋回源、不消耗每日 Worker 请求配额。
2. **动态合成层（Worker Runtime）**：仅 `/bundle.ics` 与历史兼容路径 `/apple-calendar-ics/*` 触发 Worker 脚本，读取本地静态绑定（`env.ASSETS`）完成毫秒级去重合成与边缘缓存（`caches.default`）。

## 本地开发与部署

要求 Python 3.11+ 与 Node.js 20+：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'

# 构建与校验日历数据
calendar-build
calendar-validate dist

# 代码检查与单元测试
ruff check src tests
ruff format --check src tests
node tests/test_calendar_core.mjs
node tests/test_worker.mjs
python -m unittest discover -s tests -v

# 组装静态资产并部署至 Cloudflare Workers
rm -rf _site && mkdir -p _site
cp -R site/. _site/
cp dist/*.ics dist/manifest.json dist/dense-preview.json _site/
npx --yes wrangler@4.124.0 deploy --config worker/wrangler.jsonc
```

## 许可

代码采用 [MIT License](LICENSE)。政府公开信息、历法与天文依赖及 IMO 年表的许可边界见[数据来源与许可说明](DATA_LICENSE.md)。
