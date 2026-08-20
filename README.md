# Apple Calendar ICS

面向 iPhone 和 Mac 的中国日历订阅：清爽、可审核、可组合。

这个项目不追求把所有节日都塞进一份大日历。它把国务院正式班休安排、核心传统节日和二十四节气规范化后重新生成，重点解决重复事件、逐日假期、默认闹钟、忙碌占用和 UID 不稳定等问题。

## 订阅

GitHub Pages 启用后，可以使用以下稳定地址：

| 订阅 | 内容 | 地址 |
| --- | --- | --- |
| 中国日历・精选 | 法定班休、核心传统节日、二十四节气 | `https://bearstozawa.github.io/apple-calendar-ics/essential.ics` |
| 中国班休 | 仅法定放假和调休上班 | `https://bearstozawa.github.io/apple-calendar-ics/work-rest.ics` |

当前数据范围：

- 法定放假和调休：2025—2026 年，均附国务院正式通知。
- 传统节日和二十四节气：2025—2030 年，由固定版本历法库计算。
- 2027 年法定班休尚未正式公布，因此不会用预测数据填充。

不要同时订阅 `essential.ics`、`work-rest.ics` 和 Apple 自带“中国大陆节假日”，否则相同班休会重复。一般用户只需要 `essential.ics`。

### iPhone

最简单的方法是在项目 Pages 首页点击“在 Apple 日历中订阅”。也可以在系统设置中进入“日历账户”，选择“添加账户 → 其他 → 添加已订阅的日历”，粘贴 HTTPS 地址。不同 iOS 版本的菜单名称可能略有差异。

### Mac

打开“日历”，选择“文件 → 新建日历订阅”，粘贴 HTTPS 地址。建议把位置设为 iCloud，并根据需要设置自动刷新频率。

这是只读订阅。GitHub Pages 更新后，何时重新拉取由 macOS/iOS 决定，不是实时双向同步。

## 设计原则

- 连续假期使用一条跨日事件，不生成“第 N 天/共 N 天”。
- 补班是全天、透明事件，不模拟 09:00—18:00 会议。
- 默认没有 `VALARM`，不会突然在补班日前一小时提醒。
- 所有事件都是 `TRANSP:TRANSPARENT`，不会占用忙闲状态。
- UID 来自固定逻辑 ID，不依赖标题、随机数或构建时间。
- 只有事件实质变化时才调整 `SEQUENCE` 和数据版本。
- 未正式确认的数据不能进入班休订阅。
- `X-APPLE-SPECIAL-DAY` 仅作为 Apple 渐进增强；即使客户端忽略它，标题中的“休｜”“班｜”仍能表达完整语义。

## 数据与发布流程

```text
国务院正式通知 ──→ data/official/*.json ──┐
                                            ├─→ 确定性生成 ─→ 校验 ─→ GitHub Pages
固定版本历法规则 ─→ data/culture.json ─────┘

候选开源上游 ─→ 每日监测 ─→ 差异报告 PR ─→ 人工核对正式通知
```

`monitor.yml` 每天检查一次 `NateScarlet/holiday-cn`。该上游只用于发现候选变化；Action 只会创建或更新审核 PR，不会直接修改正式数据或发布订阅。

`publish.yml` 只从 `main` 构建。发布前会检查：

- RFC 5545 的 CRLF 和 75 字节折行。
- ICS 能被独立解析器完整读取。
- UID 和语义事件不重复。
- 事件均为全天、透明、无默认提醒。
- 每日同时显示的事件数量不超过上限。
- 生成结果和清单哈希完全一致。

GitHub 的定时工作流只在默认分支运行，高峰期可能延迟；公共仓库连续 60 天没有活动时，定时任务也可能被暂停。仓库保留 `workflow_dispatch`，可以随时手动运行监测。

## 本地开发

需要 Python 3.11 或更高版本。

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

生成内容位于 `dist/`。同一份数据重复构建时，文件必须保持字节级一致。

## 更新正式班休数据

1. 找到国务院正式通知，不能只依据媒体文章或其他 ICS。
2. 新建或修改 `data/official/YYYY.json`，保留来源 URL、文号和发布日期。
3. 假期使用一个起止区间；每个补班日使用稳定的 `makeup-N` 逻辑 ID。
4. 如果是对既有事件的修正，保留 ID 并递增相应 `sequence`。
5. 更新 `data/metadata.json` 中的 `dataset_version`。
6. 重新生成、运行测试并检查 `dist/` 的语义差异。

## GitHub Pages 初次设置

进入仓库 Settings → Pages，把 Source 设为 **GitHub Actions**。合并到 `main` 后，`publish.yml` 会部署 `site/` 与最新 ICS 文件。

如果要让定时监测自动创建审核 PR，还需要在 Settings → Actions → General 中给工作流读写权限，并启用“Allow GitHub Actions to create and approve pull requests”。监测工作流不会自动合并 PR。

## 后续计划

- 独立的 `culture.ics`，方便用户自行组合颜色和内容。
- 有严格收录标准的 `observances.ics`。
- 地区节庆、考试等完全独立的可选频道。
- 在不同 iOS/macOS 版本上验证 Apple 私有“班/休”显示效果。

代码采用 MIT License。数据和第三方来源边界见 [DATA_LICENSE.md](DATA_LICENSE.md)。
