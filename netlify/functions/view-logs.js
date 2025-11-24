// netlify/functions/view-logs.js
exports.handler = async function (event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { getStore } = await import("@netlify/blobs");
    const logsStore = getStore("ip-logs");
    const blocklistStore = getStore("ip-blocklist");

    // Get all logs
    const logsList = await logsStore.list();
    const logs = [];

    for await (const { key } of logsList.blobs) {
      const logData = await logsStore.get(key);
      if (logData) {
        logs.push(JSON.parse(logData));
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get blocklist
    const blocklistList = await blocklistStore.list();
    const blockedIPs = [];

    for await (const { key } of blocklistList.blobs) {
      blockedIPs.push(key);
    }

    // Generate statistics
    const stats = {
      total: logs.length,
      successful: logs.filter((l) => l.status === "SUCCESS").length,
      blocked: logs.filter((l) => l.status === "BLOCKED").length,
      recaptchaFailed: logs.filter((l) => l.status === "RECAPTCHA_FAILED")
        .length,
      uniqueIPs: [...new Set(logs.map((l) => l.ip))].length,
    };

    // Generate HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contact Form Logs - The Quollective</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          .header {
            background-color: #000;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            letter-spacing: 2px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background-color: #f8f9fa;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
          }
          .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
          }
          .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .section {
            padding: 30px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
          }
          .blocklist {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .blocklist h3 {
            color: #856404;
            margin-bottom: 15px;
          }
          .blocked-ip {
            display: inline-block;
            background-color: #dc3545;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            margin: 5px;
            font-family: monospace;
            font-size: 12px;
          }
          .logs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
          }
          .logs-table th {
            background-color: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
          }
          .logs-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
          }
          .logs-table tr:hover {
            background-color: #f8f9fa;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-success {
            background-color: #d4edda;
            color: #155724;
          }
          .status-blocked {
            background-color: #f8d7da;
            color: #721c24;
          }
          .status-failed {
            background-color: #fff3cd;
            color: #856404;
          }
          .ip-address {
            font-family: monospace;
            background-color: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .message-preview {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #666;
            font-size: 13px;
          }
          .timestamp {
            color: #666;
            font-size: 13px;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
          }
          .refresh-btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #000;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
            cursor: pointer;
            border: none;
            font-size: 14px;
          }
          .refresh-btn:hover {
            background-color: #333;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 CONTACT FORM ANALYTICS</h1>
            <p>The Quollective - Submission Monitoring Dashboard</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${stats.total}</div>
              <div class="stat-label">Total Submissions</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.successful}</div>
              <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.blocked}</div>
              <div class="stat-label">Blocked</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.recaptchaFailed}</div>
              <div class="stat-label">reCAPTCHA Failed</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.uniqueIPs}</div>
              <div class="stat-label">Unique IPs</div>
            </div>
          </div>

          ${
            blockedIPs.length > 0
              ? `
          <div class="section">
            <div class="blocklist">
              <h3>🚫 Blocked IP Addresses (${blockedIPs.length})</h3>
              ${blockedIPs
                .map((ip) => `<span class="blocked-ip">${ip}</span>`)
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Recent Submissions</div>
            ${
              logs.length > 0
                ? `
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Service</th>
                    <th>Message Preview</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs
                    .map(
                      (log) => `
                    <tr>
                      <td class="timestamp">${new Date(
                        log.timestamp
                      ).toLocaleString()}</td>
                      <td>
                        <span class="status-badge ${
                          log.status === "SUCCESS"
                            ? "status-success"
                            : log.status === "BLOCKED"
                            ? "status-blocked"
                            : "status-failed"
                        }">
                          ${log.status}
                        </span>
                      </td>
                      <td><span class="ip-address">${log.ip}</span></td>
                      <td>${log.name}</td>
                      <td>${log.email}</td>
                      <td>${log.service}</td>
                      <td><div class="message-preview">${log.message}</div></td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : `
              <div class="no-data">No submissions yet</div>
            `
            }
            
            <center>
              <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
            </center>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: html,
    };
  } catch (error) {
    console.error("Error viewing logs:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html",
      },
      body: `
        <html>
          <body>
            <h1>Error Loading Logs</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `,
    };
  }
};
