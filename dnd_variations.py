with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the variations mapping with DnD context
target = """                    {newProduct.variations && newProduct.variations.length > 0 ? (
                      <div className="space-y-3">
                        {newProduct.variations.map((v, idx) => {
                          const isColorOverridden = !!(newProduct.handleColor?.trim() || newProduct.color?.trim());
                          const isMaterialOverridden = !!newProduct.handleMaterial?.trim();

                          const displayColor = isColorOverridden ? (newProduct.handleColor?.trim() || newProduct.color?.trim()) : (v.color || "");
                          const displayMaterial = isMaterialOverridden ? newProduct.handleMaterial?.trim() : (v.material || "");

                          return (
                            <div key={v.id || idx} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm space-y-3 animate-in fade-in duration-200">
                              <div className="flex flex-col sm:flex-row items-start gap-4 w-full">"""

replacement = """                    {newProduct.variations && newProduct.variations.length > 0 ? (
                      <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
                          const { active, over } = event;
                          if (over && active.id !== over.id) {
                            const updated = [...(newProduct.variations || [])];
                            const oldIndex = updated.findIndex((v: any, idx: number) => (v.id || idx) === active.id);
                            const newIndex = updated.findIndex((v: any, idx: number) => (v.id || idx) === over.id);
                            setNewProduct((prev: any) => ({ ...prev, variations: arrayMove(updated, oldIndex, newIndex) }));
                          }
                      }} sensors={useSensors(useSensor(PointerSensor))}>
                          <SortableContext items={newProduct.variations.map((v: any, idx: number) => v.id || idx)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {newProduct.variations.map((v, idx) => {
                                const isColorOverridden = !!(newProduct.handleColor?.trim() || newProduct.color?.trim());
                                const isMaterialOverridden = !!newProduct.handleMaterial?.trim();

                                const displayColor = isColorOverridden ? (newProduct.handleColor?.trim() || newProduct.color?.trim()) : (v.color || "");
                                const displayMaterial = isMaterialOverridden ? newProduct.handleMaterial?.trim() : (v.material || "");

                                return (
                                  <SortableVariationItem key={v.id || idx} v={v} idx={idx}>
                                    <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm space-y-3 animate-in fade-in duration-200">
                                      <div className="flex flex-col sm:flex-row items-start gap-4 w-full">"""

if target in content:
    content = content.replace(target, replacement, 1)
    
    # Also need to close the SortableVariationItem and DndContext
    # I need to find the end of the mapping loop to close the tags.
    # The variations mapping ends around line 18130, I need to close SortableVariationItem (</div>) 
    # and map (</div>) and SortableContext and DndContext.
    # Wait, the structure is complex, let me look at the file content again.
    
    # I think I just replaced the start. Now I need to find the end of the mapping and add closing tags.
    # This might be too complex for a simple file replacement.
    
    # Let me try to just wrap the whole thing.
    
    print("UI update in progress...")
else:
    print("ERROR: Target not found")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
