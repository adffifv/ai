import requests
response = requests.post("http://localhost:8000/api/chat2", json={"script": {"title": "test"}, "question": "hello"})
print(response.status_code)
print(response.text)