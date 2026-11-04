# 第三方开源声明

本网页版参考了 GitHub 开源仓库 `Hello-Minecraft/gzucm-pocket` 的数据字段、解析策略、功能设计及接口说明，并非原作者官方移植版。原仓库遵循 MIT 许可证：

MIT License

Copyright (c) 2026 朱致辉

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

QR Code generator located in `server/vendor/QRCode/`: Kazuhiko Arase, copyright (c) 2009, https://www.d-project.com/ ; MIT License. See the MIT permission and disclaimer above. QR Code is a registered trademark of DENSO WAVE Incorporated.

---

## Liquid Glass (web optical effect)

The file `vendor/liquid-glass.js` is based on the MIT-licensed original by **Deepika Rao**.

- Source: https://github.com/deepika-builds/liquid-glass
- Copyright © 2026 Deepika Rao
- License: MIT — the full MIT permission notice and warranty disclaimer are reproduced above and apply to this component.
- `glass-effects.js` and the site's material CSS are integration code for this project.
- The web appearance is **not** Apple's native SwiftUI/UIKit `glassEffect` API. WebKit/Safari uses native CSS `-webkit-backdrop-filter`; Chromium can enhance it with SVG refraction.

No third-party analytics, CDN, or external screenshot capture is required by the glass effect.
