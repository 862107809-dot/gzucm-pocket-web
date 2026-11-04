# Safari 认证接入：问题、解决方案、边界

## 原因

Android 原应用使用系统 WebView 让学生直接在校方页面登录，然后 WebView 的 CookieManager 可以在 App 进程内取到学校会话。Web Safari 的页面没有这样的跨站 Cookie 读取权限，CORS 也阻止前端网页直接读取学校 API JSON。即使第三方 Cookie 功能打开，也不等于第三方脚本可读取 `HttpOnly` Cookie。因此“Safari 网页抓取用户已登录的学校 Cookie”不可实现、也不应尝试。

## 采用的架构

前端 → 同源 `/api` → Node.js BFF → 学校官方域名。用户不提交密码到本网页，官方二维码确认后，由服务器端 HTTP 客户端保存自己的会话。公开模式使用可信 HTTPS 反向代理下的 Node 服务，严格按浏览器独立分配会话；公网部署增加了云端托管登录凭据的风险。原私人模式仍可使用。

## REST 接口（仅限自己的站点使用）

| API | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 本地服务状态 |
| `/api/session` | GET | 会话状态，自动分配站内 `HttpOnly` cookie |
| `/api/qr/start` | POST | 官方申请二维码，回传官方链接 + 本地生成 SVG |
| `/api/qr/status` | GET | 官方二维码状态 0/1/2；状态 2 后尝试兑换学校会话并 ping |
| `/api/academic/semester?code=202601` | GET | 校历与第 1 周真实星期一、周数 |
| `/api/academic/week?week=1` | GET | 对应教学周课程；以 `qsrq` 反推周次，修复周日错位 |
| `/api/academic/grades` | GET | 课程、考级和体测（独立成功/失败） |
| `/api/academic/exams` | GET | 只读考试安排，前端尚未集成考试页 |
| `/api/power` | GET | 501；避免把没有一卡通会话的结果标为实时 |
| `/api/logout` | POST | 清除内存里的学校登录态 |

教务允许主机固定为 `jw.gzucm.edu.cn`；Server 校验 4 次以内重定向和 TLS 证书，禁止不在允许名单的地址。对学校 JSON 做字段白名单映射，不转发身份证等数据。

### cookie 的存储

站内用 `gzsid`（HttpOnly, SameSite=Strict）标记独立浏览器会话，学校的 `JSESSIONID` 只存在 Node 内存的 `(host, path, name)` 字典。会话 12 小时未使用过期。QR 缓存 30 分钟。服务进程结束会清空登录态。用户的**课程记录仍会被网页 localStorage 持久化**，不等于所有数据都不落盘。

### 局域网部署和安全防护

- 默认监听 `127.0.0.1:4173`，可以无证书运行，因为仅限本机。
- 改 `HOST=0.0.0.0` 后，服务会检查 `TLS_CERT`、`TLS_KEY` 和至少 12 字符的 `ACCESS_CODE`；缺失就直接拒绝启动。
- 局域网模式访问需先在 `/pair` 输入设备访问口令，配对 Cookie 使用 `Secure; HttpOnly; SameSite=Strict`；这并不等于适合公网部署。
- **禁止把本机 127.0.0.1 端口通过任何反向代理、隧道或端口转发直接公开**：上述设备访问门禁是基于监听 HOST 判断，错误的反向代理配置会绕过该门禁。
- 不要把证书私钥、ACCESS_CODE、学校 Cookie 或明文 JSON 上传 GitHub。

### 当前局限

1. 登录 API 是根据原公开项目的实际字段移植；没有真实学生账号可做端到端验证。
2. 二维码确认可能依赖微信或另一个设备；仅提供打开官方确认页的尝试入口，不保证同设备认证。
3. 学校扫码确认后若跳转到独立认证域名，当前服务的域名限制会拒绝请求。若要扩展，请先基于校方允许的官方 SSO 流程验证并建立严格允许名单，而不是关闭校验。
4. 宿舍用电在 `ecard.gzucm.edu.cn` 的独立身份体系中；无扫码复用和会话证明，当前只能本地管理或导入。
5. Safari 在非可信 HTTPS 下不能正常注册 Service Worker；这是浏览器限制。
6. 未做高并发和多租户安全审计，不适合作为面向全校公开部署的服务。

## 数据安全测试建议

运行 `npm test`；在没有真实账号的条件下验证 JSON 解析、周次、URL allowlist、二维码 SVG、同名 Cookie 按 Path 保存。开发者有合法测试账号后，应在**自己允许使用的校园网络内**核查以下项目：QR 参数、会话续期、服务器重定向、校历跨学期、按周重复排课、教室字段、考试成绩分页、手机 WebKit 兼容性。不要用未经授权的账号测试。

## 公开模式补充 v1.2

设置 `PUBLIC_MODE=1`、`HOST=0.0.0.0` 后仅允许受信任 HTTPS 反代访问，禁用统一配对码；会话 ID 使用 Secure 的 `__Host-gzsid` Cookie；登录成功时轮换标识，用户之间会话隔离，内存最多 300 条活动会话。二维码请求附带全局频率限制；公开客户端默认不写 localStorage。Render 部署与风险见 `docs/DEPLOY_WINDOWS_PUBLIC.md`。**尚未做正式安全审计。**

## v1.3：官方密码登录入口和一卡通读接口

### 登录方式的真实含义

“密码登录”不是本站接受 `username/password` 再登录学校。它申请一个学校二维码确认会话后，打开由校方提供的确认链接；用户仅在校方域名完成密码认证与确认。这避免第三方收集校方账号密码，但是否能在同一台手机顺利完成授权仍需真实学生测试。若校方不允许同设备确认，必须采用扫码或获取校方正式 OAuth/SSO 第三方授权。

### 电费数据源

`GET /api/power` 调用 `EcardClient.live()`：只有具有合法**一卡通服务器端会话**，才会解析 `https://ecard.gzucm.edu.cn/user/powerfee/index`，获得绑定房间、页面 token 与剩余度数，再通过 `getDailyDetails` 获取每日明细。若跳转到 authserver 或无法证明是已登录页面，返回 HTTP 428 和 `ECARD_LOGIN_REQUIRED`，不能伪造实时结果。`POST /api/logout` 同时清除这两个会话容器。该 API 无法自动获得另一标签页的 Cookie，也没有获取校方正式 SSO 授权回调。前端直接链接校方官方电费查询页作为真实可用的替代入口。至今**没有真实账号完成端到端电费 API 验证**。

未经授权严禁让使用者手工复制学校 Cookie / CAS Ticket / JSESSIONID 提供给第三方网站。这类值足以授权敏感操作，不是安全解决办法。
