// Quick script to extract Instagram cookies from browser console
// Run this in browser console while on instagram.com (logged in)

console.log('=== Instagram Cookies ===');
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [name, value] = cookie.trim().split('=');
  if (name && (name.includes('sessionid') || name.includes('csrftoken') || name.includes('ds_user_id'))) {
    acc[name] = value;
  }
  return acc;
}, {});

console.log('\nRequired Cookies:');
console.log('sessionid:', cookies.sessionid ? 'Found ✓' : 'Missing ✗');
console.log('csrftoken:', cookies.csrftoken ? 'Found ✓' : 'Missing ✗');
console.log('ds_user_id:', cookies.ds_user_id ? 'Found ✓' : 'Missing ✗');

console.log('\n=== Copy this to .env ===');
const cookieString = Object.entries(cookies)
  .map(([name, value]) => `${name}=${value}`)
  .join('; ');
console.log(`INSTAGRAM_COOKIES="${cookieString}"`);
