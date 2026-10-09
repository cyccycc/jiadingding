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

`fetchQuote` 按链接选择适配器。`mock://` 仍然走演示商品。品牌官网和京东只在页面 HTML 里已经有公开标价时能读到价格。不登录、不提交验证码、不换代理、不伪装成浏览器。请求使用 `JiaDingDing/0.1 (price watch)`，不带 Cookie。

测试用保存在 `src/lib/prices/fixtures/` 的 HTML 片段，不会在 CI 里访问京东或品牌官网。

### 演示商品

| 链接 | 商品 | 标价 | 第一次售价 | 之后的售价 |
| --- | --- | --- | --- | --- |
| `mock://earbuds` | 云感降噪耳机 | ¥899 | ¥699 | ¥549 |
| `mock://kettle` | 恒温电热水壶 | ¥299 | ¥259 | ¥219 |
| `mock://keyboard` | 静音机械键盘 | ¥499 | ¥459 | ¥399 |
| `mock://lamp` | 护眼台灯 | ¥189 | ¥189 | ¥189，不降价 |

「之后」指这件盯价已经有过一次成功检查。创建盯价时会做第一次检查。

### 品牌官网

这些主机走品牌适配器。其他子域名也算，例如 `www.apple.com.cn`。路径不限，但页面里必须有公开标价，否则不会猜一个数字。

| 站点 | 主机 | 建议链接 |
| --- | --- | --- |
| Apple 中国 | `apple.com.cn` | `https://www.apple.com.cn/shop/buy-iphone/iphone-16`，以及 `/shop/buy-mac/`、`/shop/buy-ipad/`、`/shop/buy-watch/`、`/shop/buy-airpods/`、`/shop/product/型号` |
| Apple | `apple.com` | 同上的 `/shop/…` 路径。标价必须是人民币 |
| 戴森 | `dyson.cn`、`dyson.com.cn` | 商品详情页 |
| 索尼中国 | `sony.com.cn` | 商品详情页 |
| 小米 | `mi.com` | `/shop/buy/detail` 这类商品详情 |
| 华为商城 | `vmall.com` | 商品详情页 |
| 华为 | `huawei.com` | 商品页 |
| 三星中国 | `samsung.com.cn` | 商品详情页 |

取价顺序：

1. JSON-LD 里的 `Offer` / `AggregateOffer`。`price` 或 `lowPrice`；没有这两项时读 `priceSpecification`（`SalePrice` 当售价，`ListPrice` 当标价）
2. `product:price:amount`
3. `og:price:amount`
4. `itemprop="price"`（`content`，或标签里的文本）

同时有外币和人民币报价时用人民币。只有美元等外币时，错误是「该页面标价不是人民币，暂不支持」。买页如果是前端空壳、HTML 里没有上述标价，错误是：「Apple 中国」页面没有公开标价（JSON-LD Offer、og:price 或 itemprop="price"），暂无法读取。HTTP 401、403、429 则是「该页需登录或触发风控，暂无法抓取」。

上面的 Apple、京东地址是链接形状，不代表该商品仍在售，也不保证对方每次都把价格写进 HTML。

### 京东

只解析商品页公开 HTML，不调用未文档化的内部接口。

| 页面 | 例子 |
| --- | --- |
| `item.jd.com/{sku}.html` | `https://item.jd.com/100012043978.html` |
| `item.m.jd.com/product/{sku}.html` | `https://item.m.jd.com/product/100012043978.html` |
| `item.jd.hk/{sku}.html` | `https://item.jd.hk/100012043978.html` |
| `npcitem.jd.hk/{sku}.html` | `https://npcitem.jd.hk/100012043978.html` |

`sku` 是数字。可以带查询串。首页、搜索页、店铺页会直接提示「请使用京东商品页链接，例如 https://item.jd.com/100012043978.html」，不会去抓首页。

能读到价格时，顺序是：

1. 页面里的 JSON-LD `Offer`（人民币或未写币种）
2. 当前商品的 `J-p-{sku}` 文本
3. 主价格区域 `p-price` 里的数字

`page_origin_price` 或 `p-price-origin` 若高于售价，记为标价。页头的「请登录」链接不算拦截；旁边其他商品的价格也不会拿来当这件的售价。

这些情况返回「该页需登录或触发风控，暂无法抓取」：

- HTTP 401、403、429
- 最终地址落到 `passport.jd.com`、`plogin.m.jd.com`、`login.jd.com`，或京东域名下的 `/login`
- 页面是登录或验证页，例如标题含「京东-欢迎登录」「京东验证」，或正文要求滑动验证

商品页打开了，但价格节点是空的（常见于价格由脚本稍后填上），返回「京东页面没有公开标价，暂无法抓取」。

### 其他 HTML

不是上面这些主机的 `http://` 和 `https://` 链接，仍走通用 HTML 适配器，取价顺序与品牌官网相同。没写币种时当作人民币；写了外币则拒绝。找不到价格时仍是「页面里没有解析到价格」。HTTP 401、403、429 同样是「该页需登录或触发风控，暂无法抓取」，其他状态码仍是「页面返回 HTTP {状态码}」。

本地演示页是 [http://localhost:3000/demo/tote](http://localhost:3000/demo/tote)，帆布托特包，JSON-LD 价格 ¥128。检查它时开发服务器要开着。

抓取有 12 秒超时和 1MB 体积上限。超时是「页面请求超时」。

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
npm test          # 规则、HTML 解析、品牌官网、京东、演示商品发件箱
npm run lint
npm run check-prices
npm run build
```

## 下一步

品牌官网和京东商品页已经有适配器，但只吃页面上的公开标价。登录墙、验证码、脚本后才出现的价格，不会绕过去。账号和盯价稳定之后，可以用 Stripe 做订阅计费。支付和微信登录都还没做。
