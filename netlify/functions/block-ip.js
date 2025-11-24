// netlify/functions/block-ip.js
const axios = require("axios");

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

    // Password protection
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
              input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
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

    // Get current environment variables from Netlify
    const siteId = process.env.NETLIFY_SITE_ID;
    const accessToken = process.env.NETLIFY_ACCESS_TOKEN;

    if (!siteId || !accessToken) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: `
          <html>
            <body>
              <h1>Configuration Error</h1>
              <p>Missing NETLIFY_SITE_ID or NETLIFY_ACCESS_TOKEN environment variables.</p>
              <p>Please set these in your Netlify dashboard.</p>
            </body>
          </html>
        `,
      };
    }

    // Fetch current environment variables
    const envVarsUrl = `https://api.netlify.com/api/v1/accounts/-/env/${siteId}`;

    let blockedIPs = [];
    let blockedEmails = [];

    try {
      const response = await axios.get(envVarsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Find existing values
      const blockedIPsVar = response.data.find((v) => v.key === "BLOCKED_IPS");
      const blockedEmailsVar = response.data.find(
        (v) => v.key === "BLOCKED_EMAILS"
      );

      if (
        blockedIPsVar &&
        blockedIPsVar.values &&
        blockedIPsVar.values.length > 0
      ) {
        blockedIPs = blockedIPsVar.values[0].value
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i);
      }

      if (
        blockedEmailsVar &&
        blockedEmailsVar.values &&
        blockedEmailsVar.values.length > 0
      ) {
        blockedEmails = blockedEmailsVar.values[0].value
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e);
      }
    } catch (error) {
      console.error(
        "Error fetching env vars:",
        error.response?.data || error.message
      );
    }

    let message = "";
    let updated = false;

    // Add new blocked items
    if (ip && !blockedIPs.includes(ip)) {
      blockedIPs.push(ip);
      message += `✅ IP ${ip} added to blocklist<br>`;
      updated = true;
    } else if (ip) {
      message += `⚠️ IP ${ip} already blocked<br>`;
    }

    if (email && !blockedEmails.includes(email.toLowerCase())) {
      blockedEmails.push(email.toLowerCase());
      message += `✅ Email ${email} added to blocklist<br>`;
      updated = true;
    } else if (email) {
      message += `⚠️ Email ${email} already blocked<br>`;
    }

    if (!updated) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Already Blocked</title>
            <style>
              body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #ffc107; }
              a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: white; text-decoration: none; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Already Blocked</h1>
              ${message}
              <a href="/admin?password=${password}">Back to Dashboard</a>
            </div>
          </body>
          </html>
        `,
      };
    }

    // Update environment variables via Netlify API
    const updatePromises = [];

    if (ip) {
      updatePromises.push(
        axios.patch(
          `https://api.netlify.com/api/v1/accounts/-/env/BLOCKED_IPS?site_id=${siteId}`,
          {
            key: "BLOCKED_IPS",
            scopes: ["builds", "functions", "runtime", "post_processing"],
            values: [
              {
                value: blockedIPs.join(","),
                context: "all",
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    if (email) {
      updatePromises.push(
        axios.patch(
          `https://api.netlify.com/api/v1/accounts/-/env/BLOCKED_EMAILS?site_id=${siteId}`,
          {
            key: "BLOCKED_EMAILS",
            scopes: ["builds", "functions", "runtime", "post_processing"],
            values: [
              {
                value: blockedEmails.join(","),
                context: "all",
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    await Promise.all(updatePromises);

    // Trigger a new deployment
    const buildHookUrl = `https://api.netlify.com/build_hooks/${
      process.env.BUILD_HOOK_ID || ""
    }`;

    // If build hook is configured, trigger it
    if (process.env.BUILD_HOOK_ID) {
      try {
        await axios.post(buildHookUrl);
        message += `<br>🔄 Site redeployment triggered (takes ~30 seconds)<br>`;
      } catch (error) {
        console.error("Error triggering build:", error.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Blocked Successfully</title>
          <meta http-equiv="refresh" content="35;url=/admin?password=${password}">
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #d32f2f; }
            .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
            .info { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #000; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚫 Blocking in Progress...</h1>
            <div class="success">
              ${message}
            </div>
            <div class="info">
              <strong>⏳ Please wait...</strong><br>
              Your site is being redeployed with the updated blocklist. This typically takes 30-60 seconds.<br><br>
              You'll be automatically redirected to the dashboard when complete.
            </div>
            <div class="spinner"></div>
            <center>
              <a href="/admin?password=${password}">Go to Dashboard Now</a>
            </center>
          </div>
        </body>
        </html>
      `,
    };
  } catch (error) {
    console.error("Error blocking:", error.response?.data || error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <body>
            <h1>Error</h1>
            <p>${error.message}</p>
            <pre>${JSON.stringify(error.response?.data, null, 2)}</pre>
          </body>
        </html>
      `,
    };
  }
};
