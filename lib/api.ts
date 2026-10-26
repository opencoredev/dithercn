export const markdownResponse = (body: string, includeBody: boolean) => {
  const tokens = Math.ceil(body.length / 4);

  return new Response(includeBody ? body : null, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The same URLs serve HTML to browsers; caches must keep both.
      Vary: "Accept",
      "x-markdown-tokens": String(tokens),
    },
  });
};
