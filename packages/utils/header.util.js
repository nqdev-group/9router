/**
 * Get page information based on the pathname.
 * @param {*} pathname - The current pathname of the page.
 * @returns { title: string, description: string, icon: string, breadcrumbs: [{ label: string, href: string }] } The page information including title, description, icon, and breadcrumbs.
 */
export const getPageInfoUtil = (pathname) => {
  // /token-saver-report
  if (pathname.includes("/token-saver-report"))
    return {
      title: "Token Saver Report",
      description: "Analyze token usage and optimize costs with actionable insights and recommendations to reduce token consumption and save money.",
      icon: "savings",
      breadcrumbs: [{
        label: "Token Saver Report",
        href: "/dashboard/token-saver-report",
      }],
    };
  // /rtk-engine
  if (pathname.includes("/rtk-engine"))
    return {
      title: "RTK Engine",
      description: "Real-time token-level processing engine for advanced request manipulation, dynamic response generation, and enhanced control over your AI interactions.",
      icon: "bolt",
      breadcrumbs: [],
    };
  // /caveman-engine
  if (pathname.includes("/caveman-engine"))
    return {
      title: "Caveman Engine",
      description: "A powerful engine for processing and analyzing data with advanced algorithms and techniques.",
      icon: "caveman",
      breadcrumbs: [],
    };
  // /cmem-engine
  if (pathname.includes("/cmem-engine"))
    return {
      title: "CMEM Engine",
      description: "Contextual Memory Engine for enhanced data processing and analysis with advanced algorithms and techniques.",
      icon: "memory",
      breadcrumbs: [],
    };
  // /response-cache
  if (pathname.includes("/response-cache"))
    return {
      title: "Response Cache",
      description: "Manage cached API responses to optimize performance and reduce latency.",
      icon: "memory",
      breadcrumbs: [],
    };
  return { title: "", description: "", icon: "", breadcrumbs: [] };
};
