/**
 * Navigate the browser to a URL. The single impure browser call behind the
 * connect redirect, isolated here so it can be mocked in tests and swapped if a
 * host ever needs custom navigation.
 */
export function navigate(url: string): void {
  window.location.assign(url);
}
