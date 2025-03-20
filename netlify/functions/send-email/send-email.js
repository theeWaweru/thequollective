// netlify/functions/send-email/send-email.js
const axios = require("axios");

exports.handler = async function (event, context) {
  // Set CORS headers to allow your Webflow site
  const headers = {
    "Access-Control-Allow-Origin": "https://quollective.webflow.io", // Replace with your Webflow domain https://thequollective.africa
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

    // Brevo API endpoint for sending emails
    const apiUrl = "https://api.brevo.com/v3/smtp/email";

    // Make the request to Brevo API
    const response = await axios.post(apiUrl, data, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Email sent successfully",
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
