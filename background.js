// Set default values and set alarm on extension installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
      interval: 30,
      enableJokes: true
    }, () => {
      setAlarm();
    });
  });
  
  // Function to set the alarm with the specified interval
  function setAlarm() {
    chrome.storage.sync.get(['interval'], (data) => {
      chrome.alarms.clearAll(() => {
        chrome.alarms.create("waterReminder", { periodInMinutes: data.interval });
      });
    });
  }
  
  // Handle the alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "waterReminder") {
      sendNotification();
    }
  });
  
  // Function to send a notification with or without a joke
  function sendNotification() {
    chrome.storage.sync.get(['enableJokes'], (data) => {
      if (data.enableJokes) {
        fetchJoke();
      } else {
        showNotification("Time to drink water!", "Stay hydrated for your health!");
      }
    });
  }
  
  // Fetch a joke from a joke API
  function fetchJoke() {
    fetch('https://official-joke-api.appspot.com/random_joke')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(joke => {
        showNotification("Time to drink water!", `${joke.setup} - ${joke.punchline}`);
      })
      .catch(error => {
        console.error('Error fetching joke:', error);
        showNotification("Time to drink water!", "Couldn't fetch joke. Stay hydrated!");
      });
  }
  
  // Show a notification
  function showNotification(title, message) {
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icon48.png',
      title: title,
      message: message
    };
    chrome.notifications.create('waterNotification', notificationOptions);
  }
  
  // Listen for storage changes to update the alarm
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.interval) {
      setAlarm();
    }
  });