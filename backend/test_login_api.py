import requests

login_data = {
    'username': 'final@example.com',
    'password': 'password123'
}

print('Sending login...')
response = requests.post('http://localhost:8001/api/auth/login', data=login_data)
print('Status:', response.status_code)
print('Body:', response.text)
