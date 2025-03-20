// netlify/functions/send-email/send-email.js
const axios = require("axios");

exports.handler = async function (event, context) {
  // Set CORS headers to allow your Webflow site
  const headers = {
    "Access-Control-Allow-Origin": "https://quollective.webflow.io", // Use HTTPS
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

    // Extract form data - get from form submission if available
    let name = data.name || "";
    let email = data.email || "";
    let phone = data.phone || "";
    let organization = data.organization || "";
    let service = data.service || "";
    let message = data.message || "";

    // If data is nested in the sender/to objects (from the original form structure)
    if (!name && data.sender && data.sender.name) {
      name = data.sender.name;
    }

    if (!email && data.to && data.to[0] && data.to[0].email) {
      email = data.to[0].email;
    }

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
                                    <td align="center" height="1" style="background: linear-gradient(to right, #000000, #ffffff, #000000);"></td>
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
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  email || "Not provided"
                                                }</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Phone -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999999; padding-bottom: 5px; vertical-align: top;">Phone</td>
                                                <td width="70%" style="font-size: 14px; padding-bottom: 10px;">${
                                                  phone || "Not provided"
                                                }</td>
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
                            
                            <!-- Step 1 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
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
                            
                            <!-- Step 2 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                <tr valign="top">
                                    <td width="20" height="100%" style="padding-right: 15px;">
                                        <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; margin-top: 5px;"></div>
                                    </td>
                                    <td>
                                        <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 16px;">Discovery Call</p>
                                        <p style="margin: 0; color: #cccccc; font-size: 14px;">We'll schedule a conversation to deeply understand your vision, goals, and timeline.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Step 3 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                <tr valign="top">
                                    <td width="20" height="100%" style="padding-right: 15px;">
                                        <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; margin-top: 5px;"></div>
                                    </td>
                                    <td>
                                        <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 16px;">Strategic Proposal</p>
                                        <p style="margin: 0; color: #cccccc; font-size: 14px;">Based on our conversation, we'll craft a tailored proposal that aligns with your objectives.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Step 4 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr valign="top">
                                    <td width="20" height="100%" style="padding-right: 15px;">
                                        <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; margin-top: 5px;"></div>
                                    </td>
                                    <td>
                                        <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 16px;">Creative Journey Begins</p>
                                        <p style="margin: 0; color: #cccccc; font-size: 14px;">Upon approval, we'll assemble the perfect team to bring your vision to life.</p>
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
                            <p style="margin: 0 0 10px 0;">&copy;2025 THE QUOLLECTIVE. ALL RIGHTS RESERVED.</p>
                            <p style="margin: 0;">This message was sent in response to your inquiry. Your information is kept confidential.</p>
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
        name: name || "Website Visitor",
        email: data.sender ? data.sender.email : "davidngari47@gmail.com", // Fallback to test email
      },
      to: data.to || [
        {
          email: "davidngari47@gmail.com", // Default test recipient
          name: "David Ngari",
        },
      ],
      replyTo: {
        email:
          email ||
          (data.replyTo ? data.replyTo.email : "davidngari47@gmail.com"),
      },
      subject: `New Contact Form Submission: ${service || "Website Inquiry"}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name || "Not provided"}</p>
        <p><strong>Email:</strong> ${email || "Not provided"}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Organization:</strong> ${organization || "Not provided"}</p>
        <p><strong>Service:</strong> ${service || "Not specified"}</p>
        <p><strong>Message:</strong></p>
        <p>${
          message ? message.replace(/\n/g, "<br>") : "No message provided"
        }</p>
      `,
    };

    // Create confirmation email for the user
    const userConfirmationEmailData = {
      sender: {
        name: "THE QUOLLECTIVE",
        email: data.sender ? data.sender.email : "davidngari47@gmail.com",
      },
      to: [
        {
          email:
            email ||
            (data.to && data.to[0]
              ? data.to[0].email
              : "davidngari47@gmail.com"),
          name: name || "Website Visitor",
        },
      ],
      replyTo: {
        email: data.replyTo ? data.replyTo.email : "davidngari47@gmail.com",
      },
      subject: `YOUR VISION IS NOW IN OUR HANDS | THE QUOLLECTIVE`,
      htmlContent: emailClientFriendlyTemplate,
    };

    // Brevo API endpoint for sending emails
    const apiUrl = "https://api.brevo.com/v3/smtp/email";

    // Send email to admin
    const adminEmailResponse = await axios.post(apiUrl, adminEmailData, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });

    // Send confirmation email to user
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

    // Return error response
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
