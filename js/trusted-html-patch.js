/*
 * File: js/trusted-html-patch.js
 * Nhiệm vụ: Tạo một "default policy" cho TrustedHTML.
 * Nó sẽ tự động dùng DOMPurify để làm sạch bất kỳ chuỗi HTML nào
 * được gán cho innerHTML, giúp jQuery không bị crash.
 */
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: (string) => DOMPurify.sanitize(string, {RETURN_TRUSTED_TYPE: true}),
      createScript: (string) => string,
      createScriptURL: (string) => string,
    });
    console.log(Lang.get("logPolicyCreated"));
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.error(Lang.get("errorPolicyCreate"), e.message);
    }
  }
}