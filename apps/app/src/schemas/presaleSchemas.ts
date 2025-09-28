import { z } from "zod";

export const presaleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  supply: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Supply must be a non-negative number",
  }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
  hardCap: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Hard Cap must be a positive number",
  }),
  softCap: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Soft Cap must be a non-negative number",
  }),
  softCapPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Soft Cap Price must be a non-negative number",
  }),
  startTime: z.string().min(1, "Start Time is required"),
  endTime: z.string().optional(),
  noTimeLimit: z.boolean().optional(),
  hasSoftCap: z.boolean().optional(), // Added hasSoftCap
}).superRefine((data, ctx) => {
  // If noTimeLimit is false, then endTime is required
  if (!data.noTimeLimit && !data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End Time is required unless 'No time limit' is selected.",
      path: ["endTime"],
    });
  }
  
  // If Soft Cap is enabled, noTimeLimit must be false and endTime must be provided
  if (data.hasSoftCap && data.noTimeLimit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "If Soft Cap is enabled, a time limit must be set (No time limit cannot be checked).",
      path: ["noTimeLimit"],
    });
  }
  
  if (data.hasSoftCap && !data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "When Soft Cap is enabled, End Time is required.",
      path: ["endTime"],
    });
  }
  
  if (data.hasSoftCap && Number(data.softCapPrice) < Number(data.price)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Soft Cap Price must be greater than or equal to the regular price.",
      path: ["softCapPrice"],
    });
  }
});

export type PresaleFormData = z.infer<typeof presaleSchema>;