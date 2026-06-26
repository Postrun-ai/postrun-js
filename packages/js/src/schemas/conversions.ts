/**
 * Hand-written conversion validators — layered on top of the GENERATED zod.
 *
 * The generated `zGoogleAdsConversionEvent` validates every FIELD (types, the
 * RFC-3339-with-offset timestamp, the currency length, etc.), but it can't carry
 * the API's CROSS-FIELD rules: OpenAPI has no way to express "at least one of
 * these optional fields," so the API's `.superRefine` / `.refine` are invisible to
 * codegen. We re-apply them here, importing the generated base (never copying it),
 * so this composes cleanly on top of every regeneration. The API remains the
 * server-side authority; this is the matching client-side check (zero round-trip).
 *
 * Mirrors `apps/api/lib/schemas/google/conversions.ts`:
 *  - each conversion needs ≥1 match signal (gclid / gbraid / wbraid / user_data);
 *  - each user_data identifier needs ≥1 of email / phone / address.
 */
import { zGoogleAdsConversionEvent } from '../client/zod.gen';

export const conversionEventSchema = zGoogleAdsConversionEvent.superRefine(
  (event, ctx) => {
    const hasMatchSignal =
      event.gclid != null ||
      event.gbraid != null ||
      event.wbraid != null ||
      (event.user_data != null && event.user_data.length > 0);

    if (!hasMatchSignal) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Each conversion needs at least one match signal: a gclid, gbraid, wbraid, or user_data.',
      });
    }

    event.user_data?.forEach((identifier, index) => {
      const hasIdentifier =
        identifier.email_address != null ||
        identifier.phone_number != null ||
        identifier.address != null;

      if (!hasIdentifier) {
        ctx.addIssue({
          code: 'custom',
          path: ['user_data', index],
          message: 'Provide an email_address, phone_number, or address.',
        });
      }
    });
  },
);
