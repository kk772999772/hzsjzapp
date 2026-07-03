# 极简移动端记账记工考勤系统 (hzsjzapp)

这是一个专为工程管理、农事记账、记工的多人员工时与工资管理设计的**轻量级、响应式移动端记账系统**。基于 Cloudflare 全家桶（Pages + Workers + D1 数据库）构建，具备零成本托管、全球加速、实时同步、自动备份以及极佳的移动端操作体验。
- **私有化部署在线记账记工**
- **Cloudflare构建 零成本托管 实时同步**
- **一键导出Excel表格xlsx格式**
- **月度报表多条件筛选导出**
- **支持自定义配置项目名称 人员姓名 工时时段**
- **极简风格，大幅降低操作门槛**

| 🌐 在线演示地址 | 🔑 操作密码 | 🛠️ 配置密码 | 💬 技术交流 / 合作微信 |
| :--- | :--- | :--- | :--- |
| [hzsjzapp.pages.dev](https://hzsjzapp.pages.dev/) | `123456` | `123456` | 微信号：pcweb3 <br>*(备注：“记账系统”)* |


- **2026.07.03 Excel报表导出功能深度重构与优化更新**
为了提升数据导出的专业性、兼容性及排版美观度，系统对 Excel 导出引擎进行了重构与深度优化。本次更新彻底放弃了旧版 HTML 伪 Excel 方案，切换为基于 ExcelJS 的原生二进制 .xlsx 文件生成方案，实现对表格样式、冻结窗格、打印排版的精准控制。
🛠️ 底层升级与重构
导出引擎升级：弃用 HTML 转换格式及 xlsx-js-style 库，切换为标准 ExcelJS 库，输出标准的二进制 .xlsx 文件，全面解决在不同办公软件（Microsoft Excel / WPS Office）中的兼容性问题。
数据驱动生成：从依赖 DOM 转换，改为直接由系统内存数据构建工作表，规避了因 DOM 转换导致的合并单元格及空数据格子样式丢失的问题。
✨ 样式与视觉优化
全网格线边框修复：彻底修复了“第一行大标题栏”在合并单元格后左右外边框丢失、以及“最后一列（备注列）”在数据为空时边框不显示的顽固问题。确保整张表格拥有完美闭合的 Slate 灰细网格线。
字体与排版规范：
导出数据及列头字体统一规范为 12号 微软雅黑。
第一行大标题字号设为 16号 微软雅黑 加粗，自动合并居中。
数据行采用优雅的交替斑马纹背景（#F8FAFC 与 #FFFFFF），表头采用深绿色背景（#059669）并搭配加粗白色字体。
智能列宽自适应：实现按列内容自适应宽度。计算列宽时自动忽略第一行大标题，仅计算第 2 行表头及之后的数据字符宽度，且智能识别中英文字符（中文权重 2.2，英文权重 1.2），确保各列内容不折行，同时避免了列被标题无限撑宽的 Bug。
🖨️ 冻结表头与打印排版调优
滚动固定表头：设置工作表视图冻结，在 Excel/WPS 中向下滚动查看数据时，第一行（标题栏）与第二行（列头栏）将保持固定悬浮。
默认竖向打印：将页面打印方向默认设为竖向（Portrait），符合常规记账流水的阅读习惯。
打印自动缩放（一页宽）：配置打印页面自适应参数，打印预览时所有列均会自动缩放适配在单张纸宽度内，避免列过多时被横向截断到多张纸上。
每页重复表头：启用打印标题行参数（1:2 行），当账目数据多页打印时，每一页的顶部都会自动重复打印第一、二行表头，提升纸质单据可读性。
页码动态显示：在每页底部居中自动添加 “第 X 页 / 共 Y 页” 页脚页码，满足规范的报表打印需求。

## 🌟 系统核心特性

- 📱 **移动端深度优化**：
  - 玻璃拟态（Glassmorphism）现代卡片式 UI 风格。
  - 独立开发的人员多选/搜索下拉器（支持拼音及汉字模糊过滤），支持“已选人数统计”、“一键全选/清空”。
  - 项目选择、工时、时段（上午/下午/全天）等输入框右侧配备大面积防误触下拉大按钮，点击不唤起系统软键盘，自定义输入时才唤起，极大提升户外操作体验。
- 💸 **工时自动结算**：
  - 自动根据公式自动计算账目金额：`金额 = (实际工时 / 日标准工作时间) * 日工资`。支持手动覆盖修改。
- 📊 **多维数据分析**：
  - 集成 Chart.js 动态绘制本月收支概览、村庄分布占比、项目分布占比及近 6 个月历史收支趋势图。
- 📋 **综合数据报表**：
  - 支持多字段复合筛选（日期区间、项目类型、姓名、模糊村庄/备注）。
  - 支持**多选/全选批量删除**记录，具备平滑过渡动画及安全二次确认。
  - 支持一键导出符合移动端 WPS 兼容的 CSV 电子表格。
- ⚙️ **在线项目管理**：
  - 安全密码保护设置界面（默认项目配置密码：`123456`）。
  - 支持在线直接修改/增删村庄名称、人员名单、项目类型等核心参数。
- 💾 **自动安全备份**：
  - 配备 D1 数据库定时备份脚本，每日凌晨 1:00 自动将云端数据库导出为本地 `.sql` 备份文件，保留最近 35 天的备份记录。

---

## 🏗️ 技术架构

- **前端 (Frontend)**：HTML5 / Vanilla CSS3 / ES6 Javascript + Chart.js (无第三方框架依赖，秒开体验)。
- **后端 (Backend)**：Cloudflare Workers (基于 V8 Isolate 的轻量 API 路由服务)。
- **数据库 (Database)**：Cloudflare D1 (分布式 Serverless 关系型 SQLite 数据库)。
- **托管 (Hosting)**：Cloudflare Pages + Functions (反向代理，解决跨域及静态资源分发)。

---

## 📂 项目目录结构

```text
├── index.html          # 前端主页面 (UI布局结构)
├── style.css           # 全局样式系统 (含玻璃拟态、下拉器、模态框及响应式适配)
├── app.js              # 核心业务逻辑 (状态管理、网络请求、事件委托、图表初始化)
├── chart.js            # 数据分析图表生成逻辑
├── config.json         # 初始系统默认参数配置文件
├── backup.js           # 本地 D1 数据库备份脚本 (自动清理35天前旧备份)
├── functions/          # Cloudflare Pages Functions 反向代理路由
│   └── api/
│       └── [[path]].js # API 代理转发逻辑
└── worker/             # Cloudflare Workers 后端代码
    ├── index.js        # D1 数据库的 API 路由和 CRUD 逻辑
    ├── schema.sql      # D1 数据库初始化 SQL 脚本
    └── wrangler.toml   # Worker 配置文件 (含数据库绑定)
```

---

## 🚀 部署指南

### 1. 准备工作
- 安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本)。
- 拥有一个 [Cloudflare](https://www.cloudflare.com/) 账号。
- 全局登录 Cloudflare 认证凭据：
  ```bash
  npx wrangler login
  ```

### 2. 创建并初始化 D1 数据库
在终端执行以下命令创建 D1 实例：
```bash
npx wrangler d1 create jizhang-db
```
创建成功后，控制台会输出类似如下的信息：
```toml
[[d1_databases]]
binding = "DB"
database_name = "jizhang-db"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
打开 `worker/wrangler.toml` 文件，将上述生成的配置（特别是 `database_id`）替换到相应位置。

接着，初始化数据库表结构：
```bash
# 本地测试环境初始化
npx wrangler d1 execute jizhang-db --local --file=./worker/schema.sql

# 云端线上数据库初始化
npx wrangler d1 execute jizhang-db --remote --file=./worker/schema.sql
```

### 3. 部署后端 Workers
进入 `worker` 目录，执行发布命令：
```bash
cd worker
npx wrangler deploy
```
发布成功后，记下输出的后端服务域名（例如：`https://jizhang-api.xxxx.workers.dev`）。

### 4. 配置反向代理与前端部署
打开根目录的 `functions/api/[[path]].js`，将代理目标域名修改为您在第 3 步中部署的 Worker 域名：
```javascript
const targetWorkerOrigin = 'https://您的Worker子域名.workers.dev';
```

在根目录下，创建 Pages 项目并完成首次部署：
```bash
# 1. 首次在云端创建 Pages 项目 (只需执行一次)
npx wrangler pages project create hzsjz --production-branch main

# 2. 部署静态资源到 Cloudflare Pages
npx wrangler pages deploy . --project-name=hzsjz
```
部署完成后，您便可通过分配的 **`https://hzsjz.pages.dev`** 访问您的记账系统！

---

## 📅 自动化数据库备份配置

本系统在根目录提供了 `backup.js`，支持每日凌晨 1 点自动备份 Cloudflare D1 远程数据库至本地并保留 35 天。

### Windows 自动备份设置步骤（计划任务）：
1. 打开 Windows 命令行（CMD / PowerShell）。
2. 执行以下命令注册每日自动备份计划任务（任务会以当前已登录 Cloudflare 的用户身份运行，直接继承 OAuth 授权凭据）：
   ```cmd
   schtasks /create /tn "Jizhang_DB_Backup" /tr "cmd.exe /c cd /d d:\jizhang && node backup.js" /sc daily /st 01:00 /f
   ```
3. 任务注册成功。每天凌晨 `01:00`，系统会在根目录生成类似 `backup_20260702_010000.sql` 的备份文件，并自动清理 35 天前的旧备份。

---

## 🔒 系统安全及授权

本系统设计有两层授权校验密码，确保数据及配置安全：

1. **操作授权密码**：用于日常记录的增加、删除记录、批量删除及导出 CSV 数据等敏感操作。
   - **默认密码**：`123123`
   - **密码自定义**：可进入“项目设置”界面，在“操作授权密码”栏进行修改并保存，配置将自动同步至数据库。

2. **项目配置授权密码**：用于限制进入“项目设置”页面（修改人员名单、村庄/分类以及项目类型等系统核心参数）。
   - **默认密码**：`123456`
   - **说明**：建议在部署前直接修改 `app.js` 中的校验密码以提升安全性。

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 开源许可证。欢迎自由 fork、修改并部署属于您自己的私有化记账系统！
