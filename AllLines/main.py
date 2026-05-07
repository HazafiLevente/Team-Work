import json
import os
from pathlib import Path

PROJECT_PATH3 = Path(r"E:\Projekt\Setup-Configurator")

PROJECT_PATH1 = Path(r"E:\Projekt\Setup-Configurator\src\app\Components\Usersites\Setup")
PROJECT_PATH = Path(r"C:\Users\typed\WebstormProjects\Team-Work\backend")
PROJECT_PATH2 = Path(r"E:\Projekt\Setup-Configurator\src\app\Components\Usersites\Setup\setup-tools-modal")

ALLOWED_EXTENSIONS = {".html", ".ts", ".js", ".css", ".txt"}

IGNORE_FOLDERS = {
    "node_modules",
    ".git",
    ".angular",
    ".vscode",
    "dist",
    "build"
}


def read_file(path):
    try:
        return path.read_text(encoding="utf-8")
    except:
        return ""


def collect_files():

    files = []

    for root, dirs, filenames in os.walk(PROJECT_PATH):


        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]

        for name in filenames:

            path = Path(root) / name

            if path.suffix not in ALLOWED_EXTENSIONS:
                continue

            files.append({
                "path": str(path.relative_to(PROJECT_PATH)),
                "content": read_file(path)
            })

    return files


files = collect_files()

with open("output.json", "w", encoding="utf-8") as f:
    json.dump({"files": files}, f, indent=2, ensure_ascii=False)

print("Kész!")