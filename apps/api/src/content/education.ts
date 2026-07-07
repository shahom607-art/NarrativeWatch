import type { EducationContent } from "@narrativewatch/shared";

/**
 * Draft educational content — requires human review before publishing (per spec Section 7).
 * Marked as draft in UI until user approves.
 */
export const EDUCATION_CONTENT: EducationContent = {
  lastUpdated: "2026-07-07",
  disclaimer:
    "This content is for general awareness and media literacy. It does not identify or accuse specific individuals or campaigns. Review and edit before public deployment.",
  sections: [
    {
      id: "understanding-patterns",
      title: "Understanding suspected coordinated patterns",
      content:
        "Automated systems can detect statistical patterns — such as repeated phrasing, similar posting times, or high-frequency activity around a keyword — that sometimes appear in coordinated inauthentic behavior. A pattern match is not proof of coordination. It is a signal worth human review. NarrativeWatch always labels findings as 'suspected' or 'pattern match' and displays a confidence score (0–100) rather than claiming certainty.",
    },
    {
      id: "reading-scores",
      title: "How to read confidence scores",
      content:
        "The bot-score is a transparent, rule-based composite (not a deep-learning 'bot detector'). It combines: posting frequency within a keyword window (30%), text near-duplication vs. other recent posts (40%), account age/activity ratio when available (15%), and a separate toxicity signal (15%). Scores below 40 may be noise; 40–70 warrants caution; above 70 suggests strong pattern overlap. Always verify context manually.",
    },
    {
      id: "bot-networks-general",
      title: "How inauthentic networks generally operate (high level)",
      content:
        "Research literature describes coordinated networks as groups of accounts that amplify similar narratives — often through reposting, copy-paste messaging, or synchronized timing. They may use newly created accounts or compromised profiles. Public posts only are in scope for this tool; private messages are never collected. For authoritative background, consult academic and platform transparency reports rather than relying on any single dashboard.",
    },
    {
      id: "reporting-x",
      title: "Reporting on X (official channels)",
      content:
        "NarrativeWatch does not report accounts on your behalf. To report content on X, use X's own safety flow: open the post on X, use the menu (⋯) → Report, and follow their prompts. You can also visit https://help.x.com/en/safety-and-security/report-x-ads. When using NarrativeWatch's 'Report via X' button, we open X's report page and copy neutral, factual suggested text to your clipboard — you choose whether to submit.",
    },
    {
      id: "media-literacy",
      title: "Media literacy resources",
      content:
        "• First Draft News — verification guides and training\n• News Literacy Project — classroom and public resources\n• EU Code of Practice on Disinformation — policy context\n• X Transparency Center — platform enforcement reports\n\nCross-check claims with primary sources, note account creation dates, and look for original reporting before sharing.",
    },
  ],
};
