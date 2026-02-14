# Visual Testing Guide - AI Resume Builder Fixes

## What to Look For

### 1. Progress Indicator
![Progress Indicator](progress-indicator.png)

**Location**: Top of AI chat panel, below "AI Resume Builder" heading

**What You Should See**:
```
AI Resume Builder
Professional Summary (Section 1 of 4)
```

**As you progress**:
```
AI Resume Builder
Work Experience (Section 2 of 4)
```

### 2. Section Navigation Buttons
![Navigation Buttons](navigation-buttons.png)

**When They Appear**: After AI synthesizes content and asks for approval

**Example AI Message**:
> Here's your professional summary:
> 
> *"Experienced software engineer with 5 years in full-stack development..."*
> 
> Want it more formal, more confident, or more friendly?

**Buttons Below Message**:
- [Looks Good - Next Section] (Blue primary button)
- [Rewrite This] (Outlined secondary button)

### 3. Data in Preview Pane
![Preview with Data](preview-with-data.png)

**Before (Problem)**:
```
Your Name
youremail@email.com
```

**After (Fixed)**:
```
John Smith
john.smith@email.com

Professional Summary
Experienced software engineer with 5+ years...
```

### 4. Browser Console Logs
![Console Logs](console-logs.png)

**What to Monitor in DevTools Console**:
```
[AIResumeChat] Applying updates: Object { personalInfo: {...}, summary: "..." }
[AIResumeChat] Triggering auto-save
[ResumeBuilder] Updating resume data with: Object { ... }
[ResumeBuilder] New resume data: Object { ... }
[ResumeBuilder] Saving resume data: Object { ... }
```

### 5. Network Tab
![Network Requests](network-requests.png)

**What to Look For**:
1. Filter by "Fetch/XHR"
2. Look for PATCH request to `/api/resumes/[id]`
3. Click on request
4. Check "Payload" tab - should see `resumeData` with your content
5. Check "Response" tab - should see 200 OK

## Step-by-Step Visual Test

### Test Flow Diagram
```
Start AI Builder
    ↓
[Shows Section 1 of 4]
    ↓
Answer questions
    ↓
AI synthesizes content
    ↓
[Buttons appear]
    ↓
Click "Looks Good - Next Section"
    ↓
[Shows Section 2 of 4]
    ↓
Repeat for all sections
    ↓
[All sections complete]
```

### Expected Visual States

#### State 1: Initial Greeting
```
┌─────────────────────────────────────┐
│ AI Resume Builder                   │
│ Building your resume step-by-step   │
├─────────────────────────────────────┤
│                                     │
│ 🤖 Hey John! 👋 I'm your AI        │
│    Resume Builder...                │
│                                     │
│    Let's start with your            │
│    Professional Summary.            │
│                                     │
│    What kind of roles are you       │
│    aiming for right now?            │
│                                     │
└─────────────────────────────────────┘
```

#### State 2: After Answer (Synthesizing)
```
┌─────────────────────────────────────┐
│ AI Resume Builder                   │
│ Professional Summary (Section 1 of 4)│
├─────────────────────────────────────┤
│                                     │
│ 👤 I'm looking for senior software │
│    engineer roles                   │
│                                     │
│ 🤖 Here's your professional        │
│    summary:                         │
│                                     │
│    *"Experienced software engineer  │
│    seeking senior positions..."*    │
│                                     │
│    Want it more formal, more        │
│    confident, or more friendly?     │
│                                     │
│    [Looks Good - Next Section]      │
│    [Rewrite This]                   │
│                                     │
└─────────────────────────────────────┘
```

#### State 3: After "Next Section" Click
```
┌─────────────────────────────────────┐
│ AI Resume Builder                   │
│ Work Experience (Section 2 of 4)    │
├─────────────────────────────────────┤
│                                     │
│ 🤖 Great! Now let's work on your   │
│    Work Experience.                 │
│                                     │
│    Tell me about a job, internship, │
│    or major responsibility you've   │
│    had.                             │
│                                     │
└─────────────────────────────────────┘
```

### Side-by-Side: Before vs After

#### Preview Pane - Before Fix
```
┌─────────────────────────┐
│  RESUME PREVIEW         │
├─────────────────────────┤
│                         │
│  Your Name              │  ← Placeholder
│  youremail@email.com    │  ← Placeholder
│                         │
│  Summary                │
│  [No content]           │  ← Empty
│                         │
│  Experience             │
│  [No content]           │  ← Empty
│                         │
└─────────────────────────┘
```

#### Preview Pane - After Fix
```
┌─────────────────────────┐
│  RESUME PREVIEW         │
├─────────────────────────┤
│                         │
│  John Smith             │  ✓ Real data
│  john@email.com         │  ✓ Real data
│                         │
│  Summary                │
│  Experienced software   │  ✓ AI-generated
│  engineer with 5+ years │  ✓ Shows immediately
│  in full-stack...       │
│                         │
│  Experience             │
│  Senior Developer       │  ✓ AI-generated
│  Tech Corp, 2020-2024   │  ✓ Shows immediately
│                         │
└─────────────────────────┘
```

## Screenshots to Take During Testing

### Required Screenshots

1. **screenshot-01-progress-indicator.png**
   - Show the "Section X of Y" indicator
   - Caption: "Progress indicator showing current section"

2. **screenshot-02-navigation-buttons.png**
   - Show the two buttons after AI asks for approval
   - Caption: "Navigation buttons appearing after AI synthesis"

3. **screenshot-03-preview-with-data.png**
   - Show preview pane with actual data (not placeholders)
   - Caption: "Preview showing real-time data updates"

4. **screenshot-04-console-logs.png**
   - Show browser console with data update logs
   - Caption: "Console logs confirming data flow"

5. **screenshot-05-network-tab.png**
   - Show successful PATCH request in Network tab
   - Caption: "Network tab showing successful save operation"

6. **screenshot-06-section-transition.png**
   - Show transition from Section 1 to Section 2
   - Caption: "Automatic section transition after approval"

### Optional Screenshots

7. **screenshot-07-rewrite-button.png**
   - Show result after clicking "Rewrite This"
   - Caption: "AI rewriting content after user request"

8. **screenshot-08-complete-resume.png**
   - Show completed resume with all sections
   - Caption: "Completed resume with all data persisted"

## How to Capture Screenshots

### Chrome DevTools
1. Open DevTools (F12)
2. Click "⋮" (three dots) → More tools → Capture screenshot
3. Or use built-in browser screenshot tools

### Firefox DevTools
1. Open DevTools (F12)
2. Click "⚙" (settings) → Available Toolbox Buttons → Take a screenshot
3. Click camera icon in toolbar

### Manual Screenshots
- Windows: Win + Shift + S
- Mac: Cmd + Shift + 4
- Linux: PrtScn or use screenshot tool

## Verification Checklist

Use this checklist while testing:

```
Testing Session: [Date/Time]
Browser: [Chrome/Firefox/Safari/Edge]
User: [Test account email]

Visual Checks:
☐ Progress indicator shows "Section X of Y"
☐ Progress indicator updates when moving to next section
☐ Navigation buttons appear after AI asks for approval
☐ "Looks Good - Next Section" button is primary (blue)
☐ "Rewrite This" button is secondary (outlined)
☐ Preview pane shows real name (not "Your Name")
☐ Preview pane shows real email
☐ Preview pane updates immediately after AI response
☐ All completed sections visible in preview

Functional Checks:
☐ Clicking "Next Section" transitions to next section
☐ Clicking "Rewrite This" requests new content
☐ Console shows data update logs
☐ Network tab shows PATCH requests
☐ Data persists after page refresh
☐ Can switch to manual editor with data intact

Edge Cases:
☐ Buttons only appear for last AI message
☐ Buttons don't appear during streaming
☐ Buttons don't appear for user messages
☐ Section counter shows correct total (1 of 4, 2 of 4, etc.)
```

## Common Visual Issues to Report

### Issue Template
```
**Issue**: [Brief description]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshot**: [Attach screenshot]
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three
**Browser**: [Chrome/Firefox/etc.]
**Console Errors**: [Any error messages]
```

## Example Test Report

```
Test Report: AI Resume Builder Fixes
Date: 2024-XX-XX
Tester: [Your Name]
Environment: Development

✅ Progress Indicator: PASS
   - Shows "Section 1 of 4" initially
   - Updates to "Section 2 of 4" after transition
   - Screenshot: screenshot-01-progress-indicator.png

✅ Navigation Buttons: PASS
   - Buttons appear after AI asks "Want it more..."
   - Clicking "Next Section" transitions successfully
   - Screenshot: screenshot-02-navigation-buttons.png

✅ Data Persistence: PASS
   - Preview shows real data immediately
   - Data persists after refresh
   - Screenshot: screenshot-03-preview-with-data.png

✅ Console Logging: PASS
   - All expected logs appear
   - Data flow confirmed
   - Screenshot: screenshot-04-console-logs.png

✅ Network Requests: PASS
   - PATCH requests successful (200 OK)
   - Payload contains correct data
   - Screenshot: screenshot-05-network-tab.png

Overall Result: ✅ ALL TESTS PASSED
```

---

**Note**: When submitting test results, please include all required screenshots to help verify the fixes are working as expected.
