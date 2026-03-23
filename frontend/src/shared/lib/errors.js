export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) {
    return fallback
  }
  if (typeof error === 'string') {
    return error
  }
  if (error?.response?.data?.detail) {
    return error.response.data.detail
  }
  if (error?.message) {
    return error.message
  }
  return fallback
}
