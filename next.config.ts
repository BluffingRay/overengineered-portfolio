import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom sits in Next's DEFAULT serverExternalPackages list, so it ships
  // un-bundled and the deployed function require()s it at request time —
  // where whatwg-url's require() of the ESM-only @exodus/bytes crashes
  // on Vercel even with engines.node 24.x. Listing jsdom here removes it
  // from that default external list, so the whole tree (jsdom, whatwg-url,
  // @exodus/bytes) is bundled into the server chunks and the runtime
  // require(esm) never happens. whatwg-url and @exodus/bytes are listed
  // too in case a future Next adds them to the default external list.
  transpilePackages: ["jsdom", "whatwg-url", "@exodus/bytes"],
};

export default nextConfig;
