with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The mapping block to replace
start_idx = 18000
end_idx = 18160 # Need to find the exact end

# Search for the block
block = []
for i in range(len(lines)):
    if "{newProduct.variations && newProduct.variations.length > 0 ? (" in lines[i]:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if "                      } : null}" in lines[i] or "                    }) : null}" in lines[i] or (i > start_idx + 10 and "                    }" in lines[i] and "                  )" in lines[i+1]):
        end_idx = i + 1
        break

# I will just write a new block and replace lines[start_idx:end_idx]
# This seems safer.

print(f"Found block from {start_idx} to {end_idx}")

new_block = [
    '                    {newProduct.variations && newProduct.variations.length > 0 ? (\n',
    '                      <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {\n',
    '                          const { active, over } = event;\n',
    '                          if (over && active.id !== over.id) {\n',
    '                            const updated = [...(newProduct.variations || [])];\n',
    '                            const oldIndex = updated.findIndex((v: any, idx: number) => (v.id || idx) === active.id);\n',
    '                            const newIndex = updated.findIndex((v: any, idx: number) => (v.id || idx) === over.id);\n',
    '                            setNewProduct((prev: any) => ({ ...prev, variations: arrayMove(updated, oldIndex, newIndex) }));\n',
    '                          }\n',
    '                      }} sensors={useSensors(useSensor(PointerSensor))}>\n',
    '                          <SortableContext items={newProduct.variations.map((v: any, idx: number) => v.id || idx)} strategy={verticalListSortingStrategy}>\n',
    '                            <div className="space-y-3">\n',
    '                              {newProduct.variations.map((v, idx) => {\n',
    '                                const isColorOverridden = !!(newProduct.handleColor?.trim() || newProduct.color?.trim());\n',
    '                                const isMaterialOverridden = !!newProduct.handleMaterial?.trim();\n',
    '                                return (\n',
    '                                  <SortableVariationItem key={v.id || idx} v={v} idx={idx}>\n',
    '                                    <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm space-y-3 animate-in fade-in duration-200">\n',
    '                                      <div className="flex flex-col sm:flex-row items-start gap-4 w-full">\n',
    '                                        {/* Variation Image Slot */}\n'
]
# Need to copy the rest of the variation item from the original file...
# This is getting very complicated. 

# Alternative: just add the SortableVariationItem wrapper inside the existing map
# and add the DndContext wrapper around the map.

# Let's try simpler:
# Use edit_file to add SortableVariationItem inside the map.
# And edit_file to add DndContext around the map.
]
