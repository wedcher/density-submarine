# 密度小艇

遊戲網址：https://wedcher.github.io/density-submarine/

用 D＝M／V 探索密度的課堂遊戲。開啟後直接遊玩官方範本或同學投稿；按「設計／投稿關卡」在同一頁編輯、試玩、保存。成功通關自己的設計後才能投稿，修改後要重新通關。詳細規格見 [SPEC.md](SPEC.md)，進度與來源見 [PROJECT.md](PROJECT.md)。

## 同學投稿

Google Apps Script 是背景後端，將合法投稿存進私人 Google 試算表，提供新投稿優先的清單與關卡讀取。學生不需 Google 登入、不切換另一個遊戲網站。投稿成功後，另一位學生重新整理清單即可遊玩，不用重新部署 GitHub。

**程式及本機模擬流程已測試，真實 Google 收件尚待擁有者部署及驗收。** Google 未更新時會顯示連線提示，官方題目、設計和 JSON 保存仍可使用。舊 Drive 檔案不會自動搬入新試算表。

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

每次修改前先 git pull --ff-only；正式遊戲核心在 src/editor.html，同頁功能在 src/classroom.js，後端在 src/server.gs。修改後：

```sh
npm run build
npm test
git add .
git commit -m "更新密度小艇"
git push
```

GitHub Pages 發布 main 根目錄的 index.html。原生 index.html 也可以本機開啟設計、試玩與保存；投稿與同學清單需從 HTTP(S) 遊戲網址使用。Google 後端修改仍需另行部署。

## 開發測試

網站本身不需要安裝依賴。要跑測試：npm install，npx playwright install chromium，再 npm test。也可設定 BROWSER_CHANNEL=msedge 使用本機 Edge。測試結果中清楚區分模擬 Google API 與真實 Google 驗收；不會向線上服務自動投稿。

本輪未加入 v9 二十關、AI 解題、評分、排行榜、留言或教師逐關審核。公開可讀並不代表另行授予開放原始碼授權。
