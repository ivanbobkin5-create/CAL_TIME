const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const [hostMappedAlias, setHostMappedAlias] = useState<string | null>(null);`;
const replacement1 = `  const [hostMappedAlias, setHostMappedAlias] = useState<{ companySlug: string, storefrontAlias: string } | null>(null);`;
code = code.replace(target1, replacement1);

const target2 = `          const data = await res.json();
          setHostMappedAlias(data.alias || data.id);`;
const replacement2 = `          const data = await res.json();
          if (data.companySlug) {
            setHostMappedAlias({ companySlug: data.companySlug, storefrontAlias: data.storefrontAlias || "catalog" });
          }`;
code = code.replace(target2, replacement2);

const target3 = `  // Handle custom domain at root OR any sub-path
  if (hostMappedAlias) {
    const subPath = currentPath === "/" ? "" : currentPath.substring(1);
    return <PublicLandingView aliasOrId={hostMappedAlias} initialSubPath={subPath} />;
  }`;
const replacement3 = `  // Handle custom domain at root OR any sub-path
  if (hostMappedAlias) {
    let subPath = currentPath === "/" ? "" : currentPath.substring(1);
    if (!subPath) {
      subPath = hostMappedAlias.storefrontAlias;
    } else if (!subPath.startsWith(hostMappedAlias.storefrontAlias)) {
      subPath = hostMappedAlias.storefrontAlias + "/" + subPath;
    }
    return <PublicLandingView aliasOrId={hostMappedAlias.companySlug} initialSubPath={subPath} />;
  }`;
code = code.replace(target3, replacement3);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for custom domain mapping");
