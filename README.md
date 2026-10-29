# 密度小艇

用 **D＝M／V** 解謎的密度應用遊戲，附地圖編輯、試玩、JSON 匯入／匯出與五個示範關卡。通道設計至少保留 2 格，重點放在密度與質量取捨。

遊戲網址：https://wedcher.github.io/density-submarine/

## 使用

直接開遊戲網址，或下載專案後用瀏覽器開啟 `index.html`。不必安裝套件。編輯內容不會自動保存，離開前請匯出 JSON。

## 投稿

遊戲內按「投稿關卡」，先下載 JSON，再開啟 Google 投稿頁；在該頁匯入 JSON 並送出。下載不等於投稿成功，請以 Google 頁面的收件編號為準。

Google 投稿服務與 GitHub Pages 是分開部署的。目前 Google 端仍待擁有者完成部署驗收；遊戲的編輯、試玩和匯出不受影響。Google 不正常時請保留 JSON，暫勿重複送件。

## 在公司與家裡繼續更新

第一次在另一台電腦：

```sh
git clone https://github.com/wedcher/density-submarine.git
cd density-submarine
```

每次修改前：

```sh
git pull --ff-only
```

修改遊戲來源 `src/editor.html`，需要時修改 `scripts/build-site.cjs` 的網站功能，然後：

```sh
node scripts/build-site.cjs
git add .
git commit -m "更新密度小艇"
git push
```

網站由 `main` 分支根目錄的 `index.html` 發布。請保留它並與來源一起提交；GitHub 完成 Pages 建置後，同一個網址就會更新。若畫面仍舊，重新整理。兩台電腦不要同時改同一份檔案；遇到衝突請先處理，不要強制推送。

## Google 收件設定與修復空白頁

`google-apps-script/` 內有兩份完整部署檔：

- `Code.gs`：整份貼入 Google Apps Script 的程式碼檔，只替換最上方的資料夾 ID。資料夾 ID 不必提交到公開儲存庫。
- `Index.html`：整份貼入 Google 專案名為 **Index** 的 HTML 檔，這份才是完整遊戲與收件視窗，不能只保留預設空白 HTML。

儲存後到「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。執行身分選「我」，存取選「所有人」，完成自己的 Google 授權。用未登入的無痕視窗測試 `/exec` 網址，確定有遊戲畫面，送一份測試關卡，再確認雲端資料夾確實收到 JSON。這一步完成才算雲端投稿啟用成功。

更新 GitHub 遊戲不會自動更新 Google 專案。純畫面變更可以只更新 GitHub；若關卡 JSON 格式、道具種類或尺寸改動，Google 的 `Code.gs` 驗證與 `Index.html` 也要一起更新、部署。Google 網址改變時修改 `config.json` 並重建網站。

Google 資料夾保持私人，不要把任何密碼、權杖或投稿者資料上傳到這個公開專案。此專案未選用開放原始碼授權；公開可讀不代表授權任意再利用。

## 開發檢查

網站本身無執行依賴。要跑瀏覽器測試才需安裝開發套件與瀏覽器：

```sh
npm install
npx playwright install chromium
npm test
```

可用 `BROWSER_CHANNEL=msedge` 選用本機 Edge。測試包括示範關卡匯入、原有過關路線、JSON 匯出與投稿入口；不會實際送出 Google 投稿。
