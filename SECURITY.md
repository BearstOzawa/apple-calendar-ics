# 安全策略

## 支持范围

安全修复只面向默认分支 `main`、当前 GitHub Pages 站点以及由该站点发布的最新 ICS 文件。历史提交、个人 Fork 和第三方镜像不在维护范围内。

## 私下报告漏洞

请使用 GitHub 的 [Private vulnerability reporting](https://github.com/BearstOzawa/apple-calendar-ics/security/advisories/new) 提交安全问题，不要先创建公开 Issue。

报告中请尽量包含：

- 受影响的文件、工作流、页面或订阅地址；
- 可复现步骤和实际影响；
- 已验证的平台、提交或发布时间；
- 建议的缓解方式（如有）。

请勿在报告中附带真实个人日程、账户凭据、访问令牌或与复现无关的隐私数据，也不要通过破坏性操作验证问题。

适合私下报告的范围包括供应链或 GitHub Actions 权限风险、可导致发布产物被篡改的问题、恶意 ICS 内容注入，以及站点或仓库意外泄露敏感信息的情形。

日期错误、事件重复、设备显示差异和普通功能建议不属于安全漏洞，请使用对应的公开 [Issue 表单](https://github.com/BearstOzawa/apple-calendar-ics/issues/new/choose)。

本项目由个人维护，暂不承诺固定响应时限。经确认的问题会优先限制影响、准备修复，并在不扩大风险的前提下协调公开说明。
