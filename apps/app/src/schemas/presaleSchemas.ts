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
  startTime: z.string().min(1, "Start Time is required"),
  endTime: z.string().optional(),
  noTimeLimit: z.boolean().optional(),
});

export type PresaleFormData = z.infer<typeof presaleSchema>;