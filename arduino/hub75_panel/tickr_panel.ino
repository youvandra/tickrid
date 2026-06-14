#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <WebServer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

static WiFiClientSecure wifiClient;
static MatrixPanel_I2S_DMA *matrix = nullptr;

static const int PANEL_RES_X = 64;
static const int PANEL_RES_Y = 32;
static const int PANEL_CHAIN = 1;
#define R1_PIN 19
#define G1_PIN 13
#define B1_PIN 18
#define R2_PIN 5
#define G2_PIN 12
#define B2_PIN 17
#define A_PIN 16
#define B_PIN 14
#define C_PIN 4
#define D_PIN 27
#define E_PIN -1
#define LAT_PIN 26
#define OE_PIN 15
#define CLK_PIN 2

// Override via build flags: -DFIRMWARE_API_BASE=\"https://tickr.id\"
#ifdef FIRMWARE_API_BASE
static const char *API_BASE = FIRMWARE_API_BASE;
#else
static const char *API_BASE = "http://172.20.10.7:4000";
#endif
static const char *PAIR = "BTC/USD";
static const char *INTERVAL = "1min";
static const int POINTS = 64;

static Preferences prefs;
static String deviceId;

static const int MAX_TICKERS = 8;
struct TickerCfg {
  String type;
  String symbol;
  String interval;
  bool showInterval = true;
  String exchange;
};
static TickerCfg tickers[MAX_TICKERS];
static int tickerCount = 0;
static int currentTickerIndex = 0;
static uint32_t rotateSeconds = 60;
static uint8_t globalBrightness = 30;
static unsigned long lastRotateMs = 0;
static unsigned long lastConfigFetchMs = 0;
static const unsigned long configFetchEveryMs = 30 * 1000;
static String displayMode = "auto"; // auto | one | two | multi_one | multi_two
static unsigned long lastFetch = 0;
static const unsigned long fetchEveryMs = 15 * 1000;

static String currentSymbol = PAIR;
static String currentInterval = INTERVAL;
static bool currentShowInterval = true;
static String currentExchange = "";

static float closes[POINTS];
static int havePoints = 0;
static float latestPrice = NAN;
static float pctChange = NAN;
static float latestCache[MAX_TICKERS];
static float changeCache[MAX_TICKERS];
static uint8_t seriesHaveCache[MAX_TICKERS];
static float seriesClosesCache[MAX_TICKERS][POINTS];
static bool hasFetchedData = false;
static bool wifiConfigured = true;
static String wifiSsid;
static String wifiPass;
static bool provisioning = false;
static WebServer server(80);
static const char *SETUP_AP_SSID = "tickr_setup";
static const char *SETUP_IP = "192.168.4.1";
static uint8_t setupPage = 0;
static unsigned long lastSetupPageMs = 0;
static bool connectingWifi = false;
static unsigned long connectStartMs = 0;
static unsigned long showStatusUntilMs = 0;
static String statusLine1;
static String statusLine2;
static bool wifiReconnecting = false;
static unsigned long wifiReconnectStartMs = 0;
static unsigned long wifiLastReconnectAttemptMs = 0;
static const unsigned long wifiReconnectAttemptEveryMs = 5000UL;
static const unsigned long wifiReconnectGiveUpMs = 60000UL;
static bool wifiLostPage = false;
static unsigned long wifiLostNextToggleMs = 0;

static SemaphoreHandle_t dataMutex = nullptr;
static volatile bool shouldRedraw = true;
static TaskHandle_t dataTaskHandle = nullptr;
static unsigned long priceMarqueeNextMs = 0;
static bool priceMarqueeActive = false;
static int priceMarqueeOffset = 0;
static int priceMarqueeDir = 1;
static unsigned long priceMarqueeLastStepMs = 0;
static String lastPriceMarqueeText;

static StaticJsonDocument<8192> jsonConfigDoc;
static StaticJsonDocument<8192> jsonSeriesDoc;
static StaticJsonDocument<2048> jsonLatestDoc;

static void DataTask(void *params);

static const char *PLACEHOLDER_NAME = "TICKER.ID";
static const float PLACEHOLDER_PRICE = 120.0f;
static const float PLACEHOLDER_CHANGE_PCT = 5.0f;
static const char *PLACEHOLDER_INTERVAL = "1mo";

static uint16_t color565(uint8_t r, uint8_t g, uint8_t b) {
  return (((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3));
}

static const uint16_t C_BLACK = 0x0000;
static const uint16_t C_WHITE = 0xFFFF;
static const uint16_t C_MINT = 0x07EF;
static const uint16_t C_PINK = color565(255, 80, 160);
static const uint16_t C_GREY = color565(90,90,90);

static void loadSeriesForDisplayFromIndex(int idx) {
  if (idx < 0 || idx >= MAX_TICKERS) return;
  latestPrice = latestCache[idx];
  pctChange = changeCache[idx];
  havePoints = seriesHaveCache[idx];
  if (havePoints > POINTS) havePoints = POINTS;
  for (int i = 0; i < havePoints; i++) closes[i] = seriesClosesCache[idx][i];
}

static String baseFromPair(const String &pair) {
  String p(pair);
  int idx = p.indexOf('/');
  if (idx < 0) return p;
  return p.substring(0, idx);
}

static String quoteFromPair(const String &pair) {
  String p(pair);
  int idx = p.indexOf('/');
  if (idx < 0) return "";
  return p.substring(idx + 1);
}

static String currencyPrefix(const String &quote) {
  String q = quote;
  q.toUpperCase();
  if (q == "USD" || q == "USDT" || q == "USDC") return "$";
  if (q == "IDR") return "Rp";
  if (q == "EUR") return "€";
  if (q == "JPY") return "¥";
  return "";
}

static String intervalLabel(const String &interval) {
  String i(interval);
  i.toLowerCase();
  if (i.endsWith("min")) {
    String n = i.substring(0, i.length() - 3);
    if (n.length() == 0) n = "1";
    return n + "m";
  }
  if (i.endsWith("h")) return i;
  if (i.endsWith("day")) {
    String n = i.substring(0, i.length() - 3);
    if (n.length() == 0) n = "1";
    return n + "d";
  }
  return i;
}

static String encodeQueryComponent(const String &raw) {
  String p(raw);
  p.replace("/", "%2F");
  p.replace(" ", "%20");
  return p;
}

static String shortBaseLabel(const String &symbol) {
  String b = baseFromPair(symbol);
  if (b.length() > 7) return b.substring(0, 7);
  return b;
}

static void printTruncatedLeft(const String &text, int maxWidthPx) {
  String t(text);
  int16_t x1, y1; uint16_t w, h;
  while (t.length() > 0) {
    matrix->getTextBounds(t, 0, 0, &x1, &y1, &w, &h);
    if ((int)w <= maxWidthPx) break;
    t.remove(t.length() - 1);
  }
  matrix->print(t);
}

static int priceDecimals(const String &symbol, float price) {
  if (isnan(price)) return 0;
  const String q = quoteFromPair(symbol);
  const String prefix = currencyPrefix(q);
  if (prefix == "Rp") return 0;
  if (prefix == "$" || prefix == "€" || prefix == "¥") {
    const float a = fabsf(price);
    return a >= 1.0f ? 2 : 5;
  }
  const float a = fabsf(price);
  if (a >= 1000.0f) return 0;
  if (a >= 100.0f) return 1;
  if (a >= 10.0f) return 2;
  if (a >= 1.0f) return 3;
  return 5;
}

static void printPrice(const String &symbol, float price) {
  if (isnan(price)) {
    matrix->print("--");
    return;
  }
  String prefix = currencyPrefix(quoteFromPair(symbol));
  if (prefix.length()) matrix->print(prefix);
  matrix->print(price, priceDecimals(symbol, price));
}

static void printPriceBig(const String &symbol, float price) {
  if (isnan(price)) {
    matrix->print("--");
    return;
  }
  String prefix = currencyPrefix(quoteFromPair(symbol));
  if (prefix.length()) matrix->print(prefix);
  int d = priceDecimals(symbol, price);
  if (d > 3) d = 3;
  matrix->print(price, d);
}

static String buildPriceText(const String &symbol, float price) {
  if (isnan(price)) return "--";
  String prefix = currencyPrefix(quoteFromPair(symbol));
  String out;
  out.reserve(prefix.length() + 16);
  out += prefix;
  out += String(price, priceDecimals(symbol, price));
  return out;
}

static String truncatePriceDigits(const String &text, int maxDigits) {
  String out;
  out.reserve(text.length());
  int digits = 0;
  for (size_t i = 0; i < text.length(); i++) {
    const char c = text.charAt(i);
    if (c >= '0' && c <= '9') {
      if (digits >= maxDigits) break;
      digits++;
    }
    out += c;
  }
  return out;
}

static void drawEllipsisPixelsRight(int y, uint16_t color) {
  const int dotY = y + 6;
  matrix->drawPixel(61, dotY, color);
  matrix->drawPixel(62, dotY, color);
  matrix->drawPixel(63, dotY, color);
}

static void drawPriceMarqueeLine(int y, const String &symbol, float price, unsigned long now) {
  const uint16_t col = C_WHITE;
  const int maxW = 64;
  const String full = buildPriceText(symbol, price);
  if (full != lastPriceMarqueeText) {
    lastPriceMarqueeText = full;
    priceMarqueeActive = false;
    priceMarqueeOffset = 0;
    priceMarqueeDir = 1;
    priceMarqueeLastStepMs = 0;
    priceMarqueeNextMs = now + 15000UL;
  }

  const int wFull = textWidthPx(full);
  if (wFull <= maxW) {
    matrix->setTextColor(col);
    matrix->setCursor(0, y);
    matrix->print(full);
    priceMarqueeActive = false;
    priceMarqueeOffset = 0;
    priceMarqueeDir = 1;
    priceMarqueeLastStepMs = 0;
    priceMarqueeNextMs = now + 15000UL;
    return;
  }

  if (!priceMarqueeActive) {
    String shown = truncatePriceDigits(full, 8);
    while (shown.length() > 0 && textWidthPx(shown) > (maxW - 4)) shown.remove(shown.length() - 1);
    matrix->setTextColor(col);
    matrix->setCursor(0, y);
    matrix->print(shown);
    drawEllipsisPixelsRight(y, col);
    if (now >= priceMarqueeNextMs) {
      priceMarqueeActive = true;
      priceMarqueeOffset = 0;
      priceMarqueeDir = 1;
      priceMarqueeLastStepMs = now;
      shouldRedraw = true;
    }
    return;
  }

  const int overflow = wFull - maxW;
  if (now - priceMarqueeLastStepMs >= 60UL) {
    priceMarqueeLastStepMs = now;
    priceMarqueeOffset += priceMarqueeDir;
    if (priceMarqueeDir > 0 && priceMarqueeOffset >= overflow) {
      priceMarqueeOffset = overflow;
      priceMarqueeDir = -1;
    } else if (priceMarqueeDir < 0 && priceMarqueeOffset <= 0) {
      priceMarqueeOffset = 0;
      priceMarqueeDir = 1;
      priceMarqueeActive = false;
      priceMarqueeNextMs = now + 15000UL;
    }
  }

  matrix->setTextColor(col);
  matrix->setCursor(-priceMarqueeOffset, y);
  matrix->print(full);
  shouldRedraw = true;
}

static void formatPercent(char *out, size_t outSize, float pct) {
  if (isnan(pct)) {
    strncpy(out, "--", outSize);
    out[outSize - 1] = '\0';
    return;
  }
  float v = pct;
  if (fabsf(v) < 0.05f) v = 0.0f;
  
  if (fabsf(v) >= 10000.0f) {
    snprintf(out, outSize, "%.0fK%%", v / 1000.0f);
  } else if (fabsf(v) >= 10.0f) {
    snprintf(out, outSize, "%.0f%%", v);
  } else {
    snprintf(out, outSize, "%.1f%%", v);
  }
}

static int textWidthPx(const String &s) {
  int16_t x1, y1; uint16_t w, h;
  matrix->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
  return (int)w;
}

static int drawPercentRightCompact(float pct, int y, uint16_t color) {
  char buf[16];
  formatPercent(buf, sizeof(buf), pct);
  const String s(buf);
  if (s.indexOf('.') < 0 || s == "--") {
    const int w = textWidthPx(s);
    matrix->setCursor(63 - w, y);
    matrix->print(s);
    return w;
  }

  const bool neg = s.startsWith("-");
  const int dot = s.indexOf('.');
  const int pctIdx = s.indexOf('%');
  const String sign = neg ? "-" : "";
  const String intPart = neg ? s.substring(1, dot) : s.substring(0, dot);
  const String frac = pctIdx > dot ? s.substring(dot + 1, pctIdx) : "0";

  const int wSign = sign.length() ? textWidthPx(sign) : 0;
  const int wInt = textWidthPx(intPart);
  const int wFrac = textWidthPx(frac);
  const int wPct = textWidthPx("%");
  const int gapBeforeDot = 1;
  const int dotW = 1;
  const int gapAfterDot = 1;
  const int total = wSign + wInt + gapBeforeDot + dotW + gapAfterDot + wFrac + wPct;
  const int startX = 64 - total;

  matrix->setCursor(startX, y);
  if (wSign) matrix->print(sign);
  matrix->setCursor(startX + wSign, y);
  matrix->print(intPart);

  const int dotX = startX + wSign + wInt + gapBeforeDot;
  matrix->drawPixel(dotX, y + 6, color);

  matrix->setCursor(dotX + dotW + gapAfterDot, y);
  matrix->print(frac);
  matrix->setCursor(dotX + dotW + gapAfterDot + wFrac, y);
  matrix->print("%");
  return total;
}

static void drawSplash() {
  matrix->setTextWrap(false);
  matrix->setTextSize(2);
  const String text = "TICKR.ID";
  int16_t x1, y1; uint16_t w, h;
  matrix->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  const unsigned long start = millis();
  const unsigned long durationMs = 8000UL;
  const int startX = 64;
  const int endX = -((int)w);
  while (millis() - start < durationMs) {
    unsigned long t = millis() - start;
    int x = startX - (int)((t * (unsigned long)(startX - endX)) / durationMs);
    matrix->fillScreen(C_BLACK);
    matrix->setTextColor(C_WHITE);
    matrix->setCursor(x, 8);
    matrix->print(text);
    // When double buffering is enabled, we must swap/flip to actually show updates.
    matrix->flipDMABuffer();
    delay(60);
  }
}

static void drawWaiting() {
  matrix->fillScreen(C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  matrix->setTextColor(C_GREY);
  const String msg = "Fetching..";
  int16_t x1, y1; uint16_t w, h;
  matrix->getTextBounds(msg, 0, 0, &x1, &y1, &w, &h);
  matrix->setCursor((64 - w) / 2, 14);
  matrix->print(msg);
}

static void drawWifiSetupWaiting(uint8_t page) {
  matrix->fillScreen(C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  if ((page % 2) == 0) {
    matrix->setTextColor(C_WHITE);
    matrix->setCursor(0, 0);
    matrix->print("Join WiFi");
    matrix->setTextColor(C_GREY);
    matrix->setCursor(0, 8);
    matrix->print(SETUP_AP_SSID);
    matrix->setTextColor(C_WHITE);
    matrix->setCursor(0, 16);
    matrix->print("Open:");
    matrix->setTextColor(C_GREY);
    matrix->setCursor(0, 24);
    matrix->print("192.168.4.1");
    return;
  }
  matrix->setTextColor(C_GREY);
  matrix->setCursor(0, 8);
  matrix->print("Setup WiFi");
  matrix->setCursor(0, 16);
  matrix->print("in browser");
}

static void drawStatus(const String &l1, const String &l2) {
  matrix->fillScreen(C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 0);
  matrix->print(l1);
  matrix->setTextColor(C_GREY);
  matrix->setCursor(0, 12);
  matrix->print(l2);
}

static void drawWifiLostText() {
  matrix->fillScreen(C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  matrix->setTextColor(C_GREY);
  const String l1 = "WiFi lost";
  const String l2 = "Reconnecting";
  int16_t x1, y1; uint16_t w, h;
  matrix->getTextBounds(l1, 0, 0, &x1, &y1, &w, &h);
  matrix->setCursor((64 - w) / 2, 10);
  matrix->print(l1);
  matrix->getTextBounds(l2, 0, 0, &x1, &y1, &w, &h);
  matrix->setCursor((64 - w) / 2, 20);
  matrix->print(l2);
}

static void startConnectingToWifi(const String &ssid, const String &pass) {
  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  wifiSsid = ssid;
  wifiPass = pass;
  wifiConfigured = true;
  provisioning = false;
  connectingWifi = true;
  connectStartMs = millis();
  shouldRedraw = true;
  if (dataMutex) xSemaphoreGive(dataMutex);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
}

static String htmlEscape(const String &s) {
  size_t extra = 0;
  for (size_t i = 0; i < s.length(); i++) {
    const char c = s.charAt(i);
    if (c == '&') extra += 4;
    else if (c == '<' || c == '>') extra += 3;
    else if (c == '"') extra += 5;
  }
  String out;
  out.reserve(s.length() + extra);
  for (size_t i = 0; i < s.length(); i++) {
    const char c = s.charAt(i);
    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else out += c;
  }
  return out;
}

static void startProvisioning() {
  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  provisioning = true;
  wifiConfigured = false;
  setupPage = 0;
  lastSetupPageMs = millis();
  connectingWifi = false;
  showStatusUntilMs = 0;
  wifiReconnecting = false;
  wifiLostPage = false;
  wifiLostNextToggleMs = 0;
  shouldRedraw = true;
  if (dataMutex) xSemaphoreGive(dataMutex);
  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleep(false);
  WiFi.softAP(SETUP_AP_SSID);

  server.on("/", HTTP_GET, []() {
    int n = WiFi.scanNetworks();
    String options = "";
    for (int i = 0; i < n; i++) {
      String ssid = WiFi.SSID(i);
      if (!ssid.length()) continue;
      options += "<option value=\"" + htmlEscape(ssid) + "\">" + htmlEscape(ssid) + "</option>";
    }
    options += "<option value=\"__custom__\">Custom...</option>";
    String html = "<!doctype html><html><head><meta charset='utf-8' />";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1' />";
    html += "<title>tickr.id setup</title>";
    html += "<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b0e14;color:#fff;padding:16px}label{display:block;margin-top:12px;font-size:12px;color:#b0b0b0}select,input,button{width:100%;padding:10px;margin-top:6px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff}button{background:rgba(16,185,129,.35);border:none;font-weight:700}small{color:rgba(255,255,255,.5)}</style>";
    html += "</head><body>";
    html += "<h2>tickr.id wifi setup</h2>";
    html += "<p><small>device_id: " + htmlEscape(deviceId) + "</small></p>";
    html += "<form method='POST' action='/save'>";
    html += "<label>WiFi</label><select id='ssid_select' name='ssid_select'>" + options + "</select>";
    html += "<input id='ssid_manual' name='ssid_manual' placeholder='Custom SSID' style='display:none' />";
    html += "<label>Password</label><input name='pass' type='password' />";
    html += "<button type='submit'>Connect</button>";
    html += "<script>(function(){var s=document.getElementById('ssid_select');var m=document.getElementById('ssid_manual');function u(){if(!s||!m)return;var c=(s.value==='__custom__');m.style.display=c?'block':'none';if(!c)m.value='';}if(s){s.addEventListener('change',u);u();}})();</script>";
    html += "</form>";
    html += "</body></html>";
    server.send(200, "text/html", html);
  });

  server.on("/save", HTTP_POST, []() {
    String ssid = server.hasArg("ssid_select") ? server.arg("ssid_select") : "";
    if (ssid == "__custom__") ssid = server.hasArg("ssid_manual") ? server.arg("ssid_manual") : "";
    if (!ssid.length()) {
      server.send(400, "text/plain", "missing ssid");
      return;
    }
    wifiSsid = ssid;
    wifiPass = server.hasArg("pass") ? server.arg("pass") : "";
    prefs.putString("ssid", wifiSsid);
    prefs.putString("password", wifiPass);
    server.send(200, "text/html", "<html><body><h3>Saved. Connecting...</h3></body></html>");

    server.stop();
    WiFi.softAPdisconnect(true);
    startConnectingToWifi(wifiSsid, wifiPass);
    hasFetchedData = false;
    lastConfigFetchMs = millis() - configFetchEveryMs;
    lastFetch = millis() - fetchEveryMs;
  });

  server.begin();
}

static void drawPlaceholderTop() {
  matrix->fillRect(0, 0, 64, 16, C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 0);
  matrix->print(PLACEHOLDER_NAME);

  char pct[16];
  formatPercent(pct, sizeof(pct), PLACEHOLDER_CHANGE_PCT);
  uint16_t pctColor = PLACEHOLDER_CHANGE_PCT >= 0 ? C_MINT : C_PINK;
  matrix->setTextColor(pctColor);
  int16_t x1, y1; uint16_t w, h;
  matrix->getTextBounds(String(pct), 0, 0, &x1, &y1, &w, &h);
  matrix->setCursor(63 - w, 0);
  matrix->print(pct);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 8);
  matrix->print("$");
  matrix->print((int)PLACEHOLDER_PRICE);

  matrix->setTextColor(C_GREY);
  String label(PLACEHOLDER_INTERVAL);
  matrix->getTextBounds(label, 0, 0, &x1, &y1, &w, &h);
  matrix->setCursor(63 - w, 8);
  matrix->print(label);
}

static void drawTop() {
  matrix->fillRect(0, 0, 64, 16, C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  int16_t x1, y1; uint16_t w, h;
  uint16_t pctColor = (isnan(pctChange) ? C_WHITE : (pctChange >= 0 ? C_MINT : C_PINK));
  matrix->setTextColor(pctColor);
  const int wPct = drawPercentRightCompact(pctChange, 0, pctColor);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 0);
  printTruncatedLeft(baseFromPair(currentSymbol), 63 - wPct - 2);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 8);
  printPrice(currentSymbol, latestPrice);

  matrix->setTextColor(C_GREY);
}

static void drawOneTicker() {
  matrix->fillRect(0, 0, 64, 22, C_BLACK);
  matrix->setTextWrap(false);

  matrix->setTextSize(1);
  int16_t x1, y1; uint16_t w, h;
  uint16_t pctColor = (isnan(pctChange) ? C_WHITE : (pctChange >= 0 ? C_MINT : C_PINK));
  matrix->setTextColor(pctColor);
  const int wPct = drawPercentRightCompact(pctChange, 0, pctColor);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, 0);
  printTruncatedLeft(baseFromPair(currentSymbol), 63 - wPct - 2);

  matrix->setTextColor(C_GREY);

  matrix->setTextColor(C_WHITE);
  drawPriceMarqueeLine(13, currentSymbol, latestPrice, millis());
}

static void drawChartMini(int yTop, int height) {
  matrix->fillRect(0, yTop, 64, height, C_BLACK);
  if (height < 2) return;
  if (havePoints < 2) {
    return;
  }
  float minV = closes[0], maxV = closes[0];
  for (int i = 1; i < havePoints; i++) {
    if (closes[i] < minV) minV = closes[i];
    if (closes[i] > maxV) maxV = closes[i];
  }
  float range = maxV - minV;
  if (range <= 0.000001f) range = 1.0f;
  
  const bool isUp = (isnan(pctChange) || pctChange >= 0);
  const uint16_t topCol = isUp ? C_MINT : C_PINK;
  const uint16_t fillCol = isUp ? color565(0, 40, 30) : color565(50, 15, 30);
  const int yBottom = yTop + height - 1;
  const int xOffset = 64 - havePoints;

  for (int i = 0; i < havePoints; i++) {
    int x = xOffset + i;
    const float t = (closes[i] - minV) / range;
    int y = yBottom - (int)roundf(t * (float)(height - 1));
    if (y < yTop) y = yTop;
    if (y > yBottom) y = yBottom;
    
    // Top pixel (bright)
    matrix->drawPixel(x, y, topCol);
    
    // Fill below (dimmed)
    if (y < yBottom) {
      matrix->drawFastVLine(x, y + 1, yBottom - y, fillCol);
    }
  }
}

static void drawWifiSignalMini(int yTop, int height) {
  matrix->fillRect(0, yTop, 64, height, C_BLACK);
  const int yBottom = yTop + height - 1;
  const uint16_t col = C_PINK;
  for (int i = 0; i < 5; i++) {
    const int barH = i + 1;
    const int x = i * 2;
    matrix->fillRect(x, yBottom - (barH - 1), 1, barH, col);
  }
  const int x0 = 59;
  const int y0 = yBottom - 4;
  matrix->drawPixel(x0 + 0, y0 + 0, col);
  matrix->drawPixel(x0 + 1, y0 + 1, col);
  matrix->drawPixel(x0 + 2, y0 + 2, col);
  matrix->drawPixel(x0 + 3, y0 + 3, col);
  matrix->drawPixel(x0 + 4, y0 + 4, col);
  matrix->drawPixel(x0 + 4, y0 + 0, col);
  matrix->drawPixel(x0 + 3, y0 + 1, col);
  matrix->drawPixel(x0 + 2, y0 + 2, col);
  matrix->drawPixel(x0 + 1, y0 + 3, col);
  matrix->drawPixel(x0 + 0, y0 + 4, col);
}

static void drawDots(int count, int active, int y) {
  int maxDots = count;
  if (maxDots > 6) maxDots = 6;
  if (maxDots <= 1) return;
  int totalWidth = maxDots * 4 - 2;
  int startX = (64 - totalWidth) / 2;
  for (int i = 0; i < maxDots; i++) {
    int x = startX + i * 4;
    uint16_t col = (i == (active % maxDots)) ? C_WHITE : C_GREY;
    matrix->drawPixel(x, y, col);
    matrix->drawPixel(x + 1, y, col);
  }
}

static void drawTickerRow(int y, const String &symbol, float latest, float change, const String &interval, bool showInterval) {
  matrix->fillRect(0, y, 64, 16, C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);
  int16_t x1, y1; uint16_t w, h;
  uint16_t pctColor = (isnan(change) ? C_WHITE : (change >= 0 ? C_MINT : C_PINK));
  matrix->setTextColor(pctColor);
  const int wPct = drawPercentRightCompact(change, y, pctColor);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, y);
  printTruncatedLeft(baseFromPair(symbol), 63 - wPct - 2);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, y + 8);
  printPrice(symbol, latest);

  matrix->setTextColor(C_GREY);
}

static void drawTickerRowTwoMode(int y, int line2Offset, const String &symbol, float latest, float change, const String &interval, bool showInterval) {
  matrix->fillRect(0, y, 64, 16, C_BLACK);
  matrix->setTextWrap(false);
  matrix->setTextSize(1);

  int16_t x1, y1; uint16_t w, h;
  uint16_t pctColor = (isnan(change) ? C_WHITE : (change >= 0 ? C_MINT : C_PINK));
  matrix->setTextColor(pctColor);
  const int wPct = drawPercentRightCompact(change, y, pctColor);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, y);
  printTruncatedLeft(shortBaseLabel(symbol), 63 - wPct - 2);

  matrix->setTextColor(C_WHITE);
  matrix->setCursor(0, y + line2Offset);
  printPrice(symbol, latest);

  matrix->setTextColor(C_GREY);
}

static void drawChart() {
  matrix->fillRect(0, 16, 64, 16, C_BLACK);
  if (havePoints < 2) return;
  float minV = closes[0], maxV = closes[0];
  for (int i = 1; i < havePoints; i++) {
    if (closes[i] < minV) minV = closes[i];
    if (closes[i] > maxV) maxV = closes[i];
  }
  float range = maxV - minV;
  if (range <= 0.000001f) range = 1.0f;
  uint16_t chartCol = (isnan(pctChange) ? C_MINT : (pctChange >= 0 ? C_MINT : C_PINK));
  for (int i = 0; i < havePoints - 1; i++) {
    int x = i;
    int y = 31 - (int)((closes[i] - minV) / range * 15.0f);
    if (y < 16) y = 16;
    if (y > 31) y = 31;
    matrix->fillRect(x, y, 1, 32 - y, chartCol);
  }
  {
    int x = (havePoints - 1);
    int y = 31 - (int)((closes[havePoints - 1] - minV) / range * 15.0f);
    if (y < 16) y = 16;
    if (y > 31) y = 31;
    matrix->fillRect(x, y, 1, 32 - y, chartCol);
  }
}

static bool fetchSeries() {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  static String lastSym;
  static String lastInt;

  HTTPClient http;
  String url = String(API_BASE) + "/api/series?symbol=" + encodeQueryComponent(currentSymbol) + "&interval=" + encodeQueryComponent(currentInterval) + "&points=" + String(POINTS);
  if (currentExchange.length()) {
    url += "&exchange=";
    url += encodeQueryComponent(currentExchange);
  }
  if (!http.begin(wifiClient, url)) return false;
  http.setReuse(true);
  http.setTimeout(4000);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }
  jsonSeriesDoc.clear();
  DeserializationError err = deserializeJson(jsonSeriesDoc, http.getStream());
  http.end();
  if (err) return false;

  float nextLatest = jsonSeriesDoc["latest"].is<float>() || jsonSeriesDoc["latest"].is<double>() || jsonSeriesDoc["latest"].is<long>() || jsonSeriesDoc["latest"].is<int>()
    ? (float)jsonSeriesDoc["latest"].as<double>()
    : NAN;
  float nextChange = jsonSeriesDoc["change"].is<float>() || jsonSeriesDoc["change"].is<double>() || jsonSeriesDoc["change"].is<long>() || jsonSeriesDoc["change"].is<int>()
    ? (float)jsonSeriesDoc["change"].as<double>()
    : NAN;

  float nextCloses[POINTS];
  int nextHave = 0;
  if (jsonSeriesDoc["closes"].is<JsonArray>()) {
    JsonArray arr = jsonSeriesDoc["closes"].as<JsonArray>();
    for (JsonVariant v : arr) {
      if (v.is<float>() || v.is<double>() || v.is<long>() || v.is<int>()) {
        nextCloses[nextHave++] = (float)v.as<double>();
        if (nextHave >= POINTS) break;
      }
    }
  }

  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  const int idx = currentTickerIndex >= 0 && currentTickerIndex < MAX_TICKERS ? currentTickerIndex : 0;
  latestPrice = nextLatest;
  pctChange = nextChange;
  havePoints = nextHave;
  for (int i = 0; i < nextHave; i++) closes[i] = nextCloses[i];
  latestCache[idx] = nextLatest;
  changeCache[idx] = nextChange;
  seriesHaveCache[idx] = (uint8_t)nextHave;
  for (int i = 0; i < nextHave; i++) seriesClosesCache[idx][i] = nextCloses[i];
  if (!isnan(latestPrice)) hasFetchedData = true;
  shouldRedraw = true;
  if (dataMutex) xSemaphoreGive(dataMutex);
  lastSym = currentSymbol;
  lastInt = currentInterval;
  return true;
}

static bool fetchLatestForIndex(int idx) {
  if (idx < 0 || idx >= tickerCount) return false;
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  String sym = tickers[idx].symbol;
  String interval = tickers[idx].interval.length() ? tickers[idx].interval : "1min";
  String url = String(API_BASE) + "/api/series?symbol=" + encodeQueryComponent(sym) +
    "&interval=" + encodeQueryComponent(interval) + "&points=2";
  if (tickers[idx].exchange.length()) {
    url += "&exchange=";
    url += encodeQueryComponent(tickers[idx].exchange);
  }
  if (!http.begin(wifiClient, url)) return false;
  http.setReuse(true);
  http.setTimeout(4000);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }
  jsonLatestDoc.clear();
  DeserializationError err = deserializeJson(jsonLatestDoc, http.getStream());
  http.end();
  if (err) return false;

  float nextLatest = jsonLatestDoc["latest"].is<float>() || jsonLatestDoc["latest"].is<double>() || jsonLatestDoc["latest"].is<long>() || jsonLatestDoc["latest"].is<int>()
    ? (float)jsonLatestDoc["latest"].as<double>()
    : NAN;
  float nextChange = jsonLatestDoc["change"].is<float>() || jsonLatestDoc["change"].is<double>() || jsonLatestDoc["change"].is<long>() || jsonLatestDoc["change"].is<int>()
    ? (float)jsonLatestDoc["change"].as<double>()
    : NAN;

  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  latestCache[idx] = nextLatest;
  changeCache[idx] = nextChange;
  if (!isnan(latestCache[idx])) hasFetchedData = true;
  shouldRedraw = true;
  if (dataMutex) xSemaphoreGive(dataMutex);
  return true;
}

static bool fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (deviceId.length() == 0) return false;
  HTTPClient http;
  String url = String(API_BASE) + "/api/devices/" + deviceId;
  if (!http.begin(wifiClient, url)) return false;
  http.setReuse(true);
  http.setTimeout(4000);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }
  jsonConfigDoc.clear();
  DeserializationError err = deserializeJson(jsonConfigDoc, http.getStream());
  http.end();
  if (err) return false;

  JsonObject cfg = jsonConfigDoc["configuration"].is<JsonObject>() ? jsonConfigDoc["configuration"].as<JsonObject>() : JsonObject();

  TickerCfg nextTickers[MAX_TICKERS];
  int nextCount = 0;

  if (cfg && cfg["tickers"].is<JsonArray>()) {
    JsonArray arr = cfg["tickers"].as<JsonArray>();
    for (JsonVariant v : arr) {
      if (!v.is<JsonObject>()) continue;
      JsonObject o = v.as<JsonObject>();
      if (!o["symbol"].is<const char*>()) continue;
      if (nextCount >= MAX_TICKERS) break;
      nextTickers[nextCount].symbol = String((const char*)o["symbol"]);
      nextTickers[nextCount].type = o["type"].is<const char*>() ? String((const char*)o["type"]) : "";
      nextTickers[nextCount].interval = o["interval"].is<const char*>() ? String((const char*)o["interval"]) : "1min";
      nextTickers[nextCount].showInterval = o["show_interval"].is<bool>() ? o["show_interval"].as<bool>() : true;
      nextTickers[nextCount].exchange = o["exchange"].is<const char*>() ? String((const char*)o["exchange"]) : "";
      nextCount++;
    }
  }

  if (nextCount == 0 && cfg && cfg["pairs"].is<JsonArray>()) {
    JsonArray arr = cfg["pairs"].as<JsonArray>();
    for (JsonVariant v : arr) {
      if (!v.is<const char*>()) continue;
      if (nextCount >= MAX_TICKERS) break;
      nextTickers[nextCount].symbol = String((const char*)v);
      nextTickers[nextCount].type = "";
      nextTickers[nextCount].interval = "1min";
      nextTickers[nextCount].showInterval = true;
      nextTickers[nextCount].exchange = "";
      nextCount++;
    }
  }

  uint32_t nextRotateSeconds = cfg && cfg["rotate_seconds"].is<uint32_t>() ? cfg["rotate_seconds"].as<uint32_t>() : 60;
  uint8_t nextBrightness = cfg && cfg["brightness"].is<uint8_t>() ? cfg["brightness"].as<uint8_t>() : 30;
  String nextDisplayMode = cfg && cfg["display_mode"].is<const char*>() ? String((const char*)cfg["display_mode"]) : "auto";

  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  for (int i = 0; i < MAX_TICKERS; i++) {
    const bool inOld = i < tickerCount;
    const bool inNew = i < nextCount;
    bool changed = !inNew;
    if (inOld && inNew) {
      if (tickers[i].symbol != nextTickers[i].symbol) changed = true;
      if (tickers[i].interval != nextTickers[i].interval) changed = true;
      if (tickers[i].exchange != nextTickers[i].exchange) changed = true;
    } else if (inNew && !inOld) {
      changed = true;
    }
    if (changed) {
      latestCache[i] = NAN;
      changeCache[i] = NAN;
      seriesHaveCache[i] = 0;
    }
  }
  tickerCount = nextCount;
  for (int i = 0; i < nextCount; i++) tickers[i] = nextTickers[i];
  rotateSeconds = nextRotateSeconds;
  globalBrightness = nextBrightness;
  displayMode = nextDisplayMode;
  if (tickerCount > 0) {
    if (currentTickerIndex >= tickerCount) currentTickerIndex = 0;
    currentSymbol = tickers[currentTickerIndex].symbol;
    currentInterval = tickers[currentTickerIndex].interval;
    currentShowInterval = tickers[currentTickerIndex].showInterval;
    currentExchange = tickers[currentTickerIndex].exchange;
    loadSeriesForDisplayFromIndex(currentTickerIndex);
  }
  shouldRedraw = true;
  if (dataMutex) xSemaphoreGive(dataMutex);
  return true;
}

static int computeDisplayMode() {
  if (displayMode == "one") return 1;
  if (displayMode == "two") return 2;
  if (displayMode == "multi_one") return 3;
  if (displayMode == "multi_two") return 4;
  if (tickerCount <= 1) return 1;
  if (tickerCount == 2) return 2;
  return 3;
}

static void DataTask(void *params) {
  (void)params;
  for (;;) {
    const unsigned long now = millis();

    bool prov = false;
    bool conn = false;
    unsigned long statusUntil = 0;
    unsigned long nextSetupSwitchMs = 0;

    if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
    prov = provisioning;
    conn = connectingWifi;
    statusUntil = showStatusUntilMs;
    nextSetupSwitchMs = lastSetupPageMs;
    if (dataMutex) xSemaphoreGive(dataMutex);

    if (prov) {
      server.handleClient();
      if (now - nextSetupSwitchMs > 3000UL) {
        if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
        lastSetupPageMs = now;
        setupPage = (setupPage + 1) % 2;
        shouldRedraw = true;
        if (dataMutex) xSemaphoreGive(dataMutex);
      }
      vTaskDelay(pdMS_TO_TICKS(50));
      continue;
    }

    if (conn) {
      wl_status_t st = WiFi.status();
      if (st == WL_CONNECTED) {
        if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
        connectingWifi = false;
        showStatusUntilMs = now + 1500UL;
        statusLine1 = "Connected!";
        statusLine2 = "Success";
        lastConfigFetchMs = now - configFetchEveryMs;
        lastFetch = now - fetchEveryMs;
        hasFetchedData = false;
        shouldRedraw = true;
        if (dataMutex) xSemaphoreGive(dataMutex);
      } else if (st == WL_CONNECT_FAILED || now - connectStartMs > 20000UL) {
        prefs.remove("ssid");
        prefs.remove("password");
        if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
        showStatusUntilMs = now + 2500UL;
        statusLine1 = "WiFi failed";
        statusLine2 = "Check password";
        shouldRedraw = true;
        if (dataMutex) xSemaphoreGive(dataMutex);
        startProvisioning();
      } else {
        if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
        shouldRedraw = true;
        if (dataMutex) xSemaphoreGive(dataMutex);
      }
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    if (statusUntil > 0 && now > statusUntil) {
      if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
      showStatusUntilMs = 0;
      shouldRedraw = true;
      if (dataMutex) xSemaphoreGive(dataMutex);
    }

    wl_status_t wifiSt = WiFi.status();
    if (wifiSt != WL_CONNECTED) {
      bool cfg = false;
      bool reconnecting = false;
      unsigned long reconnectStart = 0;
      unsigned long lastAttempt = 0;
      String ssid;
      String pass;
      if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
      cfg = wifiConfigured;
      reconnecting = wifiReconnecting;
      reconnectStart = wifiReconnectStartMs;
      lastAttempt = wifiLastReconnectAttemptMs;
      ssid = wifiSsid;
      pass = wifiPass;
      if (dataMutex) xSemaphoreGive(dataMutex);

      if (cfg) {
        if (!reconnecting) {
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          wifiReconnecting = true;
          wifiReconnectStartMs = now;
          wifiLastReconnectAttemptMs = 0;
          wifiLostPage = false;
          wifiLostNextToggleMs = now + 10000UL;
          shouldRedraw = true;
          if (dataMutex) xSemaphoreGive(dataMutex);
          reconnectStart = now;
          lastAttempt = 0;
        }
        if (now >= wifiLostNextToggleMs) {
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          wifiLostPage = !wifiLostPage;
          wifiLostNextToggleMs = now + 10000UL;
          shouldRedraw = true;
          if (dataMutex) xSemaphoreGive(dataMutex);
        }
        if (now - lastAttempt >= wifiReconnectAttemptEveryMs) {
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          wifiLastReconnectAttemptMs = now;
          shouldRedraw = true;
          if (dataMutex) xSemaphoreGive(dataMutex);
          WiFi.mode(WIFI_STA);
          WiFi.begin(ssid.c_str(), pass.c_str());
        }
        if (now - reconnectStart >= wifiReconnectGiveUpMs) {
          prefs.remove("ssid");
          prefs.remove("password");
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          wifiReconnecting = false;
          wifiLostPage = false;
          wifiLostNextToggleMs = 0;
          showStatusUntilMs = now + 2500UL;
          statusLine1 = "WiFi failed";
          statusLine2 = "Re-setup";
          shouldRedraw = true;
          if (dataMutex) xSemaphoreGive(dataMutex);
          startProvisioning();
        }
      }
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    } else {
      bool wasReconnecting = false;
      if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
      wasReconnecting = wifiReconnecting;
      if (wasReconnecting) {
        wifiReconnecting = false;
        wifiLostPage = false;
        wifiLostNextToggleMs = 0;
        showStatusUntilMs = now + 1200UL;
        statusLine1 = "WiFi";
        statusLine2 = "Reconnected";
        shouldRedraw = true;
      }
      if (dataMutex) xSemaphoreGive(dataMutex);
    }

    bool doConfigFetch = false;
    if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
    if (now - lastConfigFetchMs > configFetchEveryMs) {
      lastConfigFetchMs = now;
      doConfigFetch = true;
    }
    if (dataMutex) xSemaphoreGive(dataMutex);

    if (doConfigFetch) {
      const bool ok = fetchConfig();
      if (ok) {
        const int mode = computeDisplayMode();
        if (mode == 1 || mode == 3) {
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          loadSeriesForDisplayFromIndex(currentTickerIndex);
          shouldRedraw = true;
          if (dataMutex) xSemaphoreGive(dataMutex);
          fetchSeries();
        } else {
          static bool twoModeFlip = false;
          int idxA = 0;
          int idxB = 0;
          if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
          idxA = tickerCount ? (currentTickerIndex % tickerCount) : 0;
          idxB = tickerCount > 1 ? (idxA + 1) % tickerCount : idxA;
          if (dataMutex) xSemaphoreGive(dataMutex);
          const int pick = twoModeFlip ? idxB : idxA;
          twoModeFlip = !twoModeFlip;
          fetchLatestForIndex(pick);
        }
      }
    }

    int mode = 1;
    int count = 0;
    uint32_t rotateSec = 0;
    unsigned long lastRot = 0;
    unsigned long lastF = 0;
    if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
    mode = computeDisplayMode();
    count = tickerCount;
    rotateSec = rotateSeconds;
    lastRot = lastRotateMs;
    lastF = lastFetch;
    if (dataMutex) xSemaphoreGive(dataMutex);

    if (count > 0 && rotateSec > 0 && now - lastRot > rotateSec * 1000UL) {
      int nextIdx = 0;
      if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
      lastRotateMs = now;
      if (mode == 4) currentTickerIndex = (currentTickerIndex + 2) % tickerCount;
      else currentTickerIndex = (currentTickerIndex + 1) % tickerCount;
      nextIdx = currentTickerIndex;
      currentSymbol = tickers[currentTickerIndex].symbol;
      currentInterval = tickers[currentTickerIndex].interval;
      currentShowInterval = tickers[currentTickerIndex].showInterval;
      currentExchange = tickers[currentTickerIndex].exchange;
      if (mode == 3 || mode == 1) loadSeriesForDisplayFromIndex(nextIdx);
      shouldRedraw = true;
      lastFetch = now - fetchEveryMs;
      if (dataMutex) xSemaphoreGive(dataMutex);

      if (mode == 1 || mode == 3) {
        fetchSeries();
      } else {
        fetchLatestForIndex(nextIdx);
      }
    }

    if (now - lastF > fetchEveryMs) {
      if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
      lastFetch = now;
      if (dataMutex) xSemaphoreGive(dataMutex);

      if (mode == 1 || mode == 3) {
        fetchSeries();
      } else {
        static bool twoModeFlip = false;
        int idxA = 0;
        int idxB = 0;
        if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
        idxA = tickerCount ? (currentTickerIndex % tickerCount) : 0;
        idxB = tickerCount > 1 ? (idxA + 1) % tickerCount : idxA;
        if (dataMutex) xSemaphoreGive(dataMutex);
        const int pick = twoModeFlip ? idxB : idxA;
        twoModeFlip = !twoModeFlip;
        fetchLatestForIndex(pick);
      }
    }

    bool kick = false;
    if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
    if (!priceMarqueeActive && priceMarqueeNextMs > 0 && now >= priceMarqueeNextMs && hasFetchedData) {
      kick = true;
      shouldRedraw = true;
    }
    if (dataMutex) xSemaphoreGive(dataMutex);
    if (kick) {
      vTaskDelay(pdMS_TO_TICKS(20));
      continue;
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

void setup() {
  HUB75_I2S_CFG mxconfig(PANEL_RES_X, PANEL_RES_Y, PANEL_CHAIN);
  mxconfig.gpio.r1 = R1_PIN; mxconfig.gpio.g1 = G1_PIN; mxconfig.gpio.b1 = B1_PIN;
  mxconfig.gpio.r2 = R2_PIN; mxconfig.gpio.g2 = G2_PIN; mxconfig.gpio.b2 = B2_PIN;
  mxconfig.gpio.a = A_PIN; mxconfig.gpio.b = B_PIN; mxconfig.gpio.c = C_PIN; mxconfig.gpio.d = D_PIN; mxconfig.gpio.e = E_PIN;
  mxconfig.gpio.lat = LAT_PIN; mxconfig.gpio.oe = OE_PIN; mxconfig.gpio.clk = CLK_PIN;
  // Avoid "tearing"/rolling artifacts on HUB75 by drawing to a backbuffer and flipping once per frame.
  mxconfig.double_buff = true;

  matrix = new MatrixPanel_I2S_DMA(mxconfig);
  matrix->begin();
  matrix->clearScreen();
  matrix->fillScreen(C_BLACK);

  drawSplash();

  wifiClient.setInsecure();
  Serial.begin(115200);
  prefs.begin("tickr", false);
  if (!dataMutex) dataMutex = xSemaphoreCreateMutex();
  deviceId = prefs.getString("device_id", "");
  if (deviceId.length() == 0) {
    uint64_t mac = ESP.getEfuseMac();
    char buf[17];
    snprintf(buf, sizeof(buf), "%04X%08X", (uint16_t)(mac >> 32), (uint32_t)mac);
    deviceId = String("DV") + String(buf);
    prefs.putString("device_id", deviceId);
  }
  Serial.print("device_id: ");
  Serial.println(deviceId);
  wifiSsid = prefs.getString("ssid", "");
  wifiPass = prefs.getString("password", "");
  wifiConfigured = wifiSsid.length() > 0;
  if (wifiConfigured) {
    startConnectingToWifi(wifiSsid, wifiPass);
  } else {
    startProvisioning();
  }
  for (int i = 0; i < MAX_TICKERS; i++) { latestCache[i] = NAN; changeCache[i] = NAN; seriesHaveCache[i] = 0; }
  hasFetchedData = false;
  lastConfigFetchMs = millis() - configFetchEveryMs;
  lastFetch = millis() - fetchEveryMs;
  priceMarqueeNextMs = millis() + 15000UL;
  shouldRedraw = true;
  xTaskCreatePinnedToCore(
    DataTask,
    "DataTask",
    12288,
    nullptr,
    1,
    &dataTaskHandle,
    0
  );
}

void loop() {
  static uint8_t lastSetBrightness = 0;
  
  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  uint8_t currentB = globalBrightness;
  if (dataMutex) xSemaphoreGive(dataMutex);

  if (currentB != lastSetBrightness) {
    matrix->setBrightness8(currentB);
    matrix->clearScreen();
    lastSetBrightness = currentB;
    shouldRedraw = true;
  }

  if (!shouldRedraw) {
    vTaskDelay(pdMS_TO_TICKS(20));
    return;
  }

  const unsigned long now = millis();
  if (dataMutex) xSemaphoreTake(dataMutex, portMAX_DELAY);
  shouldRedraw = false;

  if (provisioning) {
    drawWifiSetupWaiting(setupPage);
    if (dataMutex) xSemaphoreGive(dataMutex);
    matrix->flipDMABuffer();
    vTaskDelay(pdMS_TO_TICKS(20));
    return;
  }

  if (connectingWifi) {
    drawStatus("Connecting...", wifiSsid);
    if (dataMutex) xSemaphoreGive(dataMutex);
    matrix->flipDMABuffer();
    vTaskDelay(pdMS_TO_TICKS(20));
    return;
  }

  if (showStatusUntilMs > now) {
    drawStatus(statusLine1, statusLine2);
    if (dataMutex) xSemaphoreGive(dataMutex);
    matrix->flipDMABuffer();
    vTaskDelay(pdMS_TO_TICKS(20));
    return;
  }

  if (!hasFetchedData) {
    drawWaiting();
    if (dataMutex) xSemaphoreGive(dataMutex);
    matrix->flipDMABuffer();
    vTaskDelay(pdMS_TO_TICKS(20));
    return;
  }

  const int mode = computeDisplayMode();
  if (mode == 1 || mode == 3) {
    drawOneTicker();
    if (wifiReconnecting) drawWifiSignalMini(22, 10);
    else drawChartMini(22, 10);
  } else {
    if (wifiReconnecting && wifiLostPage) {
      drawWifiLostText();
    } else {
    int idxA = tickerCount ? (currentTickerIndex % tickerCount) : 0;
    int idxB = tickerCount > 1 ? (idxA + 1) % tickerCount : idxA;
    bool showA = tickerCount ? tickers[idxA].showInterval : currentShowInterval;
    bool showB = tickerCount ? tickers[idxB].showInterval : currentShowInterval;
    drawTickerRowTwoMode(0, 8, tickerCount ? tickers[idxA].symbol : currentSymbol, latestCache[idxA], changeCache[idxA], tickerCount ? tickers[idxA].interval : currentInterval, showA);
    drawTickerRowTwoMode(16, 8, tickerCount ? tickers[idxB].symbol : currentSymbol, latestCache[idxB], changeCache[idxB], tickerCount ? tickers[idxB].interval : currentInterval, showB);
    }
  }

  if (dataMutex) xSemaphoreGive(dataMutex);
  matrix->flipDMABuffer();
  vTaskDelay(pdMS_TO_TICKS(20));
}
