# 密度小艇

## 編輯器橫向測試版（2026-11-05，未正式發布）

分支 test/editor-landscape-workflow 從已核對的 11243c5 建立。編輯器依手機橫向設計：上方名稱、作者暱稱與檔案操作；左側完整地圖固定，右側工具可捲動。作者暱稱記在目前瀏覽器，不寫入 JSON；清空地圖先確認。

試玩使用一般遊玩版面，保留回編輯；通關後可直接投稿並修改名稱與暱稱，不需重新通關。修改地圖、道具、起終點或匯入則撤銷資格。投稿仍先確認公開同意。

手機入口提醒橫向使用；支援的瀏覽器在進入時嘗試全螢幕與原生橫向鎖定。無法鎖定時保持橫向內容，中途轉直以側轉畫面呈現，不跳提示、不因旋轉暫停、不切回選關或重置。實體手機鎖定能力待使用者驗收。

私人測試站沿用 https://density-submarine-mobile-test-cher.lushlatch1.chatgpt.site/ 。本次部署結果見 test-results/deployment-editor.txt；main 與正式 GitHub Pages 不變。

遊戲網址：https://wedcher.github.io/density-submarine/

用 D＝M／V 探索密度的課堂遊戲。開啟後選擇官方範本或同學投稿，在同一分頁切換至遊戲畫面；按「設計／投稿關卡」編輯、試玩、保存。成功通關自己的設計後才能投稿，修改後要重新通關。詳細規格見 [SPEC.md](SPEC.md)，進度與來源見 [PROJECT.md](PROJECT.md)。

## 手機操作測試版（2026-11-04，尚未正式發布）

本分支 `test/mobile-landscape-controls` 將選關與遊戲畫面分開。手機進入關卡後請橫放：中央顯示完整地圖，兩側為方向鍵與 V＋／V－／丟 M；直拿時提示橫放並暫停。方向鍵可按住連續移動，放開即停止方向操作，密度浮沉仍保留。右上可交換左右操作區、關閉音效；偏好記在目前瀏覽器。電腦鍵盤與既有遊戲規則沿用。

本機預覽：執行 `node scripts/preview.cjs`，開啟終端顯示的 localhost 網址；僅供這台電腦使用，不會發布網站。也可直接開啟 `index.html` 遊玩／編輯，file:// 下不提供同學關卡或投稿。

成功通關有動畫及短音效，成功丟質量時有黑點掉落及短音效。瀏覽器不支援音效時仍可遊玩；不宣稱已完成實體手機或音效聽感驗收。下方正式網址仍是既有版本。

## 同學投稿

Google Apps Script 是背景後端，將合法投稿存進私人 Google 試算表，提供新投稿優先的清單與關卡讀取。學生不需 Google 登入、不切換另一個遊戲網站。投稿成功後，另一位學生重新整理清單即可遊玩，不用重新部署 GitHub。

**2026-10-29 已完成 6／6 真實線上驗收：學生 A 設計、通關、投稿 → Google 試算表收件 → 另一個匿名學生 B 取得並通關。** 原部署網址沿用，驗收投稿已保留。後續修改後端或另建專案仍需重新授權及實測；舊 Drive 檔案不會自動搬入新試算表。

首頁範本來自使用者指定的「範本題」資料夾，來源記於 levels/sources.json。五題保留原樣。依使用者最新確認，已取消所有關卡的通道寬度啟動攔截；實際船身尺寸、碰撞及浮力不變。本輪不聲稱官方五題都已完整解題實測。

## Google 設定

開啟 google-apps-script/更新Google遊戲.html，只需複製完整 Code.gs，到現有 Google 專案的程式碼檔全選貼上、儲存，再更新同一部署的新版本；以我執行、所有人可存取，完成試算表授權。不用填寫資料夾或試算表 ID。背景資料連線頁已內嵌在 Code.gs，原本 Index.html 可保留，不必更新。程式優先重用已記錄的試算表；舊格式工作表不覆寫或刪除。

用未登入的無痕視窗確認首頁清單載入，設計一關並通關後投稿，再用另一個視窗刷新清單、載入及通關，才完成真實上課驗收。

## 更新專案

另一台電腦第一次：

```sh
git clone https://github.com/wedcher/density-submarine.git
cd density-submarine
```

依使用者 2026-11-04 最新授權：先確認需求，收到「開始做」後才在獨立測試分支實作。**未經明確同意，不得修改 main、合併測試分支或發布正式網站。** 舊文件中的自主發布授權不再適用。

首次開發先建立測試分支（名稱依需求調整）：

```sh
git fetch origin
git switch --no-track -c test/mobile-landscape-controls origin/main
```

正式遊戲核心在 src/editor.html，同頁功能在 src/classroom.js，後端在 src/server.gs。確認目前位於測試分支後：

```sh
npm run build
npm test
git add .
git commit -m "更新密度小艇"
git push -u origin HEAD:refs/heads/test/mobile-landscape-controls
```

GitHub Pages 發布 main 根目錄的 index.html。原生 index.html 也可以本機開啟設計、試玩與保存；投稿與同學清單需從 HTTP(S) 遊戲網址使用。Google 後端修改仍需另行部署。

## 開發測試

網站本身不需要安裝依賴。要跑測試：npm install，npx playwright install chromium，再 npm test。也可設定 BROWSER_CHANNEL=msedge 使用本機 Edge。測試結果中清楚區分模擬 Google API 與真實 Google 驗收；不會向線上服務自動投稿。

本輪未加入 v9 二十關、AI 解題、評分、排行榜、留言或教師逐關審核。公開可讀並不代表另行授予開放原始碼授權。
