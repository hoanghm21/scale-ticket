import { v4 as uuidv4 } from "uuid";
import pino from "pino";

const logger = pino({ name: "stripe-mock" });

export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: "requires_payment_method" | "succeeded";
}

/**
 * MockStripeDriver simulates the network conditions and payload structures
 * of the actual Stripe Node SDK.
 */
export class MockStripeDriver {
  
  /**
   * Generates a fake payment intent.
   * Simulates a heavy network delay associated with bank validations.
   */
  static async createPaymentIntent(
    amountCents: number,
    currency: string = "usd"
  ): Promise<StripePaymentIntent> {
    logger.info({ amountCents, currency }, "Generating Mock Payment Intent...");

    // Simulate 1.5 second network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const intentId = `pi_${uuidv4().replace(/-/g, "").substring(0, 24)}`;
    const secret = `${intentId}_secret_${uuidv4().replace(/-/g, "")}`;

    logger.info({ intentId }, "Mock Payment Intent successfully generated");

    return {
      id: intentId,
      client_secret: secret,
      amount: amountCents,
      currency,
      status: "requires_payment_method",
    };
  }
}
