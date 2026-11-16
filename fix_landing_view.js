const fs = require('fs');
let code = fs.readFileSync('src/components/Landing/PublicLandingView.tsx', 'utf8');

const targetResolve = `function resolveCategoryFromSubpath(cats: string[], subPath?: string): string {
  if (!subPath) return cats[0] || "";`;
const replacementResolve = `function resolveCategoryFromSubpath(cats: string[], subPath?: string, storefrontAlias?: string): string {
  if (!subPath) return cats[0] || "";
  let actualSubpath = subPath;
  if (storefrontAlias && subPath.startsWith(storefrontAlias)) {
    const withoutStore = subPath.substring(storefrontAlias.length);
    if (withoutStore.startsWith("/")) {
      actualSubpath = withoutStore.substring(1);
    } else {
      actualSubpath = "";
    }
  }
  if (!actualSubpath) return cats[0] || "";
`;
code = code.replace(targetResolve, replacementResolve);

const targetUpdateUrl = `function updateUrlSubpath(category: string, aliasOrId: string) {
  if (!aliasOrId) return;
  const sub = categoryToSubpath(category);
  const isCPath = window.location.pathname.startsWith("/c/");
  const newPath = isCPath ? \`/c/\${aliasOrId}/\${sub}\` : \`/\${aliasOrId}/\${sub}\`;
  if (window.location.pathname !== newPath) {
    window.history.pushState({ category }, "", newPath);
  }
}`;
const replacementUpdateUrl = `function updateUrlSubpath(category: string, companySlug: string, storefrontAlias?: string) {
  if (!companySlug) return;
  const sub = categoryToSubpath(category);
  const isCPath = window.location.pathname.startsWith("/c/");
  
  let newPath = isCPath ? \`/c/\${companySlug}\` : \`/\${companySlug}\`;
  if (storefrontAlias) {
    newPath += \`/\${storefrontAlias}\`;
  }
  if (sub && sub !== "catalog") {
    newPath += \`/\${sub}\`;
  }
  
  if (window.location.pathname !== newPath) {
    window.history.pushState({ category }, "", newPath);
  }
}`;
code = code.replace(targetUpdateUrl, replacementUpdateUrl);

code = code.replace(/updateUrlSubpath\(([^,]+),\s*aliasOrId\)/g, 'updateUrlSubpath($1, aliasOrId, generalSettings?.landingPage?.alias || "")');
code = code.replace(/resolveCategoryFromSubpath\(cats,\s*initialSubPath\)/g, 'resolveCategoryFromSubpath(cats, initialSubPath, data?.generalSettings?.landingPage?.alias || "")');

fs.writeFileSync('src/components/Landing/PublicLandingView.tsx', code);
console.log("Updated PublicLandingView.tsx");
