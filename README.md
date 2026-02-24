# Noita Wand Web App

This project is a static web experience, so you can host it directly on GitHub without adding a backend. Follow the steps below to publish the current folder as a GitHub repository and serve it via GitHub Pages.

## 1. Prepare Your Local Project
1. Install [Git](https://git-scm.com/download/win) if it is not already installed.
2. Open a terminal (PowerShell is fine) and `cd` into the project directory:
   ```powershell
   cd "d:\Small Project\Web, Noita Wand"
   ```
3. (Optional) Run the project locally by opening `index.html` in a browser to ensure it looks correct before publishing.

## 2. Initialize the Git Repository
1. Initialize Git and create the initial commit:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Set your Git identity if prompted:
   ```powershell
   git config user.name "Your Name"
   git config user.email "you@example.com"
   ```

## 3. Create the Remote Repository on GitHub
1. Sign in to https://github.com/ and click **New repository**.
2. Enter a repository name (for example, `noita-wand-web`), keep it **Public**, and **do not** initialize with a README (you already have one locally).
3. Click **Create repository**. GitHub will show instructions for pushing an existing repository; leave that tab open.

## 4. Connect Local to Remote and Push
1. Add the GitHub remote URL that GitHub just displayed:
   ```powershell
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   ```
2. Push the local main branch to GitHub:
   ```powershell
   git branch -M main
   git push -u origin main
   ```
3. Refresh the GitHub repository page to confirm that `index.html`, `styles.css`, `app.js`, and `spells.json` are visible.

## 5. Enable GitHub Pages Hosting (No Backend Needed)
1. In the GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Set **Branch** to `main` and **/ (root)** for the folder, then click **Save**.
4. GitHub Pages will provision a URL like `https://<your-username>.github.io/<repo-name>/`. It may take a minute to go live—refresh until the **Status** shows **Published**.

## 6. Verify the Live Site
1. Visit the GitHub Pages URL. Because this is a static site, everything should load without any additional configuration.
2. If assets fail to load, ensure your file paths inside `index.html` are relative (e.g., `./styles.css`, `./app.js`).
3. Use the browser dev tools (F12) to check for console errors, then fix and re-deploy by committing and pushing again:
   ```powershell
   git add .
   git commit -m "Fix asset paths"
   git push
   ```

## 7. Ongoing Updates
1. Edit files locally.
2. Run `git status` to see changes, then commit and push:
   ```powershell
   git add .
   git commit -m "Describe your change"
   git push
   ```
3. GitHub Pages automatically redeploys after each push to `main`. Reload the live URL to confirm.

You now have version control plus free static hosting for this project directly on GitHub.