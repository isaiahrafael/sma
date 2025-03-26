# Simulation Modelling Analysis
This repo is created by Isaiah Rafael Tugano Blauta for Term 6 SMA.

Anyway, this Git repo will contain most, if not all, SMA related code.

Take note of updates via the **'LAST COMMIT MESSAGE'** column to see whether I modified anything.
Feel free to clone this repo, but please use it at your discretion.

---

## Cloning and Using This Repository

If you want to use the code, follow these steps:

### 1. Clone the Repository

#### Using the Terminal

Open your terminal and run:

```sh
git clone https://github.com/isaiahrafael/sma.git
```

#### Using Visual Studio Code

1. **Open Visual Studio Code**
   - Launch Visual Studio Code on your computer.
2. **Open the Command Palette**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS).
3. **Run the Git: Clone Command**
   - Type `Git: Clone` and select it.
4. **Enter the Repository URL**
   - When prompted, enter:
     ```
     https://github.com/isaiahrafael/sma.git
     ```
5. **Select a Local Folder**
   - Choose where to save the cloned repository.

---

### 2. Create a New Branch Before Making Changes

Before modifying anything, create a new branch based on `main` using your name. This ensures your changes remain separate from the main code.

#### Using the Terminal

After cloning, navigate to the repository folder and run:

```sh
git checkout -b your-name
```

(Replace `your-name` with your actual name or a meaningful branch name.)

#### Using Visual Studio Code

1. **Open Source Control** (click the Git icon in the left sidebar).
2. Click on the current branch name in the bottom-left corner.
3. Select **"Create new branch"**.
4. Enter your branch name (e.g., your name) and press **Enter**.

---

### 3. Push Your Branch (If You Want to Share Your Changes)

Once you have made changes, commit them and push your branch to the remote repository.

#### Using the Terminal

```sh
git add .
git commit -m "Your commit message"
git push origin your-name
```

(Replace `your-name` with your branch name.)

Now, your changes are safely stored on your own branch and won’t affect the `main` branch unless merged.
