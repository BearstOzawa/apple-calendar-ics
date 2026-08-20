(function attachTarotTools(globalScope) {
  "use strict";

  const majorArcana = [
    ["愚者", "启程 · 自由 · 信任", "今天有什么值得带着好奇心迈出第一步？"],
    ["魔术师", "创造 · 专注 · 行动", "你已经拥有的资源，可以怎样被真正使用起来？"],
    ["女祭司", "直觉 · 沉静 · 观察", "暂时不急于回答时，你能听见什么内在声音？"],
    ["皇后", "滋养 · 丰盛 · 感受", "今天可以怎样更温柔地照顾自己或身边的人？"],
    ["皇帝", "秩序 · 边界 · 责任", "哪一条清晰的边界会让事情更稳定？"],
    ["教皇", "传统 · 学习 · 信念", "哪些经验值得继承，哪些规则需要重新理解？"],
    ["恋人", "选择 · 连接 · 一致", "这个选择是否与你真正重视的价值保持一致？"],
    ["战车", "方向 · 意志 · 推进", "把力量集中到一个方向，会带来什么变化？"],
    ["力量", "勇气 · 耐心 · 柔韧", "你能否以温和而坚定的方式面对眼前难题？"],
    ["隐者", "独处 · 寻索 · 洞见", "减少外界声音后，你最需要看清的是什么？"],
    ["命运之轮", "周期 · 转机 · 接纳", "当局面开始变化，你可以主动调整哪一部分？"],
    ["正义", "衡量 · 诚实 · 结果", "如果忠于事实而非情绪，你会怎样作出判断？"],
    ["倒吊人", "暂停 · 换位 · 放下", "换一个角度看，原本的阻碍是否有新的意义？"],
    ["死神", "结束 · 转化 · 更新", "什么已经完成使命，可以被认真告别？"],
    ["节制", "调和 · 节奏 · 平衡", "怎样的比例与节奏，能让你走得更长久？"],
    ["恶魔", "依附 · 欲望 · 觉察", "哪个习惯正在消耗你的选择空间？"],
    ["高塔", "震动 · 真相 · 重建", "当旧结构不再可靠，真正需要保留的是什么？"],
    ["星星", "希望 · 疗愈 · 指引", "有什么微小但真实的希望值得继续照料？"],
    ["月亮", "不确定 · 梦境 · 感知", "在信息尚不完整时，怎样避免被恐惧牵着走？"],
    ["太阳", "清晰 · 活力 · 分享", "今天有什么值得坦然表达和庆祝？"],
    ["审判", "回应 · 复盘 · 觉醒", "回看过去的选择，你准备回应什么新的召唤？"],
    ["世界", "完成 · 整合 · 开放", "这一阶段教会了你什么，又为下一程留下什么？"],
  ].map(([name, keywords, reflection], index) => ({
    id: `major-${index}`,
    arcana: "大阿卡那",
    symbol: romanNumeral(index),
    name,
    keywords,
    reflection,
  }));

  const suits = [
    { id: "wands", name: "权杖", symbol: "♢", theme: "行动与热情" },
    { id: "cups", name: "圣杯", symbol: "○", theme: "情感与关系" },
    { id: "swords", name: "宝剑", symbol: "◇", theme: "思考与沟通" },
    { id: "pentacles", name: "星币", symbol: "□", theme: "现实与资源" },
  ];

  const ranks = [
    ["ace", "王牌", "开始 · 潜能", "哪一个新的可能值得被认真接住？"],
    ["two", "二", "权衡 · 选择", "面对两个方向时，最重要的判断标准是什么？"],
    ["three", "三", "协作 · 展开", "谁可以与你共同把想法推进一步？"],
    ["four", "四", "稳定 · 空间", "怎样建立既可靠又不过度僵化的结构？"],
    ["five", "五", "摩擦 · 调整", "冲突正在提醒你关注什么被忽略的需要？"],
    ["six", "六", "流动 · 回应", "给予和接受之间，哪里需要恢复平衡？"],
    ["seven", "七", "检视 · 坚持", "继续投入之前，哪些假设值得重新核对？"],
    ["eight", "八", "推进 · 练习", "重复做好哪件小事，会带来真正的进展？"],
    ["nine", "九", "成熟 · 守护", "接近完成时，你需要守住什么边界？"],
    ["ten", "十", "完成 · 承担", "哪些责任应当完成，哪些负担可以放下？"],
    ["page", "侍从", "探索 · 消息", "以学习者的姿态，你会发现什么新线索？"],
    ["knight", "骑士", "追寻 · 动力", "行动的速度是否与真正的方向一致？"],
    ["queen", "王后", "理解 · 内在掌握", "怎样用成熟的方式照顾这份能量？"],
    ["king", "国王", "担当 · 外在掌握", "你可以怎样为选择承担清晰的责任？"],
  ];

  const minorArcana = suits.flatMap((suit) =>
    ranks.map(([id, rank, keywords, reflection]) => ({
      id: `${suit.id}-${id}`,
      arcana: `${suit.name}牌组`,
      symbol: suit.symbol,
      name: `${suit.name}${rank}`,
      keywords: `${suit.theme} · ${keywords}`,
      reflection: `${reflection}（关注${suit.theme}）`,
    })),
  );

  const deck = [...majorArcana, ...minorArcana];

  function romanNumeral(value) {
    if (value === 0) return "0";
    const pairs = [
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];
    let number = value;
    let result = "";
    for (const [amount, numeral] of pairs) {
      while (number >= amount) {
        result += numeral;
        number -= amount;
      }
    }
    return result;
  }

  function hashText(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomSeed() {
    if (globalScope.crypto?.getRandomValues) {
      return globalScope.crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 0xffffffff);
  }

  function drawForDate(dateKey, deviceSeed) {
    const seed = hashText(`${deviceSeed}:${dateKey}`);
    const card = deck[seed % deck.length];
    const reversed = ((seed >>> 8) & 1) === 1;
    return { ...card, reversed };
  }

  function shuffledDeck(seed = randomSeed()) {
    const cards = [...deck];
    let state = seed >>> 0;
    function next() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    }
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const target = Math.floor(next() * (index + 1));
      [cards[index], cards[target]] = [cards[target], cards[index]];
    }
    return cards;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function dateKey(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  function compactDate(value) {
    return value.replaceAll("-", "");
  }

  function addDays(value, amount) {
    const date = parseDateKey(value);
    date.setUTCDate(date.getUTCDate() + amount);
    return dateKey(date);
  }

  function escapeIcsText(value) {
    return value
      .replaceAll("\\", "\\\\")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .replaceAll("\n", "\\n")
      .replaceAll(";", "\\;")
      .replaceAll(",", "\\,");
  }

  function foldLine(line, limit = 75) {
    const encoder = new TextEncoder();
    const parts = [];
    let current = "";
    let currentBytes = 0;
    let payloadLimit = limit;
    for (const character of line) {
      const characterBytes = encoder.encode(character).length;
      if (current && currentBytes + characterBytes > payloadLimit) {
        parts.push(current);
        current = character;
        currentBytes = characterBytes;
        payloadLimit = limit - 1;
      } else {
        current += character;
        currentBytes += characterBytes;
      }
    }
    parts.push(current);
    return parts.join("\r\n ");
  }

  function eventLines(card, startDate, suffix, reversed = false) {
    const orientation = reversed ? "逆位" : "正位";
    const description = [
      `牌组：${card.arcana}`,
      `关键词：${card.keywords}`,
      `自省提示：${card.reflection}`,
      `方向：${orientation}`,
      "说明：本内容用于文化学习与自我反思，不构成心理、医疗、财务或其他专业建议。",
    ].join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:tarot-${startDate}-${card.id}-${suffix}@apple-calendar-ics.bearstozawa.github.io`,
      `DTSTAMP:${new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${compactDate(startDate)}`,
      `DTEND;VALUE=DATE:${compactDate(addDays(startDate, 1))}`,
      `SUMMARY;LANGUAGE=zh-CN:${escapeIcsText(`塔罗｜${card.name} · ${orientation}`)}`,
      `DESCRIPTION;LANGUAGE=zh-CN:${escapeIcsText(description)}`,
      "CLASS:PRIVATE",
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "CATEGORIES;LANGUAGE=zh-CN:塔罗研习,自我反思",
      "END:VEVENT",
    ];
  }

  function buildCalendar(name, events) {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BearstOzawa//Personal Tarot Calendar//ZH-CN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME;LANGUAGE=zh-CN:${escapeIcsText(name)}`,
      "X-WR-TIMEZONE:Asia/Shanghai",
      ...events.flat(),
      "END:VCALENDAR",
    ];
    return `${lines.map((line) => foldLine(line)).join("\r\n")}\r\n`;
  }

  function buildDailyCalendar(card, startDate) {
    return buildCalendar(
      "今日塔罗",
      [eventLines(card, startDate, "daily", card.reversed)],
    );
  }

  function buildStudyCalendar(startDate, seed = randomSeed()) {
    const cards = shuffledDeck(seed);
    const events = cards.map((card, index) =>
      eventLines(card, addDays(startDate, index), `study-${index + 1}`),
    );
    return buildCalendar("塔罗 78 日研习", events);
  }

  const api = {
    addDays,
    buildDailyCalendar,
    buildStudyCalendar,
    dateKey,
    deck,
    drawForDate,
    randomSeed,
    shuffledDeck,
  };

  globalScope.TarotTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
