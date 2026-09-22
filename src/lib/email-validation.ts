export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  const domainDotIndex = email.indexOf(".", atIndex + 1);

  return (
    atIndex > 0 &&
    domainDotIndex > atIndex + 1 &&
    domainDotIndex < email.length - 1 &&
    email.indexOf("@", atIndex + 1) === -1 &&
    !/\s/.test(email)
  );
}