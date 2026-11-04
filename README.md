# 广中医口袋 · Safari / Windows 公开部署测试版 v1.3

> **非官方、未经校方授权验证的演示／开发版。** 尚不能承诺“学生打开网页只输一次密码，就能在网站内看到真实教务与电费”。请先阅读下方的认证限制。

## 下载后先做什么？

1. Windows 安装 [Node.js LTS](https://nodejs.org/)，双击 `scripts/start-windows.bat`。
2. 本机浏览器打开 `http://127.0.0.1:4173`。运行 `npm test` 检查单元测试。
3. 要生成公开 HTTPS 地址：按照 [`docs/DEPLOY_WINDOWS_PUBLIC.md`](docs/DEPLOY_WINDOWS_PUBLIC.md)，用 GitHub Desktop 上传到自己的仓库，再在 Render 用 `render.yaml` 部署。
4. 不需要 Mac，不需要让 Windows 电脑保持开机。

## 本次增加的两项功能

### 密码暂不支持，使用微信扫码

- 登录弹窗保留「账号密码」「扫码登录」两种标签；**账号密码页明确提示“密码登录暂不支持”**，不会尝试以假表单索要学生密码。
- 「扫码登录」生成学校官方二维码。电脑上可用微信扫一扫；手机单机可先截图，再从微信「扫一扫 → 相册」识别二维码，按学校页面提示完成确认。不要共享二维码截图。
- 学校账号密码始终只在校方官网输入。仓库内保留了**默认关闭**的 CAS 回调模块供未来获校方许可后接入，不影响已验证可用的扫码登录。
- 本站的二维码同步只面向本人授权的教务课程与成绩。

### 宿舍电费查询与只读余额适配

- **实际可用入口：** 点击「宿舍电费 → 学校官网查电费」，直接在 `https://ecard.gzucm.edu.cn/user/powerfee/index` 查看自己的实时余额、绑定房间与用电明细。必要时在学校官网完成统一身份认证。
- 官网电费页面属于学校域名；Safari 无法把该域的 Cookie 交给非官方 `onrender.com` 站点，所以目前**不能承诺在广中医口袋内自动获取实时余额**。
- 本站提供「记录查询结果」功能：用户手动填写从官网查询到的电量，本地显示和趋势计算，并使用 `source:'manual'` 清晰标注。公开站点**仅此手动电量与明细**存入浏览器 localStorage；学业数据仍不持久保存。
- 代码已补全 `/user/powerfee/getBalance` 的只读查询、房间标识核验与余额数字校验。**仅在服务器已拥有合法、有效的一卡通授权会话时**才显示站内实时同步按钮。该授权目前没有自动获取路径。
- 不通过用户复制 Cookie、在本站录入学校密码或绕过学校登录来获取电费。

### 左侧单按钮中英切换与液态玻璃

- 顶部左侧标题旁仅保留一个 **EN / ZH** 按钮：中文界面点 EN 转英文，英文界面点 ZH 转中文；不会在「设置」里重复出现。
- 当前仍是普通 **Safari/PWA 网页**，不能调用 iOS 26 SwiftUI/UIKit 的原生 `glassEffect` 视图修饰器或原生材质 API。Safari 使用 WebKit 浏览器原生 CSS `-webkit-backdrop-filter` 配合高光、边缘与透明度效果。
- 参考并自托管 MIT 项目 [deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass) 的单文件光学组件，在支持的 Chromium 桌面浏览器上仅对少数导航表面增加 SVG 边缘折射；Safari/Firefox、低功耗触摸设备与降低透明度/高对比度模式仍优先清晰可读的 CSS 材质。
- 不使用第三方 CDN、远程截图或新的后台账号；课表和成绩文字仍保持可选中、可操作，不为视觉效果上传学业数据。
- 许可及归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 中英文界面切换

- 页面顶部左侧标题旁仅保留一个语言切换按钮：**EN**（当前中文，点击切英文）或 **ZH**（当前英文，点击切中文）。设置页不再重复提供语言选择框。
- 界面常用文字与登录、电费操作提示可在两种语言之间切换；选择保存在浏览器偏好设置中。
- 学校返回的课程名称会优先使用已经整理的英文课程名对照表；学校教务系统英文界面的**完整、准确课程译名仍需对照正式英文记录核验**，目前不声称所有课程的译名已经获得校方确认。
- 不能确认的中文课程名或其他动态中文资料在英文模式中显示 `[Translation unavailable]`，绝不使用拼音代替，也不会随意编造课程名称。切换回中文仍可看到原始官方数据。
- 学校官方英文网站可作为通用术语参照，真实课程名应以教务系统英文模式、官方英文成绩单或官方培养方案为准。
- 这不是学校官网的语言切换，学校官方认证页面仍由校方自行决定语言。

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
