# Paive

Build a modern, professional, dark-themed web application called PAiVE (Project AI Value Engineering).

Use the design language and visual style of the existing PAiVE demo (https://paive.pages.dev) as inspiration:
- Dark background (#0B1120)
- Blue accent colors (Primary #00B3FF, Secondary #3B82F6)
- Card background (#162033) with glassmorphism/light shadow effects
- Clean BIM/engineering software appearance inspired by Autodesk Construction Cloud and Power BI dashboards
- Significantly larger font sizes than the original demo: Page Title 36px, Section Title 24px, Card Content 18px, Small Text 16px minimum (no tiny text anywhere, strict minimum 16px)
- Optimized for desktop use, centered layout with 1400px max width, rounded corners (16px)
- High readability, Inter font

The application is a single-page vertical workflow dashboard with 4 main sections and a fixed top header:

Top Header (Fixed):
- Left: PAiVE logo & "Project AI Value Engineering"
- Right: Project Selector (e.g. "[ Verona Hospital ]") and user profile avatar

Section 1: Upload IFC + Cost Data
- Large card titled "1. Upload IFC Model" with description "Upload a new IFC version and associated cost data."
- IFC Upload Area: Drag & Drop Zone with "Select IFC File" button, displays uploaded file (e.g., ifc_filename.ifc) and state
- Cost Data Upload: Button "Upload Cost File" (supports xlsx, csv)
- Project Summary card displaying Model Version, Number of Elements, Building Area, Cost Dataset with realistic mock data

Section 2: Change Analysis + BIM Viewer (Two-column layout, largest section)
- Left Column:
  - Change Requirement Card: Title "Change Requirement", example "Move external wall by 2 meters", "Submitted by: Client", "Status: Analyzing" with colored status badges
  - Affected Elements List: Title "Affected Elements", interactive table showing Element (e.g., Wall W-101, Door D-11, Window WIN-07), Type (IfcWall, IfcDoor, IfcWindow), Cost Impact (+ €5,200, + €1,000, + €800)
- Right Column:
  - BIM Model Viewer: 700px height container titled "BIM Model Viewer", featuring an interactive 3D BIM model view with 3D structural elements (walls, slabs, windows, doors) that users can orbit/rotate, highlight, and select, labeled as ready for That Open Engine / IFC.js integration
  - Element Properties Panel: Displaying GUID, Element Type, Cost Code, Current Cost, Status for the active/selected element

Section 3: Value Engineering Results
- Title "3. Value Engineering Analysis"
- 3 side-by-side alternative solution cards:
  - Option A: "Lowest Cost" (+ €27,000, Schedule +5 Days, Risk: Low, Compliance: Pass) with green border (#10B981)
  - Option B: "Balanced Option" (+ €35,000, Schedule +2 Days, Risk: Low, Compliance: Pass) with blue border (#00B3FF) and "Recommended" badge
  - Option C: "Schedule Optimized" (+ €61,000, Schedule 0 Days, Risk: Medium, Compliance: Pass) with orange/warning border (#F59E0B)
- Interactive selection to choose an option
- Comparison Section below: Matrix table with Criteria (Cost, Schedule, Risk, Compliance, Carbon Impact) across Option A, Option B, and Option C

Section 4: Decision & History
- Title "4. Decision & Approval"
- Decision Card with action buttons: "Approve" (primary blue), "Request Revision", "Reject"
- Decision Rationale multiline comment box with placeholder "Provide decision rationale..."
- Version History: Timeline view (Version 01 Initial Upload, Version 02 Wall Modification, Version 03 Value Engineering Review)
- Export Actions at bottom: "Export PDF Report", "Export CSV", "Save Decision" with interactive feedback / toast notifications

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://paive.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/92cb6d39-1f4b-4d8f-bd1c-b67dfdd0d787).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
