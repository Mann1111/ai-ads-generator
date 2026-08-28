// Five fixed "ad angle" templates. Every video-ad batch generates one video
// per angle (per selected format), so a single upload produces 5 distinct
// marketing takes instead of one. Each angle carries its own on-screen
// dialogue — hook / body / CTA — written directly in natural Khmer (not a
// translation placeholder), which is what gets burned into the video as
// timed captions by videoAdProvider.js.
//
// The generic noun "ផលិតផលនេះ" ("this product") is used instead of
// splicing the user's free-text category into the Khmer sentence — mixing
// an arbitrary English/Latin category string into a Khmer sentence tends to
// read as broken code-switching, so every angle stays fully, correctly
// Khmer regardless of what the user typed as their product category.
export const ANGLES = [
  {
    id: "problem-solution",
    label: "Problem → Solution",
    description: "Opens with the pain point, answers it, closes with a direct buy CTA.",
    hook: "កំពុងស្វែងរកផលិតផលដែលត្រូវចិត្តមែនទេ?",
    body: "គុណភាពល្អ ប្រើប្រាស់ស្រួល តម្លៃសមរម្យ",
    cta: "ទិញឥឡូវនេះ!",
  },
  {
    id: "social-proof",
    label: "Social Proof",
    description: "Leads with popularity/trust, reinforces satisfaction, invites the viewer to join in.",
    hook: "អតិថិជនរាប់ពាន់នាក់ជ្រើសរើសផលិតផលនេះ",
    body: "ការពេញចិត្ត១០០% គុណភាពធានា",
    cta: "ចូលរួមជាមួយពួកគេថ្ងៃនេះ!",
  },
  {
    id: "feature-highlight",
    label: "Feature Highlight",
    description: "Introduces the product, calls out what makes it stand out, invites a closer look.",
    hook: "ជួបជាមួយផលិតផលថ្មីនេះ",
    body: "រចនាបថទំនើប មុខងារពិសេស",
    cta: "ស្វែងយល់បន្ថែម ទិញឥឡូវនេះ!",
  },
  {
    id: "urgency-offer",
    label: "Urgency / Offer",
    description: "Promo-led — announces the deal, states the discount, pushes urgency for the close.",
    hook: "ប្រូម៉ូសិនពិសេសកំពុងតែមាន!",
    body: "បញ្ចុះតម្លៃរហូតដល់ ៥០%",
    cta: "ឆាប់ៗ មុនអស់ពេល — ទិញឥឡូវនេះ!",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Aspirational framing — the feeling/lifestyle first, product second, soft CTA.",
    hook: "រស់នៅជាមួយភាពសុខស្រួល",
    body: "ផលិតផលនេះសម្រាប់ជីវិតប្រចាំថ្ងៃរបស់អ្នក",
    cta: "ជ្រើសរើសថ្ងៃនេះ!",
  },
];

export function getAngle(id) {
  return ANGLES.find((a) => a.id === id) || ANGLES[0];
}
