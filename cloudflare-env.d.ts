declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MODERATOR_EMAILS?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_VERIFY_SERVICE_SID?: string;
    TWILIO_VERIFY_ENABLED?: string;
    TWILIO_VERIFY_TOTAL_SEND_LIMIT?: string;
  }
}
