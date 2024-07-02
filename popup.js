const healthTips = [
  "Drinking water helps maintain the balance of bodily fluids.",
  "Staying hydrated helps maintain optimal blood pressure.",
  "Drinking water before meals can help you feel fuller and aid in weight loss.",
  "Hydration is key to maintaining healthy skin.",
  "Water helps lubricate and cushion joints.",
  "Drinking enough water can prevent headaches.",
  "Proper hydration helps your body absorb nutrients better.",
  "Eat a variety of fruits and vegetables to get a range of nutrients.",
  "Include lean proteins in your diet such as fish, poultry, and legumes.",
  "Choose whole grains over refined grains.",
  "Limit your intake of added sugars.",
  "Eat healthy fats like those found in avocados, nuts, and olive oil.",
  "Reduce your sodium intake by avoiding processed foods.",
  "Portion control is important for maintaining a healthy weight.",
  "Incorporate more fiber into your diet with fruits, vegetables, and whole grains.",
  "Avoid trans fats found in many processed and fried foods.",
  "Make sure to include enough calcium and vitamin D for bone health.",
  "Try to eat more plant-based meals.",
  "Drink green tea for its antioxidant properties.",
  "Limit your intake of red and processed meats.",
  "Limit alcohol consumption.",
  "Avoid exposure to environmental toxins and pollutants.",
  "Get regular medical screenings and check-ups.",
  "Limit consumption of processed meats.",
  "Use sunscreen with SPF 30 or higher.",
  "Reduce your risk of infection by washing your hands regularly.",
  "Walk or bike to your destinations when possible.",
  "Mix up your workouts to avoid plateaus and boredom.",
  "Stay hydrated before, during, and after exercise.",
  "Warm up before starting your workout to prepare your body for physical activity."
];


function getRandomTip() {
    const randomIndex = Math.floor(Math.random() * healthTips.length);
    return healthTips[randomIndex];
}

document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get(['interval', 'enableJokes'], (data) => {
      document.getElementById('interval').value = data.interval || 30;
      document.getElementById('enableJokes').checked = data.enableJokes !== false; // Default to true
    });
  
    // Save settings
    document.getElementById('saveBtn').addEventListener('click', () => {
      const interval = parseInt(document.getElementById('interval').value);
      const enableJokes = document.getElementById('enableJokes').checked;
  
      chrome.storage.sync.set({
        interval: interval,
        enableJokes: enableJokes
      }, () => {
        alert('Settings saved!');
        // Update the alarm with new interval
        chrome.alarms.clear("waterReminder", () => {
          chrome.alarms.create("waterReminder", { periodInMinutes: interval });
        });
      });
    });
  
    // Display a random health tip
    document.getElementById('healthTip').innerText = getRandomTip();
  });
