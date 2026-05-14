import nodemailer, { Transporter } from "nodemailer";

let transporterPromise: Promise<Transporter> | null = null;

async function buildTransporter(): Promise<Transporter> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }

  const test = await nodemailer.createTestAccount();
  console.log(`[mailer] SMTP_HOST not set; using Ethereal test account: ${test.user}`);
  return nodemailer.createTransport({
    host: test.smtp.host,
    port: test.smtp.port,
    secure: test.smtp.secure,
    auth: { user: test.user, pass: test.pass },
  });
}

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) transporterPromise = buildTransporter();
  return transporterPromise;
}

export interface PurchaseEmailInput {
  email: string;
  firstName?: string;
  eventTitle: string;
  ticketId: string;
  seats?: number | string;
}

export async function sendPurchaseEmail(input: PurchaseEmailInput): Promise<{ messageId: string; previewUrl?: string }> {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || "ScaleTicket <no-reply@scaleticket.local>";

  const greeting = `Hi ${input.firstName || "Customer"},`;
  const seatsLine = input.seats !== undefined ? `<p><strong>Seats:</strong> ${input.seats}</p>` : "";

  const info = await transporter.sendMail({
    from,
    to: input.email,
    subject: `Your Tickets for ${input.eventTitle}!`,
    text: `${greeting}\n\nYour purchase was successful.\nTicket ID: ${input.ticketId}\n${input.seats !== undefined ? `Seats: ${input.seats}\n` : ""}`,
    html: `
      <p>${greeting}</p>
      <p>Your purchase was successful.</p>
      <p><strong>Event:</strong> ${input.eventTitle}</p>
      <p><strong>Ticket ID:</strong> ${input.ticketId}</p>
      ${seatsLine}
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  return { messageId: info.messageId, previewUrl };
}
