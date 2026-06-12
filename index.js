const DEFAULT_ALLOWED_ORIGIN = "*";
const DEFAULT_EMAIL_TO = "akhil100@gmail.com";
const MAX_FIELD_LENGTH = 2000;

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function getCorsHeaders(request, env) {
  const configuredOrigin = env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get("Origin");

  if (configuredOrigin === "*") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }

  if (requestOrigin === configuredOrigin) {
    return {
      "Access-Control-Allow-Origin": configuredOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
  }

  return {};
}

function cleanField(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[char];
  });
}

async function readPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    contentType.includes("text/plain")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return {};
}

function buildEmail(payload) {
  const type = cleanField(payload.type || payload.event || "contact").toLowerCase();
  const source = cleanField(payload.source || "Website");
  const companyEmail = cleanField(payload.companyEmail || payload["Company Email"] || payload.userEmail);
  const firstName = cleanField(payload.firstName || payload["First Name"]);
  const lastName = cleanField(payload.lastName || payload["Last Name"]);
  const demoTiming = cleanField(payload.demoTiming || payload["Demo Timing"]);
  const message = cleanField(payload.message || payload.messageText);
  const page = cleanField(payload.page);

  const isDemo = type.includes("demo") || demoTiming;
  const subject = isDemo
    ? "NorCal AI Solutions demo request"
    : "NorCal AI Solutions contact request";

  const lines = [
    `Source: ${source}`,
    `Type: ${isDemo ? "Demo" : "Contact"}`,
    companyEmail ? `Company email: ${companyEmail}` : "",
    firstName || lastName ? `Name: ${[firstName, lastName].filter(Boolean).join(" ")}` : "",
    demoTiming ? `Demo timing: ${demoTiming}` : "",
    message ? `Message: ${message}` : "",
    page ? `Page: ${page}` : "",
    `Submitted: ${new Date().toISOString()}`,
  ].filter(Boolean);

  const htmlRows = lines
    .map((line) => {
      const [label, ...rest] = line.split(": ");
      return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(rest.join(": "))}</p>`;
    })
    .join("");

  return {
    subject,
    replyTo: companyEmail || undefined,
    text: lines.join("\n"),
    html: htmlRows,
  };
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    return jsonResponse({
      EMAIL_FROM: env.EMAIL_FROM || null,
      EMAIL_TO: env.EMAIL_TO || null,
      EMAIL_FROM_NAME: env.EMAIL_FROM_NAME || null
    });
  },
};
