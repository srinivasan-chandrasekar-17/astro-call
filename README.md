# ASTRO-CALL — Vedic Birth Chart Generator

A single-page, 100% client-side Vedic Astrology birth chart generator with high-precision astronomical calculations, traditional South Indian 4×4 Rāśi chart, Krishnamurti Paddhati (KP) Sub-Lords, Vimshottari Mahadasha system, and 160+ Tamil Nadu cities and towns.

Designed to be hosted for free on **GitHub Pages** with **zero build steps, zero external dependencies, zero backend servers, and zero API costs**.

---

## Live Demo & Free GitHub Pages Hosting

Once deployed to your GitHub repository, this web application is instantly live at:
```
https://<your-github-username>.github.io/<your-repo-name>/
```

---

## Key Features

- **Single-Screen Workspace**: Topbar inputs (Date, Time, Country, State, City) and complete astrological output (South Indian chart, planetary table, KP sub-lords, Dasa summary) on a single responsive screen.
- **Astronomical Precision**: Jean Meeus analytical planetary ephemeris (VSOP87 / ELP2000 planetary theory) with Indian Mean Node convention matching traditional ephemerides.
- **KP Sub-Lord Engine**: Complete Nakshatra Lord, Sub-Lord, and Sub-Sub-Lord calculations for Lagna and all celestial bodies.
- **South Indian 4×4 Rāśi Chart**: Fixed 12-sign matrix starting from Pisces (top-left) with highlighted Lagna and planetary placements.
- **160+ Tamil Nadu Places**: Pre-bundled with exact coordinates across all 38 districts of Tamil Nadu (Chennai, Madurai, Coimbatore, Kumbakonam, Thanjavur, Rameswaram, Palani, Tirunelveli, and more).
- **5 Ayanamsa Systems**: Lahiri (Chitrapaksha — Indian Standard), B.V. Raman, KP New, Sri Yukteshwar, and Fagan-Bradley.
- **Print & PDF Export**: Built-in A4 landscape print stylesheet for generating clean birth chart certificates.

---

## Project Structure

```
astro-chat/
├── index.html                  # Main single-page web application
├── styles.css                  # Modern dark-mode UI & print styles
├── app.js                      # UI controller, event handlers & chart rendering
├── astro.js                    # Offline astronomical ephemeris & KP engine
├── cities.js                   # 160+ Tamil Nadu cities and Indian coordinates
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── .gitignore                  # Git ignore rules
└── README.md                   # Documentation and deployment guide
```

---

## How to Deploy to GitHub Pages (Step-by-Step)

### Step 1: Initialize Git and Commit
Open Terminal on your computer, navigate to this project folder, and run:

```bash
cd /path/to/astro-chat

# Initialize git repository
git init -b main

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: ASTRO-CALL Vedic Birth Chart Generator"
```

---

### Step 2: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Enter a **Repository name** (e.g. `astro-chat` or `astrocall`).
3. Set the repository to **Public**.
4. Leave **"Add a README file"**, **".gitignore"**, and **"Choose a license"** unchecked (we already have them).
5. Click **Create repository**.

---

### Step 3: Push Code to GitHub
Copy the commands shown on GitHub under **"…or push an existing repository from the command line"** and run them in your terminal:

```bash
# Link your local repo to GitHub (replace with your GitHub username and repository name)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push to GitHub
git push -u origin main
```

---

### Step 4: Enable Free GitHub Pages Hosting
1. On your GitHub repository page, click the **Settings** tab (gear icon at the top).
2. On the left sidebar, click **Pages** (under the "Code and automation" section).
3. Under **Build and deployment**:
   - **Source**: Select **Deploy from a branch**.
   - **Branch**: Select `main` and folder `/ (root)`.
   - Click **Save**.
   *(Alternatively, under Source select **GitHub Actions** to use the bundled `.github/workflows/deploy.yml` workflow).*
4. Wait approximately 30 to 60 seconds.
5. Refresh the page. You will see a banner at the top:
   > **"Your site is live at `https://<your-username>.github.io/<your-repo-name>/`"**
6. Click the link to open your live application!

---

## Running Locally

To preview or run locally without an internet connection, simply open `index.html` in any web browser:
- **macOS**: Double-click `index.html` or run `open index.html` in Terminal.
- **Windows**: Double-click `index.html` or run `start index.html` in Command Prompt.
- **Local Dev Server (Optional)**:
  ```bash
  python3 -m http.server 8000
  # Then open http://localhost:8000 in your browser
  ```

---

## License

MIT License. See [LICENSES.md](LICENSES.md) for third-party acknowledgments.
