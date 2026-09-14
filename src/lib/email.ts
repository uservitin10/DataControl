import nodemailer from "nodemailer";

export function resolveSmtpConfig(env: Record<string, string | undefined> = process.env) {
  const host = env.SMTP_HOST || env.GMAIL_HOST || "smtp.gmail.com";
  const port = Number(env.SMTP_PORT || env.GMAIL_PORT || 587) || 587;
  const secure = env.SMTP_SECURE === "true" || env.GMAIL_SECURE === "true" || false;
  const user = env.SMTP_USER || env.GMAIL_USER;
  const pass = env.SMTP_PASS || env.GMAIL_APP_PASSWORD;

  return {
    host,
    port,
    secure,
    requireTLS: true,
    auth: user && pass ? { user, pass } : undefined,
  };
}

function createTransport(config: ReturnType<typeof resolveSmtpConfig>) {
  return nodemailer.createTransport(config);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.GMAIL_USER || "no-reply@localhost";

  if (!process.env.GMAIL_USER && !process.env.SMTP_USER) {
    throw new Error("SMTP não configurado. Defina GMAIL_USER ou SMTP_USER no ambiente.");
  }

  if (!process.env.GMAIL_APP_PASSWORD && !process.env.SMTP_PASS) {
    throw new Error("Senha do SMTP não configurada. Defina GMAIL_APP_PASSWORD ou SMTP_PASS no ambiente.");
  }

  if (!resetUrl) {
    throw new Error("URL de recuperação inválida.");
  }

  const primaryConfig = resolveSmtpConfig();
  const primaryTransporter = createTransport(primaryConfig);

  try {
    return await primaryTransporter.sendMail({
      from,
      to,
      subject: "Redefinição de senha — Horús",
      html: `
        <p>Você solicitou a redefinição de senha no Horús.</p>
        <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
        <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
      `,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("ETIMEDOUT") || message.includes("Timeout");
    const isGmail = primaryConfig.host.includes("gmail.com") || primaryConfig.host.includes("google.com");

    if (isTimeout && primaryConfig.port === 587 && isGmail) {
      const fallbackConfig = { ...primaryConfig, port: 465, secure: true, requireTLS: false };
      const fallbackTransporter = createTransport(fallbackConfig);

      try {
        return await fallbackTransporter.sendMail({
          from,
          to,
          subject: "Redefinição de senha — Horús",
          html: `
            <p>Você solicitou a redefinição de senha no Horús.</p>
            <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
            <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
          `,
        });
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Falha ao enviar e-mail de recuperação (tentativa fallback 465/SSL): ${fallbackMessage}. Verifique as credenciais SMTP e se a porta 465 está acessível.`);
      }
    }

    throw new Error(`Falha ao enviar e-mail de recuperação: ${message}. Verifique as credenciais SMTP e se o servidor consegue acessar a porta 587.`);
  }
}
