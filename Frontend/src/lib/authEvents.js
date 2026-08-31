let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function handleUnauthorized() {
  if (onUnauthorized) onUnauthorized();
}
