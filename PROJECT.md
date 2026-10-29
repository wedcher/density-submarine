# 密度小艇：正式版本與維護規則

## 已確認的正式版本

2026-10-29，使用者同意以本機 `density_submarine_editor_v2.html` 為正式底稿，保留通道對齊修正，並保留 GitHub 的五個示範關卡、使用說明與投稿入口。v9 的二十關、隨機抽關、答案、音效及掉落動畫留在歷史檔案，本輪不合併。

最初底稿的完整路徑：`D:\MyApp\density_submarine_codex_handoff\density_submarine_editor_v2.html`。

本機歷史 HTML 不再是日常維護入口。跨電腦工作一律使用儲存庫內的 `src/editor.html` 作為共同遊戲來源，避免依賴某台電腦上的舊檔。

## 來源、產物與部署

| 檔案 | 用途 |
| --- | --- |
| `src/editor.html` | 正式遊戲共同來源；含浮力、碰撞、通道對齊、編輯器、半格岩石、塗鴉與 JSON 格式 |
| `scripts/build-site.cjs` | 加上網站的示範關卡、說明、Google 投稿導引 |
| `index.html` | GitHub Pages 發布產物；由建置程式產生，請勿單獨修改 |
| `scripts/build-google.cjs` | 由同一遊戲來源產生 Google 遊戲、直接投稿視窗、收件程式及教學 |
| `google-apps-script/Index.html` | 貼進 Google Apps Script 的完整 HTML；保留正式版通道修正，透過 Google 橋接 API 送件 |
| `google-apps-script/Code.gs` | Google 收件程式；儲存可直接匯入的 JSON，暱稱與想法放在檔案說明 |
| `levels/` | 五個密度應用示範關卡，不是 v9 的二十關 |
| `config.json` | Google 公開部署網址；不能放密碼或權杖 |

建置：`npm run build`。測試：`npm test`。瀏覽器測試需先安裝 Playwright 及 Chromium，或設定 `BROWSER_CHANNEL=msedge` 使用本機 Edge。

兩個平台共用遊戲核心，但投稿方式不同：GitHub 下載 JSON 後開啟 Google 頁面；Google 頁面匯入 JSON，再用直接投稿表單送出。GitHub 更新不會自動更新 Google Apps Script。

## 遊戲規則與保留功能

- D＝M／V，M 為 1、2、3；V 為 1、2、4。
- 小艇高固定 1 格，寬依序為 0.5、1、2 格。
- 四層液體密度為 0.25、0.5、1、2；保留 0.75、1.5 交界活動及 D=3 沉底。
- 通道設計至少保留 2 格，考密度應用，不靠縮小艇身穿越。
- 通道對齊只校正小幅位置偏差，不縮小船身、不穿牆、不跨越密度活動區。
- 保留岩石、半格岩石、起點、終點、M＋、鑰匙、門、橡皮擦、塗鴉、關卡名稱、匯入匯出、試玩與重新試玩。
- 塗鴉不匯出；試玩狀態不寫回正式關卡；關閉網頁前須匯出保存。

## 跨電腦更新

第一次：`git clone https://github.com/wedcher/density-submarine.git`。

每次開始先 `git pull --ff-only`，修改來源後建置、測試，提交來源與產物，再 `git push`。Pages 建置完成後，遊戲網址不變： https://wedcher.github.io/density-submarine/ 。

若改動 JSON 格式、地圖尺寸、道具種類或密度規則，需同步檢查 Google 伺服器驗證與匯入相容性，再更新 Google 部署。

## 版本沿革與尚待驗收

- GitHub 首次發布 `266cf16` 取自 `density_submarine_editor_v2_before_clearance_fix.html`，未含通道對齊修正；不能當成此次確認的正式底稿。
- 本次統一為含 `clearPath()` 與 `moveThroughOpening()` 的 v2。原始歷史檔案保留在原電腦，未刪除或覆寫。
- 2026-10-29 唯讀核查 Google `/exec`：後端有 `doGet` 與 `submitLevel`，但 HTML 仍是預設空白模板。這不是正式遊戲內容。
- 本機 Google 檔案及測試完成不代表雲端收件成功。需由擁有者貼上完整 HTML、儲存、更新部署，再用未登入的無痕視窗送件，確認 Drive 真正收到 JSON。驗收前不得宣稱 Google 投稿已可用。

## 發布與資料

使用者已授權公開 `wedcher/density-submarine`。登入憑證、收件資料夾 ID、投稿者資料及本機個人設定不可提交；`Code.gs` 的實際資料夾 ID 僅由擁有者填入 Google 專案。不要把 Google 範本內的佔位 ID 覆蓋到已設定好的雲端程式。
