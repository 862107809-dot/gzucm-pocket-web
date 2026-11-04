# Windows 用户：如何把广中医口袋变成公开网址（Render 测试版）

> 版本 1.3。**不需要 Mac，不需要购买域名，也不需要把 Windows 电脑一直开着。** 公开测试环境的真实学校登录目前没有账号验证；先让你自己测试通过，再向同学开放。

## 先看风险和条件

- 你使用的是**非官方**项目。学校可能限制教务接口的云服务器出口或高频访问；不保证公网可用。
- 网站服务器会在内存中持有每个登录用户的**教务会话凭据**，尽管不经手学校密码，也属于敏感信息。请在公开推广前确认学校相关规定、授权与个人信息处理要求；为实际使用者提供自己的隐私政策、联系方式及安全处理机制。
- Render 的免费 Node Web Service 空闲约 15 分钟会休眠，唤醒要额外时间，服务端的登录状态会丢失；只适合测试。面向大量同学或日常稳定使用，需要可持续运行的实例，并完成安全审核。
- Render 的云服务区域可能在境外（本模板选 Singapore）；若个人信息涉及跨境处理，应先完成相应合规评估。
- 如果学校扫码确认流程需要另一个设备，或云端收到的二维码状态不准确，单台 iPhone 登录可能失败。这个限制尚未通过真实账号验证。

## A. 在 Windows 上准备源码（GitHub Desktop 图形界面）

1. 安装 [GitHub Desktop](https://desktop.github.com/) 并登录你自己的 GitHub 账号。
2. 解压 `GZUCM_Pocket_Public_Windows_Render_v1.3.zip`。进入 `gzucm-pocket-web-v1.3` 文件夹，确认可以看到 `render.yaml`、`package.json`、`server` 等文件。
3. GitHub Desktop：**File → Add Local Repository → Choose...** 选上一步这个文件夹。第一次提示不是 Git 仓库时，选择 **Create a Repository Here**（在此创建仓库）。
4. 点击 **Publish repository**。建议勾选 **Keep this code private**（保持私有）。
5. 以后修改源码后可以在 GitHub Desktop 中填写提交说明，点击 **Commit to main → Push origin**，Render 会自动重新部署。

若你熟悉 Git，也可以在该文件夹下用命令行提交，关键是 `render.yaml` 必须在仓库根目录，不能多套一层目录。

## B. 在 Render 上获取 HTTPS 公开网址

1. 打开 <https://dashboard.render.com/>，使用 GitHub 登录/连接账户。
2. 按 **New → Blueprint**（使用项目根目录的 `render.yaml`）创建 Blueprint，选择你刚发布的仓库，确认同步。
3. 该配置创建**Node.js Web Service**，区域为 Singapore，`HOST=0.0.0.0`、`PUBLIC_MODE=1`、`NODE_ENV=production`，服务端启动为 `npm start`，健康检查 `/health`。
4. 等待 Render 显示 **Live**；在 Service 页面复制 `https://你的服务名.onrender.com`。链接的实际名称以 Render 分配为准，**不要把文档里的示例当作已存在的链接**。
5. 打开 `https://...onrender.com/health`，确认显示 `ok: true`；再打开网站主页。第一次会弹出登录教务提示。
6. 登录方式：在 **账号密码 / 扫码登录** 中任选其一。账号密码模式是**在学校官方域名输入密码再完成链接确认**（不是本站直接收集密码）；扫码登录采用官方扫码确认。若在同一部手机上，可尝试**打开学校确认页**，或截图二维码并用微信扫一扫的相册功能识别；能否成功要由学校验证流程决定。确认后，网站按自己的浏览器会话调用课表与成绩接口。

**也可以不用 Blueprint：** New → Web Service → 连接 GitHub → 选择仓库 → Node → Build Command `npm install --omit=dev` → Start Command `npm start`；Environment Variables 设置 `HOST=0.0.0.0`、`PUBLIC_MODE=1`、`NODE_ENV=production`；Health Check Path `/health`。

## C. 在 Windows 上先本地测试（非公开）

1. 从 <https://nodejs.org/> 安装 Node.js 18+。
2. 双击 `scripts/start-windows.bat`；Windows Defender 如提示防火墙访问，**不要开放到公共网络**。
3. Edge/Chrome 打开 `http://127.0.0.1:4173/`。
4. `npm test` 可测试课表解析和公开模式安全边界。

本地模式不需要 `PUBLIC_MODE=1`；不建议在 Windows 上通过路由器端口映射直接公开这个 Node 进程。

## D. 向同学提供的操作说明

1. 在 Safari、Chrome 或 Edge 打开你分享的 HTTPS 链接。
2. 点击 **账号密码**（前往学校官网完成认证及确认）或者 **扫码登录**；不用在该非官方网站输入教务密码。
3. 认证成功后即可查看**本科**课表、课程成绩、考级及体测，并可导出日历。
4. 点设置 → 退出当前学校会话可以退出。

**暂时不能承诺：** 同一台 iPhone 一定能完成学校官网密码确认或二维码认证，研究生实时同步，**电费在本站内自动读取**，公开网站端到端稳定性。电费页面已提供学校官方实时查询的直接入口；独立一卡通服务器端授权机制尚缺失。未确认前请始终以学校官网数据为准。

## E. 为什么不能直接用 GitHub Pages、Vercel 静态站或一份 HTML？

学校的 Cookie 是跨站、HttpOnly 的，Safari 不允许第三方站点读取。单纯托管静态网页只会有 UI，没有拿学校数据的权限。必须有**受保护的同源后台**，保管每位用户自己的教务会话。此版用 Node BFF，并非绕过 Safari 限制。

## F. 安全边界 / 不适合直接大规模上线的原因

- 站内凭证：HttpOnly + Secure + SameSite=Strict，扫码成功后会话标识会轮换；使用者之间独立。服务器进程内存最多保持 12 小时不活跃会话。
- 公网服务须由可信 HTTPS 反向代理提供 TLS，服务器仅信任其 `X-Forwarded-Proto: https`；此假设匹配 Render。**切勿直接将 `PUBLIC_MODE=1` 的进程端口暴露在 VPS 公网**，否则可伪造转发头。
- 不对学校密码进行采集，也不把学校 Cookie 发到浏览器。针对请求有域名白名单、来源检查和二维码速率限制。
- 公网模式不默认在浏览器 localStorage 保存学生的课表/成绩；主动导出的 JSON 仍是明文，需用户自行保管。
- 会话保存在单个 Node 进程内存中。Render 免费实例休眠、重启或自动扩容后，用户可能需要重新登录；不适合多实例扩容。
- 仍需完善安全日志策略、异常监控、漏洞评估、个人信息保护告知、学校系统使用授权。**这只是可公开访问的测试版，不是已获得校方批准的正式生产服务。**

## 故障定位

| 情况 | 检查点 |
|---|---|
| Render 一直提示 Port not detected | 检查 `HOST=0.0.0.0`、`npm start` 和 Render 设置的端口 |
| HTTPS 网站返回 426 | 查看 Render 反向代理是否确实传入 `X-Forwarded-Proto: https`，不能把 Node 端口直接暴露公网 |
| 首次打开特别慢 | 免费服务可能休眠，等待其唤醒 |
| 扫码无结果 | 校方二维码接口/认证页面或云服务器 IP 受限，无法从无账号测试中保证成功 |
| 只有示例成绩 | 检查登录状态、学校返回数据，演示内容不能作为真实信息使用 |
| 电费没有在本网站内实时显示 | 可以点「打开学校实时电费页」直接到一卡通官方页面查询；目前缺少独立一卡通第三方授权回调，无法保证自动回填 |

本文部署方法参考 Render 官方文档：<https://render.com/docs/web-services>、<https://render.com/docs/free>、<https://render.com/docs/blueprint-spec>。
