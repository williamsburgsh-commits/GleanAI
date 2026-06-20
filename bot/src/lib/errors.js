// Wraps a Supabase result ({ data, error }) and throws a tidy error on failure.
export function unwrap(result, context) {
  const { data, error } = result;
  if (error) {
    const err = new Error(`Supabase error (${context}): ${error.message}`);
    err.cause = error;
    throw err;
  }
  return data;
}

// Generic guard for any async handler so a thrown error never crashes the bot
// and the user always gets a friendly message.
export function safeHandler(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error('[handler error]', err);
      try {
        await ctx.reply(
          'Something went wrong on our end. Please try again in a moment.'
        );
      } catch (replyErr) {
        console.error('[handler error] failed to send error reply', replyErr);
      }
    }
  };
}
