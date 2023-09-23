import * as z from "zod";

export const ButterflyValidation = z.object({
  butterfly: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  butterfly: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
});
