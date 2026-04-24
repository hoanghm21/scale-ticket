import { z } from "zod";

export const CartItemSchema = z.object({
  seatId: z.string().min(1),
  section: z.string().min(1),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  price: z.number().positive(),
});

export const CreateIntentSchema = z.object({
  body: z.object({
    eventId: z.string().uuid("Invalid Event ID"),
    cartItems: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  })
});

export type CreateIntentInput = z.infer<typeof CreateIntentSchema>["body"];
export type CartItem = z.infer<typeof CartItemSchema>;
