import { randomUUID } from "crypto";
import { appendFile } from "fs/promises";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9()\-.\s]{7,20}$/;

function sanitize(value) {
  return String(value || "").trim();
}

function validatePayload(payload) {
  const name = sanitize(payload.name);
  const email = sanitize(payload.email).toLowerCase();
  const phone = sanitize(payload.phone);
  const company = sanitize(payload.company);
  const message = sanitize(payload.message);

  if (!name || !email || !message) {
    return { error: "Please fill in all required fields." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    return { error: "Please enter a valid phone number." };
  }
  if (message.length < 20) {
    return { error: "Please provide a little more project detail." };
  }

  return { name, email, phone, company, message };
}

async function notifyWebhook(payload) {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to send inquiry to configured webhook.");
  }
  return true;
}

async function notifyResend(payload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const receiverEmail =
    process.env.CONTACT_RECEIVER_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const senderEmail = process.env.CONTACT_SENDER_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey || !receiverEmail) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [receiverEmail],
      subject: `New inquiry from ${payload.name}`,
      text: [
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Phone: ${payload.phone}`,
        `Company: ${payload.company || "Not provided"}`,
        "",
        "Message:",
        payload.message,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send inquiry email through Resend.");
  }
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = validatePayload(body);
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const payload = { id, timestamp, ...validated };

    // Store a structured copy for operational fallback even if external delivery is unavailable.
    await appendFile("/tmp/olentra-contact-leads.ndjson", `${JSON.stringify(payload)}\n`);

    const webhookSent = await notifyWebhook(payload);
    const resendSent = webhookSent ? true : await notifyResend(payload);

    return NextResponse.json(
      {
        success: true,
        id,
        delivery: webhookSent || resendSent ? "external-notified" : "stored-only",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "We could not submit your request at the moment. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
