# 中国日历订阅

面向 iPhone、iPad 与 Mac 的中国日期信息订阅服务。提供法定放假与调休、核心传统节日和二十四节气；数据来源可追溯，构建结果可复现，发布过程可审核。

[![Verify calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/ci.yml)
[![Publish calendars](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml/badge.svg)](https://github.com/BearstOzawa/apple-calendar-ics/actions/workflows/publish.yml)

[订阅首页](https://bearstozawa.github.io/apple-calendar-ics/) · [版本清单](https://bearstozawa.github.io/apple-calendar-ics/manifest.json) · [数据与许可](DATA_LICENSE.md)

## 产品定位

国内手机系统通常在操作系统层整合农历、节气、法定班休和专用视觉标记。Apple 日历可以订阅区域节假日，但难以同时满足内容可组合、事件不重复、班休语义明确和数据来源可审核等需求。

本项目在标准 ICS 能力范围内提供一层稳定的数据服务：

- **清晰**：连续假期合并为一条跨日事件，补班与休假使用明确标题。
- **安静**：所有事件均为全天、透明事件，不占用忙闲状态，不附带默认提醒。
- **可组合**：提供综合日历与纯班休日历，用户按已有日历配置选择其一。
- **可追溯**：法定班休仅采用国务院正式通知，保留来源、文号和发布日期。
- **可持续**：稳定 UID、确定性构建和自动校验降低更新后重复或漂移的风险。

本项目不是 Apple 官方产品，也不替代系统级农历、桌面组件或双向日历同步。

## 快速订阅

| 方案               | 内容                               | 适用场景                                   | 订阅地址                                                                               |
| ------------------ | ---------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| **中国日历・精选** | 法定班休、核心传统节日、二十四节气 | 默认推荐；希望一个订阅覆盖日常中国日期信息 | [订阅 `essential.ics`](https://bearstozawa.github.io/apple-calendar-ics/essential.ics) |
| **中国班休**       | 仅法定放假与调休上班               | 已使用其他节日或农历来源，只补充班休信息   | [订阅 `work-rest.ics`](https://bearstozawa.github.io/apple-calendar-ics/work-rest.ics) |

> [!IMPORTANT]
> `essential.ics` 已包含 `work-rest.ics` 的班休内容，请勿同时订阅。若选择“精选”，建议同时关闭 Apple 自带的“中国大陆节假日”和其他综合中国日历源，避免重复事件。

最简单的安装方式是访问[订阅首页](https://bearstozawa.github.io/apple-calendar-ics/)，选择方案后点击“添加到 Apple 日历”。也可以复制 HTTPS 地址手动添加：

- **iPhone / iPad**：设置 → 日历账户 → 添加账户 → 其他 → 添加已订阅的日历。
- **Mac**：日历 → 文件 → 新建日历订阅。

不同系统版本的菜单名称可能略有差异。订阅为只读模式，刷新时机由 iOS、iPadOS 或 macOS 决定。

## 数据范围

| 数据集         | 当前覆盖  | 权威来源                       | 发布策略                       |
| -------------- | --------- | ------------------------------ | ------------------------------ |
| 法定放假与调休 | 2025—2026 | 国务院办公厅正式通知           | 人工核对后发布；不使用预测数据 |
| 传统节日       | 2025—2030 | 固定版本 `lunar-python==1.4.8` | 由明确历法规则生成             |
| 二十四节气     | 2025—2030 | 固定版本 `lunar-python==1.4.8` | 由明确历法规则生成             |

2027 年法定班休尚未正式公布，因此当前订阅不会提前填充推测安排。正式通知发布后，项目会在核对来源和语义差异后更新。

## 日历行为标准

每次发布都必须满足以下产品约束：

1. **事件归一化**：一段连续假期对应一个跨日事件，不生成“第 N 天”等重复信息。
2. **低干扰**：事件使用 `TRANSP:TRANSPARENT`，且不包含 `VALARM`。
3. **身份稳定**：UID 来自固定逻辑 ID，不依赖标题、随机数或构建时间。
4. **更新可控**：仅当事件实质变化时调整 `SEQUENCE` 和数据版本。
5. **兼容优先**：标题中的“休｜”与“班｜”承载完整语义；`X-APPLE-SPECIAL-DAY` 仅作为 Apple 客户端的渐进增强。
6. **正式数据优先**：未经正式来源确认的内容不能进入班休订阅。

## 数据治理与发布架构

```text
国务院正式通知 ──→ 人工结构化与复核 ──→ data/official/*.json ──┐
                                                               ├─→ 确定性构建
固定版本历法规则 ───────────────────────→ data/culture.json ─────┘
                                                                       │
                                     RFC 5545 校验与语义测试 ←─────────┘
                                                                       │
                                              main ──→ GitHub Pages ──→ ICS

候选开源上游 ──→ 每日差异监测 ──→ 审核 PR ──→ 核对国务院正式通知
```

候选开源项目 `NateScarlet/holiday-cn` 只用于发现可能的数据变化。监测工作流可以创建差异报告 PR，但不会自动修改正式数据、合并 PR 或发布候选安排。

### 发布前检查

- RFC 5545 的 CRLF 行尾与 75 字节折行。
- 两份 ICS 均可被独立解析器完整读取。
- UID、逻辑事件与日期语义不存在重复。
- 所有事件均为全天、透明且无默认提醒。
- 单日事件密度不超过产品上限。
- 构建产物与 `manifest.json` 的 SHA-256 完全一致。
- 重复构建保持字节级一致。

### GitHub Actions

| 工作流        | 触发条件              | 职责                                       |
| ------------- | --------------------- | ------------------------------------------ |
| `ci.yml`      | push、pull request    | 代码规范、构建、ICS 校验、测试与产物一致性 |
| `publish.yml` | `main` 更新、手动触发 | 重新构建并发布 GitHub Pages                |
| `monitor.yml` | 每日定时、手动触发    | 对比候选上游；有差异时创建审核 PR          |

GitHub 的定时任务可能在高峰期延迟；公共仓库连续 60 天没有活动时，计划任务也可能被暂停。`monitor.yml` 保留了手动触发入口。

## 项目结构

```text
data/                 已审核的正式班休数据与文化规则
dist/                 可直接订阅的 ICS 与版本清单
site/                 GitHub Pages 产品页
src/apple_calendar_ics/
                      构建、校验与上游监测逻辑
tests/                数据、ICS 与监测测试
.github/workflows/    校验、发布与监测工作流
```

## 本地开发

要求 Python 3.11 或更高版本。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'

calendar-build
calendar-validate dist
ruff check src tests
ruff format --check src tests
python -m unittest discover -s tests -v
```

生成文件位于 `dist/`。使用同一份输入数据重复执行 `calendar-build` 时，输出必须保持不变。

## 更新法定班休数据

1. 获取国务院正式通知，不以媒体报道或第三方 ICS 作为最终依据。
2. 新建或修改 `data/official/YYYY.json`，记录来源 URL、文号和发布日期。
3. 使用一个起止区间表示连续假期；为每个补班日分配稳定逻辑 ID。
4. 修正既有事件时保留 ID，并递增对应 `sequence`。
5. 更新 `data/metadata.json` 中的 `dataset_version`。
6. 重新生成并执行全部检查，重点审核 `dist/` 的语义差异。
7. 通过 pull request 合并到 `main`，由发布工作流部署。

## 能力边界

- ICS 无法完整复制小米、华为等系统在日历应用内部提供的农历层、组件和系统级班休样式。
- Apple 私有扩展的呈现方式可能随 iOS、iPadOS 和 macOS 版本变化；标准标题始终保留完整语义。
- 订阅是单向只读发布，不会读取或修改用户的个人日程。
- GitHub Pages 更新后，设备端何时重新拉取由 Apple 系统控制，并非实时推送。

## 反馈与参与

请通过分类后的 [Issue 表单](https://github.com/BearstOzawa/apple-calendar-ics/issues/new/choose) 报告日历数据、Apple 设备兼容性、网站与自动化故障，或提出功能建议。提交代码和数据前请阅读 [参与贡献](CONTRIBUTING.md)；安全漏洞请按照 [安全策略](SECURITY.md) 私下报告。

## 路线图

- 在主流 iOS、iPadOS 与 macOS 版本上建立兼容性测试矩阵。
- 提供独立的传统节日与节气订阅，支持更细粒度组合。
- 为地区节庆、考试等内容建立独立频道与严格收录标准。
- 增加版本变更摘要，帮助订阅者识别新增、修正与来源变化。

## 许可

代码采用 [MIT License](LICENSE)。数据、政府公开信息和第三方历法库的许可边界见 [DATA_LICENSE.md](DATA_LICENSE.md)。
