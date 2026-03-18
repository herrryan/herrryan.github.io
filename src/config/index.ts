import type { SiteConfig, SiteContent } from "../types";

export const SITE_CONFIG: SiteConfig = {
  title: "Ryan Guo — Cloud Architect & AI Engineer",
  author: "Ryan Guo",
  description:
    "Cloud Architecture, AI Integrations, and Systems Engineering.",
  lang: "en",
  siteLogo: "/alejandro-small.jpg",
  navLinks: [
    { text: "Experience", href: "#experience" },
    { text: "Projects", href: "#projects" },
    { text: "About", href: "#about" },
  ],
  socialLinks: [
    { text: "Twitter", href: "https://twitter.com/herrryan" },
    { text: "Github", href: "https://github.com/herrryan" },
  ],
  socialImage: "/zen-og.png",
  canonicalURL: "https://herrryan.github.io",
};

export const SITE_CONTENT: SiteContent = {
  hero: {
    name: "Ryan Guo",
    specialty: "Cloud Architect & AI Engineer",
    summary:
      "Building tools and exploring systems. Currently focused on cloud architecture, AI integrations, and minimalist web experiences.",
    email: "hello@example.com",
  },
  experience: [
    {
      company: "Various Cloud Migrations",
      position: "Cloud Architect",
      startDate: "2020",
      endDate: "Present",
      summary: [
        "Led multiple large-scale enterprise migrations across GCP, Azure, and AWS.",
        "Architected secure, scalable infrastructure using Terraform and modern CI/CD pipelines.",
      ],
    },
    {
      company: "AI & Data Engineering",
      position: "Systems Engineer",
      startDate: "2021",
      endDate: "Present",
      summary: [
        "Developed GraphRAG knowledge extraction systems leveraging Mem0 and Neo4j.",
        "Built multi-agent simulations and optimized LLM reasoning pipelines.",
      ],
    }
  ],
  projects: [
    {
      name: "MiroFish",
      summary: "A multi-agent simulation and GraphRAG knowledge extraction system.",
      linkPreview: "https://github.com/herrryan/MiroFish",
      linkSource: "https://github.com/herrryan/MiroFish",
      image: "/spotifu.png",
    },
    {
      name: "Cloud Assessment CLI",
      summary: "Command line interface for evaluating cloud migration readiness.",
      linkPreview: "#",
      linkSource: "#",
      image: "/shopify-clon.png",
    }
  ],
  about: {
    description: `
      I am a systems engineer and architect focused on building robust cloud infrastructure and integrating advanced AI capabilities. I enjoy working at the intersection of data, scalable systems, and developer tools.

      My recent work involves deep-diving into GraphRAG, vector databases, and creating multi-agent ecosystems to solve complex information retrieval problems.
    `,
    image: "/alejandro-big.jpg",
  },
};

// #5755ff
