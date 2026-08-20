## 变更说明

<!-- 说明要解决的问题、方案，以及订阅者能够感知到的结果。 -->

## 变更类型

- [ ] 法定班休数据
- [ ] 传统历法、黄历或星宿数据
- [ ] 月相、天象或星象数据
- [ ] ICS 构建或校验
- [ ] 订阅页面或个人工具
- [ ] 自动化或依赖
- [ ] 文档与仓库维护

## 来源与语义差异

<!-- 数据变更必填；其他变更可填写“不适用”。 -->

- 权威来源：
- 影响的订阅：
- 新增、修改或移除的事件：
- UID / `SEQUENCE` 处理：

## 验证

<!-- 勾选实际执行且适用于本次变更的项目。 -->

- [ ] `calendar-build`
- [ ] `calendar-validate dist`
- [ ] `ruff check src tests`
- [ ] `ruff format --check src tests`
- [ ] `node --check site/app.js`
- [ ] `node --check worker/src/index.mjs`
- [ ] `node tests/test_worker.mjs`
- [ ] `python -m unittest discover -s tests -v`
- [ ] 已确认生成产物符合预期，或本次变更不影响 `dist/`

## 发布检查

- [ ] 未引入未经正式确认的班休预测数据
- [ ] 未造成综合订阅与独立订阅内的意外重复
- [ ] 全天、透明、无默认提醒和稳定 UID 等产品约束仍成立
- [ ] Issue、日志、截图和测试数据不含个人信息或凭据
- [ ] 已说明尚未验证的设备兼容性或其他风险
