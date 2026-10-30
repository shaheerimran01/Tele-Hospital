// Sends OTP codes through Meta's WhatsApp Cloud API (template messages).
//
// .env:
//   WHATSAPP_TOKEN                     access token (System User token for production)
//   WHATSAPP_PHONE_NUMBER_ID           sender phone number id
//   WHATSAPP_API_VERSION               default v18.0
//   WHATSAPP_TEMPLATE_NAME             approved template, e.g. "tabibistan_otp" (Authentication category)
//   WHATSAPP_TEMPLATE_LANGUAGE         default en_US
//   WHATSAPP_TEMPLATE_CODE_BUTTON      true (default) for Authentication templates with a
//                                      "Copy code" button; false for a body-only {{1}} template
//
// "hello_world" has no {{1}} variable, so it can't carry the code: it only proves
// that the number and token work (see OtpService for how that case is handled).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { maskPhone } from '../otp/phone.js';

export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    /** Meta error code, e.g. 131026 (not a WhatsApp number), 190 (token expired) */
    readonly metaCode: number | null,
    /** the recipient can fix it (wrong number) vs. our setup is broken */
    readonly recipientProblem: boolean,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

/** Meta error codes caused by the recipient number rather than our configuration */
const RECIPIENT_ERRORS = new Set([131026]);

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger('WhatsApp');

  get enabled() {
    return /^(1|true|yes|on)$/i.test(process.env.ENABLE_WHATSAPP_OTP ?? '');
  }

  get templateName() {
    return process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'hello_world';
  }

  /** false for templates without a {{1}} variable (hello_world) */
  get templateCarriesCode() {
    return this.templateName !== 'hello_world';
  }

  private get configured() {
    return Boolean(process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('ENABLE_WHATSAPP_OTP is off: OTP codes are printed in this console instead of being sent.');
      return;
    }
    if (!this.configured) {
      this.logger.error('ENABLE_WHATSAPP_OTP is on but WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing. OTP requests will fail.');
      return;
    }
    this.logger.log(
      `WhatsApp OTP on: sender ${process.env.WHATSAPP_PHONE_NUMBER_ID}, template "${this.templateName}" (${this.language}), API ${this.apiVersion}.`,
    );
    if (!this.templateCarriesCode) {
      this.logger.warn(
        'Template "hello_world" has no {{1}} variable, so the OTP code is NOT in the WhatsApp message. ' +
          'Create an Authentication template in WhatsApp Manager and set WHATSAPP_TEMPLATE_NAME to it.',
      );
    }
  }

  private get apiVersion() {
    return process.env.WHATSAPP_API_VERSION?.trim() || 'v18.0';
  }

  private get language() {
    return process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_US';
  }

  /** The template "components" that put the code into the message */
  private components(code: string) {
    if (!this.templateCarriesCode) return undefined;
    if (this.templateName === 'jaspers_market_order_confirmation_v1') {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Tabibistan User' },
            { type: 'text', text: code },
            { type: 'text', text: today },
          ],
        },
      ];
    }
    const components: Record<string, unknown>[] = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];
    // Authentication templates with a "Copy code" button need the code on the button too
    if (!/^(0|false|no|off)$/i.test(process.env.WHATSAPP_TEMPLATE_CODE_BUTTON ?? 'true')) {
      components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
    }
    return components;
  }

  /**
   * Sends the OTP template to `to` ("923001234567"). Resolves with the WhatsApp
   * message id; throws WhatsAppSendError (never includes the token or the code).
   */
  async sendOtp(to: string, code: string): Promise<string | null> {
    if (!this.configured) {
      throw new WhatsAppSendError('WhatsApp is not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).', null, false);
    }
    const url = `https://graph.facebook.com/${this.apiVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID!.trim()}/messages`;
    const components = this.components(code);
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: this.language },
        ...(components ? { components } : {}),
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const reason = (err as Error)?.name === 'TimeoutError' ? 'timed out' : (err as Error)?.message || 'network error';
      this.logger.error(`Send to ${maskPhone(to)} failed: ${reason}`);
      throw new WhatsAppSendError(`WhatsApp request failed (${reason}).`, null, false);
    }

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { code?: number; message?: string; error_data?: { details?: string }; fbtrace_id?: string };
    };
    if (!res.ok || data.error) {
      const e = data.error ?? {};
      const metaCode = typeof e.code === 'number' ? e.code : null;
      this.logger.error(
        `Send to ${maskPhone(to)} failed: HTTP ${res.status}, Meta error ${metaCode ?? '?'}: ${e.message ?? 'unknown'}` +
          `${e.error_data?.details ? ` (${e.error_data.details})` : ''}${e.fbtrace_id ? ` [fbtrace ${e.fbtrace_id}]` : ''}` +
          hint(metaCode),
      );
      throw new WhatsAppSendError(e.message || `WhatsApp API error (HTTP ${res.status}).`, metaCode, metaCode !== null && RECIPIENT_ERRORS.has(metaCode));
    }

    const id = data.messages?.[0]?.id ?? null;
    this.logger.log(`OTP template sent to ${maskPhone(to)}${id ? ` (message ${id})` : ''}.`);
    return id;
  }
}

/** What to do about common Meta errors (server log only) */
function hint(code: number | null): string {
  switch (code) {
    case 190:
      return ' -> The access token is invalid or expired. Create a permanent System User token and update WHATSAPP_TOKEN.';
    case 131030:
      return ' -> The recipient is not on the allowed list of the test number. Add it in WhatsApp Manager > API Setup, or use a live business number.';
    case 132001:
      return ' -> Template name or language not found. Check WHATSAPP_TEMPLATE_NAME / WHATSAPP_TEMPLATE_LANGUAGE.';
    case 132000:
      return ' -> Template parameter count mismatch. Set WHATSAPP_TEMPLATE_CODE_BUTTON to match the template (true when it has a Copy code button).';
    case 131026:
      return ' -> This number cannot receive WhatsApp messages.';
    default:
      return '';
  }
}
