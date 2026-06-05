import requests

url = "http://localhost:8000/api/upload"
file_path = "test_novel.txt"

try:
    with open(file_path, "rb") as f:
        files = {"file": f}
        print("正在转换，请稍等...")
        response = requests.post(url, files=files)

    print("状态码:", response.status_code)
    if response.status_code == 200:
        script = response.json()
        print("\n✅ 剧本转换成功！")
        print("剧本结构:", list(script.keys()))
        # 打印概要信息
        if "metadata" in script:
            meta = script["metadata"]
            print(f"剧本标题: {meta.get('title', '无')}")
            print(f"总章节数: {meta.get('total_chapters', '无')}")
            print(f"生成场景数: {meta.get('converted_scenes', '无')}")
        if "summary" in script:
            print(f"一句话梗概: {script['summary'].get('logline', '无')}")
        # 可选：保存到文件
        import json

        with open("output_script.json", "w", encoding="utf-8") as out:
            json.dump(script, out, ensure_ascii=False, indent=2)
        print("\n已保存完整剧本到 output_script.json")
    else:
        print("错误:", response.text)
except requests.exceptions.ConnectionError:
    print("❌ 连接失败！请确认后端服务是否已启动（运行 app/main.py）")
except FileNotFoundError:
    print("❌ 找不到 test_novel.txt 文件，请先在项目目录下创建该文件")