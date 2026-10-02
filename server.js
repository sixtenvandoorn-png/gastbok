// Gästbok i Node.js – inga extra paket behövs.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "guestbook.json");

// Läs alla inlägg från JSON-filen
function loadEntries() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Gör text säker att visa i HTML (förhindrar att någon skriver in kod)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Bygg sidan med hjälp av HTML-mallarna
function renderPage(showError) {
  const page = fs.readFileSync(path.join(__dirname, "page.html"), "utf8");
  const entryTemplate = fs.readFileSync(path.join(__dirname, "entry_template.html"), "utf8");

  const entries = loadEntries().reverse(); // nyaste överst
  let entriesHtml = entries
    .map((e) =>
      entryTemplate
        .replace("{{name}}", escapeHtml(e.name))
        .replace("{{time}}", escapeHtml(e.time))
        .replace("{{message}}", escapeHtml(e.message).replace(/\r?\n/g, "<br>"))
    )
    .join("\n");

  if (entries.length === 0) {
    entriesHtml = "<p>Inga inlägg ännu – bli den första!</p>";
  }

  const errorHtml = showError ? '<p class="error">Fyll i både namn och meddelande.</p>' : "";
  return page.replace("{{error}}", errorHtml).replace("{{entries}}", entriesHtml);
}

const server = http.createServer((req, res) => {
  // Visa startsidan
  if (req.method === "GET" && req.url.split("?")[0] === "/") {
    const showError = req.url.includes("error=1");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(showError));
    return;
  }

  // Ta emot formuläret
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const name = (params.get("name") || "").trim().slice(0, 50);
      const message = (params.get("message") || "").trim().slice(0, 1000);

      if (!name || !message) {
        res.writeHead(303, { Location: "/?error=1" });
        res.end();
        return;
      }

      const entries = loadEntries();
      entries.push({
        name: name,
        message: message,
        time: new Date().toLocaleString("sv-SE"),
      });
      fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");

      res.writeHead(303, { Location: "/" });
      res.end();
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Sidan finns inte");
});

server.listen(PORT, () => {
  console.log(`Gästboken körs på http://localhost:${PORT}`);
});