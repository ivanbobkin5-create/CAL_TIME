with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        matchesWardrobeColor
      );"""

replacement = """        matchesWardrobeColor &&
        matchesBasketBrand &&
        matchesBasketRunnerType &&
        matchesBasketType &&
        matchesBasketColor &&
        matchesBasketWidth &&
        matchesWtGroup &&
        matchesWtType &&
        matchesWtManufacturer &&
        matchesWtLength &&
        matchesWtDepth &&
        matchesWtThickness &&
        matchesWtEdge
      );"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Return values added")
else:
    print("ERROR: Target return not found")
