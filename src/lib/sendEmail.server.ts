import { createServerFn } from "@tanstack/react-start";

export const sendEmailFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return data as {
      to: string[];
      subject: string;
      body: string;
      resumeData?: string;
      resumeName?: string;
      resumeMimeType?: string;
    };
  })
  .handler(async ({ data }) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error(
        "Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Replit Secrets.",
      );
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const attachments: any[] = [];
    if (data.resumeData && data.resumeName) {
      attachments.push({
        filename: data.resumeName,
        content: Buffer.from(data.resumeData, "base64"),
        contentType: data.resumeMimeType ?? "application/octet-stream",
      });
    }

    await transporter.sendMail({
      from: `Ganesh Kale <${user}>`,
      to: data.to.join(", "),
      subject: data.subject,
      text: data.body,
      attachments,
    });

    return { success: true };
  });
