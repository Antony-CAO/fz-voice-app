# 服装语音转写 · Capacitor 原生 App

手机端独立语音转文字工具，专为服装行业术语（版型 / 工艺 / 设计）优化，支持**自我学习**：你在 App 里改一次，下次同类错误自动修正。

- Web 端（PWA，免安装）：https://antony-cao.github.io/fz-voice/
- 原生 App（本工程）：iOS / Android 安装包

## 技术栈
- Vite + TypeScript（Web 层）
- Capacitor 8（原生壳）
- `@capgo/capacitor-speech-recognition`（原生语音识别，iOS=Apple Speech / Android=系统识别）
- 自我学习：`localStorage` 存修正规则 + 内置 237 条服装术语库

## 目录
```
index.html          界面 + 样式
src/terms.ts        服装术语库 + 同音纠错映射
src/correct.ts      纠错 + 自我学习引擎
src/speech.ts       语音识别封装（原生插件 / Web Speech 自动切换）
src/main.ts         UI 逻辑
ios/                Xcode 工程（已生成）
android/            Android Studio 工程（已生成）
```

## 在本地修改界面 / 逻辑
```bash
npm install
npm run dev          # 浏览器热更新调试
npm run build        # 产物输出到 www/
```

## 打包成 iOS App（需要 macOS + Xcode 16+）
1. 安装 Xcode（App Store，约 40GB）并打开一次完成命令行工具初始化。
2. 拉取本仓库，安装依赖：
   ```bash
   npm install
   npm run build
   npx cap sync ios
   ```
3. 打开原生工程：
   ```bash
   npx cap open ios      # 自动打开 Xcode
   ```
4. Xcode 里：
   - 选 Team（Apple ID 或付费开发者账号）
   - 改 Bundle Identifier（如 `com.caodong.fzvoice` → 你自己唯一的反向域名）
   - 真机连 Mac，选设备，▶ Run 即可装到手机
5. 上架 App Store：
   - 需要 [Apple Developer Program](https://developer.apple.com/programs/) 会员（$99/年）
   - Xcode → Product → Archive → 上传 App Store Connect
   - 在 App Store Connect 填资料、截图、隐私，提交审核

> 权限文案已写入 `ios/App/App/Info.plist`（麦克风 + 语音识别）。

## 打包成 Android App（需要 Android Studio）
1. 安装 [Android Studio](https://developer.android.com/studio) + JDK 17。
2. 拉取本仓库：
   ```bash
   npm install
   npm run build
   npx cap sync android
   npx cap open android    # 打开 Android Studio
   ```
3. Android Studio 里 Build → Generate Signed Bundle / APK，用自己的 keystore 签名。
4. 上架应用宝 / 华为等：
   - 需要对应平台开发者账号（应用宝个人 $25 一次性；各渠道不一）
   - 上传签名后的 AAB/APK + 资料 + 隐私政策

> 权限 `RECORD_AUDIO` 已写入 `android/app/src/main/AndroidManifest.xml`。

## 自我学习数据
- 全部存在手机本地（`localStorage`），不上传任何服务器。
- 可在 App 内「历史」查看、删除，或「导出」为 txt 备份。

## 可选：讯飞云高精度识别（仅 PWA/浏览器版）
原生包默认用系统识别；若要在原生包内接讯飞，需在 `src/speech.ts` 增加讯飞 WebSocket 调用（需处理证书/网络），后续可扩展。
