from fastapi.testclient import TestClient
from app.main import app

def test_request_ride():
    from app.api.deps import get_current_user
    class DummyUser:
        id = 1
        role = "RIDER"
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    
    with TestClient(app) as client:
        response = client.post(
            "/api/rides/request",
            json={"pickup_location": "A", "destination_location": "B"}
        )
        print("STATUS", response.status_code)
        print("RESPONSE", response.json())

if __name__ == "__main__":
    test_request_ride()
