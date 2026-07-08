import sys

with open('src/controllers/auth.controller.ts', 'r') as f:
    lines = f.readlines()

new_lines = lines[:618] + [
    "    return response.success(200, {\n",
    "      message: 'Candidate educational details (Step 3) saved successfully',\n",
    "      data: result,\n",
    "    });\n"
] + lines[782:]

with open('src/controllers/auth.controller.ts', 'w') as f:
    f.writelines(new_lines)

print("Done")
