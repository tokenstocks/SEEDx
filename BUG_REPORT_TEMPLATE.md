# Bug Report #[NUMBER]

## Severity
- [ ] **Blocker** - Application unusable, data loss, security vulnerability
- [ ] **Critical** - Major feature broken, affects core RCX compliance
- [ ] **Major** - Feature malfunction, workaround available
- [ ] **Minor** - UI glitch, cosmetic issue, typo

## Summary
[One-line description of the bug]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Result
[What should happen according to RCX specification or normal functionality]

## Actual Result
[What actually happened - be specific]

## Environment
- **Browser:** [Chrome 120.0.6099.129 / Firefox 120 / Safari 17 / Edge 120]
- **Browser Version:** [Full version number]
- **Operating System:** [Windows 11 / macOS 14 Sonoma / Ubuntu 22.04 / iOS 17 / Android 14]
- **Screen Resolution:** [1920x1080 / 1366x768 / Mobile]
- **Account Used:** [Primer / Regenerator / Admin / Newly Created]
- **Account Email:** [test account email used]
- **Timestamp:** [YYYY-MM-DD HH:MM UTC - when bug occurred]
- **Application URL:** [Full URL where bug occurred]

## Screenshots/Videos
[Attach screenshots or screen recordings]

**Screenshot Guidelines:**
- Capture full browser window (including URL bar)
- Highlight the specific issue with red box/arrow if needed
- For timeline issues, show full timeline view
- For data issues, show browser dev tools Network tab
- Name files descriptively: `bug-001-primer-ownership-display.png`

## Browser Console Errors
[Open browser Developer Tools (F12 or Cmd+Option+I) → Console tab → Copy any red error messages]

**Example:**
```
TypeError: Cannot read property 'sharePercent' of undefined
    at PrimerDashboard.tsx:245
    at Array.map (<anonymous>)
```

## Network Request Details (if applicable)
[Open Developer Tools → Network tab → Find relevant request → Copy response]

**Example:**
```
GET /api/regenerator/my-distributions
Status: 200 OK
Response: {
  "distributedAt": null,  ← Issue: should have timestamp
  "amountNGNTS": "5000"
}
```

## Database State (if applicable)
[If you have database access, include relevant table data that shows the issue]

## Additional Notes
[Any other relevant information, workarounds discovered, or context]

## RCX Compliance Impact
- [ ] This bug violates RCX model requirement #1 (Primer role - grant-style donors, no ownership)
- [ ] This bug violates RCX model requirement #2 (Regenerator - 100% to LP Pool)
- [ ] This bug violates RCX model requirement #3 (Profit distribution - 4-bucket split)
- [ ] This bug violates RCX model requirement #4 (Dual wallet architecture)
- [ ] This bug violates RCX model requirement #5 (Manual admin distribution workflow)
- [ ] This bug violates RCX model requirement #6 (Integer-cent allocation)
- [ ] This bug violates RCX model requirement #7 (Regenerator distribution tracking)
- [ ] This bug violates RCX model requirement #8 (No LP ownership display for Primers)
- [ ] This bug violates RCX model requirement #9 (Legacy field documentation)
- [ ] This bug does not affect RCX compliance

**If RCX compliance is affected, explain how:**
[Describe the compliance violation]

## Suggested Fix (optional)
[If you have technical knowledge, suggest how to fix this]

---

## Example: Complete Bug Report

# Bug Report #001

## Severity
- [x] **Critical** - Affects core RCX compliance requirement

## Summary
Primer dashboard shows "Your Share: 12%" in timeline contribution event, violating RCX model

## Steps to Reproduce
1. Navigate to https://seedx-app.replit.app
2. Log in as primer1@seedx.test / primer123
3. Navigate to Dashboard
4. Scroll to Timeline section (lower half of page)
5. Locate contribution event from November 14, 2025

## Expected Result
Timeline event should display:
- "Capital Deployed: 50,000 NGNTS"
- Impact metrics (e.g., "Regenerators Enabled: 3")
- NO ownership percentage or LP share information

According to RCX model requirement #1, Primers are grant-style donors who receive ONLY impact metrics, NOT ownership stakes.

## Actual Result
Timeline event displays:
- "Contributed 50,000 NGNTS"
- "Your Share: 12%" ← **This should NOT appear**
- Icon showing percentage gauge

## Environment
- **Browser:** Chrome 120.0.6099.129
- **Browser Version:** 120.0.6099.129 (Official Build) (64-bit)
- **Operating System:** Windows 11 Pro (Version 23H2)
- **Screen Resolution:** 1920x1080
- **Account Used:** Primer (Test Account)
- **Account Email:** primer1@seedx.test
- **Timestamp:** 2025-11-15 14:30:22 UTC
- **Application URL:** https://seedx-app.replit.app/dashboard

## Screenshots/Videos
![Primer Dashboard Ownership Issue](screenshots/bug-001-primer-ownership-display.png)
![Timeline Event Detail](screenshots/bug-001-timeline-closeup.png)

## Browser Console Errors
No errors in console. Issue is visual/data display only.

## Network Request Details
```
GET /api/primer/dashboard
Status: 200 OK
Response: {
  "contributions": [
    {
      "id": "123",
      "amount": "50000",
      "createdAt": "2025-11-14T10:00:00Z",
      "sharePercent": "12"  ← This field should NOT be in API response
    }
  ]
}
```

## Database State
Table: `primerContributions`
Row ID: 123
Column `lpPoolShareSnapshot`: 0.12 ← This legacy field is being returned to frontend

## Additional Notes
- This issue appears on BOTH desktop and mobile views
- The ownership percentage calculation seems correct (12% of current LP Pool)
- BUT Primers should never see this information per RCX model
- Other parts of dashboard correctly show only impact metrics
- Issue is isolated to timeline events

## RCX Compliance Impact
- [x] This bug violates RCX model requirement #1 (Primer role - grant-style donors, no ownership)
- [x] This bug violates RCX model requirement #8 (No LP ownership display for Primers)

**Compliance Violation Explanation:**
RCX requirement #1 states: "Primers are grant-style donors who seed the liquidity pool and receive impact metrics (NOT financial returns or ownership stakes)."

Displaying "Your Share: 12%" implies:
1. Primer has an ownership stake in the LP Pool
2. Primer can expect financial returns proportional to their share
3. Primer has LP tokens or pool shares (which they should NOT have)

This fundamentally contradicts the RCX grant model and could create legal/regulatory issues by implying investment returns.

## Suggested Fix
**Backend Fix:**
1. Modify `GET /api/primer/dashboard` endpoint
2. Remove `sharePercent` field from API response
3. Ensure `lpPoolShareSnapshot` is NOT selected in query

**Frontend Fix:**
1. In `PrimerDashboard.tsx` (lines 560-593)
2. Remove timeline event rendering of `sharePercent`
3. Replace with impact metric display (e.g., "Regenerators Enabled: {count}")

**Verification:**
1. After fix, Primer timeline should show ONLY:
   - Capital deployed amount
   - Impact metrics
   - No ownership/share percentages
2. Test with both existing and new contributions

---

**Tester:** John Doe  
**Email:** john.doe@example.com  
**Date Reported:** 2025-11-15  
**Priority for Fix:** HIGH (Blocks RCX compliance certification)
