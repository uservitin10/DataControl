import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    to,
    subject: "Redefinição de senha — Horús",
    html: `
      <p>Você solicitou a redefinição de senha no Horús.</p>
      <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
      <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
    `,
  });
}
