# Phonics Picnic

一个根据孩子学校 phonics 测评定制、面向 5 岁儿童的英语自然拼读小游戏。每次游戏约 5 分钟，包含：

- 首音辨认（First sounds）
- CVC 拼读（CVC blending）
- 测评重点字母音 `t / n / c / k / ck / e / u / i`
- 简单词阅读与拼写
- Tricky words：`to / the / no / go / I`
- 英文语音提示、温和重试、无扣分机制
- 本地保存进度，并自动增加薄弱技能出现频率
- 家长学习概览与线下练习建议

## 运行

这是一个无依赖的静态网页。建议在项目目录启动任意本地静态服务器，例如：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 测试

```bash
npm test
npm run check
```

题库和测评权重位于 `src/learning.js`。初始优先级来自学校测评，之后会继续根据游戏答题情况自适应。
