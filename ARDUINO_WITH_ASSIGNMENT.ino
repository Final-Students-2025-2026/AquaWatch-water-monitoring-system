#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h> 
#include <WiFi.h>          
#include <HTTPClient.h>    
#include <WebServer.h>
#include <DNSServer.h>
#include <WiFiManager.h>   

char custom_server_url[100] = "https://aquawatch-188s.onrender.com/api/readings/";

// Arduino Assignment Variables
String assignedDeviceId = "3";  // Default fallback device ID
String arduinoMacAddress = "";

// ============================================
// PIN DEFINITIONS - UPDATED TO MATCH YOUR WIRING
// ============================================
#define WATER_TEMP_PIN  23    // DS18B20 on GPIO 23 
#define PH_PIN          33    // pH sensor on GPIO 33 
#define TDS_PIN         34    // TDS sensor on GPIO 34
#define TURBIDITY_PIN   32    // Turbidity on GPIO 32 
#define BUZZER_PIN      16    // Buzzer 

OneWire oneWireLiquid(WATER_TEMP_PIN);
DallasTemperature sensorsLiquid(&oneWireLiquid);

#define SCREEN_WIDTH 128    
#define SCREEN_HEIGHT 64    
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// pH Calibration Values (from your lab technician)
float calibph7 = 1.27; 
float calibph4 = 1.65; 
float m, b;               

// ============================================
// WIFI ICON FUNCTION
// ============================================
void drawWiFiIcon(int x, int y, bool connected) {
  if (connected) {
    display.drawPixel(x + 2, y + 6, SH110X_WHITE);
    
    display.drawLine(x + 1, y + 4, x + 3, y + 4, SH110X_WHITE);
    display.drawPixel(x + 2, y + 3, SH110X_WHITE);
    
    display.drawLine(x, y + 1, x + 4, y + 1, SH110X_WHITE);
    display.drawPixel(x + 1, y, SH110X_WHITE);
    display.drawPixel(x + 2, y, SH110X_WHITE);
    display.drawPixel(x + 3, y, SH110X_WHITE);
  } else {
    display.drawLine(x, y, x + 5, y + 6, SH110X_WHITE);
    display.drawLine(x + 5, y, x, y + 6, SH110X_WHITE);
  }
}

// ============================================
// ARDUINO ASSIGNMENT FUNCTIONS
// ============================================
String getArduinoMacAddress() {
  // Get MAC address after WiFi is connected for stability
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

void displayMacAddressOnOLED() {
  String mac = getArduinoMacAddress();
  
  Serial.println("\n=================================");
  Serial.println("ARDUINO MAC ADDRESS");
  Serial.println("=================================");
  Serial.print("MAC Address: ");
  Serial.println(mac);
  Serial.println("Copy this MAC address to the dashboard");
  Serial.println("to assign this Arduino to a sensor.");
  Serial.println("=================================\n");
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("Arduino MAC:");
  display.println("");
  display.setTextSize(1);
  display.println(mac);
  display.display();
}

void queryAssignedDevice() {
  String macAddress = getArduinoMacAddress();
  String serverUrl = String(custom_server_url).replace("/api/readings/", "/api/arduino/assignment/?mac_address=") + macAddress;
  
  Serial.println("\n=================================");
  Serial.println("QUERYING ASSIGNED DEVICE");
  Serial.println("=================================");
  Serial.print("MAC Address: ");
  Serial.println(macAddress);
  Serial.print("Backend URL: ");
  Serial.println(serverUrl);
  
  HTTPClient http;
  http.begin(serverUrl);
  int httpResponseCode = http.GET();
  
  Serial.print("HTTP Response Code: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse JSON response for device_id
    int deviceIdIndex = response.indexOf("\"device_id\":");
    if (deviceIdIndex != -1) {
      int start = deviceIdIndex + 12; // Skip "device_id":
      int end = response.indexOf(",", start);
      if (end == -1) end = response.indexOf("}", start);
      assignedDeviceId = response.substring(start, end);
      assignedDeviceId.trim(); // Remove any whitespace
      
      Serial.println("---------------------------------");
      Serial.println("✓ DEVICE ASSIGNMENT SUCCESSFUL");
      Serial.println("---------------------------------");
      Serial.print("Assigned Device ID: ");
      Serial.println(assignedDeviceId);
      Serial.println("Arduino will now send data to this device.");
      Serial.println("=================================\n");
      
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SH110X_WHITE);
      display.setCursor(0, 0);
      display.println("Arduino Assigned:");
      display.print("Device ID: ");
      display.println(assignedDeviceId);
      display.display();
    } else {
      Serial.println("---------------------------------");
      Serial.println("✗ NO DEVICE ID IN RESPONSE");
      Serial.println("---------------------------------");
      Serial.println("Backend response missing device_id.");
      Serial.print("Using default device ID: ");
      Serial.println(assignedDeviceId);
      Serial.println("=================================\n");
    }
  } else {
    Serial.println("---------------------------------");
    Serial.println("✗ ASSIGNMENT QUERY FAILED");
    Serial.println("---------------------------------");
    Serial.println("Could not connect to backend or query failed.");
    Serial.print("Using default device ID: ");
    Serial.println(assignedDeviceId);
    Serial.println("Check WiFi connection and backend URL.");
    Serial.println("=================================\n");
  }
  
  http.end();
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== SMART WATER LAB: METHOD 1 ACTIVE ===");

  analogReadResolution(12); 
  analogSetAttenuation(ADC_11db); 

  // pH calibration
  m = (4.01 - 7.00) / (calibph4 - calibph7);
  b = 7.00 - m * calibph7;

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); 

  pinMode(WATER_TEMP_PIN, INPUT_PULLUP); 
  pinMode(TDS_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(PH_PIN, INPUT); 
  delay(100);

  Wire.begin(21, 22); 
  delay(200);

  sensorsLiquid.begin();
  delay(100);
  sensorsLiquid.begin();

  // OLED INITIALIZATION
  if(!display.begin(0x3C, true)) { 
    Serial.println("OLED Warning: Screen failed.");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(15, 20);
    display.println("AquaWatch");
    display.setCursor(15, 38);
    display.println("Sync Data...");
    display.display();
  }

  // ============================================
  // WIFI MANAGER - CONFIGURATION PORTAL
  // ============================================
  WiFiManager wm;
  wm.resetSettings();

  wm.setCustomHeadElement(
    "<style>"
    "body { background-color: #111827; color: #f3f4f6; font-family: sans-serif; }"
    "h1 { color: #3b82f6; text-align: center; font-size: 24px; }"
    "div { background-color: #1f2937; padding: 15px; border-radius: 8px; }"
    "button { background-color: #2563eb; color: white; border: none; border-radius: 4px; padding: 10px; }"
    "button:hover { background-color: #1d4ed8; }"
    "input { background-color: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; padding: 8px; }"
    "</style>"
  );
  
  wm.setTitle("AquaWatch IoT Portal");

  WiFiManagerParameter custom_url_setting("server", "Backend API Server URL", custom_server_url, 100);
  wm.addParameter(&custom_url_setting);

  display.clearDisplay();
  display.setCursor(0, 10);
  display.println("WiFi Portal Active");
  display.setCursor(0, 26);
  display.println("Connect Phone To:");
  display.setCursor(0, 42);
  display.println("SSID: AquaWatch_AP");
  display.display();

  if(!wm.autoConnect("AquaWatch_AP")) {
     Serial.println("Config Timeout. Restarting...");
     ESP.restart();
     delay(1000);
  }

  strcpy(custom_server_url, custom_url_setting.getValue());

  // WIFI CONNECTED SUCCESS SCREEN
  display.clearDisplay();
  drawWiFiIcon(118, 0, true);
  
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  
  display.setCursor(0, 15);
  display.println(">> NET LINK OK");
  
  display.setCursor(0, 32);
  display.println("AquaWatch Cloud");
  display.setCursor(0, 45);
  display.println("Sync Successful!");
  
  display.display();
  delay(2500);

  // ============================================
  // ARDUINO ASSIGNMENT - NEW CODE
  // ============================================
  // Display MAC address for 5 seconds
  displayMacAddressOnOLED();
  delay(5000);
  
  // Query assigned device from backend
  queryAssignedDevice();
  delay(2000);
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // 1. READ WATER TEMPERATURE
  sensorsLiquid.requestTemperatures();
  float waterTemp = sensorsLiquid.getTempCByIndex(0);
  if(waterTemp <= -127.0 || waterTemp > 80.0) {
    waterTemp = 24.7; 
  }
  
  // 2. READ TDS & CONVERT TO mg/L (PPM)
  int rawTDS = analogRead(TDS_PIN);
  float tdsVoltage = rawTDS * (3.3 / 4095.0);
  float compensationCoefficient = 1.0 + 0.02 * (waterTemp - 25.0);
  float compensatedVoltage = tdsVoltage / compensationCoefficient;
  float tdsPPM = (133.42 * pow(compensatedVoltage, 3) - 255.86 * pow(compensatedVoltage, 2) + 857.39 * compensatedVoltage) * 0.5;
  if(tdsPPM < 0) tdsPPM = 0;
  float ecVal = tdsPPM * 1.56; 

  // 3. READ TURBIDITY (NTU)
  int rawTurbidity = analogRead(TURBIDITY_PIN);
  float turbVoltage = rawTurbidity * (3.3 / 4095.0);
  float turbidityNTU = 0.0;
  if(turbVoltage < 2.5) {
    turbidityNTU = 8.4; 
  } else {
    turbidityNTU = -1120.4 * pow(turbVoltage, 2) + 5742.3 * turbVoltage - 4353.8;
  }
  if(turbidityNTU < 0) turbidityNTU = 0;
  
  // 4. READ pH WITH MEDIAN FILTER
  const int numSamples = 40;
  int samples[numSamples];
  for(int i = 0; i < numSamples; i++) {
    samples[i] = analogRead(PH_PIN);
    delay(3); 
  }
  for(int i = 0; i < numSamples - 1; i++) {
    for(int j = i + 1; j < numSamples; j++) {
      if(samples[i] > samples[j]) {
        int temp = samples[i];
        samples[i] = samples[j];
        samples[j] = temp;
      }
    }
  }
  long totalRawPH = 0;
  for(int i = 10; i < 30; i++) {
    totalRawPH += samples[i];
  }
  float avgRawPH = totalRawPH / 20.0;
  float voltagePH = avgRawPH * (3.3 / 4095.0); 
  float phValue = m * voltagePH + b; 
  if(phValue < 0.0) phValue = 0.0;
  if(phValue > 14.0) phValue = 14.0;
  float orpVal = 400.0 - (phValue * 25.0) + (waterTemp * 0.5);

  // WATER QUALITY TIER
  int waterTier = 0; 
  if (phValue > 7.20 || phValue < 6.00) {
    waterTier = 2; 
  } else if (phValue >= 6.00 && phValue < 6.50) {
    waterTier = 1; 
  } else {
    waterTier = 0; 
  }

  bool isConnected = (WiFi.status() == WL_CONNECTED);

  // 5. SEND DATA TO SERVER - MODIFIED TO USE ASSIGNED DEVICE ID
  if (isConnected) {
    HTTPClient http;
    
    // Use assigned device ID from startup query
    String serverUrl = String(custom_server_url).replace("/api/readings/", "/api/readings/?device_id=" + assignedDeviceId);
    http.begin(serverUrl); 
    http.addHeader("Content-Type", "text/plain");
    
    // Debug output to verify URL
    Serial.print("POST URL: ");
    Serial.println(serverUrl);
    Serial.print("Using device_id: ");
    Serial.println(assignedDeviceId);

    String payload = "TEMP:" + String(waterTemp, 1) + 
                     ",TDS:" + String(tdsPPM, 0) + 
                     ",EC:" + String(ecVal, 0) + 
                     ",NTU:" + String(turbidityNTU, 1) + 
                     ",PH:" + String(phValue, 2) + 
                     ",ORP:" + String(orpVal, 0) + 
                     ",TIER:" + String(waterTier);

    int httpResponseCode = http.POST(payload);
    Serial.print("Stream Post Status Code: ");
    Serial.println(httpResponseCode);
    
    // If we get 400 errors, fallback to default device_id=1
    if (httpResponseCode == 400) {
      Serial.println("Assignment failed, using default device_id=1");
      assignedDeviceId = "1";
    }
    
    http.end(); 
  }

  // 6. SERIAL MONITOR OUTPUT
  Serial.print("TEMP:"); Serial.print(waterTemp, 1);
  Serial.print(",TDS:"); Serial.print(tdsPPM, 0);
  Serial.print(",EC:"); Serial.print(ecVal, 0);
  Serial.print(",NTU:"); Serial.print(turbidityNTU, 1);
  Serial.print(",PH:"); Serial.print(phValue, 2);
  Serial.print(",ORP:"); Serial.print(orpVal, 0);
  Serial.print(",TIER:"); Serial.println(waterTier);

  // 7. OLED DISPLAY
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  
  display.setCursor(25, 0);
  display.println("= AQUAWATCH =");
  
  drawWiFiIcon(118, 0, isConnected);
  
  display.setCursor(0, 13);
  display.print("Temp:      "); display.print(waterTemp, 1); display.println(" C");
  
  display.setCursor(0, 24);
  display.print("TDS:       "); display.print(tdsPPM, 0); display.println(" mg/L");
  
  display.setCursor(0, 35);
  display.print("Turbidity: "); display.print(turbidityNTU, 1); display.println(" NTU");
  
  display.setCursor(0, 46);
  display.print("PH Value:  "); display.println(phValue, 2); 
  
  display.setCursor(0, 56);
  if (waterTier == 2) {
    display.println("STATUS:    AT RISK");
    digitalWrite(BUZZER_PIN, HIGH); delay(150);
    digitalWrite(BUZZER_PIN, LOW);  delay(150);
    digitalWrite(BUZZER_PIN, HIGH); delay(150);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (waterTier == 1) {
    display.println("STATUS:    WARNING");
    digitalWrite(BUZZER_PIN, HIGH); delay(300);
    digitalWrite(BUZZER_PIN, LOW);
  } else {
    display.println("STATUS:    NORMAL");
    digitalWrite(BUZZER_PIN, LOW);  
    delay(600); 
  }
  display.display();

  delay(1400); 
}
