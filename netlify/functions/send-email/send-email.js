// netlify/functions/send-email/send-email.js
const axios = require("axios");

exports.handler = async function (event, context) {
  // Get current year for copyright
  const currentYear = new Date().getFullYear();

  // Extract IP address from Netlify headers
  const clientIP =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0] ||
    "Unknown";

  console.log("Request from IP:", clientIP);

  // Set CORS headers dynamically based on the origin
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
    // Parse the incoming JSON
    const data = JSON.parse(event.body);
    console.log("Received form submission:", data);

    // NEW: Check IP blocklist
    const isBlocked = await checkIPBlocklist(clientIP);
    if (isBlocked) {
      console.log(`Blocked IP attempted submission: ${clientIP}`);

      // Log the blocked attempt
      await logIPSubmission(clientIP, data, "BLOCKED");

      // Return fake success to not tip off spammers
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Email sent successfully",
        }),
      };
    }

    // NEW: Verify reCAPTCHA
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
      console.log("reCAPTCHA verification failed for IP:", clientIP);

      // Log failed verification
      await logIPSubmission(clientIP, data, "RECAPTCHA_FAILED");

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

    // Validate the submitter's email
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

    // NEW: Log legitimate submission
    await logIPSubmission(clientIP, data, "SUCCESS");

    // Get IP location info (optional - makes admin email more useful)
    const ipInfo = await getIPInfo(clientIP);

    // Create email-client friendly HTML email template with dynamic data
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
                <!-- Container Table -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; color: #ffffff;">
                    <!-- Header -->
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
                    
                    <!-- Main Content -->
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
                    
                    <!-- Details Grid -->
                    <tr>
                        <td style="padding: 0 20px 20px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <!-- Name -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Name</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  name || "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Email -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Email</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${email}</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Phone -->
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
                                        
                                        <!-- Organization -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Organization</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  organization || "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Service -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Service</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  service || "Not specified"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Message -->
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
                    
                    <!-- Quote -->
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <h2 style="font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; margin: 0; line-height: 1.3; letter-spacing: 1px;">
                                "CULTURE DRIVES COMMERCE.<br>
                                WE DRIVE CULTURE."
                            </h2>
                        </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table width="80%" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" height="1" style="background-color: #333333;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Next Steps -->
                    <tr>
                        <td style="padding: 20px; background-color: #111111;">
                            <h3 align="center" style="font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; margin: 0 0 20px 0;">WHAT HAPPENS NEXT</h3>
                            
                            <!-- Initial Contact -->
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
                    
                    <!-- CTA & Links -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background-color: #ffffff; border-radius: 3px;">
                                        <a href="https://thequollective.africa/work" target="_blank" style="display: inline-block; padding: 15px 30px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #000000; text-decoration: none; letter-spacing: 1px;">EXPLORE OUR WORK</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Social Links -->
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0 20px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.linkedin.com/company/the-quollective-africa/" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" height="24" style="display: block;" /></a>
                                        <a href="https://www.instagram.com/thequollectiveafrica" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="24" height="24" style="display: block;" /></a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Website Links -->
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
                    
                    <!-- Footer -->
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

    // NEW: Create improved admin email template with IP information
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
                <!-- Container Table -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px; background-color: #000000;">
                            <img src="https://cdn.prod.website-files.com/666173435a4bdfce5ef95f6f/67dc5fea1adb79c551882cdc_quo_logo_white.png" alt="THE QUOLLECTIVE" width="150" style="display: block;" />
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px 20px;">
                            <h1 style="font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; margin: 0 0 20px 0; color: #333333;">New Contact Form Submission</h1>
                            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 20px 0; color: #666666;">You have received a new inquiry from your website contact form. Here are the details:</p>
                            
                            <!-- NEW: IP Information Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">🔍 Submission Source Information</h3>
                                        <p style="margin: 0; color: #856404; font-size: 14px;">
                                            <strong>IP Address:</strong> ${clientIP}<br>
                                            ${
                                              ipInfo.country
                                                ? `<strong>Location:</strong> ${
                                                    ipInfo.city
                                                      ? ipInfo.city + ", "
                                                      : ""
                                                  }${ipInfo.country}`
                                                : ""
                                            }
                                            ${
                                              ipInfo.isp
                                                ? `<br><strong>ISP:</strong> ${ipInfo.isp}`
                                                : ""
                                            }
                                        </p>
                                        ${
                                          ipInfo.isVPN || ipInfo.isProxy
                                            ? `<p style="margin: 10px 0 0 0; color: #d32f2f; font-size: 13px; font-weight: bold;">⚠️ Warning: This submission may be from a VPN/Proxy</p>`
                                            : ""
                                        }
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Submission Details -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #eeeeee; border-radius: 5px; overflow: hidden;">
                                <tr style="background-color: #f9f9f9;">
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333333; border-bottom: 1px solid #eeeeee;">Name</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333333; border-bottom: 1px solid #eeeeee;">${
                                      name || "Not provided"
                                    }</td>
                                </tr>
                                <tr>
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333333; border-bottom: 1px solid #eeeeee;">Email</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333333; border-bottom: 1px solid #eeeeee;"><a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a></td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333333; border-bottom: 1px solid #eeeeee;">Phone</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333333; border-bottom: 1px solid #eeeeee;">
                                        ${
                                          phone
                                            ? phone.startsWith("+")
                                              ? `<a href="tel:${phone}" style="color: #007bff; text-decoration: none;">${phone}</a>`
                                              : `<a href="tel:+254${phone}" style="color: #007bff; text-decoration: none;">+254 ${phone}</a>`
                                            : "Not provided"
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333333; border-bottom: 1px solid #eeeeee;">Organization</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333333; border-bottom: 1px solid #eeeeee;">${
                                      organization || "Not provided"
                                    }</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td width="30%" style="padding: 12px 15px; font-weight: bold; color: #333333; border-bottom: 1px solid #eeeeee;">Service</td>
                                    <td width="70%" style="padding: 12px 15px; color: #333333; border-bottom: 1px solid #eeeeee;">${
                                      service || "Not specified"
                                    }</td>
                                </tr>
                            </table>
                            
                            <!-- Message -->
                            <h2 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0; color: #333333;">Message:</h2>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #000000; margin-bottom: 20px; color: #666666;">
                                ${
                                  message
                                    ? message.replace(/\n/g, "<br>")
                                    : "No message provided"
                                }
                            </div>
                            
                            <!-- NEW: Quick Actions -->
                            <h3 style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin: 30px 0 15px 0; color: #333333;">Quick Actions:</h3>
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-right: 10px;">
                                        <a href="mailto:${email}" style="display: inline-block; padding: 10px 20px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Reply to Inquiry</a>
                                    </td>
                                    <td>
                                        <a href="https://thequollective.africa/.netlify/functions/block-ip?ip=${clientIP}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Block This IP</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 14px; margin: 20px 0 0 0; color: #999999;">To view all submissions and IP logs, visit your <a href="https://app.netlify.com" style="color: #007bff;">Netlify dashboard</a>.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 20px; background-color: #f5f5f5; font-size: 14px; color: #999999; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0;">&copy; ${currentYear} THE QUOLLECTIVE. ALL RIGHTS RESERVED.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Create email data for admin notification
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
      subject: `New Contact Form Submission: ${
        service || "Website Inquiry"
      } [IP: ${clientIP}]`,
      htmlContent: adminEmailTemplate,
    };

    // Create confirmation email for the user
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

    // Brevo API endpoint for sending emails
    const apiUrl = "https://api.brevo.com/v3/smtp/email";

    // Send email to admin
    console.log("Sending admin notification email...");
    const adminEmailResponse = await axios.post(apiUrl, adminEmailData, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });
    console.log("Admin email sent successfully:", adminEmailResponse.data);

    // Send confirmation email to user
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
    console.log(
      "User confirmation email sent successfully:",
      userEmailResponse.data
    );

    // Return success response
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

    // Return error response with more details
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Failed to send email",
        error: error.message,
        stack: error.stack,
      }),
    };
  }
};

// NEW: Helper function to verify reCAPTCHA
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

    console.log("reCAPTCHA verification response:", response.data);
    return response.data.success === true;
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return false;
  }
}

// NEW: Helper function to get IP information
async function getIPInfo(ip) {
  try {
    // Using ip-api.com (free, no API key required, 45 req/min limit)
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;

    return {
      country: data.country || null,
      city: data.city || null,
      isp: data.isp || null,
      isProxy: data.proxy || false,
      isVPN: data.hosting || false, // hosting flag often indicates VPN/datacenter
    };
  } catch (error) {
    console.error("Error fetching IP info:", error);
    return {};
  }
}

// NEW: Helper function to log IP submissions
async function logIPSubmission(ip, formData, status) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ip,
      status, // SUCCESS, BLOCKED, RECAPTCHA_FAILED
      email: formData.email || "N/A",
      name: formData.name || "N/A",
      service: formData.service || "N/A",
      message: formData.message ? formData.message.substring(0, 100) : "N/A", // First 100 chars
    };

    // Use Netlify Blobs to store logs
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("ip-logs");

    // Create a unique key for this submission
    const logKey = `${timestamp}-${ip}`;

    // Store the log entry
    await store.set(logKey, JSON.stringify(logEntry));

    console.log("IP submission logged:", logKey);
  } catch (error) {
    console.error("Error logging IP submission:", error);
    // Don't fail the request if logging fails
  }
}

// NEW: Helper function to check if IP is blocked
async function checkIPBlocklist(ip) {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("ip-blocklist");

    const isBlocked = await store.get(ip);
    return isBlocked === "true";
  } catch (error) {
    console.error("Error checking IP blocklist:", error);
    return false; // If there's an error, don't block
  }
}
