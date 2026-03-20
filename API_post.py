import requests

url = "http://127.0.0.1:8000/api/state"

data = {
    "building_3::qB1-vgkHPpZSQpjzEzUW-85": {
        "status": "running",
        "spindle_temp": 915
    }
}

response = requests.post(url, json=data)

print("Status:", response.status_code)
print("Response:", response.text)
