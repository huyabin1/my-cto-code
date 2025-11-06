# my-cto-code

A Vue 2 + Three.js r158 project scaffold generated for the my-cto-code workspace. The default experience now loads a composed编辑器界面，结合 CAD 导入、绘制控制与实时属性面板，帮助快速完成空间搭建。

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run serve
```

Then open `http://localhost:8080` to access the editor shell. The page renders the full-height Three.js 视窗 alongside一个 Element UI 侧边栏，用于导入 DXF、切换绘制工具并调整图层。

## Available Scripts

- `npm run serve` – Start the development server with hot reloading.
- `npm run build` – Produce an optimized production build in the `dist` directory.
- `npm run lint` – Run ESLint using the Airbnb Base style guide with Prettier integration.
- `npm run format` – Format source and test files with Prettier.
- `npm run test:unit` – Execute unit tests with Jest and @vue/test-utils.

## Project Structure

```
src/
  api/
  assets/
  components/
    editor/
    library/
    viewer/
  store/
  three/
    command/
    core/
    exporter/
    factory/
    helper/
    loader/
    utils/
  utils/
```

Each directory currently contains placeholder files to keep the structure intact for future development.

## Editor Workflow Highlights

- **DXF 导入流程**：在侧边栏上传 DXF 文件，查看解析状态、错误信息和单位覆写选项。
- **绘制与捕捉控制**：通过开关启用墙体绘制工具，切换正交、45° 与网格捕捉模式。
- **图层管理**：使用复选框快速控制 CAD 图层可见性，并调整整体 CAD 不透明度。
- **属性面板**：实时编辑当前选中墙体的材料与颜色，为后续材质渲染和 BIM 数据做准备。

这些功能共同构成端到端的编辑体验，让 CAD 资源、墙体建模与属性调整可以在一个屏幕内顺畅完成。
