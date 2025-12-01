import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type ParticipantEmailContext = {
  to: string;
  recipientName?: string | null;
  jamId?: string | null;
  jamUrl?: string | null;
  jamName: string;
  jamStartsAt?: string | null;
  jamLocation?: string | null;
};

type CustomEmailContext = {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  previewText?: string;
  replyTo?: string | null;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly enabled: boolean;
  private readonly frontendBaseUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const rawFromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') || '';
    this.fromEmail = this.normalizeFromEmail(rawFromEmail);
    this.frontendBaseUrl =
      this.configService.get<string>('FRONTEND_BASE_URL') || null;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not configured. Email delivery is disabled.',
      );
      this.resend = null;
      this.enabled = false;
      return;
    }

    if (!this.fromEmail) {
      this.logger.warn(
        'RESEND_FROM_EMAIL is not configured. Email delivery is disabled',
      );
    }

    this.resend = new Resend(apiKey);
    this.enabled = Boolean(apiKey && this.fromEmail);
  }

  async sendParticipantConfirmationEmail(context: ParticipantEmailContext) {
    const { subject, html, text } =
      this.buildParticipantConfirmationEmail(context);
    await this.dispatchEmail({ ...context, subject, html, text });
  }

  async sendPromotionEmail(context: ParticipantEmailContext) {
    const { subject, html, text } = this.buildPromotionEmail(context);
    await this.dispatchEmail({ ...context, subject, html, text });
  }

  async sendRemovalEmail(context: ParticipantEmailContext) {
    const { subject, html, text } = this.buildRemovalEmail(context);
    await this.dispatchEmail({ ...context, subject, html, text });
  }

  async sendCustomEmail({
    to,
    subject,
    htmlContent,
    textContent,
    previewText,
    replyTo,
  }: CustomEmailContext) {
    const html = this.injectPreviewText(htmlContent, previewText);
    const text =
      textContent && textContent.trim().length > 0
        ? this.prependPreviewText(previewText, textContent)
        : this.buildPlainTextBody(htmlContent, previewText);

    await this.dispatchEmail({
      to,
      subject,
      html,
      text,
      replyTo: replyTo || undefined,
    });
  }

  private async dispatchEmail({
    to,
    subject,
    html,
    text,
    replyTo,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }) {
    if (!this.enabled || !this.resend) {
      this.logger.warn(
        `Skipped email "${subject}" because Resend is not configured.`,
      );
      return;
    }

    if (!to) {
      this.logger.warn(`Skipped email "${subject}" because recipient is empty.`);
      return;
    }

    try {
      const payload: Parameters<Resend['emails']['send']>[0] = {
        from: this.fromEmail,
        to,
        subject,
        html,
        text,
      };

      if (replyTo) {
        payload.replyTo = replyTo;
      }

      await this.resend.emails.send(payload);
    } catch (error) {
      this.logger.error(
        `Failed to send email "${subject}" to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private buildParticipantConfirmationEmail(
    context: ParticipantEmailContext,
  ): { subject: string; html: string; text: string } {
    const subject = `Iscrizione confermata: ${context.jamName}`;
    return this.buildBaseEmail({
      context,
      headline: 'Iscrizione confermata!',
      lead: `La tua partecipazione alla jam "${context.jamName}" è stata confermata.`,
      extra: [
        this.formatWhen(context.jamStartsAt),
        this.formatWhere(context.jamLocation),
        this.buildJamLink(context),
        'Se non puoi più partecipare, ricordati di cancellare la tua iscrizione così potremo liberare il posto.',
      ],
      closing: 'Ci vediamo presto!',
    }, subject);
  }

  private buildPromotionEmail(
    context: ParticipantEmailContext,
  ): { subject: string; html: string; text: string } {
    const subject = `Sei stato promosso per ${context.jamName}`;
    return this.buildBaseEmail({
      context,
      headline: 'Buone notizie!',
      lead: `Sei stato promosso dalla lista d’attesa e ora hai un posto confermato per "${context.jamName}".`,
      extra: [
        this.formatWhen(context.jamStartsAt),
        this.formatWhere(context.jamLocation),
        this.buildJamLink(context),
        'Se non puoi partecipare, per favore annulla la tua iscrizione così qualcun altro potrà subentrare.',
      ],
      closing: 'Divertiti alla jam!',
    }, subject);
  }

  private buildRemovalEmail(
    context: ParticipantEmailContext,
  ): { subject: string; html: string; text: string } {
    const subject = `Aggiornamento sulla jam ${context.jamName}`;
    return this.buildBaseEmail({
      context,
      headline: 'La tua iscrizione è stata aggiornata',
      lead: `Sei stato rimosso dalla lista partecipanti della jam "${context.jamName}".`,
      extra: [
        this.formatWhen(context.jamStartsAt),
        this.formatWhere(context.jamLocation),
        this.buildJamLink(context),
        'Per qualsiasi dubbio contatta gli organizzatori.',
      ],
      closing: 'Speriamo di vederti a una prossima jam!',
    }, subject);
  }

  private buildBaseEmail(
    {
      context,
      headline,
      lead,
      extra,
      closing,
    }: {
      context: ParticipantEmailContext;
      headline: string;
      lead: string;
      extra: Array<string | null>;
      closing: string;
    },
    subject: string,
  ): { subject: string; html: string; text: string } {
    const greeting = this.buildGreeting(context.recipientName);
    const filteredExtra = extra.filter((item): item is string => Boolean(item));

    const htmlParts = [
      `<p>${greeting}</p>`,
      `<h2>${headline}</h2>`,
      `<p>${lead}</p>`,
      ...filteredExtra.map(item => `<p>${item}</p>`),
      `<p>${closing}</p>`,
      '<p>Un abbraccio,<br/>Il team Jamia</p>',
    ];

    const textParts = [
      greeting,
      '',
      headline,
      lead,
      ...filteredExtra,
      '',
      closing,
      'Un abbraccio,',
      'Il team Jamia',
    ];

    return {
      subject,
      html: htmlParts.join('\n'),
      text: textParts.join('\n'),
    };
  }

  private injectPreviewText(html: string, previewText?: string): string {
    const trimmedPreview = previewText?.trim();
    if (!trimmedPreview) {
      return html;
    }

    const previewBlock = `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;">${trimmedPreview}</div>`;

    return `${previewBlock}${html}`;
  }

  private prependPreviewText(
    previewText: string | undefined,
    body: string,
  ): string {
    const trimmedPreview = previewText?.trim();
    const trimmedBody = body.trim();

    if (!trimmedPreview) {
      return trimmedBody;
    }

    return `${trimmedPreview}\n\n${trimmedBody}`.trim();
  }

  private buildPlainTextBody(html: string, previewText?: string): string {
    const withoutScripts = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

    const withLineBreaks = withoutScripts
      .replace(/<(br|BR)\s*\/?>/g, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n');

    const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '');

    const normalized = withoutTags.replace(/\n{3,}/g, '\n\n').trim();

    if (!normalized) {
      return this.prependPreviewText(previewText, '');
    }

    return this.prependPreviewText(previewText, normalized);
  }

  private buildGreeting(recipientName?: string | null): string {
    const name = recipientName?.trim();
    return name ? `Ciao ${name},` : 'Ciao,';
  }

  private formatWhen(dateIso?: string | null): string | null {
    if (!dateIso) {
      return null;
    }

    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const formatted = new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);

    return `Quando: ${formatted}`;
  }

  private formatWhere(location?: string | null): string | null {
    if (!location) {
      return null;
    }

    return `Dove: ${location}`;
  }

  private buildJamLink(context: ParticipantEmailContext): string | null {
    const url = context.jamUrl || this.resolveJamUrl(context.jamId);
    if (!url) {
      return null;
    }

    return `Dettagli jam: ${url}`;
  }

  private resolveJamUrl(jamId?: string | null): string | null {
    if (!jamId || !this.frontendBaseUrl) {
      return null;
    }

    const trimmedBase = this.frontendBaseUrl.replace(/\/+$/, '');
    return `${trimmedBase}/jams/${jamId}`;
  }

  /**
   * Normalizes the configured "from" email so it always matches
   * the format Resend expects: `email@example.com` or `Name <email@example.com>`.
   *
   * This is especially important in production where environment
   * variables are often written with surrounding quotes, e.g.:
   * RESEND_FROM_EMAIL="Jamia <noreply@notifications.jamia.app>"
   */
  private normalizeFromEmail(value: string): string {
    if (!value) {
      return '';
    }

    let normalized = value.trim();

    // Strip one level of surrounding single or double quotes, if present
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
    }

    return normalized;
  }
}
