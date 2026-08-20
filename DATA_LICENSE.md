# 数据来源与许可说明

## 法定班休

仓库中的放假、调休日期是对国务院正式通知所载事实的结构化整理，不复制第三方日历的标题、提醒或编辑内容。每个年份文件都保存原始通知链接、发布日期和文号。

- 2025 年：[国务院办公厅关于2025年部分节假日安排的通知](https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm)
- 2026 年：[国务院办公厅关于2026年部分节假日安排的通知](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)

## 传统节日与二十四节气

日期通过 [6tail/lunar-python](https://github.com/6tail/lunar-python) 1.4.8 计算。该项目采用 MIT License。本仓库只启用经过明确筛选的核心传统节日与二十四节气，不发布黄历宜忌、每日农历或原项目的其他内容。

## 上游变化监测

[NateScarlet/holiday-cn](https://github.com/NateScarlet/holiday-cn)（MIT）仅作为候选变化信号。监测结果必须回到国务院正式通知核对后，才能进入 `data/official/`。

本项目没有复制 Apple 中国大陆节假日源，也没有复制 ChinaCalendar 的事件正文。这两个源只用于兼容性和产品形态对比。

仓库代码的 MIT License 不代表本项目能够为第三方原始资料重新授予许可。转载或再发布时，仍应保留本文件与逐年来源信息。

