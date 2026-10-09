# 价盯盯

降价了，才写信给你。

价盯盯是一个盯价格的小服务：注册账号，贴上商品链接，设一个目标价，或者设一个相对加入价的降幅。后台去看价格，降到了才发信。

当前是可运行的 MVP：邮箱密码登录、SQLite、演示商品、通用 HTML 价格解析、进程内定时检查、命令行检查和 cron 接口。没配邮箱时，信会写进 `data/outbox`，并出现在盯价详情里。

## 快速开始

需要 Node.js 22 或更高版本。

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。首页点「用耳机试一次」，注册后会带上 `mock://earbuds`。默认目标价是 ¥600。第一次检查记下 ¥699，不会发信；在详情页再点「立即检查」，售价变成 ¥549，信会出现在页面下方，文件在 `data/outbox/`。

## 环境变量

见 `.env.example`。

| 变量 | 作用 |
| --- | --- |
| `DATABASE_URL` | SQLite 连接串，默认 `file:./data/jiadingding.db`，文件在项目根目录的 `data/` |
| `SESSION_SECRET` | 会话 Cookie 的 HMAC 密钥，至少 16 位。Cookie 为 httpOnly |
| `CRON_SECRET` | `GET /api/cron/check` 的密钥 |
| `ENABLE_SCHEDULER` | `true` 时 Next.js 进程内按间隔检查已启用的盯价 |
| `CHECK_INTERVAL_MS` | 定时检查间隔，默认 60000，最小 5000 |
| `SMTP_HOST` | 留空则不发信，只写发件箱 |
| `SMTP_PORT` | 默认 587 |
| `SMTP_USER` / `SMTP_PASS` | 有用户名时作为 SMTP 认证 |
| `SMTP_FROM` | 发件人 |
| `SMTP_SECURE` | `true` 用于 465 等隐式 TLS；587 STARTTLS 保持 `false` |

改完 `ENABLE_SCHEDULER` 后重新启动 `npm run dev`。

## 适配器

### 演示商品

| 链接 | 商品 | 标价 | 第一次售价 | 之后的售价 |
| --- | --- | --- | --- | --- |
| `mock://earbuds` | 云感降噪耳机 | ¥899 | ¥699 | ¥549 |
| `mock://kettle` | 恒温电热水壶 | ¥299 | ¥259 | ¥219 |
| `mock://keyboard` | 静音机械键盘 | ¥499 | ¥459 | ¥399 |
| `mock://lamp` | 护眼台灯 | ¥189 | ¥189 | ¥189，不降价 |

「之后」指这件盯价已经有过一次成功检查。创建盯价时会做第一次检查。

### HTML

`http://` 和 `https://` 链接会抓取页面，按这个顺序取价：

1. JSON-LD 里 `Offer.price`（也认 `AggregateOffer.lowPrice`）
2. `product:price:amount`
3. `og:price:amount`
4. `itemprop="price"`

本地演示页是 [http://localhost:3000/demo/tote](http://localhost:3000/demo/tote)，帆布托特包，JSON-LD 价格 ¥128。检查它时开发服务器要开着。

抓取有 12 秒超时和 1MB 体积上限。这里没有针对电商的反爬绕过。

## 规则和发信

- 目标价：当前售价小于等于目标价。
- 降幅：相对加入时的售价，下降百分比达到设定值。
- 第一次命中会发信。之后价格没有再降，或再降不足 ¥0.5，不重复发信。再降至少 ¥0.5 且规则仍成立，才再发一封。
- 配了 `SMTP_HOST` 时用 nodemailer 发信。否则打印日志，并把 JSON 写到 `data/outbox/`。详情页会列出信件正文。
- 暂停的盯价不会被定时任务、`npm run check-prices` 和 cron 扫到。详情页上的「立即检查」仍然可用。

## 怎么触发检查

1. 控制台或详情页的「立即检查」。
2. `.env` 里 `ENABLE_SCHEDULER=true`，由 Next.js 进程定时跑。
3. 命令行：`npm run check-prices`。
4. HTTP：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check
```

也接受 `?secret=`，密钥放在请求头里更合适。

## 脚本

```bash
npm test          # 规则、HTML 解析、演示商品发件箱
npm run lint
npm run check-prices
npm run build
```

## 下一步

真实商品需要各站点的价格适配器，而不是在这个 MVP 里硬闯反爬。账号和盯价稳定之后，可以用 Stripe 做订阅计费。支付和微信登录都还没做。
