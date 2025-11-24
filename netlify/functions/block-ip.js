// netlify/functions/block-ip.js
exports.handler = async function (event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const ip = event.queryStringParameters?.ip;

    if (!ip) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "IP address is required" }),
      };
    }

    // Use Netlify Blobs to store blocked IPs
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("ip-blocklist");

    // Add IP to blocklist
    await store.set(ip, "true");

    console.log(`IP ${ip} has been blocked`);

    // Return a simple HTML response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>IP Blocked</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #d32f2f;
            }
            .ip {
              background-color: #fff3cd;
              padding: 10px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
              font-family: monospace;
            }
            .success {
              color: #28a745;
              font-weight: bold;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background-color: #000;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ IP Address Blocked</h1>
            <p class="success">The following IP has been successfully added to the blocklist:</p>
            <div class="ip">${ip}</div>
            <p>Future submissions from this IP will be silently rejected (they'll see a success message but no email will be sent).</p>
            <a href="https://thequollective.africa">Back to Website</a>
          </div>
        </body>
        </html>
      `,
    };
  } catch (error) {
    console.error("Error blocking IP:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to block IP" }),
    };
  }
};
