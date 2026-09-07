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

// Water-quality station. Reads sensors, shows readings on the OLED,
// and posts them to the AquaWatch backend. WiFi is configured through
// the WiFiManager captive portal on first boot.
char custom_server_url[100] = "https://aquawatch-188s.onrender.com/api/readings/";

String assignedDeviceId = "1";
String arduinoMacAddress = "";

#define WATER_TEMP_PIN  23
#define PH_PIN          33
#define TDS_PIN         34
#define TURBIDITY_PIN   32
#define BUZZER_PIN      16

OneWire oneWireLiquid(WATER_TEMP_PIN);
DallasTemperature sensorsLiquid(&oneWireLiquid);

#define SCREEN_WIDTH 128    
#define SCREEN_HEIGHT 64    
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

  // Calibration voltages from a two-point pH calibration (buffer pH 7 and pH 4).
  // These get fed into the linear formula  pH = m * voltage + b  later on.
  float calibph7 = 2.800;
  float calibph4 = 3.300;
  float m, b;

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

String getArduinoMacAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

void displayMacAddressOnOLED() {
  String mac = getArduinoMacAddress();
  
  Serial.println("\nMAC Address: " + mac);
  
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
  
  String serverUrl = String(custom_server_url);
  serverUrl.replace("/api/readings/", "/api/arduino/assignment/?mac_address=");
  serverUrl += macAddress;
  
  Serial.println("Querying device for MAC: " + macAddress);
  
  HTTPClient http;
  http.begin(serverUrl);
  int httpResponseCode = http.GET();
  
  Serial.print("HTTP Response: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    int deviceIdIndex = response.indexOf("\"device_id\":");
    if (deviceIdIndex != -1) {
      int start = deviceIdIndex + 12;
      int end = response.indexOf(",", start);
      if (end == -1) end = response.indexOf("}", start);
      assignedDeviceId = response.substring(start, end);
      assignedDeviceId.trim();
      
      Serial.println("Assigned to device: " + assignedDeviceId);
      
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SH110X_WHITE);
      display.setCursor(0, 0);
      display.println("Arduino Assigned:");
      display.print("Device ID: ");
      display.println(assignedDeviceId);
      display.display();
    } else {
      Serial.println("No device_id in response, using default: " + assignedDeviceId);
    }
  } else {
    Serial.println("Assignment query failed, using default: " + assignedDeviceId);
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== AquaWatch Starting ===");

  // ESP32 ADC is 12-bit (0-4095) with 11 dB attenuation so we can read
  // voltages up to ~3.3 V, which covers all our analog sensor ranges.
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Two-point linear calibration: slope (m) and intercept (b) so we can
  // convert any ADC voltage straight into a pH reading (y = mx + b).
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

  if(!display.begin(0x3C, true)) { 
    Serial.println("OLED init failed");
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

  WiFiManager wm;
  wm.resetSettings();

  wm.setCustomHeadElement(
    "<style>"
    "* { margin: 0; padding: 0; box-sizing: border-box; }"
    "body { "
    "  background: #f5f5f5; "
    "  min-height: 100vh; "
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; "
    "  color: #1a1a1a; "
    "  display: flex; "
    "  align-items: flex-start; "
    "  justify-content: center; "
    "  padding: 20px; "
    "} "
    ".container { "
    "  background: white; "
    "  border-radius: 20px; "
    "  padding: 20px; "
    "  max-width: 420px; "
    "  width: 100%; "
    "  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); "
    "} "
    ".header { "
    "  display: flex; "
    "  justify-content: space-between; "
    "  align-items: center; "
    "  padding-bottom: 16px; "
    "  border-bottom: 1px solid #f0f0f0; "
    "  margin-bottom: 16px; "
    "} "
    ".header h1 { "
    "  color: #1a1a1a; "
    "  font-size: 20px; "
    "  font-weight: 600; "
    "  margin: 0; "
    "} "
    ".header .close { "
    "  color: #999; "
    "  font-size: 24px; "
    "  cursor: pointer; "
    "} "
    ".wifi-list { "
    "  display: flex; "
    "  flex-direction: column; "
    "  gap: 2px; "
    "} "
    ".wifi-item { "
    "  display: flex; "
    "  justify-content: space-between; "
    "  align-items: center; "
    "  padding: 14px 12px; "
    "  border-radius: 12px; "
    "  transition: background 0.15s; "
    "  cursor: pointer; "
    "} "
    ".wifi-item:hover { "
    "  background: #f8f8f8; "
    "} "
    ".wifi-item .name { "
    "  font-size: 15px; "
    "  font-weight: 500; "
    "  color: #1a1a1a; "
    "} "
    ".wifi-item .signal { "
    "  display: flex; "
    "  align-items: center; "
    "  gap: 8px; "
    "  color: #999; "
    "  font-size: 12px; "
    "} "
    ".wifi-item .signal .bars { "
    "  display: flex; "
    "  align-items: flex-end; "
    "  gap: 2px; "
    "  height: 16px; "
    "} "
    ".wifi-item .signal .bars span { "
    "  display: block; "
    "  width: 3px; "
    "  background: #d0d0d0; "
    "  border-radius: 2px; "
    "} "
    ".wifi-item .signal .bars span.active { "
    "  background: #34c759; "
    "} "
    ".wifi-item .connect-btn { "
    "  background: #007aff; "
    "  color: white; "
    "  border: none; "
    "  border-radius: 20px; "
    "  padding: 4px 16px; "
    "  font-size: 13px; "
    "  font-weight: 500; "
    "  cursor: pointer; "
    "  transition: background 0.15s; "
    "} "
    ".wifi-item .connect-btn:hover { "
    "  background: #0055cc; "
    "} "
    ".wifi-item .connect-btn.connected { "
    "  background: #34c759; "
    "} "
    ".wifi-item .lock { "
    "  color: #999; "
    "  font-size: 14px; "
    "  margin-right: 6px; "
    "} "
    ".note { "
    "  margin-top: 16px; "
    "  padding: 12px; "
    "  background: #f8f8f8; "
    "  border-radius: 12px; "
    "  color: #888; "
    "  font-size: 12px; "
    "  text-align: center; "
    "} "
    ".note strong { "
    "  color: #1a1a1a; "
    "  font-weight: 500; "
    "} "
    ".form-group { "
    "  margin-top: 12px; "
    "  padding-top: 12px; "
    "  border-top: 1px solid #f0f0f0; "
    "} "
    ".form-group label { "
    "  color: #666; "
    "  font-size: 12px; "
    "  margin-bottom: 4px; "
    "  display: block; "
    "} "
    ".form-group input { "
    "  width: 100%; "
    "  background: #f5f5f5; "
    "  border: 1px solid #e0e0e0; "
    "  border-radius: 8px; "
    "  padding: 10px 12px; "
    "  font-size: 14px; "
    "  outline: none; "
    "} "
    ".form-group input:focus { "
    "  border-color: #007aff; "
    "  background: white; "
    "} "
    ".save-btn { "
    "  width: 100%; "
    "  background: #007aff; "
    "  color: white; "
    "  border: none; "
    "  border-radius: 12px; "
    "  padding: 14px; "
    "  font-size: 16px; "
    "  font-weight: 500; "
    "  cursor: pointer; "
    "  margin-top: 16px; "
    "} "
    ".save-btn:hover { "
    "  background: #0055cc; "
    "} "
    "</style>"
  );
  
  wm.setTitle("WiFi Hotspot");

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

  displayMacAddressOnOLED();
  delay(5000);
  
  queryAssignedDevice();
  delay(2000);
}

void loop() {
  // Calibration helper: type CALIBRATE in the serial monitor (9600 baud) to
  // print the raw pH probe voltage repeatedly. Dip the probe in pH 7.00
  // buffer, note the V7 value; dip in pH 4.01 buffer, note the V4 value.
  // Update calibph7/calibph4 at the top of the file with those numbers.
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("CALIBRATE")) {
      Serial.println("== pH CALIBRATION MODE ==");
      Serial.println("Dip probe in pH 7.00, copy the 'V' reading.");
      Serial.println("Then dip in pH 4.01, copy the 'V' reading.");
      Serial.println("Type EXIT to stop.");
      while (true) {
        if (Serial.available()) {
          String exitCmd = Serial.readStringUntil('\n');
          exitCmd.trim();
          if (exitCmd.equalsIgnoreCase("EXIT")) break;
        }
        const int numSamples = 40;
        int samples[numSamples];
        for (int i = 0; i < numSamples; i++) {
          samples[i] = analogRead(PH_PIN);
          delay(3);
        }
        for (int i = 0; i < numSamples - 1; i++) {
          for (int j = i + 1; j < numSamples; j++) {
            if (samples[i] > samples[j]) {
              int temp = samples[i];
              samples[i] = samples[j];
              samples[j] = temp;
            }
          }
        }
        long totalRawPH = 0;
        for (int i = 10; i < 30; i++) {
          totalRawPH += samples[i];
        }
        float avgRawPH = totalRawPH / 20.0;
        float voltagePH = avgRawPH * (3.3 / 4095.0);
        Serial.print("V:");
        Serial.println(voltagePH, 3);
        delay(500);
      }
      Serial.println("Calibration mode exited.");
    }
  }

  sensorsLiquid.requestTemperatures();
  float waterTemp = sensorsLiquid.getTempCByIndex(0);
  if(waterTemp <= -127.0 || waterTemp > 80.0) {
    waterTemp = 24.7; 
  }
  
  // --- TDS Sensor ---
  // analogRead gives 0-4095. We convert to voltage (0-3.3 V), then apply a
  // temperature compensation factor so readings stay accurate across temps.
  // The polynomial formula maps voltage to parts-per-million (ppm).
  int rawTDS = analogRead(TDS_PIN);
  float tdsVoltage = rawTDS * (3.3 / 4095.0);
  float compensationCoefficient = 1.0 + 0.02 * (waterTemp - 25.0);
  float compensatedVoltage = tdsVoltage / compensationCoefficient;
  float tdsPPM = (133.42 * pow(compensatedVoltage, 3) - 255.86 * pow(compensatedVoltage, 2) + 857.39 * compensatedVoltage) * 0.5;
  if(tdsPPM < 0) tdsPPM = 0;
  float ecVal = tdsPPM * 1.56;

  int rawTurbidity = analogRead(TURBIDITY_PIN);
  float turbVoltage = rawTurbidity * (3.3 / 4095.0);
  float turbidityNTU = 0.0;
  if(turbVoltage < 2.5) {
    turbidityNTU = 8.4; 
  } else {
    turbidityNTU = -1120.4 * pow(turbVoltage, 2) + 5742.3 * turbVoltage - 4353.8;
  }
  if(turbidityNTU < 0) turbidityNTU = 0;
  
  // --- pH Sensor with Median Filter ---
  
  const int numSamples = 40;
  int samples[numSamples];
  for(int i = 0; i < numSamples; i++) {
    samples[i] = analogRead(PH_PIN);
    delay(3);
  }
  // Simple insertion sort - keeps things straightforward on a microcontroller
  for(int i = 0; i < numSamples - 1; i++) {
    for(int j = i + 1; j < numSamples; j++) {
      if(samples[i] > samples[j]) {
        int temp = samples[i];
        samples[i] = samples[j];
        samples[j] = temp;
      }
    }
  }
  // Average only the middle 20 samples (index 10-29), trimming 10 on each end
  long totalRawPH = 0;
  for(int i = 10; i < 30; i++) {
    totalRawPH += samples[i];
  }
  float avgRawPH = totalRawPH / 20.0;
  // Convert the filtered raw ADC value to voltage, then apply our linear
  // calibration formula:  pH = m * voltage + b
  float voltagePH = avgRawPH * (3.3 / 4095.0);
  float phValue = m * voltagePH + b;
  if(phValue < 0.0) phValue = 0.0;
  if(phValue > 14.0) phValue = 14.0;
  float orpVal = 400.0 - (phValue * 25.0) + (waterTemp * 0.5);

  // --- Water Quality Tier Classification ---
  // Based on the WHO guidelines, we assign a tier:
  //   0 = Safe,  1 = Warning,  2 = Critical (At Risk)
  int waterTier = 0;
  String alertReason = "";

  if (phValue < 6.5 || phValue > 8.5) {
    waterTier = 2;
    alertReason = "pH out of range (6.5-8.5)";
  } else if (waterTemp > 25.0) {
    waterTier = 1;
    alertReason = "Temperature > 25C";
  } else if (turbidityNTU >= 5.0) {
    waterTier = 1;
    alertReason = "Turbidity >= 5 NTU";
  } else if (tdsPPM >= 1000) {
    waterTier = 1;
    alertReason = "TDS >= 1000 mg/L";
  } else if (ecVal < 50 || ecVal > 500) {
    waterTier = 1;
    alertReason = "EC out of range (50-500)";
  } else {
    waterTier = 0;
    alertReason = "All parameters within safe range";
  }

  bool isConnected = (WiFi.status() == WL_CONNECTED);

  // --- Send Data to Backend ---
  // We grab the ESP32's MAC address so the Django backend can look up which
  // device this Arduino is registered to.  The payload is a simple comma-
  // separated key:value string (not JSON) to keep memory usage low on the
  // microcontroller.  The server parses this plain text on its end.
  if (isConnected) {
    HTTPClient http;

    String macAddress = getArduinoMacAddress();
    macAddress.replace(":", "%3A");
    String serverUrl = String(custom_server_url);
    serverUrl.replace("/api/readings/", "/api/readings/?mac_address=");
    serverUrl += macAddress;

    http.begin(serverUrl);
    http.addHeader("Content-Type", "text/plain");

    String payload = "TEMP:" + String(waterTemp, 1) +
                     ",TDS:" + String(tdsPPM, 0) +
                     ",EC:" + String(ecVal, 0) +
                     ",NTU:" + String(turbidityNTU, 1) +
                     ",PH:" + String(phValue, 2) +
                     ",ORP:" + String(orpVal, 0) +
                     ",TIER:" + String(waterTier) +
                     ",ALERT:" + alertReason;

    int httpResponseCode = http.POST(payload);
    Serial.print("POST status: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 400) {
      Serial.println("Assignment failed, using default device_id=1");
      assignedDeviceId = "1";
    }

    http.end();
  }

  Serial.print("TEMP:"); Serial.print(waterTemp, 1);
  Serial.print(",TDS:"); Serial.print(tdsPPM, 0);
  Serial.print(",EC:"); Serial.print(ecVal, 0);
  Serial.print(",NTU:"); Serial.print(turbidityNTU, 1);
  Serial.print(",PH:"); Serial.print(phValue, 2);
  Serial.print(",ORP:"); Serial.print(orpVal, 0);
  Serial.print(",TIER:"); Serial.print(waterTier);
  Serial.print(",ALERT:"); Serial.println(alertReason);

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
