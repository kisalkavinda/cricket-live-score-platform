const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Optional: simple env reader
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

async function main() {
  console.log("\n--- Google Sheets Connection Diagnostic Test ---\n");

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const hasPrivateKey = Boolean(process.env.GOOGLE_SHEETS_PRIVATE_KEY);

  console.log("Configuration Check:");
  console.log(`- GOOGLE_SHEETS_SPREADSHEET_ID: ${spreadsheetId ? "[Configured]" : "[MISSING]"}`);
  console.log(`- GOOGLE_SHEETS_CLIENT_EMAIL:   ${clientEmail ? clientEmail : "[MISSING]"}`);
  console.log(`- GOOGLE_SHEETS_PRIVATE_KEY:    ${hasPrivateKey ? "[Configured]" : "[MISSING]"}\n`);

  if (!spreadsheetId || !clientEmail || !hasPrivateKey) {
    console.log("Status: PENDING (Google Sheets environment variables are not yet configured).");
    console.log("Note: Registrations will continue saving to Supabase PostgreSQL without blocking.");
    process.exit(0);
  }

  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const privateKey = rawKey.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const titles = (response.data.sheets || [])
      .map(s => s.properties?.title)
      .filter(Boolean);

    const requiredSheets = ["Registrations", "Players", "Backup Audit"];
    const missingSheets = requiredSheets.filter(req => !titles.includes(req));

    if (missingSheets.length > 0) {
      console.error("Result: FAILED");
      console.error(`Spreadsheet connected, but missing required worksheet(s): ${missingSheets.join(", ")}`);
      console.log(`Found worksheets: ${titles.join(", ") || "none"}`);
      process.exit(1);
    }

    console.log("Result: SUCCESS");
    console.log(`Successfully connected to spreadsheet (${spreadsheetId}).`);
    console.log(`Verified worksheets (${requiredSheets.length}): ${requiredSheets.join(", ")}`);
    console.log(`All worksheets present: ${titles.join(", ")}`);
  } catch (err) {
    console.error("Result: FAILED");
    const safeMsg = err.message ? err.message.replace(/-----BEGIN PRIVATE KEY-----[^]+?-----END PRIVATE KEY-----/g, "[REDACTED]") : String(err);
    console.error(`Google Sheets connection error: ${safeMsg}`);
    process.exit(1);
  }
}

main();
