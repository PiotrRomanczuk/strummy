import transporter, { MAIL_FROM, MAIL_REPLY_TO } from './smtp-client';
import {
  generateLessonReminderHtml,
  LessonReminderData as TemplateData,
} from './templates/lesson-reminder';
import { logger } from '@/lib/logger';

export interface LessonReminderEmailData extends TemplateData {
  studentEmail: string;
}

export async function sendLessonReminderEmail(data: LessonReminderEmailData) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    logger.warn('GMAIL_USER or GMAIL_APP_PASSWORD is not set. Skipping email sending.');
    return { error: { message: 'SMTP credentials missing' } };
  }

  const { studentEmail, lessonDate, lessonTime } = data;

  const subject = `Reminder: Guitar Lesson on ${lessonDate} at ${lessonTime}`;
  const html = generateLessonReminderHtml(data);

  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      replyTo: MAIL_REPLY_TO,
      to: studentEmail,
      subject: subject,
      html: html,
    });

    return { data: { id: info.messageId }, error: null };
  } catch (error) {
    logger.error('EXCEPTION sending email:', error);
    return { data: null, error: error };
  }
}
