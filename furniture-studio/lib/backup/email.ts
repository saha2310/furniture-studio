// Часть модуля lib/backup/ — см. lib/backup/README.md, если задача не про бэкапы, сюда не нужно.
import 'server-only';
import { Resend } from 'resend';

/** Отправляет готовый zip вложением на почту. Используется только автобэкапом по расписанию. */
export async function sendBackupEmail(buffer: Buffer, filename: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BACKUP_EMAIL_TO;
  const from = process.env.BACKUP_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    throw new Error(
      'Для автобэкапа на почту нужны переменные окружения RESEND_API_KEY, BACKUP_EMAIL_TO и BACKUP_EMAIL_FROM (см. .env.example).'
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Резервная копия сайта — ${new Date().toLocaleDateString('ru-RU')}`,
    text: 'Еженедельная автоматическая резервная копия каталога и настроек сайта во вложении.',
    attachments: [{ filename, content: buffer }],
  });

  if (error) throw new Error(`Resend не смог отправить письмо с бэкапом: ${error.message}`);
}
