import { defineNuxtModule, createResolver } from "@nuxt/kit";
import { join } from "node:path";

export default defineNuxtModule({
  meta: {
    name: "nav",
    configKey: "nav",
  },
  setup(options, nuxt) {
    if (process.env.NAV_ENABLED != "true") return;
    const resolver = createResolver(import.meta.url);
    const moduleDir = resolver.resolve(".");

    nuxt.hook("pages:extend", (pages) => {
      // Remove the host's home page route, replace with nav page
      for (let i = pages.length - 1; i >= 0; i--) {
        if (pages[i].path === "/") {
          pages.splice(i, 1);
        }
      }

      pages.unshift({
        name: "nav-home",
        path: "/",
        file: join(moduleDir, "app/pages/nav.vue"),
      });
    });
  },
});
