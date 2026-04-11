#include <Arduino.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>

static MatrixPanel_I2S_DMA *display = nullptr;

static const int PANEL_RES_X = 64;
static const int PANEL_RES_Y = 32;
static const int PANEL_CHAIN = 1;

void setup() {
  HUB75_I2S_CFG mxconfig(PANEL_RES_X, PANEL_RES_Y, PANEL_CHAIN);

  mxconfig.gpio.r1 = 19;
  mxconfig.gpio.g1 = 13;
  mxconfig.gpio.b1 = 18;
  mxconfig.gpio.r2 = 5;
  mxconfig.gpio.g2 = 12;
  mxconfig.gpio.b2 = 17;

  mxconfig.gpio.a = 16;
  mxconfig.gpio.b = 14;
  mxconfig.gpio.c = 4;
  mxconfig.gpio.d = 27;
  mxconfig.gpio.e = -1;

  mxconfig.gpio.lat = 26;
  mxconfig.gpio.oe = 15;
  mxconfig.gpio.clk = 2;

  display = new MatrixPanel_I2S_DMA(mxconfig);
  display->begin();
  display->clearScreen();
  display->setTextWrap(false);
  display->setTextSize(2);
  display->setTextColor(display->color565(255, 255, 255));

  int16_t x1, y1;
  uint16_t w, h;
  display->getTextBounds("HELLO", 0, 0, &x1, &y1, &w, &h);
  display->setCursor((PANEL_RES_X - (int)w) / 2, (PANEL_RES_Y - (int)h) / 2);
  display->print("HELLO");
}

void loop() {
}
