# python3 scripts/run.py


import os
import glob
files = glob.glob("./node_modules/edgedb/dist" + '/**/*.js', recursive=True)
bufferPolyfillPath = "./node_modules/edgedb/dist/bufferPolyfill.js"

for path in files:
    if path != 'run.py' and path != bufferPolyfillPath:
        new_lines = None
        with open(path) as f:
            add_import = False
            if "baseConn" in path or "scram" in path:
                importPath = "./bufferPolyfill.js"
                add_import = True
            if not add_import:
                lines = f.readlines()
                importPath = None
                for line in lines:
                    if "instanceof Buffer" in line or " Buffer." in line:
                        importPath = os.path.relpath(bufferPolyfillPath, path)
                        if importPath.startswith("../../"):
                            importPath = importPath[3:]
                        print(f"file: {path}, importPath: {importPath}, code: {line.lstrip()}")
                        add_import = True
                        break
            if add_import:
                new_lines = ["\"use strict\";", f"const {{ Buffer }} = require(\"{importPath}\")"]
                new_lines = new_lines + lines[1:]
        if new_lines:
            with open(path, "w") as f:
                f.write("\n".join(new_lines))

with open(bufferPolyfillPath, "w+") as f:
    with open("./scripts/bufferPolyfill.js", "r") as rf:
        lines = rf.readlines()
        text = "\n".join(lines)
        f.write(text)

