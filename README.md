# WA Gold Rush - Educational Mathematics Game

A progressive financial mathematics simulation game for students, themed around Western Australian gold mining.

## Game Structure

### 📂 Directory Organization

```
wa-gold-rush/
├── levels/
│   ├── level-1-basic/           # ARCHIVED: Original 10-round game
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   ├── level-2-tycoon/          # (Coming soon)
│   ├── level-3-regions/         # (Coming soon)
│   ├── level-4-advanced/        # (Coming soon)
│   └── level-5-multiplayer/     # (Coming soon)
│
├── shared/                       # Shared utilities across levels
│   ├── game-config.json         # Game configuration & assets
│   ├── storage.js               # OneDrive & localStorage
│   └── shared-styles.css        # Common styling
│
├── teacher/                      # Teacher dashboard
│   ├── dashboard.html
│   ├── dashboard.js
│   └── dashboard-styles.css
│
├── index.html                    # Level selector (home page)
└── README.md
```

## Levels Overview

| Level | Name | Description | Duration | Features |
|-------|------|-------------|----------|----------|
| 1 | Basic Mining | Original game - single mine, 10 rounds fixed | 10 min | Dice rolls, 3 dig types |
| 2 | Mining Tycoon | Multiple mines, upgrades, machinery | Unending | Net worth calculation |
| 3 | WA Regions | Named locations with different risks | Unending | Regional strategy |
| 4 | Advanced | Random events, company mode | Unending | Risk management |
| 5 | Multiplayer | Class leaderboards, collaborative play | Ongoing | Social learning |

## Level 1: Basic Mining (Archived)

**Access:** `/levels/level-1-basic/index.html`

The original working game - preserved as-is for reference and student access.

- **Duration:** 10 rounds maximum
- **Starting Cash:** $100
- **Dig Types:** Safe (10%), Medium (50%), Deep Vein (300%)
- **Mechanics:** Dice rolls determine dig success

## Data Privacy

✅ **No identifying data stored offsite**
- All game data stored locally on student devices
- Teacher can export progress to OneDrive (encrypted, education tenant)
- Compliant with education department data policies

## Future Levels (In Progress)

See individual level directories for development status.

## Teacher Dashboard

Access: `/teacher/dashboard.html`

- Import student lists (bulk or individual)
- Assign students to levels
- Monitor real-time progress
- Pause game for lessons
- Export class data to OneDrive

## Getting Started

1. **For Students:** Click level in home page (`index.html`)
2. **For Teachers:** Navigate to `/teacher/dashboard.html`
3. **For Developers:** See DEVELOPMENT.md

## Technology

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Storage:** LocalStorage + OneDrive API (optional)
- **Compatibility:** iPad-optimized, works offline
- **No Backend Required:** Fully client-side

---

**Status:** Level 1 ✅ Complete | Levels 2-5 🚧 In Progress
