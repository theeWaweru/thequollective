// netlify/functions/block-ip.js
exports.handler = async function (event, context) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const ip = event.queryStringParameters?.ip;
    const email = event.queryStringParameters?.email;
    const password = event.queryStringParameters?.password;

    // Simple password protection
    if (password !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "text/html" },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Access Required</title>
            <style>
              body { font-family: Arial; max-width: 500px; margin: 100px auto; padding: 20px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
              button { width: 100%; padding: 12px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
              button:hover { background: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🔒 Admin Access Required</h2>
              <p>Enter admin password to continue:</p>
              <form method="GET">
                <input type="hidden" name="ip" value="${ip || ""}">
                <input type="hidden" name="email" value="${email || ""}">
                <input type="password" name="password" placeholder="Admin Password" required>
                <button type="submit">Continue</button>
              </form>
            </div>
          </body>
          </html>
        `,
      };
    }

    if (!ip && !email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: `<html><body><h1>Error</h1><p>Either IP or Email is required</p></body></html>`,
      };
    }

    let blockedIPs = (process.env.BLOCKED_IPS || "")
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i);
    let blockedEmails = (process.env.BLOCKED_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e);

    let message = "";

    if (ip && !blockedIPs.includes(ip)) {
      blockedIPs.push(ip);
      message += `✅ IP ${ip} blocked<br>`;
    }

    if (email && !blockedEmails.includes(email.toLowerCase())) {
      blockedEmails.push(email.toLowerCase());
      message += `✅ Email ${email} blocked<br>`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Blocked Successfully</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #d32f2f; }
            .blocked-item { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; font-family: monospace; }
            .warning { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
            a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: white; text-decoration: none; border-radius: 4px; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚫 Blocked Successfully</h1>
            ${message}
            <div class="warning">
              <strong>⚠️ IMPORTANT: Update Environment Variables</strong><br><br>
              Go to your Netlify dashboard and update these environment variables:<br><br>
              ${
                ip
                  ? `<strong>BLOCKED_IPS:</strong><br><code>${blockedIPs.join(
                      ","
                    )}</code><br><br>`
                  : ""
              }
              ${
                email
                  ? `<strong>BLOCKED_EMAILS:</strong><br><code>${blockedEmails.join(
                      ","
                    )}</code><br><br>`
                  : ""
              }
              Then redeploy your site for changes to take effect.
            </div>
            <a href="https://app.netlify.com/sites/quollective/settings/env" target="_blank">Open Netlify Settings</a>
            <a href="/admin">Back to Dashboard</a>
          </div>
        </body>
        </html>
      `,
    };
  } catch (error) {
    console.error("Error blocking:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `<html><body><h1>Error</h1><p>${error.message}</p></body></html>`,
    };
  }
};
