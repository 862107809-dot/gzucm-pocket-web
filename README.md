# 广中医口袋 · Safari / Windows 公开部署测试版 v1.3

> **非官方、未经校方授权验证的演示／开发版。** 尚不能承诺“学生打开网页只输一次密码，就能在网站内看到真实教务与电费”。请先阅读下方的认证限制。

## 下载后先做什么？

1. Windows 安装 [Node.js LTS](https://nodejs.org/)，双击 `scripts/start-windows.bat`。
2. 本机浏览器打开 `http://127.0.0.1:4173`。运行 `npm test` 检查单元测试。
3. 要生成公开 HTTPS 地址：按照 [`docs/DEPLOY_WINDOWS_PUBLIC.md`](docs/DEPLOY_WINDOWS_PUBLIC.md)，用 GitHub Desktop 上传到自己的仓库，再在 Render 用 `render.yaml` 部署。
4. 不需要 Mac，不需要让 Windows 电脑保持开机。

## 本次增加的两项功能

### 官方账号密码登录入口（和扫码并存）

- “连接学校教务”弹窗提供 **账号密码** / **扫码登录** 两个选项。
- 账号密码选项会先申请校方二维码登录确认链接，点击链接后到 **gzucm.edu.cn 官方域名**完成账号密码与确认流程。密码**不在本站输入、不传到本站服务器、不保存**。
- 官方确认后，后台试验性查询扫码状态并同步本科课表、课程成绩、考级和体测。
- **限制：** 校方未确认单手机通过密码登录后是否允许在二维码确认页面授权；学校可能要求另外扫码。这不是“表单内直接输入学号密码”的完整替代方案。

### 电费实时查询入口及服务器端只读数据适配

- 页面新增「尝试实时同步」与「打开学校实时电费页」。
- 后端新增 `server/ecard.js`，在**已持有有效一卡通会话时**读取 `/user/powerfee/index` 的余额和房间信息，以及 `/user/powerfee/getDailyDetails` 的逐日用电记录。
- 返回的数据包含 `source: "ecard-live"`、`updatedAt`，只有成功解析真实响应后才标记为“官方接口实时读取”；没有会话绝不返回演示余额冒充实时。
- **重要限制：** 一卡通和教务并不是一套可自动共享给第三方云服务器的 Cookie。当前公开网站没有可靠的 **一卡通独立授权回调**，所以无法保证网站内自动实时同步能成功。用户可以通过「打开学校实时电费页」登录学校官方一卡通并立即查看实时电费；这个链接是真实校方查询，不是本站复制的数据。

## 文件结构

- `index.html`, `app.js`, `styles.css`：iPhone / iPad / Mac / Windows 自适应界面。
- `server/server.js`：每个浏览器独立的短期会话、同源 API、安全响应头。
- `server/school.js`：官方扫码会话与本科教务数据只读查询。
- `server/ecard.js`：学校一卡通只读接口（需要有效一卡通服务器端登录态）。
- `server/parsers.js`：课表、成绩、用电页面和 JSON 解析。
- `render.yaml`：Render 自动部署。`tests/`：无需学校账号的单元测试。

## 安全须知

- 本站不能读取学校浏览器选项卡中的 `HttpOnly` Cookie；为了“方便”让学生向第三方网页交出学校密码或 Cookie 是高风险做法，不会默认实现。
- 学校官方页面的真实 URL 必须是 `https://jw.gzucm.edu.cn/`、`https://authserver.gzucm.edu.cn/` 或 `https://ecard.gzucm.edu.cn/` 等校方主机，谨防仿冒。
- Render 的免费实例可能因休眠导致登录态失效；仅用于测试，勿在获得校方授权和正式安全审计前面向全校推广。
- 本项目参考 [Hello-Minecraft/gzucm-pocket](https://github.com/Hello-Minecraft/gzucm-pocket) 的接口解析思路，保留第三方版权与 MIT 许可声明，独立非官方实现。
