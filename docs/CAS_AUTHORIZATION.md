# 学校统一身份认证接入说明（CAS）

> 本站是非官方项目。**当前未取得广州中医药大学批准第三方应用的证据。**
> 不得把“打开学校网页登录页”误写为“密码自动同步教务”。

## 已实现

- 广中医口袋页面打开学校官方登录小窗口，原网页保持不变；密码和验证码只在校方域名输入。
- **默认关闭**的可选 CAS 票据回调：服务端一次性状态绑定、5 分钟超时、SameSite=Lax 临时回调 Cookie、服务端 HTTPS 票据验证、回调结果不含个人身份信息。
- 已批准且启用后，CAS 回调只记录 `casVerified: true`，不会把它直接当成教务登录成功，也不复制学校 Cookie。
- 未授权时仅打开学校官方入口；扫码登录继续负责已经验证过的课表同步。

## 需要学校信息中心确认

1. 是否允许非官方服务 `广中医口袋` 申请注册为 CAS 客户端？
2. 是否接受以下**精确**的 HTTPS `service`/回调地址（如改用自有已备案域名，先向校方重新登记）：
   `https://gzucm-pocket-web.onrender.com/auth/cas/callback`
3. 身份认证服务器是否使用：
   - 登录端点 `https://authserver.gzucm.edu.cn/authserver/login`
   - CAS 2 票据验证端点 `https://authserver.gzucm.edu.cn/authserver/serviceValidate`
   以上为 CAS 标准形式，**该校实际票据校验端点尚未实测确认**。
4. 除 CAS 身份验证外，学校是否提供**受支持的第三方读教务数据授权机制**，例如官方 API、后端服务令牌或明确允许的 CAS proxy ticket/代理授权？**CAS 票据验证不能直接获得 `jw.gzucm.edu.cn` 的 `JSESSIONID`**。
5. 是否允许在 Render 新加坡区托管相关会话及读取个人课表/成绩？是否要求指定服务器位置、访问控制、备案、隐私合规等？

## 获校方批准后配置 Render

在 Render Web Service → Environment 中配置以下参数：

| 名称 | 值 | 说明 |
| --- | --- | --- |
| `CAS_SSO_APPROVED` | `1` | 仅在收到学校正式接入许可后启用 |
| `CAS_REGISTERED_CALLBACK_URL` | `https://gzucm-pocket-web.onrender.com/auth/cas/callback` | 必须是**学校实际登记**的回调地址，且与网站域名严格一致 |

重启部署后，`GET /api/session` 将显示 `casAvailable:true`。这表示可尝试 CAS 回调，**不代表校方审批已自动验证，也不代表教务数据已授权**。

登录按钮打开 `/auth/cas/start`（站内路由），服务端重定向到学校 CAS 登录页面。学校认证成功后，CAS 应将 service ticket 返回 `/auth/cas/callback`，服务器将它提交学校 CAS 验证端点核验。验证成功后，原页面“检查官方认证状态”显示身份已验证，但如果没有教务 API 授权，仍须选择扫码登录来同步。

如果回调被拒绝，请联系学校信息中心确认**注册服务、准确的 service URL、CAS 验证端点、票据格式和校方允许的访问方式**。不要修改成本人的学校 Cookie、明文密码收集或开放重定向绕过安全限制。

## 安全设计

- CAS 登录及密码表单只在校方托管页面，本站没有用户名密码输入框。
- 临时 nonce 仅存进程内存与 HttpOnly、Secure、SameSite=Lax 的回调 Cookie 中，5 分钟过期，用完失效。
- 学校认证回调必须指向预先配置的 HTTPS service，不能接受用户自定义域名。
- CAS 验证端点写死为 `authserver.gzucm.edu.cn`，仅 HTTPS，不读取浏览器 Cookie，也不向用户暴露票据、账号或验证响应。
- 认证结果 `casVerified` 与教务连接状态 `connected` 始终分开。
- Render 免费实例休眠或重启会丢失内存中的 CAS 状态和教务会话。
- 公开上线前需要完整安全审计和学校正式授权。

## 为什么无法在本站直接放一个密码输入框

普通 Safari/PWA 网站不能像 Android 内置 WebView 那样读取第三方学校域名下的会话；学校登录页还可能禁止跨站 iframe 嵌入。直接在本站收集学校密码会让第三方服务器接触敏感凭据，无法取代受校方许可的 CAS 回调。这里采用独立的学校官方登录弹窗，不将官方身份表单伪装成本地表单。
