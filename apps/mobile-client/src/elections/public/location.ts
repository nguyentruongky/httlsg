export function currentElectionLocation(): Promise<GeolocationPosition> {
  if (import.meta.env?.DEV) {
    const values = {
      latitude: 10.732420152811994,
      longitude: 106.65306644904963,
      accuracy: 1,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    };
    const coords: GeolocationCoordinates = {
      ...values,
      toJSON: () => ({ ...values }),
    };
    const timestamp = Date.now();
    return Promise.resolve({
      coords,
      timestamp,
      toJSON: () => ({ coords: coords.toJSON(), timestamp }),
    });
  }
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(
        new Error(
          "Định vị cần kết nối HTTPS hoặc localhost. Vui lòng mở trang bầu cử qua HTTPS.",
        ),
      );
      return;
    }
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Thiết bị chưa hỗ trợ định vị. Vui lòng dùng trình duyệt có GPS qua HTTPS.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Bạn cần cho phép truy cập vị trí để tham gia bầu cử."
              : error.code === 2
                ? "Không thể lấy vị trí GPS. Hãy bật định vị và thử lại."
                : "Lấy vị trí quá lâu. Hãy đến nơi có tín hiệu GPS tốt hơn và thử lại.",
            { cause: error },
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}
export const positionInput = (
  position: GeolocationPosition,
  nonce: string,
) => ({
  nonce,
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  measuredAt: position.timestamp,
});
