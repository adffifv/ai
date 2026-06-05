import json
import yaml

with open("output_script.json", "r", encoding="utf-8") as f:
    data = json.load(f)

yaml_str = yaml.dump(data, allow_unicode=True, indent=2)
print(yaml_str)

# 保存为 YAML 文件
with open("output_script.yaml", "w", encoding="utf-8") as f:
    f.write(yaml_str)
print("\n已保存到 output_script.yaml")