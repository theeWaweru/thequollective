// netlify/functions/send-email/send-email.js
const axios = require("axios");

exports.handler = async function (event, context) {
  const currentYear = new Date().getFullYear();

  // Extract IP address from Netlify headers
  const clientIP =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0] ||
    "Unknown";

  console.log("Request from IP:", clientIP);

  // Set CORS headers
  const origin = event.headers.origin || "";
  const allowedOrigins = [
    "https://quollective.webflow.io",
    "https://thequollective.africa",
    "https://www.thequollective.africa",
  ];

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log("Received form submission:", data);

    // NEW: HONEYPOT CHECK - If the hidden "website" field is filled, it's a bot
    if (data.website && data.website.trim() !== "") {
      console.log("🍯 HONEYPOT TRIGGERED - Bot detected, IP:", clientIP);

      // Silently reject (bot thinks it succeeded)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Email sent successfully",
        }),
      };
    }

    // Check IP blocklist from environment variable
    const blockedIPs = (process.env.BLOCKED_IPS || "")
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip);
    if (blockedIPs.includes(clientIP)) {
      console.log(`🚫 BLOCKED IP attempted submission: ${clientIP}`);

      // Add delay to waste spammer's time
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay

      // Return fake success
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Email sent successfully",
        }),
      };
    }

    // Check blocked emails from environment variable
    const blockedEmails = (process.env.BLOCKED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email);
    const submitterEmail = (data.email || "").toLowerCase();

    if (blockedEmails.includes(submitterEmail)) {
      console.log(`🚫 BLOCKED EMAIL attempted submission: ${submitterEmail}`);

      // Add delay to waste spammer's time
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Return fake success
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Email sent successfully",
        }),
      };
    }

    // Verify reCAPTCHA
    const recaptchaToken = data.recaptchaToken;
    if (!recaptchaToken) {
      console.log("Missing reCAPTCHA token");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "reCAPTCHA verification required",
        }),
      };
    }

    const recaptchaVerified = await verifyRecaptcha(recaptchaToken, clientIP);
    if (!recaptchaVerified) {
      console.log("❌ reCAPTCHA verification failed for IP:", clientIP);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "reCAPTCHA verification failed. Please try again.",
        }),
      };
    }

    // Extract form data
    let name = data.sender?.name || data.name || "";
    let email = data.replyTo?.email || data.email || "";
    let phone = data.fullPhone || data.phone || "";
    let organization = data.organization || "";
    let service = data.service || "";
    let message = data.message || "";

    console.log("Extracted form data:", {
      name,
      email,
      phone,
      organization,
      service,
    });

    // Validate email
    if (!email || !email.includes("@")) {
      console.log("Invalid or missing email address:", email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Valid email address is required",
        }),
      };
    }

    // Get IP location info
    const ipInfo = await getIPInfo(clientIP);

    // User confirmation email template
    const emailClientFriendlyTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>THE QUOLLECTIVE | MESSAGE RECEIVED</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; color: #ffffff;">
                    <tr>
                        <td align="center" style="padding: 40px 20px; border-bottom: 1px solid #333333;">
                            <img src="https://cdn.prod.website-files.com/666173435a4bdfce5ef95f6f/67dc5fea1adb79c551882cdc_quo_logo_white.png" alt="THE QUOLLECTIVE" width="180" style="display: block;" />
                            <h1 style="font-family: Arial, sans-serif; font-size: 36px; font-weight: bold; margin: 20px 0 5px 0; letter-spacing: 2px;">MESSAGE RECEIVED</h1>
                            <p style="font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: #cccccc; margin: 5px 0 20px 0;">Your vision is now in our hands</p>
                            <table width="80%" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" height="1" style="background-color: #333333;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 30px 20px;">
                            <h2 style="font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 1px;">THE BEGINNING OF SOMETHING EXTRAORDINARY</h2>
                            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for reaching out to us. Your message has been received and is already sparking creative conversations among our team. We believe that great work comes from genuine connections, and this is just the beginning of ours.</p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                    <td width="3" style="background-color: #ffffff;"></td>
                                    <td style="padding: 15px; font-style: italic; color: #cccccc;">
                                        "Creativity is intelligence having fun." — Albert Einstein
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">We're excited to explore how we can bring your vision to life through culture-driven creativity. Our team will review your inquiry and reach out to you <span style="display: inline-block; padding: 2px 8px; background-color: #ffffff; color: #000000; font-weight: bold;">within 24 hours</span>.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 20px 20px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Name</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  name || "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Email</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${email}</td>
                                            </tr>
                                        </table>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Phone</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">
                                                    ${
                                                      phone
                                                        ? phone.startsWith("+")
                                                          ? `<a href="tel:${phone}" style="color: #ffffff; text-decoration: underline;">${phone}</a>`
                                                          : `<a href="tel:+254${phone}" style="color: #ffffff; text-decoration: underline;">+254 ${phone}</a>`
                                                        : "Not provided"
                                                    }
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Organization</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  organization || "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Service</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  service || "Not specified"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Your Message</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  message
                                                    ? message.replace(
                                                        /\n/g,
                                                        "<br>"
                                                      )
                                                    : "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <h2 style="font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; margin: 0; line-height: 1.3; letter-spacing: 1px;">
                                "CULTURE DRIVES COMMERCE.<br>
                                WE DRIVE CULTURE."
                            </h2>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table width="80%" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" height="1" style="background-color: #333333;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 20px; background-color: #111111;">
                            <h3 align="center" style="font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; margin: 0 0 20px 0;">WHAT HAPPENS NEXT</h3>
                            
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr valign="top">
                                    <td width="20" height="100%" style="padding-right: 15px;">
                                        <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; margin-top: 5px;"></div>
                                    </td>
                                    <td>
                                        <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 16px;">Initial Contact</p>
                                        <p style="margin: 0; color: #cccccc; font-size: 14px;">One of our team members will reach out to you within 24 hours to acknowledge your inquiry.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background-color: #ffffff; border-radius: 3px;">
                                        <a href="https://thequollective.africa/work" target="_blank" style="display: inline-block; padding: 15px 30px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #000000; text-decoration: none; letter-spacing: 1px;">EXPLORE OUR WORK</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0 20px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.linkedin.com/company/the-quollective-africa/" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" height="24" style="display: block;" /></a>
                                        <a href="https://www.instagram.com/thequollectiveafrica" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="24" height="24" style="display: block;" /></a>
                                    </td>
                                </tr>
                            </table>
                            
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://thequollective.africa" style="color: #ffffff; text-decoration: none; margin: 0 15px; font-size: 14px;">HOME</a>
                                        <a href="https://thequollective.africa/work" style="color: #ffffff; text-decoration: none; margin: 0 15px; font-size: 14px;">WORK</a>
                                        <a href="https://thequollective.africa/contact" style="color: #ffffff; text-decoration: none; margin: 0 15px; font-size: 14px;">CONTACT</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px; border-top: 1px solid #333333; font-size: 12px; color: #999999;">
                            <p style="margin: 0 0 10px 0;">&copy; ${currentYear} THE QUOLLECTIVE. ALL RIGHTS RESERVED.</p>
                            <p style="margin: 0;">This message was sent in response to your inquiry. Your information is kept confidential according to our privacy policy.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Admin email template with IP info and action buttons
    const adminEmailTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff;">
                    <tr>
                        <td align="center" style="padding: 30px 20px; background-color: #000000;">
                            <img src="https://cdn.prod.website-files.com/666173435a4bdfce5ef95f6f/67dc5fea1adb79c551882cdc_quo_logo_white.png" alt="THE QUOLLECTIVE" width="150" style="display: block;" />
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px;">
                            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0; color: #333333;">New Contact Form Submission</h1>
                            
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">🔍 Source Information</h3>
                                        <p style="margin: 0; color: #856404; font-size: 14px;">
                                            <strong>IP Address:</strong> ${clientIP}<br>
                                            ${
                                              ipInfo.country
                                                ? `<strong>Location:</strong> ${
                                                    ipInfo.city
                                                      ? ipInfo.city + ", "
                                                      : ""
                                                  }${ipInfo.country}<br>`
                                                : ""
                                            }
                                            ${
                                              ipInfo.isp
                                                ? `<strong>ISP:</strong> ${ipInfo.isp}`
                                                : ""
                                            }
                                        </p>
                                        ${
                                          ipInfo.isVPN || ipInfo.isProxy
                                            ? `<p style="margin: 10px 0 0 0; color: #d32f2f; font-size: 13px; font-weight: bold;">⚠️ Warning: Possible VPN/Proxy</p>`
                                            : ""
                                        }
                                    </td>
                                </tr>
                            </table>
                            
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #eeeeee; border-radius: 5px;">
                                <tr style="background-color: #f9f9f9;">
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Name</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333; border-bottom: 1px solid #eee;">${
                                      name || "Not provided"
                                    }</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Email</td>
                                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;"><a href="mailto:${email}" style="color: #007bff;">${email}</a></td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 12px 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Phone</td>
                                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                                        ${
                                          phone
                                            ? phone.startsWith("+")
                                              ? `<a href="tel:${phone}" style="color: #007bff;">${phone}</a>`
                                              : `<a href="tel:+254${phone}" style="color: #007bff;">+254 ${phone}</a>`
                                            : "Not provided"
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Organization</td>
                                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${
                                      organization || "Not provided"
                                    }</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 12px 15px; font-weight: bold; color: #333;">Service</td>
                                    <td style="padding: 12px 15px;">${
                                      service || "Not specified"
                                    }</td>
                                </tr>
                            </table>
                            
                            <h2 style="font-size: 18px; font-weight: bold; margin: 30px 0 15px 0; color: #333;">Message:</h2>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #000; margin-bottom: 20px; color: #666;">
                                ${
                                  message
                                    ? message.replace(/\n/g, "<br>")
                                    : "No message provided"
                                }
                            </div>
                            
                            <h3 style="font-size: 16px; font-weight: bold; margin: 30px 0 15px 0; color: #333;">⚡ Quick Actions:</h3>
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-right: 10px; padding-bottom: 10px;">
                                        <a href="mailto:${email}" style="display: inline-block; padding: 12px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; font-size: 14px;">📧 Reply</a>
                                    </td>
                                    <td style="padding-right: 10px; padding-bottom: 10px;">
                                        <a href="https://quollective.netlify.app/admin/block?ip=${clientIP}&email=${encodeURIComponent(
      email
    )}" style="display: inline-block; padding: 12px 20px; background-color: #dc3545; color: #fff; text-decoration: none; border-radius: 4px; font-size: 14px;">🚫 Block IP</a>
                                    </td>
                                    <td style="padding-bottom: 10px;">
                                        <a href="https://quollective.netlify.app/admin/block?email=${encodeURIComponent(
                                          email
                                        )}" style="display: inline-block; padding: 12px 20px; background-color: #ffc107; color: #000; text-decoration: none; border-radius: 4px; font-size: 14px;">⛔ Block Email</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 20px; background-color: #f5f5f5; font-size: 14px; color: #999; border-top: 1px solid #eee;">
                            <p style="margin: 0;">&copy; ${currentYear} THE QUOLLECTIVE</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const adminEmailData = {
      sender: {
        name: "Quollective Website",
        email: "the.emuron@thequollective.africa",
      },
      to: [
        {
          email: "the.emuron@thequollective.africa",
          name: "The Quollective",
        },
        {
          email: "the.kigunda@thequollective.africa",
          name: "Lilian Kigunda",
        },
      ],
      replyTo: {
        email: email,
      },
      subject: `New Inquiry: ${service || "General"} | ${name} [${clientIP}]`,
      htmlContent: adminEmailTemplate,
    };

    const userConfirmationEmailData = {
      sender: {
        name: "THE QUOLLECTIVE",
        email: "the.emuron@thequollective.africa",
      },
      to: [
        {
          email: email,
          name: name || "Website Visitor",
        },
      ],
      replyTo: {
        email: "the.kigunda@thequollective.africa",
      },
      subject: `YOUR VISION IS NOW IN OUR HANDS | THE QUOLLECTIVE`,
      htmlContent: emailClientFriendlyTemplate,
    };

    const apiUrl = "https://api.brevo.com/v3/smtp/email";

    console.log("Sending admin notification email...");
    const adminEmailResponse = await axios.post(apiUrl, adminEmailData, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });
    console.log("✅ Admin email sent successfully");

    console.log("Sending confirmation email to user:", email);
    const userEmailResponse = await axios.post(
      apiUrl,
      userConfirmationEmailData,
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );
    console.log("✅ User confirmation email sent successfully");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Emails sent successfully",
        adminEmailId: adminEmailResponse.data.messageId,
        userEmailId: userEmailResponse.data.messageId,
      }),
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Failed to send email",
        error: error.message,
      }),
    };
  }
};

// Helper function to verify reCAPTCHA
async function verifyRecaptcha(token, clientIP) {
  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: clientIP,
        },
      }
    );
    return response.data.success === true;
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return false;
  }
}

// Helper function to get IP information
async function getIPInfo(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;

    return {
      country: data.country || null,
      city: data.city || null,
      isp: data.isp || null,
      isProxy: data.proxy || false,
      isVPN: data.hosting || false,
    };
  } catch (error) {
    console.error("Error fetching IP info:", error);
    return {};
  }
}
