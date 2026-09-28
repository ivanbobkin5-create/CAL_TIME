const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();

  const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mebel-Plan.ru — Калькулятор мебели</title>
  <script src="//api.bitrix24.com/api/v1/"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; font-family: sans-serif; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe id="b24-frame" src="" allow="clipboard-read; clipboard-write; microphone; camera"></iframe>
  <script>
    BX24.init(function() {
      BX24.fitWindow();
      var origin = "https://mebel-plan.ru";
      var search = window.location.search || "";
      var frame = document.getElementById("b24-frame");
      if (frame) {
        frame.src = origin + search;
      }
    });
  </script>
</body>
</html>`;

  const installHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Установка Mebel-Plan.ru</title>
  <script src="//api.bitrix24.com/api/v1/"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
    }
    .card {
      background: #ffffff;
      padding: 36px 32px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 460px;
      width: 90%;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e2e8f0;
      border-top-4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #0f172a; }
    p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.5; }
    .success { display: none; color: #16a34a; font-weight: 600; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div id="loader" class="spinner"></div>
    <h2 id="title">Установка приложения Mebel-Plan...</h2>
    <p id="desc">Настраиваем интеграцию, вкладку в сделке и умный виджет в CRM Битрикс24.</p>
    <div id="success-msg" class="success">✓ Приложение успешно установлено!</div>
  </div>

  <script>
    BX24.init(function() {
      var appUrl = "https://mebel-plan.ru/";

      // 1. Привязка вкладки в сделке
      BX24.callMethod(
        "placement.bind",
        {
          PLACEMENT: "CRM_DEAL_DETAIL_TAB",
          HANDLER: appUrl,
          TITLE: "Калькулятор Мебели",
          DESCRIPTION: "Расчет стоимости мебели, распила и материалов"
        },
        function(res1) {
          // 2. Привязка виджета в правой колонке
          BX24.callMethod(
            "placement.bind",
            {
              PLACEMENT: "CRM_DEAL_DETAIL_ACTIVITY",
              HANDLER: appUrl,
              TITLE: "Мебель План (Виджет)",
              DESCRIPTION: "Интерактивный виджет производства и расчета мебели"
            },
            function(res2) {
              document.getElementById("loader").style.display = "none";
              document.getElementById("title").innerText = "Готово!";
              document.getElementById("desc").innerText = "Виджет и вкладка калькулятора добавлены в CRM.";
              document.getElementById("success-msg").style.display = "block";

              if (typeof BX24.installFinish === "function") {
                BX24.installFinish();
              }
            }
          );
        }
      );
    });
  </script>
</body>
</html>`;

  zip.addFile('index.html', Buffer.from(indexHtml, 'utf8'));
  zip.addFile('install.html', Buffer.from(installHtml, 'utf8'));

  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  zip.writeZip('public/bitrix24_marketplace_app.zip');
  zip.writeZip('public/bitrix24_app.zip');
  console.log('Bitrix24 ZIP created successfully at public/bitrix24_marketplace_app.zip');
} catch (e) {
  console.error("Error creating bitrix zip:", e);
}
