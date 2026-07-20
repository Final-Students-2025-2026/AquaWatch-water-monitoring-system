# Arduino Code Modifications for Dashboard Device Assignment

Add these functions to your Arduino sketch to enable automatic device assignment from the dashboard.

## Global Variables (add after custom_server_url)
```cpp
String assignedDeviceId = "1";  // Default fallback device ID
String arduinoMacAddress = "";
```

## Function to Get Arduino MAC Address
```cpp
String getArduinoMacAddress() {
  String mac = WiFi.macAddress();
  // Convert to uppercase for consistency
  mac.toUpperCase();
  return mac;
}
```

## Function to Query Assigned Device
```cpp
void queryAssignedDevice() {
  String macAddress = getArduinoMacAddress();
  String serverUrl = "https://aquawatch-188s.onrender.com/api/arduino/assignment/?mac_address=" + macAddress;
  
  Serial.print("Querying assigned device for MAC: ");
  Serial.println(macAddress);
  
  HTTPClient http;
  http.begin(serverUrl);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.print("Assignment response: ");
    Serial.println(response);
    
    // Parse JSON response
    // Expected format: {"assigned": true, "device_id": 2, "device_name": "Sensor Name"}
    
    int assignedIndex = response.indexOf("\"assigned\":true");
    if (assignedIndex != -1) {
      int deviceIdIndex = response.indexOf("\"device_id\":");
      if (deviceIdIndex != -1) {
        int start = deviceIdIndex + 13; // Skip "device_id":
        int end = response.indexOf(",", start);
        if (end == -1) end = response.indexOf("}", start);
        assignedDeviceId = response.substring(start, end);
        
        Serial.print("Assigned to device ID: ");
        Serial.println(assignedDeviceId);
        
        // Display on OLED
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("Arduino Assigned:");
        display.println("Device ID: " + assignedDeviceId);
        display.display();
      }
    } else {
      Serial.println("No device assigned. Using default device ID: " + assignedDeviceId);
    }
  } else {
    Serial.print("Failed to query assignment. HTTP code: ");
    Serial.println(httpResponseCode);
    Serial.println("Using default device ID: " + assignedDeviceId);
  }
  
  http.end();
}
```

## Function to Display MAC Address on OLED
```cpp
displayMacAddressOnOLED() {
  String mac = getArduinoMacAddress();
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Arduino MAC Address:");
  display.println("");
  display.setTextSize(2);
  display.println(mac);
  display.display();
  
  Serial.println("MAC Address displayed on OLED: " + mac);
}
```

## Integration in setup()
```cpp
void setup() {
  // ... your existing setup code ...
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Display MAC address on OLED for 5 seconds
  displayMacAddressOnOLED();
  delay(5000);
  
  // Query assigned device from backend
  queryAssignedDevice();
  delay(2000);
  
  // ... rest of your setup code ...
}
```

## Integration in loop()
```cpp
void loop() {
  // ... your existing loop code ...
  
  // When making POST request, use assignedDeviceId instead of hardcoded "1"
  String url = serverUrl + "/api/readings/?device_id=" + assignedDeviceId;
  
  // ... rest of your POST request code ...
}
```

## Alternative: Add MAC Address to POST Request
If you prefer not to query on startup, you can add the MAC address to your POST request and let the backend handle the lookup:

```cpp
void loop() {
  // ... sensor reading code ...
  
  String macAddress = getArduinoMacAddress();
  String url = serverUrl + "/api/readings/?mac_address=" + macAddress;
  
  // The backend will automatically look up the assigned device
  // and use that device_id for data storage
}
```

## Testing
1. Upload modified code to Arduino
2. On startup, OLED will display MAC address for 5 seconds
3. Arduino will query backend for assigned device
4. Serial Monitor will show assignment status
5. Use the displayed MAC address in dashboard to assign sensor

## Notes
- The fallback device ID is "1" if no assignment is found
- MAC address query happens once on startup
- You can call queryAssignedDevice() in loop() if you want real-time updates
- The MAC address is displayed on OLED so you can easily copy it to the dashboard
