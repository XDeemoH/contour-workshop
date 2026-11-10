# 等高线工坊

![等高线工坊生成的横幅画面](docs/images/hero.webp)

本地运行的程序化等高线画面编辑器。画面、参数和导出都在浏览器本地处理。当前版本 `v1.0.0`；离线单文件与高分辨率示例图的打包 ZIP 见 Releases 页面。

## 画作

下面每一幅都由工坊生成：换种子、配色、发光方向或雕刻几个山峰，就得到一片新的地形。

<table>
  <tr>
    <td><img src="docs/images/art-amber.webp" alt="墨黑底，琥珀色扫光"></td>
    <td><img src="docs/images/art-paper.webp" alt="纸白底，赭色轮廓光"></td>
    <td><img src="docs/images/art-teal.webp" alt="深青底，青绿色发光"></td>
  </tr>
  <tr>
    <td align="center"><sub>琥珀扫光 · 种子 451，两处雕刻</sub></td>
    <td align="center"><sub>纸白 · 种子 2024</sub></td>
    <td align="center"><sub>青绿 · 种子 83117</sub></td>
  </tr>
  <tr>
    <td><img src="docs/images/art-ink.webp" alt="米色纸面上的黑色实线等高线"></td>
    <td><img src="docs/images/art-rust.webp" alt="深褐底，锈红色发光，带山峰与火山口雕刻"></td>
    <td><img src="docs/images/art-quiet.webp" alt="低对比度的安静背景"></td>
  </tr>
  <tr>
    <td align="center"><sub>墨线 · 实线、无发光</sub></td>
    <td align="center"><sub>锈红 · 山峰中央挖出火山口</sub></td>
    <td align="center"><sub>安静背景 · 适合放在内容后面</sub></td>
  </tr>
</table>

## 界面

![桌面界面：墨黑底与琥珀扫光](docs/images/ui-dark.webp)

<table>
  <tr>
    <td width="40%"><img src="docs/images/ui-sculpt.webp" alt="地形雕刻：在画面上放置山峰和洼地控制点"></td>
    <td width="40%"><img src="docs/images/ui-light.webp" alt="纸白画布"></td>
    <td width="20%"><img src="docs/images/ui-mobile.webp" alt="手机宽度下的界面"></td>
  </tr>
  <tr>
    <td align="center"><sub>地形雕刻：橙点是山峰，青点是洼地</sub></td>
    <td align="center"><sub>纸白画布</sub></td>
    <td align="center"><sub>手机宽度</sub></td>
  </tr>
</table>

## 直接使用

双击 **等高线工坊.html**。这个单文件包含界面与绘图核心，离线即可运行。工坊自产示例保存在交付目录中，不占用操作界面。页面初始静止；点击播放才会开始动态。开发与嵌入示例可运行 `npm start`，打开 `http://127.0.0.1:8147/` 或 `/embed-demo.html`。修改源码后运行 `npm run build` 重建单文件。

- **地形**：种子、尺度、密度、弯曲、细节。点击“添加山峰／添加洼地”，再在画面上放置控制点；拖动圆点改位置，最多 12 点。
- **照片**：导入本地 PNG/JPEG/WebP，中心裁切到 3:4，缩至 160×213 明暗高度场，再提取等值线。对比度、明暗反转和雕刻可继续调。照片本身没有高程信息，所以这是明暗转译，不是地理测绘或真实三维重建。原照片颜色与完整分辨率不会保留。
- **等高线发光**：光晕沿轮廓线生成，虚线每段的两端也有柔和、均匀的环绕光晕；一条平直的扫光带经过时提亮所经线段。可调扫光角度、发光亮度、颜色、范围和速度；没有折线节点或纹理选择。0° 表示从左向右，90° 表示从上向下。
- **静态输出**：PNG 默认原生 3072×4096，也可选 1536×2048；SVG 是可编辑的 CPU 等值线路径，并使用所选画布尺寸。高分辨率 PNG 按比例增加线条像素宽度，缩放后保持相近的视觉粗细。两种导出都内嵌完整工程参数，包括种子、照片的缩采样明暗网格、雕刻点、轮廓发光、时间、尺寸和透明底选项。点击“读取工程”可直接读回 PNG、SVG 或 JSON；读回后默认静止。

PNG 的工程数据写入标准 `iTXt` 块，SVG 写入 `<metadata>`。导出的工程会包含照片的缩采样明暗网格；分享带工程参数的图片时，接收者可以回读这部分内容。有些图片平台或二次处理程序会移除元数据；需要长期保留编辑能力时，另存一份 JSON。SVG 与 GPU PNG 的局部路径、柔边和光晕可能不同；SVG 用静态路径近似，不承诺像素重合。旧版折线光路参数可读取，并转换为扫光角度；改名前导出的文件（元数据标记为 `PULSE-Contour-Project`）也能照常读回。

`example.svg` 与 `exports/example-art-dark-3072x4096.png`、`example-art-light-3072x4096.png` 及对应 SVG 均由本工坊生成。示例不在工坊界面展示。旧版使用的用户参考图及其水印不在此工作版及单文件 HTML 中。

## 嵌入背景

`contour-field.mjs` 是不依赖框架的核心。`embed-background.mjs` 提供一个直接装入容器的接口：

```html
<section id="panel"><div class="content">你的内容</div></section>
<style>
  #panel { position: relative; overflow: hidden; }
  #panel .content { position: relative; z-index: 1; }
</style>
<script type="module">
  import { mountContourBackground } from './embed-background.mjs';
  const background = mountContourBackground(document.querySelector('#panel'), {
    field: { seed: 721, bands: 34 },
    style: { background: '#12151a', color: '#b8bdbb', alpha: 0.12, edgeFade: 0.16 },
  });
  background.renderAt(12);       // 默认停在这一刻
  // background.start();         // 需要动态时再播放
  // background.setOptions({ field: { bands: 40 } });
  // background.destroy();       // 组件卸载时释放
</script>
```

封装层不会挡住鼠标；宿主内容需要 `z-index:1`。它提供 `setOptions`、`renderAt`、`start`、`stop`、`exportPNG`、`exportSVG`、`getOptions`、`getState` 与 `destroy`。核心的 `createContourField({canvas, ...settings})` 仍可直接使用。

默认 30fps、DPR 上限 2。页面隐藏、系统减少动态、宿主 `data-motion="off"` 或调用 `stop()` 时停止绘制。WebGL 不可用时回落到静态 SVG；此模式保留等高线与发光的静态近似，不播放连续变形。

## 代码与验证

`npm test` 运行纯 Node 回归测试；`npm run build` 生成离线单文件。实际浏览器、照片导入、PNG/SVG 回读、嵌入组件、透明边缘和移动宽度的记录见 [QA.md](./QA.md)。

工坊代码采用 [MIT 许可](./LICENSE)，版权署名 `XDeemoH`；PULSE DSH Running Panel 的原始 MIT 声明见 [SOURCE-ATTRIBUTION.md](./SOURCE-ATTRIBUTION.md)。工坊示例图片和用户导出作品的复用授权没有在代码许可中一并授予；涉及导入照片时还须尊重原照片权利。此版本尚未接入 DSH 运行面板插件，接入提要见 [DSH-integration.md](./DSH-integration.md)。
