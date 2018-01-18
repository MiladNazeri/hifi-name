Overlays.addOverlay("text", {
                             backgroundColor: { red: 0, green: 0, blue: 0 },
                             font: { size: TEXT_HEIGHT },
                             text: (i === NUM_AC) ? "Master" : i + ". " +
                             ((i < NAMES.length) ? NAMES[i] :
                              "AC" + i),
                             x: 0, y: 0,
                             width: toolBars[i].width + ToolBar.SPACING,
                             height: TEXT_HEIGHT + TEXT_MARGIN,
                             leftMargin: TEXT_MARGIN,
                             topMargin: TEXT_MARGIN,
                             alpha: ALPHA_OFF,
                             backgroundAlpha: ALPHA_OFF,
                             visible: true
                             }));
