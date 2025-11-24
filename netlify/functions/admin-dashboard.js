// netlify/functions/admin-dashboard.js
exports.handler = async function (event, context) {
  const password = event.queryStringParameters?.password;

  // Password protection
  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>The Quollective - Admin Login</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .login-container {
              background: white;
              padding: 50px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 400px;
              width: 100%;
            }
            h1 {
              text-align: center;
              margin-bottom: 30px;
              font-size: 28px;
              color: #333;
            }
            input {
              width: 100%;
              padding: 15px;
              margin: 10px 0;
              border: 2px solid #ddd;
              border-radius: 6px;
              font-size: 16px;
              box-sizing: border-box;
            }
            input:focus {
              outline: none;
              border-color: #667eea;
            }
            button {
              width: 100%;
              padding: 15px;
              background: #000;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
              margin-top: 10px;
            }
            button:hover {
              background: #333;
            }
          </style>
        </head>
        <body>
          <div class="login-container">
            <h1>🔒 Admin Access</h1>
            <form method="GET">
              <input type="password" name="password" placeholder="Enter Admin Password" required autofocus>
              <button type="submit">Login</button>
            </form>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Get current blocklists
  const blockedIPs = (process.env.BLOCKED_IPS || "")
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i);
  const blockedEmails = (process.env.BLOCKED_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e);

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>The Quollective - Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          .header {
            background: #000;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            letter-spacing: 2px;
          }
          .nav {
            display: flex;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
          }
          .nav a {
            flex: 1;
            padding: 15px;
            text-align: center;
            text-decoration: none;
            color: #333;
            font-weight: bold;
            border-right: 1px solid #dee2e6;
          }
          .nav a:last-child { border-right: none; }
          .nav a:hover {
            background: #e9ecef;
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
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .blocklist h3 {
            color: #856404;
            margin-bottom: 15px;
          }
          .blocked-item {
            display: inline-flex;
            align-items: center;
            background: #dc3545;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 5px;
            font-family: monospace;
            font-size: 14px;
          }
          .unblock-btn {
            margin-left: 10px;
            background: white;
            color: #dc3545;
            border: none;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
          }
          .add-form {
            background: #e9ecef;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .add-form input {
            width: calc(100% - 120px);
            padding: 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            margin-right: 10px;
          }
          .add-form button {
            padding: 10px 20px;
            background: #000;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          .add-form button:hover {
            background: #333;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
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
          }
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ THE QUOLLECTIVE ADMIN</h1>
            <p>Contact Form Security Dashboard</p>
          </div>

          <div class="nav">
            <a href="/admin?password=${password}">Dashboard</a>
            <a href="https://app.netlify.com/sites/quollective/functions" target="_blank">Function Logs</a>
            <a href="https://app.netlify.com/sites/quollective/settings/env" target="_blank">Environment Vars</a>
          </div>

          <div class="section">
            <div class="stats">
              <div class="stat-card">
                <div class="stat-number">${blockedIPs.length}</div>
                <div class="stat-label">Blocked IPs</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${blockedEmails.length}</div>
                <div class="stat-label">Blocked Emails</div>
              </div>
            </div>

            <div class="section-title">🚫 Blocked IPs</div>
            <div class="add-form">
              <form method="GET" action="/admin/block">
                <input type="hidden" name="password" value="${password}">
                <input type="text" name="ip" placeholder="Enter IP address to block (e.g., 192.168.1.1)" required>
                <button type="submit">Block IP</button>
              </form>
            </div>
            <div class="blocklist">
              ${
                blockedIPs.length > 0
                  ? blockedIPs
                      .map(
                        (ip) => `
                <div class="blocked-item">
                  ${ip}
                  <a href="/admin/unblock?ip=${ip}&password=${password}" class="unblock-btn">✕</a>
                </div>
              `
                      )
                      .join("")
                  : '<div class="empty-state">No blocked IPs</div>'
              }
            </div>

            <div class="section-title">⛔ Blocked Emails</div>
            <div class="add-form">
              <form method="GET" action="/admin/block">
                <input type="hidden" name="password" value="${password}">
                <input type="email" name="email" placeholder="Enter email to block (e.g., spam@example.com)" required>
                <button type="submit">Block Email</button>
              </form>
            </div>
            <div class="blocklist">
              ${
                blockedEmails.length > 0
                  ? blockedEmails
                      .map(
                        (email) => `
                <div class="blocked-item">
                  ${email}
                  <a href="/admin/unblock?email=${email}&password=${password}" class="unblock-btn">✕</a>
                </div>
              `
                      )
                      .join("")
                  : '<div class="empty-state">No blocked emails</div>'
              }
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};
