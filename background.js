// Variables to keep track of the reminder state (less reliance on global vars)
// Settings are primarily read from storage when needed

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  if (message.action === 'startReminder') {
    // Pass sendResponse to allow async response
    startReminder(message.interval, message.messageStyle, sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.action === 'stopReminder') {
     // Pass sendResponse to allow async response
    stopReminder(sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.action === 'showNotification') {
    if (message.title && message.message) {
         showNotification(message.title, message.message, message.requireInteraction || false);
         sendResponse({ status: 'Notification display requested' });
    } else {
         console.error("Missing title or message for showNotification");
         sendResponse({ status: 'Error: Missing title or message', error: true });
    }
    // No return true needed here if response is immediate
  }
  // Default return false if no async operation started for this message type
  // return false; // Or handle other message types
});

// When the extension is installed or updated, or Chrome is updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  initializeDefaultsAndAlarms();
});

// When Chrome starts up
chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome started up.');
    initializeDefaultsAndAlarms(); // Re-initialize alarms if needed
});

function initializeDefaultsAndAlarms() {
  chrome.storage.local.get([
    'interval', 'goal', 'messageStyle', 'active', 'lastDate'
    // Don't need waterCount, etc. here, just settings affecting alarms
  ], (data) => {
    const defaults = {
      interval: data.interval || 30,
      goal: data.goal || 8, // Keep goal default for consistency
      messageStyle: data.messageStyle || 'standard',
      active: data.active || false,
      lastDate: data.lastDate || new Date().toLocaleDateString() // Ensure lastDate is set
    };

     // Set defaults (or existing values) back into storage to ensure all keys exist
    chrome.storage.local.set(defaults, () => {
        console.log('Defaults/current settings ensured:', defaults);
        // If it was active, restart the reminder
        if (defaults.active) {
             console.log('Reminder was active, restarting on init...');
            // Use a dummy sendResponse as we don't need to reply to anyone here
            startReminder(defaults.interval, defaults.messageStyle, () => {});
        } else {
            console.log('Reminder is inactive on init.');
            // Make sure alarm is definitely cleared if state is inactive
             stopReminder(() => {}); // Use dummy sendResponse
        }
    });
  });
}

// Set up the alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired:', alarm.name);
  if (alarm.name === 'waterReminderAlarm') {
    // Check storage directly to ensure we have the latest state
    chrome.storage.local.get(['active', 'messageStyle', 'goal', 'waterCount', 'remindersCount'], (data) => {
        if (data.active) {
            console.log('Reminder active, sending notification.');
            // Avoid sending if goal already met? Optional.
            // if ((data.waterCount || 0) < (data.goal || 8)) {
                 sendReminderNotification(data.messageStyle || 'standard');
                 // Increment reminders count
                 const count = (data.remindersCount || 0) + 1;
                 chrome.storage.local.set({ remindersCount: count });
                 console.log('Reminder count updated to:', count);
            // } else {
            //    console.log('Goal already reached, skipping reminder notification.');
            // }
        } else {
            console.log('Alarm fired, but reminder is inactive. Stopping alarm.');
            // Attempt to clear the alarm again just in case.
            stopReminder(() => {}); // Use dummy sendResponse
        }
    });
  }
});

// Start the reminder
function startReminder(interval, msgStyle, sendResponse) {
  // Ensure interval is valid
   const numericInterval = parseFloat(interval);
   if (isNaN(numericInterval) || numericInterval < 0.1) {
        console.error('Invalid interval received:', interval);
        sendResponse({ status: 'Error: Invalid interval', error: true });
        return;
   }

  // 1. Clear any existing alarm FIRST
  chrome.alarms.clear('waterReminderAlarm', (wasCleared) => {
    console.log('Previous alarm cleared before starting:', wasCleared);

    // 2. Create the new alarm
    chrome.alarms.create('waterReminderAlarm', {
      delayInMinutes: numericInterval, // Use the provided interval for the first trigger
      periodInMinutes: numericInterval
    });
    console.log(`Alarm 'waterReminderAlarm' created. Triggering every ${numericInterval} minutes.`);

    // 3. Update storage to set active state and save current settings
    chrome.storage.local.set({
        active: true,
        interval: numericInterval, // Store the validated numeric value
        messageStyle: msgStyle
     }, () => {
         if (chrome.runtime.lastError) {
              console.error('Error saving active state:', chrome.runtime.lastError.message);
              sendResponse({ status: 'Error: Failed to save state', error: true });
         } else {
            console.log('Reminder state set to active and settings saved.');
            sendResponse({ status: 'Reminder started successfully' });
         }
     });
  });
}

// Stop the reminder
function stopReminder(sendResponse) {
  // 1. Clear the alarm
  chrome.alarms.clear('waterReminderAlarm', (wasCleared) => {
    if (chrome.runtime.lastError) {
        console.error('Error clearing alarm:', chrome.runtime.lastError.message);
        // Still try to set inactive state
    } else {
        console.log('Alarm "waterReminderAlarm" cleared:', wasCleared);
    }

    // 2. Update storage to set inactive state
    chrome.storage.local.set({ active: false }, () => {
       if (chrome.runtime.lastError) {
           console.error('Error setting inactive state:', chrome.runtime.lastError.message);
           sendResponse({ status: 'Error: Failed to save state', error: true });
       } else {
           console.log('Reminder state set to inactive.');
           sendResponse({ status: 'Reminder stopped successfully' });
       }
    });
  });
}

// Send a reminder notification (triggered by alarm)
function sendReminderNotification(style) {
  console.log('Preparing reminder notification. Style:', style);
  const message = getRandomMessage(style);
  showNotification('Hydration Reminder', message, false);
}

// Show a standard notification
function showNotification(title, message, requireInteraction = false) {
  const notificationId = `hydration-reminder-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/water-128.png', // Ensure you have this icon
    title: title,
    message: message,
    priority: 2,
    requireInteraction: requireInteraction
  }, (createdId) => {
       if (chrome.runtime.lastError) {
            console.error('Notification creation failed:', chrome.runtime.lastError.message);
        } else {
            console.log('Notification created successfully. ID:', createdId);
        }
  });
}

// Get a random message based on the style
function getRandomMessage(style) {
  const messages = {
    standard: [
      "Time to hydrate! Drink some water.", "Water break! Take a sip.",
      "Don't forget to drink water!", "Hydration check: Have some water.",
      "A quick reminder to drink water."
    ],
    motivational: [
      "Stay hydrated, stay focused! Drink up!", "Your body needs water to perform its best. Hydrate now!",
      "Fuel your success with water!", "Keep crushing your goals – and stay hydrated!",
      "Hydration is key! Take a moment for water."
    ],
    friendly: [
      "Hey! Just a friendly nudge to drink some water.", "How about a refreshing glass of water?",
      "Water time! Cheers!", "Psst... time for some H2O!",
      "Your water bottle misses you!"
    ],
    health: [
      "Water boosts brain function. Drink up!", "Keep your body happy – hydrate!",
      "Drinking water aids digestion. Have a sip!", "Stay energized with water!",
      "Good hydration supports overall health. Drink water!"
    ]
  };
  const categoryMessages = messages[style] || messages.standard;
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}

// --- Notification Event Listeners ---
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  // Optional: Record water intake on click? Maybe better via popup button.
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    console.log('Notification closed:', notificationId, 'By user:', byUser);
});