document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded.');
  // Use async function to allow await inside
  (async () => {
      await loadSettingsAndState(); // Wait for initial load
      setupEventListeners();
  })();
});

// Make load async to potentially use await inside if needed later
async function loadSettingsAndState() {
  console.log('Loading settings and state from storage...');
  // Promisify chrome.storage.local.get
  const data = await new Promise((resolve) => {
      chrome.storage.local.get([
          'interval', 'goal', 'messageStyle', 'active',
          'waterCount', 'lastDrink', 'remindersCount', 'lastDate', 'darkMode'
      ], (result) => resolve(result));
  });

  console.log('Data loaded:', data);

  // --- Theme ---
  const isDarkMode = data.darkMode || false;
  document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  if (document.getElementById('theme-toggle')) { // Check element exists
      document.getElementById('theme-toggle').checked = isDarkMode;
  }

  // --- Settings Inputs ---
  // Set default values for the UI elements
  const defaultInterval = 30;
  const defaultGoal = 8;
  const defaultMessageStyle = 'standard';

  document.getElementById('interval').value = data.interval || defaultInterval;
  document.getElementById('goal').value = data.goal || defaultGoal;
  document.getElementById('message-style').value = data.messageStyle || defaultMessageStyle;

  // --- Daily Reset Logic ---
  const currentDate = new Date().toLocaleDateString();
  let waterCount = data.waterCount === undefined ? 0 : data.waterCount;
  let remindersCount = data.remindersCount === undefined ? 0 : data.remindersCount;
  let lastDrink = data.lastDrink || 'Not yet recorded';
  let lastDate = data.lastDate || currentDate; // Use current date if none saved

  if (lastDate !== currentDate) {
      console.log(`New day detected. Old: ${lastDate}, New: ${currentDate}. Resetting counts.`);
      waterCount = 0;
      remindersCount = 0;
      lastDrink = 'Not yet recorded';
      lastDate = currentDate; // Update the date to today
      // Save the reset values and the new date immediately
      await new Promise(resolve => chrome.storage.local.set({
          waterCount: 0,
          remindersCount: 0,
          lastDrink: 'Not yet recorded',
          lastDate: currentDate
      }, resolve));
      console.log('Daily counts reset in storage.');
  } else {
     // Ensure lastDate is stored if it was missing
     if (!data.lastDate) {
           await new Promise(resolve => chrome.storage.local.set({ lastDate: currentDate }, resolve));
     }
  }

  // --- Update UI Display Elements ---
  updateUIDisplay(data.active || false, waterCount, data.goal || defaultGoal, lastDrink, remindersCount);
}


function setupEventListeners() {
  // Use async handlers to await chrome.runtime.sendMessage
  document.getElementById('start').addEventListener('click', handleStartClick);
  document.getElementById('stop').addEventListener('click', handleStopClick);
  document.getElementById('drink').addEventListener('click', handleDrinkClick);
  document.getElementById('reset').addEventListener('click', handleResetClick);

  // Theme toggle listener
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
      themeToggle.addEventListener('change', handleThemeToggle);
  }

  // Listen for changes in settings inputs to potentially save them
  document.getElementById('interval').addEventListener('change', handleSettingsChange);
  document.getElementById('goal').addEventListener('change', handleSettingsChange);
  document.getElementById('message-style').addEventListener('change', handleSettingsChange);

  console.log('Event listeners set up.');
}

// Updates only the display parts of the UI (progress, stats, buttons)
function updateUIDisplay(isActive, currentCount, goal, lastDrink, remindersCount) {
  console.log(`Updating UI Display: active=${isActive}, count=${currentCount}, goal=${goal}, lastDrink=${lastDrink}, reminders=${remindersCount}`);

  // Update Button Visibility
  document.getElementById('start').style.display = isActive ? 'none' : 'block';
  document.getElementById('stop').style.display = isActive ? 'block' : 'none';

  // Update Progress Text
  document.getElementById('current-count').textContent = currentCount;
  document.getElementById('total-goal').textContent = goal;

  // Update Progress Bar
  const progressPercentage = goal > 0 ? Math.min((currentCount / goal) * 100, 100) : 0;
  const progressBar = document.getElementById('progress');
  if (progressBar) { // Check element exists
      progressBar.style.width = `${progressPercentage}%`;
      const progressText = document.getElementById('progress-text');
      if (progressText) {
          progressText.textContent = `${Math.round(progressPercentage)}%`;
      }
  }

  // Update Water Drops
  updateWaterDrops(currentCount, goal);

  // Update Stats
  document.getElementById('last-drink').textContent = lastDrink;
  document.getElementById('reminders-count').textContent = remindersCount;
}

// Handles changes to settings inputs
async function handleSettingsChange() {
    console.log("Settings input changed.");
    await saveSettings(); // Save the current settings
}

// Saves current settings from inputs to storage
async function saveSettings() {
    const intervalInput = document.getElementById('interval');
    const goalInput = document.getElementById('goal');
    const messageStyleInput = document.getElementById('message-style');

    const interval = parseFloat(intervalInput.value);
    const goal = parseInt(goalInput.value);
    const messageStyle = messageStyleInput.value;

    // --- Input Validation ---
    let isValid = true;
    if (isNaN(interval) || interval < 0.1) {
         console.warn('Interval input is invalid:', intervalInput.value);
         // Maybe add visual feedback to user (e.g., red border)
         // For now, we might prevent saving or revert to a default/previous value
         // Let's prevent saving bad values and log it.
         isValid = false;
         alert('Please enter a valid interval (minimum 0.1 minutes).');
    }
    if (isNaN(goal) || goal < 1) {
         console.warn('Goal input is invalid:', goalInput.value);
         isValid = false;
          alert('Please enter a valid daily goal (minimum 1 glass).');
    }

    if (!isValid) {
        console.log("Settings not saved due to invalid input.");
        // Optional: Reload settings to revert inputs to last saved state
        // await loadSettingsAndState();
        return false; // Indicate saving failed
    }

    const settings = {
      interval: interval,
      goal: goal,
      messageStyle: messageStyle,
    };

    await new Promise(resolve => chrome.storage.local.set(settings, resolve));
    console.log('Settings saved:', settings);

    // Refresh parts of the UI that depend on the goal
    updateUIDisplayGoal(goal);

     // If reminder is currently active, update the running alarm in background
    const data = await new Promise(resolve => chrome.storage.local.get('active', resolve));
    if(data.active) {
        console.log("Reminder is active, sending updated settings to background.");
        // Send message to background to update the alarm settings
        try {
             const response = await chrome.runtime.sendMessage({
                 action: 'startReminder', // Use startReminder to update/restart alarm
                 interval: interval,
                 messageStyle: messageStyle
             });
             console.log('Background response to settings update:', response);
             if (response?.error) {
                 alert(`Error updating active reminder: ${response.status}`);
             }
         } catch (error) {
             console.error("Error sending update message to background:", error);
             alert("Could not update active reminder settings. Check the extension console.");
         }
    }
    return true; // Indicate saving succeeded
}


// Separate function to update goal-dependent parts of the UI
function updateUIDisplayGoal(goal) {
     document.getElementById('total-goal').textContent = goal;
      chrome.storage.local.get('waterCount', (data) => {
           const currentCount = data.waterCount || 0;
            const progressPercentage = goal > 0 ? Math.min((currentCount / goal) * 100, 100) : 0;
            const progressBar = document.getElementById('progress');
            if (progressBar) {
                 progressBar.style.width = `${progressPercentage}%`;
                 const progressText = document.getElementById('progress-text');
                 if (progressText) {
                     progressText.textContent = `${Math.round(progressPercentage)}%`;
                 }
            }
            updateWaterDrops(currentCount, goal);
      });
}


async function handleStartClick() {
  console.log('Start button clicked.');
  // 1. Save current settings first (and validate them)
  const savedSuccessfully = await saveSettings();
  if (!savedSuccessfully) {
      console.log("Start aborted due to invalid settings.");
      return; // Don't proceed if settings are invalid/not saved
  }

  // 2. Get saved settings needed for starting
  const data = await new Promise(resolve => {
      chrome.storage.local.get(['interval', 'messageStyle'], resolve);
  });

  // 3. Send message to background
  console.log(`Sending startReminder message with interval: ${data.interval}`);
  try {
      const response = await chrome.runtime.sendMessage({
          action: 'startReminder',
          interval: data.interval,
          messageStyle: data.messageStyle
      });

      console.log('Background response to start:', response);
      // 4. Update UI based on successful response
      if (response && response.status === 'Reminder started successfully') {
          // Fetch fresh state to update UI accurately
          const currentState = await new Promise(resolve => {
               chrome.storage.local.get(['active', 'waterCount', 'goal', 'lastDrink', 'remindersCount'], resolve);
          });
           updateUIDisplay(
              currentState.active,
              currentState.waterCount || 0,
              currentState.goal || 8,
              currentState.lastDrink || 'Not yet recorded',
              currentState.remindersCount || 0
           );
      } else {
           // Alert based on error from background or generic message
           const errorMsg = response?.status || "Unknown error";
           alert(`Failed to start reminders: ${errorMsg}`);
           console.error("Start reminder failed, background response:", response);
      }
   } catch (error) {
       console.error("Error sending start message:", error);
       alert("Could not start reminders. Is the extension enabled and background script running? Check the extension console.");
   }
}

async function handleStopClick() {
  console.log('Stop button clicked.');
  // 1. Send message to background
   try {
      const response = await chrome.runtime.sendMessage({ action: 'stopReminder' });
      console.log('Background response to stop:', response);

      // 2. Update UI based on successful response
      if (response && response.status === 'Reminder stopped successfully') {
          // Fetch fresh state to update UI accurately
           const currentState = await new Promise(resolve => {
               chrome.storage.local.get(['active', 'waterCount', 'goal', 'lastDrink', 'remindersCount'], resolve);
           });
           updateUIDisplay(
              currentState.active, // Should be false now
              currentState.waterCount || 0,
              currentState.goal || 8,
              currentState.lastDrink || 'Not yet recorded',
              currentState.remindersCount || 0
           );
      } else {
           // Use the alert *you* saw, indicating a problem in background communication/logic
           const errorMsg = response?.status || "Unknown error";
           alert(`Failed to stop reminders properly: ${errorMsg}`); // Modified alert
           console.error("Stop reminder failed, background response:", response);
      }
   } catch (error) {
       console.error("Error sending stop message:", error);
       alert("Could not stop reminders. Is the extension enabled and background script running? Check the extension console.");
   }
}

async function handleDrinkClick() {
  console.log('Drink button clicked.');
  // Use await to ensure sequential operations
  const data = await new Promise(resolve => chrome.storage.local.get(['waterCount', 'goal', 'active', 'remindersCount'], resolve));

  let currentCount = data.waterCount || 0;
  const goal = data.goal || 8;

  if (currentCount < goal) {
      currentCount++; // Increment count
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format time

      await new Promise(resolve => chrome.storage.local.set({
          waterCount: currentCount,
          lastDrink: now
      }, resolve));

      console.log('Water count updated to:', currentCount, 'Last drink:', now);
      // Update UI immediately after saving
      updateUIDisplay(data.active, currentCount, goal, now, data.remindersCount || 0);

      // Check if goal was just reached
      if (currentCount === goal) {
          console.log('Goal reached!');
          // Send message to background to show notification
          try {
              await chrome.runtime.sendMessage({
                  action: 'showNotification',
                  title: 'Daily Goal Achieved!',
                  message: `Congratulations! You've reached your goal of ${goal} glasses.`,
                  requireInteraction: true
              });
          } catch(error) {
               console.error("Error sending goal achieved notification message:", error);
          }
      }
  } else {
      console.log('Goal already reached, no change in count.');
      alert("You've already reached your goal for today!");
  }
}

async function handleResetClick() {
  console.log('Reset button clicked.');
  if (confirm('Are you sure you want to reset your water intake progress and reminder counts for today?')) {
      console.log('Resetting progress...');

      // Define default values for inputs
      const defaultInterval = 30;
      const defaultGoal = 8;
      const defaultMessageStyle = 'standard';

      // 1. Reset storage values
      await new Promise(resolve => chrome.storage.local.set({
          waterCount: 0,
          remindersCount: 0,
          lastDrink: 'Not yet recorded'
          // Keep lastDate as it is
      }, resolve));
      console.log('Daily progress reset in storage.');

      // 2. Reset input fields in the popup
      document.getElementById('interval').value = defaultInterval;
      document.getElementById('goal').value = defaultGoal;
      document.getElementById('message-style').value = defaultMessageStyle;
      console.log('Input fields reset to defaults.');

      // 3. Update UI display elements
       // Get current active state to maintain button visibility correctly
       const data = await new Promise(resolve => chrome.storage.local.get(['active', 'goal'], resolve));
      updateUIDisplay(data.active, 0, data.goal || defaultGoal, 'Not yet recorded', 0);
  }
}

async function handleThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return; // Element check

  const isDarkMode = themeToggle.checked;
  console.log('Theme toggle changed. Dark mode:', isDarkMode);
  document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  await new Promise(resolve => chrome.storage.local.set({ darkMode: isDarkMode }, resolve));
}


function updateWaterDrops(count, goal) {
  const dropsContainer = document.getElementById('water-drops');
  if (!dropsContainer) return; // Exit if container not found

  dropsContainer.innerHTML = ''; // Clear existing drops

  // Determine number of drops to display (e.g., max 10 visual drops)
  const displayGoal = Math.min(goal, 10); // Show drops up to the goal, max 10
  const filledDrops = Math.min(count, displayGoal); // How many are filled

  for (let i = 0; i < displayGoal; i++) {
    const drop = document.createElement('div');
    drop.className = i < filledDrops ? 'drop filled' : 'drop';
    drop.title = i < filledDrops ? `Glass ${i + 1} (Drank)` : `Glass ${i + 1}`;
    dropsContainer.appendChild(drop);
  }
  console.log(`Updated water drops: ${filledDrops} filled out of ${displayGoal} displayed (Goal: ${goal})`);
}

// Utility to promisify chrome.runtime.sendMessage if needed elsewhere,
// but using await directly is often cleaner.
/*
function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
*/