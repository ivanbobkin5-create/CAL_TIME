const projects = [{ name: "Новый проект" }];
const summary = {
  materials: [
    { projectName: "Новый проект", name: "ЛДСП", type: "material", qty: "5 л." },
    { projectName: "Новый проект", name: "Кромка", type: "edge", qty: "166 м" },
    { projectName: "Новый проект", name: "ХДФ", type: "material", qty: "2 л." },
    { projectName: "Новый проект", name: "Фасад", type: "facade", qty: "3 л." },
  ]
};

const groups: Record<string, any> = {};
projects.forEach(p => {
   groups[p.name] = { body: [], back: [], facades: [] };
});

let lastCategory: "body" | "facades" | "back" | null = null;
summary.materials.forEach((m: any) => {
   const proj = m.projectName;
   if (!groups[proj]) return;
   const name = (m.name || "").toLowerCase();
   const decor = m.decor || m.brand || "Не указан";
   const sub = m.sub || "";
   const qty = m.qty || "";
   
   if (m.type === "product_edge" || m.type === "edge" || name.includes("кромка")) {
      const edgeStr = `${m.name}${decor !== "Не указан" ? ` ${decor}` : ""} — ${qty}`;
      let targetArr = groups[proj].body;
      if (lastCategory && groups[proj][lastCategory]) {
         targetArr = groups[proj][lastCategory];
      }
      if (targetArr.length > 0) {
         targetArr[targetArr.length - 1] += ` (+ ${edgeStr.trim()})`;
      } else {
         groups[proj].body.push(edgeStr.trim());
      }
   } else {
      const itemStr = `${m.name}${decor !== "Не указан" ? ` ${decor}` : ""}${sub ? ` (${sub})` : ""} — ${qty}`;
      if (m.type === "facade" || name.includes("фасад")) {
         groups[proj].facades.push(itemStr);
         lastCategory = "facades";
      } else if (name.includes("хдф") || name.includes("двп") || (m.sub || "").toLowerCase().includes("задняя")) {
         groups[proj].back.push(itemStr);
         lastCategory = "back";
      } else {
         groups[proj].body.push(itemStr);
         lastCategory = "body";
      }
   }
});

console.log(JSON.stringify(groups, null, 2));
