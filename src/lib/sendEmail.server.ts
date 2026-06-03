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
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

    if (!user || !pass) {
      throw new Error(
        "Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Render environment variables.",
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

    try {
      await transporter.sendMail({
        from: `Ganesh Kale <${user}>`,
        to: data.to.join(", "),
        subject: data.subject,
        text: data.body,
        attachments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("535-5.7.8") || message.includes("Invalid login")) {
        throw new Error(
          "Gmail rejected the login. Use a Gmail App Password generated for the same GMAIL_USER account, not your normal Gmail password.",
        );
      }
      throw error;
    }

    return { success: true };
  });
