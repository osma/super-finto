# Super Finto 🍄
### *Semantic Platform Adventure*
[**Play Super Finto Live!**](https://osma.github.io/super-finto/)

![Super Finto Gameplay Placeholder](path/to/gameplay_screenshot.png)

**Super Finto** is an experimental platformer that reimagines the **General Finnish Ontology (YSO)** as a multilingual game world. Drawing inspiration from the legendary *Super Mario Bros. (NES)* and the golden era of 8-bit and 16-bit gaming, it transforms a complex conceptual vocabulary into an interactive journey through nearly 32,000 unique levels.

---

## 🧚 Who is Finto?
**Finto** is a mysterious elf-like character with a curious mind. Far from being a typical hero, Finto is a researcher of the digital ether, exploring conceptual universes and seeking to understand the relationships that bind our knowledge together.

## 🕹️ Game Mechanics

### Conceptual Exploration
The game begins at the **root level of YSO**. Each level represents a specific concept in the ontology, connected by a network of pipes:
- **End Pipes:** Descend deeper into the sub-concepts of the hierarchy.
- **Bottom Pipes:** Warp to related concepts or horizontal associations.

### The Tree of Knowledge
As you explore "leaf concepts" (the most specific terms in the ontology), you can collect **Leaves**. Picking these up contributes to the growth of the **Tree** displayed on the side panel—a living visualization of your progress through the semantic landscape.

### Semantic Monsters
The enemies you encounter aren't just random creatures; they represent **Alternate Labels**—synonyms, obsolete terms, or hidden labels that shouldn't be used for indexing.
- **Defeat them:** Jump on their heads or bump them from below to clear the conceptual space of redundant data.

### Wikidata Parcels
Bumping into **Question Mark Blocks** reveals either coins or **Wikidata Parcels**. These parcels represent persistent identifiers (Wikidata QIDs).
- **Pro Tip:** Finto loves persistent identifiers! Collecting a parcel makes Finto grow bigger and stronger.

---

## 🎮 Controls

| Action | Keys |
| :--- | :--- |
| **Move** | `A` / `D` or `Left` / `Right Arrow` |
| **Jump** | `W` / `Space` or `Up Arrow` |
| **Crouch** | `S` or `Down Arrow` |
| **Mute Music** | `M` |
| **Pause** | `P` |
| **Quit to Menu** | `Q` |

---

## 🛠️ Development Setup

Super Finto is built with **Vite**. The project uses **Bun** as the primary package manager, but is also compatible with **npm**.

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone git@github.com:osma/super-finto.git
   cd super-finto
   ```

2. **Install dependencies:**
   ```bash
   bun install
   # OR
   npm install
   ```

3. **Run the development server:**
   ```bash
   bun run dev
   # OR
   npm run dev
   ```

4. **Build for production:**
   ```bash
   bun run build
   # OR
   npm run build
   ```

---

## 🔧 Technical Implementation

Super Finto is a product of **"Vibe Coding"**, built using modern AI-assisted development tools and workflows.

- **Engine:** Pure JavaScript/HTML5 Canvas.
- **Code Generation:** Developed using **Google Antigravity** (Gemini and Claude models).
- **Asset Generation:** 
  - **Backgrounds:** Unique images for all ~32,000 concepts generated via a pipeline using **Gemma3** (text-to-prompt) and **Poltergeist Mix v5.5** (Stable Diffusion 1.5).
  - **Music:** Audio engine based on **AutoTracker** by Vitling.
- **Data:** Powered by the **YSO (General Finnish Ontology)** via the Finto API.

---

## 📜 License & Credits

**Developed by: [Osma Suominen](https://github.com/osma)**

- **Game Code & Images:** Released under **CC0 (Creative Commons Zero)**. This project is a tribute to the public domain and the possibilities of AI-generative art.
- **Music:** **AutoTracker** by [Vitling](https://github.com/vitling/autotracker), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Fonts:** Respective licenses apply.

---
*Created with ❤️ for the world of Linked Data.*
