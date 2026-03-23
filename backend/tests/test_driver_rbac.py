import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api.deps import require_roles
from app.services import driver as driver_service
from app.models import DriverStatusEnum, RideStatusEnum


class DummyDb:
    def __init__(self):
        self.added = []
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    def add(self, item):
        self.added.append(item)


class TestRoleDependencies(unittest.IsolatedAsyncioTestCase):
    async def test_require_roles_blocks_wrong_role(self):
        dependency = require_roles("DRIVER")
        rider = SimpleNamespace(role="RIDER")
        with self.assertRaises(HTTPException) as ctx:
            await dependency(current_user=rider)
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_require_roles_allows_driver_enum_role(self):
        dependency = require_roles("DRIVER")
        driver_user = SimpleNamespace(role=SimpleNamespace(value="DRIVER"))
        result = await dependency(current_user=driver_user)
        self.assertIs(result, driver_user)


class TestDriverService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = DummyDb()
        self.driver = SimpleNamespace(id=10, status=DriverStatusEnum.OFFLINE)

    async def test_ensure_assigned_driver_raises_for_other_driver(self):
        ride = SimpleNamespace(driverId=999)
        with self.assertRaises(HTTPException) as ctx:
            driver_service._ensure_assigned_driver(ride, self.driver)
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_accept_ride_rejects_non_requested(self):
        ride = SimpleNamespace(id=1, status=RideStatusEnum.MATCHED, driverId=None)
        with patch.object(driver_service, "_ensure_driver_has_no_active_ride", AsyncMock()), patch.object(
            driver_service, "_get_ride_or_404", AsyncMock(return_value=ride)
        ):
            with self.assertRaises(HTTPException) as ctx:
                await driver_service.accept_ride(self.driver, 1, self.db)
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_start_ride_rejects_unassigned_driver(self):
        ride = SimpleNamespace(id=1, status=RideStatusEnum.MATCHED, driverId=555)
        with patch.object(driver_service, "_get_ride_or_404", AsyncMock(return_value=ride)):
            with self.assertRaises(HTTPException) as ctx:
                await driver_service.start_ride(self.driver, 1, self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_update_status_on_ride_requires_active_ride(self):
        with patch.object(driver_service, "get_current_driver_ride", AsyncMock(return_value=None)):
            with self.assertRaises(HTTPException) as ctx:
                await driver_service.update_driver_status(self.driver, "ON_RIDE", self.db)
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_update_status_offline_blocked_when_active_ride(self):
        with patch.object(
            driver_service,
            "get_current_driver_ride",
            AsyncMock(return_value=SimpleNamespace(id=3)),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await driver_service.update_driver_status(self.driver, "OFFLINE", self.db)
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_update_driver_location_persists_entry(self):
        location = await driver_service.update_driver_location(self.driver, 12.34, 56.78, self.db)
        self.assertEqual(len(self.db.added), 1)
        self.assertEqual(location.driverId, self.driver.id)
        self.assertEqual(location.latitude, 12.34)
        self.assertEqual(location.longitude, 56.78)


if __name__ == "__main__":
    unittest.main()
