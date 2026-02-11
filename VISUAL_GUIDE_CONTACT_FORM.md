# Smart Contact Form - Visual Guide

## 📱 UI Screens & Components

### Screen 1: Initial Contact Form
```
┌────────────────────────────────────────────┐
│  Joblify                    Why Us  Pricing │
│                             Get Started  →  │
└────────────────────────────────────────────┘

       Get in Touch
  Have questions about Joblify? We're here to help.

┌─────────────────────┐  ┌────────────────────┐
│ 💬 Send us a Message│  │ 📧 Email Support   │
│ Fill out the form.. │  │ Direct support:    │
│                     │  │ support@joblifyai  │
│ Name               │  │                     │
│ [Your name_______] │  │ Privacy inquiries: │
│                     │  │ privacy@joblifyai  │
│ Email              │  │                     │
│ [your.email@___]   │  │ Response: 24-48hrs │
│                     │  └────────────────────┘
│ Message            │
│ [Describe your     │  ┌────────────────────┐
│  question...       │  │ FAQ                │
│                    │  │ • How it works     │
│                    │  │ • Export formats   │
│                    │  │ • Data security    │
│ ℹ️ Our AI will     │  └────────────────────┘
│   attempt instant  │
│   answer           │
│                     │
│ [Send Message 📤]  │
└─────────────────────┘
```

### Screen 2: Loading State (AI Processing)
```
┌─────────────────────┐
│ 💬 Send us a Message│
│                     │
│ Name               │
│ [John Doe_______] ⚫│  ← Disabled (grayed out)
│                     │
│ Email              │
│ [john@example.com]⚫│
│                     │
│ Message            │
│ [How do I export  │⚫│
│  my resume?]       │
│                     │
│                     │
│ [⏳ Getting AI     │  ← Button shows spinner
│     Response...]    │
└─────────────────────┘
```

### Screen 3: AI Response Displayed
```
┌─────────────────────┐
│ 💬 Send us a Message│
│                     │
│ ┌─────────────────┐ │
│ │ ✨ AI Assistant │ │ ← Green/primary colored box
│ │  Response       │ │
│ │                 │ │
│ │ You can export  │ │
│ │ your resume in  │ │
│ │ PDF or DOCX     │ │
│ │ format. Go to   │ │
│ │ Resume Builder  │ │
│ │ → Download...   │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Did this answer │ │ ← Feedback section
│ │ your question?  │ │
│ │                 │ │
│ │ [👍 Yes, I'm    │ │ ← Primary button
│ │  satisfied]     │ │
│ │                 │ │
│ │ [👎 Contact     │ │ ← Outline button
│ │  Support]       │ │
│ └─────────────────┘ │
│                     │
│ ℹ️ "Contact Support"│
│   forwards message  │
└─────────────────────┘
```

### Screen 4: Sending Email (After Reject)
```
┌─────────────────────┐
│ 💬 Send us a Message│
│                     │
│ ┌─────────────────┐ │
│ │ ✨ AI Assistant │ │
│ │  Response       │ │
│ │ [Response text] │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Did this answer?│ │
│ │                 │ │
│ │ [👍 Yes, I'm    │ │
│ │  satisfied]     │ │
│ │                 │ │
│ │ [⏳ Sending...  │ │ ← Loading state
│ └─────────────────┘ │
└─────────────────────┘
```

### Screen 5: Success Dialog
```
    ┌────────────────────────┐
    │ ✅ Message Sent        │
    │    Successfully!       │
    │                        │
    │ Your message has been  │
    │ sent to our support    │
    │ team. You should       │
    │ receive a confirmation │
    │ email shortly.         │
    │                        │
    │ We typically respond   │
    │ within 24-48 hours.    │
    │                        │
    │        [Got it]        │
    └────────────────────────┘
```

### Screen 6: After Success (Form Reset)
```
┌─────────────────────┐
│ 💬 Send us a Message│
│ Fill out the form.. │
│                     │
│ Name               │
│ [____________]     │  ← All fields cleared
│                     │
│ Email              │
│ [____________]     │
│                     │
│ Message            │
│ [____________     │
│                    │
│                    │
│ ℹ️ Our AI will     │
│   attempt instant  │
│   answer           │
│                     │
│ [Send Message 📤]  │
└─────────────────────┘

   ✅ Toast notification appears:
   "Glad we could help!"
```

## 🎬 Animation Timeline

### Transition 1: Form → AI Response (300ms)
```
Form          AI Response
[Visible] ──→ [Fade Out]      0-150ms
[Exit]                        150ms
              [Fade In]       150-300ms
              [Visible]       300ms+
```

### Transition 2: AI Response → Form (300ms)
```
AI Response   Form
[Visible] ──→ [Fade Out]      0-150ms
[Exit]                        150ms
              [Fade In]       150-300ms
              [Visible]       300ms+
```

## 🎨 Color Scheme

### AI Response Box
- **Background:** `bg-primary/5` (light green/primary tint)
- **Border:** `border-primary/20` (subtle primary border)
- **Text:** Primary color for heading, regular for content
- **Icon:** Sparkles ✨ in primary color

### Buttons
- **"Yes, satisfied":** Primary button (green)
- **"Contact Support":** Outline button (white/transparent)
- **Loading state:** Disabled appearance with spinner

### Success Dialog
- **Icon:** Green checkmark (CheckCircle2)
- **Background:** Default dialog background
- **Button:** Primary action button

## 📧 Email Visual Templates

### Support Team Email Preview
```
┌─────────────────────────────────────┐
│ Joblify Logo    New Contact Form    │
├─────────────────────────────────────┤
│                                     │
│ 📋 From                             │
│ John Doe (john@example.com)         │
│                                     │
│ 💬 Message                          │
│ Why was my account suspended?       │
│                                     │
│ ⚠️  AI Response Provided            │  ← Yellow warning box
│ ┌─────────────────────────────────┐ │
│ │ Your account may be suspended   │ │
│ │ for terms violations. Please    │ │
│ │ contact our support team...     │ │
│ │                                 │ │
│ │ User requested human support    │ │
│ │ Please prioritize this inquiry  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📧 Reply to: john@example.com       │
│                                     │
├─────────────────────────────────────┤
│ Joblify • Privacy • Unsubscribe     │
└─────────────────────────────────────┘
```

### User Confirmation Email Preview
```
┌─────────────────────────────────────┐
│ Joblify Logo    Message Received    │
├─────────────────────────────────────┤
│                                     │
│ Hi John,                            │
│                                     │
│ Thank you for contacting Joblify!   │
│ We've received your message and     │
│ our support team will review it.    │
│                                     │
│ 📨 Your Message                     │
│ ┌─────────────────────────────────┐ │
│ │ Why was my account suspended?   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⏱️  Expected Response               │
│ 24-48 hours during business days    │
│                                     │
│ Best regards,                       │
│ The Joblify Team                    │
│                                     │
├─────────────────────────────────────┤
│ Joblify • Privacy • Unsubscribe     │
└─────────────────────────────────────┘
```

## 🎭 Toast Notifications

### Success Toast (After Accept)
```
┌────────────────────────────┐
│ ✅ Glad we could help!     │
│ If you have more questions,│
│ feel free to reach out.    │
└────────────────────────────┘
```

### AI Response Toast
```
┌────────────────────────────┐
│ 🤖 AI Assistant Response   │
│ Our AI has analyzed your   │
│ question. Review below.    │
└────────────────────────────┘
```

### Sending Toast
```
┌────────────────────────────┐
│ 📧 Sending to support...   │
│ We're forwarding your      │
│ message to our team.       │
└────────────────────────────┘
```

### Error Toast
```
┌────────────────────────────┐
│ ❌ Error                   │
│ Failed to send message.    │
│ Please try emailing us     │
│ directly at support@...    │
└────────────────────────────┘
```

## 🔄 State Transitions Diagram

```
    [Form Entry]
         │
         ▼
    [Submit Form]
         │
         ▼
  [Loading State] ──── (AI Call Fails) ──→ [Error Toast]
         │                                        │
    (AI Success)                                  ▼
         │                                  [Send Email]
         ▼                                        │
   [AI Response]                                  ▼
         │                              [Success Dialog]
    ┌────┴────┐
    │         │
    ▼         ▼
[Accept]  [Reject]
    │         │
    │         ▼
    │    [Loading]
    │         │
    │         ▼
    │    [Send Email]
    │         │
    │         ▼
    │    [Success Dialog]
    │         │
    ▼         ▼
 [Reset]  [Reset]
    │         │
    └────┬────┘
         ▼
   [Form Entry]
```

## 📱 Mobile Responsive Layout

### Mobile View (< 768px)
```
┌──────────────┐
│  Joblify  ☰  │  ← Hamburger menu
├──────────────┤
│              │
│ Get in Touch │
│              │
│ 💬 Form      │  ← Full width
│ [Name____]   │
│ [Email___]   │
│ [Message_]   │
│ [_________]  │
│ [Send →]     │
├──────────────┤
│              │
│ 📧 Contact   │  ← Stacked below
│ support@...  │
│              │
│ ❓ FAQ       │
│ • Question 1 │
│ • Question 2 │
└──────────────┘
```

## ♿ Accessibility Features

### Keyboard Navigation
```
Tab Order:
1. [Name field]        ← Tab
2. [Email field]       ← Tab
3. [Message field]     ← Tab
4. [Send button]       ← Tab
5. (After AI response)
   - [Yes button]      ← Tab
   - [No button]       ← Tab
```

### Screen Reader Experience
```
Form:
- "Contact form landmark"
- "Name, required text input"
- "Email, required email input"
- "Message, required text area"
- "Send message, button"

AI Response:
- "AI Assistant Response, complementary"
- [Response text read aloud]
- "Did this answer your question?"
- "Yes, I'm satisfied, button"
- "Contact Support, button"
```

## 🎯 Visual Indicators

### Loading States
- **Spinner:** Animated circular spinner (Loader2)
- **Button Text:** Changes to "Getting AI Response..." or "Sending..."
- **Disabled Fields:** Grayed out, cursor not-allowed
- **Smooth Spin:** Continuous rotation animation

### Success States
- **Green Checkmark:** Large check icon in dialog
- **Primary Color:** Used for positive actions
- **Toast:** Appears top-right, auto-dismisses

### Error States
- **Red Color:** Used for error messages
- **X Icon:** Alert or error icon
- **Toast:** Destructive variant (red background)

---

**Design System:** Radix UI + Tailwind CSS
**Animations:** Framer Motion
**Icons:** Lucide React
**Typography:** Inter font family
