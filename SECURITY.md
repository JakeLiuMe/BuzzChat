# Security Policy 🔒

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | ✅ Yes             |
| 1.1.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:
1. **Email:** [Create a private security advisory](https://github.com/JakeLiuMe/BuzzChat/security/advisories/new)
2. **GitHub:** Use the "Report a vulnerability" button on the Security tab

### What to include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline:
- **24 hours:** Initial acknowledgment
- **72 hours:** Preliminary assessment
- **7 days:** Detailed response with next steps
- **90 days:** Public disclosure (after fix is released)

## Security Measures

BuzzChat implements:
- ✅ No external data transmission (all processing is local)
- ✅ Chrome sync storage for settings (encrypted by Chrome)
- ✅ Content Security Policy (CSP)
- ✅ No eval() or dynamic code execution
- ✅ Input sanitization for all user inputs
- ✅ Rate limiting on API calls

## Known Limitations

- Settings are stored in Chrome sync storage (accessible by other extensions with permissions)
- Content scripts run on live stream pages (limited to DOM interaction)

## Security Best Practices for Users

1. **Keep Chrome updated** — Security patches are released regularly
2. **Review permissions** — BuzzChat only needs access to live stream sites
3. **Don't share exports** — Settings exports may contain sensitive data
4. **Use strong passwords** — If using Pro/Business tier with ExtensionPay

---

Thank you for helping keep BuzzChat secure! 🐝
