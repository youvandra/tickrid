#if defined(ARDUINO_AVR_UNO)
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  while (!Serial) {
  }
  Serial.println("tickr.id: Arduino UNO is not supported for WiFi/WebSocket/TFT version.");
  Serial.println("Use ESP32 (Arduino-ESP32 core) to run tickr.id firmware.");
}

void loop() {
}

#else

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <ArduinoJson.h>
#include <Preferences.h>

#include "qrcode.h"

#include <vector>

#define BTN_PIN 21

static const char *WIFI_SSID = "Reffiw";
static const char *WIFI_PASSWORD = "123321123";

static const char *WEB_BASE_URL = "http://172.20.10.7:3000";
static const char *WS_HOST = "172.20.10.7";
static const uint16_t WS_PORT = 4000;
static const char *WS_PATH = "/device";
static const bool WS_SSL = false;

struct PriceData {
  float price = NAN;
  float change = NAN;
  uint32_t ts = 0;
};

struct DeviceConfig {
  std::vector<String> pairs;
  uint16_t rotationIntervalSec = 10;
};

static Preferences prefs;
#define TFT_CS 15
#define TFT_DC 2
#define TFT_RST 4
static Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);
static WebSocketsClient ws;

static String deviceId;
static DeviceConfig config;
static std::vector<PriceData> priceByIndex;
static uint8_t currentIndex = 0;
static bool autoRotateEnabled = true;

static String lastPairText;
static String lastPriceText;
static String lastChangeText;
static bool lastAutoRotate = true;

static volatile uint32_t btnLastIsrUs = 0;
static volatile bool btnDown = false;
static volatile uint32_t btnDownMs = 0;
static volatile bool btnUpEvent = false;
static volatile uint32_t btnUpMs = 0;

static uint32_t lastRotateMs = 0;
static uint32_t lastPingMs = 0;
static uint32_t wifiNextAttemptMs = 0;
static uint32_t wifiBackoffMs = 1000;
static uint32_t lastConfigFetchMs = 0;

static uint32_t u32Min(uint32_t a, uint32_t b) {
  return a < b ? a : b;
}

static void IRAM_ATTR onButtonChange() {
  uint32_t nowUs = micros();
  if (nowUs - btnLastIsrUs < 4000) return;
  btnLastIsrUs = nowUs;
  int level = digitalRead(BTN_PIN);
  uint32_t nowMs = millis();
  if (level == LOW) {
    btnDown = true;
    btnDownMs = nowMs;
  } else {
    if (btnDown) {
      btnUpEvent = true;
      btnUpMs = nowMs;
    }
    btnDown = false;
  }
}

static String randomHex(size_t bytes) {
  static const char *hex = "0123456789abcdef";
  String out;
  out.reserve(bytes * 2);
  for (size_t i = 0; i < bytes; i++) {
    uint8_t b = (uint8_t)esp_random();
    out += hex[(b >> 4) & 0x0F];
    out += hex[b & 0x0F];
  }
  return out;
}

static String loadOrCreateDeviceId() {
  prefs.begin("tickr", false);
  String id = prefs.getString("device_id", "");
  if (id.length() < 6) {
    uint64_t mac = ESP.getEfuseMac();
    char buf[17];
    snprintf(buf, sizeof(buf), "%04x%08x", (uint16_t)(mac >> 32), (uint32_t)mac);
    id = String(buf) + randomHex(2);
    prefs.putString("device_id", id);
  }
  return id;
}

static void loadConfigFromNvs() {
  String cfg = prefs.getString("config", "");
  if (cfg.length() == 0) {
    config.pairs.clear();
    config.rotationIntervalSec = 10;
    autoRotateEnabled = true;
    priceByIndex.clear();
    currentIndex = 0;
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, cfg);
  if (err) {
    config.pairs.clear();
    config.rotationIntervalSec = 10;
    autoRotateEnabled = true;
    priceByIndex.clear();
    currentIndex = 0;
    return;
  }

  config.pairs.clear();
  if (doc["pairs"].is<JsonArray>()) {
    for (JsonVariant v : doc["pairs"].as<JsonArray>()) {
      if (v.is<const char *>()) config.pairs.push_back(String(v.as<const char *>()));
    }
  }
  config.rotationIntervalSec = doc["rotation_interval"].is<int>() ? (uint16_t)doc["rotation_interval"].as<int>()
                                                                  : 10;
  autoRotateEnabled = config.rotationIntervalSec > 0;
  priceByIndex.assign(config.pairs.size(), PriceData{});
  if (currentIndex >= config.pairs.size()) currentIndex = 0;
}

static void saveConfigToNvs() {
  JsonDocument doc;
  JsonArray arr = doc["pairs"].to<JsonArray>();
  for (const auto &p : config.pairs) arr.add(p);
  doc["rotation_interval"] = (int)config.rotationIntervalSec;
  String out;
  serializeJson(doc, out);
  prefs.putString("config", out);
}

static void resetRenderCache() {
  lastPairText = "";
  lastPriceText = "";
  lastChangeText = "";
  lastAutoRotate = !autoRotateEnabled;
}

#define RGB565(r,g,b) ( ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3) )
#define C_BLACK       RGB565(  0,   0,   0)
#define C_WHITE       RGB565(241, 247, 246)
#define C_PRIMARY     RGB565(  0, 223, 129)
#define C_MID_GREEN   RGB565( 44, 194, 149)
#define C_DEEP_GREEN  RGB565(  9,  85,  68)
#define C_DARK_BG     RGB565(  3,  34,  33)
#define C_DARKEST_BG  RGB565(  2,  27,  26)
#define C_GREY        RGB565(112, 125, 125)
#define C_SOFT_MINT   RGB565(170, 203, 196)
#define C_RED         RGB565(220,  60,  60)
#define C_YELLOW      RGB565(255, 210,  60)
#define C_DARKGREY    C_GREY
#define C_LIGHTGREY   C_SOFT_MINT

static void drawTextCentered(int16_t y, const String &text, uint8_t size, uint16_t color, uint16_t bg = C_BLACK) {
  tft.setTextSize(size);
  tft.setTextColor(color, bg);
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  int cx = (tft.width() - (int)w) / 2;
  if (cx < 0) cx = 0;
  tft.setCursor(cx, y);
  tft.print(text);
}

static void drawTextRight(int16_t xRight, int16_t y, const String &text, uint8_t size, uint16_t color, uint16_t bg = C_BLACK) {
  tft.setTextSize(size);
  tft.setTextColor(color, bg);
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  int cx = xRight - (int)w;
  if (cx < 0) cx = 0;
  tft.setCursor(cx, y);
  tft.print(text);
}

static const int SCR_W = 320;
static const int SCR_H = 240;
static const int PAIR_Y = 8;
static const int PRICE_Y = 28;
static const int PCT_Y = 66;
static const int CHART_Y = 90;
static const int CHART_H = 100;
static const int BAR_Y = 198;
static const int BAR_H = 42;
static const int MAX_HISTORY = 30;
static float priceHistory[MAX_HISTORY];
static int historyCount = 0;

static void drawChart(int x, int y, int w, int h) {
  tft.drawRect(x, y, w, h, C_GREY);
  tft.fillRect(x + 1, y + 1, w - 2, h - 2, C_BLACK);
  if (historyCount < 2) return;
  float minVal = priceHistory[0], maxVal = priceHistory[0];
  for (int i = 1; i < historyCount; i++) {
    if (priceHistory[i] < minVal) minVal = priceHistory[i];
    if (priceHistory[i] > maxVal) maxVal = priceHistory[i];
  }
  float range = maxVal - minVal;
  if (range < 0.000001f) range = 0.000001f;
  minVal -= range * 0.1f;
  maxVal += range * 0.1f;
  range = maxVal - minVal;
  float stepX = (float)(w - 2) / (MAX_HISTORY - 1);
  for (int i = 0; i < historyCount - 1; i++) {
    int x1 = x + 1 + (int)(i * stepX);
    int x2 = x + 1 + (int)((i + 1) * stepX);
    int y1 = y + h - 1 - (int)((priceHistory[i] - minVal) / range * (h - 2));
    int y2 = y + h - 1 - (int)((priceHistory[i + 1] - minVal) / range * (h - 2));
    if (y1 < y) y1 = y;
    if (y1 > y + h - 1) y1 = y + h - 1;
    if (y2 < y) y2 = y;
    if (y2 > y + h - 1) y2 = y + h - 1;
    tft.drawLine(x1, y1, x2, y2, C_MID_GREEN);
  }
}

static String formatPrice(float price) {
  if (!isfinite(price)) return String("--");
  char buf[32];
  if (price >= 1000) snprintf(buf, sizeof(buf), "%.2f", price);
  else if (price >= 10) snprintf(buf, sizeof(buf), "%.4f", price);
  else snprintf(buf, sizeof(buf), "%.6f", price);
  return String(buf);
}

static String formatChange(float change) {
  if (!isfinite(change)) return String("--");
  char buf[32];
  snprintf(buf, sizeof(buf), "%+.2f%%", change);
  return String(buf);
}

static void renderMarket() {
  if (config.pairs.empty()) return;
  if (currentIndex >= config.pairs.size()) currentIndex = 0;

  const String pair = config.pairs[currentIndex];
  const PriceData pd = priceByIndex.size() > currentIndex ? priceByIndex[currentIndex] : PriceData{};

  String pairText = pair;
  String priceText = formatPrice(pd.price);
  String changeText = formatChange(pd.change);

  if (pairText != lastPairText) {
    tft.fillRect(0, 0, tft.width(), 50, C_BLACK);
    drawTextCentered(PAIR_Y, pairText, 2, C_LIGHTGREY, C_BLACK);
    lastPairText = pairText;
  }

  if (priceText != lastPriceText) {
    tft.fillRect(0, 55, tft.width(), 140, C_BLACK);
    drawTextCentered(PRICE_Y, priceText, 4, C_WHITE, C_BLACK);
    lastPriceText = priceText;
  }

  if (changeText != lastChangeText || autoRotateEnabled != lastAutoRotate) {
    tft.fillRect(0, 200, tft.width(), 40, C_BLACK);
    uint16_t c = C_LIGHTGREY;
    if (isfinite(pd.change)) c = pd.change >= 0 ? C_PRIMARY : C_RED;
    drawTextCentered(PCT_Y, changeText, 2, c, C_BLACK);
    drawTextRight(tft.width() - 6, 6, autoRotateEnabled ? "AUTO" : "MANUAL", 1, C_DARKGREY, C_BLACK);
    lastChangeText = changeText;
    lastAutoRotate = autoRotateEnabled;
  }
  drawChart(10, CHART_Y, SCR_W - 20, CHART_H);
  tft.fillRect(0, BAR_Y, SCR_W, BAR_H, C_RED);
  drawTextCentered(BAR_Y + 12, "HOLD TO SWAP", 2, C_WHITE, C_RED);
}

static void renderQr(const String &url) {
  tft.fillScreen(C_BLACK);
  tft.setTextSize(2);
  tft.setTextColor(C_WHITE, C_BLACK);
  drawTextCentered(8, "Scan to pair", 2, C_WHITE, C_BLACK);
  tft.setTextColor(C_DARKGREY, C_BLACK);
  drawTextCentered(28, deviceId, 2, C_DARKGREY, C_BLACK);

  const uint8_t version = 4;
  const uint8_t ecc = 0;
  const size_t bufSize = qrcode_getBufferSize(version);
  uint8_t *qrcodeData = (uint8_t *)malloc(bufSize);
  if (!qrcodeData) return;
  QRCode qrcode;
  qrcode_initText(&qrcode, qrcodeData, version, ecc, url.c_str());

  int qrSize = qrcode.size;
  int margin = 10;
  int maxPixels = min(tft.width(), tft.height()) - margin * 2 - 40;
  int scale = maxPixels / qrSize;
  if (scale < 1) scale = 1;
  int drawSize = qrSize * scale;
  int x0 = (tft.width() - drawSize) / 2;
  int y0 = 48 + (tft.height() - 48 - drawSize) / 2;

  tft.fillRect(x0 - 4, y0 - 4, drawSize + 8, drawSize + 8, C_WHITE);
  for (int y = 0; y < qrSize; y++) {
    for (int x = 0; x < qrSize; x++) {
      int px = x0 + x * scale;
      int py = y0 + y * scale;
      bool dark = qrcode_getModule(&qrcode, x, y);
      tft.fillRect(px, py, scale, scale, dark ? C_BLACK : C_WHITE);
    }
  }

  free(qrcodeData);
}

static void showPairingIfNeeded() {
  if (!config.pairs.empty()) return;
  String url = String(WEB_BASE_URL) + "/setup?device_id=" + deviceId;
  renderQr(url);
}

static void nextPair() {
  if (config.pairs.empty()) return;
  currentIndex = (currentIndex + 1) % (uint8_t)config.pairs.size();
  lastRotateMs = millis();
  resetRenderCache();
  renderMarket();
}

static void toggleAutoRotate() {
  autoRotateEnabled = !autoRotateEnabled;
  lastRotateMs = millis();
  resetRenderCache();
  renderMarket();
}

static void handleButton() {
  if (!btnUpEvent) return;
  uint32_t downMs = btnDownMs;
  uint32_t upMs = btnUpMs;
  btnUpEvent = false;
  uint32_t duration = upMs >= downMs ? (upMs - downMs) : 0;
  if (duration >= 900) toggleAutoRotate();
  else nextPair();
}

static void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  uint32_t now = millis();
  if (now < wifiNextAttemptMs) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiNextAttemptMs = now + wifiBackoffMs;
  wifiBackoffMs = u32Min(wifiBackoffMs * 2, (uint32_t)30000);
}

static void wsConnect() {
  String path = String(WS_PATH) + "?device_id=" + deviceId;
  if (WS_SSL) ws.beginSSL(WS_HOST, WS_PORT, path.c_str());
  else ws.begin(WS_HOST, WS_PORT, path.c_str());
  ws.setReconnectInterval(5000);
  ws.enableHeartbeat(15000, 3000, 2);
}

static void wsSendHello() {
  JsonDocument doc;
  doc["type"] = "hello";
  doc["device_id"] = deviceId;
  doc["fw"] = "mvp";
  String out;
  serializeJson(doc, out);
  ws.sendTXT(out);
}

static void wsSendPing() {
  JsonDocument doc;
  doc["type"] = "ping";
  doc["ts"] = (uint32_t)millis();
  String out;
  serializeJson(doc, out);
  ws.sendTXT(out);
}

static int indexForPair(const String &pair) {
  for (size_t i = 0; i < config.pairs.size(); i++) {
    if (config.pairs[i] == pair) return (int)i;
  }
  return -1;
}

static void applyConfigFromJson(JsonDocument &doc) {
  std::vector<String> nextPairs;
  if (doc["pairs"].is<JsonArray>()) {
    for (JsonVariant v : doc["pairs"].as<JsonArray>()) {
      if (v.is<const char *>()) nextPairs.push_back(String(v.as<const char *>()));
    }
  }
  uint16_t nextInterval = doc["rotation_interval"].is<int>() ? (uint16_t)doc["rotation_interval"].as<int>() : 10;

  config.pairs = nextPairs;
  config.rotationIntervalSec = nextInterval;
  autoRotateEnabled = config.rotationIntervalSec > 0;
  priceByIndex.assign(config.pairs.size(), PriceData{});
  currentIndex = 0;
  lastRotateMs = millis();
  saveConfigToNvs();
  tft.fillScreen(C_BLACK);
  resetRenderCache();
  if (config.pairs.empty()) showPairingIfNeeded();
  else renderMarket();
}

static void applyConfigObject(JsonDocument &doc) {
  if (doc["configuration"].is<JsonObject>()) {
    JsonObject cfg = doc["configuration"].as<JsonObject>();
    JsonDocument inner;
    inner.set(cfg);
    applyConfigFromJson(inner);
  }
}

static void fetchConfigHttp() {
  if (WiFi.status() != WL_CONNECTED) return;
  uint32_t now = millis();
  if (now - lastConfigFetchMs < 3000) return;
  lastConfigFetchMs = now;
  String url = String("http://") + WS_HOST + ":" + String(WS_PORT) + "/api/devices/" + deviceId;
  HTTPClient http;
  if (!http.begin(url)) return;
  int code = http.GET();
  if (code > 0) {
    String body = http.getString();
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      applyConfigObject(doc);
    }
  }
  http.end();
}

static void applyPriceFromJson(JsonDocument &doc) {
  if (!doc["pair"].is<const char *>()) return;
  String pair = String(doc["pair"].as<const char *>());
  int idx = indexForPair(pair);
  if (idx < 0) return;
  float price = doc["price"].is<float>() ? doc["price"].as<float>() : NAN;
  float change = doc["change"].is<float>() ? doc["change"].as<float>() : NAN;
  uint32_t ts = doc["ts"].is<uint32_t>() ? doc["ts"].as<uint32_t>() : 0;
  priceByIndex[(size_t)idx].price = price;
  priceByIndex[(size_t)idx].change = change;
  priceByIndex[(size_t)idx].ts = ts;
  if ((uint8_t)idx == currentIndex) {
    if (isfinite(price)) {
      if (historyCount < MAX_HISTORY) {
        priceHistory[historyCount++] = price;
      } else {
        for (int i = 0; i < MAX_HISTORY - 1; i++) priceHistory[i] = priceHistory[i + 1];
        priceHistory[MAX_HISTORY - 1] = price;
      }
    }
    renderMarket();
  }
}

static void onWsEvent(WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) {
    wsSendHello();
    lastPingMs = millis();
    wifiBackoffMs = 1000;
    return;
  }
  if (type == WStype_TEXT) {
    String text((const char *)payload, length);
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, text);
    if (err) return;
    if (!doc["type"].is<const char *>()) return;
    String msgType = String(doc["type"].as<const char *>());
    if (msgType == "config") applyConfigFromJson(doc);
    else if (msgType == "price") applyPriceFromJson(doc);
    return;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BTN_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BTN_PIN), onButtonChange, CHANGE);

  deviceId = loadOrCreateDeviceId();
  loadConfigFromNvs();

  tft.init(240, 320);
  tft.setRotation(1);
  tft.fillScreen(C_BLACK);
  resetRenderCache();
  showPairingIfNeeded();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  ws.onEvent(onWsEvent);
  wsConnect();
  if (config.pairs.empty()) fetchConfigHttp();
}

void loop() {
  ensureWifi();
  ws.loop();

  uint32_t now = millis();
  if (ws.isConnected() && now - lastPingMs >= 15000) {
    wsSendPing();
    lastPingMs = now;
  }

  handleButton();

  if (!config.pairs.empty() && autoRotateEnabled && config.rotationIntervalSec > 0) {
    if (now - lastRotateMs >= (uint32_t)config.rotationIntervalSec * 1000) {
      lastRotateMs = now;
      nextPair();
    }
  }
  if (config.pairs.empty()) fetchConfigHttp();
}

#endif
