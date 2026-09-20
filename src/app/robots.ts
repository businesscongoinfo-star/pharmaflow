import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/admin/",
        "/super-admin/",
        "/agent/",
        "/caisse/",
        "/pharmacien/",
        "/employe/",
        "/employee/",
        "/api/",
      ],
    },
    sitemap: "https://pharmaflow.africa/sitemap.xml",
  };
}