import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://herrryan.github.io",
    title: "Ryan Guo",
    description: "Cloud Architecture, AI Engineering, Systems Programming & Native macOS Tools.",
    author: "Ryan Guo",
    profile: "https://herrryan.github.io",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Europe/Zurich",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/herrryan/herrryan.github.io/edit/master/",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/herrryan" },
    { name: "x",        url: "https://x.com/herrryan" },
    { name: "mail",     url: "mailto:guofei89@gmail.com" },
  ],
  shareLinks: [
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});