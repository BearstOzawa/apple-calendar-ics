# 参与贡献

本项目把“订阅后长期安静、稳定、可信”放在内容数量之前。所有变更都需要说明用户可见影响，并保持数据来源可追溯、生成结果可复现。

## 选择正确的入口

| 事项 | 推荐入口 |
| --- | --- |
| 法定班休、节日或节气日期不正确 | [提交日历数据修正](https://github.com/BearstOzawa/apple-calendar-ics/issues/new?template=data-correction.yml) |
| iPhone、iPad 或 Mac 上无法订阅、重复、刷新或显示异常 | [提交 Apple 日历兼容性反馈](https://github.com/BearstOzawa/apple-calendar-ics/issues/new?template=apple-compatibility.yml) |
| Pages、构建、校验或自动化发生故障 | [提交项目故障](https://github.com/BearstOzawa/apple-calendar-ics/issues/new?template=project-bug.yml) |
| 新增频道、内容或产品能力 | [提交功能建议](https://github.com/BearstOzawa/apple-calendar-ics/issues/new?template=feature-request.yml) |
| 安全漏洞或供应链风险 | 按照 [安全策略](SECURITY.md) 私下报告 |

提交前请先搜索现有 Issue，并检查频道重叠：`essential.ics` 已包含 `work-rest.ics`，`almanac.ics` 也包含 `lunar-mansions.ics` 的星宿摘要。

## 内容准入原则

- **正式班休不预测**：只采用国务院办公厅正式通知，媒体报道和第三方日历只能作为发现线索。
- **新增内容需可长期维护**：规则应稳定、受众明确，并能说明持续更新的权威来源或确定性算法。
- **不以数量换取噪声**：避免收录含义重叠、地域或人群边界模糊、仅具营销性质的纪念日。
- **可信度必须明确**：区分官方事实、算法计算、编辑年表和传统民俗，不能用“权威”掩盖来源差异。
- **个性化内容本地生成**：生日、地点、抽牌结果等个人输入不应进入公共构建、日志或分析请求。
- **标准语义必须完整**：即使 Apple 私有扩展不生效，标题、日期和标准 ICS 字段仍应独立表达正确含义。
- **隐私默认最小化**：Issue、日志、截图和测试数据中不得出现个人日程、账户信息、令牌或未公开联系方式。

## 本地开发

项目要求 Python 3.11 或更高版本。

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

`dist/` 是由审核数据和代码生成的公开订阅产物，需要随相关变更一同提交，但不得手工编辑。重复运行 `calendar-build` 后不应产生新的差异。

## 修改法定班休

1. 在 `data/official/YYYY.json` 中记录国务院正式通知的 URL、文号和发布日期。
2. 使用一个起止区间表达连续假期；每个补班日保持独立、稳定的逻辑 ID。
3. 修正既有事件时保留 ID，并按事件语义变化递增 `sequence`。
4. 更新 `data/metadata.json` 中的 `dataset_version`。
5. 重新生成 `dist/`，审核事件标题、日期、UID、`SEQUENCE` 和订阅间的包含关系。
6. 在 Pull Request 中列出权威来源和用户可见差异。

候选上游监测生成的报告不能直接进入正式数据；它只用于提示维护者核对国务院通知。

## 修改历法、黄历或星宿

请说明日期规则、适用范围、历法依据以及与现有事件的重叠情况。若变更依赖第三方历法库，需要固定版本、增加边界测试，并说明升级后会发生的语义差异。黄历与星宿文案必须保留民俗参考边界。

## 修改天文或星象频道

- 使用固定版本算法，并明确输入时区、时间尺度和事件定义。
- 将“全球发生”与“本地可见”分开表述，不根据单一地点误判所有订阅者的可见性。
- 流星雨等年表数据需要保留原始机构、参考版本和峰值可能浮动的说明。
- 星座内容应区分可复现的黄道时间和编辑性质的运势解读；后者不进入公共订阅。

## 修改个人日历工具

个人工具必须默认在浏览器本地运行，不上传输入或生成结果。生成的 ICS 应使用稳定日期语义、CRLF 行尾、75 字节折行、透明事件且不包含默认提醒。若引入图片或第三方牌义文字，必须先解决来源与再分发许可。

## 修改页面或工程代码

- 页面变更需要兼顾手机和桌面布局、键盘操作、可读性以及无 JavaScript 时的基本订阅信息可达性。
- 构建与校验逻辑应保持确定性；网络请求不得进入正式构建路径。
- GitHub Actions 依赖应固定到明确的主版本，并遵循最小权限原则。
- 对行为变化增加对应测试；对纯文档变更说明为何不需要生成新产物。

## Pull Request 要求

一个 Pull Request 只处理一个清晰问题，并包含：

- 变更原因和用户可见结果；
- 数据变更的权威来源与语义差异；
- 实际执行的验证命令；
- 生成产物是否变化，以及变化是否符合预期；
- 未解决的兼容性、来源或发布风险。

合并前必须通过仓库校验工作流。维护者可能要求拆分范围、补充来源或撤回无法长期维护的内容。
