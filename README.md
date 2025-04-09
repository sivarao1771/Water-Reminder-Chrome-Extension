# Hydration Reminder Chrome Extension

A simple but effective Google Chrome extension designed to help you stay hydrated throughout the day. It provides customizable reminders to drink water and tracks your daily progress towards your hydration goals.

![VEDIO_DEMO](https://drive.google.com/uc?export=view&id=1B5kAAKJGTJvXseAaqHNHmZ5QDD801144)

## Features

* **Customizable Reminders:** Set how often (in minutes) you want to be reminded to drink water.
* **Daily Goal Setting:** Define your personal daily water intake goal (in glasses).
* **Notification Styles:** Choose from different reminder message styles (Standard, Motivational, Friendly, Health Facts).
* **Progress Tracking:** Visually track your progress towards your daily goal with a progress bar and water drop icons.
* **Stats:** See when you last recorded drinking water and how many reminders you've received today.
* **Background Operation:** Reminders work reliably using Chrome's Alarms API, even if Chrome is minimized or you're using other apps (as long as Chrome is running).
* **Automatic Daily Reset:** Your water intake count and reminders received count reset automatically each day.
* **Manual Reset:** Option to manually reset today's progress if needed.
* **Dark Mode:** Includes a toggle for a comfortable dark theme.
* **Persistent Settings:** Your preferences and progress are saved locally using `chrome.storage.local`.

## Installation

1.  **Download:** Clone this repository or download the source code as a ZIP file and unzip it.
    ```bash
    git clone [https://github.com/sivarao1771/Water-Reminder-Chrome-Extension.git](https://github.com/sivarao1771/Water-Reminder-Chrome-Extension.git)
    ```
2.  **Open Chrome Extensions:** Open Google Chrome, type `chrome://extensions` in the address bar, and press Enter.
3.  **Enable Developer Mode:** Ensure the "Developer mode" toggle switch (usually in the top-right corner) is turned ON.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Folder:** Navigate to and select the folder containing the extension's files (the folder with `manifest.json` inside).
6.  **Done!** The Hydration Reminder extension should now appear in your list of extensions and its icon should be visible in your browser toolbar. Click the icon to open the popup and configure your settings.

## Technologies Used

* JavaScript (ES6+)
* HTML5
* CSS3
* Chrome Extension APIs (`storage`, `alarms`, `notifications`, `runtime`)
* JSON (`manifest.json`)

