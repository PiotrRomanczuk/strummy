import {
  generateBaseEmailHtml,
  createCardSection,
  createDetailRow,
  createStatusBadge,
  createDivider,
  createGreeting,
  createSectionHeading,
  createSubsectionHeading,
  createParagraph,
  createKicker,
  createStatRow,
  createListBox,
  createCodeBlock,
  createCertificateCard,
  createCtaButton,
} from '../base-template';

describe('base-template (v2 editorial letterpress)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('generateBaseEmailHtml', () => {
    it('should generate a complete email with all sections', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test Email',
        preheader: 'This is a test email',
        bodyContent: '<p>Hello World</p>',
        footerNote: 'Keep practicing!',
        recipientEmail: 'test@example.com',
        notificationType: 'lesson_reminder_24h',
        ctaButton: {
          text: 'View Lesson',
          url: 'https://example.com/lessons/123',
        },
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Email');
      expect(html).toContain('This is a test email');
      expect(html).toContain('Hello World');
      expect(html).toContain('Keep practicing!');
      expect(html).toContain('View Lesson');
      expect(html).toContain('https://example.com/lessons/123');
      expect(html).toContain('Strummy');
      expect(html).toContain('Guitar Student Management');
    });

    it('should generate email without optional fields', () => {
      const html = generateBaseEmailHtml({
        subject: 'Simple Email',
        bodyContent: '<p>Simple content</p>',
      });

      expect(html).toContain('Simple Email');
      expect(html).toContain('Simple content');
      expect(html).toContain('Strummy');
      expect(html).not.toContain('Keep practicing!');
      expect(html).not.toContain('View Lesson');
    });

    it('should include unsubscribe link', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
        recipientEmail: 'user@example.com',
        notificationType: 'lesson_reminder_24h',
      });

      expect(html).toContain('Notification Settings');
      expect(html).toContain('/dashboard/settings');
    });

    it('should include dark mode CSS', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
      });

      expect(html).toContain('@media (prefers-color-scheme: dark)');
      expect(html).toContain('meta name="color-scheme"');
    });

    it('should include mobile responsive CSS', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
      });

      expect(html).toContain('@media only screen and (max-width: 620px)');
    });

    it('should include current year in copyright', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
      });

      const currentYear = new Date().getFullYear();
      expect(html).toContain(`${currentYear} Strummy`);
    });

    it('should default to the gold "default" tone', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
        ctaButton: { text: 'Click', url: 'https://example.com' },
      });

      // Tone rule + CTA border both use the default gold accent
      expect(html).toContain('background-color: #b68235');
      expect(html).toContain('border: 1px solid #8a5f24');
      // Georgia serif wordmark on the dark colophon header
      expect(html).toContain('font-style: italic');
      expect(html).toContain('background-color: #1a1712');
      expect(html).toContain('color: #c99a52');
    });

    it('should switch the tone rule and CTA to the urgent palette', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
        tone: 'urgent',
        ctaButton: { text: 'Resolve', url: 'https://example.com' },
      });

      expect(html).toContain('background-color: #a03d31');
      expect(html).toContain('border: 1px solid #a03d31');
    });

    it('should include dark mode badge overrides', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test',
        bodyContent: '<p>Test</p>',
      });

      expect(html).toContain('.badge-success');
      expect(html).toContain('.badge-warning');
      expect(html).toContain('.badge-info');
      expect(html).toContain('.badge-urgent');
      expect(html).toContain('.badge-default');
    });
  });

  describe('createCardSection', () => {
    it('should create a card with content', () => {
      const card = createCardSection('<p>Card content</p>');

      expect(card).toContain('class="card"');
      expect(card).toContain('Card content');
      expect(card).toContain('border-radius: 4px');
      expect(card).toContain('#e2dfda');
    });
  });

  describe('createDetailRow', () => {
    it('should create a label-value pair', () => {
      const row = createDetailRow('Date', 'February 10, 2026');

      expect(row).toContain('Date');
      expect(row).toContain('February 10, 2026');
      expect(row).toContain('text-transform: uppercase');
      expect(row).toContain('#85806f');
      expect(row).toContain('#201f1d');
    });
  });

  describe('createStatusBadge', () => {
    it('should create a translucent success badge', () => {
      const badge = createStatusBadge('Completed', 'success');

      expect(badge).toContain('Completed');
      expect(badge).toContain('#e7efe4');
      expect(badge).toContain('#3d6b40');
      expect(badge).toContain('badge-success');
    });

    it('should create a translucent warning badge', () => {
      const badge = createStatusBadge('Pending', 'warning');

      expect(badge).toContain('Pending');
      expect(badge).toContain('#f7ecd8');
      expect(badge).toContain('#8a5f24');
      expect(badge).toContain('badge-warning');
    });

    it('should create a distinct info badge (not the warning color)', () => {
      const badge = createStatusBadge('New', 'info');

      expect(badge).toContain('New');
      expect(badge).toContain('#e4e9ef');
      expect(badge).toContain('#44586e');
      expect(badge).toContain('badge-info');
    });

    it('should create a distinct urgent badge', () => {
      const badge = createStatusBadge('Overdue', 'urgent');

      expect(badge).toContain('Overdue');
      expect(badge).toContain('#f6e4e1');
      expect(badge).toContain('#a03d31');
      expect(badge).toContain('badge-urgent');
    });

    it('should create a warm default badge', () => {
      const badge = createStatusBadge('Unknown');

      expect(badge).toContain('Unknown');
      expect(badge).toContain('#ecebe7');
      expect(badge).toContain('#6d675e');
      expect(badge).toContain('badge-default');
    });
  });

  describe('createDivider', () => {
    it('should create a hairline divider', () => {
      const divider = createDivider();

      expect(divider).toContain('<hr');
      expect(divider).toContain('border-top: 1px solid #e2dfda');
    });
  });

  describe('createGreeting', () => {
    it('should create a "Dear" greeting with name', () => {
      const greeting = createGreeting('John');

      expect(greeting).toContain('Dear John,');
      expect(greeting).toContain('<p');
      expect(greeting).toContain('#4f4b45');
    });
  });

  describe('createSectionHeading', () => {
    it('should create a section heading', () => {
      const heading = createSectionHeading('Lesson Details');

      expect(heading).toContain('Lesson Details');
      expect(heading).toContain('<h2');
      expect(heading).toContain('font-size: 25px');
      expect(heading).toContain('#201f1d');
    });
  });

  describe('createSubsectionHeading', () => {
    it('should create a subsection heading', () => {
      const heading = createSubsectionHeading('Songs Practiced');

      expect(heading).toContain('Songs Practiced');
      expect(heading).toContain('<h3');
      expect(heading).toContain('font-size: 17px');
      expect(heading).toContain('#201f1d');
    });
  });

  describe('createParagraph', () => {
    it('should create a paragraph', () => {
      const paragraph = createParagraph('This is a test paragraph.');

      expect(paragraph).toContain('This is a test paragraph.');
      expect(paragraph).toContain('<p');
      expect(paragraph).toContain('line-height: 1.65');
      expect(paragraph).toContain('#4f4b45');
    });
  });

  describe('createKicker', () => {
    it('should default to the gold accent', () => {
      const kicker = createKicker('Lessons');

      expect(kicker).toContain('Lessons');
      expect(kicker).toContain('#8a5f24');
      expect(kicker).toContain('kicker"');
    });

    it('should switch to the urgent red for tone urgent', () => {
      const kicker = createKicker('System Alert', 'urgent');

      expect(kicker).toContain('#a03d31');
      expect(kicker).toContain('kicker-urgent');
    });
  });

  describe('createStatRow', () => {
    it('should render two stat tiles side by side', () => {
      const row = createStatRow(
        { value: 14, label: 'Lessons completed' },
        { value: 2, label: 'New students' }
      );

      expect(row).toContain('14');
      expect(row).toContain('Lessons completed');
      expect(row).toContain('2');
      expect(row).toContain('New students');
      expect(row).toContain('width: 50%');
    });
  });

  describe('createListBox', () => {
    it('should render a titled list with count and rows', () => {
      const box = createListBox(
        'Songs mastered',
        2,
        [
          { text: 'Emma mastered "Blackbird"', subtext: 'August 1, 2026' },
          { text: 'Leo mastered "Wonderwall"' },
        ],
        'success'
      );

      expect(box).toContain('Songs mastered');
      expect(box).toContain('&middot;&nbsp; 2');
      expect(box).toContain('Emma mastered "Blackbird"');
      expect(box).toContain('August 1, 2026');
      expect(box).toContain('#3d6b40'); // success title color
    });
  });

  describe('createCodeBlock', () => {
    it('should render a monospace block with a tone-colored left rule', () => {
      const block = createCodeBlock('Error: something broke', 'urgent');

      expect(block).toContain('Error: something broke');
      expect(block).toContain("'Courier New'");
      expect(block).toContain('border-left: 3px solid #a03d31');
    });
  });

  describe('createCertificateCard', () => {
    it('should render a framed achievement card', () => {
      const card = createCertificateCard({
        kicker: 'Song Mastered',
        title: 'Blackbird',
        subtitle: 'by The Beatles',
        dateLabel: 'Mastered on August 1, 2026',
        badgeText: 'No. 12 in your repertoire',
      });

      expect(card).toContain('Song Mastered');
      expect(card).toContain('Blackbird');
      expect(card).toContain('by The Beatles');
      expect(card).toContain('Mastered on August 1, 2026');
      expect(card).toContain('No. 12 in your repertoire');
      expect(card).toContain('border: 1px solid #b68235');
    });
  });

  describe('createCtaButton', () => {
    it('should render a bulletproof outlined button using default tone', () => {
      const button = createCtaButton('View Dashboard', 'https://example.com/dashboard');

      expect(button).toContain('View Dashboard');
      expect(button).toContain('https://example.com/dashboard');
      expect(button).toContain('display: block');
      expect(button).toContain('#8a5f24');
    });

    it('should switch outline/text color for urgent tone', () => {
      const button = createCtaButton('Resolve Conflict', 'https://example.com', 'urgent');

      expect(button).toContain('#a03d31');
    });
  });

  describe('composed email', () => {
    it('should assemble a full email from the building blocks without throwing', () => {
      const html = generateBaseEmailHtml({
        subject: 'Test Notification',
        preheader: 'You have a new notification',
        bodyContent: `
          ${createKicker('Lessons')}
          ${createSectionHeading('Important Update')}
          ${createGreeting('John Student')}
          ${createParagraph('This is an important notification about your account.')}
          ${createCardSection(
            createDetailRow('Date', 'February 10, 2026') +
              createDetailRow('Status', createStatusBadge('Active', 'success'))
          )}
        `,
        footerNote: 'Thank you for using Strummy!',
        ctaButton: {
          text: 'View Details',
          url: 'https://example.com/dashboard',
        },
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('Important Update');
      expect(html).toContain('Dear John Student,');
      expect(html).toContain('February 10, 2026');
      expect(html).toContain('Thank you for using Strummy!');
      expect(html).toContain('View Details');
    });
  });
});
