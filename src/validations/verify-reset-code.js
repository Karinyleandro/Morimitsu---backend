export const verifyResetCodeSchema = z.object({
  code: z.string().min(5).max(5), 
});
