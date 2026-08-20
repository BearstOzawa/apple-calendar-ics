# 数据来源与许可说明

## 法定班休

仓库中的放假、调休日期是对国务院正式通知所载事实的结构化整理，不复制第三方日历的标题、提醒或编辑内容。每个年份文件都保存原始通知链接、发布日期和文号。

- 2025 年：[国务院办公厅关于2025年部分节假日安排的通知](https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm)
- 2026 年：[国务院办公厅关于2026年部分节假日安排的通知](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)

## 中国历法、黄历、星宿与时令

传统节日、二十四节气、每日黄历、二十八星宿、七十二候、数九与三伏通过 [6tail/lunar-python](https://github.com/6tail/lunar-python) 1.4.8 计算。该项目采用 MIT License，版权声明和许可条件见其上游仓库。

黄历宜忌、冲煞、星宿吉凶等属于传统民俗信息，不是国家标准或个性化择日结论。不同历书、流派或实现可能存在口径差异，本项目将其标记为 `COMPUTED`。为避免每条事件重复显示实现说明、许可证和上游链接，这些溯源信息集中保留在 Manifest 与本文档中。

## 公众节日与纪念日

妇女节、青年节、儿童节、建军节，以及二七、五卅、七七、九三、九一八等全国性节日和纪念日，依据[《全国年节及纪念日放假办法》（2024 年修订）](https://www.gov.cn/zhengce/content/202411/content_6986380.htm)结构化整理。

事件详情会明确区分“部分公民放假”和“不放假”，避免把纪念日误解为全体公民假期。该频道只整理法规中明示的固定日期，不扩展网络流行节日。

## 月相、日月食、行星事件与星座季节

月相、日月食、行星冲日、水星金星大距，以及太阳进入热带黄道区段的时间通过 [Astronomy Engine](https://github.com/cosinekitty/astronomy) 2.1.19 计算。该项目采用 MIT License。

事件使用 `Asia/Shanghai` 时区转换为北京时间。日月食事件是全球事件，实际可见性取决于观察地点是否处于可见区域和夜间；“星座季节”采用热带黄道十二等分，不等同于国际天文学联合会定义的天文学星座边界。

## 流星雨

主要流星雨的名称、常见活跃期、参考天顶每时出现率（ZHR）和峰值太阳黄经依据 [International Meteor Organization Meteor Shower Calendar](https://www.imo.net/resources/calendar/) 整理。每年的参考极大时间由固定版本的 Astronomy Engine 根据太阳黄经计算。

本仓库不重新分发 IMO 的 PDF 或图表，只结构化使用事件日期等事实信息，并在 Manifest 与本文档保留来源。原始出版物的版权归其权利人所有；实际峰值和观测效果可能因年份、月光、天气、光污染及辐射点高度而变化。

## 上游变化监测

[NateScarlet/holiday-cn](https://github.com/NateScarlet/holiday-cn)（MIT）仅作为候选变化信号。监测结果必须回到国务院正式通知核对后，才能进入 `data/official/`。

本项目没有复制 Apple 中国大陆节假日源，也没有复制 ChinaCalendar 的事件正文。这两个源只用于兼容性和产品形态对比。

仓库代码的 MIT License 不代表本项目能够为第三方原始资料重新授予许可。转载或再发布时，仍应保留本文件与逐年来源信息。
