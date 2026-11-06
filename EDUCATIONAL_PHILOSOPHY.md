# BUNYAN — Educational Philosophy

This document is the product's pedagogical compass. When a design or engineering decision is
ambiguous, resolve it in favour of the principle that produces deeper understanding.

## 1. The learning cycle

```
Discover → Understand → Discuss → Practice → Demonstrate → Contribute
```

| Stage       | Product mechanics (Phase)                                   |
| ----------- | ----------------------------------------------------------- |
| Discover    | Library discovery, community browse, public pathways (1–2)  |
| Understand  | Lessons, readings, explanations, worked examples (2)        |
| Discuss     | Community posts, comments, study groups, peer questions (1) |
| Practice    | Exercises, assignments, projects, simulations (3)           |
| Demonstrate | Assessments, portfolios, peer review, credentials (3)       |
| Contribute  | Publish, mentor, review, teach, build a community (1–4)     |

A feature that does not serve one of these stages is not a priority.

## 2. Understanding before memorization

- Quizzes may test recall, but competency evidence should also require explanation, application
  and transfer to a new problem.
- The assessment model stores rubric-scored evidence, not only a percentage.
- Learners can attach artefacts (code, writing, research) to demonstrate ability.
- Streaks and XP never substitute for demonstrated competence.

## 3. Theory connected to practice

- Every course can reference practical objects (exercise, project, case study) without copying
  their content — Learning Objects are referenced by ID.
- Practice is first-class in navigation, not buried in a "resources" tab.
- Feedback is structured: what worked, what to improve, next step.

## 4. Learners become educators

Progression is earned through contribution and verified competence, not follower counts:

```
Learner → Contributor → Mentor → Educator → Academy steward
```

- Any learner can publish notes or answer questions.
- Mentorship requires a track record and, in academies, an explicit role grant.
- Teaching reputation is based on reviewed outcomes and peer assessment.
- Popularity metrics are never the sole basis for granting authority.

## 5. Education is social

- Communities are the default social unit; academies may own communities.
- Discussion prompts are attached to learning objects, keeping conversation close to content.
- Peer review is a learning activity for both reviewer and author.
- Moderation protects psychological safety; it is not censorship of legitimate disagreement.

## 6. Knowledge preservation

- The Library treats publications as durable artefacts with stable URLs and citation metadata.
- Drafts are private; published versions are immutable snapshots (future revisions).
- Arabic typography, search normalization and mixed-direction text are first-class.
- Translation and localization are content workflows, not UI-only concerns.

## 7. Whole-person development

- Communities may define their own code of conduct and pedagogical approach.
- The platform does not impose one worldview; it enforces safety and honesty baselines.
- Reflection, ethics and collaboration can be assessed alongside technical skill.
- Wellbeing matters: no dark patterns, no infinite-scroll compulsion, no punitive streak loss.

## 8. Gamification policy

Allowed:

- XP for creating a post/comment once (unique event), completing a lesson, passing an assessment.
- Levels as a lightweight sense of progress.
- Achievement badges tied to verified evidence.
- Leaderboards scoped to a community and a time window, opt-in.

Forbidden:

- XP for logging in, clicking, scrolling or repeatedly liking.
- Purchasable XP or levels.
- Streak loss that punishes rest.
- Public ranking of minors without guardian consent.
- Ranking that exposes private learning data.

## 9. Assessment integrity

- Assessments state their purpose (practice, mastery, certification).
- Platform-issued achievements are clearly labelled as such; they are not formal accreditation.
- Credential verification exposes issuer, criteria and evidence — never a bare badge.
- AI may assist feedback but may not issue a credential or override an educator's judgement.

## 10. Arabic and multilingual learning

- Arabic is the default language of instruction, navigation and support.
- Scientific and technical terms may retain Latin script; the UI must handle bidi correctly.
- Content language is metadata, so a learner can find Arabic material inside a global platform.
- Translation is credited; machine translation is labelled.

## 11. Safeguarding and pedagogy

- Minors learn in age-appropriate spaces with restricted adult contact.
- Public leaderboards, profiling and messaging are limited for minors by default.
- Guardian consent is a gate for social features, not a checkbox buried in settings.
- Educators working with minors are verified before gaining that role.

## 12. Decision test

Before shipping a feature, ask:

1. Which stage of the learning cycle does it strengthen?
2. Does it reward understanding or just activity?
3. Can a learner demonstrate something real afterwards?
4. Is it safe for a 13-year-old and for an adult professional?
5. Can an independent educator configure it without platform staff?
6. Does it preserve the content and the learner's progress long-term?

If the answers are weak, redesign before building.
